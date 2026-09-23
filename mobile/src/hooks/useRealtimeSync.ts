import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useTaskStore } from '../store/taskStore';
import { useSpaceStore } from '../store/spaceStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useDocStore } from '../store/docStore';
import { useChatStore } from '../store/chatStore';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { useMemberStore } from '../store/memberStore';
import { supabase } from '../api/supabase';

export const useRealtimeSync = () => {
  const userId = useAuthStore((s) => s.currentUser?.id);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const isHydratingRef = useRef(false);

  const fetchTasks = useTaskStore((s) => s.fetchTasksFromSupabase);
  const subscribeToTasks = useTaskStore((s) => s.subscribeToTasks);

  const fetchSpaces = useSpaceStore((s) => s.fetchSpacesFromSupabase);
  const subscribeToSpaces = useSpaceStore((s) => s.subscribeToSpaces);

  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspacesFromSupabase);
  const subscribeToWorkspaces = useWorkspaceStore((s) => s.subscribeToWorkspaces);

  const fetchDocs = useDocStore((s) => s.fetchDocsFromSupabase);
  const subscribeToDocs = useDocStore((s) => s.subscribeToDocs);

  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const subscribeToChannels = useChatStore((s) => s.subscribeToChannels);

  const fetchTransactions = useFinanceStore((s) => s.fetchTransactionsFromSupabase);
  const subscribeToFinance = useFinanceStore((s) => s.subscribeToFinance);

  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const subscribeToMembers = useMemberStore((s) => s.subscribeToMembers);

  const refreshAllData = useCallback(async () => {
    if (isHydratingRef.current) return;
    isHydratingRef.current = true;
    try {
      await fetchWorkspaces();
      await Promise.allSettled([
        fetchSpaces(),
        fetchTasks(),
        fetchDocs(),
        fetchChannels(),
        fetchMembers(),
      ]);
      const currentWsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (currentWsId) {
        await fetchTransactions(currentWsId);
      }
    } catch (err) {
      console.warn('Error refreshing data from Supabase:', err);
    } finally {
      isHydratingRef.current = false;
    }
  }, [fetchWorkspaces, fetchSpaces, fetchTasks, fetchDocs, fetchChannels, fetchMembers, fetchTransactions]);

  // 1. Authenticate Realtime & Initial Data Hydration
  useEffect(() => {
    if (!userId) {
      setRealtimeReady(false);
      return;
    }

    let active = true;

    const setupAuthAndSync = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
          if (!supabase.realtime.isConnected()) {
            supabase.realtime.connect();
          }
        }

        if (!active) return;
        await refreshAllData();
        if (active) setRealtimeReady(true);
      } catch (e) {
        console.warn('Realtime sync setup error:', e);
        if (active) setRealtimeReady(true);
      }
    };

    void setupAuthAndSync();

    // Listen to Supabase Auth state changes (token refreshed, re-login)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        try {
          await supabase.realtime.setAuth(session.access_token);
          if (!supabase.realtime.isConnected()) supabase.realtime.connect();
        } catch {}
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshAllData();
        if (active) setRealtimeReady(true);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [userId, refreshAllData]);

  // 2. Persistent Realtime Subscriptions (Never torn down when activeWorkspaceId changes)
  useEffect(() => {
    if (!userId || !realtimeReady) return;

    const unsubTasks = subscribeToTasks();
    const unsubSpaces = subscribeToSpaces();
    const unsubWorkspaces = subscribeToWorkspaces();
    const unsubDocs = subscribeToDocs();
    const unsubChannels = subscribeToChannels();
    const unsubFinance = subscribeToFinance();
    const unsubMembers = subscribeToMembers();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshAllData();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      try {
        unsubTasks();
        unsubSpaces();
        unsubWorkspaces();
        unsubDocs();
        unsubChannels();
        unsubFinance();
        unsubMembers();
      } catch {}
      appStateSub.remove();
    };
  }, [userId, realtimeReady, subscribeToTasks, subscribeToSpaces, subscribeToWorkspaces, subscribeToDocs, subscribeToChannels, subscribeToFinance, subscribeToMembers, refreshAllData]);

  // 3. Workspace switch listener: lightweight data refetch without destroying subscriptions
  useEffect(() => {
    if (!userId || !activeWorkspaceId) return;

    void Promise.allSettled([
      fetchDocs(),
      fetchChannels(),
      fetchTransactions(activeWorkspaceId),
    ]);
  }, [userId, activeWorkspaceId, fetchDocs, fetchChannels, fetchTransactions]);
};
