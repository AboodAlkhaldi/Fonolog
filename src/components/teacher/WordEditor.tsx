/**
 * Word editor — used by both /teacher/word/[id] and /admin/content/word/[id].
 * Auto-syllabifies Turkish, kicks off TTS gen on save.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { contentRepository, type Category } from '@/domain';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

function autoSyllabify(word: string): string[] {
  const VOWELS = new Set('aeıioöuüAEIİOÖUÜ');
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    buf += ch;
    if (VOWELS.has(ch)) {
      const next = word[i + 1];
      const after = word[i + 2];
      if (next && !VOWELS.has(next) && after && VOWELS.has(after)) {
        out.push(buf); buf = '';
      }
    }
  }
  if (buf) out.push(buf);
  return out.length > 0 ? out : [word];
}

export default function WordEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [cats, setCats] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [wordText, setWordText] = useState('');
  const [emoji, setEmoji] = useState('');
  const [syllables, setSyllables] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = await contentRepository.getCategories();
      setCats(c);
      if (c.length > 0) setCategoryId(c[0].id);
      if (!isNew && id) {
        const { data } = await supabase.from('words').select('*').eq('id', id).maybeSingle();
        if (data) {
          setWordText(data.word_text);
          setEmoji(data.emoji);
          setSyllables((data.syllables ?? []).join('-'));
          setCategoryId(data.category_id);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const onAuto = () => setSyllables(autoSyllabify(wordText).join('-'));

  const onSubmit = async () => {
    if (!wordText || !emoji || !categoryId) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('teacher.wordEdit.incompleteMsg'));
      return;
    }
    setSubmitting(true);
    const syl = syllables.split('-').map((s) => s.trim()).filter(Boolean);
    const wl = wordText.toLowerCase().trim();

    const payload = {
      category_id: categoryId,
      word_text: wl,
      emoji,
      syllables: syl,
      syllable_count: syl.length,
      first_letter: wl[0] ?? '',
      last_letter: wl[wl.length - 1] ?? '',
      rhyme_group: syl[syl.length - 1] ?? null,
      is_active: true,
    };

    let result: { data: any; error: any };
    if (isNew) {
      // Check for a soft-deleted word with the same text+category → reactivate instead of insert
      const { data: existing } = await supabase
        .from('words')
        .select('id')
        .eq('word_text', wl)
        .eq('category_id', categoryId)
        .eq('is_active', false)
        .maybeSingle();

      result = existing
        ? await supabase.from('words').update(payload).eq('id', existing.id).select().single()
        : await supabase.from('words').insert(payload).select().single();
    } else {
      result = await supabase.from('words').update(payload).eq('id', id).select().single();
    }

    if (result.error) {
      showAlert(t('app.error_title'), result.error.message);
      setSubmitting(false);
      return;
    }

    if (result.data?.id) {
      const { data: { session } } = await supabase.auth.getSession();
      fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-tts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: result.data.id }),
      }).catch(() => {});
    }

    contentRepository.invalidate();
    router.back();
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{isNew ? t('teacher.wordEdit.titleNew') : t('teacher.wordEdit.titleEdit')}</Text>

      <ScrollView>
        <Input label={t('teacher.wordEdit.wordLabel')} value={wordText} onChangeText={setWordText} autoCapitalize="none" required />
        <Input label={t('teacher.wordEdit.emojiLabel')} value={emoji} onChangeText={setEmoji} required />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input label={t('teacher.wordEdit.syllablesLabel')} value={syllables} onChangeText={setSyllables}
                   autoCapitalize="none" helper={t('teacher.wordEdit.syllablesHelper')} />
          </View>
          <Button label={t('teacher.wordEdit.autoBtn')} variant="ghost" size="md" onPress={onAuto}
                  style={{ marginBottom: 16 }} />
        </View>

        <Text style={styles.label}>{t('teacher.wordEdit.categoryLabel')}</Text>
        <View style={styles.catGrid}>
          {cats.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.catTile, categoryId === c.id && styles.catTileSelected]}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={styles.catName}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <Button
          label={isNew ? t('teacher.wordEdit.addBtn') : t('teacher.wordEdit.saveBtn')}
          variant="cta" size="lg" fullWidth
          loading={submitting} onPress={onSubmit}
          style={{ marginTop: theme.spacing[5] }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  label: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, marginBottom: theme.spacing[2] },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[3] },
  catTile: {
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2, borderColor: theme.colors.border.subtle,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  catTileSelected: { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.background.tertiary },
  catEmoji: { fontSize: 16 },
  catName: { ...theme.typography.bodySmall, color: theme.colors.text.primary },
});
