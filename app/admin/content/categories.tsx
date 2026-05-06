import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button } from '@/components';
import { supabase } from '@/lib/supabase';
import { contentRepository } from '@/domain';
import { theme } from '@/theme';

export default function AdminCategories() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order');
    setCats(data ?? []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onDelete = (cat: any) => Alert.alert('Sil', `"${cat.name}" kategorisini silmek istediğine emin misin?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('categories').update({ is_active: false } as any).eq('id', cat.id);
      if (error) Alert.alert('Hata', error.message);
      else { contentRepository.invalidate(); load(); }
    }},
  ]);

  const showActions = (cat: any) => Alert.alert(cat.name, '', [
    { text: 'Düzenle', onPress: () => router.push(`/admin/content/category/${cat.id}`) },
    { text: 'Sil', style: 'destructive', onPress: () => onDelete(cat) },
    { text: 'Vazgeç', style: 'cancel' },
  ]);

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Kategoriler ({cats.length})</Text>
      </View>

      <Button
        label="+ Yeni Kategori"
        variant="primary" size="md" fullWidth
        onPress={() => router.push('/admin/content/category/new')}
      />

      <FlatList
        style={{ marginTop: theme.spacing[3] }}
        data={cats}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            </View>
            <Pressable onPress={() => showActions(item)} hitSlop={12} style={styles.dotsBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text.muted} />
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3] },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  emoji: { fontSize: 28 },
  name: { ...theme.typography.body, color: theme.colors.text.primary },
  desc: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  dotsBtn: { padding: theme.spacing[1] },
});
