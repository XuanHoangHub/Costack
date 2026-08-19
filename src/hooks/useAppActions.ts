'use client';

import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store';
import { useTaskStore } from '@/store/taskStore';
import { useDocStore } from '@/store/docStore';
import { useMemberStore } from '@/store/memberStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSpaceStore } from '@/store/spaceStore';
import { useBaseStore } from '@/store/baseStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSyncStore } from '@/store/syncStore';
import { useUiStore } from '@/store/uiStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { Task, Document, User, Space, BaseApp, WorkspaceInvitation } from '@/types';
import { embedTaskRelationships } from '@/lib/taskRelationships';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useAppActions() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isOffline = useUiStore((s) => s.isOffline);
  const setShowPremiumModal = useUiStore((s) => s.setShowPremiumModal);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const spaces = useSpaceStore((s) => s.spaces);
  const tasks = useTaskStore((s) => s.tasks);
  const docs = useDocStore((s) => s.docs);
  const members = useMemberStore((s) => s.members);
  const bases = useBaseStore((s) => s.bases);

  const setTasks = useTaskStore((s) => s.setTasks);
  const setDocs = useDocStore((s) => s.setDocs);
  const setMembers = useMemberStore((s) => s.setMembers);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const setSpaces = useSpaceStore((s) => s.setSpaces);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const triggerToast = useNotificationStore((s) => s.addToast);
  const addSyncLog = useSyncStore((s) => s.addSyncLog);

  const handleCreateWorkspace = useCallback(async (name: string, theme: string, coverUrl?: string) => {
    const initial = name.charAt(0).toUpperCase();
    const newId = `w-${Date.now()}`;
    const newWS = { id: newId, name, theme, initial, coverUrl };

    const createDefaultSpaceForWorkspace = (wsId: string, wsName: string, wsTheme: string) => {
      const defaultSpace: Space = {
        id: `sp-${Date.now()}`,
        name: `${wsName} Space`,
        emoji: '🚀',
        themeColor: wsTheme === 'ocean' ? '#0891b2' : wsTheme === 'forest' ? '#047857' : wsTheme === 'sunset' ? '#e11d48' : '#6366f1',
        workspaceId: wsId,
        lists: [
          { id: `l-${Date.now()}-1`, name: 'To Do' },
          { id: `l-${Date.now()}-2`, name: 'In Progress' },
          { id: `l-${Date.now()}-3`, name: 'Completed' }
        ],
        statuses: [
          { id: 'todo', label: 'TO DO', color: '#94a3b8', type: 'todo' },
          { id: 'inprogress', label: 'IN PROGRESS', color: '#3b82f6', type: 'inprogress' },
          { id: 'review', label: 'IN REVIEW', color: '#a855f7', type: 'review' },
          { id: 'completed', label: 'COMPLETE', color: '#22c55e', type: 'completed' }
        ]
      };
      setSpaces(prev => [...prev, defaultSpace]);
      return defaultSpace;
    };

    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const result = await supabase.from('workspaces').insert([{
            id: newId,
            name,
            theme,
            initial,
            user_id: session.user.id,
            coverUrl
          }]).select();

          let data = result.data;
          if (result.error) {
            const fallbackResult = await supabase.from('workspaces').insert([{
              id: newId,
              name,
              theme,
              initial,
              user_id: session.user.id
            }]).select();
            data = fallbackResult.data;
          }

          if (data && data.length > 0) {
            const current = useWorkspaceStore.getState().workspaces;
            const alreadyHas = current.some(item => item.id === data[0].id);
            if (!alreadyHas) {
              setWorkspaces([...current, data[0]]);
            }
            createDefaultSpaceForWorkspace(data[0].id, name, theme);
            useWorkspaceStore.getState().setActiveWorkspaceId(data[0].id);
            useSpaceStore.getState().setActiveSpaceId(null);
            useSpaceStore.getState().setActiveListId(null);
            triggerToast({ id: generateId(), type: 'success', title: 'Success', message: `Created new workspace: ${name}`, duration: 4000 });
            addSyncLog(`Synchronized new workspace: ${name} to Supabase`);
            return;
          }
        }
      } catch (err) {
        console.error('Exception error creating workspace:', err);
      }
    }

    const currentWS = useWorkspaceStore.getState().workspaces;
    setWorkspaces([...currentWS, newWS]);
    createDefaultSpaceForWorkspace(newId, name, theme);
    useWorkspaceStore.getState().setActiveWorkspaceId(newId);
    useSpaceStore.getState().setActiveSpaceId(null);
    useSpaceStore.getState().setActiveListId(null);
    triggerToast({ id: generateId(), type: 'success', title: 'Success', message: `Created and switched to new workspace: ${name}`, duration: 4000 });
    addSyncLog(`Saved new workspace offline: ${name}`);
  }, [currentUser, isOffline, setWorkspaces, setSpaces, triggerToast, addSyncLog]);

  const handleUpdateWorkspace = useCallback(async (id: string, name: string, theme: string, coverUrl?: string, logoUrl?: string, settings?: any) => {
    const initial = name.charAt(0).toUpperCase();

    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase
            .from('workspaces')
            .update({ name, theme, initial, coverUrl, logoUrl, settings })
            .eq('id', id);

          if (error) {
            await supabase
              .from('workspaces')
              .update({ name, theme, initial })
              .eq('id', id);
          } else {
            addSyncLog(`Synchronized workspace update "${name}" to Supabase`);
          }
        }
      } catch (err) {
        console.error('Exception error updating workspace:', err);
      }
    }

    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name, theme, initial, coverUrl, logoUrl, settings } : w));
    triggerToast({ id: generateId(), type: 'success', title: 'Success', message: `Updated space: ${name}`, duration: 4000 });
  }, [currentUser, isOffline, setWorkspaces, addSyncLog, triggerToast]);

  const handleDeleteWorkspace = useCallback(async (id: string) => {
    if (workspaces.length <= 1) {
      triggerToast({ id: generateId(), type: 'info', title: 'Notification', message: 'You must retain at least one Workspace.', duration: 4000 });
      return;
    }

    const targetWS = workspaces.find(w => w.id === id);
    if (!targetWS) return;

    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('workspaces').delete().eq('id', id);
          if (error) {
            console.error('Error deleting workspace from database:', error.message);
          } else {
            addSyncLog(`Synchronized workspace deletion "${targetWS.name}" on Supabase`);
          }
        }
      } catch (err) {
        console.error('Exception error deleting workspace:', err);
      }
    }

    let nextActiveId = activeWorkspaceId;
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter(w => w.id !== id);
      nextActiveId = remaining[0].id;
    }

    setWorkspaces(prev => prev.filter(w => w.id !== id));
    triggerToast({ id: generateId(), type: 'success', title: 'Success', message: `Deleted workspace: ${targetWS.name}`, duration: 4000 });
  }, [workspaces, currentUser, isOffline, activeWorkspaceId, setWorkspaces, triggerToast, addSyncLog]);

  const handleAddTask = useCallback(async (t: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => {
    const assignee = members.find(m => m.id === t.assigneeId);
    if (assignee) {
      triggerToast({ id: generateId(), type: 'assignment', title: 'New Task Assigned', message: `Task "${t.title}" has been assigned to ${assignee.name}.`, duration: 4000 });
    } else {
      triggerToast({ id: generateId(), type: 'success', title: 'New Task Created', message: `Task "${t.title}" was recorded successfully.`, duration: 4000 });
    }

    const taskId = `task-${Date.now()}`;
    const newTask: Task = {
      ...t,
      id: taskId,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      progress: 0,
      comments: [],
      attachments: [],
      workspaceId: t.workspaceId || activeWorkspaceId
    };

    setTasks(prev => [...prev, newTask]);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload: any = {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            status: newTask.status,
            assigneeId: newTask.assigneeId || null,
            startDate: newTask.startDate || null,
            dueDate: newTask.dueDate || null,
            subtasks: newTask.subtasks,
            progress: newTask.progress,
            created_at: newTask.createdAt,
            hoursEstimate: newTask.hoursEstimate || null,
            hoursLogged: newTask.hoursLogged || null,
            commentsCount: newTask.commentsCount,
            tags: newTask.tags || [],
            isPinned: newTask.isPinned || false,
            comments: newTask.comments,
            user_id: session.user.id,
            workspace_id: activeWorkspaceId,
            space_id: newTask.spaceId || null,
            list_id: newTask.listId || null,
            custom_fields: embedTaskRelationships(newTask.custom_fields, newTask.relationships),
            recurrence: newTask.recurrence || null
          };

          const { error } = await supabase.from('tasks').insert([payload]);
          
          if (error) {
            console.warn('First task insert attempt failed, retrying without workspace_id column:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('column') || error.message.includes('relation'))) {
              delete payload.workspace_id;
              const { error: retryError } = await supabase.from('tasks').insert([payload]);
              if (retryError) {
                console.error('Retry task insert failed:', retryError);
                triggerToast({ id: generateId(), type: 'info', title: 'Task Save Error (Supabase)', message: `${retryError.message}`, duration: 4000 });
              } else {
                addSyncLog(`Task saved successfully in compatibility mode (No workspace_id): "${newTask.title}"`);
              }
            } else {
              triggerToast({ id: generateId(), type: 'info', title: 'Task Save Error (Supabase)', message: `${error.message}`, duration: 4000 });
            }
          } else {
            addSyncLog(`Task synchronized successfully to Supabase: "${newTask.title}"`);
          }
        }
      } catch (err) {
        console.error('Task sync failure:', err);
      }
    }
  }, [members, activeWorkspaceId, isOffline, setTasks, triggerToast, addSyncLog]);

  const handleUpdateTask = useCallback(async (updated: Task) => {
    const oldTask = tasks.find(t => t.id === updated.id);
    if (oldTask) {
      if (oldTask.assigneeId !== updated.assigneeId && updated.assigneeId) {
        const targetUser = members.find(m => m.id === updated.assigneeId);
        triggerToast({
          id: generateId(),
          type: 'assignment',
          title: 'Assignee Changed',
          message: `Task "${updated.title}" has been handed over to ${targetUser ? targetUser.name : 'another colleague'}.`,
          duration: 4000
        });
      }
      if (oldTask.status !== updated.status) {
        if (updated.status === 'completed') {
          triggerToast({
            id: generateId(),
            type: 'success',
            title: 'Task Completed!',
            message: `Member has completed the task: "${updated.title}".`,
            duration: 4000
          });
        } else {
          const statusTranslation: Record<string, string> = {
            todo: 'TO DO',
            inprogress: 'IN PROGRESS',
            review: 'REVIEW',
            completed: 'COMPLETED'
          };
          triggerToast({
            id: generateId(),
            type: 'info',
            title: 'Status Updated',
            message: `Task "${updated.title}" moved to "${statusTranslation[updated.status] || updated.status}".`,
            duration: 4000
          });
        }
      }
    }

    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('tasks').update({
            title: updated.title,
            description: updated.description,
            priority: updated.priority,
            status: updated.status,
            assigneeId: updated.assigneeId || null,
            startDate: updated.startDate || null,
            dueDate: updated.dueDate || null,
            subtasks: updated.subtasks,
            progress: updated.progress,
            hoursEstimate: updated.hoursEstimate || null,
            hoursLogged: updated.hoursLogged || null,
            commentsCount: updated.commentsCount,
            tags: updated.tags || [],
            isPinned: updated.isPinned || false,
            comments: updated.comments,
            space_id: updated.spaceId || null,
            list_id: updated.listId || null,
            custom_fields: embedTaskRelationships(updated.custom_fields, updated.relationships),
            recurrence: updated.recurrence || null
          }).eq('id', updated.id);
          if (error) console.error('Supabase Task Update Error:', error);
        }
      } catch (err) {
        console.error('Task update sync failure:', err);
      }
    }
  }, [tasks, members, isOffline, setTasks, triggerToast]);

  const handleDeleteTask = useCallback(async (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (targetTask) {
      triggerToast({
        id: generateId(),
        type: 'info',
        title: 'Task Deleted',
        message: `Task "${targetTask.title}" has been removed from the system.`,
        duration: 4000
      });
    }

    setTasks(prev => prev.filter(t => t.id !== id));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('tasks').delete().eq('id', id);
          if (error) console.error('Supabase Task Delete Error:', error);
        }
      } catch (err) {
        console.error('Task delete sync failure:', err);
      }
    }
  }, [tasks, isOffline, setTasks, triggerToast]);

  const handleUpdateTaskOrder = useCallback(async (workspaceId: string, orderedIds: string[]) => {
    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload = {
            id: `task-order-${workspaceId}`,
            title: `System Task Order: ${workspaceId}`,
            content: JSON.stringify(orderedIds),
            category: 'System',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name || 'System',
            user_id: session.user.id,
            workspace_id: workspaceId
          };
          const { error } = await supabase.from('docs').upsert([payload]);
          if (error) {
            console.warn('First task order upsert attempt failed, retrying without workspace_id:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('column'))) {
              delete (payload as any).workspace_id;
              const { error: retryError } = await supabase.from('docs').upsert([payload]);
              if (retryError) {
                console.error('Retry task order upsert failed:', retryError);
              } else {
                addSyncLog(`Synchronized task sorting order to DB (Compatibility mode)`);
              }
            }
          } else {
            addSyncLog(`Synchronized task sorting order to the cloud`);
          }
        }
      } catch (err) {
        console.error('Task order sync failure:', err);
      }
    }
  }, [currentUser, isOffline, addSyncLog]);

  const handleAddDoc = useCallback(async (d: Omit<Document, 'id' | 'updatedAt'>) => {
    const newDocId = `doc-${Date.now()}`;
    const newDocObj: Document = {
      ...d,
      id: newDocId,
      updatedAt: new Date().toISOString().split('T')[0],
      workspaceId: activeWorkspaceId
    };

    setDocs(prev => [...prev, newDocObj]);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload: any = {
            id: newDocObj.id,
            title: newDocObj.title,
            content: newDocObj.content,
            category: newDocObj.category,
            updatedAt: newDocObj.updatedAt,
            updatedBy: newDocObj.updatedBy,
            isAiGenerated: newDocObj.isAiGenerated || false,
            user_id: session.user.id,
            workspace_id: activeWorkspaceId
          };

          const { error } = await supabase.from('docs').insert([payload]);
          
          if (error) {
            console.warn('First doc insert attempt failed, retrying without workspace_id column:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('column') || error.message.includes('relation'))) {
              delete payload.workspace_id;
              const { error: retryError } = await supabase.from('docs').insert([payload]);
              if (retryError) {
                console.error('Retry doc insert failed:', retryError);
                triggerToast({ id: generateId(), type: 'info', title: 'Document Save Error (Supabase)', message: `${retryError.message}`, duration: 4000 });
              } else {
                addSyncLog(`Document saved successfully in compatibility mode (No workspace_id): "${newDocObj.title}"`);
              }
            } else {
              triggerToast({ id: generateId(), type: 'info', title: 'Document Save Error (Supabase)', message: `${error.message}`, duration: 4000 });
            }
          } else {
            addSyncLog(`Document synchronized successfully to Supabase: "${newDocObj.title}"`);
          }
        }
      } catch (err) {
        console.error('Doc insert sync failure:', err);
      }
    }
  }, [activeWorkspaceId, isOffline, setDocs, triggerToast, addSyncLog]);

  const handleUpdateDoc = useCallback(async (updated: Document) => {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('docs').update({
            title: updated.title,
            content: updated.content,
            category: updated.category,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
            isAiGenerated: updated.isAiGenerated || false
          }).eq('id', updated.id);
          if (error) console.error('Supabase Doc Update Error:', error);
        }
      } catch (err) {
        console.error('Doc update sync failure:', err);
      }
    }
  }, [isOffline, setDocs]);

  const handleDeleteDoc = useCallback(async (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('docs').delete().eq('id', id);
          if (error) console.error('Supabase Doc Delete Error:', error);
        }
      } catch (err) {
        console.error('Doc delete sync failure:', err);
      }
    }
  }, [isOffline, setDocs]);

  const handleAddBase = useCallback(async (base: BaseApp) => {
    const baseWithWs = { ...base, workspaceId: activeWorkspaceId };
    useBaseStore.getState().addBase(baseWithWs);
    addSyncLog(`Created Base: "${baseWithWs.name}"`);
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload = {
            id: baseWithWs.id,
            name: baseWithWs.name,
            emoji: baseWithWs.emoji || 'ClipboardList',
            description: baseWithWs.description || '',
            tables: baseWithWs.tables,
            active_table_id: baseWithWs.activeTableId || null,
            workspace_id: activeWorkspaceId,
            updated_at: baseWithWs.updatedAt,
            user_id: session.user.id,
          };
          const { error } = await supabase.from('base_apps').upsert([payload]);
          if (error) console.warn('Base sync warning:', error.message);
        }
      } catch (err) {
        console.error('Base insert sync failure:', err);
      }
    }
  }, [activeWorkspaceId, isOffline, addSyncLog]);

  const handleUpdateBase = useCallback(async (updated: BaseApp) => {
    const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
    useBaseStore.getState().updateBase(withTimestamp);
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload = {
            id: withTimestamp.id,
            name: withTimestamp.name,
            emoji: withTimestamp.emoji || 'ClipboardList',
            description: withTimestamp.description || '',
            tables: withTimestamp.tables,
            active_table_id: withTimestamp.activeTableId || null,
            workspace_id: activeWorkspaceId,
            updated_at: withTimestamp.updatedAt,
            user_id: session.user.id,
          };
          const { error } = await supabase.from('base_apps').upsert([payload]);
          if (error) console.warn('Base sync warning:', error.message);
        }
      } catch (err) {
        console.error('Base update sync failure:', err);
      }
    }
  }, [activeWorkspaceId, isOffline]);

  const handleDeleteBase = useCallback(async (id: string) => {
    useBaseStore.getState().deleteBase(id);
    addSyncLog('Deleted a Base app');
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('base_apps').delete().eq('id', id);
        }
      } catch (err) {
        console.error('Base delete sync failure:', err);
      }
    }
  }, [isOffline, addSyncLog]);

  const handleAddMember = useCallback(async (m: Omit<User, 'id'>) => {
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

        // Search for existing user in members table by email
        const { data: existing, error: findError } = await supabase
          .from('members')
          .select('*')
          .eq('email', m.email)
          .maybeSingle();

        if (existing) {
          const currentWSIds = existing.workspace_ids || [];
          if (currentWSIds.includes(activeWorkspaceId)) {
            return;
          }
          
          const updatedWSIds = [...currentWSIds, activeWorkspaceId];
          const { error } = await supabase
            .from('members')
            .update({ workspace_ids: updatedWSIds })
            .eq('id', existing.id);

          if (!error) {
            useMemberStore.getState().updateMember({
              ...existing,
              id: existing.id === `user-${session.user.id}` ? 'user' : existing.id,
              workspaceIds: updatedWSIds
            } as any);
          }
          return;
        }

        // If not found, create a placeholder profile with the email and the workspaceId!
        const newMemberId = `member-${Date.now()}`;
        const newMemberObj: User = {
          ...m,
          id: newMemberId,
          workspaceIds: [activeWorkspaceId]
        };

        const { error } = await supabase.from('members').insert([{
          id: newMemberObj.id,
          name: newMemberObj.name,
          email: newMemberObj.email,
          avatar: newMemberObj.avatar,
          role: newMemberObj.role,
          status: 'offline', // invited and offline
          phone: newMemberObj.phone || null,
          department: newMemberObj.department || null,
          bio: newMemberObj.bio || null,
          joined_date: newMemberObj.joinedDate || null,
          workspace_ids: [activeWorkspaceId]
        }]);

        if (!error) {
          useMemberStore.getState().addMember(newMemberObj);
        }
      } catch (err) {
        console.error('Member invite failure in useAppActions:', err);
      }
    }
  }, [isOffline]);

  const handleSendWorkspaceInvites = useCallback(async (emails: string[], role: string) => {
    const activeWsId = useWorkspaceStore.getState().activeWorkspaceId;
    const currentWS = workspaces.find(w => w.id === activeWsId);
    const inviterName = currentUser?.name || 'Workspace Admin';

    if (!activeWsId || !currentWS) {
      throw new Error('Please select a workspace before inviting people.');
    }

    const cleanEmails = Array.from(new Set(emails.map(email => email.trim().toLowerCase()).filter(Boolean)));
    const createdInvites: WorkspaceInvitation[] = [];
    const failures: string[] = [];

    for (const cleanEmail of cleanEmails) {
      const inviteId = crypto.randomUUID();
      let newInvite: WorkspaceInvitation = {
        id: inviteId,
        workspaceId: activeWsId,
        workspaceName: currentWS?.name || 'Apexa Workspace',
        email: cleanEmail,
        role: (role as any) || 'member',
        invitedBy: currentUser?.userId || currentUser?.id || 'admin',
        invitedByName: inviterName,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      if (!isOffline) {
        try {
          const { data, error } = await supabase.rpc('create_workspace_invitation', {
            p_workspace_id: activeWsId,
            p_email: cleanEmail,
            p_role: newInvite.role,
            p_inviter_name: inviterName
          });
          if (error) throw error;

          const record = data as any;
          newInvite = {
            ...newInvite,
            id: record.id,
            token: record.token,
            workspaceName: record.workspace_name || newInvite.workspaceName,
            createdAt: record.created_at,
            expiresAt: record.expires_at
          };
        } catch (e) {
          console.error('Exception inserting invitation:', e);
          failures.push(`${cleanEmail}: ${e instanceof Error ? e.message : 'Could not create invitation'}`);
          continue;
        }
      }

      createdInvites.push(newInvite);

      if (typeof window !== 'undefined') {
        const localInvitesRaw = localStorage.getItem('apexa_workspace_invitations');
        const localInvites: WorkspaceInvitation[] = localInvitesRaw ? JSON.parse(localInvitesRaw) : [];
        const filtered = localInvites.filter(i => i.id !== inviteId);
        localStorage.setItem('apexa_workspace_invitations', JSON.stringify([newInvite, ...filtered]));
        window.dispatchEvent(new CustomEvent('apexa-invitation-updated', { detail: newInvite }));
      }
    }

    if (createdInvites.length === 0) {
      throw new Error(failures[0] || 'No invitations were created.');
    }

    triggerToast({
      id: generateId(),
      type: 'success',
      title: 'Invitations Ready',
      message: failures.length > 0
        ? `${createdInvites.length} invitation(s) created; ${failures.length} could not be created.`
        : `${createdInvites.length} secure invitation link(s) are ready to share.`,
      duration: 4000
    });
    addSyncLog(`Created workspace invitations for: ${createdInvites.map(invite => invite.email).join(', ')}`);
  }, [workspaces, currentUser, isOffline, triggerToast, addSyncLog]);

  const handleAcceptWorkspaceInvite = useCallback(async (inviteId: string, workspaceId: string, role: string) => {
    let targetWS = workspaces.find(w => w.id === workspaceId);

    if (!isOffline) {
      const { data: joinedWorkspaceId, error } = await supabase.rpc('accept_workspace_invitation', { invitation_id: inviteId });
      if (error) {
        triggerToast({ id: generateId(), type: 'info', title: 'Could not join workspace', message: error.message, duration: 4000 });
        return;
      }
      workspaceId = (joinedWorkspaceId as string) || workspaceId;
    }

    if (typeof window !== 'undefined') {
      const storedRaw = localStorage.getItem('apexa_workspace_invitations');
      if (storedRaw) {
        const parsed: WorkspaceInvitation[] = JSON.parse(storedRaw);
        localStorage.setItem('apexa_workspace_invitations', JSON.stringify(parsed.map(i => i.id === inviteId ? { ...i, status: 'accepted' as const } : i)));
      }
      window.dispatchEvent(new CustomEvent('apexa-invitation-updated', { detail: { inviteId, status: 'accepted' } }));
    }

    // Fetch the workspace from Supabase and add to store if not already present
    if (!targetWS && !isOffline) {
      try {
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .maybeSingle();

        if (wsData) {
          const mappedWS = {
            id: wsData.id,
            name: wsData.name,
            theme: wsData.theme || 'indigo',
            initial: wsData.initial || wsData.name.charAt(0).toUpperCase(),
            user_id: wsData.user_id,
            coverUrl: wsData.coverUrl || '',
            logoUrl: wsData.logoUrl || '',
            settings: wsData.settings || {},
            membershipRole: (role as any) || 'member'
          };
          targetWS = mappedWS;
          setWorkspaces(prev => {
            const exists = prev.some(w => w.id === mappedWS.id);
            if (exists) return prev;
            return [...prev, mappedWS];
          });
        }
      } catch (e) {
        console.warn('Failed to fetch workspace after accepting invitation:', e);
      }
    }

    if (currentUser) {
      const myMemberId = `user-${currentUser.id}`;
      const myProfile = members.find(m => m.id === 'user' || m.id === myMemberId);
      const existingWsIds = myProfile?.workspaceIds || [];
      const updatedWsIds = Array.from(new Set([...existingWsIds, workspaceId]));

      setMembers(prev => prev.map(m => (m.id === 'user' || m.id === myMemberId) ? { ...m, workspaceIds: updatedWsIds, role: (role as any) || m.role } : m));

    }

    useWorkspaceStore.getState().setActiveWorkspaceId(workspaceId);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('invite_token')) {
        url.searchParams.delete('invite_token');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
      sessionStorage.removeItem('apexa_pending_workspace_invite');
    }

    triggerToast({
      id: generateId(),
      type: 'success',
      title: 'Invitation Accepted!',
      message: `Welcome! You have joined workspace "${targetWS?.name || 'Workspace'}".`,
      duration: 4000
    });
    addSyncLog(`Accepted invitation and joined workspace "${targetWS?.name || workspaceId}"`);

    // Re-run the authenticated data bootstrap so spaces, lists, tasks and docs that
    // just became visible through RLS are available immediately in the new workspace.
    if (!isOffline && typeof window !== 'undefined') {
      window.setTimeout(() => window.location.reload(), 700);
    }
  }, [currentUser, workspaces, members, isOffline, setMembers, setWorkspaces, triggerToast, addSyncLog]);

  const handleDeclineWorkspaceInvite = useCallback(async (inviteId: string) => {
    if (!isOffline) {
      const { error } = await supabase.rpc('decline_workspace_invitation', { invitation_id: inviteId });
      if (error) {
        triggerToast({ id: generateId(), type: 'info', title: 'Could not decline invitation', message: error.message, duration: 4000 });
        return;
      }
    }

    if (typeof window !== 'undefined') {
      const storedRaw = localStorage.getItem('apexa_workspace_invitations');
      if (storedRaw) {
        const parsed: WorkspaceInvitation[] = JSON.parse(storedRaw);
        localStorage.setItem('apexa_workspace_invitations', JSON.stringify(parsed.map(i => i.id === inviteId ? { ...i, status: 'declined' as const } : i)));
      }
      window.dispatchEvent(new CustomEvent('apexa-invitation-updated', { detail: { inviteId, status: 'declined' } }));
      const url = new URL(window.location.href);
      if (url.searchParams.has('invite_token')) {
        url.searchParams.delete('invite_token');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
      sessionStorage.removeItem('apexa_pending_workspace_invite');
    }

    triggerToast({
      id: generateId(),
      type: 'info',
      title: 'Invitation Declined',
      message: 'Workspace invitation has been declined.',
      duration: 4000
    });
    addSyncLog('Declined workspace invitation');
  }, [isOffline, triggerToast, addSyncLog]);

  const handleUpdateMember = useCallback(async (updated: User) => {
    useMemberStore.getState().updateMember(updated);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const currentMember = useMemberStore.getState().members.find(m => m.id === updated.id);
          const finalWSIds = (updated.workspaceIds && updated.workspaceIds.length > 0)
            ? updated.workspaceIds
            : (currentMember?.workspaceIds || []);

          const dbId = updated.id === 'user' ? `user-${session.user.id}` : updated.id;
          const { error } = await supabase.from('members').update({
            name: updated.name,
            email: updated.email,
            avatar: updated.avatar,
            role: updated.role,
            status: updated.status,
            phone: updated.phone || null,
            department: updated.department || null,
            bio: updated.bio || null,
            joined_date: updated.joinedDate || null,
            workspace_ids: finalWSIds.length > 0 ? finalWSIds : null
          }).eq('id', dbId);
          if (error) console.error('Supabase Member Update Error:', error);
        }
      } catch (err) {
        console.error('Member update sync failure:', err);
      }
    }
  }, [isOffline]);

  const handleDeleteMember = useCallback(async (id: string) => {
    useMemberStore.getState().deleteMember(id);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const dbId = id === 'user' ? `user-${session.user.id}` : id;
          const { error } = await supabase.from('members').delete().eq('id', dbId);
          if (error) console.error('Supabase Member Delete Error:', error);
        }
      } catch (err) {
        console.error('Member delete sync failure:', err);
      }
    }
  }, [isOffline]);

  const handleSaveSpaces = useCallback(async (newSpaces: Space[]) => {
    const currentAllSpaces = useSpaceStore.getState().spaces;
    const allMergedSpaces = newSpaces;

    useSpaceStore.getState().setSpaces(allMergedSpaces);

    if (!currentUser?.id) return;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`apexa_spaces_${currentUser.id}`, JSON.stringify(allMergedSpaces));
        localStorage.setItem(`avaxa_spaces_${currentUser.id}`, JSON.stringify(allMergedSpaces));
      } catch (e) {}
    }

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          const validWsIds = new Set(workspaces.map(w => w.id));

          const oldSpaceIds = currentAllSpaces.map(s => s.id);
          const newSpaceIds = allMergedSpaces.map(s => s.id);
          const deletedSpaceIds = oldSpaceIds.filter(id => !newSpaceIds.includes(id));

          if (deletedSpaceIds.length > 0) {
             await supabase.from('spaces').delete().in('id', deletedSpaceIds);
          }

          for (const space of allMergedSpaces) {
            let spaceWsId = space.workspaceId;
            if (!spaceWsId || (!validWsIds.has(spaceWsId) && validWsIds.size > 0)) {
              spaceWsId = activeWorkspaceId || workspaces[0]?.id || spaceWsId;
            }

            const currentLists = space.lists || [];
            const { error: spaceUpsertErr } = await supabase.from('spaces').upsert({
              id: space.id,
              name: space.name,
              emoji: space.emoji || null,
              theme_color: space.themeColor || null,
              workspace_id: spaceWsId,
              folders: space.folders || [],
              whiteboards: space.whiteboards || [],
              channels: space.channels || [],
              statuses: space.statuses || [],
              click_apps: {
                ...(space.clickApps || {}),
                spacePreferences: {
                  description: space.description || '',
                  isFavorite: !!space.isFavorite,
                  isHidden: !!space.isHidden,
                  isArchived: !!space.isArchived,
                  listPreferences: Object.fromEntries(currentLists.map(list => [list.id, {
                    isFavorite: !!list.isFavorite,
                    isArchived: !!list.isArchived
                  }]))
                }
              },
              custom_fields_config: space.customFields || [],
              user_id: userId,
              is_private: space.isPrivate || false,
              share_settings: space.shareSettings || {}
            });

            if (spaceUpsertErr) {
              console.warn('Failed to upsert space in Supabase:', spaceUpsertErr.message || spaceUpsertErr);
              // Skip list upsert if space upsert failed to avoid FK/RLS violation
              continue;
            }

            const oldSpace = currentAllSpaces.find(s => s.id === space.id);
            const oldListIds = (oldSpace?.lists || []).map(l => l.id);
            const newListIds = currentLists.map(l => l.id);

            const deletedListIds = oldListIds.filter(id => !newListIds.includes(id));
            if (deletedListIds.length > 0) {
               await supabase.from('lists').delete().in('id', deletedListIds);
            }

            if (currentLists.length > 0) {
              const listsToUpsert = currentLists.map((list, idx) => ({
                id: list.id,
                name: list.name,
                space_id: space.id,
                folder_id: list.folderId || null,
                user_id: userId,
                is_private: list.isPrivate || false,
                share_settings: list.shareSettings || {},
                is_favorite: Boolean(list.isFavorite),
                is_archived: Boolean(list.isArchived),
                position: typeof list.position === 'number' ? list.position : idx
              }));
              const { error: listUpsertErr } = await supabase.from('lists').upsert(listsToUpsert, { onConflict: 'id' });
              if (listUpsertErr) {
                console.error('Failed to upsert lists in Supabase:', listUpsertErr.message || listUpsertErr.details || listUpsertErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error syncing spaces/lists with Supabase:', err);
      }
    }
  }, [currentUser, isOffline, workspaces, activeWorkspaceId]);

  const handleAddSpace = useCallback((name: string, emoji?: string, themeColor?: string) => {
    if (!name.trim()) return;

    // Check Free Plan limit: Max 5 spaces per workspace
    const workspaceSpacesCount = spaces.filter(s => s.workspaceId === activeWorkspaceId).length;
    const isPremiumUser = currentUser?.isPremium;
    if (!isPremiumUser && workspaceSpacesCount >= 5) {
      triggerToast({ id: generateId(), type: 'info', title: 'Giới hạn gói Free', message: 'Tài khoản Miễn phí chỉ tạo được tối đa 5 Spaces. Vui lòng nâng cấp gói Pro để không giới hạn!', duration: 4000 });
      setShowPremiumModal(true);
      return;
    }
    
    const newSpace: Space & { description?: string; isPrivate?: boolean; defaultPermission?: string } = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      emoji: emoji || 'Package',
      themeColor: themeColor || 'indigo',
      workspaceId: activeWorkspaceId,
      lists: [{ id: `l-${Date.now()}`, name: 'General Tasks' }],
      folders: [],
      whiteboards: [],
      channels: [],
      statuses: [
        { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
        { id: 'inprogress', label: 'In Progress', color: '#6366f1', type: 'inprogress' },
        { id: 'review', label: 'Review', color: '#f59e0b', type: 'review' },
        { id: 'completed', label: 'Completed', color: '#10b981', type: 'completed' }
      ],
      clickApps: { subtasks: true, priorities: true, customFields: true },
    };
    
    handleSaveSpaces([...spaces, newSpace]);
    setActiveSpaceId(newSpace.id);
    if (newSpace.lists.length > 0) {
      setActiveListId(newSpace.lists[0].id);
    }
    setActiveTab('tasks');
    triggerToast({ id: generateId(), type: 'success', title: 'Space Created! 🎉', message: `Đã tạo space "${newSpace.name}" thành công.`, duration: 4000 });
    addSyncLog(`Created new Space: "${newSpace.name}"`);
  }, [activeWorkspaceId, spaces, currentUser?.isPremium, handleSaveSpaces, setActiveSpaceId, setActiveListId, setActiveTab, setShowPremiumModal, triggerToast, addSyncLog]);

  const handleDeleteSpace = useCallback((spaceId: string) => {
    const updated = spaces.filter(s => s.id !== spaceId);
    handleSaveSpaces(updated);
    triggerToast({ id: generateId(), type: 'info', title: 'Space Deleted', message: 'Workspace has been deleted.', duration: 4000 });
  }, [spaces, handleSaveSpaces, triggerToast]);

  const handleSaveSpaceSettings = useCallback((spaceId: string, name: string, emoji: string, themeColor: string, clickApps: any, statuses: any[]) => {
    const updated = spaces.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          name: name.trim(),
          emoji,
          themeColor,
          clickApps,
          statuses
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast({ id: generateId(), type: 'success', title: 'Settings Saved', message: 'Updated space configurations.', duration: 4000 });
  }, [spaces, handleSaveSpaces, triggerToast]);

  const handleAddList = useCallback((spaceId: string | null, name: string) => {
    if (!name.trim() || !spaceId) return;
    const currentSpaces = useSpaceStore.getState().spaces;
    const updated = currentSpaces.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          lists: [...(s.lists || []), { id: `l-${Date.now()}`, name: name.trim(), position: (s.lists || []).length }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast({ id: generateId(), type: 'success', title: 'New List Created', message: 'List added successfully', duration: 4000 });
  }, [handleSaveSpaces, triggerToast]);

  const handleAddFolderToSpace = useCallback((spaceId: string, name: string) => {
    const currentSpaces = useSpaceStore.getState().spaces;
    const updated = currentSpaces.map(s => {
      if (s.id === spaceId) {
        const folders = s.folders || [];
        return {
          ...s,
          folders: [...folders, { id: `folder-${Date.now()}`, name }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast({ id: generateId(), type: 'success', title: 'New Folder Created', message: `Created folder "${name}"`, duration: 4000 });
    addSyncLog(`Created Folder "${name}" in Space`);
  }, [handleSaveSpaces, triggerToast, addSyncLog]);

  const handleAddDocToSpace = useCallback((spaceId: string, title: string, folderId?: string) => {
    handleAddDoc({
      title,
      content: '',
      category: 'General',
      updatedBy: currentUser?.name || 'User',
      spaceId,
      folderId
    });
    triggerToast({ id: generateId(), type: 'success', title: 'New Document Created', message: `Created doc "${title}"`, duration: 4000 });
  }, [handleAddDoc, currentUser, triggerToast]);

  const handleAddWhiteboardToSpace = useCallback((spaceId: string, name: string, folderId?: string) => {
    const currentSpaces = useSpaceStore.getState().spaces;
    const updated = currentSpaces.map(s => {
      if (s.id === spaceId) {
        const whiteboards = s.whiteboards || [];
        return {
          ...s,
          whiteboards: [...whiteboards, { id: `wb-${Date.now()}`, name, folderId }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast({ id: generateId(), type: 'success', title: 'New Whiteboard Created', message: `Created whiteboard "${name}"`, duration: 4000 });
    addSyncLog(`Created Whiteboard "${name}" in Space`);
  }, [handleSaveSpaces, triggerToast, addSyncLog]);

  const handleAddListToFolder = useCallback((spaceId: string, folderId: string, name: string) => {
    const currentSpaces = useSpaceStore.getState().spaces;
    const updated = currentSpaces.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          lists: [...(s.lists || []), { id: `l-${Date.now()}`, name, folderId, position: (s.lists || []).length }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast({ id: generateId(), type: 'success', title: 'New List Created', message: `Created list "${name}" in folder`, duration: 4000 });
    addSyncLog(`Created List "${name}" under Folder`);
  }, [handleSaveSpaces, triggerToast, addSyncLog]);

  const mapTasksToSpaces = useCallback((tasksList: Task[]): Task[] => {
    return tasksList.map(t => {
      if (t.spaceId) {
        return {
          ...t,
          assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : [])
        };
      }
      
      let spaceId = t.spaceId;
      let listId = t.listId;
      
      if (t.workspaceId === 'w2' || !t.workspaceId) {
        const title = t.title.toLowerCase();
        if (title.includes('seo') || title.includes('keyword')) {
          spaceId = 's-w2-marketing';
          listId = 'l-w2-seo';
        } else if (title.includes('campaign') || title.includes('kickoff')) {
          spaceId = 's-w2-marketing';
          listId = 'l-w2-campaign';
        } else if (title.includes('email') || title.includes('launch')) {
          spaceId = 's-w2-marketing';
          listId = 'l-w2-email';
        } else if (title.includes('bug') || title.includes('error') || title.includes('fix') || title.includes('test')) {
          spaceId = 's-w2-qe';
          listId = title.includes('test') ? 'l-w2-tests' : 'l-w2-bugs';
        } else if (title.includes('design') || title.includes('ui') || title.includes('ux') || title.includes('mockup') || title.includes('logo')) {
          spaceId = 's-w2-design';
          listId = 'l-w2-mockups';
        } else {
          spaceId = 's-w2-product';
          listId = 'l-w2-sprint1';
        }
      } else if (t.workspaceId === 'w1') {
        spaceId = 's-w1-personal';
        listId = 'l-w1-todo';
      } else if (t.workspaceId === 'w3') {
        spaceId = 's-w3-prep';
        listId = 'l-w3-roadmap';
      }
      
      return {
        ...t,
        spaceId,
        listId,
        assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : [])
      };
    });
  }, []);

  return {
    handleCreateWorkspace,
    handleUpdateWorkspace,
    handleDeleteWorkspace,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    handleUpdateTaskOrder,
    handleAddDoc,
    handleUpdateDoc,
    handleDeleteDoc,
    handleAddBase,
    handleUpdateBase,
    handleDeleteBase,
    handleAddMember,
    handleUpdateMember,
    handleDeleteMember,
    handleSaveSpaces,
    handleAddSpace,
    handleDeleteSpace,
    handleSaveSpaceSettings,
    handleAddList,
    handleAddFolderToSpace,
    handleAddDocToSpace,
    handleAddWhiteboardToSpace,
    handleAddListToFolder,
    handleWorkspaceChange: useCallback((w: any) => {
      useWorkspaceStore.getState().setActiveWorkspaceId(w.id);
      useWorkspaceStore.getState().setAccentPreset(w.theme);
      useUiStore.getState().setShowWorkspaceMenu(false);
      useSpaceStore.getState().setActiveSpaceId(null);
      useSpaceStore.getState().setActiveListId(null);
      addSyncLog(`Switched to workspace: ${w.name}`);
    }, [addSyncLog]),
    openWorkspaceSettings: useCallback((w: any) => {
      useUiStore.getState().setEditingWorkspaceForModal(w);
      useUiStore.getState().setShowWorkspaceSettingsModal(true);
      useUiStore.getState().setShowWorkspaceMenu(false);
    }, []),
    openSpaceSettings: useCallback((space: any) => {
      useUiStore.getState().setShowSpaceSettingsId(space.id);
      useUiStore.getState().setEditSpaceName(space.name);
      useUiStore.getState().setEditSpaceEmoji(space.emoji || 'Package');
      useUiStore.getState().setEditSpaceColor(space.themeColor || 'indigo');
      useUiStore.getState().setEditSpaceClickApps(space.clickApps || { subtasks: true, priorities: true });
      useUiStore.getState().setEditSpaceStatuses(space.statuses || [
        { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
        { id: 'inprogress', label: 'In Progress', color: '#f59e0b', type: 'inprogress' },
        { id: 'review', label: 'Review', color: '#06b6d4', type: 'review' },
        { id: 'completed', label: 'Done', color: '#10b981', type: 'completed' }
      ]);
    }, []),
    saveWorkspaceSettings: useCallback(() => {
      const settingsId = useUiStore.getState().editingWorkspaceForModal?.id;
      if (!settingsId) return;
      handleUpdateWorkspace(
        settingsId,
        useUiStore.getState().editSpaceName,
        useUiStore.getState().editSpaceColor
      );
      useUiStore.getState().setShowWorkspaceSettingsModal(false);
    }, [handleUpdateWorkspace]),
    cancelWorkspaceSettings: useCallback(() => {
      useUiStore.getState().setShowWorkspaceSettingsModal(false);
    }, []),
    handleSendWorkspaceInvites,
    handleAcceptWorkspaceInvite,
    handleDeclineWorkspaceInvite,
    mapTasksToSpaces,
  };
}
