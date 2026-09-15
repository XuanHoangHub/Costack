import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Workspace, Space } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useSpaceStore } from './spaceStore';

interface WorkspaceState {
  activeWorkspaceId: string;
  workspaces: Workspace[];
  setActiveWorkspaceId: (id: string) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  fetchWorkspacesFromSupabase: () => Promise<void>;
  addWorkspace: (workspaceData: { name: string; theme?: string; logoUrl?: string }) => Promise<void>;
  updateWorkspace: (id: string, updates: { name?: string; theme?: string; logoUrl?: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  subscribeToWorkspaces: () => () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeWorkspaceId: '',
      workspaces: [],

      setActiveWorkspaceId: (id: string) => {
        set({ activeWorkspaceId: id });

        // Synchronize active space and list with target workspace's spaces
        const currentSpaces = useSpaceStore.getState().spaces;
        const targetSpaces = currentSpaces.filter((s) => s.workspaceId === id);
        if (targetSpaces.length > 0) {
          useSpaceStore.getState().setActiveSpaceId(targetSpaces[0].id);
          useSpaceStore.getState().setActiveListId(targetSpaces[0].lists?.[0]?.id || null);
        } else {
          useSpaceStore.getState().setActiveSpaceId(null);
          useSpaceStore.getState().setActiveListId(null);
        }
      },

      setWorkspaces: (workspaces) => set({ workspaces }),

      fetchWorkspacesFromSupabase: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const currentUserId = session?.user?.id;

          const [wsRes, memRes] = await Promise.allSettled([
            supabase.from('workspaces').select('*').order('created_at', { ascending: true }),
            supabase.from('workspace_memberships').select('*'),
          ]);

          const wsData = wsRes.status === 'fulfilled' && !wsRes.value.error ? wsRes.value.data : null;
          const memData = memRes.status === 'fulfilled' && !memRes.value.error ? memRes.value.data : [];

          if (wsData) {
            const mapped: Workspace[] = wsData.map((w: any) => {
              const userMembership = (memData || []).find(
                (m: any) => m.workspace_id === w.id && m.user_id === currentUserId
              );
              const role = userMembership?.role || (w.user_id === currentUserId ? 'owner' : 'member');
              const memberCount = (memData || []).filter((m: any) => m.workspace_id === w.id).length;

              return {
                id: w.id,
                name: w.name || 'Workspace',
                theme: w.theme || 'indigo',
                initial: w.initial || (w.name ? w.name.charAt(0).toUpperCase() : 'W'),
                user_id: w.user_id,
                created_at: w.created_at,
                coverUrl: w.coverUrl || '',
                logoUrl: w.logoUrl || '',
                settings: w.settings || {},
                role: role as any,
                memberCount: memberCount > 0 ? memberCount : 1,
              };
            });

            set({ workspaces: mapped });

            const currentActive = get().activeWorkspaceId;
            if (mapped.length > 0 && (!currentActive || !mapped.some((w) => w.id === currentActive))) {
              get().setActiveWorkspaceId(mapped[0].id);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch workspaces from Supabase:', err);
        }
      },

      addWorkspace: async (workspaceData: { name: string; theme?: string; logoUrl?: string }) => {
        const newId = `ws-${Date.now()}`;
        const trimmedName = workspaceData.name.trim();
        const theme = workspaceData.theme || 'indigo';
        const initial = trimmedName.charAt(0).toUpperCase();

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          const newWs: Workspace = {
            id: newId,
            name: trimmedName,
            theme,
            initial,
            user_id: userId,
            logoUrl: workspaceData.logoUrl || '',
            role: 'owner',
            memberCount: 1,
            created_at: new Date().toISOString(),
          };

          // Optimistic UI update
          set((s) => ({
            workspaces: [...s.workspaces, newWs],
          }));
          get().setActiveWorkspaceId(newId);

          // 1. Insert into workspaces
          await supabase.from('workspaces').insert([
            {
              id: newId,
              name: trimmedName,
              theme,
              initial,
              user_id: userId,
              logoUrl: workspaceData.logoUrl || null,
            },
          ]);

          // 2. Insert into workspace_memberships as owner
          if (userId) {
            await supabase.from('workspace_memberships').insert([
              {
                workspace_id: newId,
                user_id: userId,
                role: 'owner',
                status: 'active',
              },
            ]);

            // 3. Update member's workspace_ids array in members table
            const { data: memberProfile } = await supabase
              .from('members')
              .select('workspace_ids')
              .or(`id.eq.user-${userId},user_id.eq.${userId}`)
              .maybeSingle();

            if (memberProfile) {
              const existingIds: string[] = memberProfile.workspace_ids || [];
              if (!existingIds.includes(newId)) {
                await supabase
                  .from('members')
                  .update({ workspace_ids: [...existingIds, newId] })
                  .or(`id.eq.user-${userId},user_id.eq.${userId}`);
              }
            }
          }

          // 4. Automatically create default Space and Lists for this workspace
          const defaultSpaceId = `sp-${newId}-${Date.now()}`;
          const starterLists = [
            { id: `l-${newId}-todo`, name: 'Cần làm' },
            { id: `l-${newId}-inprogress`, name: 'Đang làm' },
            { id: `l-${newId}-completed`, name: 'Hoàn thành' },
          ];

          const starterSpace: Space = {
            id: defaultSpaceId,
            name: `${trimmedName} Space`,
            emoji: '🚀',
            themeColor:
              theme === 'ocean'
                ? '#0ea5e9'
                : theme === 'sunset'
                ? '#f59e0b'
                : theme === 'emerald'
                ? '#10b981'
                : theme === 'rose'
                ? '#f43f5e'
                : '#6366f1',
            workspaceId: newId,
            lists: starterLists,
          };

          await useSpaceStore.getState().addSpace(starterSpace);
          useSpaceStore.getState().setActiveSpaceId(defaultSpaceId);
          useSpaceStore.getState().setActiveListId(starterLists[0].id);
        } catch (e) {
          console.warn('Error saving workspace to Supabase:', e);
        }
      },

      updateWorkspace: async (id: string, updates: { name?: string; theme?: string; logoUrl?: string }) => {
        const currentWs = get().workspaces.find((w) => w.id === id);
        if (!currentWs) return;

        const newName = updates.name !== undefined ? updates.name.trim() : currentWs.name;
        const newTheme = updates.theme || currentWs.theme;
        const newLogo = updates.logoUrl !== undefined ? updates.logoUrl : currentWs.logoUrl;
        const newInitial = newName ? newName.charAt(0).toUpperCase() : currentWs.initial;

        const updated: Workspace = {
          ...currentWs,
          name: newName,
          theme: newTheme,
          logoUrl: newLogo,
          initial: newInitial,
        };

        set((s) => ({
          workspaces: s.workspaces.map((w) => (w.id === id ? updated : w)),
        }));

        try {
          const { error } = await supabase
            .from('workspaces')
            .update({
              name: newName,
              theme: newTheme,
              initial: newInitial,
              logoUrl: newLogo || null,
            })
            .eq('id', id);

          if (error) {
            console.warn('Error updating workspace:', error.message);
          }
        } catch (e) {
          console.warn('Exception updating workspace:', e);
        }
      },

      deleteWorkspace: async (id: string) => {
        const workspaces = get().workspaces;
        if (workspaces.length <= 1) {
          throw new Error('Bạn cần giữ lại ít nhất một Không gian làm việc.');
        }

        const remaining = workspaces.filter((w) => w.id !== id);
        const nextActiveId = get().activeWorkspaceId === id ? remaining[0].id : get().activeWorkspaceId;

        set({
          workspaces: remaining,
        });

        if (get().activeWorkspaceId === id) {
          get().setActiveWorkspaceId(nextActiveId);
        }

        try {
          await Promise.allSettled([
            supabase.from('workspaces').delete().eq('id', id),
            supabase.from('workspace_memberships').delete().eq('workspace_id', id),
            supabase.from('spaces').delete().eq('workspace_id', id),
            supabase.from('tasks').delete().eq('workspace_id', id),
            supabase.from('docs').delete().eq('workspace_id', id),
          ]);
        } catch (e) {
          console.warn('Exception deleting workspace:', e);
        }
      },

      subscribeToWorkspaces: () => {
        const channel = getCleanChannel('mobile-workspaces-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workspaces' },
            () => {
              get().fetchWorkspacesFromSupabase();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workspace_memberships' },
            () => {
              get().fetchWorkspacesFromSupabase();
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
      name: 'apexa_mobile_workspace',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
