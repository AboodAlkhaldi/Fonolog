import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { contentRepository, listModules } from '@/domain';
import { theme } from '@/theme';

const STAGE_4_AVAILABLE = new Set(['tani','tamamla','heceBirlestir','uyak','kategori']);

export default function NewAssignment() {
  const teacher = useAuth((s) => s.user);
  const [step, setStep] = useState<'student'|'words'|'modules'|'meta'>('student');

  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');

  const [allWords, setAllWords] = useState<any[]>([]);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  const modules = listModules().filter((m) => STAGE_4_AVAILABLE.has(m.id));
  const [pickedModules, setPickedModules] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
    if (!teacher) return;
    (async () => {
      // Only load students LINKED to this teacher (RLS-friendly).
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


  const submit = async () => {
    if (!teacher) return;
    if (!studentId || pickedWords.size === 0 || pickedModules.size === 0 || !title) {
      Alert.alert('Eksik', 'Tüm adımları tamamla.');
      return;
    }
    setSubmitting(true);

    // Ensure teacher_students link exists (admin can assign to anyone)
    await supabase.from('teacher_students').upsert(
      { teacher_id: teacher.id, student_id: studentId },
      { onConflict: 'teacher_id,student_id', ignoreDuplicates: true },
    );

    const { error } = await supabase.from('assignments').insert({
      teacher_id: teacher.id,
      student_id: studentId,
      title,
      module_ids: Array.from(pickedModules),
      word_ids:   Array.from(pickedWords),
      status:     'assigned',
    });

    setSubmitting(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    router.back();
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>Yeni Ödev</Text>

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
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, studentId === item.id && styles.rowSelected]}
              onPress={() => { setStudentId(item.id); setStep('words'); }}
            >
              <Text style={{ fontSize: 24 }}>{item.child_avatar_emoji ?? '🦁'}</Text>
              <Text style={styles.rowText}>{item.full_name}</Text>
            </Pressable>
          )}
        />
      )}

      {step === 'words' && (
        <>
          <Text style={styles.hint}>Kelimeler ({pickedWords.size} seçildi)</Text>
          <FlatList
            data={allWords}
            numColumns={3}
            keyExtractor={(w) => w.id ?? w.word}
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
          <Button label="Devam" variant="cta" size="md" onPress={() => setStep('modules')} disabled={pickedWords.size === 0} />
        </>
      )}

      {step === 'modules' && (
        <>
          <Text style={styles.hint}>Oyunlar ({pickedModules.size} seçildi)</Text>
          {modules.map((m) => {
            const selected = pickedModules.has(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  const next = new Set(pickedModules);
                  selected ? next.delete(m.id) : next.add(m.id);
                  setPickedModules(next);
                }}
                style={[styles.row, selected && styles.rowSelected]}
              >
                <Text style={{ fontSize: 24 }}>{m.icon}</Text>
                <Text style={styles.rowText}>{m.title}</Text>
              </Pressable>
            );
          })}
          <Button label="Devam" variant="cta" size="md" onPress={() => setStep('meta')} disabled={pickedModules.size === 0} />
        </>
      )}

      {step === 'meta' && (
        <>
          <Input label="Başlık" value={title} onChangeText={setTitle} required />
          <Button label="Ödevi Oluştur" variant="cta" size="lg" fullWidth loading={submitting} onPress={submit} />
        </>
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
  rowText: { ...theme.typography.body, color: theme.colors.text.primary },
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
});
