import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';
import { t } from '@/i18n';

interface Row {
  id: string;
  full_name: string;
  email: string;
  child_age: number | null;
  child_avatar_emoji: string | null;
  subscription_status: string;
}

export default function StudentsScreen() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email,child_age,child_avatar_emoji,subscription_status')
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  if (!rows) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{t('teacher.students.title', { count: rows.length })}</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/teacher/student/${item.id}` as any)}>
            <Text style={styles.avatar}>{item.child_avatar_emoji ?? '🦁'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>{item.email} · {item.child_age ? t('teacher.studentAge', { age: item.child_age }) : '-'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8, marginBottom: 8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  avatar: { fontSize: 36, marginRight: theme.spacing[3] },
  name: { ...theme.typography.h4, color: theme.colors.text.primary },
  meta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
});
