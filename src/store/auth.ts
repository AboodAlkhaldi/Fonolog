/**
 * Auth store — Zustand.
 *
 * State machine:
 *
 *   loading                ─┐
 *      ↓                    │ session restored on app launch
 *   unauthenticated         │
 *      ↓ signUp/signIn     │
 *   awaitingEmailVerify     │ (signUp only — Supabase requires email confirm)
 *      ↓ user verifies      │
 *   needsOnboarding         │ (no child_age set yet)
 *      ↓ saveChildInfo      │
 *   authenticated           │
 *      ↓ signOut           ─┘
 *   unauthenticated
 *
 * The root layout reads `status` and decides which (group) of routes to mount.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import type { ProfileRow } from '@/lib/database.types';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'awaitingEmailVerify'
  | 'needsOnboarding'
  | 'authenticated';

interface AuthState {
  status:   AuthStatus;
  session:  Session | null;
  user:     User    | null;
  profile:  ProfileRow | null;

  // ── Actions ──
  initialize:        () => Promise<void>;
  signUp:            (email: string, password: string, fullName: string) =>
                       Promise<{ ok: true } | { ok: false; error: string }>;
  signIn:            (email: string, password: string) =>
                       Promise<{ ok: true } | { ok: false; error: string }>;
  signOut:           () => Promise<void>;
  resendVerification:(email: string) =>
                       Promise<{ ok: true } | { ok: false; error: string }>;
  refreshProfile:    () => Promise<void>;
  saveChildInfo:     (age: number, avatarEmoji: string) =>
                       Promise<{ ok: true } | { ok: false; error: string }>;
}

// ─── Helper: derive AuthStatus from current pieces ───────
function deriveStatus(session: Session | null, profile: ProfileRow | null): AuthStatus {
  if (!session)                            return 'unauthenticated';
  if (!session.user.email_confirmed_at)    return 'awaitingEmailVerify';
  if (!profile)                            return 'loading';   // race: have session, fetching profile
  if (profile.child_age === null)          return 'needsOnboarding';
  return 'authenticated';
}

function humanizeAuthError(err: AuthError | Error | null): string {
  if (!err) return 'Bilinmeyen hata';
  const msg = (err.message ?? '').toLowerCase();
  if (msg.includes('invalid') && msg.includes('credential')) return 'auth.login.errors.wrongCredentials';
  if (msg.includes('email not confirmed'))                   return 'auth.login.errors.notVerified';
  if (msg.includes('user already registered'))               return 'auth.register.errors.emailTaken';
  if (msg.includes('password') && msg.includes('short'))     return 'auth.register.errors.passwordShort';
  if (msg.includes('invalid') && msg.includes('email'))      return 'auth.register.errors.invalidEmail';
  return msg || 'Bilinmeyen hata';
}

// ─── Store ──────────────────────────────────────────────
export const useAuth = create<AuthState>((set, get) => ({
  status:  'loading',
  session: null,
  user:    null,
  profile: null,

  // Called once at app root.
  initialize: async () => {
    // Subscribe to session changes for the rest of the app's life.
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session) {
        await get().refreshProfile();
      } else {
        set({ profile: null, status: 'unauthenticated' });
      }
    });

    // Read whatever's already in storage at boot.
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null });

    if (session) {
      await get().refreshProfile();
    } else {
      set({ status: 'unauthenticated' });
    }
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) return { ok: false, error: humanizeAuthError(error) };

    // Supabase returns a session immediately for unconfirmed signups when
    // email confirmation is OFF; when ON (production), session is null.
    set({
      session: data.session,
      user:    data.user,
      status:  data.session ? 'awaitingEmailVerify' : 'awaitingEmailVerify',
    });
    return { ok: true };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: humanizeAuthError(error) };
    set({ session: data.session, user: data.user });
    await get().refreshProfile();
    return { ok: true };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, status: 'unauthenticated' });
  },

  resendVerification: async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { ok: false, error: humanizeAuthError(error) };
    return { ok: true };
  },

  refreshProfile: async () => {
    const { user, session } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // Profile not yet created (trigger ran on the server, may not have replicated).
      // Stay on 'loading' — caller can retry.
      console.warn('[auth] refreshProfile error', error.message);
      set({ status: deriveStatus(session, null) });
      return;
    }

    set({ profile: data, status: deriveStatus(session, data) });
  },

  saveChildInfo: async (age, avatarEmoji) => {
    const { user } = get();
    if (!user) return { ok: false, error: 'Oturum bulunamadı' };

    const { data, error } = await supabase
      .from('profiles')
      .update({ child_age: age, child_avatar_emoji: avatarEmoji })
      .eq('id', user.id)
      .select()
      .single();

    if (error) return { ok: false, error: error.message };

    set({ profile: data, status: deriveStatus(get().session, data) });
    return { ok: true };
  },
}));
