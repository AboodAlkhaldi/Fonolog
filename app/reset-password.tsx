import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAuth } from '@/store/auth';
import { useAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/error';
import { translateAuthError } from '@/lib/auth-errors';
import { theme } from '@/theme';
import { t } from '@/i18n';

/**
 * In-app change-password screen for LOGGED-IN users (Settings → şifre değiştir).
 * It always runs with a live session, so it just updates the password and sends
 * the user back to login to sign in with the new credentials.
 *
 * The LOGGED-OUT recovery flow is separate and OTP-based:
 * app/(auth)/forgot-password → reset-password-otp (reached via "Şifremi
 * unuttum?" on login). This screen is only reachable by a signed-in user from
 * Settings. See src/lib/deep-linking.ts.
 */
export default function ResetPasswordScreen() {
  const signOut = useAuth((s) => s.signOut);
  const alert   = useAlert();
  const [password, setPassword]       = useState('');
  const [passwordConfirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new AppError(t('auth.resetPassword.errorShort') as string);
      if (password !== passwordConfirm) throw new AppError(t('auth.resetPassword.errorMismatch') as string);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new AppError(translateAuthError(error), (error as any)?.code);
    },
    onSuccess: async () => {
      // Sign out FIRST so status flips to unauthenticated; otherwise the
      // protected-route guard bounces /(auth)/login back to the home tab.
      await signOut();
      router.replace('/(auth)/login');
    },
    onError: alert.setAlert,
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.resetPassword.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.resetPassword.subtitle')}</Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? ''} />

      <Input
        label={t('auth.resetPassword.newPassword')}
        placeholder={t('auth.resetPassword.passwordPh')}
        value={password}
        onChangeText={(v) => { setPassword(v); alert.clearAlert(); }}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />
      <Input
        label={t('auth.resetPassword.confirmPassword')}
        value={passwordConfirm}
        onChangeText={(v) => { setConfirm(v); alert.clearAlert(); }}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />

      <Button
        label={t('auth.resetPassword.submit')}
        variant="cta"
        size="lg"
        fullWidth
        loading={mutation.isPending}
        onPress={() => { alert.clearAlert(); mutation.mutate(); }}
        style={styles.submit}
      />
      <Button
        label={t('app.cancel')}
        variant="ghost"
        size="lg"
        fullWidth
        onPress={() => router.back()}
        style={styles.cancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing[6] },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  submit: { marginTop: theme.spacing[4] },
  cancel: { marginTop: theme.spacing[2] },
});
