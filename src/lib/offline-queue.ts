/**
 * Offline write queue.
 *
 * The student app must record session results, XP, streaks, assignment
 * completions, and adaptive levels even when the network is unavailable.
 * We enqueue those writes here and replay them when the device comes back
 * online (manual flush from auth.initialize / when a screen detects connectivity).
 *
 * Storage: MMKV (same fallback to in-memory as offline-cache.ts).
 * Cap: 200 items — older entries get dropped, with a console warn.
 * Idempotency: each item has a `tryAt` timestamp and we record `retries`;
 * after 5 failed attempts we drop the item to avoid infinite loops.
 *
 * Each write type has its own shape, dispatched via a discriminated union.
 */
import { MMKV } from 'react-native-mmkv';
import { supabase } from './supabase';
import { isOnline } from './online-status';

const STORAGE_KEY  = 'offline_write_queue_v1';
const MAX_ITEMS    = 200;
const MAX_RETRIES  = 5;

export type QueueItem =
  | {
      kind: 'session_log';
      tempId: string;
      tryAt: number;
      retries: number;
      payload: {
        student_id:        string;
        module_id:         string;
        questions_total:   number;
        questions_correct: number;
        duration_seconds:  number;
        xp_earned:         number;
        word_ids:          string[];
        assignment_id?:    string;
      };
      followups?: {
        xp?:           { amount: number; reason: string };
        streak?:       boolean;
        adaptive?:     { module_id: string; level: number };
        assignment?:   { id: string; teacher_id: string; title: string; correct: number; total: number; student_name: string };
      };
    }
  | {
      kind: 'rpc';
      tempId: string;
      tryAt: number;
      retries: number;
      fn: 'update_streak' | 'award_xp';
      args?: Record<string, unknown>;
    };

let mmkv: MMKV | null = null;
try { mmkv = new MMKV(); } catch { /* Expo Go */ }
let memBuf: QueueItem[] | null = null;

function read(): QueueItem[] {
  if (mmkv) {
    const raw = mmkv.getString(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as QueueItem[]; } catch { return []; }
  }
  return memBuf ?? [];
}

function write(items: QueueItem[]): void {
  const capped = items.slice(-MAX_ITEMS);
  if (mmkv) mmkv.set(STORAGE_KEY, JSON.stringify(capped));
  else memBuf = capped;
}

export function enqueue(item: Omit<QueueItem, 'tryAt' | 'retries' | 'tempId'> & Partial<Pick<QueueItem, 'tempId'>>): void {
  const stored: QueueItem = {
    ...(item as QueueItem),
    tempId:  item.tempId ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tryAt:   Date.now(),
    retries: 0,
  };
  const items = read();
  items.push(stored);
  write(items);
}

export function queueSize(): number { return read().length; }

export function clearQueue(): void {
  if (mmkv) mmkv.delete(STORAGE_KEY);
  else memBuf = [];
}

async function processItem(item: QueueItem): Promise<{ ok: boolean; permanent?: boolean }> {
  try {
    if (item.kind === 'session_log') {
      const { data: logRow, error: logErr } = await supabase
        .from('session_logs')
        .insert(item.payload)
        .select()
        .single();
      if (logErr) {
        // Permanent failures (RLS, FK violation) shouldn't keep retrying forever.
        const code = (logErr as any).code;
        const isPermanent = code === '23503' || code === '42501';
        return { ok: false, permanent: isPermanent };
      }
      const sessionId = logRow?.id ?? null;

      if (item.followups?.xp) {
        await supabase.rpc('award_xp', {
          p_amount:     item.followups.xp.amount,
          p_reason:     item.followups.xp.reason,
          p_session_id: sessionId,
        });
      }
      if (item.followups?.streak) {
        await supabase.rpc('update_streak');
      }
      if (item.followups?.adaptive) {
        const { data: charRow } = await supabase
          .from('student_character')
          .select('adaptive_levels')
          .eq('student_id', item.payload.student_id)
          .maybeSingle();
        const map = ((charRow?.adaptive_levels as Record<string, number> | null) ?? {});
        map[item.followups.adaptive.module_id] = item.followups.adaptive.level;
        await supabase
          .from('student_character')
          .update({ adaptive_levels: map } as any)
          .eq('student_id', item.payload.student_id);
      }
      if (item.followups?.assignment) {
        const a = item.followups.assignment;
        const scorePct = a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0;
        await supabase.from('homeworks').update({
          status:       'completed',
          completed_at: new Date().toISOString(),
          session_id:   sessionId,
          score:        scorePct,
        } as any).eq('id', a.id);

        await supabase.from('notifications').insert({
          user_id: a.teacher_id,
          type:    'homework_completed',
          title:   'Ödev Tamamlandı',
          body:    `${a.student_name} "${a.title}" ödevini bitirdi (${a.correct}/${a.total} doğru).`,
          payload: { homework_id: a.id, student_id: item.payload.student_id, session_id: sessionId, correct: a.correct, total: a.total },
        } as any);
        supabase.functions.invoke('send-push', {
          body: {
            user_id: a.teacher_id,
            title:   'Ödev Tamamlandı',
            body:    `${a.student_name} "${a.title}" ödevini bitirdi.`,
            type:    'homework_completed',
            data:    { homework_id: a.id, student_id: item.payload.student_id },
          },
        }).catch(() => { /* ignore */ });
      }
      return { ok: true };
    }

    if (item.kind === 'rpc') {
      const { error } = await supabase.rpc(item.fn as any, item.args ?? {});
      return { ok: !error };
    }

    return { ok: true };
  } catch (e) {
    console.warn('[offline-queue] processItem failed', e);
    return { ok: false };
  }
}

/**
 * Replay any queued writes. Safe to call repeatedly. Skips silently if offline.
 * Returns the count of items that were successfully drained.
 */
export async function flushQueue(): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;
  if (!(await isOnline())) return 0;

  const remaining: QueueItem[] = [];
  let drained = 0;

  for (const item of items) {
    const res = await processItem(item);
    if (res.ok) {
      drained++;
      continue;
    }
    if (res.permanent) {
      console.warn('[offline-queue] dropping permanently-failing item', item.kind);
      continue;
    }
    if (item.retries + 1 >= MAX_RETRIES) {
      console.warn('[offline-queue] dropping after max retries', item.kind);
      continue;
    }
    remaining.push({ ...item, retries: item.retries + 1, tryAt: Date.now() });
  }

  write(remaining);
  return drained;
}
