/**
 * Word editor — used by both /teacher/word/[id] and /admin/content/word/[id].
 * Auto-syllabifies Turkish, kicks off TTS gen on save, and lets the admin
 * upload an SVG or PNG illustration to the `word-images` Storage bucket.
 *
 * The previous emoji-string input is gone: rendering is via uploaded image
 * assets so every device shows the same artwork (see WordImage component).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
// expo-file-system v55 moved the readAsStringAsync / EncodingType API to a
// `/legacy` subpath. Importing from the bare name gives the new File/Directory
// classes only — `EncodingType` becomes undefined and crashes the uploader.
import * as FileSystem from 'expo-file-system/legacy';

import { Screen, Button, Input, Loading, WordImage } from '@/components';
import { SpeakerButton } from '@/components/session/SpeakerButton';
import { supabase } from '@/lib/supabase';
import { contentRepository, type Category } from '@/domain';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

// Word illustrations are SVG-only: vector art scales cleanly to every tile
// size and keeps the asset library uniform. PNG uploads are rejected.
const IMAGE_TYPE = 'svg' as const;

/** Cheap structural check that a picked file is actually an SVG document. */
function looksLikeSvg(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.includes('<svg') && t.includes('</svg>');
}

function syllabifyWord(word: string): string[] {
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

/**
 * Syllabify a (possibly multi-word) phrase. Each space-separated word is
 * syllabified independently; the words are rejoined with a space so the auto
 * output reads e.g. "mik-ro-dal-ga fı-rın". The space is a syllable boundary
 * just like '-', so the count stays correct for two-word phrases.
 */
function autoSyllabify(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => syllabifyWord(w).join('-'))
    .join(' ');
}

/**
 * Split a syllable string into individual syllables. Both '-' and whitespace
 * are syllable separators: a phrase like "mik-ro-dal-ga fı-rın" must count the
 * space between the two words too, otherwise "ga fı" collapses into one hece.
 */
function splitSyllables(text: string): string[] {
  return text.split(/[-\s]+/).map((s) => s.trim()).filter(Boolean);
}

