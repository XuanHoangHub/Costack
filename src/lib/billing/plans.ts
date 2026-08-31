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

export type BillingCapability =
  | 'core_workspace'
  | 'calendar_gantt'
  | 'workspace_ai'
  | 'advanced_ai'
  | 'crm_erp_finance'
  | 'advanced_automation'
  | 'advanced_permissions'
  | 'api_webhooks'
  | 'priority_support';

export type PlanEntitlements = {
  maxSpaces: number | null;
  maxMembers: number | null;
  monthlyAiRequests: number;
  capabilities: readonly BillingCapability[];
};

/**
 * Canonical entitlement catalog shared by the API and client. `null` means
 * unlimited. Enforcement for spaces and seats is mirrored in the production
 * database migration; AI usage is checked server-side before using Apexa's key.
 */
export const PLAN_ENTITLEMENTS: Record<BillingPlan, PlanEntitlements> = {
  free: {
    maxSpaces: 5,
    maxMembers: 1,
    monthlyAiRequests: 0,
    capabilities: ['core_workspace'],
  },
  starter: {
    maxSpaces: null,
    maxMembers: 10,
    monthlyAiRequests: 150,
    capabilities: ['core_workspace', 'calendar_gantt', 'workspace_ai', 'advanced_ai'],
  },
  pro: {
    maxSpaces: null,
    maxMembers: 50,
    monthlyAiRequests: 2_000,
    capabilities: [
      'core_workspace',
      'calendar_gantt',
      'workspace_ai',
      'advanced_ai',
      'crm_erp_finance',
      'advanced_automation',
    ],
  },
  business: {
    maxSpaces: null,
    maxMembers: 250,
    monthlyAiRequests: 10_000,
    capabilities: [
      'core_workspace',
      'calendar_gantt',
      'workspace_ai',
      'advanced_ai',
      'crm_erp_finance',
      'advanced_automation',
      'advanced_permissions',
      'api_webhooks',
      'priority_support',
    ],
  },
  enterprise: {
    maxSpaces: null,
    maxMembers: null,
    monthlyAiRequests: 100_000,
    capabilities: [
      'core_workspace',
      'calendar_gantt',
      'workspace_ai',
      'advanced_ai',
      'crm_erp_finance',
      'advanced_automation',
      'advanced_permissions',
      'api_webhooks',
      'priority_support',
    ],
  },
};

export const BILLING_PLAN_RANK: Record<BillingPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

export function isBillingPlan(value: unknown): value is BillingPlan {
  return typeof value === 'string' && (BILLING_PLANS as readonly string[]).includes(value);
}

export function getPlanEntitlements(plan: unknown): PlanEntitlements {
  return PLAN_ENTITLEMENTS[isBillingPlan(plan) ? plan : 'free'];
}

export function isPlanAtLeast(plan: unknown, required: BillingPlan) {
  return BILLING_PLAN_RANK[isBillingPlan(plan) ? plan : 'free'] >= BILLING_PLAN_RANK[required];
}

export function hasPlanCapability(plan: unknown, capability: BillingCapability) {
  return getPlanEntitlements(plan).capabilities.includes(capability);
}

export function isSelfServeBillingPlan(value: unknown): value is SelfServeBillingPlan {
  return typeof value === 'string' && (SELF_SERVE_PLANS as readonly string[]).includes(value);
}

export function isPaidBillingPlan(value: unknown): value is Exclude<BillingPlan, 'free'> {
  return value === 'enterprise' || isSelfServeBillingPlan(value);
}
