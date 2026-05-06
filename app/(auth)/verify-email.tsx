import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, ErrorBanner } from '@/components';
import { useAuth }  from '@/store/auth';
import { useAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t }     from '@/i18n';

const RESEND_COOLDOWN_S = 60;

export default function VerifyEmailScreen() {
  const user    = useAuth((s) => s.user);
  const resend  = useAuth((s) => s.resendVerification);
  const signOut = useAuth((s) => s.signOut);
  const alert   = useAlert();

  const [resendCooldown, setResendCooldown] = useState(0);
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

  const resendMutation = useMutation({
    mutationFn: resend,
    onSuccess: () => {
      setResendNotice(t('auth.verifyEmail.resendSent'));
      setResendCooldown(RESEND_COOLDOWN_S);
      setTimeout(() => setResendNotice(''), 4000);
    },
    onError: alert.setAlert,
  });

  const checkMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => router.replace('/(auth)/login'),
    onError: alert.setAlert,
  });

  const handleResend = () => {
    if (!user?.email || resendCooldown > 0) return;
    alert.clearAlert();
    resendMutation.mutate();
  };

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.title}>{t('auth.verifyEmail.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.verifyEmail.subtitle', { email: user?.email ?? '' })}
        </Text>
        <Text style={styles.help}>{t('auth.verifyEmail.checkInbox')}</Text>
      </View>

      <View style={styles.actions}>
        <ErrorBanner message={alert.error?.message ?? ''} />

        <Button
          label={t('auth.verifyEmail.iVerified')}
          variant="cta"
          size="lg"
          fullWidth
          loading={checkMutation.isPending}
          onPress={() => checkMutation.mutate()}
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendQuestion}>{t('auth.verifyEmail.stillNotReceived')} </Text>
          {resendCooldown > 0 ? (
            <Text style={styles.cooldown}>
              {t('auth.verifyEmail.resendCooldown', { seconds: resendCooldown })}
            </Text>
          ) : (
            <Pressable onPress={handleResend} hitSlop={6}>
              <Text style={styles.link}>{t('auth.verifyEmail.resend')}</Text>
            </Pressable>
          )}
        </View>

        {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}

        <Pressable
          onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }}
          style={styles.changeEmail}
          hitSlop={6}
        >
          <Text style={styles.linkMuted}>{t('auth.verifyEmail.changeEmail')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: theme.spacing[10],
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emoji: { fontSize: 80, marginBottom: theme.spacing[6] },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing[3],
  },
  help: {
    ...theme.typography.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  actions: { paddingTop: theme.spacing[4] },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing[5],
    flexWrap: 'wrap',
  },
  resendQuestion: { ...theme.typography.body, color: theme.colors.text.secondary },
  link: {
    ...theme.typography.body,
    color: theme.colors.text.link,
    fontFamily: theme.typography.bodyLarge.fontFamily,
  },
  linkMuted: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
  cooldown: { ...theme.typography.body, color: theme.colors.text.muted },
  notice: {
    ...theme.typography.bodySmall,
    color: theme.colors.feedback.successText,
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
  changeEmail: {
    alignSelf: 'center',
    marginTop: theme.spacing[5],
    padding:   theme.spacing[2],
  },
});
