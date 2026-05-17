/**
 * Deep-link handling for Supabase auth flows.
 *
 * Supabase password-recovery emails redirect to:
 *   okuma://reset-password#access_token=...&refresh_token=...&type=recovery
 *
 * The Supabase JS client has `detectSessionInUrl: false` on native (correct —
 * there is no `window.location`), so we parse the URL ourselves and call
 * `setSession`. After the session is installed, we ask the auth store to flip
 * status to `needsPasswordReset`, which the protected-route hook routes to
 * `/reset-password`.
 *
 * Wiring: auth.ts:initialize() calls setupDeepLinks once at app start.
 */
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

interface RecoveryTokens {
  access_token:  string;
  refresh_token: string;
}

function parseRecoveryTokens(url: string): RecoveryTokens | null {
  // Supabase puts tokens in the URL fragment (#...). Some platforms / older
  // configs put them in the query string. Try both.
  const hashIdx  = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const fragment = hashIdx  >= 0 ? url.slice(hashIdx + 1) : '';
  const query    = queryIdx >= 0
    ? url.slice(queryIdx + 1, hashIdx > queryIdx ? hashIdx : undefined)
    : '';
  const source = fragment || query;
  if (!source) return null;

  const params = new URLSearchParams(source);
  const access_token  = params.get('access_token')  ?? '';
  const refresh_token = params.get('refresh_token') ?? '';
  const type          = params.get('type')          ?? '';
  if (!access_token || !refresh_token || type !== 'recovery') return null;
  return { access_token, refresh_token };
}

function parseAuthTokens(url: string): { access_token: string; refresh_token: string; type: string } | null {
  // Same parser as recovery, but type-agnostic (signup confirmation also delivers tokens).
  const hashIdx  = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const fragment = hashIdx  >= 0 ? url.slice(hashIdx + 1) : '';
  const query    = queryIdx >= 0
    ? url.slice(queryIdx + 1, hashIdx > queryIdx ? hashIdx : undefined)
    : '';
  const source = fragment || query;
  if (!source) return null;
  const params = new URLSearchParams(source);
  const access_token  = params.get('access_token')  ?? '';
  const refresh_token = params.get('refresh_token') ?? '';
  const type          = params.get('type')          ?? '';
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, type };
}

/**
 * Wires Linking events to Supabase session restoration.
 * `onRecovery` is invoked after setSession succeeds for a password-recovery link.
 * `onVerified` is invoked after setSession succeeds for a signup-confirmation link.
 * Returns a teardown function.
 */
export function setupDeepLinks(
  onRecovery: () => void,
  onVerified?: () => void,
): () => void {
  const handle = async (url: string | null) => {
    if (!url) return;

    // ── Signup confirmation: okuma://verified?...&type=signup ──
    if (url.includes('verified')) {
      const tokens = parseAuthTokens(url);
      if (!tokens || (tokens.type && tokens.type !== 'signup')) return;
      const { error } = await supabase.auth.setSession({
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) { console.warn('[deep-link] setSession (signup) failed:', error); return; }
      onVerified?.();
      return;
    }

    // ── Password recovery ──
    if (!url.includes('reset-password')) return;

    const tokens = parseRecoveryTokens(url);
    if (!tokens) return;

    const { error } = await supabase.auth.setSession({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (error) {
      console.warn('[deep-link] setSession (recovery) failed:', error);
      return;
    }
    onRecovery();
  };

  Linking.getInitialURL()
    .then((url) => handle(url))
    .catch((e) => console.warn('[deep-link] getInitialURL:', e));

  const sub = Linking.addEventListener('url', ({ url }) => { void handle(url); });
  return () => sub.remove();
}
