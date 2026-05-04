/**
 * Form validation schemas (Zod).
 *
 * All error messages are i18n keys, NOT raw Turkish — the UI layer
 * looks them up with t(). Keeps schemas locale-free and testable.
 */
import { z } from 'zod';

const email = z
  .string({ required_error: 'forms.required' })
  .trim()
  .min(1,   'forms.required')
  .email(    'auth.register.errors.invalidEmail');

const password = z
  .string({ required_error: 'forms.required' })
  .min(8,  'auth.register.errors.passwordShort');

const fullName = z
  .string({ required_error: 'forms.required' })
  .trim()
  .min(2,  'forms.tooShort');

// ─── Schemas ──────────────────────────────────────────────
export const registerSchema = z.object({
  fullName,
  email,
  password,
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'auth.register.passwordMismatch',
  path:    ['passwordConfirm'],
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'forms.required'),
});

export const forgotSchema = z.object({
  email,
});

export const childInfoSchema = z.object({
  age:         z.number().int().min(3, 'forms.invalid').max(18, 'forms.invalid'),
  avatarEmoji: z.string().min(1, 'forms.required'),
});

// ─── Inferred types ──────────────────────────────────────
export type RegisterValues  = z.infer<typeof registerSchema>;
export type LoginValues     = z.infer<typeof loginSchema>;
export type ForgotValues    = z.infer<typeof forgotSchema>;
export type ChildInfoValues = z.infer<typeof childInfoSchema>;
