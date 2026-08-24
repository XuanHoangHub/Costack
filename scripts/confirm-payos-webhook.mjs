import { loadEnvConfig } from '@next/env';
import { PayOS } from '@payos/node';

loadEnvConfig(process.cwd());

const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
if (!origin) throw new Error('NEXT_PUBLIC_APP_URL is required.');
const url = new URL(origin);
if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
  throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS outside localhost.');
}

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  timeout: 10_000,
  maxRetries: 2,
  logLevel: 'error',
});

const webhookUrl = `${origin}/api/billing/webhook`;
const result = await payos.webhooks.confirm(webhookUrl);
console.log(`PayOS webhook confirmed: ${result.webhookUrl}`);
