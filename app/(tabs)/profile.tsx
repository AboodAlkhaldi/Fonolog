import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Screen } from '@/components';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { withPreviewPlaceholders } from '@/lib/preview-profile';
import { showAlert } from '@/store/alert';
import { checkUsage, recordUsage } from '@/lib/entitlements';
import { subscriptionLabel } from '@/lib/access-tier';
import { TEACHER_MODULE_ENABLED } from '@/domain/feature-flags';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function ProfileTab() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const profile       = withPreviewPlaceholders(realProfile, impersonating);
  const signOut          = useAuth((s) => s.signOut);
  const [linkedTeachers, setLinkedTeachers] = useState<any[]>([]);

  useEffect(() => {
    // Teacher module disabled → never query / show linked teachers.
    if (!TEACHER_MODULE_ENABLED || !realProfile || impersonating) {
      setLinkedTeachers([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('teacher_students')
        .select('teacher:profiles!teacher_id(id,full_name,email,school_name)')
        .eq('student_id', realProfile.id);
      setLinkedTeachers((data ?? []).map((d: any) => d.teacher).filter(Boolean));
    })();
  }, [realProfile?.id, impersonating]);

  if (!profile) return null;

  const expires = profile.subscription_expires ? new Date(profile.subscription_expires) : null;
  const trialDays = expires && profile.subscription_status === 'trial'
    ? Math.max(0, differenceInCalendarDays(expires, new Date())) : null;

  const onGenerateOwnPdf = async () => {
    if (impersonating) {
      showAlert(t('profile.previewAction'), t('profile.previewActionMsg'));
      return;
    }
    const usage = await checkUsage(realProfile, 'pdf_student');
    if (!usage.allowed) {
      showAlert(
        t('profile.pdfQuotaTitle'),
        t('profile.pdfQuotaMsg', { limit: usage.limit }),
        [
          { text: t('app.cancel'), style: 'cancel' },
          { text: t('profile.pdfUpgradeBtn'), onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: realProfile?.id }),
      });
      if (!res.ok) { showAlert(t('app.error_title'), await res.text()); return; }
      const { html } = await res.json();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
      await recordUsage(realProfile, 'pdf_student');
      const after = await checkUsage(realProfile, 'pdf_student');
      if (after.limit > 0 && after.remaining >= 0) {
        showAlert(t('app.ok'), t('profile.pdfSuccess', { remaining: after.remaining, limit: after.limit }));
      }
    } catch (e) {
      showAlert(t('app.error_title'), t('profile.pdfError', { error: e instanceof Error ? e.message : String(e) }));
    }
  };

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
        t('settings.previewSignOutStudent'),
      );
      return;
    }
    showAlert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('app.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const onDeleteAccount = () => {
    if (impersonating) {
      showAlert(t('profile.previewAction'), t('profile.previewActionMsg'));
      return;
    }
    showAlert(t('profile.deleteAccountTitle'), t('profile.deleteAccountMsg'), [
      { text: t('app.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteAccountConfirm'),
        style: 'destructive',
        onPress: () => Linking.openURL('https://fonolog-site.vercel.app/account-deletion').catch(() => {}),
      },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t('profile.child')}</Text>
        <Text style={styles.value}>{profile.full_name}</Text>
        <Text style={styles.label}>{t('profile.age')}</Text>
        <Text style={styles.value}>{profile.child_age ?? '-'}</Text>
        <Text style={styles.label}>{t('profile.email')}</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>

      {/* Subscription */}
      <Pressable style={styles.card} onPress={() => router.push('/settings/plan-details')}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{t('profile.subscription')}</Text>
          <View style={[styles.tag, profile.subscription_status === 'trial' && styles.tagTrial]}>
            <Text style={styles.tagText}>{subscriptionLabel(profile.subscription_status)}</Text>
          </View>
        </View>
        {trialDays !== null ? (
          <Text style={styles.cardDesc}>{t('profile.trialInfo', { days: trialDays })}</Text>
        ) : profile.subscription_status === 'free' ? (
          <Text style={styles.cardDesc}>{t('profile.freePlanUpgrade')}</Text>
        ) : (
          <Text style={styles.cardDesc}>{t('profile.activeDetails')}</Text>
        )}
      </Pressable>

      {/* PDF Report */}
      <Pressable style={styles.card} onPress={onGenerateOwnPdf}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{t('profile.pdfReport')}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
        </View>
        <Text style={styles.cardDesc}>{t('profile.pdfReportDesc')}</Text>
      </Pressable>

      {/* Linked teachers — only when the teacher module is enabled. */}
      {TEACHER_MODULE_ENABLED && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.myTeacher')}</Text>
          {linkedTeachers.length === 0 ? (
            <Text style={styles.cardDesc}>{t('profile.noTeacher')}</Text>
          ) : (
            linkedTeachers.map((t) => (
              <View key={t.id} style={styles.teacherRow}>
                <Ionicons name="person-circle-outline" size={28} color={theme.colors.brand.secondaryHover} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.teacherName}>{t.full_name}</Text>
                  {t.school_name ? <Text style={styles.teacherMeta}>{t.school_name}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <Pressable onPress={() => router.push('/settings/terms')} style={styles.actionRow}>
        <Ionicons name="document-text-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.actionText}>{t('profile.privacyTerms')}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
      </Pressable>

      <Pressable onPress={onResetPassword} style={styles.actionRow}>
        <Ionicons name="key-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={styles.actionText}>{t('auth.deactivate.resetPasswordBtn')}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
      </Pressable>

      <Pressable onPress={onSignOut} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.feedback.errorText} />
        <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
      </Pressable>

      <Pressable onPress={onDeleteAccount} style={styles.deleteAccount}>
        <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
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
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  label: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
  value: { ...theme.typography.body, color: theme.colors.text.primary },
  tag: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.feedback.successSubtle,
  },
  tagTrial: { backgroundColor: theme.colors.feedback.warningSubtle },
  tagText: { ...theme.typography.caption, color: theme.colors.text.primary },
  teacherRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    paddingTop: theme.spacing[2],
  },
  teacherName: { ...theme.typography.body, color: theme.colors.text.primary },
  teacherMeta: { ...theme.typography.caption, color: theme.colors.text.muted },
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
  deleteAccount: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[3],
    marginTop: theme.spacing[1],
  },
  deleteAccountText: {
    ...theme.typography.caption,
    color: theme.colors.feedback.errorText,
    textDecorationLine: 'underline',
  },
});
