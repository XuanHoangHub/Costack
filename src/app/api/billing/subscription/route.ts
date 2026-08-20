import { billingErrorResponse, requireBillingUser } from '@/lib/billing/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return Response.json({ entitlement: { plan: 'free', status: 'inactive', is_pro: false } });
    }

    const { accessToken } = await requireBillingUser(request);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      return Response.json({ entitlement: { plan: 'free', status: 'inactive', is_pro: false } });
    }
    const client = createClient(
      supabaseUrl,
      publishableKey,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
    );
    const { data, error } = await client.from('current_user_entitlement').select('*').maybeSingle();
    if (error) {
      // If table/view doesn't exist yet, return safe free tier
      return Response.json({ entitlement: { plan: 'free', status: 'inactive', is_pro: false } });
    }
    return Response.json({ entitlement: data || { plan: 'free', status: 'inactive', is_pro: false } });
  } catch (error) {
    // Return safe free entitlement instead of failing with 500
    return Response.json({ entitlement: { plan: 'free', status: 'inactive', is_pro: false } });
  }
}
