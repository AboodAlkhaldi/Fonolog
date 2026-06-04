import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function AdminSettings() {
  const profile           = useAuth((s) => s.profile);
  const signOut           = useAuth((s) => s.signOut);
  const impersonating     = useAuth((s) => s.impersonating);

  if (!profile) return null;

  const onResetPassword = () => {
    if (impersonating) return;
    showAlert(
      t('auth.deactivate.resetPasswordBtn'),
      t('settings.resetPasswordMsg'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        { text: t('settings.continueBtn'), onPress: () => router.push('/reset-password') },
      ],
    );
  };

  const onSignOut = () => {
    if (impersonating) {
      showAlert(
        t('settings.previewMode'),
        t('settings.previewSignOut'),
      );
      return;
    }
    showAlert(t('settings.signOutTitle'), t('settings.signOutMessage'), [
      { text: t('app.cancel'), style: 'cancel' },
      { text: t('settings.signOutTitle'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t('settings.name')}</Text>
        <Text style={styles.value}>{profile.full_name}</Text>
        <Text style={styles.label}>{t('settings.email')}</Text>
        <Text style={styles.value}>{profile.email}</Text>
        <Text style={styles.label}>{t('settings.role')}</Text>
        <Text style={styles.value}>{t('settings.admin')}</Text>
      </View>

      <Pressable onPress={() => router.push('/settings/terms')} style={styles.actionRow}>
        <Ionicons name="document-text-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.actionText}>{t('settings.privacyTerms')}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
      </Pressable>

      <Pressable onPress={onResetPassword} style={styles.actionRow}>
        <Ionicons name="key-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.actionText}>{t('auth.deactivate.resetPasswordBtn')}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
      </Pressable>

      <Pressable onPress={onSignOut} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.feedback.errorText} />
        <Text style={styles.signOutText}>{t('settings.signOutTitle')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[4] },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
  },
  label: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
  value: { ...theme.typography.body, color: theme.colors.text.primary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  actionText: { ...theme.typography.body, color: theme.colors.text.primary, flex: 1 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.feedback.errorSubtle,
    borderWidth: 1,
    borderColor: theme.colors.feedback.error + '60',
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    marginTop: theme.spacing[2],
  },
  signOutText: { ...theme.typography.bodyMedium, color: theme.colors.feedback.errorText },
});
