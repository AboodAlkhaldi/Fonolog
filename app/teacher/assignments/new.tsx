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
import { getAccessTier, canPlayModule } from '@/lib/access-tier';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function NewAssignment() {
  const teacher = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const params = useLocalSearchParams<{ studentId?: string }>();
  const [step, setStep] = useState<'student'|'words'|'modules'|'meta'>(
    params.studentId ? 'words' : 'student',
  );

  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState(params.studentId ?? '');

  const [allWords, setAllWords] = useState<any[]>([]);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  const modules = listModules();
  const [pickedModules, setPickedModules] = useState<Set<string>>(new Set());
  const [studentAccessTier, setStudentAccessTier] = useState<ReturnType<typeof getAccessTier>>('free');

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

  // Fetch selected student's profile to compute their access tier.
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status,subscription_expires,role')
        .eq('id', studentId)
        .maybeSingle();
      setStudentAccessTier(getAccessTier(data ?? null));
    })();
  }, [studentId]);

  const submit = async () => {
    if (!teacher) return;
    if (impersonating === 'teacher') {
      showAlert(t('profile.previewAction'), t('teacher.assignment.previewMsg'));
      return;
    }
    if (!studentId || pickedWords.size === 0 || pickedModules.size === 0 || !title) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('teacher.assignment.incompleteMsg'));
      return;
    }

    // Quota check (trial: 2 ödev / hafta)
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

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        teacher_id:   teacher.id,
        student_id:   studentId,
        title,
        instructions: message || null,
        module_ids:   Array.from(pickedModules),
        word_ids:     Array.from(pickedWords),
        status:       'assigned',
      })
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      showAlert(t('app.error_title'), error.message);
      return;
    }

    // Notify the student in-app. Best-effort: do not fail the flow if this insert errors.
    await supabase.from('notifications').insert({
      user_id: studentId,
      type:    'assignment_new',
      title:   t('teacher.assignment.notifTitle'),
      body:    title,
      payload: { assignment_id: assignment?.id, teacher_id: teacher.id, message },
    });

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

      {/* Step nav */}
      <View style={styles.steps}>
        {(['student','words','modules','meta'] as const).map((s, i) => (
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
              onPress={() => { setStudentId(item.id); setPickedModules(new Set()); setStep('words'); }}
            >
              <Text style={{ fontSize: 24 }}>{item.child_avatar_emoji ?? '🦁'}</Text>
              <Text style={styles.rowText}>{item.full_name}</Text>
            </Pressable>
          )}
        />
      )}

      {step === 'words' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.hint}>{t('teacher.assignment.wordsHint', { count: pickedWords.size })}</Text>
          <FlatList
            style={{ flex: 1 }}
            data={allWords}
            numColumns={3}
            keyExtractor={(w) => w.id ?? w.word}
            contentContainerStyle={{ paddingBottom: theme.spacing[3] }}
            renderItem={({ item }) => {
              const selected = pickedWords.has(item.id);
              return (
                <Pressable
                  onPress={() => {
                    const next = new Set(pickedWords);
                    selected ? next.delete(item.id) : next.add(item.id);
                    setPickedWords(next);
                  }}
                  style={[styles.wordTile, selected && styles.wordTileSelected]}
                >
                  <Text>{item.emoji}</Text>
                  <Text style={styles.wordTileText}>{item.word}</Text>
                </Pressable>
              );
            }}
          />
          <Button label={t('teacher.assignment.continueBtn')} variant="cta" size="md" onPress={() => setStep('modules')} disabled={pickedWords.size === 0} />
        </View>
      )}

      {step === 'modules' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.hint}>{t('teacher.assignment.modulesHint', { count: pickedModules.size })}</Text>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: theme.spacing[3] }}
          >
            {modules.map((m) => {
              const accessible = canPlayModule(studentAccessTier, m);
              const selected   = pickedModules.has(m.id);
              const lockReason = !accessible
                ? (m.usesPronunciation ? t('teacher.assignment.lockPronunciation') : t('teacher.assignment.lockLevel', { level: m.level }))
                : null;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    if (!accessible) {
                      showAlert(t('teacher.assignment.lockTitle'), t('teacher.assignment.lockMsg', { reason: lockReason }));
                      return;
                    }
                    const next = new Set(pickedModules);
                    selected ? next.delete(m.id) : next.add(m.id);
                    setPickedModules(next);
                  }}
                  style={[styles.row, selected && styles.rowSelected, !accessible && styles.rowLocked]}
                >
                  <Text style={{ fontSize: 24, opacity: accessible ? 1 : 0.4 }}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowText, !accessible && styles.rowTextLocked]}>{m.title}</Text>
                    {lockReason
                      ? <Text style={styles.lockLabel}>{lockReason}</Text>
                      : <Text style={styles.rowSubtext}>{m.description}</Text>
                    }
                  </View>
                  {!accessible && (
                    <Ionicons name="lock-closed" size={16} color={theme.colors.text.muted} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          <Button label={t('teacher.assignment.continueBtn')} variant="cta" size="md" onPress={() => setStep('meta')} disabled={pickedModules.size === 0} />
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
  rowLocked:   { opacity: 0.55 },
  rowText: { ...theme.typography.body, color: theme.colors.text.primary },
  rowTextLocked: { color: theme.colors.text.muted },
  rowSubtext: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  lockLabel:  { ...theme.typography.caption, color: theme.colors.feedback.errorText, marginTop: 2 },
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
