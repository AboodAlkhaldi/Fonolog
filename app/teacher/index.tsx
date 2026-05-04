import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';

export default function TeacherHome() {
  const profile = useAuth((s) => s.profile);
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <Screen>
        <Text style={styles.title}>Yönetici Paneli</Text>
        <Text style={styles.body}>Bu alan yalnızca yöneticiler için.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Yönetici Paneli</Text>
      <Text style={styles.subtitle}>Öğrencilerini ve içeriği yönet.</Text>

      <Pressable style={styles.card} onPress={() => router.push('/teacher/students' as any)}>
        <Ionicons name="people-outline" size={32} color={theme.colors.brand.secondary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Öğrenciler</Text>
          <Text style={styles.cardDesc}>İlerlemelerini ve oturumlarını gör</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text.muted} />
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/teacher/words' as any)}>
        <Ionicons name="book-outline" size={32} color={theme.colors.brand.secondary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Kelimeler</Text>
          <Text style={styles.cardDesc}>Yeni kelime ekle veya düzenle</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text.muted} />
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/teacher/assignments/new' as any)}>
        <Ionicons name="clipboard-outline" size={32} color={theme.colors.brand.secondary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Yeni Ödev</Text>
          <Text style={styles.cardDesc}>Bir öğrenciye özel görev oluştur</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text.muted} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginBottom: theme.spacing[5] },
  body: { ...theme.typography.body, color: theme.colors.text.muted, marginTop: theme.spacing[6] },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  cardBody: { flex: 1, marginLeft: theme.spacing[3] },
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
});
