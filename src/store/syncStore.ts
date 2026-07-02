import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SyncLog, Task, Document, User } from '@/types';

interface SyncState {
  syncLogs: SyncLog[];
  isOffline: boolean;
  syncing: boolean;
  syncProgress: number;
  offlineTasksQueue: Record<string, Task>;
  offlineDocsQueue: Record<string, Document>;
  offlineMembersQueue: Record<string, User>;
  offlineDeletedTasks: string[];
  offlineDeletedDocs: string[];
  offlineDeletedMembers: string[];
  addSyncLog: (action: string | ((prev: SyncLog[]) => SyncLog[])) => void;
  clearSyncLogs: () => void;
  setIsOffline: (offline: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: number | ((prev: number) => number)) => void;
  setOfflineTasksQueue: (queue: Record<string, Task> | ((prev: Record<string, Task>) => Record<string, Task>)) => void;
  setOfflineDocsQueue: (queue: Record<string, Document> | ((prev: Record<string, Document>) => Record<string, Document>)) => void;
  setOfflineMembersQueue: (queue: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void;
  setOfflineDeletedTasks: (ids: string[] | ((prev: string[]) => string[])) => void;
  setOfflineDeletedDocs: (ids: string[] | ((prev: string[]) => string[])) => void;
  setOfflineDeletedMembers: (ids: string[] | ((prev: string[]) => string[])) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      syncLogs: [
        { id: 'l1', action: 'Initialized Avaxa OS Engine', time: '09:00 AM', status: 'synced' },
        { id: 'l2', action: 'Synchronized real-time collaboration channels', time: '09:05 AM', status: 'synced' },
      ],
      isOffline: false,
      syncing: false,
      syncProgress: 0,
      offlineTasksQueue: {},
      offlineDocsQueue: {},
      offlineMembersQueue: {},
      offlineDeletedTasks: [],
      offlineDeletedDocs: [],
      offlineDeletedMembers: [],
      addSyncLog: (action) => {
        if (typeof action === 'function') {
          set({ syncLogs: action(get().syncLogs) });
        } else {
          const newLog: SyncLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            action,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: 'synced',
          };
          set((state) => ({ syncLogs: [...state.syncLogs, newLog] }));
        }
      },
      clearSyncLogs: () => set({ syncLogs: [] }),
      setIsOffline: (isOffline) => set({ isOffline }),
      setSyncing: (syncing) => set({ syncing }),
      setSyncProgress: (syncProgress) => set({ syncProgress: typeof syncProgress === 'function' ? syncProgress(get().syncProgress) : syncProgress }),
      setOfflineTasksQueue: (offlineTasksQueue) => set({ offlineTasksQueue: typeof offlineTasksQueue === 'function' ? offlineTasksQueue(get().offlineTasksQueue) : offlineTasksQueue }),
      setOfflineDocsQueue: (offlineDocsQueue) => set({ offlineDocsQueue: typeof offlineDocsQueue === 'function' ? offlineDocsQueue(get().offlineDocsQueue) : offlineDocsQueue }),
      setOfflineMembersQueue: (offlineMembersQueue) => set({ offlineMembersQueue: typeof offlineMembersQueue === 'function' ? offlineMembersQueue(get().offlineMembersQueue) : offlineMembersQueue }),
      setOfflineDeletedTasks: (offlineDeletedTasks) => set({ offlineDeletedTasks: typeof offlineDeletedTasks === 'function' ? offlineDeletedTasks(get().offlineDeletedTasks) : offlineDeletedTasks }),
      setOfflineDeletedDocs: (offlineDeletedDocs) => set({ offlineDeletedDocs: typeof offlineDeletedDocs === 'function' ? offlineDeletedDocs(get().offlineDeletedDocs) : offlineDeletedDocs }),
      setOfflineDeletedMembers: (offlineDeletedMembers) => set({ offlineDeletedMembers: typeof offlineDeletedMembers === 'function' ? offlineDeletedMembers(get().offlineDeletedMembers) : offlineDeletedMembers }),
    }),
    {
      name: 'avaxa_sync_logs',
      partialize: (state) => ({ 
        syncLogs: state.syncLogs.slice(-50),
        isOffline: state.isOffline,
        syncing: state.syncing,
        syncProgress: state.syncProgress,
      }),
    }
  )
);
