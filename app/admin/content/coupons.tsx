import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Button, Badge } from '@/components';
import { supabase } from '@/lib/supabase';
import { couponState } from '@/lib/coupons';
import type { CouponRow, CouponState } from '@/lib/database.types';
import { theme } from '@/theme';
import { t } from '@/i18n';

const STATE_META: Record<CouponState, { label: string; variant: 'success' | 'warning' | 'info' }> = {
  valid:    { label: 'coupon.stateValid',    variant: 'success' },
  used_up:  { label: 'coupon.stateUsedUp',   variant: 'warning' },
  inactive: { label: 'coupon.stateInactive', variant: 'info' },
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    // Admin RLS grants full access to the coupons table; derive state in TS.
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    setCoupons((data ?? []) as CouponRow[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{t('coupon.adminTitle')} ({coupons.length})</Text>
      </View>

      <Button
        label={t('coupon.newBtn')}
        variant="primary" size="md" fullWidth
        onPress={() => router.push('/admin/content/coupon/new' as any)}
      />

      <FlatList
        style={{ marginTop: theme.spacing[3] }}
        data={coupons}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const meta = STATE_META[couponState(item)];
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/admin/content/coupon/${item.id}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.meta}>
                  {t('coupon.usageLabel', { used: item.redeemed_count, max: item.max_redemptions })}
                  {'  ·  '}
                  {t('coupon.freeDaysLabel')}: {item.free_days}
                </Text>
              </View>
              <Badge label={t(meta.label)} variant={meta.variant} />
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3] },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  code: { ...theme.typography.h4, color: theme.colors.text.primary },
  meta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
});
