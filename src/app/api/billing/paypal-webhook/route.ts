import { billingErrorResponse, BillingHttpError, getBillingAdmin } from '@/lib/billing/server';
import { isPayPalConfigured, reconcilePayPalOrder, verifyPayPalWebhook } from '@/lib/billing/paypal';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!isPayPalConfigured()) throw new BillingHttpError(503, 'PayPal webhook is not configured.');
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 256_000) throw new BillingHttpError(413, 'Webhook is too large.');
    let event;
    try { event = JSON.parse(raw); } catch { throw new BillingHttpError(400, 'Invalid webhook payload.'); }
    if (!event?.id || typeof event.event_type !== 'string' || !event.resource) throw new BillingHttpError(400, 'Invalid webhook payload.');
    if (!await verifyPayPalWebhook(request, event)) throw new BillingHttpError(400, 'Invalid PayPal signature.');
    if (!['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'].includes(event.event_type)) {
      return Response.json({ received: true, ignored: true });
    }
    const providerId = event.event_type === 'CHECKOUT.ORDER.APPROVED'
      ? event.resource.id : event.resource.supplementary_data?.related_ids?.order_id;
    if (typeof providerId !== 'string' || !/^[A-Z0-9]{8,32}$/.test(providerId)) throw new BillingHttpError(400, 'Missing PayPal order ID.');
    const { data, error } = await getBillingAdmin().from('paypal_orders').select('*')
      .eq('provider_order_id', providerId).maybeSingle();
    if (error) throw error;
    // The checkout persists the provider ID before exposing the approval URL.
    // Unknown orders may belong to other products using this PayPal app.
    if (!data) return Response.json({ received: true, ignored: true });
    const result = await reconcilePayPalOrder(data, providerId);
    return Response.json({ received: true, status: result.status });
  } catch (error) { return billingErrorResponse(error); }
}
