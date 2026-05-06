/**
 * Auth state machine — Stage 12+ update.
 *
 * Statuses:
 *   loading              — boot, reading session
 *   unauthenticated      — no session
 *   awaitingEmailVerify  — signed up, email not confirmed
 *   needsRoleChoice      — email verified, no role yet (NEW)
 *   needsOnboarding      — student role chosen, missing age/avatar
 *   needsTeacherSignup   — teacher role chosen, missing teacher fields (NEW)
 *   authenticated        — fully set up
 */
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
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

  initialize:        () => Promise<void>;
  signUp:            (email: string, password: string, fullName: string) => Promise<{ ok: boolean; error?: string }>;
  signIn:            (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut:           () => Promise<void>;
  resendVerification:() => Promise<{ ok: boolean; error?: string }>;
  refreshProfile:    () => Promise<void>;

  /** Set role at first time. Cannot be undone (DB trigger enforces). */
  chooseRole:        (role: 'student' | 'teacher') => Promise<{ ok: boolean; error?: string }>;

  /** Save child age/avatar (student only). */
  saveChildInfo:     (age: number, avatarEmoji: string) => Promise<{ ok: boolean; error?: string }>;

  /** Save teacher signup fields (teacher only). */
  saveTeacherInfo:   (data: {
                         schoolName?: string;
                         plannedStudents?: number;
                         teacherAge?: number;
                         plannedPlan?: 'monthly' | 'yearly';
                       }) => Promise<{ ok: boolean; error?: string }>;

  /** Admin preview controls. */
  startImpersonation: (kind: 'student' | 'teacher') => void;
  stopImpersonation:  () => void;
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
        // If deriveStatus returns 'loading' (valid session but no profile row),
        // fall back to unauthenticated so the app never gets stuck on a blank screen.
        status: derived === 'loading' ? 'unauthenticated' : derived,
      });
    } catch (e) {
      console.error('[auth] initialize failed:', e);
      set({ status: 'unauthenticated', session: null, user: null, profile: null });
    }

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
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
    if (error) return { ok: false, error: error.message };
    if (data.session) {
      set({ session: data.session, user: data.user, status: 'awaitingEmailVerify' });
    }
    return { ok: true };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    // Fetch profile immediately so navigation happens synchronously
    // instead of waiting for onAuthStateChange (which can silently stall).
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
        return { ok: false, error: 'Profil yüklenemedi. Lütfen tekrar deneyin.' };
      }
      profile = (row as Profile) ?? null;
    }

    const derived = deriveStatus(data.session, profile);
    set({
      session: data.session,
      user: data.user,
      profile,
      status: derived === 'loading' ? 'needsRoleChoice' : derived,
    });
    return { ok: true };
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
    if (!user?.email) return { ok: false, error: 'no email' };
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  refreshProfile: async () => {
    const { user, session } = get();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    set({ profile: data as Profile, status: deriveStatus(session, data as Profile) });
  },

  chooseRole: async (role) => {
    const { user, session } = get();
    if (!user) return { ok: false, error: 'no user' };

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
      if (!isRoleLocked) return { ok: false, error: error.message };

      const { data: stamped, error: stampError } = await supabase
        .from('profiles')
        .update({ role_locked_at: new Date().toISOString() } as any)
        .eq('id', user.id)
        .select()
        .single();
      if (stampError) return { ok: false, error: stampError.message };
      set({ profile: stamped as Profile, status: deriveStatus(session, stamped as Profile) });
      return { ok: true };
    }

    set({ profile: data as Profile, status: deriveStatus(session, data as Profile) });
    return { ok: true };
  },

  saveChildInfo: async (age, avatarEmoji) => {
    const { user, session } = get();
    if (!user) return { ok: false, error: 'no user' };
    const { data, error } = await supabase
      .from('profiles')
      .update({ child_age: age, child_avatar_emoji: avatarEmoji } as any)
      .eq('id', user.id)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    set({ profile: data as Profile, status: deriveStatus(session, data as Profile) });
    return { ok: true };
  },

  saveTeacherInfo: async (data) => {
    const { user, session } = get();
    if (!user) return { ok: false, error: 'no user' };
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
    if (error) return { ok: false, error: error.message };
    set({ profile: row as Profile, status: deriveStatus(session, row as Profile) });
    return { ok: true };
  },

  startImpersonation: (kind) => set({ impersonating: kind }),
  stopImpersonation:  () => set({ impersonating: null }),
}));
