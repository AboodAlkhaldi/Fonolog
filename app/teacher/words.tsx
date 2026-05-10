import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Input } from '@/components';
import { supabase } from '@/lib/supabase';
import { contentRepository } from '@/domain';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

interface WordRow {
  id: string;
  word_text: string;
  emoji: string;
  audio_url: string | null;
  category_id: string;
}

export default function WordsScreen() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('words')
      .select('id,word_text,emoji,audio_url,category_id')
      .eq('is_active', true)
      .order('word_text');
    setWords((data ?? []) as WordRow[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = search
    ? words.filter((w) => w.word_text.toLowerCase().includes(search.toLowerCase()))
    : words;

  const generateMissingAudio = async () => {
    const missing = words.filter((w) => !w.audio_url);
    if (missing.length === 0) {
      showAlert(t('teacher.words.allAudioOkTitle'), t('teacher.words.allAudioOkMsg'));
      return;
    }
    showAlert(
      t('teacher.words.genTitle'),
      t('teacher.words.genMsg', { count: missing.length }),
      [
        { text: t('app.cancel'), style: 'cancel' },
        { text: t('teacher.words.genProceedBtn'), onPress: () => runBulkTTS(missing) },
      ],
    );
  };

  const runBulkTTS = async (missing: WordRow[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    let ok = 0, fail = 0;
    for (const w of missing) {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-tts`,
          {
            method:  'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({ word_id: w.id }),
          },
        );
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    contentRepository.invalidate();
    await load();
    showAlert(t('teacher.words.genDoneTitle'), t('teacher.words.genDoneMsg', { ok, fail }));
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{t('teacher.words.title', { count: words.length })}</Text>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('teacher.words.searchPh')}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          label={t('teacher.words.newWordBtn')}
          variant="primary"
          size="md"
          onPress={() => router.push('/teacher/word/new' as any)}
          style={{ flex: 1 }}
        />
        <Button
          label={t('teacher.words.genMissingBtn')}
          variant="secondary"
          size="md"
          onPress={generateMissingAudio}
          style={{ flex: 1 }}
        />
      </View>

      <FlatList
        style={{ marginTop: theme.spacing[4] }}
        data={filtered}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/teacher/word/${item.id}` as any)}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.wordText}>{item.word_text}</Text>
            </View>
            {item.audio_url ? (
              <Ionicons name="volume-medium" size={18} color={theme.colors.feedback.success} />
            ) : (
              <Ionicons name="volume-mute" size={18} color={theme.colors.text.muted} />
            )}
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   theme.spacing[3],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  emoji: { fontSize: 24 },
  wordText: { ...theme.typography.body, color: theme.colors.text.primary },
});
