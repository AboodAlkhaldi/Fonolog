import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner, Loading } from '@/components';
import { useAuth } from '@/store/auth';
import { useAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/error';
import { translateAuthError } from '@/lib/auth-errors';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function ResetPasswordScreen() {
  const signOut = useAuth((s) => s.signOut);
  const alert   = useAlert();
  const [password, setPassword]         = useState('');
  const [passwordConfirm, setConfirm]   = useState('');
  const [fieldError, setFieldError]     = useState('');

  // Token gate: this screen is reached via the recovery deep link, which
  // installs a short-lived recovery session. If there's no session (the link
  // was expired / already used / invalid), there's no token to reset against —
  // show an "expired" state and send the user back to request a fresh link
  // instead of letting them submit a password update that can only fail.
  // A normally logged-in user (Settings → change password) has a session, so
  // they see the form directly.
  const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'expired'>('checking');

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSessionState(data.session ? 'ready' : 'expired');
    });
    return () => { alive = false; };
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new AppError(t('auth.resetPassword.errorShort') as string);
      if (password !== passwordConfirm) throw new AppError(t('auth.resetPassword.errorMismatch') as string);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new AppError(translateAuthError(error), (error as any)?.code);
    },
    onSuccess: async () => {
      // Sign out FIRST so status flips to unauthenticated; otherwise the
      // protected-route guard bounces /(auth)/login back to the home tab and
      // the screen reads as stuck. Mirrors handleVazgec exactly.
      await signOut();
      router.replace('/(auth)/login');
    },
    onError: alert.setAlert,
  });

  const handleVazgec = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (sessionState === 'checking') {
    return <Screen><Loading /></Screen>;
  }

  if (sessionState === 'expired') {
    return (
      <Screen>
        <View style={styles.expiredWrap}>
          <Ionicons name="alert-circle-outline" size={56} color={theme.colors.feedback.warningText} />
          <Text style={[styles.title, { textAlign: 'center' }]}>{t('auth.resetPassword.expiredTitle')}</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>{t('auth.resetPassword.expiredBody')}</Text>
        </View>
        <Button
          label={t('auth.resetPassword.requestNew')}
          variant="cta"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(auth)/forgot')}
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
  expiredWrap: { alignItems: 'center', gap: theme.spacing[3], marginTop: theme.spacing[10], marginBottom: theme.spacing[6] },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  submit: { marginTop: theme.spacing[4] },
  cancel: { marginTop: theme.spacing[2] },
});
