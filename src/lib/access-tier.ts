/**
 * Tier / access helpers — single source of truth for game-access freemium logic.
 *
 * Tiers:
 *   admin                                      → unlimited everything
 *   subscribed (active/student/expert)         → all 24 modules, all words
 *   trial (within 7 days, status='trial')      → level 0+1, no pronunciation games
 *   free (expired trial / no sub)              → level 0 only, no pronunciation games
 *
 * Quotas for non-game features (PDFs, assignments, students, reports) are
 * tracked in src/lib/entitlements.ts + the feature_usage table.
 */
import type { Profile, ModuleDefinition } from '@/domain';
import { getModule } from '@/domain';

export type AccessTier = 'admin' | 'subscribed' | 'trial' | 'free';

/** Words shown per category for users who can't see them all (free tier). */
export const FREE_WORDS_PER_CATEGORY = 8;

/**
 * If admin is impersonating a user, this overrides the access tier.
 * Set by AdminPreviewBanner when admin enters preview mode.
 */
let adminPreviewOverride: AccessTier | null = null;

export function setAdminPreviewTier(tier: AccessTier | null): void {
  adminPreviewOverride = tier;
}

export function getAccessTier(profile: Profile | null | undefined): AccessTier {
  if (!profile) return 'free';

  if (adminPreviewOverride !== null) return adminPreviewOverride;

  if (profile.role === 'admin') return 'admin';

  const sub = profile.subscription_status;

  if (sub === 'active' || sub === 'student' || sub === 'expert') return 'subscribed';

  if (sub === 'trial') {
    const expires = profile.subscription_expires
      ? new Date(profile.subscription_expires)
      : null;
    if (expires && expires > new Date()) return 'trial';
  }

  return 'free';
}

/** free tier: level 0 only, no pronunciation. */
function isOpenForFreeTier(def: ModuleDefinition): boolean {
  return def.level === 0 && !def.usesPronunciation;
}

/** trial tier: level 0+1, no pronunciation. */
function isOpenForTrialTier(def: ModuleDefinition): boolean {
  return (def.level === 0 || def.level === 1) && !def.usesPronunciation;
}

/** Can this tier launch this module? Accepts module ID or full definition. */
export function canPlayModule(tier: AccessTier, moduleIdOrDef: string | ModuleDefinition): boolean {
  if (tier === 'admin' || tier === 'subscribed') return true;

  const def = typeof moduleIdOrDef === 'string'
    ? getModule(moduleIdOrDef)
    : moduleIdOrDef;
  if (!def) return false;

  if (tier === 'trial') return isOpenForTrialTier(def);
  return isOpenForFreeTier(def);
}

/** How many words from a category should the user see in a session? null = unlimited. */
export function maxWordsForTier(tier: AccessTier): number | null {
  if (tier === 'admin' || tier === 'subscribed' || tier === 'trial') return null;
  return FREE_WORDS_PER_CATEGORY;
}

/** Does this user need to see the paywall on a tap? */
export function shouldShowPaywall(tier: AccessTier): boolean {
  return tier === 'free' || tier === 'trial';
}

/** Trial banner data, or null if not in trial. */
export function trialDaysRemaining(profile: Profile | null | undefined): number | null {
  if (!profile || profile.subscription_status !== 'trial') return null;
  const expires = profile.subscription_expires ? new Date(profile.subscription_expires) : null;
  if (!expires) return null;
  const ms = expires.getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Plan-lock: module is off-limits due to subscription tier.
 * Used for paywall redirect.
 */
export function isModuleLocked(tier: AccessTier, moduleDef: ModuleDefinition): boolean {
  if (tier === 'admin' || tier === 'subscribed') return false;
  if (tier === 'trial') return !isOpenForTrialTier(moduleDef);
  return !isOpenForFreeTier(moduleDef);
}

/**
 * Level-lock: subscribed/admin user hasn't reached the module's level yet.
 * Only applies to paid users — free/trial users see plan-lock instead.
 * Returns true when the student needs to progress further before unlocking.
 */
export function isModuleLevelLocked(
  tier: AccessTier,
  moduleDef: ModuleDefinition,
  studentLevel: number,
): boolean {
  if (tier !== 'subscribed' && tier !== 'admin') return false;
  return moduleDef.level > studentLevel;
}

/** Map subscription_status to a Turkish display label. */
export function subscriptionLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    trial:   'Pro Deneme',
    active:  'Pro Aktif',
    student: 'Öğrenci Pro',
    expert:  'Uzman Pro',
    free:    'Ücretsiz',
  };
  return map[status ?? ''] ?? (status ?? 'Ücretsiz');
}
