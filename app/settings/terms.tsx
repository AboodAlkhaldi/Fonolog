import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Yasal Bilgiler</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── Terms of Service ─── */}
        <Text style={styles.section}>Kullanım Koşulları</Text>
        <Text style={styles.updated}>Son güncelleme: [TARİH]</Text>

        <Text style={styles.body}>
          Bu uygulama ("Okuma Dedektifi") Villa Akademia tarafından sunulmaktadır.
          Uygulamayı kullanarak aşağıdaki koşulları kabul etmiş olursunuz.
        </Text>

        <Text style={styles.h3}>1. Hizmet Kapsamı</Text>
        <Text style={styles.body}>
          Okuma Dedektifi, çocukların Türkçe okuma becerilerini geliştirmeye yönelik
          eğitici bir mobil uygulamadır. Uygulama içeriği yalnızca eğitim amaçlıdır.
        </Text>

        <Text style={styles.h3}>2. Abonelik ve Ücretler</Text>
        <Text style={styles.body}>
          Ücretsiz plan belirli özelliklerle sınırlıdır. Pro abonelikler aylık veya
          yıllık olarak sunulmakta olup Google Play / App Store üzerinden yönetilir.
          Abonelikler, iptal edilmediği sürece otomatik olarak yenilenir.
        </Text>

        <Text style={styles.h3}>3. Hesap Kapatma</Text>
        <Text style={styles.body}>
          Hesabınızı istediğiniz zaman uygulama içinden kapatabilirsiniz. Hesap
          kapatıldığında verileriniz silinmez; aynı e-posta ile yeniden kayıt olarak
          hesabınıza devam edebilirsiniz.
        </Text>

        <Text style={styles.h3}>4. Kısıtlamalar</Text>
        <Text style={styles.body}>
          Uygulamayı ticari amaçla kopyalamak, dağıtmak veya tersine mühendislik
          uygulamak yasaktır.
        </Text>

        <View style={styles.divider} />

        {/* ─── Privacy Policy / KVKK ─── */}
        <Text style={styles.section}>Gizlilik Politikası ve KVKK</Text>
        <Text style={styles.updated}>Son güncelleme: [TARİH]</Text>

        <Text style={styles.body}>
          6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında
          kişisel verileriniz hakkında sizi bilgilendirmek isteriz.
        </Text>

        <Text style={styles.h3}>Veri Sorumlusu</Text>
        <Text style={styles.body}>
          Villa Akademia — [ADRES] — [E-POSTA]
        </Text>

        <Text style={styles.h3}>Toplanan Veriler</Text>
        <Text style={styles.body}>
          • Ad ve e-posta adresi{'\n'}
          • Çocuğun yaşı ve avatar tercihi{'\n'}
          • Uygulama içi ilerleme ve oturum verileri{'\n'}
          • Cihaz push bildirimi tokeni (bildirim için)
        </Text>

        <Text style={styles.h3}>İşleme Amaçları</Text>
        <Text style={styles.body}>
          Verileriniz; hesap yönetimi, kişiselleştirilmiş içerik sunumu,
          abonelik işlemleri ve yasal yükümlülüklerin yerine getirilmesi
          amacıyla işlenmektedir.
        </Text>

        <Text style={styles.h3}>Veri Güvenliği</Text>
        <Text style={styles.body}>
          Verileriniz Supabase altyapısında şifreli olarak depolanmaktadır.
          Üçüncü taraflarla satılmaz veya paylaşılmaz.
        </Text>

        <Text style={styles.h3}>Haklarınız</Text>
        <Text style={styles.body}>
          KVKK madde 11 kapsamında verilerinize erişim, düzeltme, silme ve
          işlemenin sınırlandırılmasını talep etme hakkına sahipsiniz.
          Talep için: [E-POSTA]
        </Text>

        <Text style={styles.h3}>Çerezler ve Analitik</Text>
        <Text style={styles.body}>
          Uygulama, hizmet kalitesini iyileştirmek amacıyla anonim kullanım
          istatistikleri toplayabilir.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.footerNote}>
          Bu metinler taslak niteliğinde olup yayın öncesinde hukuki danışmanınız
          tarafından gözden geçirilmesi tavsiye edilir.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: theme.colors.background.primary },
  header:  {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  back:    { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title:   { ...theme.typography.h3, color: theme.colors.text.primary },
  content: { paddingHorizontal: theme.spacing[5], paddingVertical: theme.spacing[4] },
  section: { ...theme.typography.h2, color: theme.colors.text.primary, marginTop: theme.spacing[2] },
  updated: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2, marginBottom: theme.spacing[3] },
  h3:      { ...theme.typography.h4, color: theme.colors.text.primary, marginTop: theme.spacing[4], marginBottom: theme.spacing[1] },
  body:    { ...theme.typography.body, color: theme.colors.text.secondary, lineHeight: 22 },
  divider: { height: 1, backgroundColor: theme.colors.border.subtle, marginVertical: theme.spacing[5] },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: theme.spacing[8],
  },
});
