import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAuth }  from '@/store/auth';
import { useAlert, showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function TeacherSignup() {
  const saveTeacherInfo = useAuth((s) => s.saveTeacherInfo);
  const alert           = useAlert();

  const [schoolName,      setSchoolName]      = useState('');
  const [plannedStudents, setPlannedStudents] = useState('');
  const [teacherAge,      setTeacherAge]      = useState('');
  const [plannedPlan,     setPlannedPlan]     = useState<'monthly' | 'yearly' | null>(null);

  const mutation = useMutation({
    mutationFn: () => saveTeacherInfo({
      schoolName,
      plannedStudents: parseInt(plannedStudents, 10),
      teacherAge:      parseInt(teacherAge, 10),
      plannedPlan:     plannedPlan!,
    }),
    onError: alert.setAlert,
    // Navigation handled by useProtectedRoute on status change.
  });

  const onSubmit = () => {
    if (!schoolName || !plannedStudents || !teacherAge || !plannedPlan) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('teacher.assignment.incompleteMsg'));
      return;
    }
    alert.clearAlert();
    mutation.mutate();
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('auth.teacherSignup.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.teacherSignup.subtitle')}</Text>

        <Input
          label={t('auth.teacherSignup.schoolLabel')}
          value={schoolName}
          onChangeText={setSchoolName}
          placeholder={t('auth.teacherSignup.schoolPh')}
        />

        <Input
          label={t('auth.teacherSignup.studentsLabel')}
          value={plannedStudents}
          onChangeText={setPlannedStudents}
          placeholder={t('auth.teacherSignup.studentsPh')}
          keyboardType="numeric"
        />

        <Input
          label={t('auth.teacherSignup.ageLabel')}
          value={teacherAge}
          onChangeText={setTeacherAge}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('auth.teacherSignup.planLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing[4] }}>
          <Pressable
            style={[styles.planCard, plannedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => setPlannedPlan('monthly')}
          >
            <Text style={styles.planTitle}>{t('auth.teacherSignup.planMonthly')}</Text>
            <Text style={styles.planPrice}>₺399 / ay</Text>
          </Pressable>
          <Pressable
            style={[styles.planCard, plannedPlan === 'yearly' && styles.planCardActive]}
            onPress={() => setPlannedPlan('yearly')}
          >
            <Text style={styles.planTitle}>{t('auth.teacherSignup.planYearly')}</Text>
            <Text style={styles.planPrice}>₺2.399 / yıl</Text>
            <Text style={styles.planSavings}>{t('auth.teacherSignup.planSavings')}</Text>
          </Pressable>
        </View>

        <ErrorBanner message={alert.error?.message ?? ''} />

        <Button
          label={t('auth.teacherSignup.submitBtn')}
          variant="cta"
          size="lg"
          fullWidth
          loading={mutation.isPending}
          onPress={onSubmit}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[5],
  },
  label: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  planCard: {
    flex: 1,
    padding: theme.spacing[3],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
  },
  planCardActive: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.tertiary,
  },
  planTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  planPrice: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: 4 },
  planSavings: {
    ...theme.typography.caption,
    color: theme.colors.feedback.successText,
    marginTop: 4,
  },
});
