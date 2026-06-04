/**
 * Coupon (promosyon kodu) client helpers.
 *
 * Redemption goes through the `redeem-coupon` edge function, which calls the
 * atomic `redeem_coupon` DB function. The client never touches the coupons
 * table for redemption — all enforcement (case-sensitive match, once-per-user,
 * max_redemptions cap, "already Pro" block) is server-side.
 *
 * Admins DO read/write the `coupons` table directly (admin-only RLS) for the
 * management UI; `couponState` derives the badge shown next to each coupon.
 */
import { supabase } from './supabase';
import type { CouponRow, CouponState } from './database.types';

export type RedeemStatus =
  | 'success'
  | 'invalid'           // no such active coupon
  | 'used_up'           // max_redemptions reached
  | 'already_redeemed'  // this user already used THIS coupon
  | 'already_pro'       // user is currently Pro/trial
  | 'error';            // network / server error

export interface RedeemResult {
  ok:         boolean;
  status:     RedeemStatus;
  expiresAt?: string | null;
}

export async function redeemCoupon(code: string): Promise<RedeemResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, status: 'invalid' };

  const { data, error } = await supabase.functions.invoke('redeem-coupon', {
    body: { code: trimmed },
  });

  // invoke() only errors on a non-2xx response (auth/method/server). The
  // "soft" rejections (invalid/used_up/…) come back as 200 with ok:false.
  if (error) return { ok: false, status: 'error' };

  const status = (data?.status ?? 'error') as RedeemStatus;
  return { ok: Boolean(data?.ok), status, expiresAt: data?.expires_at ?? null };
}

/** Derive the admin-facing state badge for a coupon. */
export function couponState(
  c: Pick<CouponRow, 'is_active' | 'redeemed_count' | 'max_redemptions'>,
): CouponState {
  if (!c.is_active) return 'inactive';
  if (c.redeemed_count >= c.max_redemptions) return 'used_up';
  return 'valid';
}
