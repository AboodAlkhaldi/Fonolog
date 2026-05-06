import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Input } from '@/components';
import { supabase } from '@/lib/supabase';
import { contentRepository } from '@/domain';
import { theme } from '@/theme';

interface WordRow {
  id: string;
  word_text: string;
  emoji: string;
  audio_url: string | null;
  category_id: string;
}

export default function AdminWords() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await supabase.from('words').select('id,word_text,emoji,audio_url,category_id').eq('is_active', true).order('word_text');
    setWords((data ?? []) as WordRow[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onDelete = (w: WordRow) => Alert.alert('Sil', `"${w.word_text}" kelimesini silmek istediğine emin misin?`, [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'Sil', style: 'destructive',
      onPress: async () => {
        const { error } = await supabase.from('words').update({ is_active: false } as any).eq('id', w.id);
        if (error) Alert.alert('Hata', error.message);
        else { contentRepository.invalidate(); load(); }
      },
    },
  ]);

  const showActions = (w: WordRow) => Alert.alert(w.word_text, '', [
    { text: 'Düzenle', onPress: () => router.push(`/admin/content/word/${w.id}`) },
    { text: 'Sil', style: 'destructive', onPress: () => onDelete(w) },
    { text: 'Vazgeç', style: 'cancel' },
  ]);

  const filtered = search
    ? words.filter((w) => w.word_text.toLowerCase().includes(search.toLowerCase()))
    : words;

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Kelimeler ({words.length})</Text>
      </View>

      <Button
        label="+ Yeni Kelime"
        variant="primary" size="md" fullWidth
        onPress={() => router.push('/admin/content/word/new')}
      />

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Ara..."
        style={{ marginTop: theme.spacing[3] }}
      />

      <FlatList
        style={{ marginTop: theme.spacing[2] }}
        data={filtered}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.wordText}>{item.word_text}</Text>
            {item.audio_url ? (
              <Ionicons name="volume-medium" size={16} color={theme.colors.feedback.success} />
            ) : (
              <Ionicons name="volume-mute" size={16} color={theme.colors.text.muted} />
            )}
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
  emoji: { fontSize: 24 },
  wordText: { ...theme.typography.body, color: theme.colors.text.primary, flex: 1 },
  dotsBtn: { padding: theme.spacing[1] },
});
