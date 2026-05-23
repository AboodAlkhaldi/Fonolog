import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Loading, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { getModule } from '@/domain';
import { theme } from '@/theme';
import { t } from '@/i18n';

interface Homework {
  id:           string;
  title:        string;
  instructions: string | null;
  status:       'assigned' | 'completed' | 'overdue';
  module_id:    string;
  word_ids:     string[];
  teacher_id:   string;
  due_at:       string;
  completed_at: string | null;
}

interface TeacherInfo {
  full_name: string | null;
  child_avatar_emoji: string | null;
}

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const start = useSession((s) => s.start);

  const [homework, setHomework] = useState<Homework | null>(null);
  const [teacher,  setTeacher]  = useState<TeacherInfo | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from('homeworks')
        .select('id, title, instructions, status, module_id, word_ids, teacher_id, due_at, completed_at')
        .eq('id', id)
        .maybeSingle();
      if (!alive) return;
      setHomework(data as Homework | null);

      if (data?.teacher_id) {
        const { data: tProfile } = await supabase
          .from('profiles')
          .select('full_name, child_avatar_emoji')
          .eq('id', data.teacher_id)
          .maybeSingle();
        if (alive) setTeacher(tProfile as TeacherInfo | null);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (!homework) return <Screen><Loading /></Screen>;

  const isCompleted = homework.status === 'completed';
  const isOverdue   = homework.status === 'overdue';
  const mod         = getModule(homework.module_id);

  const onStart = async () => {
    await start(homework.module_id, {
      assignmentId: homework.id,
      wordIds:      homework.word_ids,
    });
    router.push(`/session/${homework.module_id}`);
  };

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[6] }}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📋</Text>
          <Text style={styles.title}>{homework.title}</Text>
          {isCompleted ? (
            <Badge label={t('learn.assignment.completed')} variant="success" />
          ) : isOverdue ? (
            <Badge label={t('learn.assignment.overdue')} variant="warning" />
          ) : (
            <Badge label={t('learn.assignment.pending')} variant="warning" />
          )}
        </View>

        {teacher ? (
          <View style={styles.teacherRow}>
            <Text style={{ fontSize: 22 }}>{teacher.child_avatar_emoji ?? '👩‍🏫'}</Text>
            <Text style={styles.teacherName}>{t('learn.assignment.teacher', { name: teacher.full_name ?? '—' })}</Text>
          </View>
        ) : null}

        {homework.instructions ? (
          <View style={styles.messageCard}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.brand.secondaryHover} />
            <View style={{ flex: 1 }}>
              <Text style={styles.messageLabel}>{t('learn.assignment.messageLabel')}</Text>
              <Text style={styles.messageBody}>{homework.instructions}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>{t('learn.assignment.gameLabel')}</Text>

        {mod ? (
          <View style={styles.moduleCard}>
            <Text style={{ fontSize: 28 }}>{mod.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
              <Text style={styles.moduleDesc}>{mod.description}</Text>
              <Text style={styles.wordCount}>{t('learn.assignment.wordCount', { count: homework.word_ids.length })}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.moduleDesc}>{t('learn.assignment.moduleMissing')}</Text>
        )}

        <Button
          label={isCompleted ? t('results.playAgain') : t('learn.assignment.startBtn')}
          variant="cta"
          size="lg"
          fullWidth
          disabled={!mod || isOverdue}
          onPress={onStart}
          style={{ marginTop: theme.spacing[5] }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  header: { alignItems: 'center', marginVertical: theme.spacing[3] },
  emoji: { fontSize: 64, marginBottom: theme.spacing[2] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing[2] },
  teacherRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  teacherName: { ...theme.typography.body, color: theme.colors.text.secondary },
  messageCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2],
    backgroundColor: theme.colors.feedback.infoSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.lg,
    marginVertical: theme.spacing[3],
  },
  messageLabel: { ...theme.typography.caption, color: theme.colors.text.muted, marginBottom: 2 },
  messageBody:  { ...theme.typography.body, color: theme.colors.text.primary },
  section: { ...theme.typography.h4, color: theme.colors.text.primary, marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[2],
    borderWidth: 2, borderColor: theme.colors.brand.primary,
  },
  moduleTitle: { ...theme.typography.bodyLarge, color: theme.colors.text.primary },
  moduleDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  wordCount:   { ...theme.typography.caption, color: theme.colors.brand.primary, marginTop: 4 },
});
