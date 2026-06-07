import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import type { CouponRow } from '@/lib/database.types';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function CouponEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const adminId = useAuth((s) => s.profile?.id ?? null);

  const [code, setCode]           = useState('');
  const [freeDays, setFreeDays]   = useState('30');
  const [maxUses, setMaxUses]     = useState('10');
  const [isActive, setIsActive]   = useState(true);
  const [redeemed, setRedeemed]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      if (!isNew && id) {
        const { data } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
        if (data) {
          const c = data as CouponRow;
          setCode(c.code);
          setFreeDays(String(c.free_days));
          setMaxUses(String(c.max_redemptions));
          setIsActive(c.is_active);
          setRedeemed(c.redeemed_count);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const onSubmit = async () => {
    // Store uppercase so the code is canonical; redemption matches
    // case-insensitively (redeem_coupon), so students can type any case.
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { showAlert(t('app.error_title'), t('coupon.codeRequired')); return; }

    const days = Math.max(1, parseInt(freeDays, 10) || 30);
    const max  = Math.max(1, parseInt(maxUses, 10) || 1);
    setSubmitting(true);

    const payload: any = {
      code: trimmed,           // canonical uppercase; redemption is case-insensitive
      free_days: days,
      max_redemptions: max,
      is_active: isActive,
    };
    if (isNew) payload.created_by = adminId;

    const result = isNew
      ? await supabase.from('coupons').insert(payload).select().single()
      : await supabase.from('coupons').update(payload).eq('id', id).select().single();

    if (result.error) { showAlert(t('app.error_title'), result.error.message); setSubmitting(false); return; }
    router.back();
  };

  const onDelete = () => showAlert(
    t('admin.content.deleteTitle'),
    t('coupon.deleteConfirm', { code }),
    [
      { text: t('app.cancel'), style: 'cancel' },
      { text: t('admin.content.deleteTitle'), style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (error) showAlert(t('app.error_title'), error.message);
        else router.back();
      }},
    ],
  );

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{isNew ? t('coupon.newTitle') : t('coupon.editTitle')}</Text>

      <ScrollView>
        <Input
          label={t('coupon.codeLabel')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          required
        />
        <Input
          label={t('coupon.freeDaysLabel')}
          value={freeDays}
          onChangeText={setFreeDays}
          keyboardType="number-pad"
        />
        <Input
          label={t('coupon.maxRedemptionsLabel')}
          value={maxUses}
          onChangeText={setMaxUses}
          keyboardType="number-pad"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('coupon.activeLabel')}</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: theme.colors.brand.primary, false: theme.colors.border.default }}
          />
        </View>

        {!isNew ? (
          <Text style={styles.usage}>{t('coupon.usageLabel', { used: redeemed, max: maxUses })}</Text>
        ) : null}

        <Button
          label={isNew ? t('admin.content.newSuffix') : t('app.save')}
          variant="cta" size="lg" fullWidth
          loading={submitting} onPress={onSubmit}
          style={{ marginTop: theme.spacing[5] }}
        />

        {!isNew ? (
          <Button
            label={t('admin.content.deleteTitle')}
            variant="ghost" size="md" fullWidth
            onPress={onDelete}
            style={{ marginTop: theme.spacing[3] }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[3],
  },
  switchLabel: { ...theme.typography.body, color: theme.colors.text.primary },
  usage: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
});
