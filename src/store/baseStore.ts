import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BaseApp } from '@/types';

interface BaseState {
  bases: BaseApp[];
  setBases: (bases: BaseApp[] | ((prev: BaseApp[]) => BaseApp[])) => void;
  addBase: (base: BaseApp) => void;
  updateBase: (base: BaseApp) => void;
  deleteBase: (id: string) => void;
}

export const useBaseStore = create<BaseState>()(
  persist(
    (set) => ({
      bases: [],
      setBases: (bases) => set((state) => ({ bases: typeof bases === 'function' ? bases(state.bases) : bases })),
      addBase: (base) => set((state) => ({ bases: [...state.bases, base] })),
      updateBase: (updated) =>
        set((state) => ({
          bases: state.bases.map((b) => (b.id === updated.id ? updated : b)),
        })),
      deleteBase: (id) =>
        set((state) => ({
          bases: state.bases.filter((b) => b.id !== id),
        })),
    }),
    {
      name: 'apexa_bases',
    }
  )
);
