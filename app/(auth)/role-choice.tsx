import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, ErrorBanner, Loading } from '@/components';
import { useAuth }  from '@/store/auth';
import { useAlert, showAlert } from '@/store/alert';
import { TEACHER_MODULE_ENABLED } from '@/domain/feature-flags';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function RoleChoiceScreen() {
  const chooseRole = useAuth((s) => s.chooseRole);
  const alert      = useAlert();
  const [picked, setPicked] = useState<'student' | 'teacher' | null>(null);

  const mutation = useMutation({
    mutationFn: (role: 'student' | 'teacher') => chooseRole(role),
    onError: alert.setAlert,
    // Navigation handled by useProtectedRoute on status change.
  });

  // Teacher module disabled → everyone is a student. Skip the choice entirely
  // and auto-assign the student role; the screen never meaningfully renders.
  useEffect(() => {
    if (!TEACHER_MODULE_ENABLED) mutation.mutate('student');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TEACHER_MODULE_ENABLED) {
    return <Screen><Loading /></Screen>;
  }

  const onContinue = () => {
    if (!picked) return;
    showAlert(
      t('auth.roleChoice.alertTitle'),
      picked === 'student'
        ? t('auth.roleChoice.alertStudent')
        : t('auth.roleChoice.alertTeacher'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        { text: t('auth.roleChoice.confirmBtn'), onPress: () => mutation.mutate(picked) },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>{t('auth.roleChoice.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.roleChoice.subtitle')}</Text>
      </View>

      <Pressable
        style={[styles.card, picked === 'student' && styles.cardActive]}
        onPress={() => setPicked('student')}
      >
        <Text style={styles.cardEmoji}>🧒</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('auth.roleChoice.studentTitle')}</Text>
          <Text style={styles.cardDesc}>{t('auth.roleChoice.studentDesc')}</Text>
        </View>
        {picked === 'student' && <Ionicons name="checkmark-circle" size={24} color={theme.colors.feedback.success} />}
      </Pressable>

      <Pressable
        style={[styles.card, picked === 'teacher' && styles.cardActive]}
        onPress={() => setPicked('teacher')}
      >
        <Text style={styles.cardEmoji}>👩‍🏫</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('auth.roleChoice.teacherTitle')}</Text>
          <Text style={styles.cardDesc}>{t('auth.roleChoice.teacherDesc')}</Text>
        </View>
        {picked === 'teacher' && <Ionicons name="checkmark-circle" size={24} color={theme.colors.feedback.success} />}
      </Pressable>

      <View style={styles.warning}>
        <Ionicons name="warning-outline" size={18} color={theme.colors.feedback.warningText} />
        <Text style={styles.warningText}>{t('auth.roleChoice.warningText')}</Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? ''} />

      <Button
        label={t('auth.roleChoice.continueBtn')}
        variant="cta"
        size="lg"
        fullWidth
        disabled={!picked}
        loading={mutation.isPending}
        onPress={onContinue}
        style={{ marginTop: theme.spacing[4] }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: theme.spacing[6] },
  emoji: { fontSize: 56, marginBottom: theme.spacing[2] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, textAlign: 'center' },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing[2] },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4],
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing[3],
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    ...theme.shadow.sm,
    gap: theme.spacing[3],
  },
  cardActive: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.tertiary,
  },
  cardEmoji: { fontSize: 44 },
  cardTitle: { ...theme.typography.h3, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  warning: {
    flexDirection: 'row',
    backgroundColor: theme.colors.feedback.warningSubtle,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    marginTop: theme.spacing[3],
    gap: theme.spacing[2],
    alignItems: 'flex-start',
  },
  warningText: {
    ...theme.typography.bodySmall,
    color: theme.colors.feedback.warningText,
    flex: 1,
  },
});
