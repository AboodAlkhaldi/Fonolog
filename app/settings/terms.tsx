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
        <Text style={styles.updated}>Son güncelleme: 25/5/2026</Text>

        <Text style={styles.body}>
          Bu uygulama ("Fonolog") Fonolog tarafından sunulmaktadır.
          Uygulamayı kullanarak aşağıdaki koşulları kabul etmiş olursunuz.
        </Text>

        <Text style={styles.h3}>1. Hizmet Kapsamı</Text>
        <Text style={styles.body}>
          Fonolog, çocukların Türkçe okuma becerilerini geliştirmeye yönelik
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
        <Text style={styles.section}>Gizlilik Politikası ve KVKK Aydınlatma Metni</Text>
        <Text style={styles.updated}>Son güncelleme: 25/5/2026</Text>

        <Text style={styles.body}>
          6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel
          verilerinizin nasıl toplandığı, işlendiği ve korunduğu hakkında sizi
          bilgilendirmek isteriz.
        </Text>

        <Text style={styles.h3}>1. Veri Sorumlusu</Text>
        <Text style={styles.body}>
          Fonolog — Bursa — fonologpro@gmail.com
        </Text>

        <Text style={styles.h3}>2. Toplanan Kişisel Veriler</Text>
        <Text style={styles.body}>
          Kimlik ve İletişim:{'\n'}
          {'  '}• Ad soyad, e-posta adresi, şifre (şifreli/hash olarak saklanır){'\n\n'}
          Profil Verileri:{'\n'}
          {'  '}• Kullanıcı rolü (öğrenci / öğretmen){'\n'}
          {'  '}• Abonelik durumu ve bitiş tarihi{'\n'}
          {'  '}• Çocuk yaşı ve avatar tercihi (öğrenci profillerinde){'\n'}
          {'  '}• Okul adı, öğretmen yaşı, planlanan öğrenci sayısı (öğretmen profillerinde){'\n\n'}
          Eğitim ve Öğrenme Verileri:{'\n'}
          {'  '}• Kelime öğrenme ilerlemesi{'\n'}
          {'  '}• Oyun oturumu kayıtları (süre, doğruluk oranı, XP puanı){'\n'}
          {'  '}• Günlük/döngüsel tamamlanma, seri ve seviye verileri{'\n'}
          {'  '}• Ödev kayıtları, skorlar ve öğretmen notları{'\n\n'}
          Abonelik ve Ödeme Verileri:{'\n'}
          {'  '}• Abonelik türü, başlangıç ve bitiş tarihi{'\n'}
          {'  '}• Kart bilgisi uygulamada işlenmez; Google Play altyapısı tarafından yönetilir{'\n\n'}
          Teknik Veriler:{'\n'}
          {'  '}• Cihaz push bildirim tokeni, platform bilgisi (Android / iOS)
        </Text>

        <Text style={styles.h3}>3. İşleme Amaçları ve Hukuki Dayanakları</Text>
        <Text style={styles.body}>
          • Hesap oluşturma ve kimlik doğrulama — Sözleşmenin ifası{'\n'}
          • Yaşa ve role uygun içerik sunumu — Sözleşmenin ifası{'\n'}
          • Öğrenme gelişiminin takibi ve raporlanması — Sözleşmenin ifası{'\n'}
          • Abonelik ve ödeme yönetimi — Sözleşmenin ifası{'\n'}
          • Push bildirim gönderimi — Sözleşmenin ifası{'\n'}
          • Hizmet güvenliği ve kalitesinin iyileştirilmesi — Meşru menfaat
        </Text>

        <Text style={styles.h3}>4. Kişisel Verilerin Aktarılması</Text>
        <Text style={styles.body}>
          Verileriniz yalnızca hizmetin sunulması amacıyla ve gerekli minimum veriyle
          sınırlı olmak üzere aşağıdaki hizmet sağlayıcılarla paylaşılmaktadır:{'\n\n'}
          • Supabase Inc. (ABD) — Veritabanı ve kimlik doğrulama altyapısı{'\n'}
          • RevenueCat Inc. (ABD) — Abonelik yönetimi{'\n'}
          • Google LLC (ABD) — Google Play ödeme altyapısı{'\n'}
          • Resend Inc. (ABD) — E-posta gönderimi{'\n'}
          • Expo (ABD) — Push bildirim altyapısı{'\n\n'}
          Bu aktarımlar KVKK'nın 9. maddesi kapsamında ilgili tarafların standart
          sözleşme taahhütleri çerçevesinde gerçekleştirilmektedir. Verileriniz
          yukarıda sayılanlar dışında hiçbir üçüncü tarafla satılmaz veya paylaşılmaz.
        </Text>

        <Text style={styles.h3}>5. Saklama Süreleri</Text>
        <Text style={styles.body}>
          • Hesap ve profil verileri: Hesap aktif olduğu süre + 3 yıl{'\n'}
          • Öğrenme ve ilerleme verileri: Hesap aktif olduğu süre{'\n'}
          • Oturum kayıtları ve işlem logları: 2 yıl{'\n'}
          • Abonelik ve ödeme kayıtları: 10 yıl (Vergi Usul Kanunu gereği){'\n'}
          • E-posta iletişim kayıtları: 3 yıl{'\n\n'}
          Süreler dolduğunda verileriniz güvenli biçimde silinmekte veya anonim
          hâle getirilmektedir.
        </Text>

        <Text style={styles.h3}>6. Çocukların Kişisel Verileri</Text>
        <Text style={styles.body}>
          Fonolog, ilkokul çağındaki çocuklar için tasarlanmış bir eğitim
          uygulamasıdır. 13 yaş altı çocukların uygulamayı yalnızca ebeveyn/yasal
          temsilci gözetimi ve onayıyla kullanması gerekmektedir.{'\n\n'}
          Veli veya yasal temsilci olarak çocuğunuzun verilerinin düzeltilmesini
          veya silinmesini fonologpro@gmail.com adresine başvurarak talep
          edebilirsiniz. Uygulamamıza rıza olmaksızın kaydedilmiş bir çocuğun
          verisini fark ederseniz lütfen aynı adrese bildirin; söz konusu veriler
          en kısa sürede silinecektir.
        </Text>

        <Text style={styles.h3}>7. Güvenlik</Text>
        <Text style={styles.body}>
          • Tüm veriler TLS/SSL şifreli bağlantılar üzerinden iletilmektedir{'\n'}
          • Şifreler hiçbir zaman açık metin olarak saklanmaz (bcrypt){'\n'}
          • Row Level Security ile her kullanıcı yalnızca kendi verilerine erişebilir{'\n'}
          • Kart bilgileri uygulamamızda saklanmaz; Google Play tarafından işlenir{'\n'}
          • Push bildirim tokenleri yalnızca bildirim gönderimi amacıyla kullanılır
        </Text>

        <Text style={styles.h3}>8. E-posta İletişimi</Text>
        <Text style={styles.body}>
          Hizmetin sunulması kapsamında aşağıdaki işlemsel e-postalar gönderilebilir:{'\n'}
          • Hoş geldiniz e-postası (kayıt tamamlandığında){'\n'}
          • Şifre sıfırlama bağlantısı (talep üzerine){'\n'}
          • Abonelik başlangıcı, yenileme ve sona erme bildirimleri{'\n'}
          • Hesap silme onay bildirimi{'\n\n'}
          Bu e-postalar hizmetin zorunlu bir parçasıdır; abonelikten çıkma seçeneği
          bulunmamaktadır.
        </Text>

        <Text style={styles.h3}>9. Haklarınız (KVKK Madde 11)</Text>
        <Text style={styles.body}>
          KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:{'\n'}
          • Kişisel verilerinizin işlenip işlenmediğini öğrenme{'\n'}
          • İşlenen veriler hakkında bilgi talep etme{'\n'}
          • Verilerin işlenme amacını öğrenme{'\n'}
          • Aktarıldığı üçüncü kişileri bilme{'\n'}
          • Eksik veya yanlış verilerin düzeltilmesini isteme{'\n'}
          • Verilerin silinmesini veya yok edilmesini talep etme{'\n'}
          • Otomatik işleme sonuçlarına itiraz etme{'\n'}
          • Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme{'\n\n'}
          Başvuru için fonologpro@gmail.com adresine "KVKK Başvurusu" konuluyla
          e-posta gönderin. Talepler en geç 30 gün içinde yanıtlanır.
        </Text>

        <Text style={styles.h3}>10. Politika Değişiklikleri</Text>
        <Text style={styles.body}>
          Bu politika, mevzuat değişiklikleri veya uygulama güncellemeleri
          nedeniyle zaman zaman güncellenebilir. Önemli değişiklikler uygulama
          içi bildirim ve/veya e-posta ile duyurulacaktır.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.footerNote}>
          Her türlü soru ve başvuru için: fonologpro@gmail.com
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
