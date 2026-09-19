import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Workspace, Space } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useSpaceStore } from './spaceStore';
import { useAuthStore } from './authStore';

export const DEFAULT_AVAXA_WORKSPACE: Workspace = {
  id: 'w2',
  name: 'Avaxa',
  theme: 'ocean',
  initial: 'A',
  user_id: 'd8c93bca-750a-4c79-9acc-61007b0ba261',
  created_at: '2026-06-15T11:37:11.445761+00:00',
  coverUrl: '',
  logoUrl:
    'https://zfyngidcwjijuogaygwe.supabase.co/storage/v1/object/public/avatars/d8c93bca-750a-4c79-9acc-61007b0ba261/workspaces/w2_avatar_1782787127482.jpg',
  settings: {
    defaultClickApps: {
      subtasks: true,
      priorities: true,
      customFields: true,
      timeTracking: true,
      relationships: true,
      multipleAssignees: true,
    },
  },
  role: 'owner',
  memberCount: 4,
};

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
      activeWorkspaceId: 'w2',
      workspaces: [DEFAULT_AVAXA_WORKSPACE],

      setActiveWorkspaceId: (id: string) => {
        if (!id) return;
        set({ activeWorkspaceId: id });

        // Synchronize active space and list with target workspace's spaces
        const currentSpaces = useSpaceStore.getState().spaces;
        const targetSpaces = currentSpaces.filter((s) => s.workspaceId === id);
        if (targetSpaces.length > 0) {
          useSpaceStore.getState().setActiveSpaceId(targetSpaces[0].id);
          useSpaceStore.getState().setActiveListId(targetSpaces[0].lists?.[0]?.id || null);
        }
      },

      setWorkspaces: (workspaces) => set({ workspaces }),

      fetchWorkspacesFromSupabase: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const currentAuthUser = useAuthStore.getState().currentUser;
          const currentUserId = session?.user?.id || currentAuthUser?.id;
          const userEmail = session?.user?.email || currentAuthUser?.email;

          // 1. Concurrently query workspaces, memberships, and member profile
          const [wsRes, memRes, profileRes] = await Promise.allSettled([
            supabase.from('workspaces').select('*').order('created_at', { ascending: true }),
            supabase.from('workspace_memberships').select('*'),
            currentUserId
              ? supabase
                  .from('members')
                  .select('workspace_ids')
                  .or(`user_id.eq.${currentUserId},id.eq.user-${currentUserId}${userEmail ? `,email.eq.${userEmail}` : ''}`)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

          let rawWorkspaces: any[] =
            wsRes.status === 'fulfilled' && !wsRes.value.error && Array.isArray(wsRes.value.data)
              ? wsRes.value.data
              : [];
          const memData: any[] =
            memRes.status === 'fulfilled' && !memRes.value.error && Array.isArray(memRes.value.data)
              ? memRes.value.data
              : [];
          const memberProfile =
            profileRes.status === 'fulfilled' && !profileRes.value.error ? profileRes.value.data : null;
          const allowedIds: string[] = Array.isArray(memberProfile?.workspace_ids)
            ? memberProfile.workspace_ids
            : [];

          // 2. If direct workspaces query missed allowedIds from profile, query explicitly
          if (allowedIds.length > 0) {
            const missingIds = allowedIds.filter((id) => !rawWorkspaces.some((w) => w.id === id));
            if (missingIds.length > 0) {
              const { data: additionalWs } = await supabase
                .from('workspaces')
                .select('*')
                .in('id', missingIds);
              if (additionalWs && additionalWs.length > 0) {
                rawWorkspaces = [...rawWorkspaces, ...additionalWs];
              }
            }
          }

          // 3. If authenticated user has 0 workspaces in DB (e.g. brand new user registration)
          if (rawWorkspaces.length === 0 && session?.user) {
            const fallbackWsId = `ws-${session.user.id.slice(0, 8)}-${Date.now()}`;
            const fallbackWs = {
              id: fallbackWsId,
              name: 'Personal Workspace',
              theme: 'indigo',
              initial: 'P',
              user_id: session.user.id,
            };
            try {
              await supabase.from('workspaces').insert([fallbackWs]);
              await supabase.from('workspace_memberships').insert([
                {
                  workspace_id: fallbackWsId,
                  user_id: session.user.id,
                  role: 'owner',
                  status: 'active',
                },
              ]);
              rawWorkspaces = [fallbackWs];
            } catch (e) {
              console.warn('Failed to auto-seed fallback workspace for new user:', e);
            }
          }

          // 4. Map workspaces
          if (rawWorkspaces.length > 0) {
            // Deduplicate by ID
            const uniqueMap = new Map<string, any>();
            rawWorkspaces.forEach((w) => {
              if (w?.id && !uniqueMap.has(w.id)) uniqueMap.set(w.id, w);
            });
            const uniqueWorkspaces = Array.from(uniqueMap.values());

            const mapped: Workspace[] = uniqueWorkspaces.map((w: any) => {
              const userMembership = memData.find(
                (m: any) => m.workspace_id === w.id && m.user_id === currentUserId
              );
              const role =
                userMembership?.role ||
                (w.user_id === currentUserId ? 'owner' : 'member');
              const memberCount = memData.filter((m: any) => m.workspace_id === w.id).length;

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

            // 5. Smart workspace selection
            const currentActive = get().activeWorkspaceId;
            let targetActiveId = currentActive;

            // If currentActive is invalid or not in mapped workspaces:
            if (!currentActive || !mapped.some((w) => w.id === currentActive)) {
              // Priority 1: 'w2' (the primary Avaxa workspace with all production tasks/spaces)
              if (mapped.some((w) => w.id === 'w2')) {
                targetActiveId = 'w2';
              }
              // Priority 2: First ID from user's memberProfile.workspace_ids
              else if (allowedIds.length > 0 && mapped.some((w) => w.id === allowedIds[0])) {
                targetActiveId = allowedIds[0];
              }
              // Priority 3: First available workspace
              else {
                targetActiveId = mapped[0].id;
              }
            }

            set({ workspaces: mapped });
            get().setActiveWorkspaceId(targetActiveId);
          } else {
            // Never clear workspaces to empty array in offline/demo mode
            if (get().workspaces.length === 0) {
              set({ workspaces: [DEFAULT_AVAXA_WORKSPACE] });
              get().setActiveWorkspaceId('w2');
            }
          }
        } catch (err) {
          console.warn('Failed to fetch workspaces from Supabase:', err);
          if (get().workspaces.length === 0) {
            set({ workspaces: [DEFAULT_AVAXA_WORKSPACE] });
            get().setActiveWorkspaceId('w2');
          }
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
                : '#2563eb',
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
