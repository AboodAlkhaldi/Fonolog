# Supabase Auth email templates (paste into the dashboard)

These two emails are **not** in the codebase — Supabase sends them from its own
templates. Paste the HTML below into:

**Supabase Dashboard → Authentication → Email Templates**

Two tabs to update: **"Confirm signup"** and **"Reset Password"**.

The other code-sent emails (welcome, admin signup alert) live in
`supabase/edgeFunctions/` and are already branded — nothing to do there.

---

## 1) Confirm signup  (tab: "Confirm signup")

- This is the email-verification link. It keeps `{{ .ConfirmationURL }}`, which
  redirects to `fonolog://verified` and opens the app after verification.
- Make sure `fonolog://verified` is in **Auth → URL Configuration → Redirect URLs** (you confirmed it is).

**Subject:**

```
Fonolog hesabını doğrula
```

**Body (HTML source):**

```html
<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>Fonolog</title></head>
<body style="margin:0;padding:0;background:#FFF8E7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8E7;padding:24px 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;">
        <tr><td align="center" style="padding:8px 0 20px;">
          <span style="font-size:26px;font-weight:800;letter-spacing:0.5px;color:#2E2A24;">Fono<span style="color:#E0A92E;">log</span></span>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:32px 28px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:#2E2A24;">E-postanı doğrula 📬</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:23px;color:#5C5249;">
            Fonolog'a hoş geldin! Hesabını etkinleştirmek için aşağıdaki düğmeye dokun.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
            <tr><td align="center" style="background:#FFC857;border-radius:12px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#2E2A24;text-decoration:none;">E-postamı doğrula</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#9A8E80;">
            Düğme çalışmazsa bu bağlantıyı kullanabilirsin:
          </p>
          <p style="margin:0;font-size:12px;line-height:18px;color:#9A8E80;word-break:break-all;">
            <a href="{{ .ConfirmationURL }}" style="color:#E0A92E;">{{ .ConfirmationURL }}</a>
          </p>
        </td></tr>
        <tr><td align="center" style="padding:20px 16px;color:#9A8E80;font-size:12px;line-height:18px;">
          Bu hesabı sen oluşturmadıysan bu e-postayı yok sayabilirsin.<br/>
          Soruların için <a href="mailto:fonologpro@gmail.com" style="color:#9A8E80;">fonologpro@gmail.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
```

---

## 2) Reset Password  (tab: "Reset Password")

- This is the recovery email for the **OTP flow**. It shows the 6-digit
  `{{ .Token }}` code — **no link** (the app no longer opens reset links).
- The app enforces a 3-minute window; set **Auth → … → Email OTP Expiry** to a
  sane value (~10 min recommended). Note that this expiry is global and also
  applies to the signup-confirmation link, so don't set it as low as 3 min.

**Subject:**

```
Fonolog şifre sıfırlama kodun
```

**Body (HTML source):**

```html
<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>Fonolog</title></head>
<body style="margin:0;padding:0;background:#FFF8E7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8E7;padding:24px 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;">
        <tr><td align="center" style="padding:8px 0 20px;">
          <span style="font-size:26px;font-weight:800;letter-spacing:0.5px;color:#2E2A24;">Fono<span style="color:#E0A92E;">log</span></span>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:32px 28px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:#2E2A24;">Şifre sıfırlama kodun 🔐</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:23px;color:#5C5249;">
            Şifreni sıfırlamak için aşağıdaki kodu uygulamaya gir:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 22px;">
            <tr><td align="center" style="background:#FFF8E7;border:2px dashed #FFC857;border-radius:12px;padding:18px;">
              <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#2E2A24;">{{ .Token }}</span>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;line-height:20px;color:#9A8E80;">
            Bu kod kısa bir süre için geçerlidir. Süresi dolduysa uygulamadan yeni bir kod isteyebilirsin.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:20px 16px;color:#9A8E80;font-size:12px;line-height:18px;">
          Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin — şifren değişmez.<br/>
          Soruların için <a href="mailto:fonologpro@gmail.com" style="color:#9A8E80;">fonologpro@gmail.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
```
