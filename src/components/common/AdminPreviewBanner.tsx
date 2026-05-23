import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/store/auth';
import { setAdminPreviewTier } from '@/lib/access-tier';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

/**
 * Shows at the top of the screen while admin/teacher is in preview mode.
 * - Admin / subscribed teacher: unlimited ("Sınırsız")
 * - Teacher on trial or free plan: 20 min/day cap; counts down minutes used
 */
export function AdminPreviewBanner() {
  const impersonating  = useAuth((s) => s.impersonating);
  const profile        = useAuth((s) => s.profile);
  const role           = profile?.role;
  const stop           = useAuth((s) => s.stopImpersonation);
  const insets         = useSafeAreaInsets();
  const [remaining, setRemaining] = useState<number | null>(null);

  // Read the user's REAL subscription status directly. Using getAccessTier()
  // here is a trap because we ourselves call setAdminPreviewTier('subscribed')
  // a few lines below to make the previewed content look like a paid student —
  // which would feed back into getAccessTier and make every teacher look
  // "subscribed" to this component, hiding the 20-min cap UI.
  const sub = profile?.subscription_status as string | null | undefined;
  const isPaidPlan = sub === 'active' || sub === 'student' || sub === 'expert';
  const isUnlimited = role === 'admin' || isPaidPlan;

  // Set the access tier override based on what's being previewed
  useEffect(() => {
    if (!impersonating) {
      setAdminPreviewTier(null);
      return;
    }
    setAdminPreviewTier('subscribed');
    return () => setAdminPreviewTier(null);
  }, [impersonating, role]);

  // For trial/free teachers only: tick once per minute, consume 1 min via RPC
  useEffect(() => {
    if (!impersonating || role !== 'teacher' || isUnlimited) return;
    let cancelled = false;

    const tick = async () => {
      const { data, error } = await supabase.rpc('consume_preview_minutes', { p_minutes: 1 });
      if (error) {
        console.warn('[preview] consume failed', error.message);
        return;
      }
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      const remainingMin = row?.remaining ?? 0;
      const allowed      = row?.allowed ?? true;
      setRemaining(remainingMin);
      if (!allowed) {
        showAlert(
          t('teacher.preview.limitReachedTitle'),
          t('teacher.preview.limitReachedMsg'),
          [{ text: t('app.ok'), onPress: handleExit }],
        );
      }
    };

    // initial tick + every 60s
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [impersonating, role, isUnlimited]);

  const handleExit = () => {
    stop();
    setAdminPreviewTier(null);
    if (role === 'admin') router.replace('/admin');
    else if (role === 'teacher') router.replace('/teacher');
  };

  if (!impersonating) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + theme.spacing[2] }]}>
      <Ionicons name="eye-outline" size={16} color={theme.colors.text.primary} />
      <Text style={styles.text}>
        Önizleme modu
        {isUnlimited
          ? ' · ♾ Sınırsız'
          : role === 'teacher' && remaining !== null
            ? ` · ⏱ 20 dk · ${remaining} dk kaldı`
            : role === 'teacher'
              ? ' · ⏱ 20 dk/gün'
              : ''}
      </Text>
      <Pressable onPress={handleExit} hitSlop={10} style={styles.exitBtn}>
        <Text style={styles.exitText}>Çık</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.feedback.warning,
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   theme.spacing[2],
    gap: theme.spacing[2],
  },
  text: {
    ...theme.typography.bodySmall,
    fontFamily: theme.typography.bodyMedium.fontFamily,
    color: theme.colors.text.primary,
    flex: 1,
  },
  exitBtn: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   4,
    backgroundColor: theme.colors.text.primary,
    borderRadius: theme.radius.sm,
  },
  exitText: {
    ...theme.typography.bodySmall,
    fontFamily: theme.typography.bodyMedium.fontFamily,
    color: theme.colors.background.primary,
  },
});
