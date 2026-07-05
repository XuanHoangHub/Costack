import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store';
import { useTaskStore } from '@/store/taskStore';
import { useDocStore } from '@/store/docStore';
import { useMemberStore } from '@/store/memberStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSpaceStore } from '@/store/spaceStore';
import { useBaseStore } from '@/store/baseStore';
import { useSyncStore } from '@/store/syncStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useUiStore } from '@/store/uiStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { Task, Document, User, Workspace, Space, BaseApp } from '@/types';

export function useSupabaseSync() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isOffline = useUiStore((s) => s.isOffline);
  const setTasks = useTaskStore((s) => s.setTasks);
  const setDocs = useDocStore((s) => s.setDocs);
  const setMembers = useMemberStore((s) => s.setMembers);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const setSpaces = useSpaceStore((s) => s.setSpaces);
  const addSyncLog = useSyncStore((s) => s.addSyncLog);
  const setDataLoaded = useRef(false);

  useEffect(() => {
    let active = true;
    if (!currentUser || isOffline) return;

    let tasksChannel: any = null;
    let docsChannel: any = null;
    let membersChannel: any = null;
    let workspacesChannel: any = null;
    let spacesChannel: any = null;
    let listsChannel: any = null;

    const loadAndSubscribe = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        const loadWorkspaces = async () => {
          try {
            const { data: dbWorkspaces, error: wsError } = await supabase
              .from('workspaces')
              .select('*')
              .eq('user_id', userId);

            if (!active) return;

            if (wsError) {
              console.warn('workspaces fetch failed:', wsError.message);
            } else {
              let finalWorkspaces = dbWorkspaces || [];
              const hasSeededWS = typeof window !== 'undefined' ? localStorage.getItem(`avaxa_seeded_workspaces_${userId}`) : null;

              if (finalWorkspaces.length === 0 && !hasSeededWS) {
                const initialWorkspaces = [
                  { id: 'w1', name: 'Personal', theme: 'indigo', initial: 'P', user_id: userId },
                  { id: 'w2', name: 'Avaxa Team OS', theme: 'ocean', initial: 'A', user_id: userId },
                  { id: 'w3', name: 'Product Launch', theme: 'sunset', initial: 'L', user_id: userId }
                ];
                const { data: seededWorkspaces } = await supabase.from('workspaces').insert(initialWorkspaces).select();
                if (seededWorkspaces) finalWorkspaces = seededWorkspaces;
                try { localStorage.setItem(`avaxa_seeded_workspaces_${userId}`, 'true'); } catch (e) {}
              }

              if (finalWorkspaces.length > 0) {
                setWorkspaces(finalWorkspaces.map(w => ({
                  id: w.id,
                  name: w.name,
                  theme: w.theme || 'indigo',
                  initial: w.initial || w.name.charAt(0).toUpperCase(),
                  user_id: w.user_id,
                  coverUrl: w.coverUrl || '',
                  logoUrl: w.logoUrl || '',
                  settings: w.settings || {}
                })));
              }
            }
          } catch (e) {
            console.warn('Exception querying workspaces:', e);
          }
        };

        await loadWorkspaces();

        const myMemberId = `user-${userId}`;
        const myName = currentUser?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Avaxa Champion';
        const myEmail = currentUser?.email || session.user.email || '';
        const myAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myName)}`;
        const myRole = currentUser?.role || ((session.user.email?.includes('admin') || session.user.email === 'hoang.benjamin.creative@gmail.com') ? 'admin' : 'member');

        const { data: dbMembers, error: membersErr } = await supabase
          .from('members')
          .select('*');

        if (!active) return;

        const finalMembers = dbMembers || [];
        const myDbProfile = finalMembers.find(m => m.id === myMemberId);

        if (!myDbProfile) {
          const newProfile = {
            id: myMemberId,
            name: myName,
            email: myEmail,
            avatar: myAvatar,
            role: myRole,
            status: 'online',
            user_id: userId,
            phone: session.user.user_metadata?.phone || null,
            department: session.user.user_metadata?.department || null,
            bio: session.user.user_metadata?.bio || null,
            joined_date: session.user.user_metadata?.joinedDate || '2026',
            workspace_ids: ['w1', 'w2', 'w3']
          };
          await supabase.from('members').upsert([newProfile], { onConflict: 'id' });
          finalMembers.push(newProfile);
        } else {
          const updatedFields: any = { status: 'online' };
          let needsUpdate = false;
          if (!myDbProfile.phone && session.user.user_metadata?.phone) { updatedFields.phone = session.user.user_metadata.phone; myDbProfile.phone = session.user.user_metadata.phone; needsUpdate = true; }
          if (!myDbProfile.department && session.user.user_metadata?.department) { updatedFields.department = session.user.user_metadata.department; myDbProfile.department = session.user.user_metadata.department; needsUpdate = true; }
          if (!myDbProfile.bio && session.user.user_metadata?.bio) { updatedFields.bio = session.user.user_metadata.bio; myDbProfile.bio = session.user.user_metadata.bio; needsUpdate = true; }
          if (!myDbProfile.joined_date && session.user.user_metadata?.joinedDate) { updatedFields.joined_date = session.user.user_metadata.joinedDate; myDbProfile.joined_date = session.user.user_metadata.joinedDate; needsUpdate = true; }
          if (!myDbProfile.avatar && session.user.user_metadata?.avatar) { updatedFields.avatar = session.user.user_metadata.avatar; myDbProfile.avatar = session.user.user_metadata.avatar; needsUpdate = true; }
          if (needsUpdate) {
            await supabase.from('members').update(updatedFields).eq('id', myMemberId);
          } else {
            await supabase.from('members').update({ status: 'online' }).eq('id', myMemberId);
          }
          myDbProfile.status = 'online';
        }

        if (finalMembers.length > 0) {
          const userEmail = session.user.email || 'default';
          const storedWorkspaceMapRaw = typeof window !== 'undefined' ? localStorage.getItem(`avaxa_member_workspaces_${userEmail}`) : null;
          const storedWorkspaceMap = storedWorkspaceMapRaw ? JSON.parse(storedWorkspaceMapRaw) : {};

          setMembers(finalMembers.map(m => {
            const isMe = m.id === myMemberId;
            const memberId = isMe ? 'user' : m.id;
            const workspaceIds = m.workspace_ids || storedWorkspaceMap[m.id] || ['w1', 'w2', 'w3'];
            return {
              id: memberId,
              name: m.name,
              email: m.email,
              avatar: m.avatar,
              role: m.role as any,
              status: m.status as any,
              workspaceIds,
              phone: m.phone || '',
              department: m.department || '',
              bio: m.bio || '',
              joinedDate: m.joined_date || '2026'
            };
          }));
        }

        const { data: dbTasks, error: tasksErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId);

        if (!active) return;

        const finalTasks = dbTasks || [];
        if (finalTasks.length > 0) {
          setTasks(finalTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority as any,
            status: t.status as any,
            assigneeId: t.assigneeId || undefined,
            startDate: t.startDate || undefined,
            dueDate: t.dueDate || undefined,
            subtasks: t.subtasks || [],
            progress: t.progress || 0,
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
            hoursEstimate: t.hoursEstimate || undefined,
            hoursLogged: t.hoursLogged || undefined,
            commentsCount: t.commentsCount || 0,
            tags: t.tags || [],
            isPinned: t.isPinned || false,
            comments: t.comments || [],
            attachments: t.attachments || [],
            workspaceId: t.workspace_id || undefined,
            spaceId: t.space_id || undefined,
            listId: t.list_id || undefined,
            custom_fields: t.custom_fields || {},
            recurrence: t.recurrence || undefined
          })));
        } else {
          setTasks([]);
        }

        const { data: dbDocs, error: docsErr } = await supabase
          .from('docs')
          .select('*')
          .eq('user_id', userId);

        if (!active) return;

        const finalDocs = dbDocs || [];
        if (finalDocs.length > 0) {
          finalDocs.forEach(d => {
            if (d.title && d.title.startsWith('System Task Order: ')) {
              const wsId = d.title.replace('System Task Order: ', '');
              if (wsId && d.content) {
                try { localStorage.setItem(`avaxa_task_order_${wsId}`, d.content); } catch (e) {}
              }
            }
          });
          setDocs(finalDocs.map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            content: d.content,
            updatedAt: d.updatedAt,
            updatedBy: d.updatedBy,
            isAiGenerated: d.isAiGenerated || false,
            workspaceId: d.workspace_id || undefined
          })));
        } else {
          setDocs([]);
        }

        try {
          const { data: dbBases } = await supabase
            .from('base_apps')
            .select('*')
            .eq('user_id', userId);

          if (active && dbBases && dbBases.length > 0) {
            const bases = dbBases.map(b => ({
              id: b.id,
              name: b.name,
              emoji: b.emoji || '📋',
              description: b.description || '',
              tables: b.tables || [],
              activeTableId: b.active_table_id || undefined,
              workspaceId: b.workspace_id || undefined,
              createdAt: b.created_at || new Date().toISOString(),
              updatedAt: b.updated_at || new Date().toISOString(),
            }));
            useBaseStore.getState().setBases(bases);
            try { localStorage.setItem('avaxa_bases', JSON.stringify(dbBases)); } catch (e) {}
          }
        } catch (e) {
          console.warn('Base apps load warning:', e);
        }

        const fetchSpacesAndLists = async () => {
          try {
            const { data: dbSpaces, error: spacesErr } = await supabase
              .from('spaces')
              .select('*')
              .eq('user_id', userId);
            
            const { data: dbLists, error: listsErr } = await supabase
              .from('lists')
              .select('*')
              .eq('user_id', userId);

            if (!active) return false;

            if (spacesErr) {
              console.warn('Spaces fetch failed:', spacesErr.message);
              return false;
            }

            const finalSpaces = dbSpaces || [];
            const hasSeededSpaces = typeof window !== 'undefined' ? localStorage.getItem(`avaxa_seeded_spaces_${userId}`) : null;

            if (finalSpaces.length > 0) {
              const formattedSpaces = finalSpaces.map(s => ({
                id: s.id,
                name: s.name,
                emoji: s.emoji || '📦',
                themeColor: s.theme_color || 'indigo',
                workspaceId: s.workspace_id,
                lists: (dbLists || []).filter(l => l.space_id === s.id).map(l => ({
                  id: l.id,
                  name: l.name,
                  folderId: l.folder_id || undefined
                })),
                folders: s.folders || [],
                whiteboards: s.whiteboards || [],
                channels: s.channels || [],
                statuses: s.statuses || [],
                clickApps: s.click_apps || {}
              }));
              setSpaces(formattedSpaces);
              if (!hasSeededSpaces) {
                try { localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true'); } catch (e) {}
              }
              return true;
            }

            if (hasSeededSpaces) {
              setSpaces([]);
              return true;
            }

            return false;
          } catch (e) {
            console.error('Exception loading spaces/lists:', e);
            return false;
          }
        };

        const spacesSuccess = await fetchSpacesAndLists();
        
        if (!spacesSuccess && active) {
          const savedSpaces = typeof window !== 'undefined' ? localStorage.getItem(`avaxa_spaces_${userId}`) : null;
          let localSpaces: Space[] = [];
          if (savedSpaces) {
            try { localSpaces = JSON.parse(savedSpaces); } catch (e) {}
          }

          if (localSpaces.length === 0) {
            localSpaces = [
              {
                id: 's-w1-personal',
                name: 'Personal Space',
                emoji: '🧘',
                themeColor: 'indigo',
                workspaceId: 'w1',
                lists: [
                  { id: 'l-w1-inbox', name: 'Inbox' },
                  { id: 'l-w1-todo', name: 'To Do' }
                ],
                clickApps: { subtasks: true, priorities: true }
              },
              {
                id: 's-w2-product',
                name: 'Product Space',
                emoji: '🔮',
                themeColor: 'indigo',
                workspaceId: 'w2',
                lists: [
                  { id: 'l-w2-roadmap', name: 'Product Roadmap' },
                  { id: 'l-w2-sprint1', name: 'Sprint 1' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, timeTracking: true }
              },
              {
                id: 's-w2-marketing',
                name: 'Marketing Space',
                emoji: '📢',
                themeColor: 'rose',
                workspaceId: 'w2',
                lists: [
                  { id: 'l-w2-campaign', name: 'Campaign Kickoff' },
                  { id: 'l-w2-seo', name: 'SEO Plan' },
                  { id: 'l-w2-email', name: 'Email Launch' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, relationships: true }
              }
            ];
          }

          try {
            for (const space of localSpaces) {
              await supabase.from('spaces').insert({
                id: space.id,
                name: space.name,
                emoji: space.emoji || null,
                theme_color: space.themeColor || null,
                workspace_id: space.workspaceId,
                folders: space.folders || [],
                whiteboards: space.whiteboards || [],
                channels: space.channels || [],
                statuses: space.statuses || [],
                click_apps: space.clickApps || {},
                user_id: userId
              });
              
              if (space.lists.length > 0) {
                const listsToInsert = space.lists.map(l => ({
                  id: l.id,
                  name: l.name,
                  space_id: space.id,
                  folder_id: l.folderId || null,
                  user_id: userId
                }));
                await supabase.from('lists').insert(listsToInsert);
              }
            }
            try { localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true'); } catch (e) {}
          } catch (e) {
            console.error('Error during seeding spaces migration:', e);
          }

          setSpaces(localSpaces);
        }

        setDataLoaded.current = true;
        addSyncLog('Cloud storage synchronized with Supabase successfully!');

        if (active) {
          tasksChannel = supabase.channel('realtime-tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, (payload) => {
              const eventType = payload.eventType;
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const t = payload.new as any;
                if (!t || !t.id) return;
                const mappedTask: Task = {
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  priority: t.priority as any,
                  status: t.status as any,
                  assigneeId: t.assigneeId || undefined,
                  startDate: t.startDate || undefined,
                  dueDate: t.dueDate || undefined,
                  subtasks: t.subtasks || [],
                  progress: t.progress || 0,
                  createdAt: t.created_at || t.createdAt || new Date().toISOString(),
                  hoursEstimate: t.hoursEstimate || undefined,
                  hoursLogged: t.hoursLogged || undefined,
                  commentsCount: t.commentsCount || 0,
                  tags: t.tags || [],
                  isPinned: t.isPinned || false,
                  comments: t.comments || [],
                  attachments: t.attachments || [],
                  workspaceId: t.workspace_id || undefined,
                  spaceId: t.space_id || undefined,
                  listId: t.list_id || undefined,
                  custom_fields: t.custom_fields || {},
                  recurrence: t.recurrence || undefined
                };
                setTasks(prev => {
                  const exists = prev.some(item => item.id === mappedTask.id);
                  if (exists) {
                    return prev.map(item => item.id === mappedTask.id ? mappedTask : item);
                  } else {
                    return [...prev, mappedTask];
                  }
                });
              } else if (eventType === 'DELETE') {
                if (payload.old && payload.old.id) {
                  setTasks(prev => prev.filter(item => item.id !== payload.old.id));
                }
              }
            })
            .subscribe();

          docsChannel = supabase.channel('realtime-docs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `user_id=eq.${userId}` }, (payload) => {
              const eventType = payload.eventType;
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const d = payload.new as any;
                if (!d || !d.id) return;
                const mappedDoc: Document = {
                  id: d.id,
                  title: d.title,
                  category: d.category,
                  content: d.content,
                  updatedAt: d.updatedAt,
                  updatedBy: d.updatedBy,
                  isAiGenerated: d.isAiGenerated || false,
                  workspaceId: d.workspace_id || undefined
                };
                setDocs(prev => {
                  const exists = prev.some(item => item.id === mappedDoc.id);
                  if (exists) {
                    return prev.map(item => item.id === mappedDoc.id ? mappedDoc : item);
                  } else {
                    return [...prev, mappedDoc];
                  }
                });
              } else if (eventType === 'DELETE') {
                if (payload.old && payload.old.id) {
                  setDocs(prev => prev.filter(item => item.id !== payload.old.id));
                }
              }
            })
            .subscribe();

          membersChannel = supabase.channel('realtime-members')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
              const eventType = payload.eventType;
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const m = payload.new as any;
                if (!m || !m.id) return;
                const isMe = m.id === `user-${userId}` || m.id === 'user';
                const memberId = isMe ? 'user' : m.id;
                const mappedMember: User = {
                  id: memberId,
                  name: m.name,
                  email: m.email,
                  avatar: m.avatar,
                  role: m.role as any,
                  status: m.status as any,
                  workspaceIds: m.workspace_ids || [],
                  phone: m.phone || '',
                  department: m.department || '',
                  bio: m.bio || '',
                  joinedDate: m.joined_date || '2026'
                };
                setMembers(prev => {
                  const exists = prev.some(item => item.id === mappedMember.id);
                  if (exists) {
                    return prev.map(item => item.id === mappedMember.id ? mappedMember : item);
                  } else {
                    return [...prev, mappedMember];
                  }
                });
              } else if (eventType === 'DELETE') {
                if (payload.old && payload.old.id) {
                  const targetId = payload.old.id === `user-${userId}` ? 'user' : payload.old.id;
                  setMembers(prev => prev.filter(item => item.id !== targetId));
                }
              }
            })
            .subscribe();

          workspacesChannel = supabase.channel('realtime-workspaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces', filter: `user_id=eq.${userId}` }, (payload) => {
              const eventType = payload.eventType;
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const w = payload.new as any;
                if (!w || !w.id) return;
                const mappedWS = {
                  id: w.id,
                  name: w.name,
                  theme: w.theme || 'indigo',
                  initial: w.initial || w.name.charAt(0).toUpperCase(),
                  user_id: w.user_id,
                  coverUrl: w.coverUrl || '',
                  logoUrl: w.logoUrl || '',
                  settings: w.settings || {}
                };
                setWorkspaces(prev => {
                  const exists = prev.some(item => item.id === mappedWS.id);
                  if (exists) {
                    return prev.map(item => item.id === mappedWS.id ? mappedWS : item);
                  } else {
                    return [...prev, mappedWS];
                  }
                });
              } else if (eventType === 'DELETE') {
                if (payload.old && payload.old.id) {
                  setWorkspaces(prev => prev.filter(item => item.id !== payload.old.id));
                }
              }
            })
            .subscribe();

          spacesChannel = supabase.channel('realtime-spaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces', filter: `user_id=eq.${userId}` }, () => {
              fetchSpacesAndLists();
            })
            .subscribe();

          listsChannel = supabase.channel('realtime-lists')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `user_id=eq.${userId}` }, () => {
              fetchSpacesAndLists();
            })
            .subscribe();

          addSyncLog('Realtime sync via Supabase channels successful!');
        }
      } catch (err) {
        console.error('Error during realtime data sync:', err);
      }
    };

    loadAndSubscribe();
    return () => {
      active = false;
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (docsChannel) supabase.removeChannel(docsChannel);
      if (membersChannel) supabase.removeChannel(membersChannel);
      if (workspacesChannel) supabase.removeChannel(workspacesChannel);
      if (spacesChannel) supabase.removeChannel(spacesChannel);
      if (listsChannel) supabase.removeChannel(listsChannel);
    };
  }, [currentUser, isOffline]);
}
