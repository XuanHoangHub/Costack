import { createClient, RealtimeChannel } from "@supabase/supabase-js";

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

export type RealtimeConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

let currentRealtimeStatus: RealtimeConnectionStatus = 'connecting';
const statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();

export function getRealtimeStatus(): RealtimeConnectionStatus {
  return currentRealtimeStatus;
}

export function setRealtimeStatus(status: RealtimeConnectionStatus) {
  if (currentRealtimeStatus === status) return;
  currentRealtimeStatus = status;
  statusListeners.forEach(listener => {
    try {
      listener(status);
    } catch (e) {
      console.error('Error in realtime status listener:', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('costack-realtime-status', { detail: { status } }));
  }
}

export function subscribeRealtimeStatus(listener: (status: RealtimeConnectionStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentRealtimeStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLIC_KEY || "placeholder-anon-key",
  {
    realtime: {
      params: {
        eventsPerSecond: 40,
      },
    },
  }
);

// Automatic JWT Auth Synchronization with Supabase Realtime
if (typeof window !== 'undefined') {
  // 1. Initial auth sync
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      try {
        void supabase.realtime.setAuth(session.access_token);
      } catch (e) {
        console.warn('Failed to set initial realtime auth:', e);
      }
    }
  });

  // 2. Continuous auth sync on token refresh or sign-in / sign-out
  supabase.auth.onAuthStateChange((_event, session) => {
    try {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      } else if (SUPABASE_PUBLIC_KEY) {
        void supabase.realtime.setAuth(SUPABASE_PUBLIC_KEY);
      }
    } catch (e) {
      console.warn('Failed to update realtime auth on state change:', e);
    }
  });

  // 3. Network online/offline recovery
  window.addEventListener('online', () => {
    setRealtimeStatus('connecting');
    try {
      void supabase.realtime.connect();
    } catch (_) {}
  });

  window.addEventListener('offline', () => {
    setRealtimeStatus('disconnected');
  });
}

/**
 * Safely creates or retrieves a Supabase Realtime channel by removing any stale channels
 * with the same topic first. This prevents "cannot add callbacks after subscribe()" errors.
 */
export function getCleanChannel(name: string, opts?: any): RealtimeChannel {
  try {
    const existing = supabase.getChannels().filter(c => c.topic === name || c.topic === `realtime:${name}`);
    for (const ch of existing) {
      try {
        void supabase.removeChannel(ch);
      } catch {}
    }
  } catch {}
  return supabase.channel(name, opts);
}

/**
 * Force reconnect the Supabase Realtime websocket socket
 */
export async function reconnectRealtime(): Promise<void> {
  try {
    setRealtimeStatus('connecting');
    await supabase.realtime.disconnect();
    await supabase.realtime.connect();
    setRealtimeStatus('connected');
  } catch (e) {
    console.warn('Realtime reconnect error:', e);
    setRealtimeStatus('error');
  }
}
