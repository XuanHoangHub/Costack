import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Space, SpaceList } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useWorkspaceStore } from './workspaceStore';

export const DEFAULT_MARKETING_SPACE: Space = {
  id: 's-1789191738195',
  name: 'Marketing',
  emoji: 'Rocket:indigo',
  themeColor: '#0ea5e9',
  workspaceId: 'w2',
  lists: [
    {
      id: 'l-1789191738195',
      name: 'General Tasks',
      position: 0,
    },
  ],
};

interface SpaceState {
  spaces: Space[];
  activeSpaceId: string | null;
  activeListId: string | null;
  isLoading: boolean;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  addSpace: (space: Space) => Promise<void>;
  updateSpace: (spaceId: string, updates: Partial<Space>) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  addList: (spaceId: string, name: string) => Promise<void>;
  deleteList: (spaceId: string, listId: string) => Promise<void>;
  fetchSpacesFromSupabase: () => Promise<void>;
  subscribeToSpaces: () => () => void;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => ({
      spaces: [DEFAULT_MARKETING_SPACE],
      activeSpaceId: DEFAULT_MARKETING_SPACE.id,
      activeListId: DEFAULT_MARKETING_SPACE.lists?.[0]?.id || null,
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
            theme_color: space.themeColor || '#2563eb',
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

      updateSpace: async (spaceId, updates) => {
        set((state) => ({
          spaces: state.spaces.map((s) => (s.id === spaceId ? { ...s, ...updates } : s)),
        }));
        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
          if (updates.themeColor !== undefined) dbUpdates.theme_color = updates.themeColor;
          if (updates.description !== undefined) dbUpdates.description = updates.description;
          if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('spaces').update(dbUpdates).eq('id', spaceId);
          }
        } catch (e) {
          console.log('Error updating space:', e);
        }
      },

      deleteSpace: async (spaceId) => {
        set((state) => ({
          spaces: state.spaces.filter((s) => s.id !== spaceId),
          activeSpaceId: state.activeSpaceId === spaceId ? null : state.activeSpaceId,
          activeListId: state.activeSpaceId === spaceId ? null : state.activeListId,
        }));
        try {
          await supabase.from('lists').delete().eq('space_id', spaceId);
          await supabase.from('spaces').delete().eq('id', spaceId);
        } catch (e) {
          console.log('Error deleting space:', e);
        }
      },

      addList: async (spaceId, name) => {
        const newList: SpaceList = {
          id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name.trim(),
          position: 0,
        };
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id !== spaceId) return s;
            const currentLists = s.lists || [];
            return {
              ...s,
              lists: [...currentLists, newList],
            };
          }),
        }));
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from('lists').insert({
            id: newList.id,
            name: newList.name,
            space_id: spaceId,
            user_id: session?.user?.id || null,
          });
        } catch (e) {
          console.log('Error adding list to Supabase:', e);
        }
      },

      deleteList: async (spaceId, listId) => {
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id !== spaceId) return s;
            return {
              ...s,
              lists: (s.lists || []).filter((l) => l.id !== listId),
            };
          }),
          activeListId: state.activeListId === listId ? null : state.activeListId,
        }));
        try {
          await supabase.from('lists').delete().eq('id', listId);
        } catch (e) {
          console.log('Error deleting list from Supabase:', e);
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

          if (!spacesErr && dbSpaces && dbSpaces.length > 0) {
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
                themeColor: s.theme_color || s.themeColor || '#2563eb',
                workspaceId: s.workspace_id,
                lists: remoteLists,
              };
            });

            set({ spaces: formatted });

            // Auto-synchronize active space with the active workspace
            const activeWsId = useWorkspaceStore.getState().activeWorkspaceId;
            const currentSpaceId = get().activeSpaceId;
            const matchingSpaces = formatted.filter((s) => !activeWsId || s.workspaceId === activeWsId);

            if (
              matchingSpaces.length > 0 &&
              (!currentSpaceId || !matchingSpaces.some((s) => s.id === currentSpaceId))
            ) {
              const targetSpace = matchingSpaces[0];
              set({
                activeSpaceId: targetSpace.id,
                activeListId: targetSpace.lists?.[0]?.id || null,
              });
            }
          } else if (get().spaces.length === 0) {
            set({
              spaces: [DEFAULT_MARKETING_SPACE],
              activeSpaceId: DEFAULT_MARKETING_SPACE.id,
              activeListId: DEFAULT_MARKETING_SPACE.lists?.[0]?.id || null,
            });
          }
        } catch (e) {
          console.log('Error fetching spaces from Supabase:', e);
          if (get().spaces.length === 0) {
            set({
              spaces: [DEFAULT_MARKETING_SPACE],
              activeSpaceId: DEFAULT_MARKETING_SPACE.id,
              activeListId: DEFAULT_MARKETING_SPACE.lists?.[0]?.id || null,
            });
          }
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
