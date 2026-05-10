import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function TeacherPreview() {
  const profile = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const startImpersonation = useAuth((s) => s.startImpersonation);

  const isTrial = profile?.subscription_status === 'trial';
  const isAdminPreviewingTeacher = profile?.role === 'admin' && impersonating === 'teacher';

  const launch = () => {
    if (isAdminPreviewingTeacher) {
      showAlert(
        t('app.error_title'),
        t('teacher.preview.alreadyIn'),
      );
      return;
    }
    showAlert(
      t('teacher.preview.confirmTitle'),
      isTrial ? t('teacher.preview.confirmTrial') : t('teacher.preview.confirmFull'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('teacher.preview.startConfirm'),
          onPress: () => {
            startImpersonation('student');
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('teacher.preview.title')}</Text>
      <Text style={styles.subtitle}>{t('teacher.preview.subtitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🧒</Text>
        <Text style={styles.cardTitle}>{t('teacher.preview.cardTitle')}</Text>
        <Text style={styles.cardDesc}>
          {isTrial ? t('teacher.preview.cardDescTrial') : t('teacher.preview.cardDesc')}
        </Text>
        <Button
          label={t('teacher.preview.startBtn')}
          variant="cta"
          size="lg"
          fullWidth
          onPress={launch}
          style={{ marginTop: theme.spacing[4] }}
        />
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.feedback.infoText} />
        <Text style={styles.noteText}>{t('teacher.preview.hint')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginBottom: theme.spacing[5] },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  cardEmoji: { fontSize: 64, marginBottom: theme.spacing[2] },
  cardTitle: { ...theme.typography.h2, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.body, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing[2] },
  note: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.colors.feedback.infoSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginTop: theme.spacing[4], gap: theme.spacing[2],
  },
  noteText: { ...theme.typography.bodySmall, color: theme.colors.feedback.infoText, flex: 1 },
});
