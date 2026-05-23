/**
 * Pricing accessor — reads the `pricing_config` table.
 * Keep prices in DB so they can be changed by SQL without a new app release.
 *
 * Product IDs MUST match RevenueCat / App Store / Play Store identifiers:
 *   fonolog_student_monthly, fonolog_student_yearly,
 *   fonolog_teacher_monthly, fonolog_teacher_yearly
 */
import { supabase } from './supabase';

export interface PricingRow {
  product_id:   string;
  role:         'student' | 'teacher';
  period:       'monthly' | 'yearly';
  price:        number;
  currency:     string;
  display_name: string;
}

let cached: PricingRow[] | null = null;

export async function getPricing(): Promise<PricingRow[]> {
  if (cached) return cached;
  const { data } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .order('role')
    .order('period');
  cached = (data ?? []) as PricingRow[];
  return cached;
}

export function invalidatePricingCache(): void {
  cached = null;
}

export function formatPrice(p: PricingRow): string {
  if (p.currency === 'TRY') return `${p.price} ₺`;
  return `${p.price} ${p.currency}`;
}
