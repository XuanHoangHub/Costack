export const BILLING_CYCLES = ['monthly', 'yearly'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const BILLING_PLANS = ['free', 'starter', 'pro', 'business', 'enterprise'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export const SELF_SERVE_PLANS = ['starter', 'pro', 'business'] as const;
export type SelfServeBillingPlan = (typeof SELF_SERVE_PLANS)[number];

// Public catalog defaults. The server can override each amount through the
// matching PAYOS_PRICE_* environment variable without exposing credentials.
export const PAYOS_DEFAULT_PRICES: Record<SelfServeBillingPlan, Record<BillingCycle, number>> = {
  starter: { monthly: 199_000, yearly: 1_790_000 },
  pro: { monthly: 379_000, yearly: 3_590_000 },
  business: { monthly: 699_000, yearly: 6_590_000 },
};

export const SUGGESTED_PRICES = PAYOS_DEFAULT_PRICES;

export function isSelfServeBillingPlan(value: unknown): value is SelfServeBillingPlan {
  return typeof value === 'string' && (SELF_SERVE_PLANS as readonly string[]).includes(value);
}

export function isPaidBillingPlan(value: unknown): value is Exclude<BillingPlan, 'free'> {
  return value === 'enterprise' || isSelfServeBillingPlan(value);
}
