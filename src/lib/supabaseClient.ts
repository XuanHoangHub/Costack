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
