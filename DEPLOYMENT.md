# Fonolog Deployment Guide

Everything you need to do **outside the codebase** to ship the app.

The code is ready. This file covers manual configuration in:
- Supabase (SQL, edge functions, secrets, auth)
- RevenueCat (subscriptions, entitlements, webhooks)
- Google Play Console (Android products + service account)
- App Store Connect (iOS products + ASC API key)
- EAS (builds, secrets, submissions)

Follow the sections **in order**. Mark each step as you do it.

---

## 1. Supabase — final SQL + edge functions

### 1.1 Run the patch SQL
Open Supabase Dashboard → SQL Editor and run `supabase/migrations/PATCH_2026_signup_trigger.sql`. This sets up:
- The new-signup admin notification trigger (fires when a user picks their role)
- The auto-create `student_character` row trigger
- Backfills `student_character` rows for any existing students

If you haven't yet, also run the relevant sections of `RUN_ALL.sql`:
- §15 — `invite_student` function + one-teacher-per-student UNIQUE constraint
- §16 — `equip_item` function
- §17 — Notification trigger (same as the patch — pick whichever is more recent)
- §18 — `student_character` auto-create trigger

### 1.2 Enable pg_net (for admin email on new signup)
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Then uncomment the `net.http_post` block in the `notify_admins_new_signup()` function — replace `<PROJECT_REF>` with your actual Supabase project ref and `<CRON_SECRET>` with the value you'll set in step 1.4.

### 1.3 Deploy / redeploy edge functions
From your machine with the Supabase CLI installed:
```bash
supabase login
supabase link --project-ref <PROJECT_REF>

supabase functions deploy generate-pdf-report
supabase functions deploy send-push
supabase functions deploy check-overdue-assignments
supabase functions deploy expire-subscriptions
supabase functions deploy reconcile-subscriptions
supabase functions deploy revenuecat-webhook
supabase functions deploy validate-subscription
supabase functions deploy admin-signup-notify
```

### 1.4 Edge function secrets
Dashboard → Project Settings → Edge Functions → Secrets. Add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | From Resend dashboard (used for transactional emails) |
22222222| `REVENUECAT_WEBHOOK_SECRET` | A long random string you generate (e.g. `openssl rand -base64 32`). You'll also paste this into RevenueCat in step 3. |
| `CRON_SECRET` | A long random string (e.g. `openssl rand -base64 32`). Used by pg_cron jobs and the admin-signup trigger. |

### 1.5 Schedule pg_cron jobs
In SQL Editor (replace `<PROJECT_REF>` and `<CRON_SECRET>`):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily 03:00 UTC — downgrade expired subs + send 5-day warnings
SELECT cron.schedule(
  'expire-subscriptions',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-subscriptions',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <CRON_SECRET>'),
    body    := jsonb_build_object()
  );
  $$
);

-- Hourly — find homework that's been pending >24h and notify the teacher
SELECT cron.schedule(
  'check-overdue-assignments',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/check-overdue-assignments',
    headers := jsonb_build_object('Content-Type','application/json'),
    body    := jsonb_build_object()
  );
  $$
);

-- Daily 04:00 UTC — reconcile any missed RC webhooks
SELECT cron.schedule(
  'reconcile-subscriptions',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/reconcile-subscriptions',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <CRON_SECRET>'),
    body    := jsonb_build_object()
  );
  $$
);
```

### 1.6 Auth — Redirect URL whitelist
Dashboard → Authentication → URL Configuration → **Redirect URLs**, add:
- `okuma://**`

Without this, Supabase strips `okuma://reset-password` and `okuma://verified` from emails.

### 1.7 Auth — Email templates (optional but recommended)
Dashboard → Authentication → Email Templates. Update sender name to `Fonolog` and customize the verify / reset / magic-link templates. The "Confirm your email" button needs to point at `{{ .ConfirmationURL }}` — Supabase fills the redirect target in automatically once the URL whitelist is configured.

Use `fonologpro@gmail.com` as the **Sender** if you want Supabase's built-in mailer to match the rest of the system; otherwise rely on the Resend-backed edge functions which already use that address.

---

## 2. Google Play Console — Android products + service account

### 2.1 Create the app
1. Play Console → Create app
2. Package name: `com.villaakademia.fonolog` (matches `app.json`)
3. Default language: Türkçe
4. Free / paid: Free (in-app purchases handle revenue)
5. Fill out the basics (store listing, content rating, target audience — choose 5+ / educational)

