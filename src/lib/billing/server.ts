import 'server-only';

import Stripe from 'stripe';
import { createClient, type User } from '@supabase/supabase-js';

export type BillingCycle = 'monthly' | 'yearly';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe billing is not configured.');
  return new Stripe(secretKey);
}

export function getBillingAdmin() {
  if (!supabaseUrl || !supabaseSecret) throw new Error('Server billing database access is not configured.');
  return createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function requireBillingUser(request: Request): Promise<{ user: User; accessToken: string }> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new BillingHttpError(401, 'Authentication required.');
  const accessToken = authorization.slice(7).trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) throw new Error('Supabase authentication is not configured.');

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) throw new BillingHttpError(401, 'Your session is invalid or expired.');
  return { user: data.user, accessToken };
}

export function getPriceId(cycle: BillingCycle) {
  const priceId = cycle === 'yearly' ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) throw new Error(`The ${cycle} Pro price is not configured.`);
  return priceId;
}

export function getAppOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_APP_URL must be configured in production.');
  return new URL(request.url).origin;
}

export class BillingHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function billingErrorResponse(error: unknown) {
  const status = error instanceof BillingHttpError ? error.status : 500;
  if (status >= 500) console.error('Billing server error:', error);
  const message = status >= 500
    ? 'Hệ thống thanh toán tạm thời chưa khả dụng. Vui lòng thử lại sau.'
    : error instanceof Error ? error.message : 'Billing request failed.';
  return Response.json({ error: message }, { status });
}

export async function findOrCreateCustomer(user: User) {
  const admin = getBillingAdmin();
  const stripe = getStripe();
  const { data: existing, error } = await admin
    .from('billing_customers')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (existing?.provider_customer_id) return existing.provider_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
    metadata: { supabase_user_id: user.id }
  }, { idempotencyKey: `apexa-customer-${user.id}` });
  const { error: insertError } = await admin.from('billing_customers').upsert({
    user_id: user.id,
    provider: 'stripe',
    provider_customer_id: customer.id,
    email: user.email
  }, { onConflict: 'user_id' });
  if (insertError) throw insertError;
  return customer.id;
}

export function unixToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}
