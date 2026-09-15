import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DocumentItem } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useWorkspaceStore } from './workspaceStore';
import { mapDocumentRow, toDocumentContent } from '../api/mappers';

interface DocState {
  docs: DocumentItem[];
  isLoading: boolean;
  addDoc: (doc: Partial<DocumentItem>) => Promise<void>;
  updateDoc: (id: string, updates: Partial<DocumentItem>) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  fetchDocsFromSupabase: () => Promise<void>;
  subscribeToDocs: () => () => void;
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      docs: [],
      isLoading: false,

      addDoc: async (doc) => {
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        const newId = `doc-${Date.now()}`;
        const draft: DocumentItem = {
          id: newId,
          title: doc.title || 'Tài liệu không tên',
          content: doc.content || '',
          category: doc.category || 'General',
          emoji: doc.emoji || '📄',
          updatedAt: new Date().toISOString(),
          isFavorite: doc.isFavorite || false,
          workspaceId: activeWorkspaceId,
        };

        set((state) => ({ docs: [draft, ...state.docs] }));

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) throw new Error('Bạn cần đăng nhập để tạo tài liệu.');
          const payload = {
            id: newId,
            title: draft.title,
            workspace_id: activeWorkspaceId,
            content: typeof draft.content === 'string' ? draft.content : JSON.stringify(draft.content),
            category: draft.category,
            updatedAt: draft.updatedAt,
            updatedBy: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Thành viên',
            user_id: session.user.id,
          };
          const { error } = await supabase.from('docs').insert([payload]);
          if (error) throw error;
        } catch (e) {
          console.log('Error inserting doc to Supabase:', e);
        }
      },

      updateDoc: async (id, updates) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          docs: state.docs.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: nowIso } : d
          ),
        }));

        try {
          const payload: any = {
            updatedAt: nowIso,
          };
          if (updates.title !== undefined) payload.title = updates.title;
          if (updates.content !== undefined) {
            payload.content = typeof updates.content === 'string' ? updates.content : JSON.stringify(updates.content);
          }
          if (updates.category !== undefined) payload.category = updates.category;

          const { error } = await supabase
            .from('docs')
            .update(payload)
            .eq('id', id);
          if (error) throw error;
        } catch (e) {
          console.log('Error updating doc in Supabase:', e);
        }
      },

      deleteDoc: async (id) => {
        set((state) => ({ docs: state.docs.filter((d) => d.id !== id) }));

        try {
          const { error } = await supabase.from('docs').delete().eq('id', id);
          if (error) throw error;
        } catch (e) {
          console.log('Error deleting doc from Supabase:', e);
        }
      },

      fetchDocsFromSupabase: async () => {
        try {
          set({ isLoading: true });
          const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
          let query = supabase
            .from('docs')
            .select('*')
            .neq('category', 'System')
            .order('created_at', { ascending: false });

          if (workspaceId) {
            query = query.eq('workspace_id', workspaceId);
          }
          const { data, error } = await query;

          if (error) throw error;
          set({ docs: (data || []).map(mapDocumentRow) });
        } catch (e) {
          console.log('Error fetching docs from Supabase:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      subscribeToDocs: () => {
        const channel = getCleanChannel('realtime-docs-mobile')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'docs' },
            () => {
              get().fetchDocsFromSupabase();
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
      name: 'apexa_mobile_docs',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
