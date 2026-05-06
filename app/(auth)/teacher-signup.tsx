import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAuth }  from '@/store/auth';
import { useAlert } from '@/store/alert';
import { theme } from '@/theme';

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
      Alert.alert('Eksik', 'Tüm alanları doldur.');
      return;
    }
    alert.clearAlert();
    mutation.mutate();
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Öğretmen Bilgilerin</Text>
        <Text style={styles.subtitle}>
          7 günlük ücretsiz deneme. Deneme sürecinde 1 öğrenci ekleyebilir, günde 20 dk
          öğrenci görünümünü test edebilirsin.
        </Text>

        <Input
          label="Okul / Kurum Adı"
          value={schoolName}
          onChangeText={setSchoolName}
          placeholder="ör: Villa Akademia"
        />

        <Input
          label="Kaç çocuğa öğretmeyi planlıyorsun?"
          value={plannedStudents}
          onChangeText={setPlannedStudents}
          placeholder="ör: 5"
          keyboardType="numeric"
        />

        <Input
          label="Yaşın"
          value={teacherAge}
          onChangeText={setTeacherAge}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Abonelik Planı</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing[4] }}>
          <Pressable
            style={[styles.planCard, plannedPlan === 'monthly' && styles.planCardActive]}
            onPress={() => setPlannedPlan('monthly')}
          >
            <Text style={styles.planTitle}>Aylık</Text>
            <Text style={styles.planPrice}>₺399 / ay</Text>
          </Pressable>
          <Pressable
            style={[styles.planCard, plannedPlan === 'yearly' && styles.planCardActive]}
            onPress={() => setPlannedPlan('yearly')}
          >
            <Text style={styles.planTitle}>Yıllık</Text>
            <Text style={styles.planPrice}>₺2.399 / yıl</Text>
            <Text style={styles.planSavings}>2 ay bedava</Text>
          </Pressable>
        </View>

        <ErrorBanner message={alert.error?.message ?? ''} />

        <Button
          label="Kaydet ve Devam Et"
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
