/**
 * RevenueCat integration — no-auto-renewal model.
 *
 * Products are CONSUMABLE in-app products in Play Console (not subscriptions).
 * Each purchase grants a fixed window of Pro (30 or 365 days). We never
 * initiate a renewal; when the window ends, the user is downgraded by the
 * `expire-subscriptions` cron and must repurchase to extend.
 *
 * RevenueCat dashboard:
 *   - Entitlements: `fonolog_student`, `fonolog_teacher`
 *   - Offering "default" containing packages for each role/period.
 *   - Webhook → /functions/v1/revenuecat-webhook (see that file's header).
 *   - Set EXPO_PUBLIC_REVENUECAT_IOS / ANDROID env vars.
 *
 * Source of truth for status/expiry: `profiles` table, written exclusively
 * by the revenuecat-webhook. The client just triggers the purchase, waits
 * briefly for the webhook to land, then refreshes the local profile.
 */
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from '@/store/auth';

let initialized = false;

/**
 * RC's web SDK (used by Expo Go in browser mode) throws "not supported on web"
 * for `invalidateCustomerInfoCache`. We still want to call it on iOS / Android
 * so the next `getCustomerInfo` returns fresh entitlements; on web we skip.
 */
async function safeInvalidateCustomerInfoCache(): Promise<void> {
  if (Platform.OS === 'web') return;
  try { await Purchases.invalidateCustomerInfoCache(); } catch { /* ignore */ }
}

export async function initPurchases(userId: string): Promise<void> {
  if (initialized) {
    await Purchases.logIn(userId);
    return;
  }
  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID;
  if (!apiKey) {
    console.warn('[purchases] no API key — purchases disabled');
    return;
  }
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey, appUserID: userId });
  initialized = true;
}

/**
 * App-launch bootstrap: configure RevenueCat and re-pull the profile.
 *
 * DB is the source of truth: `profiles.subscription_status` and
 * `subscription_expires` are written exclusively by the revenuecat-webhook on
 * a successful purchase, and by the `expire-subscriptions` cron when a plan
 * lapses. We do NOT call out to RC here — the webhook already populated DB.
 */
export async function bootstrapPurchases(userId: string): Promise<void> {
  await initPurchases(userId);
  try {
    await useAuth.getState().refreshProfile();
  } catch (e) {
    console.warn('[purchases] profile refresh failed', e);
  }
}

export async function getOfferings(role?: 'student' | 'teacher'): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  if (role && offerings.all[role]) return offerings.all[role].availablePackages;
  return offerings.current?.availablePackages ?? [];
}

/**
 * Wait for the webhook to land in DB after a purchase, then refresh local
 * profile. Polls `profiles.subscription_expires` for up to ~6 seconds — the
 * webhook usually hits DB within ~1 second, but we give it slack for slow
 * networks / cold edge-function starts.
 */
async function waitForWebhookAndRefresh(): Promise<void> {
  const userId = useAuth.getState().user?.id;
  if (!userId) return;
  const before = useAuth.getState().profile?.subscription_expires ?? null;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const { data } = await supabase
      .from('profiles')
      .select('subscription_expires')
      .eq('id', userId)
      .maybeSingle();
    const next = (data as any)?.subscription_expires ?? null;
    // Webhook landed if the row now has a later (or first-ever) expiry.
    if (next && next !== before) break;
  }
  try {
    await useAuth.getState().refreshProfile();
  } catch (e) {
    console.warn('[purchases] profile refresh failed', e);
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  await safeInvalidateCustomerInfoCache();
  // Webhook owns the DB write. Wait briefly then refresh local profile.
  await waitForWebhookAndRefresh();
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const info = await Purchases.restorePurchases();
  await safeInvalidateCustomerInfoCache();
  await waitForWebhookAndRefresh();
  return info;
}
