import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, ErrorBanner } from '@/components';
import { useAuth }  from '@/store/auth';
import { useAlert } from '@/store/alert';
import { theme } from '@/theme';

export default function RoleChoiceScreen() {
  const chooseRole = useAuth((s) => s.chooseRole);
  const alert      = useAlert();
  const [picked, setPicked] = useState<'student' | 'teacher' | null>(null);

  const mutation = useMutation({
    mutationFn: (role: 'student' | 'teacher') => chooseRole(role),
    onError: alert.setAlert,
    // Navigation handled by useProtectedRoute on status change.
  });

  const onContinue = () => {
    if (!picked) return;
    Alert.alert(
      'Dikkat',
      picked === 'student'
        ? 'Öğrenci olarak devam ediyorsun. Bu seçim DAİMİDİR ve sonra değiştirilemez.'
        : 'Öğretmen olarak devam ediyorsun. Bu seçim DAİMİDİR ve sonra değiştirilemez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Onaylıyorum', onPress: () => mutation.mutate(picked) },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Sen kimsin?</Text>
        <Text style={styles.subtitle}>
          Bu seçim daimi olduğu için lütfen dikkatli ol.
        </Text>
      </View>

      <Pressable
        style={[styles.card, picked === 'student' && styles.cardActive]}
        onPress={() => setPicked('student')}
      >
        <Text style={styles.cardEmoji}>🧒</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Öğrenciyim</Text>
          <Text style={styles.cardDesc}>Türkçe okumayı eğlenerek öğreneceğim.</Text>
        </View>
        {picked === 'student' && <Ionicons name="checkmark-circle" size={24} color={theme.colors.feedback.success} />}
      </Pressable>

      <Pressable
        style={[styles.card, picked === 'teacher' && styles.cardActive]}
        onPress={() => setPicked('teacher')}
      >
        <Text style={styles.cardEmoji}>👩‍🏫</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Öğretmenim</Text>
          <Text style={styles.cardDesc}>Öğrencilerimi takip edeceğim, ödev göndereceğim.</Text>
        </View>
        {picked === 'teacher' && <Ionicons name="checkmark-circle" size={24} color={theme.colors.feedback.success} />}
      </Pressable>

      <View style={styles.warning}>
        <Ionicons name="warning-outline" size={18} color={theme.colors.feedback.warningText} />
        <Text style={styles.warningText}>
          Seçimini bir kez yaptığında değiştiremezsin. Aynı e-posta ile farklı bir rol için
          yeni hesap açamazsın.
        </Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? ''} />

      <Button
        label="Devam Et"
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
