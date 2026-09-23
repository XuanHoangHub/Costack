import { useEffect, useRef, useCallback, useState } from 'react';
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
import { Task, Document, User, Workspace, Space, BaseApp, WorkspaceInvitation } from '@/types';
import { extractTaskRelationships } from '@/lib/taskRelationships';
import { resolveAppRole } from '@/lib/authRole';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

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
              .select('*');

            if (!active) return;

            if (wsError) {
              console.warn('workspaces fetch failed:', wsError.message);
            } else {
              let finalWorkspaces = dbWorkspaces || [];
              const hasSeededWS = typeof window !== 'undefined' ? localStorage.getItem(`apexa_seeded_workspaces_${userId}`) : null;

              if (finalWorkspaces.length === 0 && !hasSeededWS) {
                const initialWorkspaces = [
                  { id: 'w1', name: 'Personal', theme: 'indigo', initial: 'P', user_id: userId },
                  { id: 'w2', name: 'Costack Team OS', theme: 'ocean', initial: 'U', user_id: userId },
                  { id: 'w3', name: 'Product Launch', theme: 'sunset', initial: 'L', user_id: userId }
                ];
                const { data: seededWorkspaces } = await supabase.from('workspaces').insert(initialWorkspaces).select();
                if (seededWorkspaces) finalWorkspaces = seededWorkspaces;
                try { localStorage.setItem(`apexa_seeded_workspaces_${userId}`, 'true'); } catch (e) {}
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
        const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const myName = googleName || currentUser?.name || session.user.email?.split('@')[0] || 'Avaxa Champion';
        const myEmail = currentUser?.email || session.user.email || '';
        const googleAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || session.user.user_metadata?.avatar || '';
        const cachedAvatar = currentUser?.avatar && !currentUser.avatar.includes('api.dicebear.com') ? currentUser.avatar : '';
        const myAvatar = googleAvatar || cachedAvatar || '';
        const myRole = resolveAppRole(session.user);

        const { data: dbMembers, error: membersErr } = await supabase
          .from('members')
          .select('*');

        if (!active) return;

        let finalMembers = dbMembers || [];
        let myDbProfile = finalMembers.find(m => m.id === myMemberId || m.user_id === userId || (m.email && myEmail && m.email.toLowerCase().trim() === myEmail.toLowerCase().trim()));

        if (!myDbProfile) {
          const newProfile = {
            id: myMemberId,
            name: myName,
            email: myEmail,
            avatar: myAvatar,
            role: myRole,
            status: 'offline',
            user_id: userId,
            phone: session.user.user_metadata?.phone || null,
            department: session.user.user_metadata?.department || null,
            bio: session.user.user_metadata?.bio || null,
            joined_date: session.user.user_metadata?.joinedDate || '2026',
            workspace_ids: ['w1', 'w2', 'w3']
          };
          await supabase.from('members').upsert([newProfile], { onConflict: 'id' });
          finalMembers.push(newProfile);
          myDbProfile = newProfile;
        } else {
          if (myDbProfile.id !== myMemberId) {
            const oldId = myDbProfile.id;
            const updatedProfile = {
              ...myDbProfile,
              id: myMemberId,
              user_id: userId,
              name: myDbProfile.name || myName,
              avatar: myDbProfile.avatar || myAvatar,
              status: 'offline',
              role: myDbProfile.role || myRole
            };
            await supabase.from('members').delete().eq('id', oldId);
            await supabase.from('members').upsert([updatedProfile], { onConflict: 'id' });
            myDbProfile = updatedProfile;
            finalMembers = finalMembers.filter(m => m.id !== oldId && m.id !== myMemberId);
            finalMembers.push(updatedProfile);
          } else {
            const updatedFields: any = {};
            let needsUpdate = false;
            if (!myDbProfile.phone && session.user.user_metadata?.phone) { updatedFields.phone = session.user.user_metadata.phone; myDbProfile.phone = session.user.user_metadata.phone; needsUpdate = true; }
            if (!myDbProfile.department && session.user.user_metadata?.department) { updatedFields.department = session.user.user_metadata.department; myDbProfile.department = session.user.user_metadata.department; needsUpdate = true; }
            if (!myDbProfile.bio && session.user.user_metadata?.bio) { updatedFields.bio = session.user.user_metadata.bio; myDbProfile.bio = session.user.user_metadata.bio; needsUpdate = true; }
            if (!myDbProfile.joined_date && session.user.user_metadata?.joinedDate) { updatedFields.joined_date = session.user.user_metadata.joinedDate; myDbProfile.joined_date = session.user.user_metadata.joinedDate; needsUpdate = true; }
            if (googleAvatar && (!myDbProfile.avatar || myDbProfile.avatar.includes('api.dicebear.com') || myDbProfile.avatar !== googleAvatar)) { 
              updatedFields.avatar = googleAvatar; 
              myDbProfile.avatar = googleAvatar; 
              needsUpdate = true; 
            }
            if (needsUpdate) {
              await supabase.from('members').update(updatedFields).eq('id', myMemberId);
            }
          }
        }

        if (myEmail) {
          const myEmailLower = myEmail.toLowerCase().trim();
          finalMembers = finalMembers.filter(m => {
            if (m.id === myMemberId) return true;
            if (m.email && m.email.toLowerCase().trim() === myEmailLower) return false;
            return true;
          });
        }

        if (myDbProfile) {
          const dbAvatar = myDbProfile.avatar && !myDbProfile.avatar.includes('api.dicebear.com') ? myDbProfile.avatar : '';
          const isSuper = isApexaSuperAdmin(userId);
          useAuthStore.getState().updateCurrentUser({
            id: userId,
            name: myDbProfile.name || googleName || myName,
            email: myEmail,
            avatar: googleAvatar || dbAvatar || myAvatar,
            role: (isSuper ? 'admin' : (myDbProfile.role || myRole)) as any,
            status: 'online',
            isPremium: isSuper ? true : Boolean(myDbProfile.is_premium),
            subscriptionPlan: isSuper ? 'enterprise' : undefined,
            billingStatus: isSuper ? 'active' : undefined,
          });
        }

        if (finalMembers.length > 0) {
          const userEmail = (session.user.email || '').toLowerCase().trim();
          const storedWorkspaceMapRaw = typeof window !== 'undefined' ? localStorage.getItem(`apexa_member_workspaces_${userEmail || 'default'}`) : null;
          const storedWorkspaceMap = storedWorkspaceMapRaw ? JSON.parse(storedWorkspaceMapRaw) : {};

          const seenIds = new Set<string>();
          const seenEmails = new Set<string>();
          const deduplicated: User[] = [];

          for (const m of finalMembers) {
            const isMe = m.id === myMemberId || m.user_id === userId || (m.email && userEmail && m.email.toLowerCase().trim() === userEmail);
            const memberId = isMe ? 'user' : m.id;
            const memberEmail = (m.email || '').toLowerCase().trim();

            if (isMe) {
              if (seenIds.has('user')) continue;
              seenIds.add('user');
              if (memberEmail) seenEmails.add(memberEmail);
            } else {
              if (memberEmail && seenEmails.has(memberEmail)) continue;
              if (seenIds.has(memberId)) continue;
              if (memberEmail) seenEmails.add(memberEmail);
              seenIds.add(memberId);
            }

            const workspaceIds = m.workspace_ids || storedWorkspaceMap[m.id] || ['w1', 'w2', 'w3'];
            deduplicated.push({
              id: memberId,
              userId: m.user_id || (isMe ? userId : undefined),
              name: isMe ? (m.name || myName) : m.name,
              email: m.email,
              avatar: isMe ? (m.avatar || myAvatar) : m.avatar,
              role: isMe ? (m.role || myRole) : (m.role as any),
              // Presence is the only source of truth for connectivity.
              status: 'offline',
              customStatus: m.custom_status || 'online',
              statusMessage: m.status_message || '',
              statusEmoji: m.status_emoji || '',
              lastSeenAt: m.last_seen_at || m.created_at || new Date().toISOString(),
              workspaceIds,
              phone: m.phone || '',
              department: m.department || '',
              bio: m.bio || '',
              skills: isMe && Array.isArray(session.user.user_metadata?.skills) ? session.user.user_metadata.skills : [],
              joinedDate: m.joined_date || '2026',
              isPremium: isMe ? Boolean(myDbProfile?.is_premium ?? m.is_premium) : Boolean(m.is_premium)
            });
          }

          setMembers(deduplicated);
        }

        const { data: dbTasks, error: tasksErr } = await supabase
          .from('tasks')
          .select('*');

        if (!active) return;

        const finalTasks = dbTasks || [];
        if (finalTasks.length > 0) {
          setTasks(finalTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: (t.priority as any) || 'medium',
            status: t.status as any,
            assigneeId: t.assigneeId || undefined,
            startDate: t.startDate || undefined,
            dueDate: t.dueDate || undefined,
            subtasks: t.subtasks || [],
            progress: t.progress || 0,
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
            completedAt: t.completedAt || undefined,
            deletedAt: t.deleted_at || undefined,
            position: typeof t.position === 'number' ? t.position : undefined,
            hoursEstimate: t.hoursEstimate || undefined,
            hoursLogged: t.hoursLogged || undefined,
            commentsCount: t.commentsCount || 0,
            tags: t.tags || [],
            isPinned: t.isPinned || false,
            isMilestone: t.isMilestone || t.custom_fields?.isMilestone || false,
            reminder: t.reminder || t.custom_fields?.reminder || undefined,
            comments: t.comments || [],
            attachments: t.attachments || [],
            workspaceId: t.workspace_id || undefined,
            spaceId: t.space_id || undefined,
            listId: t.list_id || undefined,
            custom_fields: t.custom_fields || {},
            relationships: extractTaskRelationships(t),
            recurrence: t.recurrence || undefined
          })));
        } else {
          setTasks([]);
        }

        const { data: dbDocs, error: docsErr } = await supabase
          .from('docs')
          .select('*');

        if (!active) return;

        const finalDocs = dbDocs || [];
        if (finalDocs.length > 0) {
          finalDocs.forEach(d => {
            if (d.title && d.title.startsWith('System Task Order: ')) {
              const wsId = d.title.replace('System Task Order: ', '');
              if (wsId && d.content) {
                try { localStorage.setItem(`apexa_task_order_${wsId}`, d.content); } catch (e) {}
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
            .select('*');

          if (active && dbBases && dbBases.length > 0) {
            const bases = dbBases.map(b => ({
              id: b.id,
              name: b.name,
              emoji: b.emoji || 'ClipboardList',
              description: b.description || '',
              tables: b.tables || [],
              activeTableId: b.active_table_id || undefined,
              workspaceId: b.workspace_id || undefined,
              createdAt: b.created_at || new Date().toISOString(),
              updatedAt: b.updated_at || new Date().toISOString(),
            }));
            useBaseStore.getState().setBases(bases);
            try { localStorage.setItem('apexa_bases', JSON.stringify(dbBases)); } catch (e) {}
          }
        } catch (e) {
          console.warn('Base apps load warning:', e);
        }

        const fetchSpacesAndLists = async () => {
          try {
            const { data: dbSpaces, error: spacesErr } = await supabase
              .from('spaces')
              .select('*');
            
            const { data: dbLists, error: listsErr } = await supabase
              .from('lists')
              .select('*');

            if (!active) return false;

            if (spacesErr) {
              console.warn('Spaces fetch failed:', spacesErr.message);
              return false;
            }

            const finalSpaces = dbSpaces || [];
            const hasSeededSpaces = typeof window !== 'undefined'
              ? (localStorage.getItem(`apexa_seeded_spaces_${userId}`) || localStorage.getItem(`apexa_seeded_spaces_${userId}`))
              : null;

            if (finalSpaces.length > 0) {
              const currentLocalSpaces = useSpaceStore.getState().spaces;
              const formattedSpaces = finalSpaces.map(s => {
                const remoteLists = (dbLists || []).filter(l => l.space_id === s.id).map(l => ({
                  id: l.id,
                  name: l.name,
                  folderId: l.folder_id || undefined,
                  user_id: l.user_id,
                  isPrivate: l.is_private || false,
                  shareSettings: l.share_settings || {},
                  isFavorite: Boolean(l.is_favorite || s.click_apps?.spacePreferences?.listPreferences?.[l.id]?.isFavorite),
                  isArchived: Boolean(l.is_archived || s.click_apps?.spacePreferences?.listPreferences?.[l.id]?.isArchived),
                  position: typeof l.position === 'number' ? l.position : 0
                }));

                // Preserve any local list in memory that hasn't propagated to dbLists yet
                const matchingLocalSpace = currentLocalSpaces.find(loc => loc.id === s.id);
                const localLists = matchingLocalSpace?.lists || [];
                const remoteListIdSet = new Set(remoteLists.map(l => l.id));
                const missingLocalLists = localLists.filter(l => !remoteListIdSet.has(l.id));
                const mergedLists = [...remoteLists, ...missingLocalLists];

                return {
                  id: s.id,
                  name: s.name,
                  emoji: s.emoji || 'Package',
                  themeColor: s.theme_color || 'indigo',
                  workspaceId: s.workspace_id,
                  user_id: s.user_id,
                  isPrivate: s.is_private || false,
                  shareSettings: s.share_settings || {},
                  description: s.click_apps?.spacePreferences?.description || '',
                  isFavorite: !!s.is_favorite || !!s.click_apps?.spacePreferences?.isFavorite,
                  isHidden: !!s.is_hidden || !!s.click_apps?.spacePreferences?.isHidden,
                  isArchived: !!s.is_archived || !!s.click_apps?.spacePreferences?.isArchived,
                  lists: mergedLists,
                  folders: s.folders || [],
                  whiteboards: s.whiteboards || [],
                  channels: s.channels || [],
                  statuses: s.statuses || [],
                  clickApps: s.click_apps || {},
                  customFields: s.custom_fields_config || []
                };
              });
              setSpaces(formattedSpaces);
              if (!hasSeededSpaces) {
                try {
                  localStorage.setItem(`apexa_seeded_spaces_${userId}`, 'true');
                  localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true');
                } catch (e) {}
              }
              return true;
            }

            if (hasSeededSpaces) {
              const savedSpaces = typeof window !== 'undefined'
                ? (localStorage.getItem(`apexa_spaces_${userId}`) || localStorage.getItem(`apexa_spaces_${userId}`))
                : null;
              if (savedSpaces) {
                try {
                  const parsed = JSON.parse(savedSpaces);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setSpaces(parsed);
                    return true;
                  }
                } catch (e) {}
              }
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
          const savedSpaces = typeof window !== 'undefined'
            ? (localStorage.getItem(`apexa_spaces_${userId}`) || localStorage.getItem(`apexa_spaces_${userId}`))
            : null;
          let localSpaces: Space[] = [];
          if (savedSpaces) {
            try { localSpaces = JSON.parse(savedSpaces); } catch (e) {}
          }

          if (localSpaces.length === 0) {
            const currentWorkspaces = useWorkspaceStore.getState().workspaces;
            const currentActiveWsId = useWorkspaceStore.getState().activeWorkspaceId;
            const targetWsId = currentActiveWsId || currentWorkspaces[0]?.id || 'w2';
            localSpaces = [
              {
                id: `s-${targetWsId}-personal`,
                name: 'Personal Space',
                emoji: 'Activity',
                themeColor: 'indigo',
                workspaceId: targetWsId,
                lists: [
                  { id: `l-${targetWsId}-inbox`, name: 'Inbox' },
                  { id: `l-${targetWsId}-todo`, name: 'To Do' }
                ],
                clickApps: { subtasks: true, priorities: true }
              },
              {
                id: `s-${targetWsId}-product`,
                name: 'Product Space',
                emoji: 'Sparkles',
                themeColor: 'indigo',
                workspaceId: targetWsId,
                lists: [
                  { id: `l-${targetWsId}-roadmap`, name: 'Product Roadmap' },
                  { id: `l-${targetWsId}-sprint1`, name: 'Sprint 1' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, timeTracking: true }
              },
              {
                id: `s-${targetWsId}-marketing`,
                name: 'Marketing Space',
                emoji: 'Megaphone',
                themeColor: 'rose',
                workspaceId: targetWsId,
                lists: [
                  { id: `l-${targetWsId}-campaign`, name: 'Campaign Kickoff' },
                  { id: `l-${targetWsId}-seo`, name: 'SEO Plan' },
                  { id: `l-${targetWsId}-email`, name: 'Email Launch' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, relationships: true }
              }
            ];
          }

          try {
            const currentWorkspaces = useWorkspaceStore.getState().workspaces;
            const currentActiveWsId = useWorkspaceStore.getState().activeWorkspaceId;
            const validWorkspaceIds = new Set(currentWorkspaces.map(w => w.id));

            for (const space of localSpaces) {
              let spaceWsId = space.workspaceId;
              if (!spaceWsId || (!validWorkspaceIds.has(spaceWsId) && validWorkspaceIds.size > 0)) {
                spaceWsId = currentActiveWsId || currentWorkspaces[0]?.id || spaceWsId;
              }

              const { error: spErr } = await supabase.from('spaces').insert({
                id: space.id,
                name: space.name,
                emoji: space.emoji || null,
                theme_color: space.themeColor || null,
                workspace_id: spaceWsId,
                folders: space.folders || [],
                whiteboards: space.whiteboards || [],
                channels: space.channels || [],
                statuses: space.statuses || [],
                click_apps: space.clickApps || {},
                custom_fields_config: space.customFields || [],
                user_id: userId
              });

              if (spErr) {
                console.warn('Skipping lists insert for seeded space due to error:', spErr.message || spErr);
                continue;
              }
              
              if (space.lists.length > 0) {
                const listsToInsert = space.lists.map(l => ({
                  id: l.id,
                  name: l.name,
                  space_id: space.id,
                  folder_id: l.folderId || null,
                  user_id: userId
                }));
                const { error: lsErr } = await supabase.from('lists').insert(listsToInsert);
                if (lsErr) {
                  console.error('Failed to insert lists during seed in useRealtimeSync:', lsErr.message || lsErr);
                }
              }
            }
            try { localStorage.setItem(`apexa_seeded_spaces_${userId}`, 'true'); } catch (e) {}
          } catch (e) {
            console.error('Error during seeding spaces migration:', e);
          }

          setSpaces(localSpaces);
        }

        setDataLoaded.current = true;

        if (active) {
          const getCleanChannel = (name: string) => {
            const existing = supabase.getChannels().find(c => c.topic === name || c.topic === `realtime:${name}`);
            if (existing) {
              void supabase.removeChannel(existing);
            }
            return supabase.channel(name);
          };

          tasksChannel = getCleanChannel('realtime-tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
              const eventType = payload.eventType;
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const t = payload.new as any;
                if (!t || !t.id) return;
                const mappedTask: Task = {
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  priority: (t.priority as any) || 'medium',
                  status: t.status as any,
                  assigneeId: t.assigneeId || undefined,
                  startDate: t.startDate || undefined,
                  dueDate: t.dueDate || undefined,
                  subtasks: t.subtasks || [],
                  progress: t.progress || 0,
                  createdAt: t.created_at || t.createdAt || new Date().toISOString(),
                  completedAt: t.completedAt || undefined,
                  deletedAt: t.deleted_at || undefined,
                  position: typeof t.position === 'number' ? t.position : undefined,
                  hoursEstimate: t.hoursEstimate || undefined,
                  hoursLogged: t.hoursLogged || undefined,
                  commentsCount: t.commentsCount || 0,
                  tags: t.tags || [],
                  isPinned: t.isPinned || false,
                  isMilestone: t.isMilestone || t.custom_fields?.isMilestone || false,
                  reminder: t.reminder || t.custom_fields?.reminder || undefined,
                  comments: t.comments || [],
                  attachments: t.attachments || [],
                  workspaceId: t.workspace_id || undefined,
                  spaceId: t.space_id || undefined,
                  listId: t.list_id || undefined,
                  custom_fields: t.custom_fields || {},
                  relationships: extractTaskRelationships(t),
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

          docsChannel = getCleanChannel('realtime-docs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, (payload) => {
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

          membersChannel = getCleanChannel('realtime-members')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
              const eventType = payload.eventType;
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                const m = payload.new as any;
                if (!m || !m.id) return;
                const currentUserEmail = (session.user.email || '').toLowerCase().trim();
                const isMe = m.id === `user-${userId}` || m.id === 'user' || m.user_id === userId || (m.email && currentUserEmail && m.email.toLowerCase().trim() === currentUserEmail);
                const memberId = isMe ? 'user' : m.id;
                const mappedMember: User = {
                  id: memberId,
                  userId: m.user_id || undefined,
                  name: m.name,
                  email: m.email,
                  avatar: m.avatar,
                  role: m.role as any,
                  status: m.status as any,
                  customStatus: m.custom_status || 'online',
                  statusMessage: m.status_message || '',
                  statusEmoji: m.status_emoji || '',
                  lastSeenAt: m.last_seen_at || m.created_at || new Date().toISOString(),
                  workspaceIds: m.workspace_ids || [],
                  phone: m.phone || '',
                  department: m.department || '',
                  bio: m.bio || '',
                  joinedDate: m.joined_date || '2026',
                  isPremium: Boolean(m.is_premium)
                };
                if (isMe) {
                  const isSuper = isApexaSuperAdmin(userId);
                  useAuthStore.getState().updateCurrentUser({
                    id: userId,
                    name: m.name,
                    email: m.email,
                    avatar: m.avatar,
                    role: (isSuper ? 'admin' : (m.role || 'member')) as any,
                    status: 'online',
                    isPremium: isSuper ? true : Boolean(m.is_premium),
                    subscriptionPlan: isSuper ? 'enterprise' : undefined,
                    billingStatus: isSuper ? 'active' : undefined,
                  });
                }
                setMembers(prev => {
                  const exists = prev.some(item => item.id === mappedMember.id);
                  if (exists) {
                    return prev.map(item => {
                      if (item.id === mappedMember.id) {
                        return {
                          ...mappedMember,
                          skills: item.skills || mappedMember.skills,
                          // Connectivity still comes from Presence; persisted manual
                          // preferences take effect immediately across other tabs.
                          status: mappedMember.customStatus === 'offline'
                            ? 'offline'
                            : mappedMember.customStatus === 'busy'
                              ? 'busy'
                              : mappedMember.customStatus === 'away'
                                ? 'away'
                                : item.status,
                        };
                      }
                      return item;
                    });
                  } else {
                    return [...prev, { ...mappedMember, status: 'offline' }];
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

          workspacesChannel = getCleanChannel('realtime-workspaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, (payload) => {
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

          spacesChannel = getCleanChannel('realtime-spaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces' }, () => {
              // Debounce: wait 400ms before re-fetching to let optimistic updates settle
              setTimeout(() => { if (active) fetchSpacesAndLists(); }, 400);
            })
            .subscribe();

          listsChannel = getCleanChannel('realtime-lists')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => {
              // Debounce: wait 400ms before re-fetching to let optimistic updates settle
              setTimeout(() => { if (active) fetchSpacesAndLists(); }, 400);
            })
            .subscribe();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isOffline]);
}

export function useWorkspaceInvitations(currentUserEmail?: string, isOffline?: boolean, inviteToken?: string | null) {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadInvitations = useCallback(async () => {
    if (!currentUserEmail || typeof window === 'undefined') return;

    setIsLoading(true);
    setHasLoaded(false);

    try {
      const storedRaw = localStorage.getItem('apexa_workspace_invitations');
      const localList: WorkspaceInvitation[] = storedRaw ? JSON.parse(storedRaw) : [];
      const emailLower = currentUserEmail.trim().toLowerCase();
      const isPendingAndValid = (invitation: WorkspaceInvitation) => (
        invitation.email.toLowerCase() === emailLower
        && invitation.status === 'pending'
        && (!invitation.expiresAt || new Date(invitation.expiresAt).getTime() > Date.now())
      );

      if (!isOffline) {
        const { data, error } = await supabase
          .from('workspace_invitations')
          .select('*')
          .ilike('email', emailLower)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped: WorkspaceInvitation[] = data.map(i => ({
            id: i.id,
            workspaceId: i.workspace_id,
            workspaceName: i.workspace_name || 'Workspace',
            email: i.email,
            role: i.role || 'member',
            invitedBy: i.invited_by,
            invitedByName: i.invited_by_name || i.invited_by,
            token: i.token,
            status: i.status || 'pending',
            createdAt: i.created_at,
            expiresAt: i.expires_at
          }));

          const map = new Map<string, WorkspaceInvitation>();
          localList.forEach(i => map.set(i.id, i));
          mapped.forEach(i => map.set(i.id, i));
          const merged = Array.from(map.values())
            .filter(isPendingAndValid)
            .sort((a, b) => {
              if (inviteToken && a.token === inviteToken) return -1;
              if (inviteToken && b.token === inviteToken) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
          setInvitations(merged);
          return;
        }
      }

      setInvitations(localList.filter(isPendingAndValid));
    } catch (e) {
      console.warn('Exception loading workspace invitations:', e);
      setInvitations([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [currentUserEmail, inviteToken, isOffline]);

  useEffect(() => {
    loadInvitations();

    const handleUpdate = () => loadInvitations();
    window.addEventListener('apexa-invitation-updated', handleUpdate);
    window.addEventListener('avaxa-invitation-updated', handleUpdate);

    let channel: any = null;
    if (!isOffline && currentUserEmail) {
      try {
        channel = supabase
          .channel(`workspace-invites-${currentUserEmail.trim().toLowerCase()}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'workspace_invitations',
            filter: `email=eq.${currentUserEmail.trim().toLowerCase()}`
          }, () => {
            loadInvitations();
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime channel subscribe error for invitations:', e);
      }
    }

    return () => {
      window.removeEventListener('apexa-invitation-updated', handleUpdate);
      window.removeEventListener('avaxa-invitation-updated', handleUpdate);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadInvitations, currentUserEmail, isOffline]);

  return { invitations, isLoading, hasLoaded, refreshInvitations: loadInvitations };
}
