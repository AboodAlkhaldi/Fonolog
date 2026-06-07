/**
 * Deep-link handling for Supabase auth flows.
 *
 * Currently this handles ONLY the signup-confirmation link:
 *   fonolog://verified#access_token=...&refresh_token=...&type=signup
 *
 * Password recovery is NOT handled here. The logged-out forgot-password flow
 * was removed entirely (it relied on a single-use token deep-link that email
 * scanners pre-consumed and custom-scheme redirects that in-app browsers
 * blocked). The only password change left is the logged-in Settings flow in
 * app/reset-password.tsx.
 *
 * The Supabase JS client has `detectSessionInUrl: false` on native (correct —
 * there is no `window.location`), so we parse the confirmation URL ourselves,
 * install the session, and let onAuthStateChange route the now-verified user.
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
 * Wires Linking events to Supabase session restoration for the signup
 * confirmation link. `onVerified` is invoked after the session is installed.
 * Returns a teardown function.
 */
export function setupDeepLinks(onVerified?: () => void): () => void {
  const handle = async (url: string | null) => {
    if (!url) return;

    const params        = paramsFromUrl(url);
    const type          = params.get('type')          ?? '';
    const code          = params.get('code')          ?? '';
    const access_token  = params.get('access_token')  ?? '';
    const refresh_token = params.get('refresh_token') ?? '';
    const authError     = params.get('error_code') || params.get('error');

    const isSignup = type === 'signup' || url.includes('verified');

    // Ignore links that carry no signup payload we recognise (normal deep links).
    if (!isSignup) return;
    if (!code && !access_token && !authError) return;

    if (authError) {
      console.warn('[deep-link] auth error:', authError, params.get('error_description') ?? '');
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

    if (established) onVerified?.();
  };

  Linking.getInitialURL()
    .then((url) => handle(url))
    .catch((e) => console.warn('[deep-link] getInitialURL:', e));

  const sub = Linking.addEventListener('url', ({ url }) => { void handle(url); });
  return () => sub.remove();
}
