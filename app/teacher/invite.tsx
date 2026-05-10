import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Input, Button } from '@/components';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function InviteStudent() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);

    // Pre-flight cap check (server-truth). Trial → 1 student.
    const { data: canLink } = await supabase.rpc('can_link_more_students');
    if (canLink === false) {
      setSubmitting(false);
      showAlert(
        t('teacher.invite.limitTitle'),
        t('teacher.invite.limitMsg'),
        [
          { text: t('app.cancel'), style: 'cancel' },
          { text: t('teacher.invite.upgradeBtn'), onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }

    const { data, error } = await supabase.rpc('invite_student', { p_email: email.trim().toLowerCase() });
    setSubmitting(false);

    if (error) { showAlert(t('app.error_title'), error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.status === 'accepted') {
      showAlert(t('app.ok'), row.message ?? t('teacher.invite.successMsg'), [
        { text: t('app.ok'), onPress: () => router.back() },
      ]);
    } else {
      showAlert(t('app.error_title'), row?.message ?? t('app.error'));
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <Text style={styles.title}>{t('teacher.invite.title')}</Text>
      <Text style={styles.subtitle}>{t('teacher.invite.description')}</Text>

      <Input
        label={t('teacher.invite.emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.feedback.infoText} />
        <Text style={styles.noteText}>{t('teacher.invite.trialNote')}</Text>
      </View>

      <Button
        label={t('teacher.invite.addBtn')}
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
