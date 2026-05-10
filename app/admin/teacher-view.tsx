import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function AdminTeacherView() {
  const startImpersonation = useAuth((s) => s.startImpersonation);

  const launch = () => {
    startImpersonation('teacher');
    router.replace('/teacher');
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('admin.teacherView.title')}</Text>
      <Text style={styles.subtitle}>{t('admin.teacherView.subtitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.emoji}>👩‍🏫</Text>
        <Text style={styles.cardTitle}>{t('admin.teacherView.cardTitle')}</Text>
        <Text style={styles.cardDesc}>{t('admin.teacherView.cardDesc')}</Text>
        <Button label={t('admin.teacherView.startBtn')} variant="cta" size="lg" fullWidth
                onPress={launch} style={{ marginTop: theme.spacing[4] }} />
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.feedback.infoText} />
        <Text style={styles.noteText}>{t('admin.teacherView.hint')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginBottom: theme.spacing[5] },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[5], borderRadius: theme.radius.xl,
    alignItems: 'center', ...theme.shadow.md,
  },
  emoji: { fontSize: 64, marginBottom: theme.spacing[2] },
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
