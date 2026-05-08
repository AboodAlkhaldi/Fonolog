/**
 * Adaptive difficulty + XP module.
 *
 * Pure functions. The session store calls `nextAdaptiveState` after each
 * answer to decide:
 *   - whether to step difficulty up or down
 *   - how much XP to award
 *   - whether to enter / exit "recovery mode" (looser threshold after a wrong)
 *
 * Rules (from spec):
 *   NORMAL:   3 consecutive correct → level +1, bonus XP
 *   ON WRONG: level -1 (floor at 1), enter recovery, reset consecutive counters
 *   RECOVERY: only 2 consecutive correct needed to step up; on success exit recovery
 *
 * XP = BASE × difficultyMultiplier × (recovery ? RECOVERY_MULT : 1) + streakBonus
 */

export interface AdaptiveState {
  /** Current difficulty (1 = easiest). */
  currentLevel:        number;
  /** Consecutive correct since last level change / reset. */
  consecutiveCorrect:  number;
  /** Consecutive wrong (used by callers for "encouragement" UI). */
  consecutiveWrong:    number;
  /** True after an error, until the user clears the recovery threshold. */
  recoveryMode:        boolean;
}

export interface AdaptiveStep {
  /** Updated state for the next question. */
  state:        AdaptiveState;
  /** Difficulty change applied THIS step: +1, 0, or -1. */
  levelChange:  -1 | 0 | 1;
  /** XP gained for this answer (0 if wrong). */
  xpGained:     number;
}

export const ADAPTIVE_DEFAULTS: AdaptiveState = {
  currentLevel:       1,
  consecutiveCorrect: 0,
  consecutiveWrong:   0,
  recoveryMode:       false,
};

const MIN_LEVEL              = 1;
const MAX_LEVEL              = 5;
const STEP_UP_NORMAL         = 3;
const STEP_UP_RECOVERY       = 2;
const XP_BASE_CORRECT        = 10;
const XP_LEVEL_UP_BONUS      = 25;
const XP_STREAK_BONUS_PER    = 2;     // per consecutive-correct beyond 1
const XP_RECOVERY_MULT       = 0.7;
const DIFFICULTY_MULT_BY_LV  = [1.0, 1.0, 1.15, 1.35, 1.6, 1.9];

function multiplier(level: number): number {
  const i = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
  return DIFFICULTY_MULT_BY_LV[i] ?? 1;
}

/** Compute the next state + XP for one answer. */
export function nextAdaptiveState(
  prev: AdaptiveState,
  wasCorrect: boolean,
): AdaptiveStep {
  if (!wasCorrect) {
    const newLevel = Math.max(MIN_LEVEL, prev.currentLevel - 1);
    return {
      state: {
        currentLevel:       newLevel,
        consecutiveCorrect: 0,
        consecutiveWrong:   prev.consecutiveWrong + 1,
        recoveryMode:       true,
      },
      levelChange: newLevel === prev.currentLevel ? 0 : -1,
      xpGained:    0,
    };
  }

  const nextStreak = prev.consecutiveCorrect + 1;
  const threshold  = prev.recoveryMode ? STEP_UP_RECOVERY : STEP_UP_NORMAL;
  const stepUp     = nextStreak >= threshold;

  const newLevel    = stepUp ? Math.min(MAX_LEVEL, prev.currentLevel + 1) : prev.currentLevel;
  const stayedRecov = !stepUp && prev.recoveryMode;

  // Reset the streak counter on level change
  const consecutiveCorrect = stepUp ? 0 : nextStreak;

  // XP calculation
  const mult        = multiplier(prev.currentLevel);
  const recovMult   = prev.recoveryMode ? XP_RECOVERY_MULT : 1;
  const streakBonus = Math.max(0, nextStreak - 1) * XP_STREAK_BONUS_PER;
  const levelBonus  = stepUp ? XP_LEVEL_UP_BONUS : 0;
  const xpGained    = Math.round(XP_BASE_CORRECT * mult * recovMult) + streakBonus + levelBonus;

  return {
    state: {
      currentLevel:       newLevel,
      consecutiveCorrect,
      consecutiveWrong:   0,
      // Exit recovery only when we successfully clear it (level steps up).
      recoveryMode:       stayedRecov,
    },
    levelChange: stepUp ? 1 : 0,
    xpGained,
  };
}

/** Helper for UIs that want a localized status hint. */
export function adaptiveStatus(s: AdaptiveState): 'recovery' | 'normal' | 'climbing' {
  if (s.recoveryMode)             return 'recovery';
  if (s.consecutiveCorrect >= 2)  return 'climbing';
  return 'normal';
}
