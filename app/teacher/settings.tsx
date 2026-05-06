import React from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { withPreviewPlaceholders } from '@/lib/preview-profile';
import { theme } from '@/theme';
import { differenceInCalendarDays } from 'date-fns';

export default function TeacherSettings() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const profile       = withPreviewPlaceholders(realProfile, impersonating);
  const signOut = useAuth((s) => s.signOut);

  if (!profile) return null;

  const expires = profile.subscription_expires ? new Date(profile.subscription_expires) : null;
  const trialDays = expires && profile.subscription_status === 'trial'
    ? Math.max(0, differenceInCalendarDays(expires, new Date()))
    : null;

  const onSignOut = () => Alert.alert('Çıkış', 'Hesabından çıkmak istediğinden emin misin?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çıkış',  style: 'destructive', onPress: signOut },
  ]);

  return (
    <Screen>
      <Text style={styles.title}>Ayarlar</Text>

      {/* Profile card */}
      <View style={styles.card}>
        <Text style={styles.label}>İsim</Text>
        <Text style={styles.value}>{profile.full_name}</Text>
        <Text style={styles.label}>E-posta</Text>
        <Text style={styles.value}>{profile.email}</Text>
        {profile.school_name ? (<>
          <Text style={styles.label}>Kurum</Text>
          <Text style={styles.value}>{profile.school_name}</Text>
        </>) : null}
      </View>

      {/* Subscription */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Abonelik</Text>
          <Text style={styles.tag}>{profile.subscription_status}</Text>
        </View>
        {trialDays !== null ? (
          <Text style={styles.cardDesc}>
            Deneme süreci: {trialDays} gün kaldı
          </Text>
        ) : null}
        <Button
          label="Aboneliği Yükselt"
          variant="primary"
          size="md"
          fullWidth
          onPress={() => router.push('/paywall')}
          style={{ marginTop: theme.spacing[3] }}
        />
      </View>

      {/* Sign out */}
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
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  label: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
  value: { ...theme.typography.body, color: theme.colors.text.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    ...theme.typography.caption,
    color: theme.colors.feedback.successText,
    backgroundColor: theme.colors.feedback.successSubtle,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm,
  },
  signOut: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    padding: theme.spacing[3], marginTop: theme.spacing[4], alignSelf: 'flex-start',
  },
  signOutText: { ...theme.typography.bodyMedium, color: theme.colors.feedback.errorText },
});
