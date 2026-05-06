/**
 * Tier / access helpers — one place for freemium logic.
 *
 * Tiers (descending power):
 *   admin                           → unlimited everything (preview also unlocks all)
 *   subscribed (active/student/expert) → all 24 modules, all words, all categories
 *   trial (within 7 days)          → like subscribed
 *   free (no sub, no trial)        → 5 modules, 8 words/cat, all categories visible
 *                                     but premium ones locked at module level
 */
import type { Profile, ModuleDefinition } from '@/domain';

export type AccessTier = 'admin' | 'subscribed' | 'trial' | 'free';

export const FREE_MODULE_IDS = new Set([
  'tani', 'tamamla', 'kategori', 'uyak', 'heceBirlestir',
]);

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

  // Admin override (when admin previews student/teacher view)
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

/** Can this tier launch this module? */
export function canPlayModule(tier: AccessTier, moduleId: string): boolean {
  if (tier === 'admin' || tier === 'subscribed' || tier === 'trial') return true;
  return FREE_MODULE_IDS.has(moduleId);
}

/** How many words from a category should the user see in a session? */
export function maxWordsForTier(tier: AccessTier): number | null {
  if (tier === 'admin' || tier === 'subscribed' || tier === 'trial') return null;
  return FREE_WORDS_PER_CATEGORY;
}

/** Does this user need to see the paywall on a tap? */
export function shouldShowPaywall(tier: AccessTier): boolean {
  return tier === 'free';
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

/** Filter modules a user can see. Free users still see all but get locked badges. */
export function isModuleLocked(tier: AccessTier, moduleDef: ModuleDefinition): boolean {
  if (tier === 'admin' || tier === 'subscribed' || tier === 'trial') return false;
  return !FREE_MODULE_IDS.has(moduleDef.id);
}
