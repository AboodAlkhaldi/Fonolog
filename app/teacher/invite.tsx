import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Input, Button } from '@/components';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

export default function InviteStudent() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('invite_student', { p_email: email.trim().toLowerCase() });
    setSubmitting(false);

    if (error) { Alert.alert('Hata', error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.status === 'accepted') {
      Alert.alert('Başarılı', row.message ?? 'Öğrenci eklendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Eklenemedi', row?.message ?? 'Beklenmeyen hata.');
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <Text style={styles.title}>Öğrenci Ekle</Text>
      <Text style={styles.subtitle}>
        Öğrencinin uygulamada kayıtlı olduğu e-posta adresini gir. Henüz kayıtlı değilse,
        önce kendisinin uygulamaya kayıt olması gerekir.
      </Text>

      <Input
        label="Öğrenci e-posta"
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.feedback.infoText} />
        <Text style={styles.noteText}>
          Deneme sürecinde sadece 1 öğrenci ekleyebilirsin. Aboneliğe geçince sınır yok.
        </Text>
      </View>

      <Button
        label="Öğrenciyi Ekle"
        variant="cta"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={onInvite}
        style={{ marginTop: theme.spacing[4] }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginBottom: theme.spacing[5] },
  note: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.colors.feedback.infoSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginTop: theme.spacing[2], gap: theme.spacing[2],
  },
  noteText: { ...theme.typography.bodySmall, color: theme.colors.feedback.infoText, flex: 1 },
});
