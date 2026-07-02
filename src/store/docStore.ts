import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Document } from '@/types';

interface DocState {
  docs: Document[];
  setDocs: (docs: Document[] | ((prev: Document[]) => Document[])) => void;
  addDoc: (doc: Document) => void;
  updateDoc: (doc: Document) => void;
  deleteDoc: (id: string) => void;
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      docs: [],
      setDocs: (docs) => set({ docs: typeof docs === 'function' ? docs(get().docs) : docs }),
      addDoc: (doc) => set((state) => ({ docs: [...state.docs, doc] })),
      updateDoc: (updated) =>
        set((state) => ({
          docs: state.docs.map((d) => (d.id === updated.id ? updated : d)),
        })),
      deleteDoc: (id) =>
        set((state) => ({
          docs: state.docs.filter((d) => d.id !== id),
        })),
    }),
    {
      name: 'avaxa_docs',
    }
  )
);
