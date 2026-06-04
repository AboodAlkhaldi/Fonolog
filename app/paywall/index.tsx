import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Loading } from '@/components';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/purchases';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { getAccessTier } from '@/lib/access-tier';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/contact';
import { theme } from '@/theme';
import { t } from '@/i18n';

/** True for an annual RC package (the only plan we sell now). */
function isYearly(pkg: any): boolean {
  const id = `${pkg?.product?.identifier ?? ''} ${pkg?.identifier ?? ''}`.toLowerCase();
  return pkg?.packageType === 'ANNUAL' || id.includes('year') || id.includes('annual') || id.includes('yearly');
}

const STUDENT_FEATURES = () => [
  // studentF3 (mic pronunciation exercises) removed — the mic service is gone.
  t('paywall.studentF1'), t('paywall.studentF2'),
  t('paywall.studentF4'), t('paywall.studentF5'), t('paywall.studentF6'),
];

export default function PaywallScreen() {
  const profile        = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);

  const [packages, setPackages] = useState<any[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Teacher subscriptions are disabled — only the student yearly plan is sold.
  // `home` is still role-aware so a teacher who somehow lands here is routed
  // back to their own area, but the paywall content is student-only.
  const home = profile?.role === 'teacher' ? '/teacher' : '/(tabs)';
  const features = STUDENT_FEATURES();
  const tier = getAccessTier(profile);
  const isPro = tier === 'subscribed';

  // If already subscribed, bounce out — don't show the paywall.
  useEffect(() => {
    if (isPro) {
      router.replace(home);
    }
  }, [isPro, home]);

  useEffect(() => {
    (async () => {
      try {
        // Student offering only. Defensively keep just the yearly package in
        // case a legacy monthly product is still attached to the offering in RC.
        const pkgs = await getOfferings('student');
        const yearly = pkgs.filter(isYearly);
        const usable = yearly.length > 0 ? yearly : pkgs;
        if (usable.length === 0) {
          setUnavailable(true);
        } else {
          setPackages(usable);
        }
      } catch (e) {
        console.warn('[paywall] offerings', e);
        setUnavailable(true);
      } finally {
        setPackages((p) => p ?? []);
      }
    })();
  }, []);

  const onBuy = async (pkg: any) => {
    setLoading(true);
    try {
      await purchasePackage(pkg);
      await refreshProfile();
      showAlert(t('paywall.successTitle'), t('paywall.successMsg'), [
        { text: t('app.ok'), onPress: () => router.replace(home) },
      ]);
    } catch (e: any) {
      if (!e?.userCancelled) showAlert(t('app.error_title'), e?.message ?? t('paywall.purchaseFail'));
    } finally {
      setLoading(false);
    }
  };

  const onRestore = async () => {
    setLoading(true);
    try {
      await restorePurchases();
      await refreshProfile();
      showAlert(t('paywall.restoreTitle'), t('paywall.restoreMsg'));
    } catch (e: any) {
      showAlert(t('app.error_title'), e?.message ?? t('paywall.restoreFail'));
    } finally {
      setLoading(false);
    }
  };

  if (packages === null) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
        <Ionicons name="close" size={28} color={theme.colors.text.muted} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.title}>{t('paywall.titleStudent')}</Text>
        <Text style={styles.subtitle}>
          {t('paywall.subtitleStudent')}
        </Text>

        <View style={styles.features}>
          {features.map((f) => (
            <View key={f} style={styles.feature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.feedback.success} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {unavailable ? (
          <View style={styles.unavailableCard}>
            <Ionicons name="construct-outline" size={32} color={theme.colors.feedback.warningText} />
            <Text style={styles.unavailableTitle}>{t('paywall.unavailableTitle')}</Text>
            <Text style={styles.unavailableDesc}>{t('paywall.unavailableDesc')}</Text>
            <Pressable
              onPress={() => Linking.openURL(supportMailto('Abonelik')).catch(() => {})}
              style={styles.contactBtn}
            >
              <Ionicons name="mail-outline" size={18} color={theme.colors.text.primary} />
              <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {packages.map((pkg) => (
              <Pressable key={pkg.identifier} style={styles.pkg} onPress={() => onBuy(pkg)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgTitle}>{pkg.product.title}</Text>
                  <Text style={styles.pkgDesc}>{pkg.product.description}</Text>
                </View>
                <Text style={styles.pkgPrice}>{pkg.product.priceString}</Text>
              </Pressable>
            ))}
            <View style={styles.noAutoRenewCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.feedback.successText} />
              <Text style={styles.noAutoRenewText}>{t('paywall.noAutoRenewNote')}</Text>
            </View>
          </>
        )}

        {!unavailable && (
          <Button
            label={t('paywall.restoreBtn')}
            variant="ghost" size="md" fullWidth
            onPress={onRestore}
            loading={loading}
            style={{ marginTop: theme.spacing[4] }}
          />
        )}

        <Text style={styles.legal}>{t('paywall.legal')}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { width: 44, height: 44, justifyContent: 'center', alignSelf: 'flex-end' },
  emoji: { fontSize: 80, textAlign: 'center', marginVertical: theme.spacing[3] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, textAlign: 'center' },
  subtitle: { ...theme.typography.bodyLarge, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing[2], paddingHorizontal: theme.spacing[3] },
  features: { marginVertical: theme.spacing[5] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  featureText: { ...theme.typography.body, color: theme.colors.text.primary },
  pkg: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    borderWidth: 2, borderColor: theme.colors.border.subtle,
    ...theme.shadow.sm,
  },
  pkgTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  pkgDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  pkgPrice: { ...theme.typography.h3, color: theme.colors.brand.secondaryHover },
  unavailableCard: {
    backgroundColor: theme.colors.feedback.warningSubtle,
    padding: theme.spacing[5],
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  unavailableTitle: { ...theme.typography.h2, color: theme.colors.feedback.warningText, marginTop: theme.spacing[2] },
  unavailableDesc: { ...theme.typography.body, color: theme.colors.text.primary, textAlign: 'center', marginTop: theme.spacing[2] },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing[4],
    paddingVertical:   theme.spacing[2],
    borderRadius: theme.radius.md,
    marginTop: theme.spacing[3],
  },
  contactText: { ...theme.typography.bodyMedium, color: theme.colors.text.primary },
  noAutoRenewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2],
    backgroundColor: theme.colors.feedback.successSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginTop: theme.spacing[2],
  },
  noAutoRenewText: {
    ...theme.typography.bodySmall, color: theme.colors.feedback.successText, flex: 1,
  },
  legal: { ...theme.typography.caption, color: theme.colors.text.muted, textAlign: 'center', marginTop: theme.spacing[4], paddingHorizontal: theme.spacing[3] },
});
