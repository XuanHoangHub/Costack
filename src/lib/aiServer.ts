import { createClient } from '@supabase/supabase-js';
import { getGeminiClient } from '@/lib/gemini';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export async function getAuthorizedGeminiClient(request: Request) {
  const customApiKey = request.headers.get('x-gemini-api-key')?.trim();
  if (customApiKey) return getGeminiClient(customApiKey);

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken || !supabaseUrl || !supabasePublicKey) {
    throw new Error('AI_UNAUTHORIZED: Sign in or configure your own Gemini API key.');
  }

  const supabase = createClient(supabaseUrl, supabasePublicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error('AI_UNAUTHORIZED: Your session is invalid or expired.');
  }

  return getGeminiClient();
}

export const getAiErrorStatus = (error: unknown) =>
  error instanceof Error && error.message.startsWith('AI_UNAUTHORIZED:') ? 401 : 500;

export const getAiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message.replace(/^AI_UNAUTHORIZED:\s*/, '') : fallback;
