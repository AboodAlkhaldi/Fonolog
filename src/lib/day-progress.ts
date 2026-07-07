/**
 * Day progression — read, advance, access logic.
 *
 * Single source of truth for "can this student play this module right now?".
 * Replaces the legacy `level`-based gating in src/lib/access-tier.ts; that
 * file still exports `getAccessTier` for tier classification but no longer
 * decides what's playable.
 *
 * Tier rules (matches the spec the user gave on 2026-05-14):
 *   • admin            → everything is playable, always.
 *   • subscribed (pro) → today's curriculum games; after completing today,
 *                        ALL games unlock for the rest of the local day.
 *   • trial            → today's games; after completing today, today + the
 *                        next day's games are accessible for the rest of the
 *                        local day. No full unlock.
 *   • free             → ONLY Day 1 games + ALWAYS_OPEN. Never advances.
 *                        No post-completion bonus.
 *
 * Day advancement: on the first session/login of a NEW local calendar day
 * after the student has fully completed their current day (`day_completed_at`
 * is set and < today), current_day rolls forward. When day 7 rolls to 1,
 * `current_cycle` increments so previous-cycle completions stay intact in
 * `day_completion`.
 *
 * Completion key shape: `"{cycle}-{day}"` (e.g. "1-3", "2-1"). Reading code
 * MUST use `cycleDayKey(cycle, day)`. Never read by bare day string anymore.
 *
 * Completion threshold: a module counts as "done for the day" only when the
 * session finishes with ≥ DAY_COMPLETION_MIN_ACCURACY correct answers.
 * See src/store/session.ts:finish() for the call site.
 */
import { supabase } from './supabase';
import type { Profile } from '@/store/auth';
import {
  DAY_CURRICULUM,
  ALWAYS_OPEN_MODULES,
  nextDay,
} from '@/domain/day-curriculum';
import { getAccessTier, type AccessTier } from './access-tier';

/** Minimum questions_correct / questions_total to count a session toward day completion. */
export const DAY_COMPLETION_MIN_ACCURACY = 0.5;

export interface DayProgress {
  currentCycle:   number;
  currentDay:     number;
  /** Map of "{cycle}-{day}" → list of module IDs the student finished that day. */
  completion:     Record<string, string[]>;
  /** Local-date (YYYY-MM-DD) the current day was fully completed, or null. */
  dayCompletedAt: string | null;
}

/** Empty / default progress for a brand-new student (or when the row is missing). */
export const EMPTY_PROGRESS: DayProgress = {
  currentCycle:   1,
  currentDay:     1,
  completion:     {},
  dayCompletedAt: null,
};

/** Build the completion lookup key for a given cycle+day. */
export function cycleDayKey(cycle: number, day: number): string {
  return `${cycle}-${day}`;
}

/** Returns today's local date in YYYY-MM-DD. Uses device timezone (per spec). */
export function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Effective day for access checks. Free tier is pinned to Day 1. */
export function effectiveDay(tier: AccessTier, progress: DayProgress): number {
  if (tier === 'free') return 1;
  return progress.currentDay;
}

/** Has the student finished every module in `day`'s curriculum (current cycle)? */
export function isDayComplete(progress: DayProgress, day: number): boolean {
  const required = DAY_CURRICULUM[day] ?? [];
  if (required.length === 0) return false;
  const done = new Set(progress.completion[cycleDayKey(progress.currentCycle, day)] ?? []);
  return required.every((m) => done.has(m));
}

/**
 * Core access rule. Returns true if the student can launch `moduleId` right now.
 * Pure function — no IO. Call this from screens / session start.
 */
export function canPlayModule(
  profile: Profile | null,
  progress: DayProgress,
  moduleId: string,
): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (ALWAYS_OPEN_MODULES.includes(moduleId)) return true;

  const tier = getAccessTier(profile as any);
  const day  = effectiveDay(tier, progress);
  const todayGames = DAY_CURRICULUM[day] ?? [];

  // Today's curriculum is always reachable for that day.
  if (todayGames.includes(moduleId)) return true;

  if (tier === 'free') return false;       // free never gets bonus unlocks

  if (!isDayComplete(progress, day)) return false;

  if (tier === 'trial') {
    const peek = DAY_CURRICULUM[nextDay(day)] ?? [];
    return peek.includes(moduleId);
  }

  // subscribed: full unlock for the rest of today
  return true;
}

export type ModuleLockReason = 'plan' | 'day' | null;

/** Returns why a module is locked, or null if it is playable. */
export function getModuleLockReason(
  profile: Profile | null,
  progress: DayProgress,
  moduleId: string,
): ModuleLockReason {
  if (!profile) return 'day';
  if (profile.role === 'admin') return null;
  if (ALWAYS_OPEN_MODULES.includes(moduleId)) return null;

  const tier = getAccessTier(profile as any);
  const day = effectiveDay(tier, progress);
  const todayGames = DAY_CURRICULUM[day] ?? [];

  if (todayGames.includes(moduleId)) return null;
  if (tier === 'free') return 'plan';
  if (!isDayComplete(progress, day)) return 'day';
  if (tier === 'trial') {
    const peek = DAY_CURRICULUM[nextDay(day)] ?? [];
    return peek.includes(moduleId) ? null : 'day';
  }
  return null;
}

/** Returns the curriculum for the student's currently-active day (after tier clamp). */
export function getTodayGames(profile: Profile | null, progress: DayProgress): readonly string[] {
  if (!profile) return [];
  const tier = getAccessTier(profile as any);
  return DAY_CURRICULUM[effectiveDay(tier, progress)] ?? [];
}

