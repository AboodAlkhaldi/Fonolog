/**
 * Turkish UI strings for Okuma Dedektifi.
 *
 * Naming: nested by feature → screen → element.
 * Variables: {{name}} interpolation via i18n-js.
 *
 * STYLE GUIDE for translations:
 *   - Address children with informal "sen" form ("Hadi başlayalım!")
 *   - Address parents with polite "siz" form on settings/billing screens ("Aboneliğinizi yönetin")
 *   - Use ş, ç, ğ, ı, İ, ö, ü properly — never substitute with ASCII
 *   - Action buttons are imperative verbs ("Başla", "Kaydet", "Devam et")
 */

const tr = {
  // ─── App-level ─────────────────────────────────────
  app: {
    name:         'Okuma Dedektifi',
    tagline:      'Türkçe okumayı keşfet!',
    loading:      'Yükleniyor...',
    error:        'Bir şeyler ters gitti.',
    retry:        'Tekrar dene',
    cancel:       'Vazgeç',
    save:         'Kaydet',
    continue:     'Devam et',
    back:         'Geri',
    close:        'Kapat',
    done:         'Tamam',
    skip:         'Atla',
    next:         'İleri',
    yes:          'Evet',
    no:           'Hayır',
    ok:           'Tamam',
  },

  // ─── Auth ──────────────────────────────────────────
  auth: {
    welcome: {
      title:        'Okuma Dedektifi\'ne Hoş Geldin!',
      subtitle:     'Çocuğunuz için Türkçe okuma maceraları.',
      signIn:       'Giriş yap',
      signUp:       'Hesap oluştur',
      orContinueAs: 'Devam et:',
    },
    register: {
      title:            'Hesap oluştur',
      subtitle:         'Çocuğunuzun okuma yolculuğunu başlatın.',
      parentName:       'Adınız',
      parentNamePh:     'örn. Ayşe Yılmaz',
      email:            'E-posta',
      emailPh:          'ornek@eposta.com',
      password:         'Şifre',
      passwordPh:       'En az 8 karakter',
      passwordConfirm:  'Şifre tekrar',
      passwordMismatch: 'Şifreler eşleşmiyor',
      submit:           'Hesabı oluştur',
      hasAccount:       'Zaten hesabınız var mı?',
      signIn:           'Giriş yap',
      terms:            'Kayıt olarak Hizmet Şartları ve Gizlilik Politikası\'nı kabul etmiş olursunuz.',
      errors: {
        invalidEmail:   'Geçerli bir e-posta giriniz.',
        passwordShort:  'Şifre en az 8 karakter olmalı.',
        emailTaken:     'Bu e-posta zaten kullanılıyor.',
        generic:        'Hesap oluşturulamadı. Lütfen tekrar deneyiniz.',
      },
    },
    login: {
      title:         'Giriş yap',
      subtitle:      'Tekrar hoş geldin!',
      email:         'E-posta',
      password:      'Şifre',
      submit:        'Giriş yap',
      forgot:        'Şifremi unuttum',
      noAccount:     'Hesabınız yok mu?',
      signUp:        'Hesap oluştur',
      errors: {
        wrongCredentials: 'E-posta veya şifre hatalı.',
        notVerified:      'E-postanızı henüz doğrulamadınız.',
        generic:          'Giriş yapılamadı. Lütfen tekrar deneyiniz.',
      },
    },
    verifyEmail: {
      title:           'E-postanızı doğrulayın',
      subtitle:        '{{email}} adresine bir doğrulama bağlantısı gönderdik.',
      checkInbox:      'Lütfen gelen kutunuzu kontrol edin (spam klasörünü de unutmayın).',
      resend:          'Tekrar gönder',
      resendSent:      'E-posta yeniden gönderildi!',
      resendCooldown:  '{{seconds}}s sonra tekrar gönderebilirsiniz',
      iVerified:       'Doğruladım, devam et',
      changeEmail:     'E-posta değiştir',
      stillNotReceived:'Hâlâ ulaşmadı mı?',
    },
    forgot: {
      title:    'Şifremi sıfırla',
      subtitle: 'Şifre sıfırlama bağlantısı için e-postanızı girin.',
      email:    'E-posta',
      submit:   'Bağlantıyı gönder',
      sent:     'Bağlantı gönderildi! E-postanızı kontrol edin.',
    },
  },

  // ─── Onboarding (after registration) ───────────────
  onboarding: {
    childAge: {
      title:    'Çocuğunuzun yaşı kaç?',
      subtitle: 'İçeriği yaşına uygun hale getireceğiz.',
      yearsOld: '{{age}} yaş',
      pick:     'Yaş seç',
    },
    childAvatar: {
      title:    'Bir avatar seç',
      subtitle: 'Çocuğun bu karakterle tanışacak.',
      randomize:'Rastgele',
    },
    welcome: {
      title:    'Hoş geldin, {{name}}!',
      subtitle: '7 günlük ücretsiz Pro deneme süresi başladı.',
      cta:      'Hadi başlayalım!',
      whatYouGet: {
        item1: 'Tüm 22 kategoride 393 Türkçe kelime',
        item2: '24 farklı eğitici oyun',
        item3: 'Karakter, XP ve seviye atlama',
      },
    },
  },

  // ─── Home / Tabs ───────────────────────────────────
  home: {
    welcomeBack:     'Hoş geldin, {{name}}!',
    todaysLesson:    'Bugünün dersi',
    keepGoing:       'Devam et',
    yourCharacter:   'Karakterin',
    progress:        'İlerleme',
    streak:          'Seri',
    streakDays:      '{{count}} gün',
    xp:              '{{count}} XP',
    level:           'Seviye {{level}}',
    trial: {
      banner:        'Pro deneme süresi: {{days}} gün kaldı',
      bannerLastDay: 'Pro deneme süresi bugün bitiyor!',
      cta:           'Yükselt',
    },
  },
  tabs: {
    home:      'Ana Sayfa',
    learn:     'Öğren',
    character: 'Karakter',
    profile:   'Profil',
  },
    // ─── Learn / Session ───────────────────────────────
  learn: {
    title:           'Öğren',
    chooseCategory:  'Bir oyun seç',
  },
  session: {
    loading:      'Soru hazırlanıyor...',
    error:        'Soru yüklenemedi.',
    correct:      'Doğru!',
    wrong:        'Yanlış',
    next:         'Devam',
    quit:         'Çık',
    quitConfirm:  'Oturumdan çıkmak istediğine emin misin? İlerlemen kaydedilmeyecek.',
  },
  results: {
    title:       'Tebrikler!',
    perfect:     'Mükemmel! Hepsi doğru! 🌟',
    great:       'Harika gidiyor! 🎉',
    keepGoing:   'Devam et, daha iyisini yapacaksın! 💪',
    score:       'Puan',
    duration:    '{{seconds}}s',
    playAgain:   'Tekrar Oyna',
    backToLearn: 'Öğrenmeye Dön',
  },
  profile: {
    title:        'Profil',
    accountInfo:  'Hesap Bilgileri',
    parent:       'Ebeveyn',
    child:        'Çocuk',
    subscription: 'Abonelik',
    settings:     'Ayarlar',
    signOut:      'Çıkış yap',
    signOutConfirm: 'Çıkmak istediğinize emin misiniz?',
  },

  // ─── Generic form errors ───────────────────────────
  forms: {
    required:   'Bu alan zorunludur.',
    invalid:    'Geçersiz değer.',
    tooShort:   'Çok kısa (en az {{min}} karakter).',
    tooLong:    'Çok uzun (en fazla {{max}} karakter).',
  },
};

export default tr;
export type Translations = typeof tr;
