import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Badge, Button } from '@/components';
import {
  contentRepository,
  listModules,
  type Category,
  type Word,
  type ModuleDefinition,
} from '@/domain';
import { useAuth } from '@/store/auth';
import { loadDayProgress, canPlayModule, type DayProgress } from '@/lib/day-progress';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuth((s) => s.profile);

  const [category, setCategory] = useState<Category | null>(null);
  const [words,    setWords]    = useState<Word[] | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [dayProgress, setDayProgress] = useState<DayProgress | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const cats = await contentRepository.getCategories();
        const cat  = cats.find((c) => c.id === id) ?? null;
        setCategory(cat);
        if (cat) {
          const ws = await contentRepository.getWordsByCategoryId(id);
          setWords(ws);
        }
        if (profile) {
          const dp = await loadDayProgress(profile.id);
          setDayProgress(dp);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t('app.error'));
      }
    })();
  }, [id, profile?.id]);

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
        <Button label={t('app.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!category || !words) return <Screen><Loading /></Screen>;

  const modules = listModules();

  const launchModule = (m: ModuleDefinition) => {
    if (!dayProgress) return;
    if (!canPlayModule(profile, dayProgress, m.id)) {
      showAlert(t('day.lockedTitle'), t('day.locked'), [{ text: t('app.ok'), style: 'cancel' }]);
      return;
    }
    router.push(`/session/${m.id}?categoryId=${category.id}` as any);
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={modules}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
            </Pressable>

            <View style={styles.heroRow}>
              <View style={styles.heroEmojiCircle}>
                <Text style={styles.heroEmoji}>{category.emoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing[4] }}>
                <Text style={styles.heroTitle}>{category.name}</Text>
                <Text style={styles.heroMeta}>
                  {t('learn.categoryMeta', { words: words.length, modules: modules.length })}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('learn.chooseModuleTitle')}</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const locked = dayProgress ? !canPlayModule(profile, dayProgress, m.id) : true;
          return (
            <Pressable
              onPress={() => launchModule(m)}
              style={[styles.moduleCard, locked && styles.moduleCardLocked]}
            >
              <Text style={styles.moduleEmoji}>{m.icon ?? '🎮'}</Text>
              <View style={styles.moduleBody}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                {m.description ? (
                  <Text style={styles.moduleDesc} numberOfLines={2}>{m.description}</Text>
                ) : null}
                <View style={styles.moduleMeta}>
                  {locked ? <Badge label="🔒" variant="warning" /> : null}
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
  backBtn: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8, marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[5] },
  heroEmojiCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadow.sm,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { ...theme.typography.h1, color: theme.colors.text.primary },
  heroMeta:  { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: 2 },
  sectionTitle: {
    ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: theme.spacing[3],
  },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical:   theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  moduleCardLocked: { opacity: 0.65 },
  moduleEmoji: { fontSize: 36, marginRight: theme.spacing[3] },
  moduleBody:  { flex: 1 },
  moduleTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: 2 },
  moduleDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
  moduleMeta:  { flexDirection: 'row', gap: theme.spacing[2], flexWrap: 'wrap' },
  error: { ...theme.typography.body, color: theme.colors.feedback.errorText, textAlign: 'center', marginVertical: theme.spacing[6] },
});
