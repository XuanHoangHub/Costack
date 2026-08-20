import type Stripe from 'stripe';
import { billingErrorResponse, getPriceId, getStripe, type BillingCycle } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';

function serializePrice(cycle: BillingCycle, price: Stripe.Price) {
  if (price.type !== 'recurring' || price.unit_amount == null || !price.recurring) {
    throw new Error(`The configured ${cycle} price must be a fixed recurring Stripe Price.`);
  }
  return {
    cycle,
    id: price.id,
    unit_amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring.interval,
    interval_count: price.recurring.interval_count
  };
}

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_PRO_MONTHLY || !process.env.STRIPE_PRICE_PRO_YEARLY) {
      return Response.json({
        configured: false,
        prices: {}
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const stripe = getStripe();
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(getPriceId('monthly')),
      stripe.prices.retrieve(getPriceId('yearly'))
    ]);
    return Response.json({
      configured: true,
      prices: {
        monthly: serializePrice('monthly', monthly),
        yearly: serializePrice('yearly', yearly)
      }
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
