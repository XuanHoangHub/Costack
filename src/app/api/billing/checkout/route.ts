import { APIError } from '@payos/node';
import { BILLING_PLAN_RANK, isBillingPlan, isSelfServeBillingPlan, type BillingCycle, type SelfServeBillingPlan } from '@/lib/billing/plans';
import {
  cancelPayOSPaymentLink,
  createPayOSOrderCode,
  createPayOSPaymentLink,
  getPayOSPaymentLink,
  getPayOSPrice,
} from '@/lib/billing/payos';
import { BillingHttpError, billingErrorResponse, getAppOrigin, getBillingAdmin, requireBillingUser } from '@/lib/billing/server';

export const runtime = 'nodejs';

type StoredPayOSDetails = {
  payos_bin?: unknown;
  payos_account_number?: unknown;
  payos_account_name?: unknown;
  payos_qr_code?: unknown;
};

function getPayOSCheckoutError(error: unknown) {
  if (!(error instanceof APIError)) return null;
  if (error.code === '214') {
    return new BillingHttpError(
      503,
      'PayOS báo kênh thanh toán không tồn tại hoặc đang bị tạm dừng. Vui lòng kích hoạt lại kênh trong trang quản trị PayOS hoặc dùng bộ khóa của một kênh đang hoạt động.',
    );
  }
  if (error.status === 401 || error.status === 403) {
    return new BillingHttpError(
      503,
      'PayOS từ chối bộ khóa của kênh thanh toán. Vui lòng kiểm tra lại Client ID và API Key trên PayOS.',
    );
  }
  return null;
}

function checkoutResponse(order: {
  order_code: number;
  checkout_url: string;
  return_url: string;
  amount: number;
  description: string;
  expires_at: string;
  metadata: StoredPayOSDetails | null;
}, reused = false) {
  const metadata = order.metadata || {};
  if (
    typeof metadata.payos_qr_code !== 'string'
    || typeof metadata.payos_account_number !== 'string'
    || typeof metadata.payos_account_name !== 'string'
    || typeof metadata.payos_bin !== 'string'
  ) return null;

  return {
    url: order.checkout_url,
    returnUrl: order.return_url,
    orderCode: order.order_code,
    amount: order.amount,
    description: order.description,
    expiresAt: order.expires_at,
    qrCode: metadata.payos_qr_code,
    accountNumber: metadata.payos_account_number,
    accountName: metadata.payos_account_name,
    bin: metadata.payos_bin,
    reused,
  };
}

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
  const cancelUrl = new URL(target);
  cancelUrl.searchParams.set('billing', 'canceled');
  return { returnUrl: successUrl.toString(), cancelUrl: cancelUrl.toString() };
}

async function readPaidReceipt(userId: string, orderCode: number) {
  const admin = getBillingAdmin();
  const [{ data: order, error: orderError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    admin
      .from('billing_orders')
      .select('order_code,plan,billing_cycle,amount,currency,paid_at,payment_reference,status')
      .eq('user_id', userId)
      .eq('order_code', orderCode)
      .maybeSingle(),
    admin
      .from('billing_subscriptions')
      .select('plan,status,current_period_end')
      .eq('user_id', userId)
      .eq('provider', 'payos')
      .maybeSingle(),
  ]);
  if (orderError) throw orderError;
  if (subscriptionError) throw subscriptionError;
  if (!order || order.status !== 'paid') return null;
  return {
    orderCode: order.order_code,
    plan: order.plan,
    cycle: order.billing_cycle,
    amount: order.amount,
    currency: order.currency,
    paidAt: order.paid_at,
    reference: order.payment_reference,
    periodEnd: subscription?.current_period_end || null,
    subscriptionStatus: subscription?.status || 'active',
    provider: 'payos' as const,
  };
}

