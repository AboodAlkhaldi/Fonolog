/**
 * Network awareness helpers.
 *
 * The session token persists in SecureStore so login state survives offline,
 * and `offline-cache.ts` keeps content readable without a network. What we
 * still need is a way to gate truly online-only actions (PDF generation,
 * RC sync, paywall) and surface a translated "you must be online" error
 * instead of a raw Supabase / fetch failure.
 *
 * We deliberately avoid pulling in @react-native-community/netinfo for this —
 * a 3-second HEAD probe to Supabase is enough, and we still catch fetch
 * failures classified via isNetworkError().
 */
import { AppError } from './error';
import { t } from '@/i18n';

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as any)?.message ?? '').toLowerCase();
  return msg.includes('network request failed')
      || msg.includes('failed to fetch')
      || msg.includes('network error')
      || msg.includes('typeerror: network')
      || msg.includes('aborted');
}

/** Probe Supabase for reachability. ~3s timeout. */
export async function isOnline(): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    // Any HTTP response counts as online — even 4xx means the server answered.
    return res.status > 0;
  } catch {
    return false;
  }
}

/** Throws a translated AppError if offline. Use before any online-only action. */
export async function requireOnline(): Promise<void> {
  if (!(await isOnline())) {
    throw new AppError(t('online.required'), 'OFFLINE');
  }
}

/**
 * Convert an arbitrary error into a translated user-facing message. If the
 * underlying cause is a network/fetch failure, return the "must be online"
 * string; otherwise re-surface the original message untouched.
 */
export function translateNetworkError(err: unknown, fallback?: string): string {
  if (isNetworkError(err)) return t('online.required');
  const msg = (err as any)?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : (fallback ?? t('app.error'));
}
