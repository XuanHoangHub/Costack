import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getGeminiClient } from '@/lib/gemini';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export function resolveModel(model?: string): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';
  const m = model.trim().toLowerCase();
  if (m === 'gemini-3.6-flash' || m === 'gemini-3.5-flash' || m === 'gemini-3.5-flash-lite') {
    return 'gemini-2.5-flash';
  }
  return model.trim();
}

export async function getAuthorizedGeminiClient(request: Request, maxPayloadSize: number = 512_000) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxPayloadSize) {
    const sizeMb = (maxPayloadSize / (1024 * 1024)).toFixed(1);
    throw new Error(`AI_PAYLOAD_TOO_LARGE: Nội dung yêu cầu vượt quá giới hạn ${maxPayloadSize >= 1_000_000 ? sizeMb + ' MB' : Math.round(maxPayloadSize / 1024) + ' KB'}.`);
  }

  const customApiKey = request.headers.get('x-gemini-api-key')?.trim();
  if (customApiKey && customApiKey !== 'your-gemini-api-key') {
    if (customApiKey.length > 512) throw new Error('AI_BAD_REQUEST: Gemini API Key không hợp lệ.');
    return getGeminiClient(customApiKey);
  }

  const envKey = process.env.GEMINI_API_KEY;
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) {
    throw new Error('AI_UNAUTHORIZED: Vui lòng đăng nhập hoặc nhập Gemini API Key trong Cài đặt > Cấu hình Apexa AI.');
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
  if (!envKey || envKey === 'your-gemini-api-key') {
    throw new Error('AI_UNAVAILABLE: Apexa Brain chưa được cấu hình API Key trên máy chủ.');
  }
  return getGeminiClient(envKey);
}

export const getAiErrorStatus = (error: unknown) => {
  if (!(error instanceof Error)) return 500;
  if (error.message.startsWith('AI_BAD_REQUEST:')) return 400;
  if (error.message.startsWith('AI_UNAUTHORIZED:')) return 401;
  if (error.message.startsWith('AI_PAYLOAD_TOO_LARGE:')) return 413;
  if (error.message.startsWith('AI_UNAVAILABLE:')) return 503;
  return 500;
};

export const getAiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message.replace(/^AI_(?:BAD_REQUEST|UNAUTHORIZED|PAYLOAD_TOO_LARGE|UNAVAILABLE):\s*/, '') : fallback;
