import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays } from 'date-fns';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { withPreviewPlaceholders } from '@/lib/preview-profile';
import { theme } from '@/theme';

export default function ProfileTab() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const profile       = withPreviewPlaceholders(realProfile, impersonating);
  const signOut = useAuth((s) => s.signOut);
  const [linkedTeachers, setLinkedTeachers] = useState<any[]>([]);

  useEffect(() => {
    // Skip linked-teacher fetch in preview — show empty placeholder section.
    if (!realProfile || impersonating) {
      setLinkedTeachers([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('teacher_students')
        .select('teacher:profiles!teacher_id(id,full_name,email,school_name)')
        .eq('student_id', realProfile.id);
      setLinkedTeachers((data ?? []).map((d: any) => d.teacher).filter(Boolean));
    })();
  }, [realProfile?.id, impersonating]);

  if (!profile) return null;

  const expires = profile.subscription_expires ? new Date(profile.subscription_expires) : null;
  const trialDays = expires && profile.subscription_status === 'trial'
    ? Math.max(0, differenceInCalendarDays(expires, new Date())) : null;

    const onSignOut = () => {
    if (impersonating) {
      Alert.alert(
        'Önizleme modundasın',
        'Buradan çıkış yapamazsın. Üstteki sarı bantta yer alan "Çık" tuşuna bastığında önizlemeden çıkacaksın.',
      );
      return;
    }
    Alert.alert('Çıkış', 'Hesabından çıkmak istediğinden emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış',  style: 'destructive', onPress: signOut },
    ]);
  };


  return (
    <Screen>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Çocuk</Text>
        <Text style={styles.value}>{profile.full_name}</Text>
        <Text style={styles.label}>Yaş</Text>
        <Text style={styles.value}>{profile.child_age ?? '-'}</Text>
        <Text style={styles.label}>E-posta</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>

      {/* Subscription */}
      <Pressable
        style={styles.card}
        onPress={() => router.push('/paywall')}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Abonelik</Text>
          <View style={[styles.tag, profile.subscription_status === 'trial' && styles.tagTrial]}>
            <Text style={styles.tagText}>{profile.subscription_status}</Text>
          </View>
        </View>
        {trialDays !== null ? (
          <Text style={styles.cardDesc}>Deneme süreci: {trialDays} gün kaldı · Detaylar →</Text>
        ) : profile.subscription_status === 'free' ? (
          <Text style={styles.cardDesc}>Ücretsiz plan · Yükselt →</Text>
        ) : (
          <Text style={styles.cardDesc}>Aktif · Detaylar →</Text>
        )}
      </Pressable>

      {/* Linked teachers */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Öğretmenim</Text>
        {linkedTeachers.length === 0 ? (
          <Text style={styles.cardDesc}>Henüz bir öğretmenle bağlantın yok.</Text>
        ) : (
          linkedTeachers.map((t) => (
            <View key={t.id} style={styles.teacherRow}>
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.brand.secondaryHover} />
              <View style={{ flex: 1 }}>
                <Text style={styles.teacherName}>{t.full_name}</Text>
                {t.school_name ? <Text style={styles.teacherMeta}>{t.school_name}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={onSignOut} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={22} color={theme.colors.feedback.errorText} />
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[4] },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  label: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
  value: { ...theme.typography.body, color: theme.colors.text.primary },
  tag: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.feedback.successSubtle,
  },
  tagTrial: { backgroundColor: theme.colors.feedback.warningSubtle },
  tagText: { ...theme.typography.caption, color: theme.colors.text.primary },
  teacherRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    paddingTop: theme.spacing[2],
  },
  teacherName: { ...theme.typography.body, color: theme.colors.text.primary },
  teacherMeta: { ...theme.typography.caption, color: theme.colors.text.muted },
  signOut: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    padding: theme.spacing[3], marginTop: theme.spacing[4],
  },
  signOutText: { ...theme.typography.bodyMedium, color: theme.colors.feedback.errorText },
});
