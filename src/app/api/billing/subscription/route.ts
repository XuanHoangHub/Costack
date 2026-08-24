import { getBillingAdmin, requireBillingUser } from '@/lib/billing/server';
import { createClient } from '@supabase/supabase-js';

const FREE_ENTITLEMENT = { plan: 'free', status: 'inactive', is_pro: false } as const;

async function readEntitlement(request: Request, reconcileMember: boolean) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return Response.json({ entitlement: FREE_ENTITLEMENT });
    }

    const { user, accessToken } = await requireBillingUser(request);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      return Response.json({ entitlement: FREE_ENTITLEMENT });
    }
    const client = createClient(
      supabaseUrl,
      publishableKey,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
    );
    const { data, error } = await client.from('current_user_entitlement').select('*').maybeSingle();
    if (error) {
      // If table/view doesn't exist yet, return safe free tier
      return Response.json({ entitlement: FREE_ENTITLEMENT });
    }
    const entitlement = data || FREE_ENTITLEMENT;
    if (reconcileMember) {
      const { error: memberError } = await getBillingAdmin()
        .from('members')
        .update({ is_premium: Boolean(entitlement.is_pro) })
        .eq('user_id', user.id);
      if (memberError) console.error('Unable to reconcile member entitlement:', memberError);
    }
    return Response.json({ entitlement }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    // Return safe free entitlement instead of failing with 500
    return Response.json({ entitlement: FREE_ENTITLEMENT });
  }
}

export function GET(request: Request) {
  return readEntitlement(request, false);
}

export function POST(request: Request) {
  return readEntitlement(request, true);
}
