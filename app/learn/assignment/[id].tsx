import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Loading, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { getModule } from '@/domain';
import { theme } from '@/theme';

interface Assignment {
  id:           string;
  title:        string;
  instructions: string | null;
  status:       string;
  module_ids:   string[];
  word_ids:     string[];
  teacher_id:   string;
  completed_at: string | null;
}

interface TeacherInfo {
  full_name: string | null;
  child_avatar_emoji: string | null;
}

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const start = useSession((s) => s.start);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [teacher, setTeacher]       = useState<TeacherInfo | null>(null);
  const [pickedModuleId, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from('assignments')
        .select('id, title, instructions, status, module_ids, word_ids, teacher_id, completed_at')
        .eq('id', id)
        .maybeSingle();
      if (!alive) return;
      setAssignment(data as Assignment | null);

      if (data?.teacher_id) {
        const { data: t } = await supabase
          .from('profiles')
          .select('full_name, child_avatar_emoji')
          .eq('id', data.teacher_id)
          .maybeSingle();
        if (alive) setTeacher(t as TeacherInfo | null);
      }

      if (data?.module_ids?.length === 1) setPicked(data.module_ids[0]);
    })();
    return () => { alive = false; };
  }, [id]);

  if (!assignment) return <Screen><Loading /></Screen>;

  const isCompleted = assignment.status === 'completed';
  const modules = (assignment.module_ids ?? [])
    .map((mid) => getModule(mid))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const onStart = async (moduleId: string) => {
    await start(moduleId, {
      assignmentId: assignment.id,
      wordIds:      assignment.word_ids,
    });
    router.push(`/session/${moduleId}`);
  };

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[6] }}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📋</Text>
          <Text style={styles.title}>{assignment.title}</Text>
          {isCompleted ? (
            <Badge label="Tamamlandı ✓" variant="success" />
          ) : (
            <Badge label="Beklemede" variant="warning" />
          )}
        </View>

        {teacher ? (
          <View style={styles.teacherRow}>
            <Text style={{ fontSize: 22 }}>{teacher.child_avatar_emoji ?? '👩‍🏫'}</Text>
            <Text style={styles.teacherName}>Öğretmenin: {teacher.full_name ?? '—'}</Text>
          </View>
        ) : null}

        {assignment.instructions ? (
          <View style={styles.messageCard}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.brand.secondaryHover} />
            <View style={{ flex: 1 }}>
              <Text style={styles.messageLabel}>Öğretmenden mesaj</Text>
              <Text style={styles.messageBody}>{assignment.instructions}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>Oyunlar ({modules.length})</Text>

        {modules.map((m) => {
          const selected = pickedModuleId === m.id;
          return (
            <Pressable
              key={m.id}
              style={[styles.moduleCard, selected && styles.moduleCardSelected]}
              onPress={() => setPicked(m.id)}
            >
              <Text style={{ fontSize: 28 }}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleDesc}>{m.description}</Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.brand.primary} />
              ) : null}
            </Pressable>
          );
        })}

        <Button
          label={isCompleted ? 'Tekrar Oyna' : 'Başla'}
          variant="cta"
          size="lg"
          fullWidth
          disabled={!pickedModuleId}
          onPress={() => pickedModuleId && onStart(pickedModuleId)}
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
    borderWidth: 2, borderColor: 'transparent',
  },
  moduleCardSelected: { borderColor: theme.colors.brand.primary },
  moduleTitle: { ...theme.typography.bodyLarge, color: theme.colors.text.primary },
  moduleDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
});
