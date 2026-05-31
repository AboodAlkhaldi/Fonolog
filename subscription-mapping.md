# Subscription plan naming — single source of truth

The plan name a user sees must be **identical** across three layers: RevenueCat,
the `profiles.subscription_status` column in Supabase, and the app UI. This file
is the canonical mapping. If you change a name in one place, change it in all of
them.

## Canonical plans

DB `subscription_status` has exactly four values: `free`, `trial`, `student`,
`expert`. These never change. Only the RC-side identifiers change between the
test stage and production — and the webhook resolves status by **keyword**
(`student` / `teacher`) plus a profile-role fallback, so both naming sets work
without code changes.

### Current — TEST STAGE (RC "Test Store")

| Role    | Turkish label   | RC entitlement | RC products                                     | RC offering | DB status |
| ------- | --------------- | -------------- | ----------------------------------------------- | ----------- | --------- |
| Student | **Öğrenci Pro** | `test_student` | `test_student_monthly`, `test_student_yearly`   | `student`   | `student` |
| Teacher | **Uzman Pro**   | `test_teacher` | `test_teacher_monthly`, `test_teacher_yearly`   | `teacher`   | `expert`  |
| Trial   | Pro Deneme      | —              | —                                               | —           | `trial`   |
| Free    | Ücretsiz        | —              | —                                               | —           | `free`    |

### Future — PRODUCTION (rename when deploying)

| Role    | Turkish label   | RC entitlement    | RC products                                         | RC offering | DB status |
| ------- | --------------- | ----------------- | --------------------------------------------------- | ----------- | --------- |
| Student | **Öğrenci Pro** | `fonolog_student` | `fonolog_student_monthly`, `fonolog_student_yearly` | `student`   | `student` |
| Teacher | **Uzman Pro**   | `fonolog_teacher` | `fonolog_teacher_monthly`, `fonolog_teacher_yearly` | `teacher`   | `expert`  |
| Trial   | Pro Deneme      | —                 | —                                                   | —           | `trial`   |
| Free    | Ücretsiz        | —                 | —                                                   | —           | `free`    |

> Keep the role keyword (`student` / `teacher`) in the product & entitlement IDs
> in production too. As long as it's there, `statusForPurchase()` maps it with no
> code change. If it's ever absent, the webhook falls back to the buyer's profile
> `role` so the conversion still happens.

> Note the role-word difference: the **teacher** role maps to the **`expert`**
> status and the **"Uzman Pro"** label. RC calls the entitlement `fonolog_teacher`
> but the DB status and UI both say expert / Uzman. That is intentional — just
> keep all three columns of the teacher row in sync.

`active` is a **legacy** status from before role-specific statuses existed. New
writes must use `student` / `expert`. Old rows still render as "Pro Aktif".

## Where each label lives

1. **App UI** — `src/lib/access-tier.ts › subscriptionLabel()`. Already canonical.
   Paywall titles in `src/i18n/tr.ts › paywall.titleStudent / titleTeacher`
   ("Öğrenci Pro" / "Uzman Pro"). Already canonical.
2. **DB plan display name** — `pricing_config.display_name` rows. Must read
   "Öğrenci Pro — Aylık/Yıllık" and "Uzman Pro — Aylık/Yıllık" (see DEPLOYMENT.md).
3. **RevenueCat dashboard** — each product's **display name / title** must match
   the table above. The paywall shows `pkg.product.title` directly from RC, so an
   off-brand title there leaks straight to users.

## What the edge functions MUST do (not in this repo)

These functions live in the deployed Supabase project, not in this codebase. To
make free/trial → Pro conversion land with the correct plan name:

- **`revenuecat-webhook`** — on `INITIAL_PURCHASE` / `RENEWAL` / `UNCANCELLATION`,
  set `profiles.subscription_status` from the **entitlement**, not a generic value:
  - entitlement `fonolog_student` → `subscription_status = 'student'`
  - entitlement `fonolog_teacher` → `subscription_status = 'expert'`
  - never write `active` for new purchases.
  On `EXPIRATION` / `CANCELLATION` → `subscription_status = 'free'`, clear
  `subscription_expires`.
- **`validate-subscription`** — apply the exact same entitlement → status mapping
  so the client-initiated reconcile agrees with the webhook.
- **`reconcile-subscriptions`** cron — same mapping; this is the daily safety net.

## How conversion works in the app (already correct, for reference)

1. `purchasePackage()` (`src/lib/purchases.ts`) runs the purchase, then
   `waitForWebhookAndRefresh()` polls `profiles.subscription_expires` until the
   webhook writes it, then calls `refreshProfile()`.
2. `refreshProfile()` re-fetches the **whole** profile row, so only
   `subscription_status` / `subscription_expires` change — XP, character, streaks
   and progress are untouched. Upgrading never wipes other data.
3. `diffPlanAndAlert()` (`src/store/auth.ts`) detects the free/trial → Pro flip
   and shows the "Pro üyeliğin başladı 🎉" popup.
4. `getAccessTier()` treats `active | student | expert` as `subscribed`, so
   gating opens immediately once the status lands.

The only way the plan name comes out wrong is if a layer above writes a
non-canonical value — fix it at the source using the table here.
