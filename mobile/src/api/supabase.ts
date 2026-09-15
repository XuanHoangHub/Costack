import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://zfyngidcwjijuogaygwe.supabase.co';

const SUPABASE_ANON_KEY = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeW5naWRjd2ppanVvZ2F5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzk2OTYsImV4cCI6MjA5NjgxNTY5Nn0.2Ft5m7eb62b_Tb_fnKuYNoA7EnVt8ZSgk0aOO6WgBUY';

import { safeAsyncStorage } from './storage';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeAsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 40,
    },
  },
});

/**
 * Safely creates or retrieves a Supabase Realtime channel by removing any stale channels
 * with the same topic first. This prevents "cannot add callbacks after subscribe()" errors.
 */
export function getCleanChannel(name: string, opts?: any) {
  try {
    const existing = supabase.getChannels().filter((c) => c.topic === name || c.topic === `realtime:${name}`);
    for (const ch of existing) {
      try {
        supabase.removeChannel(ch);
      } catch {}
    }
  } catch {}
  return supabase.channel(name, opts);
}
