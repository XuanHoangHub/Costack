import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, SubTask, TaskAttachment } from '@/types';

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      setTasks: (tasks) => set({ tasks: typeof tasks === 'function' ? tasks(get().tasks) : tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (updated) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t)),
        })),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'apexa_tasks',
    }
  )
);
