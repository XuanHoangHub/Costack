import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  "https://zfyngidcwjijuogaygwe.supabase.co";

const SUPABASE_PUBLIC_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  "sb_publishable_0DDvDW5FywRhTxLIVzQy9w_5R9Yr_Mb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

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