function decode(base64: string): Uint8Array {
  const binaryString = (globalThis as any).atob
    ? (globalThis as any).atob(base64)
    : require('base-64').decode(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export default function WordEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [cats, setCats] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [wordText, setWordText] = useState('');
  // The word_text as it was when the editor opened — used on save to detect
  // whether the spoken text changed and the TTS audio must be regenerated.
  const [originalWordText, setOriginalWordText] = useState('');
  const [syllables, setSyllables] = useState('');

  // Image asset state. `pickedUri` is a local file picked in this session and
  // not yet uploaded; `currentImageUrl` is the URL already stored on the row.
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // Current TTS audio URL stored on the row, so the admin can listen to / regen
  // the existing sound.
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

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
          setOriginalWordText(data.word_text);
          setSyllables((data.syllables ?? []).join('-'));
          setCategoryId(data.category_id);
          if (data.image_url) setCurrentImageUrl(data.image_url);
          if (data.audio_url) setCurrentAudioUrl(data.audio_url);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const onAuto = () => setSyllables(autoSyllabify(wordText));

  // Manually force-regenerate the TTS audio for the saved word. Unlike the
  // automatic regen on save, this awaits the result so we can swap in the new
  // (cache-busted) URL and let the admin listen immediately. It regenerates
  // from the word's CURRENTLY SAVED text — mainly to fix older words whose
  // audio went stale before force-regeneration existed.
  const onRegenerate = async () => {
    if (isNew || !id) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-tts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: id, force: true }),
      });
      if (!res.ok) {
        showAlert(t('app.error_title'), `${t('teacher.wordEdit.regenFailed')} ${await res.text()}`);
        return;
      }
      const json = await res.json();
      if (json.audio_url) setCurrentAudioUrl(json.audio_url);
      contentRepository.invalidate();
      showAlert(t('app.ok'), t('teacher.wordEdit.regenSuccess'));
    } catch (e) {
      showAlert(t('app.error_title'), `${t('teacher.wordEdit.regenFailed')} ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRegenerating(false);
    }
  };

  const pickImage = async () => {
    // SVG-only. expo-image-picker does not pick SVGs reliably across
    // platforms, so route selection through expo-document-picker which honors
    // MIME, then validate the file really is an SVG before accepting it.
    const r = await DocumentPicker.getDocumentAsync({
      type: ['image/svg+xml', 'image/svg', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const uri = r.assets[0].uri;

    try {
      const text = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (!looksLikeSvg(text)) {
        showAlert(t('app.error_title'), t('teacher.wordEdit.imageNotSvg'));
        return;
      }
    } catch {
      showAlert(t('app.error_title'), t('teacher.wordEdit.imageNotSvg'));
      return;
    }
    setPickedUri(uri);
  };

  const uploadImage = async (recordId: string): Promise<string | null> => {
    if (!pickedUri) return null;
    const path = `${recordId}.svg`;

    const base64 = await FileSystem.readAsStringAsync(pickedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = decode(base64);

    const { error } = await supabase.storage
      .from('word-images')
      .upload(path, bytes, { contentType: 'image/svg+xml', upsert: true });
    if (error) {
      showAlert(t('app.error_title'), `${t('teacher.wordEdit.uploadFailed')} ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from('word-images').getPublicUrl(path);
    // Cache-bust: the path is stable (upsert overwrites in place), so without a
    // changing query param the CDN / device image cache would keep serving the
    // previous asset after a re-upload.
    return `${data.publicUrl}?v=${Date.now()}`;
  };

  const onSubmit = async () => {
    if (!wordText || !categoryId) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('teacher.wordEdit.incompleteMsg'));
      return;
    }
    setSubmitting(true);
    const syl = splitSyllables(syllables);
    const wl = wordText.toLowerCase().trim();

    // Insert the row first so we have a stable id for the image path; then
    // upload and update with the URL. On edit we just upload to the existing
    // id. This keeps storage paths predictable: <word_id>.<ext>.
    const basePayload: any = {
      category_id: categoryId,
      word_text: wl,
      syllables: syl,
      syllable_count: syl.length,
      first_letter: wl[0] ?? '',
      last_letter: wl[wl.length - 1] ?? '',
      rhyme_group: syl[syl.length - 1] ?? null,
      is_active: true,
    };

    let resultId: string | null = null;
    let resultError: any = null;

    if (isNew) {
      const { data: existing } = await supabase
        .from('words')
        .select('id')
        .eq('word_text', wl)
        .eq('category_id', categoryId)
        .eq('is_active', false)
        .maybeSingle();

      const { data, error } = existing
        ? await supabase.from('words').update(basePayload).eq('id', existing.id).select().single()
        : await supabase.from('words').insert(basePayload).select().single();
      resultId = data?.id ?? null;
      resultError = error;
    } else {
      const { data, error } = await supabase
        .from('words').update(basePayload).eq('id', id).select().single();
      resultId = data?.id ?? null;
      resultError = error;
    }

    if (resultError || !resultId) {
      showAlert(t('app.error_title'), resultError?.message ?? '');
      setSubmitting(false);
      return;
    }

    // Upload any newly-picked image and patch the row with the URL + type.
    if (pickedUri) {
      const url = await uploadImage(resultId);
      if (url) {
        const { error: imgErr } = await supabase
          .from('words')
          .update({ image_url: url, image_type: IMAGE_TYPE } as any)
          .eq('id', resultId);
        if (imgErr) {
          showAlert(t('app.error_title'), imgErr.message);
          setSubmitting(false);
          return;
        }
      }
    }

    // Kick off TTS generation (fire-and-forget). Only (re)generate when needed:
    //   - new word        → no audio yet, generate it
    //   - edited word_text → the spoken word changed, force a regen (overwrites
    //                        the old mp3 in place). The hece does NOT affect the
    //                        spoken audio, so a hece-only edit is skipped.
    // Skipping unchanged saves avoids re-charging Google TTS for image/category
    // edits.
    const textChanged = !isNew && wl !== originalWordText;
    if (isNew || textChanged) {
      const { data: { session } } = await supabase.auth.getSession();
      fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-tts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: resultId, force: textChanged }),
      }).catch(() => {});
    }

    contentRepository.invalidate();
    router.back();
  };

  if (loading) return <Screen><Loading /></Screen>;

  // Build a preview Word for the WordImage component.
  const previewWord = {
    word: wordText,
    kat: '', syl: [], n: 0, first: '', last: '', rk: null, emoji: '',
    image_url: pickedUri ?? currentImageUrl ?? undefined,
    image_type: IMAGE_TYPE,
  } as any;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{isNew ? t('teacher.wordEdit.titleNew') : t('teacher.wordEdit.titleEdit')}</Text>

      <ScrollView>
        <Input label={t('teacher.wordEdit.wordLabel')} value={wordText} onChangeText={setWordText} autoCapitalize="none" required />

        <Text style={styles.label}>{t('teacher.wordEdit.imageLabel')}</Text>
        <View style={styles.imageRow}>
          {pickedUri || currentImageUrl ? (
            <WordImage word={previewWord} size={96} />
          ) : (
            <View style={styles.placeholderBox}>
              <Ionicons name="image-outline" size={36} color={theme.colors.text.muted} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: theme.spacing[3] }}>
            <Text style={styles.imageHint}>{t('teacher.wordEdit.imageSvgHint')}</Text>
            <Button
              label={t('teacher.wordEdit.imagePickSvg')}
              variant="secondary" size="md" onPress={pickImage}
              style={{ marginTop: theme.spacing[2] }}
            />
          </View>
        </View>
        <Text style={styles.imageStatus}>
          {pickedUri ? t('teacher.wordEdit.imageSelected')
           : currentImageUrl ? t('teacher.wordEdit.imageCurrent')
           : t('teacher.wordEdit.imageMissing')}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: theme.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Input label={t('teacher.wordEdit.syllablesLabel')} value={syllables} onChangeText={setSyllables}
                   autoCapitalize="none" helper={t('teacher.wordEdit.syllablesHelper')} />
          </View>
          <Button label={t('teacher.wordEdit.autoBtn')} variant="ghost" size="md" onPress={onAuto}
                  style={{ marginBottom: 16 }} />
        </View>

        {/* Audio — listen to the current sound + force-regenerate it. Only for
            saved words (a brand-new word has no audio / id yet). */}
        {!isNew && (
          <View style={{ marginTop: theme.spacing[4] }}>
            <Text style={styles.label}>{t('teacher.wordEdit.audioLabel')}</Text>
            <View style={styles.audioRow}>
              {currentAudioUrl ? (
                <SpeakerButton audioUrl={currentAudioUrl} size={48} />
              ) : (
                <Text style={styles.audioMissing}>{t('teacher.wordEdit.audioMissing')}</Text>
              )}
              <Button
                label={regenerating ? t('teacher.wordEdit.regenerating') : t('teacher.wordEdit.regenerateBtn')}
                variant="secondary"
                size="md"
                loading={regenerating}
                onPress={onRegenerate}
                style={{ flex: 1, marginLeft: theme.spacing[3] }}
              />
            </View>
          </View>
        )}

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
  imageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  placeholderBox: {
    width: 96, height: 96,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  imageHint: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
  imageStatus: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[3],
  },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  audioMissing: { ...theme.typography.bodySmall, color: theme.colors.text.muted },
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
