import { BillingHttpError, billingErrorResponse, findOrCreateCustomer, getAppOrigin, getBillingAdmin, getPriceId, getStripe, requireBillingUser, type BillingCycle } from '@/lib/billing/server';

export async function POST(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => ({}));
    const cycle: BillingCycle = body?.cycle === 'monthly' ? 'monthly' : 'yearly';
    const admin = getBillingAdmin();
    const { data: liveSubscription, error } = await admin
      .from('billing_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete'])
      .maybeSingle();
    if (error) throw error;
    if (liveSubscription) throw new BillingHttpError(409, 'Bạn đã có hồ sơ đăng ký. Hãy mở Billing Portal để quản lý hoặc hoàn tất thanh toán.');

    const customer = await findOrCreateCustomer(user);
    const origin = getAppOrigin(request);
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price: getPriceId(cycle), quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true' },
      customer_update: { address: 'auto', name: 'auto' },
      success_url: `${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?billing=canceled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: 'pro', billing_cycle: cycle }
      },
      metadata: { supabase_user_id: user.id, plan: 'pro', billing_cycle: cycle }
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return Response.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
