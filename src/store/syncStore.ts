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
        { id: 'l1', action: 'Đã khởi tạo Không gian làm việc', time: '08:30:00', status: 'synced', userName: 'Chủ sở hữu', category: 'workspace' },
        { id: 'l2', action: 'Đã tạo Không gian: Dự án chính', time: '08:35:12', status: 'synced', userName: 'Chủ sở hữu', category: 'space' },
        { id: 'l3', action: 'Đã thiết lập danh sách công việc', time: '08:40:05', status: 'synced', userName: 'Chủ sở hữu', category: 'task' },
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
          // Filter out low-level backend/Supabase/network messages
          const isTechnical = 
            action.includes('Supabase') ||
            action.includes('supabase') ||
            action.includes('database') ||
            action.includes('cloud server') ||
            action.includes('compatibility mode') ||
            action.includes('realtime-') ||
            action.includes('Realtime sync') ||
            action.includes('System merge') ||
            action.includes('offline changes') ||
            action.includes('offline cache') ||
            action.includes('storage synchronized') ||
            action.includes('Entered List:') ||
            action.includes('sorting order');

          if (isTechnical) return;

          const newLog: SyncLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            action,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            status: 'synced',
            userName: 'Chủ sở hữu',
            category: 'workspace'
          };
          set((state) => ({ 
            syncLogs: [
              newLog, 
              ...state.syncLogs.filter(l => 
                !l.action.includes('Supabase') && 
                !l.action.includes('supabase') && 
                !l.action.includes('Realtime sync') &&
                !l.action.includes('storage synchronized') &&
                !l.action.includes('cloud server') &&
                !l.action.includes('compatibility mode') &&
                !l.action.includes('Entered List:')
              )
            ].slice(0, 100) 
          }));
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
      name: 'apexa_sync_logs',
      partialize: (state) => ({ 
        syncLogs: state.syncLogs.filter(l => 
          !l.action.includes('Supabase') && 
          !l.action.includes('supabase') && 
          !l.action.includes('Realtime sync') &&
          !l.action.includes('storage synchronized') &&
          !l.action.includes('cloud server') &&
          !l.action.includes('compatibility mode') &&
          !l.action.includes('Entered List:')
        ).slice(0, 100),
        isOffline: state.isOffline,
        syncing: state.syncing,
        syncProgress: state.syncProgress,
      }),
    }
  )
);