export async function POST(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => ({}));
    const cycle: BillingCycle = body?.cycle === 'monthly' ? 'monthly' : 'yearly';
    if (!isSelfServeBillingPlan(body?.plan)) {
      throw new BillingHttpError(400, 'Gói thanh toán không hợp lệ.');
    }
    const plan: SelfServeBillingPlan = body.plan;
    const admin = getBillingAdmin();
    const { data: liveSubscription, error } = await admin
      .from('billing_subscriptions')
      .select('provider,status,plan,current_period_end')
      .eq('user_id', user.id)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete'])
      .maybeSingle();
    if (error) throw error;
    if (liveSubscription?.provider === 'stripe') {
      throw new BillingHttpError(409, 'Bạn đang có gói Stripe. Hãy quản lý gói đó trong Billing Portal trước khi chuyển sang PayOS.');
    }
    if (
      liveSubscription?.provider === 'payos'
      && isBillingPlan(liveSubscription.plan)
      && BILLING_PLAN_RANK[plan] < BILLING_PLAN_RANK[liveSubscription.plan]
    ) {
      throw new BillingHttpError(
        409,
        `Gói ${liveSubscription.plan} của bạn vẫn còn hiệu lực. Không thể hạ gói bằng một đơn trả trước mới; vui lòng chờ hết hạn hoặc liên hệ hỗ trợ.`,
      );
    }

    const { returnUrl, cancelUrl } = getCheckoutUrls(request, body?.returnPath);
    const { data: reusable, error: reusableError } = await admin
      .from('billing_orders')
      .select('order_code,checkout_url,return_url,amount,description,expires_at,metadata')
      .eq('user_id', user.id)
      .eq('provider', 'payos')
      .eq('plan', plan)
      .eq('billing_cycle', cycle)
      .eq('return_url', returnUrl)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .not('checkout_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reusableError) throw reusableError;
    if (reusable?.checkout_url) {
      const response = checkoutResponse(reusable, true);
      if (response) {
        return Response.json(response, { headers: { 'Cache-Control': 'private, no-store' } });
      }
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
      return_url: returnUrl,
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
      returnUrl,
      cancelUrl,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
    };

    let paymentLink;
    try {
      paymentLink = await createPayOSPaymentLink(input);
    } catch (createError) {
      const apiError = createError instanceof APIError && createError.status !== undefined
        ? createError
        : null;
      if (apiError) {
        // PayOS returned a definitive rejection, so this local order must not
        // remain reusable as pending. Persist only the non-sensitive error code.
        const { error: failedOrderError } = await admin.from('billing_orders').update({
          status: 'failed',
          metadata: { payos_error_code: apiError.code || String(apiError.status) },
          updated_at: new Date().toISOString(),
        }).eq('order_code', orderCode).eq('user_id', user.id).eq('status', 'pending');
        if (failedOrderError) console.error('Unable to close rejected PayOS order:', failedOrderError);
      }

      // A connection timeout can occur after PayOS accepted an order. Keep
      // those indeterminate orders pending so a signed webhook can reconcile.
      throw getPayOSCheckoutError(createError) || createError;
    }

    const { error: linkError } = await admin.from('billing_orders').update({
      payment_link_id: paymentLink.paymentLinkId,
      checkout_url: paymentLink.checkoutUrl,
      metadata: {
        payos_bin: paymentLink.bin,
        payos_account_number: paymentLink.accountNumber,
        payos_account_name: paymentLink.accountName,
        payos_qr_code: paymentLink.qrCode,
      },
      updated_at: new Date().toISOString(),
    }).eq('order_code', orderCode).eq('status', 'pending');
    if (linkError) throw linkError;

    return Response.json({
      url: paymentLink.checkoutUrl,
      returnUrl,
      orderCode,
      amount,
      description,
      expiresAt: expiresAt.toISOString(),
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      reused: false,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => ({}));
    const orderCode = Number(body?.orderCode);
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
      throw new BillingHttpError(400, 'Mã đơn hàng không hợp lệ.');
    }

    const admin = getBillingAdmin();
    const { data: order, error: orderError } = await admin
      .from('billing_orders')
      .select('order_code,amount,status,payment_link_id')
      .eq('user_id', user.id)
      .eq('provider', 'payos')
      .eq('order_code', orderCode)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw new BillingHttpError(404, 'Không tìm thấy đơn hàng.');
    if (order.status === 'paid') {
      return Response.json(
        { status: 'paid', processed: false, receipt: await readPaidReceipt(user.id, orderCode) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (order.status !== 'pending') {
      return Response.json({ status: order.status, processed: false }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const paymentLink = await getPayOSPaymentLink(orderCode);
    if (paymentLink.orderCode !== orderCode
      || paymentLink.amount !== order.amount
      || (order.payment_link_id && paymentLink.id !== order.payment_link_id)) {
      throw new BillingHttpError(409, 'Thông tin thanh toán không khớp với đơn hàng.');
    }

    if (paymentLink.status === 'PAID') {
      if (paymentLink.amountPaid !== order.amount) {
        throw new BillingHttpError(409, 'Số tiền đã thanh toán không khớp với đơn hàng.');
      }
      const transaction = paymentLink.transactions.at(-1);
      const eventId = `reconcile:${paymentLink.id}:${transaction?.reference || 'paid'}`;
      const { data, error } = await admin.rpc('apply_payos_payment', {
        p_order_code: orderCode,
        p_amount: order.amount,
        p_payment_link_id: paymentLink.id,
        p_reference: transaction?.reference || null,
        p_transaction_at: transaction?.transactionDateTime || null,
        p_event_id: eventId,
        p_signature: 'verified-by-payos-api',
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      return Response.json(
        {
          status: 'paid',
          processed: Boolean(result?.processed),
          receipt: await readPaidReceipt(user.id, orderCode),
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const terminalStatus = paymentLink.status === 'CANCELLED'
      ? 'cancelled'
      : paymentLink.status === 'EXPIRED'
        ? 'expired'
        : ['UNDERPAID', 'FAILED'].includes(paymentLink.status)
          ? 'failed'
          : null;
    if (terminalStatus) {
      const { error } = await admin.from('billing_orders').update({
        status: terminalStatus,
        updated_at: new Date().toISOString(),
      }).eq('order_code', orderCode).eq('user_id', user.id).eq('status', 'pending');
      if (error) throw error;
    }
    return Response.json(
      { status: terminalStatus || 'pending', processed: false },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return billingErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const body = await request.json().catch(() => ({}));
    const orderCode = Number(body?.orderCode);
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
      throw new BillingHttpError(400, 'Mã đơn hàng không hợp lệ.');
    }

    const admin = getBillingAdmin();
    const { data: order, error: orderError } = await admin
      .from('billing_orders')
      .select('status')
      .eq('user_id', user.id)
      .eq('provider', 'payos')
      .eq('order_code', orderCode)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw new BillingHttpError(404, 'Không tìm thấy đơn hàng.');
    if (order.status !== 'pending') {
      return Response.json({ status: order.status }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const current = await getPayOSPaymentLink(orderCode);
    if (current.status === 'PAID') {
      return Response.json({ status: 'paid' }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (current.status === 'PENDING' || current.status === 'PROCESSING') {
      await cancelPayOSPaymentLink(orderCode, 'Khách hàng hủy tại Apexa');
    }

    const { error: updateError } = await admin
      .from('billing_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('order_code', orderCode)
      .eq('status', 'pending');
    if (updateError) throw updateError;

    return Response.json({ status: 'cancelled' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
