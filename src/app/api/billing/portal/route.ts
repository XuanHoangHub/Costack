import { BillingHttpError, billingErrorResponse, getAppOrigin, getBillingAdmin, getStripe, requireBillingUser } from '@/lib/billing/server';

export async function POST(request: Request) {
  try {
    const { user } = await requireBillingUser(request);
    const { data, error } = await getBillingAdmin()
      .from('billing_customers')
      .select('provider_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.provider_customer_id) throw new BillingHttpError(404, 'No billing account exists yet.');

    const session = await getStripe().billingPortal.sessions.create({
      customer: data.provider_customer_id,
      return_url: `${getAppOrigin(request)}/?billing=portal_return`
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
