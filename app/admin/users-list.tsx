import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Input } from '@/components';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';
import { t } from '@/i18n';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  subscription_status: string;
  child_avatar_emoji: string | null;
}

/**
 * Full list of users for one role — opened by the "Tümünü gör" buttons on the
 * admin dashboard (which only shows the first 5 of each). Mirrors the dashboard
 * UserCard; tapping a row opens that user's detail screen.
 */
export default function AdminUsersList() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isTeacher = role === 'teacher';

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, subscription_status, child_avatar_emoji')
      .eq('role', isTeacher ? 'teacher' : 'student')
      .order('created_at', { ascending: false });
    setUsers((data ?? []) as UserRow[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [role]));

  const filtered = search
    ? users.filter((u) =>
        (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(search.toLowerCase()))
    : users;

  if (loading) return <Screen><Loading /></Screen>;

  const title = isTeacher ? t('admin.teachers') : t('admin.students');

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{title} ({users.length})</Text>
      </View>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('app.searchPh')}
      />

      <FlatList
        style={{ marginTop: theme.spacing[2] }}
        data={filtered}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/admin/user/${item.id}`)}>
            <Text style={styles.avatar}>{item.child_avatar_emoji ?? (item.role === 'teacher' ? '👩‍🏫' : '🦁')}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>{item.email}</Text>
            </View>
            <View style={[styles.subTag, item.subscription_status === 'trial' && styles.subTagTrial]}>
              <Text style={styles.subTagText}>{item.subscription_status}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3] },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, flex: 1 },
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
});
