import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAlert } from '@/store/alert';
import { usePasswordReset } from '@/store/password-reset';
import { useForm } from '@/lib/useForm';
import { forgotSchema, type ForgotValues } from '@/lib/schemas';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/error';
import { translateAuthError } from '@/lib/auth-errors';
import { theme } from '@/theme';
import { t } from '@/i18n';

/**
 * Step 1 of the logged-out recovery flow: collect the email and ask Supabase to
 * send a 6-digit recovery code (the "Reset Password" template uses {{ .Token }}).
 *
 * Anti-enumeration: we only surface rate-limit errors. Unknown emails, etc. are
 * swallowed and we still advance to the code step, so the screen never reveals
 * which addresses are registered. begin() arms the guard on reset-password-otp.
 */
export default function ForgotPasswordScreen() {
  const alert = useAlert();
  const begin = usePasswordReset((s) => s.begin);
  const form  = useForm<ForgotValues>(forgotSchema, { email: '' });

  const mutation = useMutation({
    mutationFn: async (values: ForgotValues) => {
      const email = values.email.trim();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error && String((error as any)?.code ?? '').includes('rate')) {
        throw new AppError(translateAuthError(error, 'reset'), (error as any)?.code);
      }
      return email;
    },
    onSuccess: (email) => {
      begin(email);
      router.push('/(auth)/reset-password-otp');
    },
    onError: alert.setAlert,
  });

  const handleSubmit = () => {
    alert.clearAlert();
    const validated = form.validate();
    if (!validated) return;
    mutation.mutate(validated);
  };

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.back')}
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.forgot.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgot.subtitle')}</Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? ''} />

      <Input
        label={t('auth.forgot.email')}
        value={form.values.email}
        onChangeText={form.setField('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={form.errors.email}
        required
      />

      <Button
        label={t('auth.forgot.submit')}
        variant="cta"
        size="lg"
        fullWidth
        loading={mutation.isPending}
        onPress={handleSubmit}
        style={styles.submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  header: { marginBottom: theme.spacing[6] },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  submit: { marginTop: theme.spacing[4] },
});
