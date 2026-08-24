import { SELF_SERVE_PLANS, type BillingCycle, type SelfServeBillingPlan } from '@/lib/billing/plans';
import { getPayOSPrice, isPayOSConfigured } from '@/lib/billing/payos';
import { billingErrorResponse } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';

function serializePrice(plan: SelfServeBillingPlan, cycle: BillingCycle) {
  return {
    plan,
    cycle,
    id: `payos:${plan}:${cycle}`,
    unit_amount: getPayOSPrice(plan, cycle),
    currency: 'vnd',
    interval: cycle === 'yearly' ? 'year' as const : 'month' as const,
    interval_count: 1,
  };
}

export async function GET() {
  try {
    const prices: Partial<Record<SelfServeBillingPlan, Partial<Record<BillingCycle, ReturnType<typeof serializePrice>>>>> = {};
    SELF_SERVE_PLANS.forEach((plan) => (['monthly', 'yearly'] as const).forEach((cycle) => {
      prices[plan] ??= {};
      prices[plan]![cycle] = serializePrice(plan, cycle);
    }));

    return Response.json(
      { configured: isPayOSConfigured(), provider: 'payos', prices },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return billingErrorResponse(error);
  }
}
