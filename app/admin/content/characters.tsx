import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';

type Tab = 'base' | 'extras' | 'cats';

export default function AdminCharacters() {
  const [tab, setTab] = useState<Tab>('base');
  const [bases,  setBases]  = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [cats,   setCats]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [b, x, c] = await Promise.all([
      supabase.from('characters_base').select('*').order('display_order'),
      supabase.from('character_extras').select('*').order('unlock_xp'),
      supabase.from('character_extra_categories').select('*').order('display_order'),
    ]);
    setBases(b.data ?? []);
    setExtras(x.data ?? []);
    setCats(c.data ?? []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onAdd = () => showAlert('Ne ekleyeceksin?', '', [
    { text: 'Ana Karakter',     onPress: () => router.push('/admin/content/character-edit/base/new') },
    { text: 'Aksesuar Kategorisi', onPress: () => router.push('/admin/content/character-edit/cat/new') },
    { text: 'Aksesuar (Extra)',  onPress: () => router.push('/admin/content/character-edit/extra/new') },
    { text: 'Vazgeç', style: 'cancel' },
  ]);

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Karakterler</Text>
      </View>

      <Button label="+ Ekle" variant="primary" size="md" fullWidth onPress={onAdd} />

      <View style={styles.tabs}>
        {(['base','extras','cats'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}
                     style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'base' ? 'Ana' : t === 'extras' ? 'Aksesuar' : 'Kategori'}
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
              onPress={() => router.push(`/admin/content/character-edit/base/${item.id}`)}
            >
              <View style={styles.thumb}><Text style={{ fontSize: 24 }}>🦁</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>Açılma: {item.unlock_xp} XP</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </Pressable>
          )}
        />
      )}

      {tab === 'extras' && (
        <FlatList
          data={extras}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/admin/content/character-edit/extra/${item.id}`)}
            >
              <View style={styles.thumb}><Text style={{ fontSize: 18 }}>✨</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                  <Badge label={item.category_id} variant="info" />
                  <Badge label={item.rarity} variant="warning" />
                  <Badge label={`${item.unlock_xp} XP`} variant="success" />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </Pressable>
          )}
        />
      )}

      {tab === 'cats' && (
        <FlatList
          data={cats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>ID: {item.id}</Text>
              </View>
            </View>
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
