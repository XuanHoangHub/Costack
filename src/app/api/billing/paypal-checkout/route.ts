import { createHash, randomUUID } from 'node:crypto';
import { isSelfServeBillingPlan, type BillingCycle } from '@/lib/billing/plans';
import { billingErrorResponse, BillingHttpError, getAppOrigin, getBillingAdmin, requireBillingUser } from '@/lib/billing/server';
import { getPayPalMerchantEmail, getPayPalPrice, isPayPalConfigured, paypalRequest, reconcilePayPalOrder, type LocalPayPalOrder, type PayPalOrder } from '@/lib/billing/paypal';
import { checkRateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  try {
    pruneRateLimitBuckets();
    const rateLimit = checkRateLimit(request, 'billing-paypal-checkout', 10, 60_000);
    if (!rateLimit.allowed) {
      throw new BillingHttpError(429, 'Quá nhiều yêu cầu tạo đơn PayPal. Vui lòng thử lại sau.');
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 32_000) {
      throw new BillingHttpError(413, 'Nội dung yêu cầu vượt quá giới hạn cho phép.');
    }

    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => null);
    if (!isSelfServeBillingPlan(body?.plan) || !['monthly', 'yearly'].includes(body?.cycle)) {
      throw new BillingHttpError(400, 'Gói hoặc chu kỳ thanh toán không hợp lệ.');
    }
    if (!isPayPalConfigured()) throw new BillingHttpError(503, 'PayPal chưa được cấu hình đầy đủ.');
    const plan = body.plan;
    const cycle = body.cycle as BillingCycle;
    const amount = getPayPalPrice(plan, cycle);
    const admin = getBillingAdmin();
    // Keep one active provider, and permit same-plan prepaid renewal only.
    const { data: subscriptions, error: subscriptionError } = await admin.from('billing_subscriptions')
      .select('provider,plan,status,current_period_end').eq('user_id', user.id)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete']);
    if (subscriptionError) throw subscriptionError;
    for (const subscription of subscriptions || []) {
      if (subscription.provider === 'stripe' || !subscription.current_period_end || Date.parse(subscription.current_period_end) > Date.now()) {
        if (subscription.provider !== 'paypal' || subscription.plan !== plan) {
          throw new BillingHttpError(409, 'Gói hiện tại vẫn còn hiệu lực. Vui lòng gia hạn cùng gói, hoặc liên hệ hỗ trợ để chuyển gói/cổng thanh toán.');
        }
      }
    }
    const merchantEmail = getPayPalMerchantEmail();
    const requestKey = createHash('sha256').update(`${user.id}:${plan}:${cycle}:${amount}:${merchantEmail}:${process.env.PAYPAL_ENVIRONMENT}:${Math.floor(Date.now() / 300_000)}`).digest('hex');
    const { error: insertError } = await admin.from('paypal_orders').upsert({
      id: randomUUID(), request_key: requestKey, user_id: user.id, plan, billing_cycle: cycle,
      amount, currency: 'USD', merchant_email: merchantEmail,
    }, { onConflict: 'request_key', ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data, error } = await admin.from('paypal_orders').select('*').eq('request_key', requestKey).single();
    if (error) throw error;
    const local = data as LocalPayPalOrder;
    if (local.status === 'paid') throw new BillingHttpError(409, 'Đơn này đã thanh toán. Vui lòng làm mới trạng thái gói.');
    if (local.checkout_url) return Response.json({ url: local.checkout_url }, { headers });
    const returnUrl = new URL('/billing/paypal/return', getAppOrigin(request));
    returnUrl.searchParams.set('order', local.id);
    const cancelUrl = new URL(returnUrl);
    cancelUrl.searchParams.set('cancelled', '1');
    const order = await paypalRequest<PayPalOrder>('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: local.id, custom_id: local.id, invoice_id: local.id,
        description: `Costack ${plan} - ${cycle} prepaid`, payee: { email_address: merchantEmail },
        amount: { currency_code: 'USD', value: (amount / 100).toFixed(2) },
      }],
      payment_source: { paypal: { experience_context: {
        brand_name: 'Costack', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
        return_url: returnUrl.toString(), cancel_url: cancelUrl.toString(),
      } } },
    }, local.id);
    const approval = order.links?.find(link => ['payer-action', 'approve'].includes(link.rel));
    const url = approval ? new URL(approval.href) : null;
    const expectedHost = process.env.PAYPAL_ENVIRONMENT === 'live' ? 'www.paypal.com' : 'www.sandbox.paypal.com';
    if (!order.id || !url || url.protocol !== 'https:' || url.hostname !== expectedHost || url.username || url.password || url.port) {
      throw new Error('PayPal approval URL is missing or invalid.');
    }
    const { error: saveError } = await admin.from('paypal_orders')
      .update({ provider_order_id: order.id, checkout_url: url.toString() }).eq('id', local.id);
    if (saveError) throw saveError;
    return Response.json({ url: url.toString() }, { headers });
  } catch (error) { return billingErrorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => null);
    if (typeof body?.orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.orderId)) {
      throw new BillingHttpError(400, 'Mã đơn không hợp lệ.');
    }
    const { data, error } = await getBillingAdmin().from('paypal_orders').select('*')
      .eq('id', body.orderId).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new BillingHttpError(404, 'Không tìm thấy đơn PayPal của bạn.');
    if (!data.provider_order_id) throw new BillingHttpError(409, 'Đơn PayPal chưa sẵn sàng.');
    // Never accept a provider order ID, amount, or paid status from the browser.
    return Response.json(await reconcilePayPalOrder(data, data.provider_order_id), { headers });
  } catch (error) { return billingErrorResponse(error); }
}
