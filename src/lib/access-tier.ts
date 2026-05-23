/**
 * Tier helpers — subscription-status classification only.
 *
 * Game-access gating moved to src/lib/day-progress.ts when we switched from
 * `level`-based unlocks to the 7-day curriculum. This file is intentionally
 * narrower now: it answers "what subscription tier is this user?" and exposes
 * a handful of display helpers. It no longer decides which modules are
 * playable — call `canPlayModule` from `@/lib/day-progress` for that.
 */
import type { ProfileRow as Profile } from './database.types';

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
