import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Space, SpaceList } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';

interface SpaceState {
  spaces: Space[];
  activeSpaceId: string | null;
  activeListId: string | null;
  isLoading: boolean;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  addSpace: (space: Space) => Promise<void>;
  fetchSpacesFromSupabase: () => Promise<void>;
  subscribeToSpaces: () => () => void;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => ({
      spaces: [],
      activeSpaceId: null,
      activeListId: null,
      isLoading: false,
      setSpaces: (spaces) => set({ spaces }),
      setActiveSpaceId: (id) => set({ activeSpaceId: id }),
      setActiveListId: (id) => set({ activeListId: id }),

      addSpace: async (space) => {
        set((state) => ({ spaces: [...state.spaces, space] }));

        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from('spaces').insert({
            id: space.id,
            name: space.name,
            emoji: space.emoji || '📦',
            theme_color: space.themeColor || '#6366f1',
            workspace_id: space.workspaceId,
            user_id: session?.user?.id || null,
          });

          if (space.lists && space.lists.length > 0) {
            const listsPayload = space.lists.map((l) => ({
              id: l.id,
              name: l.name,
              space_id: space.id,
              user_id: session?.user?.id || null,
            }));
            await supabase.from('lists').insert(listsPayload);
          }
        } catch (e) {
          console.log('Error inserting space to Supabase:', e);
        }
      },

      fetchSpacesFromSupabase: async () => {
        try {
          set({ isLoading: true });
          const { data: dbSpaces, error: spacesErr } = await supabase
            .from('spaces')
            .select('*')
            .order('created_at', { ascending: true });
          const { data: dbLists } = await supabase.from('lists').select('*');

          if (!spacesErr && dbSpaces) {
            const formatted: Space[] = dbSpaces.map((s: any) => {
              const remoteLists: SpaceList[] = (dbLists || [])
                .filter((l: any) => l.space_id === s.id)
                .map((l: any) => ({
                  id: l.id,
                  name: l.name,
                  folderId: l.folder_id,
                  position: l.position || 0,
                }));

              return {
                id: s.id,
                name: s.name,
                description: s.description,
                emoji: s.emoji || '📦',
                themeColor: s.theme_color || s.themeColor || '#6366f1',
                workspaceId: s.workspace_id,
                lists: remoteLists,
              };
            });

            set({ spaces: formatted });
          }
        } catch (e) {
          console.log('Error fetching spaces from Supabase:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      subscribeToSpaces: () => {
        const channel = getCleanChannel('realtime-spaces-mobile')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'spaces' },
            () => {
              get().fetchSpacesFromSupabase();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'lists' },
            () => {
              get().fetchSpacesFromSupabase();
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
      name: 'apexa_mobile_spaces',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