/** First not-yet-done game ID for today (used by the "Continue" CTA). */
export function nextPendingGame(profile: Profile | null, progress: DayProgress): string | null {
  const today = getTodayGames(profile, progress);
  if (today.length === 0) return null;
  const tier = getAccessTier(profile as any);
  const day  = effectiveDay(tier, progress);
  const done = new Set(progress.completion[cycleDayKey(progress.currentCycle, day)] ?? []);
  return today.find((m) => !done.has(m)) ?? null;
}

/** Module IDs the student has finished in their CURRENT cycle's current day. */
export function todayDoneSet(progress: DayProgress, tier: AccessTier): Set<string> {
  const day = effectiveDay(tier, progress);
  return new Set(progress.completion[cycleDayKey(progress.currentCycle, day)] ?? []);
}

// ─── DB integration ────────────────────────────────────────────────────────

interface DayRow {
  current_cycle:    number | null;
  current_day:      number | null;
  day_completion:   Record<string, string[]> | null;
  day_completed_at: string | null;
}

function rowToProgress(row: DayRow | null | undefined): DayProgress {
  if (!row) return { ...EMPTY_PROGRESS };
  return {
    currentCycle:   row.current_cycle ?? 1,
    currentDay:     row.current_day ?? 1,
    completion:     row.day_completion ?? {},
    dayCompletedAt: row.day_completed_at,
  };
}

/** Read from student_character. Returns EMPTY_PROGRESS if no row exists. */
export async function loadDayProgress(studentId: string): Promise<DayProgress> {
  const { data, error } = await supabase
    .from('student_character')
    .select('current_cycle, current_day, day_completion, day_completed_at')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) {
    console.warn('[day-progress] load failed', error.message);
    return { ...EMPTY_PROGRESS };
  }
  return rowToProgress(data as DayRow | null);
}

/**
 * If `day_completed_at` is set and strictly before today's local date, roll
 * `current_day` forward. When wrapping 7 → 1, increment `current_cycle` so
 * the new cycle's day_completion[cycle-day] keys are fresh and the previous
 * cycle's history stays in `day_completion`.
 *
 * No-op for free / admin.
 */
export async function advanceDayIfNeeded(
  studentId: string,
  tier: AccessTier,
  progress: DayProgress,
): Promise<DayProgress> {
  if (tier === 'free' || tier === 'admin') return progress;
  if (!progress.dayCompletedAt) return progress;
  if (progress.dayCompletedAt >= todayLocalISO()) return progress;

  const newDay   = nextDay(progress.currentDay);
  const newCycle = newDay === 1 ? progress.currentCycle + 1 : progress.currentCycle;

  // Don't overwrite older buckets — just ensure the new cycle+day key exists.
  const newKey = cycleDayKey(newCycle, newDay);
  const nextCompletion = { ...progress.completion };
  if (!(newKey in nextCompletion)) nextCompletion[newKey] = [];

  const next: DayProgress = {
    currentCycle:   newCycle,
    currentDay:     newDay,
    completion:     nextCompletion,
    dayCompletedAt: null,
  };

  const { error } = await supabase
    .from('student_character')
    .update({
      current_cycle:    next.currentCycle,
      current_day:      next.currentDay,
      day_completion:   next.completion,
      day_completed_at: null,
    } as any)
    .eq('student_id', studentId);

  if (error) {
    console.warn('[day-progress] advance failed', error.message);
    return progress;
  }
  return next;
}

/**
 * Called from session.finish() when the student scores at least the
 * DAY_COMPLETION_MIN_ACCURACY threshold. Appends moduleId to today's
 * (cycle, day) completion bucket, and if that makes today fully complete,
 * stamps day_completed_at with the local date.
 *
 * Idempotent: re-marking an already-finished module is a no-op.
 * Returns the updated progress (or the original if nothing changed).
 */
export async function markModuleComplete(
  studentId: string,
  tier: AccessTier,
  progress: DayProgress,
  moduleId: string,
): Promise<{ progress: DayProgress; justFinishedDay: boolean }> {
  // Only count it if the module belongs to the student's effective day.
  const day = effectiveDay(tier, progress);
  const todayGames = DAY_CURRICULUM[day] ?? [];
  if (!todayGames.includes(moduleId)) {
    return { progress, justFinishedDay: false };
  }

  const key = cycleDayKey(progress.currentCycle, day);
  const existing = progress.completion[key] ?? [];
  if (existing.includes(moduleId)) {
    return { progress, justFinishedDay: false };
  }

  const updatedDoneList = [...existing, moduleId];
  const updatedCompletion = { ...progress.completion, [key]: updatedDoneList };
  const allDone = todayGames.every((m) => updatedDoneList.includes(m));
  const updatedAt = allDone ? todayLocalISO() : progress.dayCompletedAt;

  const next: DayProgress = {
    ...progress,
    completion: updatedCompletion,
    dayCompletedAt: updatedAt,
  };

  const { error } = await supabase
    .from('student_character')
    .update({
      day_completion:   next.completion,
      day_completed_at: next.dayCompletedAt,
    } as any)
    .eq('student_id', studentId);

  if (error) {
    console.warn('[day-progress] mark complete failed', error.message);
    return { progress, justFinishedDay: false };
  }

  return {
    progress: next,
    justFinishedDay: allDone && !progress.dayCompletedAt,
  };
}
