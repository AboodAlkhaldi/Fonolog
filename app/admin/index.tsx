import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading } from '@/components';
import { NotificationBell } from '@/components/common/NotificationBell';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  subscription_status: string;
  child_avatar_emoji: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [students, setStudents] = useState<UserRow[]>([]);
  const [teachers, setTeachers] = useState<UserRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading,    setLoading]    = useState(true);

  const load = async () => {
    const [s, t] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false }),
    ]);
    setStudents((s.data ?? []) as any);
    setTeachers((t.data ?? []) as any);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <Screen><Loading /></Screen>;

  // Use a single FlatList with sections via ListHeaderComponent and item type filtering.
  // We render two separate FlatLists in a parent FlatList header to avoid nested-list warnings.

  const renderSectionHeader = (title: string, count: number) => (
    <Text style={styles.sectionTitle}>{title} ({count})</Text>
  );

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Yönetim Paneli</Text>
        <NotificationBell />
      </View>
      <FlatList
        data={[]}
        renderItem={null}
        ListEmptyComponent={null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {renderSectionHeader('Öğrenciler', students.length)}
            {students.slice(0, 5).map((u) => <UserCard key={u.id} user={u} />)}
            {students.length > 5 && (
              <Pressable style={styles.seeAll} onPress={() => router.push('/admin/users-list?role=student')}>
                <Text style={styles.seeAllText}>Tümünü gör →</Text>
              </Pressable>
            )}

            <View style={{ height: theme.spacing[5] }} />

            {renderSectionHeader('Öğretmenler', teachers.length)}
            {teachers.slice(0, 5).map((u) => <UserCard key={u.id} user={u} />)}
            {teachers.length > 5 && (
              <Pressable style={styles.seeAll} onPress={() => router.push('/admin/users-list?role=teacher')}>
                <Text style={styles.seeAllText}>Tümünü gör →</Text>
              </Pressable>
            )}
            <View style={{ height: theme.spacing[8] }} />
          </View>
        }
      />
    </Screen>
  );
}

function UserCard({ user }: { user: UserRow }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/admin/user/${user.id}`)}
    >
      <Text style={styles.avatar}>{user.child_avatar_emoji ?? (user.role === 'teacher' ? '👩‍🏫' : '🦁')}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.meta}>{user.email}</Text>
      </View>
      <View style={[styles.subTag, user.subscription_status === 'trial' && styles.subTagTrial]}>
        <Text style={styles.subTagText}>{user.subscription_status}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[4] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, flex: 1 },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.text.primary, marginBottom: theme.spacing[2], marginTop: theme.spacing[2] },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  avatar: { fontSize: 32 },
  name: { ...theme.typography.bodyLarge, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
  meta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  subTag: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.feedback.successSubtle,
  },
  subTagTrial: { backgroundColor: theme.colors.feedback.warningSubtle },
  subTagText: { ...theme.typography.caption, color: theme.colors.text.primary },
  seeAll: {
    paddingVertical: theme.spacing[2],
    alignItems: 'center',
  },
  seeAllText: { ...theme.typography.bodyMedium, color: theme.colors.brand.secondaryHover },
});
