import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { Screen, Button, Loading, Badge } from '@/components';
import { useAuth } from '@/store/auth';
import { getAccessTier, trialDaysRemaining, subscriptionLabel } from '@/lib/access-tier';
import { differenceInCalendarDays } from 'date-fns';
import { getPricing, formatPrice, type PricingRow } from '@/lib/pricing';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/contact';
import { theme } from '@/theme';
import { t } from '@/i18n';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PlanDetails() {
  const profile = useAuth((s) => s.profile);
  const tier    = getAccessTier(profile);
  const trialDays = trialDaysRemaining(profile);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [info, prices] = await Promise.all([
          Purchases.getCustomerInfo().catch(() => null),
          getPricing().catch(() => []),
        ]);
        if (!alive) return;
        setCustomerInfo(info);
        setPricing(prices);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <Screen><Loading /></Screen>;

  const activeEntitlement =
    customerInfo?.entitlements.active['fonolog_teacher'] ??
    customerInfo?.entitlements.active['fonolog_student'] ??
    null;

  const productId = activeEntitlement?.productIdentifier ?? null;
  const planRow = pricing.find((p) => p.product_id === productId) ?? null;

  // DB is the only source of truth for expiry under the no-auto-renewal
  // model. Don't peek at RC's customerInfo cache here — it can lag and it
  // was the source of stale-date bugs we already fixed.
  const expiresIso = profile?.subscription_expires ?? null;

  const expiryDaysLeft = (() => {
    if (!expiresIso) return null;
    const days = differenceInCalendarDays(new Date(expiresIso), new Date());
    return days >= 0 && days <= 5 ? days : null;
  })();

  const statusLabel =
    tier === 'admin'
      ? t('planDetails.adminLabel')
      : subscriptionLabel(profile?.subscription_status);

  const statusVariant =
    tier === 'subscribed' ? 'success'
      : tier === 'trial'   ? 'warning'
      :                      'info';

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{t('planDetails.title')}</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[6] }}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('planDetails.currentPlan')}</Text>
            <Badge label={statusLabel} variant={statusVariant} />
          </View>
          {/* Plan NAME comes from the RC pricing row when available; when it
              isn't resolved yet we fall back to the DB-derived label (the same
              source as the badge above) so a paid user never sees a
              contradictory "Ücretsiz Plan". The price line below stays driven
              by RC pricing. */}
          <Text style={styles.value}>
            {planRow?.display_name ?? statusLabel}
          </Text>
          {planRow ? (
            <Text style={styles.metaLine}>{formatPrice(planRow)} / {planRow.period === 'monthly' ? t('planDetails.periodMonth') : t('planDetails.periodYear')}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          {/* Under the no-auto-renewal model `willRenew` from RC is always
              false; we always label this as the expiry date. */}
          <Text style={styles.label}>{t('planDetails.expiresLabel')}</Text>
          <Text style={styles.value}>{formatDate(expiresIso)}</Text>
          {trialDays !== null ? (
            <Text style={styles.metaLine}>{t('planDetails.trialRemaining', { days: trialDays })}</Text>
          ) : null}
        </View>

        {/* No-auto-renewal disclaimer — visible to subscribed users so they
            know they won't be silently charged again at period end. */}
        {tier === 'subscribed' ? (
          <View style={styles.noAutoRenewCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.feedback.successText} />
            <Text style={styles.noAutoRenewText}>{t('paywall.noAutoRenewNote')}</Text>
          </View>
        ) : null}

        {/* Expiry warning — shown when plan expires in ≤5 days. There's no
            auto-renew under the new model, so we always show it once the
            window is close. */}
        {expiryDaysLeft !== null && (
          <View style={styles.expiryWarning}>
            <Ionicons name="warning-outline" size={18} color={theme.colors.feedback.warningText} />
            <Text style={styles.expiryWarningText}>
              {expiryDaysLeft === 0
                ? t('planDetails.expiryToday')
                : t('planDetails.expirySoon', { days: expiryDaysLeft })}
            </Text>
          </View>
        )}

        {/* CTA: always show for trial/free (upgrade), and for subscribed users
            who are within 5 days of expiry (renew before lapse). Subscribed
            users far from expiry don't need a button — they're set. */}
        {(tier !== 'subscribed' || expiryDaysLeft !== null) ? (
          <Button
            label={
              tier === 'trial'           ? t('planDetails.upgradeTrial')
              : tier === 'subscribed'    ? t('paywall.renewBtn')
              : expiryDaysLeft !== null  ? t('planDetails.renewNow')
              :                            t('planDetails.upgradeFree')
            }
            variant="cta" size="lg" fullWidth
            onPress={() => router.push('/paywall')}
            style={{ marginTop: theme.spacing[3] }}
          />
        ) : null}

        <Text style={styles.section}>{t('planDetails.proTitle')}</Text>
        <View style={styles.featuresCard}>
          <Feature icon="game-controller-outline" text={t('planDetails.proF1')} />
          <Feature icon="document-text-outline"   text={t('planDetails.proF2')} />
          <Feature icon="people-outline"          text={t('planDetails.proF3')} />
          <Feature icon="mic-outline"             text={t('planDetails.proF4')} />
          <Feature icon="flame-outline"           text={t('planDetails.proF5')} />
        </View>

        <Text style={styles.section}>{t('planDetails.supportTitle')}</Text>
        <Pressable
          style={styles.supportCard}
          onPress={() => Linking.openURL(supportMailto('Destek')).catch(() => {})}
        >
          <Ionicons name="mail-outline" size={22} color={theme.colors.brand.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.value}>{t('planDetails.supportContact')}</Text>
            <Text style={styles.metaLine}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Feature({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={20} color={theme.colors.feedback.success} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
  label:    { ...theme.typography.caption, color: theme.colors.text.muted },
  value:    { ...theme.typography.h4, color: theme.colors.text.primary, marginTop: 2 },
  metaLine: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  section:  { ...theme.typography.h4, color: theme.colors.text.primary, marginVertical: theme.spacing[3] },
  featuresCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.lg,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], paddingVertical: 6 },
  featureText: { ...theme.typography.body, color: theme.colors.text.primary },
  supportCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.lg,
  },
  expiryWarning: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.feedback.warningSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginTop: theme.spacing[3],
  },
  expiryWarningText: {
    ...theme.typography.body,
    color: theme.colors.feedback.warningText,
    flex: 1,
  },
  noAutoRenewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2],
    backgroundColor: theme.colors.feedback.successSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[3],
  },
  noAutoRenewText: {
    ...theme.typography.bodySmall,
    color: theme.colors.feedback.successText,
    flex: 1,
  },
});
