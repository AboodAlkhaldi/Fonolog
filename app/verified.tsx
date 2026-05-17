import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';
import { t } from '@/i18n';

/**
 * Landing screen after the user taps the "Verify email" link in the signup
 * confirmation email. The deep-link handler already called setSession, which
 * fires onAuthStateChange and updates auth status. We just show a brief
 * confirmation, then `useProtectedRoute` routes them to the next step
 * (role-choice / onboarding / dashboard).
 */
export default function VerifiedScreen() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    // If auth state is already routing somewhere else, let it through.
    // If we end up stuck here after 2s, force-redirect to the auth root.
    const t = setTimeout(() => {
      if (status === 'unauthenticated' || status === 'awaitingEmailVerify') {
        router.replace('/(auth)/login');
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <Screen>
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={72} color={theme.colors.feedback.success} />
        <Text style={styles.title}>{t('auth.verified.title', { defaultValue: 'E-postan doğrulandı!' } as any) ?? 'E-postan doğrulandı!'}</Text>
        <Text style={styles.subtitle}>{t('auth.verified.subtitle', { defaultValue: 'Devam ediyoruz…' } as any) ?? 'Devam ediyoruz…'}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary, textAlign: 'center' },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, textAlign: 'center' },
});
