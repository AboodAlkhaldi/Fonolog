import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Badge } from '@/components';
import { NotificationBell } from '@/components/common/NotificationBell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

const PREVIEW_ID = '__preview__';

interface Row {
  id: string;
  full_name: string;
  email: string;
  child_avatar_emoji: string | null;
  child_age: number | null;
  total_xp: number | null;
  level: number | null;
  current_streak: number | null;
  recent_session_count: number;
}

export default function TeacherHome() {
  const teacher = useAuth((s) => s.user);
  const impersonating = useAuth((s) => s.impersonating);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!teacher) return;
    // Preview mode (admin viewing teacher app) — show a single placeholder card
    // instead of fetching the admin's actual linked students.
    if (impersonating === 'teacher') {
      setRows([{
        id: PREVIEW_ID,
        full_name: 'Öğrenci Adı',
        email: 'ornek@okumadedektifi.com',
        child_avatar_emoji: '🦁',
        child_age: null,
        total_xp: 0,
        level: 1,
        current_streak: 0,
        recent_session_count: 0,
      }]);
      return;
    }
    // Get linked students
    const { data: links } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacher.id);

    const ids = (links ?? []).map((l) => l.student_id);
    if (ids.length === 0) { setRows([]); return; }

    const [profilesRes, charsRes, sessionCountsRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,child_avatar_emoji,child_age').in('id', ids),
      supabase.from('student_character').select('student_id,total_xp,level,current_streak').in('student_id', ids),
      supabase.from('session_logs').select('student_id').in('student_id', ids).gte('created_at', new Date(Date.now() - 7*86400_000).toISOString()),
    ]);

    const charMap = new Map((charsRes.data ?? []).map((c: any) => [c.student_id, c]));
    const countMap = new Map<string, number>();
    (sessionCountsRes.data ?? []).forEach((s: any) => {
      countMap.set(s.student_id, (countMap.get(s.student_id) ?? 0) + 1);
    });

    const merged: Row[] = (profilesRes.data ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      child_avatar_emoji: p.child_avatar_emoji,
      child_age: p.child_age,
      total_xp:    charMap.get(p.id)?.total_xp ?? 0,
      level:       charMap.get(p.id)?.level ?? 1,
      current_streak: charMap.get(p.id)?.current_streak ?? 0,
      recent_session_count: countMap.get(p.id) ?? 0,
    }));

    setRows(merged);
  }, [teacher?.id, impersonating]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (rows === null) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('teacher.myStudents')}</Text>
          <Text style={styles.subtitle}>{t('teacher.studentCount', { count: rows.length })}</Text>
        </View>
        <NotificationBell />
        <Button
          label="+ Ekle"
          variant="primary"
          size="md"
          onPress={() => router.push('/teacher/invite')}
        />
      </View>

      {rows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>{t('teacher.noStudents')}</Text>
          <Text style={styles.emptyText}>{t('teacher.noStudentsHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => {
              if (item.id === PREVIEW_ID) {
                showAlert(t('profile.previewAction'), t('teacher.previewNote'));
                return;
              }
              router.push(`/teacher/student/${item.id}`);
            }}>
              <Text style={styles.avatar}>{item.child_avatar_emoji ?? '🦁'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.metaLine}>
                  {item.child_age ? `${t('teacher.studentAge', { age: item.child_age })} · ` : ''}
                  Sv {item.level} · {item.total_xp} XP
                </Text>
                <View style={styles.badgeRow}>
                  <Badge label={`🔥 ${item.current_streak}`} variant="warning" />
                  <Badge label={`${item.recent_session_count} oturum / hafta`} variant="info" />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.text.muted} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[4], gap: theme.spacing[2] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[2],
    ...theme.shadow.sm,
  },
  avatar: { fontSize: 40 },
  name: { ...theme.typography.h4, color: theme.colors.text.primary },
  metaLine: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  emptyState: { alignItems: 'center', padding: theme.spacing[8] },
  emptyEmoji: { fontSize: 64, marginBottom: theme.spacing[3] },
  emptyTitle: { ...theme.typography.h3, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  emptyText:  { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center' },
});
