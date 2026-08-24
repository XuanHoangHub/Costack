import { isSelfServeBillingPlan, type BillingCycle } from '@/lib/billing/plans';
import {
  createPayOSOrderCode,
  createPayOSPaymentLink,
  getPayOSPrice,
} from '@/lib/billing/payos';
import { BillingHttpError, billingErrorResponse, getAppOrigin, getBillingAdmin, requireBillingUser } from '@/lib/billing/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => ({}));
    const cycle: BillingCycle = body?.cycle === 'monthly' ? 'monthly' : 'yearly';
    if (!isSelfServeBillingPlan(body?.plan)) {
      throw new BillingHttpError(400, 'Gói thanh toán không hợp lệ.');
    }
    const plan = body.plan;
    const admin = getBillingAdmin();
    const { data: liveSubscription, error } = await admin
      .from('billing_subscriptions')
      .select('provider,status')
      .eq('user_id', user.id)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete'])
      .maybeSingle();
    if (error) throw error;
    if (liveSubscription?.provider === 'stripe') {
      throw new BillingHttpError(409, 'Bạn đang có gói Stripe. Hãy quản lý gói đó trong Billing Portal trước khi chuyển sang PayOS.');
    }

    const origin = getAppOrigin(request);
    const { data: reusable, error: reusableError } = await admin
      .from('billing_orders')
      .select('order_code,checkout_url')
      .eq('user_id', user.id)
      .eq('provider', 'payos')
      .eq('plan', plan)
      .eq('billing_cycle', cycle)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .not('checkout_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reusableError) throw reusableError;
    if (reusable?.checkout_url) {
      return Response.json(
        { url: reusable.checkout_url, orderCode: reusable.order_code, reused: true },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const amount = getPayOSPrice(plan, cycle);
    const orderCode = createPayOSOrderCode();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const description = `APX${String(orderCode).slice(-6)}`;
    const { error: orderError } = await admin.from('billing_orders').insert({
      user_id: user.id,
      provider: 'payos',
      order_code: orderCode,
      plan,
      billing_cycle: cycle,
      amount,
      currency: 'VND',
      status: 'pending',
      description,
      expires_at: expiresAt.toISOString(),
    });
    if (orderError) throw orderError;

    const input = {
      orderCode,
      amount,
      description,
      buyerName: user.user_metadata?.full_name || user.user_metadata?.name,
      buyerEmail: user.email,
      items: [{
        name: `Apexa ${plan} - ${cycle === 'yearly' ? '12 thang' : '1 thang'}`,
        quantity: 1,
        price: amount,
      }],
      returnUrl: `${origin}/?billing=success`,
      cancelUrl: `${origin}/?billing=canceled`,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
    };

    let paymentLink;
    try {
      paymentLink = await createPayOSPaymentLink(input);
    } catch (createError) {
      // Keep the order pending until expiry: a network timeout can happen after
      // PayOS accepted it, and a later signed webhook must still be recoverable.
      throw createError;
    }

    const { error: linkError } = await admin.from('billing_orders').update({
      payment_link_id: paymentLink.paymentLinkId,
      checkout_url: paymentLink.checkoutUrl,
      updated_at: new Date().toISOString(),
    }).eq('order_code', orderCode).eq('status', 'pending');
    if (linkError) throw linkError;

    return Response.json(
      { url: paymentLink.checkoutUrl, orderCode },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return billingErrorResponse(error);
  }
}
