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

export async function getAuthorizedGeminiClient(request: Request) {
  const customApiKey = request.headers.get('x-gemini-api-key')?.trim();
  if (customApiKey && customApiKey !== 'your-gemini-api-key') {
    return getGeminiClient(customApiKey);
  }

  // Check if server-side environment variable is configured
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'your-gemini-api-key') {
    return getGeminiClient(envKey);
  }

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (accessToken && supabaseUrl && supabasePublicKey) {
    const supabase = createClient(supabaseUrl, supabasePublicKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user && envKey && envKey !== 'your-gemini-api-key') {
      return getGeminiClient(envKey);
    }
  }

  throw new Error('AI_UNAUTHORIZED: Vui lòng nhập Gemini API Key trong Cài đặt > Cấu hình Apexa AI để kích hoạt trí tuệ nhân tạo.');
}

export const getAiErrorStatus = (error: unknown) =>
  error instanceof Error && error.message.startsWith('AI_UNAUTHORIZED:') ? 401 : 500;

export const getAiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message.replace(/^AI_UNAUTHORIZED:\s*/, '') : fallback;

