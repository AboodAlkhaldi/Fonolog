import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Loading } from '@/components';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/purchases';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';

const STUDENT_FEATURES = [
  '22 kategoride 393+ Türkçe kelime',
  '24 farklı eğitici oyun modülü',
  'Telaffuz egzersizleri (mikrofon ile)',
  'Karakter, XP, seviye ve seri sistemi',
  'PDF ilerleme raporu',
  'Reklamsız deneyim',
];

const TEACHER_FEATURES = [
  'Sınırsız öğrenci ekleyebilirsin',
  'Öğrencilerine özel ödevler ata',
  'Detaylı PDF raporları',
  'Öğrenci görünümü süresiz',
  'Bildirim gönder',
  'Tüm öğrenci özellikleri',
];

export default function PaywallScreen() {
  const profile        = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);

  const [packages, setPackages] = useState<any[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const isTeacher = profile?.role === 'teacher';
  const features = isTeacher ? TEACHER_FEATURES : STUDENT_FEATURES;

  useEffect(() => {
    (async () => {
      try {
        const pkgs = await getOfferings();
        if (pkgs.length === 0) {
          setUnavailable(true);
        } else {
          setPackages(pkgs);
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
      Alert.alert('Teşekkürler!', 'Pro üyeliğin başladı.');
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Hata', e?.message ?? 'Satın alma başarısız');
    } finally {
      setLoading(false);
    }
  };

  const onRestore = async () => {
    setLoading(true);
    try {
      await restorePurchases();
      await refreshProfile();
      Alert.alert('Tamamlandı', 'Satın almalar geri yüklendi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Geri yükleme başarısız');
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
        <Text style={styles.title}>{isTeacher ? 'Öğretmen Pro' : 'Pro Üyelik'}</Text>
        <Text style={styles.subtitle}>
          {isTeacher
            ? 'Öğrencilerine sınırsız erişim sağla.'
            : 'Tüm içeriği aç ve gelişimini hızlandır.'}
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
            <Text style={styles.unavailableTitle}>Yakında!</Text>
            <Text style={styles.unavailableDesc}>
              Şu anda satın alma sistemi hazırlanıyor. Aboneliğin için erkenden bilgi almak
              istersen, bize ulaş:
            </Text>
            <Pressable
              onPress={() => Linking.openURL('mailto:info@villaakademia.com?subject=Okuma%20Dedektifi%20Abonelik')}
              style={styles.contactBtn}
            >
              <Ionicons name="mail-outline" size={18} color={theme.colors.text.primary} />
              <Text style={styles.contactText}>info@villaakademia.com</Text>
            </Pressable>
          </View>
        ) : (
          packages.map((pkg) => (
            <Pressable key={pkg.identifier} style={styles.pkg} onPress={() => onBuy(pkg)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pkgTitle}>{pkg.product.title}</Text>
                <Text style={styles.pkgDesc}>{pkg.product.description}</Text>
              </View>
              <Text style={styles.pkgPrice}>{pkg.product.priceString}</Text>
            </Pressable>
          ))
        )}

        {!unavailable && (
          <Button
            label="Satın almaları geri yükle"
            variant="ghost" size="md" fullWidth
            onPress={onRestore}
            loading={loading}
            style={{ marginTop: theme.spacing[4] }}
          />
        )}

        <Text style={styles.legal}>
          Abonelik otomatik yenilenir. İstediğin zaman App Store / Play Store ayarlarından iptal edebilirsin.
        </Text>
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
  legal: { ...theme.typography.caption, color: theme.colors.text.muted, textAlign: 'center', marginTop: theme.spacing[4], paddingHorizontal: theme.spacing[3] },
});
