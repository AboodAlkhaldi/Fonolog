import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Badge } from '@/components';
import { contentRepository, type Category } from '@/domain';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function LearnTab() {
  const profile = useAuth((s) => s.profile);
  const [cats, setCats] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const c = await contentRepository.getCategories();
      setCats(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kategoriler yüklenemedi.');
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    contentRepository.invalidate();
    await load();
    setRefreshing(false);
  };

  if (cats === null && !error) {
    return <Screen><Loading message={t('app.loading')} /></Screen>;
  }

  // Tier check: free + trial see everything; free with no trial sees only is_premium=false.
  const sub = profile?.subscription_status ?? 'free';
  const hasFullAccess = sub !== 'free';
  // (We display premium cats locked rather than hiding them, so users see the value.)

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('learn.title')}</Text>
        <Text style={styles.subtitle}>{t('learn.chooseCategory')}</Text>
      </View>

      {error ? (
        <Pressable onPress={load} style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>Yenile</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={cats ?? []}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const locked = !hasFullAccess && item.level > 0;
          return (
            <Pressable
              onPress={() => {
                if (locked) {
                  router.push('/paywall' as any);
                  return;
                }
                router.push(`/learn/category/${item.id}`);
              }}
              style={[styles.card, locked && styles.cardLocked]}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ disabled: locked }}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              {locked ? (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color={theme.colors.text.muted} />
                  <Text style={styles.lockLabel}>{t('learn.premium')}</Text>
                </View>
              ) : (
                <Badge label="✓" variant="success" />
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[4] },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  list: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom:     theme.spacing[8],
  },
  row: {
    justifyContent: 'space-between',
    marginBottom:   theme.spacing[3],
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius:    theme.radius.xl,
    paddingVertical: theme.spacing[5],
    paddingHorizontal: theme.spacing[3],
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  cardLocked: { opacity: 0.6 },
  cardEmoji:  { fontSize: 48, marginBottom: theme.spacing[2] },
  cardName: {
    ...theme.typography.h4,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    paddingHorizontal: theme.spacing[2],
    paddingVertical:   theme.spacing[1],
    borderRadius:      theme.radius.full,
  },
  lockLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginLeft: 4,
  },
  errorCard: {
    backgroundColor: theme.colors.feedback.errorSubtle,
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[5],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[3],
  },
  errorText: { ...theme.typography.body, color: theme.colors.feedback.errorText },
  errorRetry: {
    ...theme.typography.bodyMedium,
    color: theme.colors.feedback.errorText,
    marginTop: theme.spacing[1],
    textDecorationLine: 'underline',
  },
});
