import { isSelfServeBillingPlan, type BillingCycle } from '@/lib/billing/plans';
import {
  BillingHttpError,
  billingErrorResponse,
  findOrCreateCustomer,
  getAppOrigin,
  getBillingAdmin,
  getPriceId,
  getStripe,
  requireBillingUser,
} from '@/lib/billing/server';
import { checkRateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

export const runtime = 'nodejs';

function getCheckoutUrls(request: Request, returnPath: unknown) {
  const origin = getAppOrigin(request);
  let target = new URL('/', origin);
  if (typeof returnPath === 'string' && returnPath.startsWith('/') && !returnPath.startsWith('//')) {
    const candidate = new URL(returnPath, origin);
    if (candidate.origin === origin) target = candidate;
  }
  target.searchParams.delete('billing');
  const successUrl = new URL(target);
  successUrl.searchParams.set('billing', 'success');
  successUrl.searchParams.set('provider', 'stripe');
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  const cancelUrl = new URL(target);
  cancelUrl.searchParams.set('billing', 'canceled');
  return { successUrl: successUrl.toString(), cancelUrl: cancelUrl.toString() };
}

export async function POST(request: Request) {
  try {
    pruneRateLimitBuckets();
    const rateLimit = checkRateLimit(request, 'billing-card-checkout', 10, 60_000);
    if (!rateLimit.allowed) {
      throw new BillingHttpError(429, 'Quá nhiều yêu cầu tạo đơn thanh toán. Vui lòng thử lại sau.');
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 32_000) {
      throw new BillingHttpError(413, 'Nội dung yêu cầu vượt quá giới hạn cho phép.');
    }

    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => ({}));
    if (body?.cycle !== 'monthly' && body?.cycle !== 'yearly') {
      throw new BillingHttpError(400, 'Chu kỳ thanh toán không hợp lệ.');
    }
    const cycle: BillingCycle = body?.cycle === 'monthly' ? 'monthly' : 'yearly';
    if (!isSelfServeBillingPlan(body?.plan)) {
      throw new BillingHttpError(400, 'Gói thanh toán không hợp lệ.');
    }

    const { data: liveSubscription, error } = await getBillingAdmin()
      .from('billing_subscriptions')
      .select('provider,status')
      .eq('user_id', user.id)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete'])
      .maybeSingle();
    if (error) throw error;
    if (liveSubscription?.provider === 'payos' || liveSubscription?.provider === 'paypal') {
      throw new BillingHttpError(
        409,
        'Bạn đang có gói trả trước. Vui lòng gia hạn bằng cổng thanh toán hiện tại hoặc liên hệ hỗ trợ để chuyển cổng thanh toán.',
      );
    }
    if (liveSubscription?.provider === 'stripe') {
      throw new BillingHttpError(409, 'Bạn đã có gói thanh toán thẻ. Vui lòng quản lý gói trong Billing Portal.');
    }

    const customer = await findOrCreateCustomer(user);
    const { successUrl, cancelUrl } = getCheckoutUrls(request, body?.returnPath);
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price: getPriceId(body.plan, cycle), quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        supabase_user_id: user.id,
        plan: body.plan,
        billing_cycle: cycle,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: body.plan,
          billing_cycle: cycle,
        },
      },
    }, { idempotencyKey: `apexa-checkout-${user.id}-${body.plan}-${cycle}-${Math.floor(Date.now() / 300_000)}` });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return Response.json({ url: session.url }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
