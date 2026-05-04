import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile,  setProfile]  = useState<any>(null);
  const [character,setCharacter]= useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, c, s] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('student_character').select('*').eq('student_id', id).maybeSingle(),
        supabase.from('session_logs').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(20),
      ]);
      setProfile(p.data);
      setCharacter(c.data);
      setSessions(s.data ?? []);
    })();
  }, [id]);

  const generateReport = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf-report`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url: pdfUrl } = await res.json();
      Alert.alert('Rapor hazır', `PDF oluşturuldu:\n${pdfUrl}`);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Rapor oluşturulamadı');
    } finally {
      setGenerating(false);
    }
  };

  if (!profile) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.avatar}>{profile.child_avatar_emoji ?? '🦁'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{profile.full_name}</Text>
          <Text style={styles.meta}>{profile.email} · {profile.child_age} yaş</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <Badge label={`Sv ${character?.level ?? 1}`} variant="info" />
            <Badge label={`${character?.total_xp ?? 0} XP`} variant="success" />
            <Badge label={`🔥 ${character?.current_streak ?? 0}`} variant="warning" />
          </View>
        </View>
      </View>

      <Button
        label="PDF Rapor Oluştur"
        variant="primary"
        size="md"
        loading={generating}
        onPress={generateReport}
        style={{ marginVertical: theme.spacing[4] }}
      />

      <Text style={styles.sectionTitle}>Son oturumlar</Text>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={styles.session}>
            <Text style={styles.sessionModule}>{item.module_id}</Text>
            <Text style={styles.sessionMeta}>
              {item.questions_correct}/{item.questions_total} · {item.xp_earned} XP · {Math.round(item.duration_seconds/60)} dk
            </Text>
            <Text style={styles.sessionDate}>
              {new Date(item.created_at).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz oturum yok.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[3] },
  avatar: { fontSize: 64 },
  title: { ...theme.typography.h2, color: theme.colors.text.primary },
  meta: { ...theme.typography.body, color: theme.colors.text.muted, marginTop: 2 },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  session: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  sessionModule: { ...theme.typography.bodyLarge, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
  sessionMeta:   { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  sessionDate:   { ...theme.typography.caption, color: theme.colors.text.muted, position: 'absolute', right: 12, top: 12 },
  empty: { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center', paddingTop: theme.spacing[6] },
});
