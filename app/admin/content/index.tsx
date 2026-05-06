import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components';
import { theme } from '@/theme';

export default function AdminContent() {
  return (
    <Screen>
      <Text style={styles.title}>İçerik Yönetimi</Text>
      <Text style={styles.subtitle}>Kelime, kategori ve karakterleri yönet.</Text>

      <Section
        icon="text-outline"
        title="Kelimeler"
        desc="Yeni kelime ekle, mevcut kelimeleri düzenle veya sil."
        onPress={() => router.push('/admin/content/words')}
      />

      <Section
        icon="folder-outline"
        title="Kategoriler"
        desc="Kelime kategorilerini yönet."
        onPress={() => router.push('/admin/content/categories')}
      />

      <Section
        icon="happy-outline"
        title="Karakterler"
        desc="Ana karakterler, kategoriler ve aksesuarları yönet."
        onPress={() => router.push('/admin/content/characters')}
      />
    </Screen>
  );
}

function Section({ icon, title, desc, onPress }: any) {
  return (
    <Pressable style={styles.section} onPress={onPress}>
      <Ionicons name={icon} size={32} color={theme.colors.brand.secondaryHover} />
      <View style={{ flex: 1, marginLeft: theme.spacing[3] }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginBottom: theme.spacing[5] },
  section: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  sectionDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
});
