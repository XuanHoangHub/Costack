import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Space } from '@/types';

interface SpaceState {
  spaces: Space[];
  activeSpaceId: string | null;
  activeListId: string | null;
  setSpaces: (spaces: Space[] | ((prev: Space[]) => Space[])) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  addSpace: (space: Space) => void;
  updateSpace: (space: Space) => void;
  deleteSpace: (id: string) => void;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => ({
      spaces: [],
      activeSpaceId: null,
      activeListId: null,
      setSpaces: (spaces) => set({ spaces: typeof spaces === 'function' ? spaces(get().spaces) : spaces }),
      setActiveSpaceId: (id) => set({ activeSpaceId: id }),
      setActiveListId: (id) => set({ activeListId: id }),
      addSpace: (space) => set((state) => ({ spaces: [...state.spaces, space] })),
      updateSpace: (updated) =>
        set((state) => ({
          spaces: state.spaces.map((s) => (s.id === updated.id ? updated : s)),
        })),
      deleteSpace: (id) =>
        set((state) => ({
          spaces: state.spaces.filter((s) => s.id !== id),
        })),
    }),
    {
      name: 'avaxa_spaces',
    }
  )
);
