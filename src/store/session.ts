/**
 * Session machine — orchestrates one playthrough of one module.
 *
 * Flow:
 *   idle → loading → ready → (revealed → ready)* → finished
 *
 * Lifecycle:
 *   1. start(moduleId, opts)    loads questions, captures assignmentId
 *   2. answer(choice)           records, sets lastVerdict, status='revealed'
 *                               ('__skip__' or '__wrong__' from PronunciationQuestion → treated as wrong)
 *   3. next()                   advances; sets status='finished' when done
 *   4. finish()                 posts session_log + award_xp + update_streak + marks assignment complete
 */
import { create } from 'zustand';
import { generateSession, type SessionOptions, type Question } from '@/domain';
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth';

export type Verdict   = 'correct' | 'wrong' | null;
export type SessStat  = 'idle' | 'loading' | 'ready' | 'revealed' | 'finished' | 'error';

interface AnswerLog {
  questionId:   string;
  wordId:       string | null;
  chosen:       string;
  correct:      string;
  wasCorrect:   boolean;
  msToAnswer:   number;
}

interface SessionExtra {
  assignmentId?: string;
}

interface SessionState {
  status:        SessStat;
  moduleId:      string | null;
  questions:     Question[];
  index:         number;
  answers:       AnswerLog[];
  lastVerdict:   Verdict;
  lastChosen:    string | null;
  startedAt:     number;
  questionShownAt: number;
  errorMessage:  string | null;
  xpEarned:      number;
  extra:         SessionExtra;

  start:    (moduleId: string, opts?: SessionOptions & SessionExtra) => Promise<void>;
  answer:   (chosen: string) => void;
  next:     () => void;
  finish:   () => Promise<void>;
  reset:    () => void;
}

const SESSION_LENGTH_BY_AGE = (age: number | null): number => {
  if (age == null) return 15;
  if (age <= 7)    return 10;
  if (age <= 10)   return 15;
  return 20;
};

const XP_PER_CORRECT      = 10;
const XP_PERFECT_BONUS    = 50;
const XP_SESSION_COMPLETE = 20;

export const useSession = create<SessionState>((set, get) => ({
  status: 'idle',
  moduleId: null,
  questions: [],
  index: 0,
  answers: [],
  lastVerdict: null,
  lastChosen: null,
  startedAt: 0,
  questionShownAt: 0,
  errorMessage: null,
  xpEarned: 0,
  extra: {},

  start: async (moduleId, opts = {}) => {
    set({
      status: 'loading',
      moduleId,
      questions: [],
      index: 0,
      answers: [],
      lastVerdict: null,
      lastChosen: null,
      errorMessage: null,
      xpEarned: 0,
      extra: { assignmentId: opts.assignmentId },
    });
    try {
      const profile  = useAuth.getState().profile;
      const maxQ     = opts.maxQuestions ?? SESSION_LENGTH_BY_AGE(profile?.child_age ?? null);
      const qs       = await generateSession(moduleId, { ...opts, maxQuestions: maxQ });
      if (qs.length === 0) {
        set({ status: 'error', errorMessage: 'Bu modül için yeterli kelime yok.' });
        return;
      }
      set({
        status: 'ready',
        questions: qs,
        startedAt: Date.now(),
        questionShownAt: Date.now(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Soru yüklenemedi.';
      set({ status: 'error', errorMessage: msg });
    }
  },

  answer: (chosen) => {
    const { questions, index, status, questionShownAt, answers } = get();
    if (status !== 'ready') return;
    const q = questions[index];
    if (!q) return;
    // PronunciationQuestion sends '__skip__' or '__wrong__' on failure — both count as wrong
    const correct: boolean = chosen === q.correct;
    const verdict: Verdict = correct ? 'correct' : 'wrong';
    const log: AnswerLog = {
      questionId: q.id,
      wordId:     q.word?.id ?? null,
      chosen,
      correct:    q.correct,
      wasCorrect: correct,
      msToAnswer: Date.now() - questionShownAt,
    };
    set({
      status: 'revealed',
      lastVerdict: verdict,
      lastChosen: chosen,
      answers: [...answers, log],
    });
  },

  next: () => {
    const { index, questions } = get();
    const nextIdx = index + 1;
    if (nextIdx >= questions.length) {
      set({ status: 'finished' });
      return;
    }
    set({
      index: nextIdx,
      status: 'ready',
      lastVerdict: null,
      lastChosen: null,
      questionShownAt: Date.now(),
    });
  },

  finish: async () => {
    const { moduleId, questions, answers, startedAt, extra } = get();
    if (!moduleId) return;
    const profile = useAuth.getState().profile;
    if (!profile) return;

    const total       = questions.length;
    const correctCnt  = answers.filter((a) => a.wasCorrect).length;
    const isPerfect   = correctCnt === total;
    const durationS   = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const xp          = correctCnt * XP_PER_CORRECT
                        + XP_SESSION_COMPLETE
                        + (isPerfect ? XP_PERFECT_BONUS : 0);
    const wordIds: string[] = answers
      .map((a) => a.wordId)
      .filter((x): x is string => Boolean(x));

    // 1. Insert session_log (include assignment_id if present)
    const insertPayload: any = {
      student_id:        profile.id,
      module_id:         moduleId,
      questions_total:   total,
      questions_correct: correctCnt,
      duration_seconds:  durationS,
      xp_earned:         xp,
      word_ids:          wordIds,
    };
    if (extra.assignmentId) insertPayload.assignment_id = extra.assignmentId;

    const { data: logRow, error: logErr } = await supabase
      .from('session_logs')
      .insert(insertPayload)
      .select()
      .single();

    if (logErr) console.warn('[session] session_log insert failed', logErr.message);

    // 2. Award XP via Stage 1 RPC
    const sessionId = logRow?.id ?? null;
    const { error: xpErr } = await supabase.rpc('award_xp', {
      p_amount:     xp,
      p_reason:     isPerfect ? 'sessionPerfect' : 'sessionComplete',
      p_session_id: sessionId,
    });
    if (xpErr) console.warn('[session] award_xp failed', xpErr.message);

    // 3. Update streak
    const { error: streakErr } = await supabase.rpc('update_streak');
    if (streakErr) console.warn('[session] update_streak failed', streakErr.message);

    // 4. Mark assignment complete if this session was linked to one
    if (extra.assignmentId) {
      await supabase.from('assignments').update({
        status:       'completed',
        completed_at: new Date().toISOString(),
        session_id:   sessionId,
      }).eq('id', extra.assignmentId);
    }

    set({ xpEarned: xp });
  },

  reset: () => set({
    status: 'idle',
    moduleId: null,
    questions: [],
    index: 0,
    answers: [],
    lastVerdict: null,
    lastChosen: null,
    startedAt: 0,
    questionShownAt: 0,
    errorMessage: null,
    xpEarned: 0,
    extra: {},
  }),
}));

/**
 * Selector for progress (0–1).
 */
export const sessionProgress = (state: SessionState): number => {
  if (state.questions.length === 0) return 0;
  return (state.index + 1) / state.questions.length;
};
