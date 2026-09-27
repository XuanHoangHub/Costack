import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getGeminiClient } from '@/lib/gemini';
import { checkRateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';
import { getBillingAdmin } from '@/lib/billing/server';
import { isBillingPlan, isPaidBillingPlan } from '@/lib/billing/plans';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export function resolveModel(model?: string): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';
  const m = model.trim().toLowerCase();
  if (m === 'gemini-2.5-pro') return 'gemini-2.5-pro';
  if (m === 'gemini-2.5-flash-lite' || m === 'gemini-3.5-flash-lite') return 'gemini-2.5-flash-lite';
  if (m === 'gemini-2.0-flash') return 'gemini-2.0-flash';
  // All other requested versions (including default, 3.6-flash, 3.5-flash, 2.5-flash) map safely to 2.5-flash
  return 'gemini-2.5-flash';
}

export async function readAiJson<T = Record<string, unknown>>(
  request: Request,
  maxPayloadSize: number = 512_000,
): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxPayloadSize) {
    const sizeMb = (maxPayloadSize / (1024 * 1024)).toFixed(1);
    throw new Error(`AI_PAYLOAD_TOO_LARGE: Nội dung yêu cầu vượt quá giới hạn ${maxPayloadSize >= 1_000_000 ? `${sizeMb} MB` : `${Math.round(maxPayloadSize / 1024)} KB`}.`);
  }
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

  const isSuper = isApexaSuperAdmin(data.user.id);
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
  const plan = isSuper ? 'enterprise' : (subscriptionIsLive && isBillingPlan(subscription?.plan) ? subscription.plan : 'free');
  if (!isSuper && !isPaidBillingPlan(plan)) {
    throw new Error('AI_PLAN_REQUIRED: Costack AI chỉ dành cho tài khoản trả phí. Vui lòng nâng cấp gói để tiếp tục.');
  }
  if (!envKey || envKey === 'your-gemini-api-key') {
    throw new Error('AI_UNAVAILABLE: Costack Brain chưa được cấu hình API Key trên máy chủ.');
  }

  if (!isSuper) {
    const { data: usageData, error: usageError } = await admin.rpc('consume_ai_billing_usage', {
      p_user_id: data.user.id,
      p_units: 1,
    });
    if (usageError) throw usageError;
    const usage = Array.isArray(usageData) ? usageData[0] : usageData;
    if (!usage?.allowed) {
      throw new Error(`AI_QUOTA_EXCEEDED: Bạn đã dùng hết ${usage?.quota || 0} lượt AI trong tháng của gói ${plan}.`);
    }
  }
  return getGeminiClient();
}

export const getAiErrorStatus = (error: unknown) => {
  if (!(error instanceof Error)) return 500;
  const msg = error.message;
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) return 400;
  if (msg.includes('RESOURCE_EXHAUSTED')) return 429;
  if (msg.startsWith('AI_BAD_REQUEST:')) return 400;
  if (msg.startsWith('AI_UNAUTHORIZED:')) return 401;
  if (msg.startsWith('AI_PAYLOAD_TOO_LARGE:')) return 413;
  if (msg.startsWith('AI_RATE_LIMITED:')) return 429;
  if (msg.startsWith('AI_QUOTA_EXCEEDED:')) return 429;
  if (msg.startsWith('AI_PLAN_REQUIRED:')) return 403;
  if (msg.startsWith('AI_UNAVAILABLE:')) return 503;
  return 500;
};

export const getAiErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const rawMsg = error.message;

  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_SERVICE_BLOCKED')) {
    return "Khóa GEMINI_API_KEY chưa hợp lệ. Vui lòng cấu hình API Key Google AI Studio hợp lệ (bắt đầu bằng 'AIzaSy...') trong file .env.local trên server.";
  }

  if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('429')) {
    return "Tài khoản Gemini API đã vượt hạn mức yêu cầu (Quota Exceeded). Vui lòng thử lại sau giây lát hoặc nâng cấp quota tại Google AI Studio.";
  }

  if (rawMsg.trim().startsWith('{') && rawMsg.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        if (parsed.error.message.includes('API key not valid') || parsed.error.status === 'INVALID_ARGUMENT') {
          return "Khóa GEMINI_API_KEY chưa hợp lệ. Vui lòng kiểm tra lại khóa API Google Gemini trong file .env.local.";
        }
        return String(parsed.error.message);
      }
    } catch {
      // Fall through
    }
  }

  return rawMsg.replace(/^AI_(?:BAD_REQUEST|UNAUTHORIZED|PAYLOAD_TOO_LARGE|RATE_LIMITED|QUOTA_EXCEEDED|PLAN_REQUIRED|UNAVAILABLE):\s*/, '') || fallback;
};

/**
 * Convert a Gemini generateContentStream async iterable into a standard
 * SSE (text/event-stream) Response.  Each chunk emits `data: <json>\n\n`
 * with `{ text: string }`.  The stream ends with `data: [DONE]\n\n`.
 */
export function createAiStreamResponse(
  stream: AsyncIterable<{ text?: string | null }>,
  extraPayload?: Record<string, unknown>,
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text ?? '';
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
        }
        // Send optional extra data (e.g. intelligence metadata) before closing
        if (extraPayload) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ meta: extraPayload })}\n\n`),
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
