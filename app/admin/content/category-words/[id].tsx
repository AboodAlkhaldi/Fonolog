import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, WordImage } from '@/components';
import { supabase } from '@/lib/supabase';
import { contentRepository } from '@/domain';
import type { Word } from '@/domain';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

interface WordRow {
  id: string;
  word_text: string;
  audio_url: string | null;
  category_id: string;
  image_url: string | null;
  image_type: 'svg' | 'png' | null;
}

/**
 * Words of a single category — opened by tapping a category card in
 * /admin/content/categories. Mirrors the row + 3-dots edit/delete actions of
 * the full words list (app/admin/content/words.tsx) so an admin can manage a
 * category's words in place.
 */
export default function AdminCategoryWords() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('words')
      .select('id,word_text,audio_url,category_id,image_url,image_type')
      .eq('is_active', true)
      .eq('category_id', id)
      .order('word_text');
    setWords((data ?? []) as WordRow[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const onDelete = (w: WordRow) => showAlert(t('admin.content.deleteTitle'), t('admin.content.deleteConfirm', { name: w.word_text }), [
    { text: t('app.cancel'), style: 'cancel' },
    {
      text: t('admin.content.deleteTitle'), style: 'destructive',
      onPress: async () => {
        const { error } = await supabase.from('words').update({ is_active: false } as any).eq('id', w.id);
        if (error) showAlert(t('app.error_title'), error.message);
        else { contentRepository.invalidate(); load(); }
      },
    },
  ]);

  const showActions = (w: WordRow) => showAlert(w.word_text, '', [
    { text: t('admin.content.editBtn'), onPress: () => router.push(`/admin/content/word/${w.id}`) },
    { text: t('admin.content.deleteTitle'), style: 'destructive', onPress: () => onDelete(w) },
    { text: t('app.cancel'), style: 'cancel' },
  ]);

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{name ?? t('admin.content.words')} ({words.length})</Text>
      </View>

      <Button
        label={t('admin.content.newWordBtn')}
        variant="primary" size="md" fullWidth
        onPress={() => router.push('/admin/content/word/new')}
      />

      <FlatList
        style={{ marginTop: theme.spacing[3] }}
        data={words}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/admin/content/word/${item.id}`)}>
            {item.image_url ? (
              <WordImage
                word={{ word: item.word_text, image_url: item.image_url, image_type: item.image_type ?? undefined } as Word}
                size={40}
              />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={18} color={theme.colors.text.muted} />
              </View>
            )}
            <Text style={styles.wordText}>{item.word_text}</Text>
            {item.audio_url ? (
              <Ionicons name="volume-medium" size={16} color={theme.colors.feedback.success} />
            ) : (
              <Ionicons name="volume-mute" size={16} color={theme.colors.text.muted} />
            )}
            <Pressable onPress={() => showActions(item)} hitSlop={12} style={styles.dotsBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text.muted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('admin.content.noWordsInCategory')}</Text>}
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
  noImage: {
    width: 40, height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  wordText: { ...theme.typography.body, color: theme.colors.text.primary, flex: 1 },
  dotsBtn: { padding: theme.spacing[1] },
  empty: { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center', marginTop: theme.spacing[6] },
});
