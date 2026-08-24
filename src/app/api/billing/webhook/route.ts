import { createHash } from 'node:crypto';
import { verifyPayOSWebhook, type PayOSWebhookBody } from '@/lib/billing/payos';
import { getBillingAdmin } from '@/lib/billing/server';

export const runtime = 'nodejs';

function isWebhookBody(value: unknown): value is PayOSWebhookBody {
  if (!value || typeof value !== 'object') return false;
  const body = value as Partial<PayOSWebhookBody>;
  return typeof body.code === 'string'
    && typeof body.desc === 'string'
    && typeof body.success === 'boolean'
    && typeof body.signature === 'string'
    && Boolean(body.data && typeof body.data === 'object')
    && Number.isSafeInteger(body.data?.orderCode)
    && Number.isSafeInteger(body.data?.amount)
    && typeof body.data?.paymentLinkId === 'string'
    && typeof body.data?.code === 'string';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isWebhookBody(body)) {
    return Response.json({ error: 'Invalid PayOS webhook payload.' }, { status: 400 });
  }
  if (!await verifyPayOSWebhook(body)) {
    return Response.json({ error: 'Invalid PayOS signature.' }, { status: 400 });
  }

  // PayOS sends signed sample data while confirming a webhook. Unknown orders
  // are acknowledged, but can never grant an Apexa entitlement.
  const admin = getBillingAdmin();
  const { data: order, error: orderError } = await admin
    .from('billing_orders')
    .select('order_code')
    .eq('provider', 'payos')
    .eq('order_code', body.data.orderCode)
    .maybeSingle();
  if (orderError) {
    console.error('Unable to locate PayOS order:', orderError);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
  if (!order) return Response.json({ received: true, ignored: true });

  if (!body.success || body.code !== '00' || body.data.code !== '00') {
    return Response.json({ received: true, ignored: true });
  }

  const eventId = body.data.reference
    || createHash('sha256').update(body.signature).digest('hex');
  const { data, error } = await admin.rpc('apply_payos_payment', {
    p_order_code: body.data.orderCode,
    p_amount: body.data.amount,
    p_payment_link_id: body.data.paymentLinkId,
    p_reference: body.data.reference || null,
    p_transaction_at: body.data.transactionDateTime || null,
    p_event_id: eventId,
    p_signature: body.signature,
  });
  if (error) {
    console.error(`Unable to process PayOS event ${eventId}:`, error);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return Response.json({ received: true, processed: Boolean(result?.processed) });
}
