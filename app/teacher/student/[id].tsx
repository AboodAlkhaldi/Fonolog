import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';

export default function TeacherStudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const impersonating = useAuth((s) => s.impersonating);
  const [profile,   setProfile]   = useState<any>(null);
  const [character, setCharacter] = useState<any>(null);
  const [sessions,  setSessions]  = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    // Preview mode — render placeholder data instead of fetching real student.
    if (impersonating === 'teacher') {
      setProfile({
        full_name: 'Öğrenci Adı',
        email: 'ornek@okumadedektifi.com',
        child_avatar_emoji: '🦁',
      });
      setCharacter({ level: 1, total_xp: 0, current_streak: 0 });
      setSessions([]);
      setTemplates([]);
      return;
    }
    const [p, c, s, t] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('student_character').select('*').eq('student_id', id).maybeSingle(),
      supabase.from('session_logs').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('notification_templates').select('*').eq('is_active', true).order('display_order'),
    ]);
    setProfile(p.data);
    setCharacter(c.data);
    setSessions(s.data ?? []);
    setTemplates(t.data ?? []);
  };

  useEffect(() => { load(); }, [id, impersonating]);

  const onUnlink = () => {
    Alert.alert('Öğrenciyi sil', 'Bu öğrenciyi listenden çıkarmak istediğinden emin misin? (Öğrencinin hesabı silinmeyecek.)', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('unlink_student', { p_student_id: id });
          if (error) { Alert.alert('Hata', error.message); return; }
          router.back();
        },
      },
    ]);
  };

  const onSendNotification = () => {
    if (templates.length === 0) { Alert.alert('Bilgi', 'Şablon yok.'); return; }
    Alert.alert(
      'Bildirim gönder',
      'Bir şablon seç:',
      [
        ...templates.map((tpl) => ({
          text: tpl.title,
          onPress: () => sendNotif(tpl),
        })),
        { text: 'Vazgeç', style: 'cancel' as const },
      ],
    );
  };

  const sendNotif = async (tpl: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: id,
        title:   tpl.title,
        body:    tpl.body,
      }),
    });
    if (res.ok) Alert.alert('Gönderildi', 'Bildirim öğrenciye iletildi.');
    else Alert.alert('Hata', await res.text());
  };

  const onAssignHomework = () => {
    router.push(`/teacher/assignments/new?studentId=${id}`);
  };

  const onGenerateReport = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ student_id: id }),
    });
    if (!res.ok) { Alert.alert('Hata', await res.text()); return; }
    const { html } = await res.json();
    // Use expo-print to render and share
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Tamam', `PDF oluşturuldu: ${uri}`);
      }
    } catch (e) {
      Alert.alert('Hata', 'PDF oluşturulurken hata: ' + (e instanceof Error ? e.message : ''));
    }
  };

  if (!profile) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
        ListEmptyComponent={<Text style={styles.empty}>Henüz oturum yok.</Text>}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.avatar}>{profile.child_avatar_emoji ?? '🦁'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{profile.full_name}</Text>
                <Text style={styles.meta}>{profile.email}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <Badge label={`Sv ${character?.level ?? 1}`} variant="info" />
                  <Badge label={`${character?.total_xp ?? 0} XP`} variant="success" />
                  <Badge label={`🔥 ${character?.current_streak ?? 0}`} variant="warning" />
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <ActionBtn icon="clipboard-outline"   label="Ödev Ver"        onPress={onAssignHomework} />
              <ActionBtn icon="chatbubble-outline"  label="Bildirim Gönder" onPress={onSendNotification} />
              <ActionBtn icon="document-outline"    label="PDF Rapor"       onPress={onGenerateReport} />
              <ActionBtn icon="trash-outline"       label="Sil"             onPress={onUnlink} danger />
            </View>

            <Text style={styles.sectionTitle}>Son Oturumlar</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionMod}>{item.module_id}</Text>
            <Text style={styles.sessionMeta}>
              {item.questions_correct}/{item.questions_total} · {item.xp_earned} XP
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

function ActionBtn({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, danger && styles.actionDanger]}
    >
      <Ionicons name={icon} size={22} color={danger ? theme.colors.feedback.errorText : theme.colors.text.primary} />
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[3] },
  avatar: { fontSize: 56 },
  name: { ...theme.typography.h2, color: theme.colors.text.primary },
  meta: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginVertical: theme.spacing[3] },
  action: {
    flex: 1, minWidth: '47%',
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
  },
  actionDanger: { backgroundColor: theme.colors.feedback.errorSubtle },
  actionLabel: { ...theme.typography.bodyMedium, color: theme.colors.text.primary },
  actionLabelDanger: { color: theme.colors.feedback.errorText },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginVertical: theme.spacing[2] },
  sessionCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  sessionMod: { ...theme.typography.bodyLarge, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
  sessionMeta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  empty: { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center', paddingVertical: theme.spacing[6] },
});
