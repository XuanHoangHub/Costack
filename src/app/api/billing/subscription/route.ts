import { billingErrorResponse, requireBillingUser } from '@/lib/billing/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { accessToken } = await requireBillingUser(request);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) throw new Error('Supabase authentication is not configured.');
    const client = createClient(
      supabaseUrl,
      publishableKey,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
    );
    const { data, error } = await client.from('current_user_entitlement').select('*').maybeSingle();
    if (error) throw error;
    return Response.json({ entitlement: data || { plan: 'free', status: 'inactive', is_pro: false } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
