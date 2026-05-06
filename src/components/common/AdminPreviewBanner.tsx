import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/store/auth';
import { setAdminPreviewTier } from '@/lib/access-tier';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

/**
 * Shows at the top of the screen while admin/teacher is in preview mode.
 * - Admin: unlimited (just shows "Çıkış" button)
 * - Teacher (trial): 20 min/day cap; counts down minutes used
 */
export function AdminPreviewBanner() {
  const impersonating  = useAuth((s) => s.impersonating);
  const role           = useAuth((s) => s.profile?.role);
  const stop           = useAuth((s) => s.stopImpersonation);
  const insets         = useSafeAreaInsets();
  const [remaining, setRemaining] = useState<number | null>(null);

  // Set the access tier override based on what's being previewed
  useEffect(() => {
    if (!impersonating) {
      setAdminPreviewTier(null);
      return;
    }
    setAdminPreviewTier(role === 'admin' ? 'subscribed' : 'subscribed');
    return () => setAdminPreviewTier(null);
  }, [impersonating, role]);

  // For trial teachers: tick once per minute, consume 1 min via RPC
  useEffect(() => {
    if (!impersonating || role !== 'teacher') return;
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
        Alert.alert(
          'Süren doldu',
          'Bugünkü 20 dakikalık öğrenci görünümü süreni doldurdun. Yarın tekrar dene.',
          [{ text: 'Tamam', onPress: handleExit }],
        );
      }
    };

    // initial tick + every 60s
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [impersonating, role]);

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
        {role === 'teacher' && remaining !== null ? ` · ${remaining} dk kaldı` : ''}
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
