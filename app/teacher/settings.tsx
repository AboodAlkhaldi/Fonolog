import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays } from 'date-fns';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { withPreviewPlaceholders } from '@/lib/preview-profile';
import { showAlert } from '@/store/alert';
import { subscriptionLabel } from '@/lib/access-tier';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function TeacherSettings() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const profile       = withPreviewPlaceholders(realProfile, impersonating);
  const signOut           = useAuth((s) => s.signOut);
  const deactivateAccount = useAuth((s) => s.deactivateAccount);

  if (!profile) return null;

  const expires = profile.subscription_expires ? new Date(profile.subscription_expires) : null;
  const trialDays = expires && profile.subscription_status === 'trial'
    ? Math.max(0, differenceInCalendarDays(expires, new Date()))
    : null;

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

  const onDeleteAccount = () => {
    if (impersonating) return;
    showAlert(
      t('auth.deactivate.confirm1Title'),
      t('auth.deactivate.confirm1Message'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('auth.deactivate.confirm1Yes'),
          style: 'destructive',
          onPress: () => showAlert(
            t('auth.deactivate.confirm2Title'),
            t('auth.deactivate.confirm2Message'),
            [
              { text: t('app.cancel'), style: 'cancel' },
              {
                text: t('auth.deactivate.confirm2Yes'),
                style: 'destructive',
                onPress: () => deactivateAccount().catch((e: any) => showAlert(t('app.error_title'), e?.message ?? String(e))),
              },
            ],
          ),
        },
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

      {/* Profile card */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('settings.name')}</Text>
        <Text style={styles.value}>{profile.full_name}</Text>
        <Text style={styles.label}>{t('settings.email')}</Text>
        <Text style={styles.value}>{profile.email}</Text>
        {profile.school_name ? (<>
          <Text style={styles.label}>{t('settings.institution')}</Text>
          <Text style={styles.value}>{profile.school_name}</Text>
        </>) : null}
      </View>

      {/* Subscription */}
      <Pressable style={styles.card} onPress={() => router.push('/settings/plan-details')}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{t('settings.subscription')}</Text>
          <Text style={styles.tag}>{subscriptionLabel(profile.subscription_status)}</Text>
        </View>
        {trialDays !== null ? (
          <Text style={styles.cardDesc}>{t('settings.trialInfo', { days: trialDays })}</Text>
        ) : profile.subscription_status === 'free' ? (
          <Text style={styles.cardDesc}>{t('settings.freePlanDetails')}</Text>
        ) : (
          <Text style={styles.cardDesc}>{t('settings.activeDetails')}</Text>
        )}
      </Pressable>

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

      <Pressable onPress={onDeleteAccount} style={styles.deleteRow}>
        <Ionicons name="trash-outline" size={20} color={theme.colors.feedback.errorText} />
        <Text style={styles.deleteText}>{t('auth.deactivate.deleteAccountBtn')}</Text>
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
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  label: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
  value: { ...theme.typography.body, color: theme.colors.text.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    ...theme.typography.caption,
    color: theme.colors.feedback.successText,
    backgroundColor: theme.colors.feedback.successSubtle,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm,
  },
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
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.feedback.error + '60',
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  deleteText: { ...theme.typography.bodyMedium, color: theme.colors.feedback.errorText },
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
