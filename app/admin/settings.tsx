import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';

export default function AdminSettings() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const impersonating = useAuth((s) => s.impersonating);


  if (!profile) return null;

  const onSignOut = () => {
    if (impersonating) {
      Alert.alert(
        'Önizleme modundasın',
        'Buradan çıkış yapamazsın. Üstteki sarı bantta yer alan "Çık" tuşuna bas.',
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
      <Text style={styles.title}>Ayarlar</Text>

      <View style={styles.card}>
        <Text style={styles.label}>İsim</Text>
        <Text style={styles.value}>{profile.full_name}</Text>
        <Text style={styles.label}>E-posta</Text>
        <Text style={styles.value}>{profile.email}</Text>
        <Text style={styles.label}>Rol</Text>
        <Text style={styles.value}>Yönetici</Text>
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
  label: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
  value: { ...theme.typography.body, color: theme.colors.text.primary },
  signOut: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    padding: theme.spacing[3], marginTop: theme.spacing[4],
  },
  signOutText: { ...theme.typography.bodyMedium, color: theme.colors.feedback.errorText },
});
