import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  "";

const SUPABASE_PUBLIC_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  "";

if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.error("Cảnh báo: Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong môi trường production.");
  }
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLIC_KEY || "placeholder-anon-key"
);

/**
 * Safely creates or retrieves a Supabase Realtime channel by removing any stale channels
 * with the same topic first. This prevents "cannot add callbacks after subscribe()" errors.
 */
export function getCleanChannel(name: string, opts?: any) {
  try {
    const existing = supabase.getChannels().filter(c => c.topic === name || c.topic === `realtime:${name}`);
    for (const ch of existing) {
      try {
        supabase.removeChannel(ch);
      } catch {}
    }
  } catch {}
  return supabase.channel(name, opts);
}
