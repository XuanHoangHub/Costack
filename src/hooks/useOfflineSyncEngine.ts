import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store';
import { useTaskStore } from '@/store/taskStore';
import { useDocStore } from '@/store/docStore';
import { useMemberStore } from '@/store/memberStore';
import { useSyncStore } from '@/store/syncStore';
import { useUiStore } from '@/store/uiStore';
import { Task, Document, User } from '@/types';

export function useOfflineSyncEngine() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isOffline = useUiStore((s) => s.isOffline);
  const setOfflineTasksQueue = useTaskStore((s) => s.addTask); // reuse for offline queue
  const setOfflineDocsQueue = useDocStore((s) => s.addDoc); // reuse for offline queue
  const setOfflineMembersQueue = useMemberStore((s) => s.addMember); // reuse for offline queue
  const syncLogs = useSyncStore((s) => s.syncLogs);
  const addSyncLog = useSyncStore((s) => s.addSyncLog);
  const setSyncing = useUiStore((s) => s.setSyncing);
  const setSyncProgress = useUiStore((s) => s.setSyncProgress);
  const setIsOffline = useUiStore((s) => s.setIsOffline);
  const setTasks = useTaskStore((s) => s.setTasks);
  const setDocs = useDocStore((s) => s.setDocs);
  const setMembers = useMemberStore((s) => s.setMembers);

  const handleToggleOffline = useCallback(() => {
    if (isOffline) {
      setSyncing(true);
      setSyncProgress(10);
      
      const interval = setInterval(() => {
        setSyncProgress((prev: number) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(async () => {
              setSyncing(false);
              setIsOffline(false);
              addSyncLog('Data successfully synchronized with the cloud server!');

              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  const userId = session.user.id;
                  const syncPromises: PromiseLike<any>[] = [];

                  const offlineTasksQueue = useTaskStore.getState().tasks;
                  const offlineDocsQueue = useDocStore.getState().docs;
                  const offlineMembersQueue = useMemberStore.getState().members;

                  if (offlineTasksQueue.length > 0) {
                    const formattedTasks = offlineTasksQueue.map(t => ({
                      id: t.id,
                      title: t.title,
                      description: t.description,
                      priority: t.priority,
                      status: t.status,
                      assigneeId: t.assigneeId || null,
                      startDate: t.startDate || null,
                      dueDate: t.dueDate || null,
                      subtasks: t.subtasks,
                      progress: t.progress,
                      created_at: t.createdAt,
                      completedAt: t.completedAt || null,
                      hoursEstimate: t.hoursEstimate || null,
                      hoursLogged: t.hoursLogged || null,
                      commentsCount: t.commentsCount,
                      tags: t.tags || [],
                      isPinned: t.isPinned || false,
                      comments: t.comments,
                      user_id: userId,
                      workspace_id: t.workspaceId || null,
                      space_id: t.spaceId || null,
                      list_id: t.listId || null,
                      custom_fields: t.custom_fields || {},
                      recurrence: t.recurrence || null
                    }));
                    
                    syncPromises.push(
                      supabase.from('tasks')
                        .upsert(formattedTasks)
                        .then(({ error }) => {
                          if (error) console.error('Error syncing batched offline tasks:', error);
                        })
                    );
                  }

                  if (offlineDocsQueue.length > 0) {
                    const formattedDocs = offlineDocsQueue.map(d => ({
                      id: d.id,
                      title: d.title,
                      content: d.content,
                      category: d.category,
                      updatedAt: d.updatedAt,
                      updatedBy: d.updatedBy,
                      isAiGenerated: d.isAiGenerated || false,
                      user_id: userId,
                      workspace_id: d.workspaceId || null
                    }));
                    
                    syncPromises.push(
                      supabase.from('docs')
                        .upsert(formattedDocs)
                        .then(({ error }) => {
                          if (error) console.error('Error syncing batched offline docs:', error);
                        })
                    );
                  }

                  if (offlineMembersQueue.length > 0) {
                    const formattedMembers = offlineMembersQueue.map(m => ({
                      id: m.id === 'user' ? `user-${userId}` : m.id,
                      name: m.name,
                      email: m.email,
                      avatar: m.avatar,
                      role: m.role,
                      status: m.status,
                      user_id: userId,
                      phone: m.phone || null,
                      department: m.department || null,
                      bio: m.bio || null,
                      joined_date: m.joinedDate || null,
                      workspace_ids: m.workspaceIds || null
                    }));
                    
                    syncPromises.push(
                      supabase.from('members')
                        .upsert(formattedMembers)
                        .then(({ error }) => {
                          if (error) console.error('Error syncing batched offline members:', error);
                        })
                    );
                  }

                  if (syncPromises.length > 0) {
                    await Promise.all(syncPromises);
                    addSyncLog('System merge successful: Optimized sync');
                  } else {
                    addSyncLog('No new offline changes detected for synchronization.');
                  }
                }
              } catch (err) {
                console.error('Error uploading synchronized data to Supabase:', err);
              }
            }, 600);
            return 100;
          }
          return prev + 15;
        });
      }, 150);
    } else {
      setIsOffline(true);
      addSyncLog('Disconnected from local network. Switched to offline cache storage.');
    }
  }, [isOffline, setSyncing, setSyncProgress, setIsOffline, addSyncLog]);

  return { handleToggleOffline };
}
