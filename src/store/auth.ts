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
import { offlineCache } from '@/lib/offline-cache';
import { flushQueue } from '@/lib/offline-queue';
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
  | 'needsPasswordReset'
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
  deactivateAccount:    () => Promise<void>;

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

      const derived = deriveStatus(session, profile);
      set({
        session,
        user: session?.user ?? null,
        profile,
        status: derived === 'loading' ? 'unauthenticated' : derived,
      });

      // Drain any pending offline writes now that we're back online (best-effort).
      flushQueue().catch(() => { /* ignore */ });
    } catch (e) {
      console.error('[auth] initialize failed:', e);
      set({ status: 'unauthenticated', session: null, user: null, profile: null });
    }

    // Deep-link recovery: parse fonolog://reset-password#access_token=... and
    // install the session. After that, flip status so the protected route
    // navigates to /reset-password. This is needed because on native we run
    // with detectSessionInUrl: false, so Supabase does not auto-handle the URL.
    setupDeepLinks(
      () => { set({ status: 'needsPasswordReset' }); },
      () => {
        // Signup confirmation: refresh profile and let deriveStatus route the
        // user to role-choice / dashboard. The setSession in deep-linking.ts
        // already installed the session, which will trigger onAuthStateChange.
      },
    );

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Password recovery deep link → route to reset-password page.
      if (event === 'PASSWORD_RECOVERY') {
        set({ status: 'needsPasswordReset', session: newSession, user: newSession?.user ?? null });
        return;
      }

      try {
        let p: Profile | null = null;
        if (newSession?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle();
          p = (data as Profile) ?? null;
        }

        // If a deactivated account just confirmed their email (re-registration),
        // reactivate it so they continue from where they left off. Also fire
        // the welcome-back email (separate template from first-time welcome).
        if (event === 'SIGNED_IN' && p && (p as any).is_active === false) {
          await supabase
            .from('profiles')
            .update({ is_active: true } as any)
            .eq('id', newSession!.user.id);
          p = { ...p, is_active: true } as any;
          supabase.functions.invoke('send-welcome-back-email', {
            body: { user_id: newSession!.user.id },
          }).catch((e) => console.warn('[auth] welcome-back email failed', e));
        } else if (
          event === 'SIGNED_IN' &&
          p &&
          newSession?.user?.email_confirmed_at &&
          !(p as any).welcome_email_sent_at
        ) {
          // First-time verification: fire welcome email (idempotent on the
          // server side via welcome_email_sent_at stamp).
          supabase.functions.invoke('send-welcome-email', {
            body: { user_id: newSession.user.id },
          }).catch((e) => console.warn('[auth] welcome email failed', e));
        }

        // If a recovery deep-link already flipped us to needsPasswordReset,
        // preserve that ONLY while a session is present — setSession from the
        // deep-link fires SIGNED_IN which would otherwise overwrite recovery
        // state with 'authenticated'. On SIGNED_OUT (no session) we fall
        // through so signOut() can complete the transition.
        if (get().status === 'needsPasswordReset' && newSession?.user) {
          set({ session: newSession, user: newSession.user, profile: p });
          return;
        }

        diffPlanAndAlert(get().profile, p);
        const derived = deriveStatus(newSession, p);
        set({
          session: newSession,
          user: newSession?.user ?? null,
          profile: p,
          status: derived === 'loading' ? 'unauthenticated' : derived,
        });
      } catch (e) {
        console.error('[auth] onAuthStateChange failed:', e);
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

    // Block deactivated accounts from signing in with password.
    if (profile && (profile as any).is_active === false) {
      await supabase.auth.signOut();
      throw new AppError('Bu hesap devre dışı bırakıldı. Yeniden kayıt olarak hesabınızı geri yükleyebilirsiniz.');
    }

    if (profile) offlineCache.setProfile(profile);

    const derived = deriveStatus(data.session, profile);
    set({
      session: data.session,
      user: data.user,
      profile,
      status: derived === 'loading' ? 'needsRoleChoice' : derived,
    });

    // Drain offline-queued writes now that we're online again.
    flushQueue().catch(() => { /* ignore */ });
  },

  deactivateAccount: async () => {
    const { user } = get();
    if (!user) throw new AppError('Oturum bulunamadı.');
    const { error } = await supabase.rpc('deactivate_account' as any);
    if (error) throw new AppError(error.message);
    // Fire the goodbye email + admin emails. We do this BEFORE signOut so the
    // user's session is still attached when the edge function authenticates.
    try {
      await supabase.functions.invoke('send-account-removed-email', {
        body: { user_id: user.id },
      });
    } catch (e) {
      console.warn('[auth] goodbye email failed', e);
    }
    await supabase.auth.signOut();
    set({ status: 'unauthenticated', session: null, user: null, profile: null, impersonating: null });
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
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const profile = data as Profile;
    if (profile) offlineCache.setProfile(profile);
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
}));
