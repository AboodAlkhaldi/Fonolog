import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAuth } from '@/store/auth';
import { useAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/error';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function ResetPasswordScreen() {
  const signOut = useAuth((s) => s.signOut);
  const alert   = useAlert();
  const [password, setPassword]         = useState('');
  const [passwordConfirm, setConfirm]   = useState('');
  const [fieldError, setFieldError]     = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new AppError(t('auth.resetPassword.errorShort') as string);
      if (password !== passwordConfirm) throw new AppError(t('auth.resetPassword.errorMismatch') as string);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new AppError(error.message);
    },
    onSuccess: async () => {
      await signOut();
      router.replace('/(auth)/login');
    },
    onError: alert.setAlert,
  });

  const handleVazgec = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.resetPassword.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.resetPassword.subtitle')}</Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? fieldError} />

      <Input
        label={t('auth.resetPassword.newPassword')}
        placeholder={t('auth.resetPassword.passwordPh')}
        value={password}
        onChangeText={(v) => { setPassword(v); setFieldError(''); }}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />
      <Input
        label={t('auth.resetPassword.confirmPassword')}
        value={passwordConfirm}
        onChangeText={(v) => { setConfirm(v); setFieldError(''); }}
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
        onPress={handleVazgec}
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
