import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Badge } from '@/components';
import { listModules, type ModuleDefinition } from '@/domain';
import { useAuth } from '@/store/auth';
import { getAccessTier, isModuleLocked } from '@/lib/access-tier';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function LearnTab() {
  const profile = useAuth((s) => s.profile);
  const tier = getAccessTier(profile);
  const modules = listModules();

  const launch = (m: ModuleDefinition) => {
    if (isModuleLocked(tier, m)) {
      router.push('/paywall');
      return;
    }
    // No categoryId — session.ts pulls 20 random words from the full pool.
    router.push(`/session/${m.id}`);
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={modules}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t('learn.title') ?? 'Öğren'}</Text>
            <Text style={styles.subtitle}>Bir oyun seç ve oynamaya başla.</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const locked = isModuleLocked(tier, m);
          return (
            <Pressable
              onPress={() => launch(m)}
              style={[styles.card, locked && styles.cardLocked]}
              accessibilityRole="button"
            >
              <Text style={styles.emoji}>{m.icon ?? '🎮'}</Text>
              <View style={styles.body}>
                <Text style={styles.cardTitle}>{m.title}</Text>
                {m.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{m.description}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Badge label={`Sv ${m.level}`} variant="info" />
                  {locked ? <Badge label="🔒 Pro" variant="warning" /> : null}
                </View>
              </View>
              <Ionicons
                name={locked ? 'lock-closed' : 'chevron-forward'}
                size={20}
                color={theme.colors.text.muted}
              />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: theme.spacing[4] },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  list: { paddingBottom: theme.spacing[8] },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical:   theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  cardLocked: { opacity: 0.65 },
  emoji: { fontSize: 36, marginRight: theme.spacing[3] },
  body:  { flex: 1 },
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: 2 },
  cardDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
  metaRow:   { flexDirection: 'row', gap: theme.spacing[2], flexWrap: 'wrap' },
});
