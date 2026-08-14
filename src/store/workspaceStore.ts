import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  accentPreset: 'indigo' | 'ocean' | 'forest' | 'sunset';
  setWorkspaces: (workspaces: Workspace[] | ((prev: Workspace[]) => Workspace[])) => void;
  setActiveWorkspaceId: (id: string) => void;
  setAccentPreset: (preset: string) => void;
  addWorkspace: (ws: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [
        {
          id: 'w2',
          name: 'Personal Workspace',
          theme: 'indigo',
          initial: 'P',
          user_id: ''
        }
      ],
      activeWorkspaceId: 'w2',
      accentPreset: 'indigo',
      setWorkspaces: (workspaces) => set({ workspaces: typeof workspaces === 'function' ? workspaces(get().workspaces) : workspaces }),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      setAccentPreset: (preset) => set({ accentPreset: preset as any }),
      addWorkspace: (ws) => set((state) => ({ workspaces: [...state.workspaces, ws] })),
      updateWorkspace: (id, updates) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        })),
      deleteWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
        })),
    }),
    {
      name: 'apexa_workspaces',
    }
  )
);
