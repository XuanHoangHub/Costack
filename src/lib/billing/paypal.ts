import 'server-only';

import type { BillingCycle, SelfServeBillingPlan } from './plans';
import { PAYPAL_DEFAULT_PRICES, PAYPAL_MERCHANT_EMAIL, usdToCents } from './paypal-prices';
import { BillingHttpError, getBillingAdmin } from './server';

export type PayPalOrder = {
  id: string;
  status: string;
  intent?: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    custom_id?: string;
    invoice_id?: string;
    payee?: { email_address?: string };
    amount?: { currency_code: string; value: string };
    payments?: { captures?: { id: string; status: string; final_capture?: boolean; amount: { currency_code: string; value: string } }[] };
  }[];
};

export type LocalPayPalOrder = {
  id: string;
  user_id: string;
  plan: SelfServeBillingPlan;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  merchant_email: string;
  provider_order_id: string | null;
  checkout_url: string | null;
  status: string;
};

export function getPayPalMerchantEmail() {
  return (process.env.PAYPAL_MERCHANT_EMAIL || PAYPAL_MERCHANT_EMAIL).trim().toLowerCase();
}

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
    && process.env.PAYPAL_WEBHOOK_ID?.trim() && ['sandbox', 'live'].includes(process.env.PAYPAL_ENVIRONMENT || '')
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getPayPalMerchantEmail()));
}

export function getPayPalPrice(plan: SelfServeBillingPlan, cycle: BillingCycle) {
  const override = process.env[`PAYPAL_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`];
  if (override === undefined) return PAYPAL_DEFAULT_PRICES[plan][cycle];
  const cents = usdToCents(override.trim());
  if (!cents) throw new Error(`Invalid PayPal USD price for ${plan}/${cycle}`);
  return cents;
}

function apiOrigin() {
  if (!isPayPalConfigured()) throw new BillingHttpError(503, 'PayPal chưa được cấu hình đầy đủ.');
  return process.env.PAYPAL_ENVIRONMENT === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

let cachedToken: { key: string; token: string; expiresAt: number } | undefined;

async function accessToken() {
  const origin = apiOrigin();
  const key = `${origin}:${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`;
  if (cachedToken?.key === key && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const response = await fetch(`${apiOrigin()}/v1/oauth2/token`, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const body = await response.json();
  if (!response.ok || typeof body.access_token !== 'string') throw new Error('PayPal authentication failed.');
  if (typeof body.expires_in === 'number' && body.expires_in > 60) {
    cachedToken = { key, token: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
  }
  return body.access_token as string;
}

export async function paypalRequest<T>(path: string, method = 'GET', body?: unknown, requestId?: string): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`${apiOrigin()}${path}`, {
    method, cache: 'no-store', signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    // Never return raw provider payloads or credentials to the browser.
    console.error('PayPal request failed', response.status, result.name, result.debug_id);
    throw new BillingHttpError(502, 'Không thể hoàn tất yêu cầu PayPal. Vui lòng kiểm tra lại giao dịch.');
  }
  return result as T;
}

export function assertPayPalOrder(order: PayPalOrder, local: LocalPayPalOrder) {
  const unit = order.purchase_units?.[0];
  if (!order.id || (local.provider_order_id && order.id !== local.provider_order_id)
    || order.intent !== 'CAPTURE' || order.purchase_units?.length !== 1
    || unit?.custom_id !== local.id || unit.invoice_id !== local.id
    || unit.payee?.email_address?.toLowerCase() !== local.merchant_email.toLowerCase()
    || unit.amount?.currency_code !== local.currency || usdToCents(unit.amount?.value) !== local.amount) {
    throw new BillingHttpError(409, 'Thông tin đơn PayPal không khớp. Vui lòng liên hệ hỗ trợ.');
  }
  return unit;
}

export function verifiedCapture(order: PayPalOrder, local: LocalPayPalOrder) {
  const unit = assertPayPalOrder(order, local);
  const captures = unit.payments?.captures;
  const capture = captures?.[0];
  if (order.status !== 'COMPLETED' || captures?.length !== 1 || capture?.status !== 'COMPLETED') return null;
  if (!capture.id || capture.amount.currency_code !== local.currency || usdToCents(capture.amount.value) !== local.amount) {
    throw new BillingHttpError(409, 'Số tiền PayPal đã thu không khớp với đơn hàng.');
  }
  return capture;
}

export async function reconcilePayPalOrder(local: LocalPayPalOrder, providerId: string) {
  if (!/^[A-Z0-9]{8,32}$/.test(providerId)) throw new BillingHttpError(400, 'Mã đơn PayPal không hợp lệ.');
  let order = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${providerId}`);
  assertPayPalOrder(order, local);
  if (order.status === 'APPROVED') {
    try {
      await paypalRequest(`/v2/checkout/orders/${providerId}/capture`, 'POST', {}, `capture-${local.id}`);
    } catch (error) {
      // A timeout or concurrent webhook may have captured successfully. Read
      // the authoritative order before deciding whether this request failed.
      order = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${providerId}`);
      if (!verifiedCapture(order, local)) throw error;
    }
    order = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${providerId}`);
  }
  const capture = verifiedCapture(order, local);
  if (!capture) return { status: 'pending' as const };
  const { data, error } = await getBillingAdmin().rpc('apply_paypal_payment', {
    p_order_id: local.id, p_provider_order_id: providerId, p_capture_id: capture.id,
    p_amount: local.amount, p_currency: local.currency, p_merchant_email: local.merchant_email,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.period_end) throw new Error('PayPal entitlement confirmation is missing.');
  return { status: 'paid' as const, plan: local.plan, cycle: local.billing_cycle, amount: local.amount,
    currency: local.currency, reference: capture.id, periodEnd: result.period_end };
}

export async function verifyPayPalWebhook(request: Request, event: unknown) {
  const fields = {
    auth_algo: request.headers.get('paypal-auth-algo'), cert_url: request.headers.get('paypal-cert-url'),
    transmission_id: request.headers.get('paypal-transmission-id'), transmission_sig: request.headers.get('paypal-transmission-sig'),
    transmission_time: request.headers.get('paypal-transmission-time'),
  };
  if (Object.values(fields).some(value => !value)) return false;
  const result = await paypalRequest<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', 'POST', {
    ...fields, webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event,
  });
  return result.verification_status === 'SUCCESS';
}
