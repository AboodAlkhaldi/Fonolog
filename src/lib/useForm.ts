/**
 * Lightweight form hook — Zod-based validation without pulling in
 * react-hook-form (we don't need its full power for our 4 forms).
 *
 * Usage:
 *   const form = useForm(loginSchema, { email: '', password: '' });
 *   <Input value={form.values.email} onChangeText={form.setField('email')} error={form.errors.email} />
 *   <Button label="Sign in" onPress={() => form.submit(handleSubmit)} />
 */
import { useState, useCallback } from 'react';
import type { ZodSchema, ZodFormattedError } from 'zod';
import { t } from '@/i18n';

export function useForm<T extends Record<string, unknown>>(
  schema:        ZodSchema<T>,
  initialValues: T,
) {
  const [values, setValues]       = useState<T>(initialValues);
  const [errors, setErrors]       = useState<Partial<Record<keyof T, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof T>(key: K) => {
    return (value: T[K] | string) => {
      setValues((prev) => ({ ...prev, [key]: value as T[K] }));
      // Clear error on edit
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }, []);

  const validate = useCallback((): T | null => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }
    // Format errors into { field: 'translated message' }
    const formatted = result.error.format() as ZodFormattedError<T>;
    const fieldErrors: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(values) as (keyof T)[]) {
      const node = (formatted as Record<string, { _errors?: string[] }>)[key as string];
      const msg  = node?._errors?.[0];
      if (msg) fieldErrors[key] = t(msg);
    }
    setErrors(fieldErrors);
    return null;
  }, [schema, values]);

  const submit = useCallback(async (
    handler: (validated: T) => void | Promise<void>,
  ) => {
    const validated = validate();
    if (!validated) return;
    try {
      setSubmitting(true);
      await handler(validated);
    } finally {
      setSubmitting(false);
    }
  }, [validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    submitting,
    setField,
    validate,
    submit,
    reset,
  };
}
