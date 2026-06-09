/**
 * Logged-out password-recovery flow state.
 *
 * The recovery flow is OTP-based (no deep links): the user requests a 6-digit
 * code on the forgot-password screen, then enters it + a new password on the
 * reset-password-otp screen. This tiny store carries the email between those
 * two screens and timestamps when the code was issued.
 *
 * It is ALSO the guard for reset-password-otp: that screen is only reachable
 * while `email` is set (i.e. mid-flow). A direct navigation with no email
 * bounces the user back to login — the screen can't be opened out of context.
 */
import { create } from 'zustand';

/**
 * Client-side lifetime of a recovery code. The server (Supabase email-OTP
 * expiry) is the real security gate; this enforces a tighter 3-minute UX
 * window and drives the "request a new code" affordance.
 */
export const RESET_CODE_TTL_MS = 3 * 60 * 1000;

interface PasswordResetState {
  /** Email the recovery code was sent to. Null when no reset is in progress. */
  email: string | null;
  /** Epoch ms when the current code was requested. */
  requestedAt: number | null;
  /** Start a reset for `email` and stamp the request time. */
  begin: (email: string) => void;
  /** Refresh the request time after the user asks for a new code. */
  markResent: () => void;
  /** Clear all state (on success, or when leaving the flow). */
  clear: () => void;
}

export const usePasswordReset = create<PasswordResetState>((set) => ({
  email: null,
  requestedAt: null,
  begin: (email) => set({ email, requestedAt: Date.now() }),
  markResent: () => set({ requestedAt: Date.now() }),
  clear: () => set({ email: null, requestedAt: null }),
}));
