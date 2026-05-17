/**
 * Session machine — applies freemium word cap.
 *
 * On start():
 *   1. Get user's tier
 *   2. Generate session via domain
 *   3. If free tier: cap to FREE_WORDS_PER_CATEGORY × 2 questions max
 */
import { create } from 'zustand';
import { generateSession, type SessionOptions, type Question } from '@/domain';
import {
  ADAPTIVE_DEFAULTS,
  nextAdaptiveState,
  type AdaptiveState,
} from '@/domain/adaptive';
import { supabase } from '@/lib/supabase';
import { getAccessTier, maxWordsForTier } from '@/lib/access-tier';
import {
  loadDayProgress,
  canPlayModule,
  markModuleComplete,
  DAY_COMPLETION_MIN_ACCURACY,
} from '@/lib/day-progress';
import { isOnline } from '@/lib/online-status';
import { enqueue as enqueueOfflineWrite } from '@/lib/offline-queue';
import { useAuth } from './auth';

export type Verdict   = 'correct' | 'wrong' | null;
export type SessStat  = 'idle' | 'loading' | 'ready' | 'revealed' | 'finished' | 'error' | 'locked';

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
  /** True if this session was the last one needed to finish today's curriculum.
   *  The result screen reads this to fire the "all unlocked" popup. */
  dayJustCompleted?: boolean;
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
  /** Live adaptive state for the current run; persisted on finish. */
  adaptive:      AdaptiveState;

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
  adaptive: { ...ADAPTIVE_DEFAULTS },

  start: async (moduleId, opts = {}) => {
    // Resume adaptive level from student_character if present, else start at 1.
    let resumedAdaptive: AdaptiveState = { ...ADAPTIVE_DEFAULTS };
    try {
      const profile = useAuth.getState().profile;
      if (profile) {
        const { data } = await supabase
          .from('student_character')
          .select('adaptive_levels')
          .eq('student_id', profile.id)
          .maybeSingle();
        const map = (data?.adaptive_levels ?? {}) as Record<string, number>;
        if (typeof map[moduleId] === 'number') {
          resumedAdaptive = { ...ADAPTIVE_DEFAULTS, currentLevel: map[moduleId] };
        }
      }
    } catch { /* non-fatal */ }

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
      adaptive: resumedAdaptive,
    });

    try {
      const profile = useAuth.getState().profile;
      const tier    = getAccessTier(profile);

      // Teacher-assigned homework bypasses day-based gating — the teacher
      // explicitly granted access, and the assignment screen handles its own
      // word/module scoping. For any other launch path we run the day-aware
      // access check.
      if (!opts.assignmentId) {
        const dayProgress = profile ? await loadDayProgress(profile.id) : null;
        if (!dayProgress || !canPlayModule(profile, dayProgress, moduleId)) {
          set({ status: 'locked', errorMessage: 'Önce bugünün oyunlarını bitir.' });
          return;
        }
      }

      const ageBased  = SESSION_LENGTH_BY_AGE(profile?.child_age ?? null);
      const wordCap   = maxWordsForTier(tier);
      // Teacher-assigned homework must use ALL selected words regardless of the
      // student's age or tier cap — the teacher decided the scope, not us. For
      // random-from-all (no category, no word list) we keep the 20-Q fixed
      // length; for category drill-ins we keep the age-based length.
      const isAssignment    = Boolean(opts.assignmentId) && Boolean(opts.wordIds && opts.wordIds.length > 0);
      const isRandomFromAll = !opts.categoryId && !(opts.wordIds && opts.wordIds.length > 0);
      const baseDefault     = isRandomFromAll ? 20 : ageBased;
      const maxQ      = opts.maxQuestions
        ?? (isAssignment
              ? opts.wordIds!.length * 4
              : Math.min(baseDefault, wordCap ? wordCap * 2 : baseDefault));

      const qs = await generateSession(moduleId, { ...opts, maxQuestions: maxQ });
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
    const { questions, index, status, questionShownAt, answers, adaptive, xpEarned } = get();
    if (status !== 'ready') return;
    const q = questions[index];
    if (!q) return;
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
    const step = nextAdaptiveState(adaptive, correct);
    set({
      status: 'revealed',
      lastVerdict: verdict,
      lastChosen: chosen,
      answers: [...answers, log],
      adaptive: step.state,
      xpEarned: xpEarned + step.xpGained,
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
    const { moduleId, questions, answers, startedAt, extra, adaptive, xpEarned: liveXp } = get();
    if (!moduleId) return;
    const profile = useAuth.getState().profile;
    if (!profile) return;

    const total       = questions.length;
    const correctCnt  = answers.filter((a) => a.wasCorrect).length;
    const isPerfect   = correctCnt === total;
    const durationS   = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    // XP = per-question adaptive rewards already accumulated + completion + perfect bonus.
    const xp          = liveXp
                        + XP_SESSION_COMPLETE
                        + (isPerfect ? XP_PERFECT_BONUS : 0);
    const wordIds: string[] = answers
      .map((a) => a.wordId)
      .filter((x): x is string => Boolean(x));

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

    // Offline path: skip the direct insert + RPCs and queue the whole bundle
    // for replay when the network comes back. This keeps XP/streaks/assignment
    // completions from being lost when the student plays without connectivity.
    if (!(await isOnline())) {
      enqueueOfflineWrite({
        kind: 'session_log',
        payload: insertPayload,
        followups: {
          xp:       { amount: xp, reason: isPerfect ? 'sessionPerfect' : 'sessionComplete' },
          streak:   true,
          adaptive: { module_id: moduleId, level: adaptive.currentLevel },
          ...(extra.assignmentId ? { /* assignment notif filled after fetching teacher_id which we don't have offline */ } : {}),
        },
      });
      set({ xpEarned: xp });
      return;
    }

    const { data: logRow, error: logErr } = await supabase
      .from('session_logs')
      .insert(insertPayload)
      .select()
      .single();

    if (logErr) console.warn('[session] session_log insert failed', logErr.message);

    const sessionId = logRow?.id ?? null;
    const { error: xpErr } = await supabase.rpc('award_xp', {
      p_amount:     xp,
      p_reason:     isPerfect ? 'sessionPerfect' : 'sessionComplete',
      p_session_id: sessionId,
    });
    if (xpErr) console.warn('[session] award_xp failed', xpErr.message);

    const { error: streakErr } = await supabase.rpc('update_streak');
    if (streakErr) console.warn('[session] update_streak failed', streakErr.message);

    // Persist the per-module adaptive level for next session resume.
    try {
      const { data: charRow } = await supabase
        .from('student_character')
        .select('adaptive_levels')
        .eq('student_id', profile.id)
        .maybeSingle();
      const map = ((charRow?.adaptive_levels as Record<string, number> | null) ?? {});
      map[moduleId] = adaptive.currentLevel;
      await supabase
        .from('student_character')
        .update({ adaptive_levels: map } as any)
        .eq('student_id', profile.id);
    } catch (e) {
      console.warn('[session] adaptive persist failed', e);
    }

    // Day-curriculum tracking — only for non-assignment sessions that hit the
    // ≥50% threshold. Assignment sessions are tracked separately below.
    if (!extra.assignmentId && total > 0 && (correctCnt / total) >= DAY_COMPLETION_MIN_ACCURACY) {
      try {
        const tier = getAccessTier(profile);
        const progress = await loadDayProgress(profile.id);
        const result = await markModuleComplete(profile.id, tier, progress, moduleId);
        if (result.justFinishedDay) {
          // Surface to the UI via session state so the result screen can
          // fire the "all unlocked" celebration popup.
          set({ extra: { ...extra, dayJustCompleted: true } });
        }
      } catch (e) {
        console.warn('[session] day-completion tracking failed', e);
      }
    }

    if (extra.assignmentId) {
      const { data: updated } = await supabase.from('assignments').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        session_id: sessionId,
      }).eq('id', extra.assignmentId).select('teacher_id, title').maybeSingle();

      // Notify teacher that the student completed the homework (in-app + push).
      if (updated?.teacher_id) {
        const notifBody = `${profile.full_name ?? 'Öğrenci'} "${updated.title}" ödevini bitirdi (${correctCnt}/${total} doğru).`;
        // In-app notification (RLS allows student → linked teacher)
        await supabase.from('notifications').insert({
          user_id: updated.teacher_id,
          type:    'assignment_completed',
          title:   'Ödev Tamamlandı',
          body:    notifBody,
          payload: {
            assignment_id: extra.assignmentId,
            student_id:    profile.id,
            session_id:    sessionId,
            correct:       correctCnt,
            total,
          },
        });
        // Push notification — fire-and-forget; failure is non-blocking
        supabase.functions.invoke('send-push', {
          body: {
            user_id: updated.teacher_id,
            title:   'Ödev Tamamlandı',
            body:    notifBody,
            type:    'assignment_completed',
            data:    { assignment_id: extra.assignmentId, student_id: profile.id },
          },
        }).catch((e) => console.warn('[session] send-push failed', e));
      }
    }

    set({ xpEarned: xp });
  },

  reset: () => set({
    status: 'idle', moduleId: null, questions: [], index: 0, answers: [],
    lastVerdict: null, lastChosen: null, startedAt: 0, questionShownAt: 0,
    errorMessage: null, xpEarned: 0, extra: {}, adaptive: { ...ADAPTIVE_DEFAULTS },
  }),
}));

export const sessionProgress = (s: SessionState): number =>
  s.questions.length === 0 ? 0 : (s.index + 1) / s.questions.length;
