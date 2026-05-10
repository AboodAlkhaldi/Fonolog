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
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        profile = (data as Profile) ?? null;
      }

      const derived = deriveStatus(session, profile);
      set({
        session,
        user: session?.user ?? null,
        profile,
        status: derived === 'loading' ? 'unauthenticated' : derived,
      });
    } catch (e) {
      console.error('[auth] initialize failed:', e);
      set({ status: 'unauthenticated', session: null, user: null, profile: null });
    }

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
        // reactivate it so they continue from where they left off.
        if (event === 'SIGNED_IN' && p && (p as any).is_active === false) {
          await supabase
            .from('profiles')
            .update({ is_active: true } as any)
            .eq('id', newSession!.user.id);
          p = { ...p, is_active: true } as any;
        }

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
      options: { data: { full_name: fullName } },
    });
    if (error) throw new AppError(error.message);

    // Supabase returns success with empty identities when the email is already
    // registered AND confirmed (security by obfuscation). Surface a real error.
    if (data.user?.identities?.length === 0) {
      throw new AppError('Bu e-posta adresi zaten kullanılıyor.');
    }

    if (data.session) {
      set({ session: data.session, user: data.user, status: 'awaitingEmailVerify' });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new AppError(error.message);

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

    const derived = deriveStatus(data.session, profile);
    set({
      session: data.session,
      user: data.user,
      profile,
      status: derived === 'loading' ? 'needsRoleChoice' : derived,
    });
  },

  deactivateAccount: async () => {
    const { user } = get();
    if (!user) throw new AppError('Oturum bulunamadı.');
    const { error } = await supabase.rpc('deactivate_account' as any);
    if (error) throw new AppError(error.message);
    await supabase.auth.signOut();
    set({ status: 'unauthenticated', session: null, user: null, profile: null, impersonating: null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      status: 'unauthenticated',
      session: null,
      user: null,
      profile: null,
      impersonating: null,
    });
  },

  resendVerification: async () => {
    const { user } = get();
    if (!user?.email) throw new AppError('No email on session');
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    if (error) throw new AppError(error.message);
  },

  refreshProfile: async () => {
    const { user, session } = get();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    set({ profile: data as Profile, status: deriveStatus(session, data as Profile) });
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

    // DB trigger blocks role changes after first set. If the profile already has
    // a role but is missing role_locked_at (pre-migration users), stamp the
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
