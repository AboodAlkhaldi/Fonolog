# Fonolog — Fonolojik Farkındalık Uygulaması

> Öğrenme güçlüğü, disleksi ve akıcı okuma sorunları yaşayan çocuklar için
> bir psikolog tarafından bilimsel temelli olarak hazırlanmış dijital destek aracı.

---

## Nedir?

**Fonolog**, Türkçe konuşan çocuklarda **fonolojik farkındalık**, **ses farkındalığı** ve **heceleme** becerilerini geliştirmeye yönelik bir mobil eğitim uygulamasıdır. Uygulama; disleksi, öğrenme güçlüğü ve akıcı okuma sorunları yaşayan öğrenciler için klinisyen rehberliğinde tasarlanmış, oyun tabanlı alıştırmalar sunar.

Her egzersiz, alanyazındaki araştırmalar temel alınarak oluşturulmuş ve çocukların kendi hızlarında ilerleyebileceği biçimde basamaklı bir müfredata yerleştirilmiştir.

---

## Kimler İçin?

| Hedef Kitle | Açıklama |
|-------------|----------|
| **Öğrenciler** | Okul öncesi ve ilkokul dönemindeki çocuklar; özellikle disleksi, fonem farkındalığı eksikliği veya heceleme güçlüğü yaşayanlar |
| **Öğretmenler / Uzmanlar** | Ödevler atayabilen, öğrenci gelişimini takip edebilen ve içerikleri önizleyebilen eğitimciler |
| **Aileler** | Çocuklarının ilerlemesini anlık bildirimler aracılığıyla takip eden ebeveynler |

---

## Özellikler

### Öğrenci Tarafı

- **7 Günlük Müfredat** — Her gün için farklı oyunlar; öğrenci günü tamamladıkça bir sonraki güne geçer.
- **Daima Açık Modüller** — Keşfet ve Kelime Tanıma oyunları her zaman oynanabilir.
- **Sesli Destekli Oyunlar** — Tüm kelimelere ait ses dosyaları uygulamaya entegre edilmiştir.
- **Bildirimler** — Ödev hatırlatmaları ve tamamlanma bilgilendirmeleri.
- **Çevrimdışı Destek** — Kelime verileri yerel önbellekte tutulur.

### Öğretmen Paneli

- Öğrenci ekleme ve yönetme
- Ödev oluşturma ve takibi (teslim tarihi, modül seçimi)
- Öğrenci seanslarının tamamlanma durumunu görüntüleme
- Öğrenci hesabını önizleme (impersonation modu — gerçek veri görülmez)
- Bildirim alma: öğrenci ödevi tamamladığında anında push bildirimi

### Yönetici Paneli

- Kelime ve kategori yönetimi (ekleme, düzenleme, pasif yapma)
- Kullanıcı yönetimi ve rol kontrolü
- Analitik paneli (aktif kullanıcı, oturum sayısı, kelime başarı oranları)
- Karakter / avatar yönetimi

---

## Oyun Modülleri (24 Modül)

Uygulama, farklı bilişsel becerileri hedefleyen 24 oyun içermektedir. Modüller dört ana kategoriye ayrılır:

### Hazırlık
| Modül | Açıklama |
|-------|----------|
| 👁️ Görsel Algı | Resimleri kategorilere göre grupla |
| 🔍 Keşfet! | Kelimeleri dinle, hece ve harf detaylarını incele |
| 🎯 Kelime Tanıma | Resmi gör, doğru kelimeyi seç |
| 🗂️ Kategorize Et | Bu kelime hangi gruba ait? |

### Harf ve Ses
| Modül | Açıklama |
|-------|----------|
| 🔤 Harf Avcısı | Kelime hangi harfle başlar? |
| 👂 Ses Ayrımı | Aynı sesle başlayan kelimeyi bul |

### Hece
| Modül | Açıklama |
|-------|----------|
| 🧩 Hece Birleştir | Heceleri sürükle ve birleştir |
| 🔢 Hece Sayar | Kaç hece var? |
| ✂️ Hecele! | Doğru hecelemeyi seç |
| 🔚 Son Hece | Kelimenin son hecesini bul |
| 📏 Uzun Kelime | Daha uzun kelimeyi seç |
| 🧠 Kelime Dizisi | Kelimeleri sırayla hatırla |
| 🎴 Sıralı Hatırla | Resimleri aynı sırayla hatırla |

### Fonem
| Modül | Açıklama |
|-------|----------|
| 🔡 Harf Birleştir | Harfleri düzenle, kelimeyi oluştur |
| 🎵 Uyak Bul | Uyaklı kelimeyi seç |
| 🎙️ İlk Ses | Kelimenin ilk sesini tanı |
| 🔚 Son Ses | Kelimenin son sesini tanı |
| 🔮 Tamamla | İlk heceden kelimeyi tamamla |
| ⬅️ Baştan Tamamla | Son heceden kelimeyi tamamla |
| 🎤 Uyak Üret | Uyaklı kelimeleri birlikte seç |
| ❌ Fonem Sil | İlk sesi çıkar, ne kalır? (klavye girişi) |
| ⬅️ İlk Hece Sil | İlk hecesiz ne kalır? (klavye girişi) |
| ➡️ Son Hece Sil | Son hecesiz ne kalır? (klavye girişi) |

### Akıcılık
| Modül | Açıklama |
|-------|----------|
| ⚡ Hız Testi | Resmi 5 saniye incele, sonra hızlıca adlandır |

---

## Abonelik Planları

| Plan | Özellikler |
|------|------------|
| **Ücretsiz** | Görsel Algı ve Kelime Tanıma oyunları |
| **Deneme (Trial)** | Tüm içerikler sınırlı süreyle (dakika bazlı) |
| **Pro (Sınırsız)** | Tüm 24 modül, tüm günler, sınırsız erişim |

---

## Teknik Bilgiler

| Bileşen | Teknoloji |
|---------|-----------|
| Mobil uygulama | React Native + Expo (iOS & Android) |
| Yönlendirme | Expo Router (dosya tabanlı) |
| Backend / Veritabanı | Supabase (PostgreSQL + Auth + Storage) |
| Edge Fonksiyonlar | Deno (Supabase Edge Functions) |
| Bildirimler | Expo Push Notifications |
| Abonelik | RevenueCat |
| Durum yönetimi | Zustand |
| i18n | Türkçe (genişletilebilir yapı) |

---

## Kurulum (Geliştirici)

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npx expo start

# iOS simülatör
npx expo run:ios

# Android emülatör / cihaz
npx expo run:android
```

`.env` dosyasında aşağıdaki değişkenlerin tanımlı olması gerekir:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=...
```

---

## Anahtar Kelimeler

`ses farkındalığı` · `fonoloji` · `fonolojik farkındalık` · `ses karıştırma` · `heceleme` · `heceleme hatası` · `disleksi` · `okuma güçlüğü` · `öğrenme güçlüğü` · `hece` · `fonem` · `erken okuma` · `çocuk eğitim uygulaması` · `Türkçe okuma` · `akıcı okuma`

---

## Yasal

Bu uygulama, Villa Akademi tarafından geliştirilmektedir. Kullanım koşulları ve gizlilik politikası uygulama içindeki **Ayarlar → Kullanım Koşulları** bölümünde yer almaktadır.

---

*Fonolog — Fonolojik Farkındalık Pro*
