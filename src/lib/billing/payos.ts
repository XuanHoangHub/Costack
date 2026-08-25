import 'server-only';

import { randomInt } from 'node:crypto';
import { PayOS, type Webhook } from '@payos/node';
import {
  PAYOS_DEFAULT_PRICES,
  type BillingCycle,
  type SelfServeBillingPlan,
} from '@/lib/billing/plans';

export type PayOSWebhookData = {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber?: string;
  reference?: string;
  transactionDateTime?: string;
  currency?: string;
  paymentLinkId: string;
  code: string;
  desc?: string;
  [key: string]: unknown;
};

export type PayOSWebhookBody = {
  code: string;
  desc: string;
  success: boolean;
  data: PayOSWebhookData;
  signature: string;
};

type CreatePaymentLinkInput = {
  orderCode: number;
  amount: number;
  description: string;
  buyerName?: string;
  buyerEmail?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  cancelUrl: string;
  returnUrl: string;
  expiredAt: number;
};

let payOSClient: PayOS | undefined;

function getPayOS() {
  if (payOSClient) return payOSClient;
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey) {
    throw new Error('PayOS billing is not configured.');
  }
  payOSClient = new PayOS({
    clientId,
    apiKey,
    checksumKey,
    timeout: 10_000,
    maxRetries: 2,
    logLevel: 'error',
  });
  return payOSClient;
}

export function isPayOSConfigured() {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

export async function verifyPayOSWebhook(body: PayOSWebhookBody) {
  try {
    await getPayOS().webhooks.verify(body as Webhook);
    return true;
  } catch {
    return false;
  }
}

export function createPayOSPaymentLink(input: CreatePaymentLinkInput) {
  // The official SDK creates the request signature, verifies the response
  // signature, and retries transient network failures with the same orderCode.
  return getPayOS().paymentRequests.create(input, { timeout: 10_000, maxRetries: 2 });
}

export function getPayOSPaymentLink(orderCode: number) {
  // Used as a server-side fallback when the browser callback arrives before
  // the PayOS webhook. The official SDK authenticates the request and
  // validates the response before we reconcile the local entitlement.
  return getPayOS().paymentRequests.get(orderCode, { timeout: 10_000, maxRetries: 2 });
}

export function cancelPayOSPaymentLink(orderCode: number, reason: string) {
  return getPayOS().paymentRequests.cancel(orderCode, reason, { timeout: 10_000, maxRetries: 2 });
}

export function createPayOSOrderCode() {
  // 15 digits, unique enough for retries and still below Number.MAX_SAFE_INTEGER.
  return Date.now() * 100 + randomInt(0, 100);
}

export function getPayOSPrice(plan: SelfServeBillingPlan, cycle: BillingCycle) {
  const envName = `PAYOS_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  const configured = process.env[envName];
  if (!configured) return PAYOS_DEFAULT_PRICES[plan][cycle];
  const amount = Number(configured);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${envName} must be a positive VND integer.`);
  }
  return amount;
}
