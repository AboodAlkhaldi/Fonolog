/**
 * Auth state machine — Stage 12+ update.
 *
 * Statuses:
 *   loading              — boot, reading session
 *   unauthenticated      — no session
 *   awaitingEmailVerify  — signed up, email not confirmed
 *   needsRoleChoice      — email verified, no role yet
 *   needsOnboarding      — student role chosen, missing age/avatar
 *   needsTeacherSignup   — teacher role chosen, missing teacher fields
 *   authenticated        — fully set up
 *
 * All async methods throw AppError on failure; return void on success.
 * Callers (useMutation, try/catch) decide how to surface errors.
 */
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/error';
import { translateAuthError } from '@/lib/auth-errors';
import { setupDeepLinks } from '@/lib/deep-linking';
import { TEACHER_MODULE_ENABLED } from '@/domain/feature-flags';
import { offlineCache } from '@/lib/offline-cache';
import { showAlert } from '@/store/alert';
import { useCharacter } from '@/store/character';
import { useNotificationsStore } from '@/store/notifications';
import type { ProfileRow } from '@/lib/database.types';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'awaitingEmailVerify'
  | 'needsRoleChoice'
  | 'needsOnboarding'
  | 'needsTeacherSignup'
  | 'authenticated';

export type Profile = ProfileRow;

interface AuthState {
  status:    AuthStatus;
  session:   Session | null;
  user:      User | null;
  profile:   Profile | null;

  /** When admin is previewing student/teacher view, this holds the original profile. */
  impersonating: 'student' | 'teacher' | null;

  initialize:           () => Promise<void>;
  signUp:               (email: string, password: string, fullName: string) => Promise<void>;
  signIn:               (email: string, password: string) => Promise<void>;
  signOut:              () => Promise<void>;
  resendVerification:   () => Promise<void>;
  refreshProfile:       () => Promise<void>;

  /** Set role at first time. Cannot be undone (DB trigger enforces). */
  chooseRole:           (role: 'student' | 'teacher') => Promise<void>;

  /** Save child age/avatar (student only). */
  saveChildInfo:        (age: number, avatarEmoji: string) => Promise<void>;

  /** Save teacher signup fields (teacher only). */
  saveTeacherInfo:      (data: {
                            schoolName?: string;
                            plannedStudents?: number;
                            teacherAge?: number;
                            plannedPlan?: 'monthly' | 'yearly';
                          }) => Promise<void>;

  /** Admin preview controls. */
  startImpersonation:   (kind: 'student' | 'teacher') => void;
  stopImpersonation:    () => void;

  /**
   * Suppress the auth listener's profile-fetch + status change while an external
   * flow temporarily holds a session it will discard. Used by the logged-out
   * password-recovery screen: verifyOtp installs a short-lived recovery session,
   * but we must NOT route the user into the app — we update the password and sign
   * back out. Toggling this keeps status on 'unauthenticated' throughout.
   */
  setExternalAuthGuard: (on: boolean) => void;
}

/** Detect a paid → free transition (or the reverse) and surface a UI popup. */
function diffPlanAndAlert(prev: Profile | null, next: Profile | null): void {
  if (!prev || !next) return;
  if (prev.id !== next.id) return; // different user — ignore
  const wasPro  = (prev.subscription_status ?? 'free') !== 'free';
  const isPro   = (next.subscription_status ?? 'free') !== 'free';
  if (wasPro === isPro) return;
  if (isPro) {
    showAlert(
      'Pro üyeliğin başladı! 🎉',
      'Tüm içeriklere ve oyunlara erişim açıldı. İyi okumalar!',
    );
  } else {
    showAlert(
      'Aboneliğin sona erdi',
      'Artık ücretsiz planı kullanıyorsun. Bazı oyunlar kilitli olacak — istediğin zaman Pro\'ya yeniden geçebilirsin.',
    );
  }
}

function deriveStatus(session: Session | null, profile: Profile | null): AuthStatus {
  if (!session) return 'unauthenticated';
  if (!session.user.email_confirmed_at) return 'awaitingEmailVerify';
  if (!profile) return 'loading';
  if (!profile.role || !profile.role_locked_at) return 'needsRoleChoice';
  if (profile.role === 'student') {
    if (!profile.child_age || !profile.child_avatar_emoji) return 'needsOnboarding';
  }
  if (profile.role === 'teacher') {
    if (!profile.school_name && !profile.planned_plan) return 'needsTeacherSignup';
  }
  return 'authenticated';
}

/**
 * Single-fetch guard. `initialize()` and `signIn()` own the profile fetch.
 * Supabase fires extra auth events (a duplicate SIGNED_IN from
 * signInWithPassword, a TOKEN_REFRESHED from setSession, an INITIAL_SESSION on
 * listener registration). While an explicit auth flow is in flight, the
 * onAuthStateChange listener must NOT run its own profile fetch — that second
 * fetch raced the explicit one and a transient null briefly downgraded the
 * status to 'unauthenticated', which is the first-login "stuck reloading" bug.
 */
