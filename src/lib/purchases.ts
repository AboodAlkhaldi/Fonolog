/**
 * RevenueCat integration.
 *
 * Setup:
 *   1. In RevenueCat dashboard, create offering "default" with packages:
 *      - okuma_student_monthly  ($monthly)
 *      - okuma_student_yearly   ($yearly)
 *      - okuma_expert_monthly
 *      - okuma_expert_yearly
 *   2. Create entitlements: `okuma_student`, `okuma_expert`
 *   3. Set EXPO_PUBLIC_REVENUECAT_IOS / ANDROID env vars
 */
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  await syncSubscriptionToServer();
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const info = await Purchases.restorePurchases();
  await syncSubscriptionToServer();
  return info;
}

/** Tell our backend to re-validate via the validate-subscription Edge Function. */
async function syncSubscriptionToServer(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-subscription`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}` },
  });
}
