import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../api/supabase';

/**
 * React Native suspends WebSockets while backgrounded. Restore the authenticated
 * Realtime connection before store-level subscriptions are created or resumed.
 */
export const useRealtimeConnection = () => {
  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted || !session?.access_token) return;
      await supabase.realtime.setAuth(session.access_token);
      if (!supabase.realtime.isConnected()) supabase.realtime.connect();
    };

    void connect();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) return;
      void supabase.realtime.setAuth(session.access_token);
      if (!supabase.realtime.isConnected()) supabase.realtime.connect();
    });
    const appStateListener = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void connect();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, []);
};
