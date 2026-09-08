import type { BillingCycle, SelfServeBillingPlan } from './plans';

// USD cents. Independent regional prices, not a live VND conversion.
export const PAYPAL_DEFAULT_PRICES: Record<SelfServeBillingPlan, Record<BillingCycle, number>> = {
  starter: { monthly: 900, yearly: 9_000 },
  pro: { monthly: 2_900, yearly: 29_000 },
  business: { monthly: 9_900, yearly: 99_000 },
};

export const PAYPAL_MERCHANT_EMAIL = 'hoang.benjamin.creative@gmail.com';

export function usdToCents(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,7}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
