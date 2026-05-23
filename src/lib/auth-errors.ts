/**
 * Map Supabase auth errors to localized (Turkish) user-facing messages.
 *
 * Supabase returns AuthError instances with a stable `code` (preferred) and an
 * English `message`. We map known codes first, then fall back to substring
 * matching on the message, then to a generic Turkish error. We must never
 * surface the raw English message to the user.
 */
import type { AuthError } from '@supabase/supabase-js';
import { t } from '@/i18n';

type AnyError = AuthError | Error | { code?: string; message?: string; status?: number } | null | undefined;

export function translateAuthError(
  err: AnyError,
  context: 'login' | 'register' | 'reset' = 'login',
): string {
  if (!err) return t('auth.login.errors.generic');

  const code    = (err as any)?.code as string | undefined;
  const status  = (err as any)?.status as number | undefined;
  const message = String((err as any)?.message ?? '').toLowerCase();

  // Stable Supabase auth error codes (preferred).
  switch (code) {
    case 'invalid_credentials':
    case 'invalid_login_credentials':
      return t('auth.login.errors.wrongCredentials');
    case 'email_not_confirmed':
      return t('auth.login.errors.notVerified');
    case 'user_not_found':
      return t('auth.forgot.notFound');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t('authErrors.rateLimited');
    case 'weak_password':
      return t('auth.register.errors.passwordShort');
    case 'same_password':
      return t('authErrors.samePassword');
    case 'email_address_invalid':
    case 'validation_failed':
      return t('auth.register.errors.invalidEmail');
    case 'user_already_exists':
    case 'email_exists':
      return t('auth.register.errors.emailTaken');
    case 'session_expired':
    case 'session_not_found':
      return t('authErrors.sessionExpired');
  }

  // Substring fallbacks for older / unlabeled errors.
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return t('auth.login.errors.wrongCredentials');
  }
  if (message.includes('email not confirmed')) {
    return t('auth.login.errors.notVerified');
  }
  if (message.includes('user not found')) {
    return t('auth.forgot.notFound');
  }
  if (message.includes('rate limit') || status === 429) {
    return t('authErrors.rateLimited');
  }
  if (message.includes('password should be') || message.includes('weak password')) {
    return t('auth.register.errors.passwordShort');
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return t('auth.register.errors.emailTaken');
  }
  if (message.includes('network') || message.includes('fetch')) {
    return t('authErrors.network');
  }

  if (context === 'register') return t('auth.register.errors.generic');
  if (context === 'reset')    return t('auth.forgot.errors.generic');
  return t('auth.login.errors.generic');
}
