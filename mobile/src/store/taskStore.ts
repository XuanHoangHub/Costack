import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, TaskStatus, Priority } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useWorkspaceStore } from './workspaceStore';
import { mapTaskRow } from '../api/mappers';

export type TaskFilterType = 'all' | 'dueToday' | 'overdue' | 'highPriority' | 'assignedToMe';

interface TaskState {
  tasks: Task[];
  filter: TaskFilterType;
  searchQuery: string;
  isLoading: boolean;
  setTasks: (tasks: Task[]) => void;
  setFilter: (filter: TaskFilterType) => void;
  setSearchQuery: (q: string) => void;
  addTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (task: Task) => Promise<void>;
  softDeleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  fetchTasksFromSupabase: () => Promise<void>;
  subscribeToTasks: () => () => void;
}

export const DEFAULT_STARTER_TASKS: Task[] = [
  {
    id: 'task-1c35ee45-a2fc-4cf2-bbcf-eb3d276202fd',
    title: 'Demo',
    description: 'Nhiệm vụ kiểm thử hệ thống Supabase & Spaces',
    priority: 'medium',
    status: 'todo',
    workspaceId: 'w2',
    spaceId: 's-1789191738195',
    listId: 'l-1789191738195',
    createdAt: '2026-09-12T05:42:31.326Z',
    progress: 0,
    tags: ['Demo', 'Mobile'],
    commentsCount: 0,
    comments: [],
    subtasks: [],
  },
  {
    id: 'task-1786506727984',
    title: 'Design Tokens & Dark Mode Theme Spec',
    description: 'Thiết kế hệ thống giao diện dark mode và tokens',
    priority: 'high',
    status: 'inprogress',
    workspaceId: 'w2',
    spaceId: 's-1789191738195',
    listId: 'l-1789191738195',
    createdAt: '2026-09-10T12:00:00.000Z',
    progress: 50,
    tags: ['UI/UX', 'Design'],
    commentsCount: 0,
    comments: [],
    subtasks: [],
  },
];

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: DEFAULT_STARTER_TASKS,
      filter: 'all',
      searchQuery: '',
      isLoading: false,
      setTasks: (tasks) => set({ tasks }),
      setFilter: (filter) => set({ filter }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      addTask: async (taskData) => {
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: taskData.title || 'Công việc mới',
          description: taskData.description || '',
          priority: taskData.priority || 'medium',
          status: taskData.status || 'todo',
          dueDate: taskData.dueDate,
          assigneeId: taskData.assigneeId,
          assigneeIds: taskData.assigneeIds || (taskData.assigneeId ? [taskData.assigneeId] : []),
          subtasks: taskData.subtasks || [],
          progress: 0,
          createdAt: new Date().toISOString(),
          commentsCount: 0,
          tags: taskData.tags || [],
          workspaceId: activeWorkspaceId,
          spaceId: taskData.spaceId,
          listId: taskData.listId,
          comments: [],
        };

        // Optimistic UI update
        set((state) => ({ tasks: [newTask, ...state.tasks] }));

        // Sync with Supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const payload = {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            status: newTask.status,
            dueDate: newTask.dueDate || null,
            startDate: newTask.startDate || null,
            assigneeId: newTask.assigneeId || null,
            assigneeIds: newTask.assigneeIds || [],
            subtasks: newTask.subtasks || [],
            progress: newTask.progress || 0,
            created_at: newTask.createdAt,
            commentsCount: 0,
            tags: newTask.tags || [],
            comments: [],
            user_id: session?.user?.id || null,
            workspace_id: activeWorkspaceId,
            space_id: newTask.spaceId || null,
            list_id: newTask.listId || null,
          };

          const { error } = await supabase.from('tasks').insert([payload]);
          if (error) throw error;
        } catch (e) {
          console.log('Supabase insert task error (offline mode active):', e);
        }

        return newTask;
      },

      updateTask: async (updated) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t)),
        }));

        try {
          const updatePayload = {
            title: updated.title,
            description: updated.description,
            priority: updated.priority,
            status: updated.status,
            dueDate: updated.dueDate || null,
            startDate: updated.startDate || null,
            assigneeId: updated.assigneeId || null,
            assigneeIds: updated.assigneeIds || (updated.assigneeId ? [updated.assigneeId] : []),
            subtasks: updated.subtasks || [],
            progress: updated.progress || 0,
            completedAt: updated.completedAt || null,
            comments: updated.comments || [],
            commentsCount: updated.comments?.length || updated.commentsCount || 0,
            tags: updated.tags || [],
            space_id: updated.spaceId || null,
            list_id: updated.listId || null,
          };

          const { error } = await supabase
            .from('tasks')
            .update(updatePayload)
            .eq('id', updated.id);

          if (error) throw error;
        } catch (e) {
          console.log('Supabase update task error:', e);
        }
      },

      softDeleteTask: async (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));

        try {
          await supabase
            .from('tasks')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        } catch (e) {
          console.log('Supabase delete task error:', e);
        }
      },

      toggleTaskStatus: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
        const updated: Task = {
          ...task,
          status: nextStatus,
          progress: nextStatus === 'completed' ? 100 : 0,
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
        };

        await get().updateTask(updated);
      },

      toggleSubtask: async (taskId, subtaskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        const updatedSubtasks = (task.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        const completedCount = updatedSubtasks.filter((s) => s.completed).length;
        const progress = updatedSubtasks.length > 0
          ? Math.round((completedCount / updatedSubtasks.length) * 100)
          : task.progress;

        const updated: Task = {
          ...task,
          subtasks: updatedSubtasks,
          progress,
        };

        await get().updateTask(updated);
      },

      fetchTasksFromSupabase: async () => {
        try {
          set({ isLoading: true });
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            set({ tasks: data.map(mapTaskRow) });
          } else if (!error && data && data.length === 0 && get().tasks.length === 0) {
            set({ tasks: DEFAULT_STARTER_TASKS });
          }
        } catch (e) {
          console.log('Error fetching tasks from Supabase:', e);
          if (get().tasks.length === 0) {
            set({ tasks: DEFAULT_STARTER_TASKS });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      subscribeToTasks: () => {
        const channel = getCleanChannel('realtime-tasks-mobile')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const t = payload.new as any;
                if (!t || !t.id) return;
                if (t.deleted_at) return;

                const mapped = mapTaskRow(t);

                set((state) => {
                  if (state.tasks.some((item) => item.id === mapped.id)) {
                    return {
                      tasks: state.tasks.map((item) => (item.id === mapped.id ? mapped : item)),
                    };
                  }
                  return { tasks: [mapped, ...state.tasks] };
                });
              } else if (payload.eventType === 'UPDATE') {
                const t = payload.new as any;
                if (!t || !t.id) return;

                if (t.deleted_at) {
                  set((state) => ({
                    tasks: state.tasks.filter((item) => item.id !== t.id),
                  }));
                  return;
                }

                const mapped = mapTaskRow(t);
                set((state) => ({ tasks: state.tasks.map((item) => item.id === t.id ? { ...item, ...mapped } : item) }));
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as any)?.id;
                if (deletedId) {
                  set((state) => ({
                    tasks: state.tasks.filter((item) => item.id !== deletedId),
                  }));
                }
              }
            }
          )
          .subscribe((status) => {
            if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !supabase.realtime.isConnected()) {
              supabase.realtime.connect();
            }
          });

        return () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      },
    }),
    {
      name: 'apexa_mobile_tasks',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
