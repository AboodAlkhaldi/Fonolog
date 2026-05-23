import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { getAccessTier } from '@/lib/access-tier';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function TeacherPreview() {
  const profile = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const startImpersonation = useAuth((s) => s.startImpersonation);

  const isAdminPreviewingTeacher = profile?.role === 'admin' && impersonating === 'teacher';
  const tier      = getAccessTier(profile as any);
  const isFree    = tier === 'free';
  const isTrial   = tier === 'trial';
  const isCapped  = isFree || isTrial; // free + trial share the 20m/day cap
  const isUnlimited = !isCapped;       // subscribed + admin

  // Capped teachers: read the day's remaining minutes BEFORE entering so we
  // can show an accurate warning and block entry when the cap is already hit.
  // consume_preview_minutes(0) is a safe read-only call (uses GREATEST(0, p)
  // and adds 0). Subscribed/admin returns 99999 → treat as unlimited.
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loadingCap, setLoadingCap] = useState(isCapped);

  useEffect(() => {
    if (!isCapped) { setLoadingCap(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('consume_preview_minutes', { p_minutes: 0 } as any);
        if (!alive) return;
        if (error) {
          console.warn('[preview] cap check failed', error.message);
          setRemaining(null);
        } else {
          const row = Array.isArray(data) ? data[0] : data;
          setRemaining(typeof row?.remaining === 'number' ? row.remaining : null);
        }
      } finally {
        if (alive) setLoadingCap(false);
      }
    })();
    return () => { alive = false; };
  }, [isCapped]);

  const capExhausted = isCapped && remaining !== null && remaining <= 0;

  const launch = () => {
    if (isAdminPreviewingTeacher) {
      showAlert(
        t('app.error_title'),
        t('teacher.preview.alreadyIn'),
      );
      return;
    }
    if (capExhausted) {
      showAlert(t('teacher.preview.limitReachedTitle'), t('teacher.preview.limitReachedMsg'));
      return;
    }
    showAlert(
      t('teacher.preview.confirmTitle'),
      isTrial ? t('teacher.preview.confirmTrial') : t('teacher.preview.confirmFull'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('teacher.preview.startConfirm'),
          onPress: () => {
            startImpersonation('student');
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  // Plan-aware warning shown under the Start button. Tells the teacher exactly
  // what their time budget is so the auto-exit at 20m isn't a surprise.
  function renderLimitWarning() {
    if (loadingCap) {
      return (
        <View style={styles.limitRow}>
          <ActivityIndicator size="small" color={theme.colors.text.muted} />
          <Text style={styles.limitText}>...</Text>
        </View>
      );
    }
    if (isUnlimited) {
      return (
        <View style={[styles.limitRow, styles.limitUnlimited]}>
          <Ionicons name="infinite" size={18} color={theme.colors.feedback.successText} />
          <Text style={[styles.limitText, { color: theme.colors.feedback.successText }]}>
            {t('teacher.preview.limitUnlimited')}
          </Text>
        </View>
      );
    }
    const min = remaining ?? 20;
    const msg = isTrial
      ? t('teacher.preview.limitTrialWarn', { remaining: min })
      : t('teacher.preview.limitFreeWarn',  { remaining: min });
    return (
      <View style={[styles.limitRow, capExhausted ? styles.limitExhausted : styles.limitCapped]}>
        <Ionicons
          name={capExhausted ? 'lock-closed' : 'timer-outline'}
          size={18}
          color={capExhausted ? theme.colors.feedback.errorText : theme.colors.feedback.warningText}
        />
        <Text style={[styles.limitText, { color: capExhausted ? theme.colors.feedback.errorText : theme.colors.feedback.warningText }]}>
          {capExhausted ? t('teacher.preview.limitReachedMsg') : msg}
        </Text>
      </View>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('teacher.preview.title')}</Text>
      <Text style={styles.subtitle}>{t('teacher.preview.subtitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🧒</Text>
        <Text style={styles.cardTitle}>{t('teacher.preview.cardTitle')}</Text>
        <Text style={styles.cardDesc}>
          {isTrial ? t('teacher.preview.cardDescTrial') : t('teacher.preview.cardDesc')}
        </Text>
        <Button
          label={t('teacher.preview.startBtn')}
          variant="cta"
          size="lg"
          fullWidth
          disabled={capExhausted}
          onPress={launch}
          style={{ marginTop: theme.spacing[4] }}
        />
        {renderLimitWarning()}
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.feedback.infoText} />
        <Text style={styles.noteText}>{t('teacher.preview.hint')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginBottom: theme.spacing[5] },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  cardEmoji: { fontSize: 64, marginBottom: theme.spacing[2] },
  cardTitle: { ...theme.typography.h2, color: theme.colors.text.primary },
  cardDesc:  { ...theme.typography.body, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing[2] },
  limitRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    marginTop: theme.spacing[3],
    alignSelf: 'stretch',
  },
  limitUnlimited: { backgroundColor: theme.colors.feedback.successSubtle },
  limitCapped:    { backgroundColor: theme.colors.feedback.warningSubtle },
  limitExhausted: { backgroundColor: theme.colors.feedback.errorSubtle },
  limitText:      { ...theme.typography.bodySmall, flex: 1 },
  note: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.colors.feedback.infoSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginTop: theme.spacing[4], gap: theme.spacing[2],
  },
  noteText: { ...theme.typography.bodySmall, color: theme.colors.feedback.infoText, flex: 1 },
});