### 2.2 Create in-app subscription products
Play Console → Monetize → Subscriptions → Create subscription.

Create these 4 products **exactly**:

| Product ID | Description | Billing period |
|-----------|-------------|----------------|
| `okuma_student_monthly` | Öğrenci Pro — Aylık | 1 month |
| `okuma_student_yearly`  | Öğrenci Pro — Yıllık | 1 year |
| `okuma_expert_monthly`  | Uzman Pro — Aylık | 1 month |
| `okuma_expert_yearly`   | Uzman Pro — Yıllık | 1 year |

Set prices per country (TRY for Turkey). Activate each. They will be in **Draft** until your first build is uploaded to a track; that's expected.

### 2.3 Create the Play API service account
You need this so RevenueCat (and `eas submit`) can interact with Play on your behalf.

1. Play Console → Setup → API access → Create new service account
2. Click through to Google Cloud Console, create a new service account
3. Grant role: **Service Account User**
4. Create a JSON key, download it
5. Back in Play Console: grant the account permissions for: **View financial data**, **Manage orders and subscriptions**, **View app information**
6. Save the JSON key as `google-play-service-account.json` in the project root (it's already gitignored via `*.json` not matching — but **double-check** with `git status` before committing anything).

> **Critical:** Add `google-play-service-account.json` to `.gitignore` if it's not already there. **Never commit this file.**

---

## 3. App Store Connect — iOS products + ASC API key

### 3.1 Create the app
1. App Store Connect → My Apps → +
2. Bundle ID: `com.villaakademia.fonolog`
3. Primary language: Turkish

### 3.2 Create in-app subscription products
ASC → Features → Subscriptions → Create subscription group "Fonolog Pro".

Create the same 4 products as Android with the **exact** product IDs:
- `okuma_student_monthly`, `okuma_student_yearly`
- `okuma_expert_monthly`, `okuma_expert_yearly`

Set localized names, descriptions, and pricing.

### 3.3 ASC API key (for `eas submit`)
1. ASC → Users and Access → Keys (under Integrations)
2. Generate a new key with Access: **App Manager**
3. Download the `.p8` file (you can only download it once!)
4. Save the **Key ID**, **Issuer ID**, and the `.p8` file path

### 3.4 App-Specific Shared Secret (for RevenueCat)
ASC → Apps → Fonolog → App Information → App-Specific Shared Secret → Generate. Save the value — RevenueCat needs it.

---

## 4. RevenueCat — entitlements, offerings, webhooks

### 4.1 Create the project
1. RevenueCat → Create new project → name "Fonolog"
2. Project Settings → Apps → +
   - **iOS**: bundle ID `com.villaakademia.fonolog`, upload the ASC API key (`.p8`, Key ID, Issuer ID), paste the App-Specific Shared Secret
   - **Android**: package name `com.villaakademia.fonolog`, upload `google-play-service-account.json`

### 4.2 Entitlements
Project → Entitlements → +, create two:
- `okuma_student`
- `okuma_expert`

### 4.3 Products
Project → Products → +, add all 4 product IDs. For each product, attach to the right entitlement:

| Product | Entitlement |
|---------|-------------|
| `okuma_student_monthly` | `okuma_student` |
| `okuma_student_yearly`  | `okuma_student` |
| `okuma_expert_monthly`  | `okuma_expert` |
| `okuma_expert_yearly`   | `okuma_expert` |

### 4.4 Offering
Project → Offerings → +
- Identifier: `default`
- Add 4 packages: `okuma_student_monthly`, `okuma_student_yearly`, `okuma_expert_monthly`, `okuma_expert_yearly` (one each)
- Mark this offering as **Current**

### 4.5 API keys → app env
Project → API Keys. Copy:
- **iOS public SDK key** → set as EAS secret `EXPO_PUBLIC_REVENUECAT_IOS`
- **Android public SDK key** → set as EAS secret `EXPO_PUBLIC_REVENUECAT_ANDROID`

### 4.6 Webhook
Project → Integrations → Webhooks → Add endpoint:
- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>` (same value you put in Supabase secrets in step 1.4)
- Events: all of them (initial purchase, renewal, cancellation, expiration, uncancellation, billing issue, etc.)

Test it with the **Send test event** button. You should see a `200 OK` and a notification row in the Supabase `notifications` table for any admin user.

---

## 5. EAS — build configuration

### 5.1 Install + login
```bash
npm install -g eas-cli
eas login
```

### 5.2 Link the project
The `projectId` is already in `app.json` (`ad191aaa-...`), so EAS knows what to talk to. If you ever need to re-link:
```bash
eas init
```

### 5.3 Set EAS secrets
These get injected into the build at compile time:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL          --value "https://<PROJECT_REF>.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY     --value "<YOUR_ANON_KEY>"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS        --value "<RC_IOS_KEY>"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID    --value "<RC_ANDROID_KEY>"

# Only needed for `eas submit`:
eas secret:create --scope project --name APPLE_ID     --value "your-apple-id@example.com"
eas secret:create --scope project --name ASC_APP_ID   --value "<numeric ASC app id>"
eas secret:create --scope project --name APPLE_TEAM_ID --value "<10-char team id>"
```

### 5.4 Configure credentials
```bash
eas credentials
```
Walk through both platforms. Let EAS:
- Generate / manage your Android keystore
- Manage iOS distribution certificates and provisioning profiles (uses the ASC API key)

### 5.5 First build
```bash
# Internal preview build for testing on your own devices
eas build --platform all --profile preview

# Production build (auto-increments build number)
eas build --platform all --profile production
```

The first build takes 15-30 minutes. When it's done you'll get a URL — install on your device and test the full flow end-to-end (signup → email verify deep link → role choice → onboarding → game → purchase a sub).

### 5.6 Submit to stores
```bash
# Android — uploads to Play Console internal testing track
eas submit --platform android --profile production

# iOS — uploads to App Store Connect for TestFlight / review
eas submit --platform ios --profile production
```

For Android, the first submission **must** be a manual upload to Play Console because Play won't activate the subscription products until at least one APK/AAB has been uploaded. Use the AAB from `eas build` for that.

---

## 6. Pre-submission checklist

Before pressing "Submit for Review" on either store:

- [ ] Test signup → email verify deep link → role choice on a real device
- [ ] Test password reset deep link from the email
- [ ] Test purchase flow with a sandbox account (iOS) and a test track license (Android)
- [ ] Verify the webhook fires and `profiles.subscription_status` updates correctly
- [ ] Verify admin receives email + in-app notification when a sandbox purchase fires
- [ ] Verify offline gameplay queues writes that drain when you reconnect
- [ ] Test homework: teacher assigns 1, 5, and 20 words — all variants should produce a sensible game
- [ ] Verify expired trial users get downgraded by the cron job (manually shift `subscription_expires` in DB to test)
- [ ] Privacy policy + terms URLs are reachable
- [ ] Store listing screenshots in TR (and EN if expanding) are uploaded
- [ ] Age rating completed (5+, educational)
- [ ] App data safety form (Android) and privacy nutrition labels (iOS) are filled out

---

## 7. Production runbook (after launch)

- **A user reports a missing subscription:** Run `validate-subscription` from the app's "Restore Purchases" flow. If that doesn't fix it, manually trigger `reconcile-subscriptions` from Supabase Edge Functions UI.
- **A webhook event was missed:** `reconcile-subscriptions` will catch it within 24h. To replay sooner, copy the raw event JSON from RevenueCat dashboard → Customer history and POST it to the webhook URL with the correct `Authorization` header.
- **An admin is overwhelmed by purchase emails:** Reduce volume in `revenuecat-webhook/index.ts` — gate the admin email behind `if (type === 'INITIAL_PURCHASE')` again.
- **Offline queue stuck:** It auto-clears items after 5 failed retries. To force a clear, expose `clearQueue()` from `offline-queue.ts` to a dev menu.

---

## 8. Where things live (cheat sheet)

| Concern | File / location |
|---------|-----------------|
| Modules + games | `src/domain/modules.registry.ts` |
| Game generators | `src/domain/generators/gen-*.ts` |
| Question screens | `src/components/session/*.tsx` |
| Session state | `src/store/session.ts` |
| Auth state | `src/store/auth.ts` |
| Day-based curriculum | `src/domain/day-curriculum.ts` |
| Offline cache | `src/lib/offline-cache.ts` |
| Offline queue | `src/lib/offline-queue.ts` |
| RevenueCat webhook | `supabase/edgeFunctions/revenuecat-webhook/index.ts` |
| Admin signup email | `supabase/edgeFunctions/admin-signup-notify/index.ts` |
| Push notifications | `supabase/edgeFunctions/send-push/index.ts` |
| All migrations | `supabase/migrations/RUN_ALL.sql` |
