import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [character, setCharacter] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);  // students of teacher OR teachers of student

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: u } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      setUser(u);

      if (u?.role === 'student') {
        const { data: c } = await supabase.from('student_character').select('*').eq('student_id', id).maybeSingle();
        setCharacter(c);
        const { data: tlinks } = await supabase
          .from('teacher_students')
          .select('teacher:profiles!teacher_id(id,full_name,email)')
          .eq('student_id', id);
        setRelated((tlinks ?? []).map((l: any) => l.teacher).filter(Boolean));
      } else if (u?.role === 'teacher') {
        const { data: slinks } = await supabase
          .from('teacher_students')
          .select('student:profiles!student_id(id,full_name,email,child_avatar_emoji)')
          .eq('teacher_id', id);
        setRelated((slinks ?? []).map((l: any) => l.student).filter(Boolean));
      }
    })();
  }, [id]);

  if (!user) return <Screen><Loading /></Screen>;

  const isStudent = user.role === 'student';

  return (
    <Screen scroll={false}>
      <FlatList
        data={related}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.avatar}>{user.child_avatar_emoji ?? (isStudent ? '🦁' : '👩‍🏫')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user.full_name}</Text>
                <Text style={styles.meta}>{user.email}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  <Badge label={user.role} variant="info" />
                  <Badge label={user.subscription_status} variant={user.subscription_status === 'trial' ? 'warning' : 'success'} />
                  {isStudent && character ? (
                    <>
                      <Badge label={`Sv ${character.level}`} variant="info" />
                      <Badge label={`${character.total_xp} XP`} variant="success" />
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {isStudent
                ? t('admin.linkedTeachers', { count: related.length })
                : t('admin.linkedStudents', { count: related.length })}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.relCard} onPress={() => router.push(`/admin/user/${item.id}`)}>
            <Text style={styles.relAvatar}>{item.child_avatar_emoji ?? (isStudent ? '👩‍🏫' : '🦁')}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.relName}>{item.full_name}</Text>
              <Text style={styles.relMeta}>{item.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('admin.noRelated')}</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[3] },
  avatar: { fontSize: 56 },
  name: { ...theme.typography.h2, color: theme.colors.text.primary },
  meta: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginVertical: theme.spacing[2] },
  relCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  relAvatar: { fontSize: 28 },
  relName: { ...theme.typography.body, color: theme.colors.text.primary },
  relMeta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  empty: { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center', paddingVertical: theme.spacing[6] },
});
