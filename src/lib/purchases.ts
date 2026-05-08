/**
 * RevenueCat integration.
 *
 * Setup (RevenueCat dashboard):
 *   - Offering "default" containing packages:
 *       okuma_student_monthly  (₺79 TRY / month)
 *       okuma_student_yearly   (₺799 TRY / year)
 *       okuma_expert_monthly   (₺399 TRY / month)
 *       okuma_expert_yearly    (₺3399 TRY / year)
 *   - Entitlements: `okuma_student`, `okuma_expert`
 *   - Set EXPO_PUBLIC_REVENUECAT_IOS / ANDROID env vars
 */
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from '@/store/auth';

let initialized = false;

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
 * App-launch bootstrap: configure RevenueCat AND immediately sync entitlements
 * with the server. This catches:
 *   - subscriptions purchased on another device
 *   - subscriptions cancelled / expired since last app open
 *   - trial expiry
 */
export async function bootstrapPurchases(userId: string): Promise<void> {
  await initPurchases(userId);
  // Server is the source of truth — it queries RevenueCat directly with the secret key.
  // We sync to refresh `profiles.subscription_status` then refresh the auth profile.
  try {
    await syncSubscriptionToServer();
    await useAuth.getState().refreshProfile();
  } catch (e) {
    console.warn('[purchases] bootstrap sync failed', e);
  }
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  await syncSubscriptionToServer();
  await useAuth.getState().refreshProfile();
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const info = await Purchases.restorePurchases();
  await syncSubscriptionToServer();
  await useAuth.getState().refreshProfile();
  return info;
}

/**
 * Tell our backend to re-validate via the validate-subscription Edge Function.
 * Throws on non-2xx so callers can surface failures instead of silently bypassing.
 */
export async function syncSubscriptionToServer(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-subscription`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`validate-subscription failed (${res.status}): ${text}`);
  }
}
