import { billingErrorResponse, getBillingAdmin, requireBillingUser } from '@/lib/billing/server';
import { createClient } from '@supabase/supabase-js';
import { getPlanEntitlements, isBillingPlan } from '@/lib/billing/plans';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

const FREE_ENTITLEMENT = { plan: 'free', status: 'inactive', is_pro: false } as const;

function withCatalog(entitlement: Record<string, unknown> | typeof FREE_ENTITLEMENT) {
  const plan = isBillingPlan(entitlement.plan) ? entitlement.plan : 'free';
  const catalog = getPlanEntitlements(plan);
  return {
    ...entitlement,
    plan,
    limits: {
      maxSpaces: catalog.maxSpaces,
      maxMembers: catalog.maxMembers,
      monthlyAiRequests: catalog.monthlyAiRequests,
    },
    capabilities: [...catalog.capabilities],
  };
}

async function readEntitlement(request: Request, reconcileMember: boolean) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return Response.json({ entitlement: withCatalog(FREE_ENTITLEMENT) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const { user, accessToken } = await requireBillingUser(request);

    // Super Admins always receive full Enterprise entitlements
    if (isApexaSuperAdmin(user.id)) {
      const superAdminEntitlement = withCatalog({
        plan: 'enterprise',
        status: 'active',
        is_pro: true,
        billing_cycle: 'yearly',
        current_period_end: '2099-12-31T23:59:59Z',
      });
      if (reconcileMember) {
        try {
          await getBillingAdmin()
            .from('members')
            .update({ is_premium: true })
            .eq('user_id', user.id);
        } catch (err) {
          console.error('Unable to reconcile super admin member:', err);
        }
      }
      return Response.json({ entitlement: superAdminEntitlement }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      throw new Error('Billing authentication is not configured.');
    }
    const client = createClient(
      supabaseUrl,
      publishableKey,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
    );
    const { data, error } = await client.from('current_user_entitlement').select('*').maybeSingle();
    if (error) {
      // A failed read is not proof that the user lost their paid plan.
      throw error;
    }
    const entitlement = withCatalog(data || FREE_ENTITLEMENT);
    if (reconcileMember) {
      const { error: memberError } = await getBillingAdmin()
        .from('members')
        .update({ is_premium: Boolean('is_pro' in entitlement && entitlement.is_pro) })
        .eq('user_id', user.id);
      if (memberError) console.error('Unable to reconcile member entitlement:', memberError);
    }
    return Response.json({ entitlement }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}

export function GET(request: Request) {
  return readEntitlement(request, false);
}

export function POST(request: Request) {
  return readEntitlement(request, true);
}