let explicitAuthInFlight = false;

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  user: null,
  profile: null,
  impersonating: null,

  initialize: async () => {
    set({ status: 'loading' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let profile: Profile | null = null;

      if (session?.user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          profile = (data as Profile) ?? null;
          if (profile) offlineCache.setProfile(profile);
        } catch (fetchErr) {
          // Offline: fall back to the cached profile so the user can still
          // open the app, browse cached content, and have writes queued.
          console.warn('[auth] profile fetch failed, using cache:', fetchErr);
          profile = offlineCache.getProfile(session.user.id);
        }
      }

      // Teacher module disabled: a restored teacher-role session is signed out
      // so the app can't open into the (now hidden) teacher experience. We fall
      // through to register the deep-link / auth listeners below.
      if (!TEACHER_MODULE_ENABLED && profile?.role === 'teacher') {
        await supabase.auth.signOut();
        set({ status: 'unauthenticated', session: null, user: null, profile: null, impersonating: null });
      } else {
        const derived = deriveStatus(session, profile);
        set({
          session,
          user: session?.user ?? null,
          profile,
          status: derived === 'loading' ? 'unauthenticated' : derived,
        });
      }
    } catch (e) {
      console.error('[auth] initialize failed:', e);
      set({ status: 'unauthenticated', session: null, user: null, profile: null });
    }

    // Deep-link: signup confirmation only (fonolog://verified#...). Logged-out
    // password recovery is OTP-code based (not a deep link) — see
    // app/(auth)/forgot-password + reset-password-otp. The setSession in
    // deep-linking.ts triggers onAuthStateChange, which refreshes the profile
    // and routes the verified user.
    setupDeepLinks();

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Signed out (or any event without a session) → clear and let the
      // protected route send the user to welcome.
      if (event === 'SIGNED_OUT' || !newSession?.user) {
        set({ status: 'unauthenticated', session: null, user: null, profile: null, impersonating: null });
        return;
      }

      const prev = get();

      // Single-fetch guarantee: if an explicit auth flow owns the fetch, or we
      // already hold this same user's profile, just keep the session token
      // fresh — never re-fetch or re-derive status here. This is what stops the
      // duplicate SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION events from
      // racing the explicit fetch and momentarily downgrading to
      // 'unauthenticated'. (We still defer to an in-progress password reset.)
      const sameUserKnown = !!prev.profile && prev.user?.id === newSession.user.id;
      if (explicitAuthInFlight || sameUserKnown) {
        set({ session: newSession, user: newSession.user });
        return;
      }

      // Genuine new authentication not yet reflected in state (e.g. an
      // email-verification deep link). This is the ONE place the listener
      // fetches a profile.
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newSession.user.id)
          .maybeSingle();
        const p = (data as Profile) ?? null;

        // First-time verification: fire welcome email (idempotent on the
        // server side via welcome_email_sent_at stamp). Account deletion /
        // reactivation no longer exists, so there is no welcome-back path.
        if (
          event === 'SIGNED_IN' &&
          p &&
          newSession.user.email_confirmed_at &&
          !(p as any).welcome_email_sent_at
        ) {
          supabase.functions.invoke('send-welcome-email', {
            body: { user_id: newSession.user.id },
          }).catch((e) => console.warn('[auth] welcome email failed', e));
        }

        if (p) offlineCache.setProfile(p);
        diffPlanAndAlert(prev.profile, p);
        const derived = deriveStatus(newSession, p);
        set({
          session: newSession,
          user: newSession.user,
          profile: p,
          status: derived === 'loading' ? 'unauthenticated' : derived,
        });
      } catch (e) {
        console.error('[auth] onAuthStateChange failed:', e);
        // Network failure while fetching — keep the token fresh but NEVER
        // downgrade an already-settled session on a transient error.
        set({ session: newSession, user: newSession.user });
      }
    });
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'fonolog://verified',
      },
    });
    if (error) throw new AppError(translateAuthError(error, 'register'), (error as any)?.code);

    // Supabase returns success with empty identities when the email is already
    // registered AND confirmed (security by obfuscation). Surface a real error.
    if (data.user?.identities?.length === 0) {
      throw new AppError('Bu e-posta adresi zaten kullanılıyor.');
    }

    // With email confirmation enabled Supabase returns data.user but data.session
    // is null — the session only arrives after the user clicks the email link.
    // Store the user now so verify-email can show the address and
    // useProtectedRoute stays on awaitingEmailVerify instead of bouncing back.
    if (data.user) {
      set({ session: data.session ?? null, user: data.user, status: 'awaitingEmailVerify' });
    }
  },

  signIn: async (email, password) => {
    // Own the profile fetch for this flow; suppress the listener's fetch so the
    // duplicate SIGNED_IN / setSession token events can't race it (see
    // explicitAuthInFlight). Always cleared in finally.
    explicitAuthInFlight = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new AppError(translateAuthError(error), (error as any)?.code);

      // After a recent password change → signOut → signIn cycle, the Supabase JS
      // client can have its internal session in a transient state where the next
      // PostgREST query hangs because the auth header is mid-rotation. Force-
      // install the just-issued session synchronously so the profile fetch below
      // uses the fresh token instead of waiting on the internal auto-refresh.
      if (data.session) {
        await supabase.auth.setSession({
          access_token:  data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      let profile: Profile | null = null;
      if (data.session?.user) {
        const { data: row, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[auth] signIn: profile fetch error:', profileError);
          await supabase.auth.signOut();
          throw new AppError('Profil yüklenemedi. Lütfen tekrar deneyin.');
        }
        profile = (row as Profile) ?? null;
      }

      // Teacher module disabled: teacher-role accounts may no longer sign in.
      // (Existing teachers should be re-roled to student; this guards any miss.)
      if (!TEACHER_MODULE_ENABLED && profile?.role === 'teacher') {
        await supabase.auth.signOut();
        throw new AppError('Bu hesap türü artık desteklenmiyor.');
      }

      if (profile) offlineCache.setProfile(profile);

      const derived = deriveStatus(data.session, profile);
      set({
        session: data.session,
        user: data.user,
        profile,
        status: derived === 'loading' ? 'needsRoleChoice' : derived,
      });
    } finally {
      explicitAuthInFlight = false;
    }
  },

  signOut: async () => {
    // Flip local state first so useProtectedRoute can react immediately and any
    // caller using fire-and-forget signOut() sees the UI transition without
    // waiting for the server. The server revocation still happens below.
    set({
      status: 'unauthenticated',
      session: null,
      user: null,
      profile: null,
      impersonating: null,
    });
    useCharacter.getState().clear();
    useNotificationsStore.getState().clear();
    await supabase.auth.signOut();
  },

  resendVerification: async () => {
    const { user } = get();
    if (!user?.email) throw new AppError('No email on session');
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    if (error) throw new AppError(translateAuthError(error), (error as any)?.code);
  },

  refreshProfile: async () => {
    const { user, session, profile: prevProfile } = get();
    if (!user) return;
    // supabase-js does NOT throw on a network failure — it resolves with
    // { data: null, error }. If we blindly took `data`, an offline refresh would
    // overwrite a good profile with null and deriveStatus() would downgrade the
    // app to 'loading' (blank screen until full restart). Keep the existing
    // profile/status on any error or empty result — never downgrade a settled
    // session on a transient failure (same rule as onAuthStateChange).
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error || !data) return;
    const profile = data as Profile;
    offlineCache.setProfile(profile);
    diffPlanAndAlert(prevProfile, profile);
    set({ profile, status: deriveStatus(session, profile) });
  },

  chooseRole: async (role) => {
    const { user, session } = get();
    if (!user) throw new AppError('No user session');

    const { data, error } = await supabase
      .from('profiles')
      .update({ role, role_locked_at: new Date().toISOString() } as any)
      .eq('id', user.id)
      .select()
      .single();

    // DB trigger blocks role changes after first set. If the profile already
    // has a role but is missing role_locked_at (legacy data), stamp the
    // timestamp without touching role so deriveStatus can advance.
    if (error) {
      const isRoleLocked = error.message?.toLowerCase().includes('role cannot be modified');
      if (!isRoleLocked) throw new AppError(error.message);

      const { data: stamped, error: stampError } = await supabase
        .from('profiles')
        .update({ role_locked_at: new Date().toISOString() } as any)
        .eq('id', user.id)
        .select()
        .single();
      if (stampError) throw new AppError(stampError.message);
      set({ profile: stamped as Profile, status: deriveStatus(session, stamped as Profile) });
      return;
    }

    set({ profile: data as Profile, status: deriveStatus(session, data as Profile) });
  },

  saveChildInfo: async (age, avatarEmoji) => {
    const { user, session } = get();
    if (!user) throw new AppError('No user session');
    const { data, error } = await supabase
      .from('profiles')
      .update({ child_age: age, child_avatar_emoji: avatarEmoji } as any)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw new AppError(error.message);
    set({ profile: data as Profile, status: deriveStatus(session, data as Profile) });
  },

  saveTeacherInfo: async (data) => {
    const { user, session } = get();
    if (!user) throw new AppError('No user session');
    const { data: row, error } = await supabase
      .from('profiles')
      .update({
        school_name:      data.schoolName,
        planned_students: data.plannedStudents,
        teacher_age:      data.teacherAge,
        planned_plan:     data.plannedPlan,
      } as any)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw new AppError(error.message);
    set({ profile: row as Profile, status: deriveStatus(session, row as Profile) });
  },

  startImpersonation: (kind) => set({ impersonating: kind }),
  stopImpersonation:  () => set({ impersonating: null }),

  setExternalAuthGuard: (on) => { explicitAuthInFlight = on; },
}));
