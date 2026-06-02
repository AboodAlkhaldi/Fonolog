/**
 * Deep-link handling for Supabase auth flows.
 *
 * Supabase password-recovery emails redirect to:
 *   fonolog://reset-password#access_token=...&refresh_token=...&type=recovery
 *
 * The Supabase JS client has `detectSessionInUrl: false` on native (correct —
 * there is no `window.location`), so we parse the URL ourselves, install the
 * session, and ask the auth store to flip status to `needsPasswordReset`, which
 * the protected-route hook routes to `/reset-password`.
 *
 * Robustness notes:
 *  - We detect recovery by `type=recovery` OR a `reset-password` path. If
 *    `fonolog://reset-password` isn't in the project's allowed Redirect URLs,
 *    GoTrue falls back to the Site URL and the recovery tokens land on a
 *    different path — keying only off the path silently dropped them, which
 *    sent the user to the welcome screen instead of reset-password.
 *  - We accept both the implicit flow (access/refresh tokens in the fragment)
 *    and the PKCE flow (`?code=`), and we read params from BOTH the query
 *    string and the fragment.
 *
 * Wiring: auth.ts:initialize() calls setupDeepLinks once at app start.
 */
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Merge query-string and fragment params into one bag. Supabase delivers auth
 * params in either, depending on flow/platform, so we must check both.
 */
function paramsFromUrl(url: string): URLSearchParams {
  const hashIdx  = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const fragment = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const query    = queryIdx >= 0
    ? url.slice(queryIdx + 1, hashIdx > queryIdx ? hashIdx : undefined)
    : '';
  return new URLSearchParams([query, fragment].filter(Boolean).join('&'));
}

/**
 * Wires Linking events to Supabase session restoration.
 * `onRecovery` is invoked after the session is installed for a password-recovery
 * link. `onVerified` is invoked after a signup-confirmation link.
 * Returns a teardown function.
 */
export function setupDeepLinks(
  onRecovery: () => void,
  onVerified?: () => void,
  onRecoveryError?: () => void,
): () => void {
  const handle = async (url: string | null) => {
    if (!url) return;

    const params        = paramsFromUrl(url);
    const type          = params.get('type')          ?? '';
    const code          = params.get('code')          ?? '';
    const access_token  = params.get('access_token')  ?? '';
    const refresh_token = params.get('refresh_token') ?? '';
    const authError     = params.get('error_code') || params.get('error');

    const isRecovery = type === 'recovery' || url.includes('reset-password');
    const isSignup   = type === 'signup'   || url.includes('verified');

    // Ignore links that carry no auth payload we recognise (normal deep links).
    if (!code && !access_token && !authError && !isRecovery && !isSignup) return;

    // Expired / already-used / invalid link. GoTrue returns this in the
    // fragment (e.g. error_code=otp_expired) when the single-use token has
    // already been consumed or has lapsed. Tell the app so it can guide the
    // user to request a fresh link instead of silently leaving them stranded.
    if (authError) {
      console.warn('[deep-link] auth error:', authError, params.get('error_description') ?? '');
      if (isRecovery) onRecoveryError?.();
      return;
    }

    // Install the session from whichever flow delivered it: implicit (hash
    // tokens) or PKCE (?code= that must be exchanged).
    let established = false;
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) console.warn('[deep-link] setSession failed:', error);
      else established = true;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.warn('[deep-link] exchangeCodeForSession failed:', error);
      else established = true;
    }

    if (!established) {
      // We saw a recovery link but couldn't install a session (expired/invalid
      // tokens, or fragment stripped). Surface it rather than no-op.
      if (isRecovery) onRecoveryError?.();
      return;
    }

    if (isRecovery) onRecovery();
    else if (isSignup) onVerified?.();
  };

  Linking.getInitialURL()
    .then((url) => handle(url))
    .catch((e) => console.warn('[deep-link] getInitialURL:', e));

  const sub = Linking.addEventListener('url', ({ url }) => { void handle(url); });
  return () => sub.remove();
}
