import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getGeminiClient } from '@/lib/gemini';
import { checkRateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';
import { getBillingAdmin } from '@/lib/billing/server';
import { isBillingPlan, isPaidBillingPlan } from '@/lib/billing/plans';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const SUPPORTED_MODELS = new Set([
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]);

export function resolveModel(model?: string): string {
  if (!model || typeof model !== 'string') return 'gemini-3.6-flash';
  const m = model.trim().toLowerCase();
  if (SUPPORTED_MODELS.has(m)) return m;
  return 'gemini-3.6-flash';
}

export async function readAiJson<T = Record<string, unknown>>(
  request: Request,
  maxPayloadSize: number = 512_000,
): Promise<T> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxPayloadSize) {
    const sizeMb = (maxPayloadSize / (1024 * 1024)).toFixed(1);
    throw new Error(`AI_PAYLOAD_TOO_LARGE: Nội dung yêu cầu vượt quá giới hạn ${maxPayloadSize >= 1_000_000 ? `${sizeMb} MB` : `${Math.round(maxPayloadSize / 1024)} KB`}.`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('AI_BAD_REQUEST: Nội dung JSON không hợp lệ.');
  }
}

export async function getAuthorizedGeminiClient(
  request: Request,
  maxPayloadSize: number = 512_000,
) {
  pruneRateLimitBuckets();
  const rateLimit = checkRateLimit(request, 'ai', 30, 60_000);
  if (!rateLimit.allowed) {
    throw new Error(`AI_RATE_LIMITED: Quá nhiều yêu cầu AI. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxPayloadSize) {
    const sizeMb = (maxPayloadSize / (1024 * 1024)).toFixed(1);
    throw new Error(`AI_PAYLOAD_TOO_LARGE: Nội dung yêu cầu vượt quá giới hạn ${maxPayloadSize >= 1_000_000 ? sizeMb + ' MB' : Math.round(maxPayloadSize / 1024) + ' KB'}.`);
  }

  const envKey = process.env.GEMINI_API_KEY;
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) {
    throw new Error('AI_UNAUTHORIZED: Vui lòng đăng nhập để sử dụng Costack AI.');
  }

  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error('AI_UNAVAILABLE: Xác thực AI trên máy chủ chưa được cấu hình.');
  }

  const supabase = createClient(supabaseUrl, supabasePublicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error('AI_UNAUTHORIZED: Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }
  const admin = getBillingAdmin();
  const { data: subscription, error: subscriptionError } = await admin
    .from('billing_subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', data.user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;
  const periodEndMs = subscription?.current_period_end ? Date.parse(subscription.current_period_end) : Number.POSITIVE_INFINITY;
  const subscriptionIsLive = Boolean(subscription) && (
    (['active', 'trialing'].includes(subscription?.status || '') && periodEndMs > Date.now())
    || (subscription?.status === 'past_due' && periodEndMs > Date.now() - 7 * 86_400_000)
  );
  const plan = subscriptionIsLive && isBillingPlan(subscription?.plan) ? subscription.plan : 'free';
  if (!isPaidBillingPlan(plan)) {
    throw new Error('AI_PLAN_REQUIRED: Costack AI chỉ dành cho tài khoản trả phí. Vui lòng nâng cấp gói để tiếp tục.');
  }
  if (!envKey || envKey === 'your-gemini-api-key') {
    throw new Error('AI_UNAVAILABLE: Costack Brain chưa được cấu hình API Key trên máy chủ.');
  }

  const { data: usageData, error: usageError } = await admin.rpc('consume_ai_billing_usage', {
    p_user_id: data.user.id,
    p_units: 1,
  });
  if (usageError) throw usageError;
  const usage = Array.isArray(usageData) ? usageData[0] : usageData;
  if (!usage?.allowed) {
    throw new Error(`AI_QUOTA_EXCEEDED: Bạn đã dùng hết ${usage?.quota || 0} lượt AI trong tháng của gói ${plan}.`);
  }
  return getGeminiClient();
}

export const getAiErrorStatus = (error: unknown) => {
  if (!(error instanceof Error)) return 500;
  if (error.message.startsWith('AI_BAD_REQUEST:')) return 400;
  if (error.message.startsWith('AI_UNAUTHORIZED:')) return 401;
  if (error.message.startsWith('AI_PAYLOAD_TOO_LARGE:')) return 413;
  if (error.message.startsWith('AI_RATE_LIMITED:')) return 429;
  if (error.message.startsWith('AI_QUOTA_EXCEEDED:')) return 429;
  if (error.message.startsWith('AI_PLAN_REQUIRED:')) return 403;
  if (error.message.startsWith('AI_UNAVAILABLE:')) return 503;
  return 500;
};

export const getAiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message.replace(/^AI_(?:BAD_REQUEST|UNAUTHORIZED|PAYLOAD_TOO_LARGE|RATE_LIMITED|QUOTA_EXCEEDED|PLAN_REQUIRED|UNAVAILABLE):\s*/, '') : fallback;
