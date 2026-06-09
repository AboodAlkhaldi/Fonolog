import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAlert, showAlert } from '@/store/alert';
import { useAuth } from '@/store/auth';
import { usePasswordReset, RESET_CODE_TTL_MS } from '@/store/password-reset';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/error';
import { translateAuthError } from '@/lib/auth-errors';
import { theme } from '@/theme';
import { t } from '@/i18n';

const RESEND_COOLDOWN_S = 60;

/**
 * Step 2 of the logged-out recovery flow: verify the 6-digit code and set a new
 * password. OTP-only — no deep links, so this works in Expo Go / dev client.
 *
 * Reachability guard: only mounts mid-flow. If the reset store has no email
 * (e.g. someone navigates straight to this route), we bounce to login — the
 * screen cannot be opened out of context.
 *
 * Expiry: enforced client-side at RESET_CODE_TTL_MS (3 min). The server runs
 * its own, longer OTP expiry; verifyOtp is what actually binds code↔email.
 */
export default function ResetPasswordOtpScreen() {
  const alert       = useAlert();
  const signOut     = useAuth((s) => s.signOut);
  const setGuard    = useAuth((s) => s.setExternalAuthGuard);
  const storedEmail = usePasswordReset((s) => s.email);
  const requestedAt = usePasswordReset((s) => s.requestedAt);
  const markResent  = usePasswordReset((s) => s.markResent);
  const clear       = usePasswordReset((s) => s.clear);

  // Guard: no active reset → not reachable.
  useEffect(() => {
    if (!storedEmail) router.replace('/(auth)/login');
  }, [storedEmail]);

  const [email,    setEmail]    = useState(storedEmail ?? '');
  const [code,     setCode]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');

  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_S);
  const [resendNotice,   setResendNotice]   = useState('');
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, [resendCooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitMutation = useMutation({
    mutationFn: async () => {
      const cleanEmail = email.trim();
      const cleanCode  = code.trim();
      if (cleanCode.length < 6)       throw new AppError(t('auth.resetCode.errorCodeRequired'));
      if (password.length < 8)        throw new AppError(t('auth.resetCode.errorShort'));
      if (password !== confirm)       throw new AppError(t('auth.resetCode.errorMismatch'));
      if (!requestedAt || Date.now() - requestedAt > RESET_CODE_TTL_MS) {
        throw new AppError(t('auth.resetCode.errorExpired'));
      }

      // verifyOtp installs a short-lived recovery session AND enforces the
      // code↔email binding + server expiry. Guard the auth listener first so
      // that session doesn't route the user into the app mid-reset.
      setGuard(true);
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type:  'recovery',
      });
      if (verifyErr) {
        // GoTrue returns code 'otp_expired' for an expired OR superseded token
        // (a resend invalidates the previous code). Show "expired → get a new
        // one" rather than the misleading "wrong code".
        const errCode = (verifyErr as any)?.code ?? (verifyErr as any)?.error_code;
        const expired = errCode === 'otp_expired' || /expired/i.test(verifyErr.message ?? '');
        throw new AppError(
          expired ? t('auth.resetCode.errorExpired') : t('auth.resetCode.errorInvalid'),
          errCode,
        );
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw new AppError(translateAuthError(updateErr, 'reset'), (updateErr as any)?.code);
    },
    onSuccess: async () => {
      clear();
      // Drop the temporary recovery session so the user signs in fresh.
      await signOut();
      setGuard(false);
      router.replace('/(auth)/login');
      showAlert(t('auth.resetCode.successTitle'), t('auth.resetCode.successBody'));
    },
    onError: async (err) => {
      // verifyOtp may have established a recovery session before a later failure
      // (e.g. updateUser rejected). Drop it and release the guard so the app
      // doesn't keep a half-authenticated session.
      setGuard(false);
      await supabase.auth.signOut().catch(() => {});
      alert.setAlert(err as AppError);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error && String((error as any)?.code ?? '').includes('rate')) {
        throw new AppError(translateAuthError(error, 'reset'), (error as any)?.code);
      }
    },
    onSuccess: () => {
      markResent();
      setResendCooldown(RESEND_COOLDOWN_S);
      setResendNotice(t('auth.resetCode.resendSent'));
      setTimeout(() => setResendNotice(''), 4000);
    },
    onError: alert.setAlert,
  });

  const handleResend = () => {
    if (resendCooldown > 0) return;
    alert.clearAlert();
    resendMutation.mutate();
  };

  // Avoid a one-frame flash before the guard redirect runs.
  if (!storedEmail) return null;

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
        <Text style={styles.title}>{t('auth.resetCode.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.resetCode.subtitle', { email: storedEmail })}
        </Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? ''} />

      <Input
        label={t('auth.resetCode.emailLabel')}
        value={email}
        onChangeText={(v) => { setEmail(v); alert.clearAlert(); }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        required
      />
      <Input
        label={t('auth.resetCode.codeLabel')}
        placeholder={t('auth.resetCode.codePh')}
        value={code}
        onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, '')); alert.clearAlert(); }}
        keyboardType="number-pad"
        maxLength={8}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        required
      />
      <Input
        label={t('auth.resetCode.newPassword')}
        placeholder={t('auth.resetCode.passwordPh')}
        value={password}
        onChangeText={(v) => { setPassword(v); alert.clearAlert(); }}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />
      <Input
        label={t('auth.resetCode.confirmPassword')}
        value={confirm}
        onChangeText={(v) => { setConfirm(v); alert.clearAlert(); }}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />

      <Button
        label={t('auth.resetCode.submit')}
        variant="cta"
        size="lg"
        fullWidth
        loading={submitMutation.isPending}
        onPress={() => { alert.clearAlert(); submitMutation.mutate(); }}
        style={styles.submit}
      />

      <View style={styles.resendRow}>
        {resendCooldown > 0 ? (
          <Text style={styles.cooldown}>
            {t('auth.resetCode.resendCooldown', { seconds: resendCooldown })}
          </Text>
        ) : (
          <Pressable onPress={handleResend} hitSlop={6} disabled={resendMutation.isPending}>
            <Text style={styles.link}>{t('auth.resetCode.resend')}</Text>
          </Pressable>
        )}
      </View>
      {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}
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
  submit: { marginTop: theme.spacing[2] },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing[5],
    flexWrap: 'wrap',
  },
  link: {
    ...theme.typography.body,
    color: theme.colors.text.link,
    fontFamily: theme.typography.bodyLarge.fontFamily,
  },
  cooldown: { ...theme.typography.body, color: theme.colors.text.muted },
  notice: {
    ...theme.typography.bodySmall,
    color: theme.colors.feedback.successText,
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
});
