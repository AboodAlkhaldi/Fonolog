import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

const placeholderEmoji = (url: string | null | undefined, fallback = '✨') => {
  if (!url || !url.startsWith('placeholder://')) return fallback;
  const extracted = url.slice('placeholder://'.length);
  return extracted || fallback;
};

type Tab = 'base' | 'variants';

interface BaseRow { id: string; name: string; asset_url: string; unlock_xp: number }
interface VariantRow {
  id: string; base_character_id: string;
  name: string; asset_url: string; unlock_xp: number;
  rarity: string;
}

export default function AdminCharacters() {
  const [tab, setTab] = useState<Tab>('base');
  const [bases,    setBases]    = useState<BaseRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    const [b, x] = await Promise.all([
      supabase.from('characters_base').select('*').order('display_order'),
      supabase.from('character_extras').select('*').order('base_character_id, display_order'),
    ]);
    setBases((b.data ?? []) as BaseRow[]);
    setVariants((x.data ?? []) as VariantRow[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const baseNameMap = Object.fromEntries(bases.map((b) => [b.id, b.name]));

  const onAdd = () => showAlert(t('admin.content.addTitle'), '', [
    { text: t('admin.content.addBaseChar'),   onPress: () => router.push('/admin/content/character-edit/base/new' as any) },
    { text: t('admin.content.addVariant'),    onPress: () => router.push('/admin/content/character-edit/variant/new' as any) },
    { text: t('app.cancel'), style: 'cancel' },
  ]);

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{t('admin.content.characters')}</Text>
      </View>

      <Button label={t('admin.content.addBtn')} variant="primary" size="md" fullWidth onPress={onAdd} />

      <View style={styles.tabs}>
        {(['base','variants'] as const).map((tabKey) => (
          <Pressable key={tabKey} onPress={() => setTab(tabKey)}
                     style={[styles.tab, tab === tabKey && styles.tabActive]}>
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'base' ? t('admin.content.tabBase') : t('admin.content.tabVariants')}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'base' && (
        <FlatList
          data={bases}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/admin/content/character-edit/base/${item.id}` as any)}
            >
              <View style={styles.thumb}><Text style={{ fontSize: 24 }}>{placeholderEmoji(item.asset_url, '🦁')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{t('admin.content.unlockXp', { xp: item.unlock_xp })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </Pressable>
          )}
        />
      )}

      {tab === 'variants' && (
        <FlatList
          data={variants}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/admin/content/character-edit/variant/${item.id}` as any)}
            >
              <View style={styles.thumb}><Text style={{ fontSize: 22 }}>{placeholderEmoji(item.asset_url, '✨')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  <Badge label={baseNameMap[item.base_character_id] ?? item.base_character_id} variant="info" />
                  <Badge label={item.rarity} variant="warning" />
                  <Badge label={`${item.unlock_xp} XP`} variant="success" />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3] },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, flex: 1 },
  tabs: { flexDirection: 'row', gap: theme.spacing[2], marginVertical: theme.spacing[3] },
  tab: { flex: 1, padding: theme.spacing[2], borderRadius: theme.radius.md,
         backgroundColor: theme.colors.background.secondary, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.brand.primary },
  tabText: { ...theme.typography.bodyMedium, color: theme.colors.text.muted },
  tabTextActive: { color: theme.colors.text.primary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  thumb: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...theme.typography.body, color: theme.colors.text.primary },
  meta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
});
