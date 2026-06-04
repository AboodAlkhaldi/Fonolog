import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function AdminContent() {
  return (
    <Screen>
      <Text style={styles.title}>{t('admin.content.title')}</Text>
      <Text style={styles.subtitle}>{t('admin.content.subtitle')}</Text>

      <Section
        icon="text-outline"
        title={t('admin.content.words')}
        desc={t('admin.content.wordsDesc')}
        onPress={() => router.push('/admin/content/words')}
      />

      <Section
        icon="folder-outline"
        title={t('admin.content.categories')}
        desc={t('admin.content.categoriesDesc')}
        onPress={() => router.push('/admin/content/categories')}
      />

      <Section
        icon="happy-outline"
        title={t('admin.content.characters')}
        desc={t('admin.content.charactersDesc')}
        onPress={() => router.push('/admin/content/characters')}
      />

      <Section
        icon="pricetag-outline"
        title={t('admin.content.coupons')}
        desc={t('admin.content.couponsDesc')}
        onPress={() => router.push('/admin/content/coupons' as any)}
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
