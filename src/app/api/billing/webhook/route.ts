import Stripe from 'stripe';
import { getBillingAdmin, getStripe, unixToIso } from '@/lib/billing/server';

export const runtime = 'nodejs';

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = getBillingAdmin();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const { data: customer, error } = await admin.from('billing_customers').select('user_id').eq('provider_customer_id', customerId).maybeSingle();
  if (error) throw error;
  const userId = subscription.metadata.supabase_user_id || customer?.user_id;
  if (!userId) throw new Error(`No Apexa user mapped to Stripe customer ${customerId}.`);
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || null;
  const cycle = subscription.metadata.billing_cycle || (item?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly');
  const plan = subscription.metadata.plan === 'enterprise' ? 'enterprise' : 'pro';
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;

  const { error: upsertError } = await admin.from('billing_subscriptions').upsert({
    user_id: userId,
    provider: 'stripe',
    provider_customer_id: customerId,
    provider_subscription_id: subscription.id,
    provider_price_id: priceId,
    plan,
    billing_cycle: cycle,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: unixToIso(periodStart),
    current_period_end: unixToIso(periodEnd),
    trial_end: unixToIso(subscription.trial_end),
    canceled_at: unixToIso(subscription.canceled_at),
    metadata: subscription.metadata,
    updated_at: new Date().toISOString()
  }, { onConflict: 'provider_subscription_id' });
  if (upsertError) throw upsertError;

  const isPro = subscription.status === 'active' || subscription.status === 'trialing' || (subscription.status === 'past_due' && Boolean(periodEnd && periodEnd * 1000 > Date.now() - 7 * 86400000));
  const { error: memberError } = await admin.from('members').update({ is_premium: isPro }).eq('user_id', userId);
  if (memberError) throw memberError;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return Response.json({ error: 'Webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid signature.' }, { status: 400 });
  }

  const admin = getBillingAdmin();
  const { data: seen } = await admin.from('billing_webhook_events').select('event_id').eq('event_id', event.id).maybeSingle();
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (userId && customerId) {
        const { error } = await admin.from('billing_customers').upsert({
          user_id: userId, provider: 'stripe', provider_customer_id: customerId,
          email: session.customer_details?.email, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
      }
      const checkoutSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (checkoutSubscriptionId) await syncSubscription(await getStripe().subscriptions.retrieve(checkoutSubscriptionId));
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      const id = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId?.id;
      if (id) await syncSubscription(await getStripe().subscriptions.retrieve(id));
    }
    const { error } = await admin.from('billing_webhook_events').insert({ provider: 'stripe', event_id: event.id, event_type: event.type, payload_version: event.api_version });
    if (error?.code === '23505') return Response.json({ received: true, duplicate: true });
    if (error) throw error;
    return Response.json({ received: true });
  } catch (error) {
    console.error(`Unable to process Stripe event ${event.id}:`, error);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
