import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input } from '@/components';
import { showAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { contentRepository, listModules } from '@/domain';
import { checkUsage, recordUsage } from '@/lib/entitlements';
import { theme } from '@/theme';
import { t } from '@/i18n';

const MIN_WORDS = 10;
const MAX_WORDS = 20;

export default function NewAssignment() {
  const teacher = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const params = useLocalSearchParams<{ studentId?: string }>();
  const [step, setStep] = useState<'student'|'words'|'module'|'meta'>(
    params.studentId ? 'words' : 'student',
  );

  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState(params.studentId ?? '');

  const [allWords, setAllWords] = useState<any[]>([]);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  const modules = listModules();
  /** Single-select — only one game per ödev. */
  const [pickedModuleId, setPickedModuleId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!teacher) return;
    (async () => {
      const { data: links } = await supabase
        .from('teacher_students')
        .select('student_id')
        .eq('teacher_id', teacher.id);
      const ids = (links ?? []).map((l: any) => l.student_id);
      const w = await contentRepository.getAllWords();
      if (ids.length === 0) {
        setStudents([]);
        setAllWords(w);
        return;
      }
      const { data: s } = await supabase
        .from('profiles')
        .select('id,full_name,child_avatar_emoji')
        .in('id', ids)
        .order('full_name');
      setStudents(s ?? []);
      setAllWords(w);
    })();
  }, [teacher?.id]);

  const wordCountOk = pickedWords.size >= MIN_WORDS && pickedWords.size <= MAX_WORDS;

  const submit = async () => {
    if (!teacher) return;
    if (impersonating === 'teacher') {
      showAlert(t('profile.previewAction'), t('teacher.assignment.previewMsg'));
      return;
    }
    if (!studentId || !pickedModuleId || !wordCountOk || !title) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('teacher.assignment.incompleteMsg'));
      return;
    }

    const usage = await checkUsage(profile, 'assignment_create');
    if (!usage.allowed) {
      showAlert(
        t('teacher.assignment.quotaTitle'),
        `${usage.reason} ${t('teacher.assignment.quotaSuffix')}`,
        [
          { text: t('app.cancel'), style: 'cancel' },
          { text: t('teacher.assignment.upgradeBtn'), onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }

    setSubmitting(true);

    const { data: homework, error } = await supabase
      .from('homeworks')
      .insert({
        teacher_id:   teacher.id,
        student_id:   studentId,
        module_id:    pickedModuleId,
        word_ids:     Array.from(pickedWords),
        title,
        instructions: message || null,
        status:       'assigned',
      } as any)
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      showAlert(t('app.error_title'), error.message);
      return;
    }

    // In-app notification for student. We insert directly here so the student
    // sees the homework even if the push edge function fails. If THIS insert
    // fails (RLS hiccup, network blip), we still call send-push below — the
    // edge function dedups on payload.homework_id, so the student ends up with
    // exactly one notification regardless of which path lands first.
    const homeworkId = (homework as any)?.id;
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: studentId,
      type:    'homework_new',
      title:   t('teacher.assignment.notifTitle'),
      body:    title,
      payload: { homework_id: homeworkId, teacher_id: teacher.id, message },
    } as any);
    if (notifErr) {
      console.warn('[homework] student notification insert failed, falling back to send-push', notifErr.message);
    }

    // Push notification + inbox fallback. send-push checks for an existing
    // notifications row with the same homework_id and skips its own insert if
    // found, so the student never sees a duplicate.
    supabase.functions.invoke('send-push', {
      body: {
        user_id: studentId,
        title:   t('teacher.assignment.notifTitle'),
        body:    title,
        type:    'homework_new',
        data:    { homework_id: homeworkId, teacher_id: teacher.id },
      },
    }).catch((e) => console.warn('[homework] send-push failed', e));

    await recordUsage(profile, 'assignment_create');

    setSubmitting(false);
    showAlert(t('teacher.assignment.successTitle'), t('teacher.assignment.successMsg'), [
      { text: t('app.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{t('teacher.assignment.title')}</Text>

      <View style={styles.steps}>
        {(['student','words','module','meta'] as const).map((s, i) => (
          <Pressable key={s} onPress={() => setStep(s)} style={[styles.stepBtn, step === s && styles.stepBtnActive]}>
            <Text style={[styles.stepText, step === s && styles.stepTextActive]}>{i+1}</Text>
          </Pressable>
        ))}
      </View>

      {step === 'student' && (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {impersonating === 'teacher'
                ? t('teacher.assignment.previewNoStudents')
                : t('teacher.assignment.noStudents')}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, studentId === item.id && styles.rowSelected]}
              onPress={() => { setStudentId(item.id); setPickedModuleId(null); setStep('words'); }}
            >
              <Text style={{ fontSize: 24 }}>{item.child_avatar_emoji ?? '🦁'}</Text>
              <Text style={styles.rowText}>{item.full_name}</Text>
            </Pressable>
          )}
        />
      )}

      {step === 'words' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.hint}>
            {t('teacher.assignment.wordsHintRange', {
              count: pickedWords.size, min: MIN_WORDS, max: MAX_WORDS,
            })}
          </Text>
          <FlatList
            style={{ flex: 1 }}
            data={allWords}
            numColumns={3}
            keyExtractor={(w) => w.id ?? w.word}
            contentContainerStyle={{ paddingBottom: theme.spacing[3] }}
            renderItem={({ item }) => {
              const selected = pickedWords.has(item.id);
              const atMax = !selected && pickedWords.size >= MAX_WORDS;
              return (
                <Pressable
                  onPress={() => {
                    if (atMax) return;
                    const next = new Set(pickedWords);
                    selected ? next.delete(item.id) : next.add(item.id);
                    setPickedWords(next);
                  }}
                  style={[styles.wordTile, selected && styles.wordTileSelected, atMax && styles.rowLocked]}
                >
                  <Text>{item.emoji}</Text>
                  <Text style={styles.wordTileText}>{item.word}</Text>
                </Pressable>
              );
            }}
          />
          <Button label={t('teacher.assignment.continueBtn')} variant="cta" size="md" onPress={() => setStep('module')} disabled={!wordCountOk} />
        </View>
      )}

      {step === 'module' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.hint}>{t('teacher.assignment.moduleHintSingle')}</Text>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: theme.spacing[3] }}
          >
            {modules.map((m) => {
              const selected = pickedModuleId === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setPickedModuleId(m.id)}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <Text style={{ fontSize: 24 }}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{m.title}</Text>
                    <Text style={styles.rowSubtext}>{m.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button label={t('teacher.assignment.continueBtn')} variant="cta" size="md" onPress={() => setStep('meta')} disabled={!pickedModuleId} />
        </View>
      )}

      {step === 'meta' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: theme.spacing[6] }}
          keyboardShouldPersistTaps="handled"
        >
          <Input label={t('teacher.assignment.titleLabel')} value={title} onChangeText={setTitle} required />
          <Input
            label={t('teacher.assignment.messageLabel')}
            value={message}
            onChangeText={setMessage}
            placeholder={t('teacher.assignment.messagePh')}
            multiline
            numberOfLines={4}
          />
          <Button
            label={t('teacher.assignment.submitBtn')}
            variant="cta"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={submit}
            style={{ marginTop: theme.spacing[3] }}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  steps: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing[3] },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnActive: { backgroundColor: theme.colors.brand.primary },
  stepText: { ...theme.typography.bodyMedium, color: theme.colors.text.muted },
  stepTextActive: { color: theme.colors.text.primary },
  hint: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: theme.colors.brand.primary },
  rowLocked:   { opacity: 0.45 },
  rowText: { ...theme.typography.body, color: theme.colors.text.primary },
  rowSubtext: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  wordTile: {
    flex: 1, margin: 4, padding: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wordTileSelected: { borderColor: theme.colors.brand.primary },
  wordTileText: { ...theme.typography.caption, color: theme.colors.text.primary },
  empty: {
    ...theme.typography.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing[8],
  },
});
