/**
 * Entitlement & quota layer.
 *
 * Game-access tiers live in `access-tier.ts`. This module covers the
 * "how many times per period" features:
 *   - PDF generation (student)
 *   - Assignment creation (teacher)
 *   - PDF report generation (teacher)
 *   - Student-link slots (teacher)
 *
 * Counts are tracked in the `feature_usage` Postgres table on a rolling-7-day
 * window. The `check_feature_usage` RPC is the source of truth — never trust
 * client-only counts (defense in depth).
 */
import { supabase } from './supabase';
import { getAccessTier, type AccessTier } from './access-tier';
import type { ProfileRow as Profile } from './database.types';

export type FeatureKey =
  | 'pdf_student'         // student-self PDF
  | 'pdf_teacher'         // teacher report PDF
  | 'assignment_create'   // teacher creates assignment
  | 'student_link';       // teacher links a new student

export interface FeatureLimit {
  /** Max calls per rolling 7 days. -1 means unlimited. */
  perWeek: number;
  /** Hard ceiling regardless of period. -1 means unlimited. */
  total?: number;
}

/**
 * Trial caps by feature. Pro / subscribed always have unlimited (perWeek: -1).
 * Admin bypasses all checks.
 */
export const TRIAL_LIMITS: Record<FeatureKey, FeatureLimit> = {
  pdf_student:       { perWeek: 2 },
  pdf_teacher:       { perWeek: 2 },
  assignment_create: { perWeek: 2 },
  student_link:      { perWeek: -1, total: 1 },
};

export interface UsageStatus {
  allowed:    boolean;
  used:       number;
  limit:      number;       // -1 if unlimited
  remaining:  number;       // -1 if unlimited
  reason?:    string;       // human-readable in Turkish if blocked
  needsUpgrade: boolean;    // true → suggest paywall
}

/** Returns the active limit for this user/feature, or null if unlimited. */
function limitFor(tier: AccessTier, feature: FeatureKey): FeatureLimit | null {
  if (tier === 'admin' || tier === 'subscribed') return null;
  // trial + free both fall under TRIAL_LIMITS for these features.
  return TRIAL_LIMITS[feature];
}

/**
 * Check whether the user can currently use the feature.
 * Calls `check_feature_usage` RPC for server-side count truth.
 */
export async function checkUsage(
  profile: Profile | null | undefined,
  feature: FeatureKey,
): Promise<UsageStatus> {
  const tier = getAccessTier(profile);
  const limit = limitFor(tier, feature);

  if (!limit) {
    return { allowed: true, used: 0, limit: -1, remaining: -1, needsUpgrade: false };
  }

  if (limit.perWeek === 0) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: 'Bu özellik abonelik gerektirir.',
      needsUpgrade: true,
    };
  }

  // Hit RPC for server-side weekly count
  const { data, error } = await supabase.rpc('check_feature_usage', {
    p_feature: feature,
  });

  const used = !error && typeof data === 'number' ? data : 0;
  const perWeek = limit.perWeek;
  const allowed = perWeek === -1 || used < perWeek;
  const remaining = perWeek === -1 ? -1 : Math.max(0, perWeek - used);

  return {
    allowed,
    used,
    limit: perWeek,
    remaining,
    reason: allowed ? undefined : 'Bu hafta için kotanızı doldurdunuz.',
    needsUpgrade: !allowed,
  };
}

/**
 * Increment usage AFTER the action succeeded.
 * Pro / admin: no-op (skip the RPC).
 */
export async function recordUsage(
  profile: Profile | null | undefined,
  feature: FeatureKey,
): Promise<void> {
  const tier = getAccessTier(profile);
  if (tier === 'admin' || tier === 'subscribed') return;
  await supabase.rpc('increment_feature_usage', { p_feature: feature });
}
