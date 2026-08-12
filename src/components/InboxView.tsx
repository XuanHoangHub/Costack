"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Bell, Check, Trash2, Eye, EyeOff, Pin, Archive, Clock, Search, 
  ArrowRight, Inbox, HelpCircle, ArchiveRestore, Sparkles, Filter, CheckSquare
} from 'lucide-react';
import { Task, User, Workspace, WorkspaceInvitation } from '../types';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';

interface InboxViewProps {
  notificationsList: any[];
  setNotificationsList: React.Dispatch<React.SetStateAction<any[]>>;
  tasks: Task[];
  members: User[];
  workspaces: Workspace[];
  spaces?: any[];
  activeWorkspaceId: string;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & Partial<Pick<Task, 'commentsCount' | 'progress'>>) => void;
  onDeleteTask: (id: string) => void;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  currentUser: any;
  onUpgradePremium: () => void;
  workspaceInvitations?: WorkspaceInvitation[];
  onAcceptInvite?: (id: string, workspaceId: string, role: string) => void;
  onDeclineInvite?: (id: string) => void;
}

export default function InboxView({
  notificationsList,
  setNotificationsList,
  tasks,
  members,
  workspaces,
  spaces = [],
  activeWorkspaceId,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onAddSyncLog,
  triggerToast,
  currentUser,
  onUpgradePremium,
  workspaceInvitations = [],
  onAcceptInvite,
  onDeclineInvite
}: InboxViewProps) {
  // Tabs: 'all' | 'assigned' | 'mentions' | 'saved' | 'unread' | 'archived'
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'mentions' | 'saved' | 'unread' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [expandedGroupTaskIds, setExpandedGroupTaskIds] = useState<string[]>([]);
  
  // Local states for TaskDetailsPanel
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [showSnoozeDropdownId, setShowSnoozeDropdownId] = useState<string | null>(null);

  // Auto recovery for expired snoozes on mount
  useEffect(() => {
    const now = Date.now();
    setNotificationsList(prev => prev.map(n => {
      if (n.snoozedUntil && n.snoozedUntil <= now) {
        return { ...n, snoozedUntil: undefined };
      }
      return n;
    }));
  }, [setNotificationsList]);

  // Extract task ID from title or message using regex
  const getAssociatedTaskId = useCallback((notif: any): string | undefined => {
    if (notif.taskId) return notif.taskId;
    
    const quoteMatch = notif.message?.match(/"([^"]+)"/) || notif.title?.match(/"([^"]+)"/);
    if (quoteMatch) {
      const matchedText = quoteMatch[1];
      const task = tasks.find(t => t.title.toLowerCase() === matchedText.toLowerCase());
      if (task) return task.id;
    }
    
    const taskSub = tasks.find(t => 
      notif.message?.toLowerCase().includes(t.title.toLowerCase()) || 
      notif.title?.toLowerCase().includes(t.title.toLowerCase())
    );
    return taskSub?.id;
  }, [tasks]);

  // Find the selected notification object
  const selectedNotif = useMemo(() => {
    return notificationsList.find(n => n.id === selectedNotificationId);
  }, [notificationsList, selectedNotificationId]);

  // Resolve the task associated with the selected notification
  const selectedTask = useMemo(() => {
    if (!selectedNotif) return null;
    const taskId = getAssociatedTaskId(selectedNotif);
    return tasks.find(t => t.id === taskId) || null;
  }, [selectedNotif, tasks, getAssociatedTaskId]);

  // Categorize and filter notifications
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    return notificationsList.filter(n => {
      // 0. Workspace Isolation Filter
      const matchesWorkspace = !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      if (!matchesWorkspace) return false;

      // 1. Text Search Filter
      const matchesSearch = 
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Type Filter
      if (filterType !== 'all') {
        if (filterType === 'assignments' && n.type !== 'assignment') return false;
        if (filterType === 'deadlines' && n.type !== 'deadline') return false;
        if (filterType === 'comments' && n.type !== 'comment') return false;
        if (filterType === 'updates' && !['success', 'info', 'message'].includes(n.type)) return false;
      }

      // 3. New Triage Tab Filters
      const isSnoozed = n.snoozedUntil && n.snoozedUntil > now;
      const isCleared = n.cleared === true;

      // Archived tab: ONLY show cleared notifications
      if (activeTab === 'archived') {
        return isCleared;
      }

      // If cleared, hide from all other active streams
      if (isCleared) return false;

      // Unread: only show non-cleared, non-snoozed unread items
      if (activeTab === 'unread') {
        return !n.read && !isSnoozed;
      }

      // Saved for Later: show pinned or snoozed items
      if (activeTab === 'saved') {
        return (n.pinned || isSnoozed);
      }

      // If snoozed, hide from standard active streams
      if (isSnoozed) return false;

      // Mentions: filter items where type is comment or message contains '@'
      if (activeTab === 'mentions') {
        const containsMention = n.title?.includes('@') || n.message?.includes('@') || n.type === 'comment';
        return containsMention;
      }

      // Assigned to Me
      if (activeTab === 'assigned') {
        const taskId = getAssociatedTaskId(n);
        const task = tasks.find(t => t.id === taskId);
        const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
        return isAssigned;
      }

      // 'all': just return standard non-cleared non-snoozed notifications
      return true;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [notificationsList, activeTab, searchQuery, filterType, tasks, currentUser, getAssociatedTaskId]);

  // Grouping updates on the same task into a single collapsible card thread
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const standalone: any[] = [];

    filteredNotifications.forEach(n => {
      const taskId = getAssociatedTaskId(n);
      if (taskId) {
        if (!groups[taskId]) {
          groups[taskId] = [];
        }
        groups[taskId].push(n);
      } else {
        standalone.push(n);
      }
    });

    const result: any[] = [];

    // Add standalone notifications
    standalone.forEach(n => {
      result.push({ isGroup: false, key: n.id, notif: n });
    });

    // Add grouped notifications
    Object.keys(groups).forEach(taskId => {
      const list = groups[taskId];
      if (list.length === 1) {
        result.push({ isGroup: false, key: list[0].id, notif: list[0] });
      } else {
        const hasUnread = list.some(n => !n.read);
        const isPinned = list.some(n => n.pinned);
        const representative = list[0]; 
        result.push({ 
          isGroup: true, 
          key: `group-${taskId}`, 
          taskId, 
          notifs: list, 
          representative,
          read: !hasUnread,
          pinned: isPinned
        });
      }
    });

    return result.sort((a, b) => {
      const aPinned = a.isGroup ? a.pinned : a.notif.pinned;
      const bPinned = b.isGroup ? b.pinned : b.notif.pinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [filteredNotifications, getAssociatedTaskId]);

  // Actions
  const handleToggleRead = useCallback((id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, read: !n.read } : n
    ));
  }, [setNotificationsList]);

  const handleClear = useCallback((id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, cleared: true } : n
    ));
    if (selectedNotificationId === id) {
      setSelectedNotificationId(null);
    }
    if (triggerToast) triggerToast('success', 'Cleared Notification', 'Notification cleared and moved to archive.');
  }, [selectedNotificationId, setNotificationsList, triggerToast]);

  const handleRestore = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, cleared: false } : n
    ));
    if (triggerToast) triggerToast('success', 'Restored Notification', 'Notification restored to Inbox.');
  };

  const handleTogglePin = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, pinned: !n.pinned } : n
    ));
  };

  const handleSnooze = useCallback((id: string, durationHours: number) => {
    const snoozeTime = Date.now() + durationHours * 60 * 60 * 1000;
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, snoozedUntil: snoozeTime } : n
    ));
    if (selectedNotificationId === id) {
      setSelectedNotificationId(null);
    }
    setShowSnoozeDropdownId(null);
    if (triggerToast) triggerToast('info', 'Notification Snoozed', `Snoozed for ${durationHours} hours.`);
  }, [selectedNotificationId, setNotificationsList, triggerToast]);

  const handleClearSnooze = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, snoozedUntil: undefined } : n
    ));
    if (triggerToast) triggerToast('success', 'Snooze Removed', 'Notification returned to active Inbox.');
  };

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentTab = filteredNotifications.some(fn => fn.id === n.id);
      return isInCurrentTab ? { ...n, read: true } : n;
    }));
    if (triggerToast) triggerToast('success', 'Success', 'Marked visible notifications as read.');
  };

  const handleClearAllVisible = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentTab = filteredNotifications.some(fn => fn.id === n.id);
      return isInCurrentTab ? { ...n, cleared: true } : n;
    }));
    setSelectedNotificationId(null);
    if (triggerToast) triggerToast('success', 'Success', 'Cleared all notifications in this view.');
  };

  // Keyboard navigation shortcuts
  const activeKeys = useMemo(() => {
    return groupedNotifications.map(g => g.isGroup ? g.representative.id : g.notif.id);
  }, [groupedNotifications]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      const currentIdx = activeKeys.indexOf(selectedNotificationId || '');
      if (e.key === 'j') {
        e.preventDefault();
        const nextIdx = currentIdx < activeKeys.length - 1 ? currentIdx + 1 : currentIdx;
        if (nextIdx >= 0 && activeKeys[nextIdx]) {
          setSelectedNotificationId(activeKeys[nextIdx]);
        }
      } else if (e.key === 'k') {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : 0;
        if (prevIdx >= 0 && activeKeys[prevIdx]) {
          setSelectedNotificationId(activeKeys[prevIdx]);
        }
      } else if (e.key === 'e') {
        if (selectedNotificationId) {
          e.preventDefault();
          handleClear(selectedNotificationId);
        }
      } else if (e.key === 'r') {
        if (selectedNotificationId) {
          e.preventDefault();
          handleToggleRead(selectedNotificationId);
        }
      } else if (e.key === 's') {
        if (selectedNotificationId) {
          e.preventDefault();
          handleSnooze(selectedNotificationId, 24);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKeys, selectedNotificationId, handleClear, handleSnooze, handleToggleRead]);

  // Local Task Attachment & AI utilities for details panel
  const handleAttachmentUpload = async (task: Task, e: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | null = null;
    if (e instanceof File) {
      file = e;
    } else if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }
    if (!file) return;

    const newAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: file.name,
      filePath: `attachments/${file.name}`,
      size: file.size,
      uploadedAt: new Date().toISOString()
    };

    const updatedTask = {
      ...task,
      attachments: [...(task.attachments || []), newAttachment]
    };
    onUpdateTask(updatedTask);
    if (triggerToast) triggerToast('success', 'Attachment Uploaded', `Uploaded ${file.name}`);
  };

  const handleAttachmentDelete = async (task: Task, att: any) => {
    const attachmentId = typeof att === 'string' ? att : att.id;
    const updatedTask = {
      ...task,
      attachments: (task.attachments || []).filter(a => a.id !== attachmentId)
    };
    onUpdateTask(updatedTask);
    if (triggerToast) triggerToast('success', 'Attachment Deleted', 'Removed attachment successfully.');
  };

  const triggerAiSubtasks = async (task: Task) => {
    if (!currentUser?.isPremium) {
      onUpgradePremium();
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtasks)) {
        const gen = data.subtasks.map((t: string, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          title: t,
          completed: false
        }));
        const updated = {
          ...task,
          subtasks: [...task.subtasks, ...gen],
          progress: Math.round((task.subtasks.filter(s => s.completed).length / Math.max(1, task.subtasks.length + gen.length)) * 100)
        };
        onUpdateTask(updated);
        onAddSyncLog(`AI suggested ${gen.length} subtasks for "${task.title}"`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiSummary = async (task: Task) => {
    if (!currentUser?.isPremium) {
      onUpgradePremium();
      return;
    }
    setIsSummarizing(true);
    try {
      const assignee = members.find(m => m.id === task.assigneeId);
      const res = await fetch('/api/ai/task-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, assigneeName: assignee?.name || 'Unassigned' })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setAiSummary(data.text);
        localStorage.setItem(`apexa_task_ai_summary_${task.id}`, data.text);
        onAddSyncLog(`AI summary for "${task.title}"`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4">
      
      {/* Left Column: Notifications List Pane */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-[#07080c] rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.015)] ${
        selectedTask ? 'hidden md:flex md:max-w-md' : 'flex'
      }`}>
        
        {/* Header Section */}
        <div className="p-4.5 border-b border-slate-100 dark:border-slate-800/80 space-y-3.5 select-none shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-955/20 flex items-center justify-center text-pink-500 shadow-2xs">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-1">Inbox</h2>
                <span className="text-[10px] text-slate-400 font-bold">Manage updates & notifications</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={handleMarkAllRead}
                disabled={filteredNotifications.length === 0}
                className="px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50 transition-colors"
                title="Mark all in this tab as read"
              >
                Mark Read
              </button>
              <button 
                onClick={handleClearAllVisible}
                disabled={filteredNotifications.length === 0}
                className="px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 border border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50 transition-colors"
                title="Archive all in this tab"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search and Quick filters */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0e0f1a] border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-2.5 py-1.5 flex-1 shadow-3xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search inbox..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
              />
            </div>
            
            <div className="relative shrink-0 flex items-center bg-slate-50 dark:bg-[#0e0f1a] border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-2 py-1 shadow-3xs">
              <Filter className="w-3 h-3 text-slate-400 mr-1.5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-slate-655 dark:text-slate-400 border-none pr-1"
              >
                <option value="all">All Types</option>
                <option value="assignments">Assignments</option>
                <option value="deadlines">Deadlines</option>
                <option value="comments">Comments</option>
                <option value="updates">System</option>
              </select>
            </div>
          </div>

          {/* Notification Tabs */}
          <div className="flex bg-slate-105/75 dark:bg-[#090a12] p-0.5 rounded-xl border border-slate-200/10 dark:border-slate-800/60 select-none overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'assigned', label: 'Assigned' },
              { id: 'mentions', label: 'Mentions' },
              { id: 'saved', label: 'Saved' },
              { id: 'unread', label: 'Unread' },
              { id: 'archived', label: 'Archived' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedNotificationId(null);
                }}
                className={`flex-1 text-[10.5px] font-bold py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#16182c] text-slate-850 dark:text-slate-100 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-205'
                }`}
              >
                {tab.label}
                {(() => {
                  const now = Date.now();
                  const notifCount = notificationsList.filter(n => {
                    const isSnoozed = n.snoozedUntil && n.snoozedUntil > now;
                    const isCleared = n.cleared === true;

                    if (tab.id === 'archived') return isCleared && !n.read;
                    if (tab.id === 'unread') return !n.read && !isCleared && !isSnoozed;
                    if (tab.id === 'saved') return (n.pinned || isSnoozed) && !isCleared;
                    if (isSnoozed || isCleared) return false;

                    if (tab.id === 'mentions') {
                      return !n.read && (n.title?.includes('@') || n.message?.includes('@') || n.type === 'comment');
                    }
                    if (tab.id === 'assigned') {
                      const tId = getAssociatedTaskId(n);
                      const t = tasks.find(x => x.id === tId);
                      return !n.read && (t?.assigneeId === currentUser?.id || t?.assigneeIds?.includes(currentUser?.id));
                    }
                    // 'all': unread count
                    return !n.read;
                  }).length;

                  const totalCount = notifCount + ((tab.id === 'all' || tab.id === 'unread') ? workspaceInvitations.length : 0);

                  return totalCount > 0 ? (
                    <span className="absolute -top-1 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-indigo-500 text-white text-[7.5px] font-black flex items-center justify-center border border-white dark:border-slate-800">
                      {totalCount}
                    </span>
                  ) : null;
                })()}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0">
          {/* Workspace Invitations Section */}
          {workspaceInvitations.length > 0 && (
            <div className="mb-4 space-y-2.5 border-b border-slate-200/60 dark:border-slate-800/80 pb-4 shrink-0">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Lời mời Workspace ({workspaceInvitations.length})
                  </span>
                </div>
                <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
                  Cần phản hồi
                </span>
              </div>
              {workspaceInvitations.map(inv => (
                <div 
                  key={inv.id} 
                  className="p-3.5 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/40 border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl flex flex-col gap-3 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                        <h5 className="text-[13px] font-black text-slate-850 dark:text-slate-100 truncate">
                          {inv.workspaceName || 'Workspace mới'}
                        </h5>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-snug">
                        <strong className="text-slate-800 dark:text-slate-100">{inv.invitedByName || inv.invitedBy || 'Quản trị viên'}</strong> đã mời bạn tham gia workspace này với vai trò <span className="font-extrabold uppercase text-indigo-600 dark:text-indigo-400">{inv.role}</span>.
                      </p>
                      {inv.createdAt && (
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(inv.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1 border-t border-indigo-100/50 dark:border-indigo-900/30">
                    <button 
                      onClick={() => onDeclineInvite?.(inv.id)}
                      className="px-3.5 py-1.5 text-[11px] font-bold rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>
                    <button 
                      onClick={() => onAcceptInvite?.(inv.id, inv.workspaceId, inv.role)}
                      className="px-4 py-1.5 text-[11px] font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white cursor-pointer transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tham gia ngay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {groupedNotifications.map(item => {
            if (item.isGroup) {
              const isExpanded = expandedGroupTaskIds.includes(item.taskId);
              const totalUpdates = item.notifs.length;
              const hasTaskLink = !!getAssociatedTaskId(item.representative);
              const isSelected = selectedNotificationId === item.representative.id;

              return (
                <div key={item.key} className="space-y-1.5 border border-transparent p-0.5 rounded-2xl relative">
                  {/* Master Group Card (Representative) */}
                  <div 
                    onClick={() => setSelectedNotificationId(item.representative.id)}
                    className={`group p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer relative z-10 ${
                      isSelected
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/40 shadow-3xs'
                        : item.read 
                          ? 'bg-slate-50/30 dark:bg-[#0d0e19] border-slate-150/40 dark:border-slate-800/60 opacity-80 hover:opacity-100 hover:bg-slate-50/60 dark:hover:bg-[#121424]' 
                          : 'bg-indigo-50/10 dark:bg-[#121426] border-indigo-100/40 dark:border-indigo-900/30 hover:bg-indigo-50/30 hover:border-indigo-200/50 shadow-3xs'
                    } ${
                      item.representative.type === 'comment' || item.representative.type === 'assignment' ? 'border-l-[3.5px] border-l-indigo-500' :
                      item.representative.type === 'deadline' ? 'border-l-[3.5px] border-l-rose-500' :
                      'border-l-[3.5px] border-l-slate-400 dark:border-l-slate-600'
                    }`}
                  >
                    {/* Unread indicator */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${item.read ? 'opacity-0' : 'bg-indigo-500'}`} />
                      <div className="p-1.5 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-baseline justify-between gap-2.5">
                        <h4 className={`text-[11.5px] truncate ${item.read ? 'font-semibold text-slate-600 dark:text-slate-300' : 'font-extrabold text-slate-900 dark:text-slate-100'}`}>
                          {item.representative.title}
                        </h4>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-normal mt-0.5 line-clamp-2">
                        {item.representative.message}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">{item.representative.timestamp}</span>
                        {hasTaskLink && (
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black px-1.5 py-0.5 rounded tracking-wide uppercase">Linked Task</span>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroupTaskIds(prev => 
                              isExpanded ? prev.filter(id => id !== item.taskId) : [...prev, item.taskId]
                            );
                          }}
                          className="text-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                        >
                          {isExpanded ? 'Collapse' : `+${totalUpdates} updates`}
                        </button>
                      </div>
                    </div>

                    {/* Quick Hover Actions */}
                    <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 rounded-lg p-0.5 shadow-xs border border-slate-100 dark:border-slate-800/80" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => handleTogglePin(item.representative.id)}
                        className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${item.pinned ? 'text-amber-500' : 'text-slate-400'}`}
                        title={item.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="w-3 h-3 fill-current" />
                      </button>
                      <button 
                        onClick={() => handleToggleRead(item.representative.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Toggle Read"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleClear(item.representative.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Archive"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Collapsed Stack Effect */}
                  {!isExpanded && (
                    <div className="relative mx-3 -mt-1 h-1.5 border-x border-b border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 rounded-b-2xl shadow-3xs scale-95 opacity-80" />
                  )}

                  {/* Expanded Nested Children List */}
                  {isExpanded && (
                    <div className="pl-4 space-y-1.5 border-l border-slate-200 dark:border-slate-800 ml-3.5 py-1">
                      {item.notifs.slice(1).map((childNotif: any) => {
                        const isChildSelected = selectedNotificationId === childNotif.id;
                        return (
                          <div 
                            key={childNotif.id}
                            onClick={() => setSelectedNotificationId(childNotif.id)}
                            className={`group p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer relative ${
                              isChildSelected
                                ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-905'
                                : childNotif.read 
                                  ? 'bg-slate-50/10 dark:bg-slate-955/5 border-slate-100 dark:border-slate-850 opacity-60' 
                                  : 'bg-white dark:bg-slate-900 border-slate-150'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                              <div className={`w-1 h-1 rounded-full shrink-0 ${childNotif.read ? 'opacity-0' : 'bg-indigo-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0 pr-5">
                              <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-normal">{childNotif.message}</p>
                              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold block mt-1">{childNotif.timestamp}</span>
                            </div>
                            {/* Hover Actions */}
                            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 rounded p-0.5 border border-slate-100/50" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleToggleRead(childNotif.id)} className="p-0.5 text-slate-400 hover:text-slate-600"><Eye className="w-2.5 h-2.5" /></button>
                              <button onClick={() => handleClear(childNotif.id)} className="p-0.5 text-slate-400 hover:text-rose-500"><Check className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Standalone Card
            const hasTaskLink = !!getAssociatedTaskId(item.notif);
            const isSelected = selectedNotificationId === item.notif.id;
            return (
              <div 
                key={item.key}
                onClick={() => setSelectedNotificationId(item.notif.id)}
                className={`group p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/40 shadow-3xs'
                    : item.notif.read 
                      ? 'bg-slate-50/30 dark:bg-[#0d0e19] border-slate-150/40 dark:border-slate-800/60 opacity-80 hover:opacity-100 hover:bg-slate-50/60 dark:hover:bg-[#121424]' 
                      : 'bg-indigo-50/10 dark:bg-[#121426] border-indigo-100/40 dark:border-indigo-900/30 hover:bg-indigo-50/30 hover:border-indigo-200/50 shadow-3xs'
                } ${
                  item.notif.type === 'comment' || item.notif.type === 'assignment' ? 'border-l-[3.5px] border-l-indigo-500' :
                  item.notif.type === 'deadline' ? 'border-l-[3.5px] border-l-rose-500' :
                  'border-l-[3.5px] border-l-slate-400 dark:border-l-slate-600'
                }`}
              >
                {/* Pin indicator */}
                {item.notif.pinned && (
                  <div className="absolute top-2.5 right-2.5 text-amber-500 fill-amber-400">
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45" />
                  </div>
                )}

                {/* Left Side: Unread dot & Icon */}
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${item.notif.read ? 'opacity-0' : 'bg-indigo-500'}`} />
                  <div className="p-1.5 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-5">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <h4 className={`text-[11.5px] truncate ${item.notif.read ? 'font-semibold text-slate-600 dark:text-slate-300' : 'font-extrabold text-slate-900 dark:text-slate-100'}`}>
                      {item.notif.title}
                    </h4>
                  </div>
                  <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-normal mt-0.5 line-clamp-2">{item.notif.message}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">{item.notif.timestamp}</span>
                    {hasTaskLink && (
                      <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black px-1.5 py-0.5 rounded tracking-wide uppercase">Linked Task</span>
                    )}
                  </div>
                </div>

                {/* Right Side Hover Actions */}
                <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 rounded-lg p-0.5 shadow-xs border border-slate-100 dark:border-slate-800/80" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => handleTogglePin(item.notif.id)}
                    className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${item.notif.pinned ? 'text-amber-500' : 'text-slate-400'}`}
                    title={item.notif.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-3 h-3 fill-current" />
                  </button>

                  <button 
                    onClick={() => handleToggleRead(item.notif.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={item.notif.read ? "Mark as unread" : "Mark as read"}
                  >
                    <Eye className="w-3 h-3" />
                  </button>

                  {/* Snooze Toggle Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === item.notif.id ? null : item.notif.id)}
                      className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${item.notif.snoozedUntil ? 'text-indigo-600' : 'text-slate-400'}`}
                      title="Snooze"
                    >
                      <Clock className="w-3 h-3" />
                    </button>

                    {showSnoozeDropdownId === item.notif.id && (
                      <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md p-1 z-30 flex flex-col gap-0.5 text-[9.5px] min-w-[90px]">
                        <button onClick={() => handleSnooze(item.notif.id, 2)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded font-semibold text-left">2 Hours</button>
                        <button onClick={() => handleSnooze(item.notif.id, 24)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded font-semibold text-left">Tomorrow</button>
                        <button onClick={() => handleSnooze(item.notif.id, 168)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded font-semibold text-left">Next Week</button>
                        {item.notif.snoozedUntil && (
                          <button onClick={() => handleClearSnooze(item.notif.id)} className="px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-500 rounded font-semibold text-left border-t border-slate-100/50">Clear Snooze</button>
                        )}
                      </div>
                    )}
                  </div>

                  {activeTab === 'saved' && item.notif.cleared ? (
                    <button 
                      onClick={() => handleRestore(item.notif.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Restore"
                    >
                      <ArchiveRestore className="w-3 h-3" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleClear(item.notif.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Archive / Clear"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty States */}
          {groupedNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2.5 select-none">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-105 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-3xs">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Inbox empty</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-505 mt-0.5">No notifications in this view.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Split Screen Task Editor Pane */}
      <div className={`flex-[1.5] min-w-0 bg-white dark:bg-[#07080c] rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col justify-center relative ${
        selectedTask || selectedNotif ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedTask ? (
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Split Screen Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#0d0e19]/60 select-none shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Resolving Task Details</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Clear notification shortcut */}
                {selectedNotif && !selectedNotif.cleared && (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-bold hover:scale-103 transition-transform cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Clear Notification</span>
                  </button>
                )}
                {/* Back button visible only on mobile (when split screen is stacked) */}
                <button 
                  onClick={() => setSelectedNotificationId(null)}
                  className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-655"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Split Task panel container */}
            <div className="flex-1 overflow-y-auto relative min-h-0">
              <TaskDetailsPanel 
                task={selectedTask}
                members={members}
                workspaces={workspaces}
                spaces={spaces}
                onClose={() => setSelectedNotificationId(null)}
                onUpdateTask={(t) => {
                  onUpdateTask(t);
                }}
                onCreateTask={onAddTask}
                onDeleteTask={(id) => {
                  onDeleteTask(id);
                  setSelectedNotificationId(null);
                }}
                onAddSyncLog={onAddSyncLog}
                triggerToast={triggerToast}
                onAttachmentUpload={handleAttachmentUpload}
                onAttachmentDelete={handleAttachmentDelete}
                onAiSubtasks={triggerAiSubtasks}
                aiGenerating={aiGenerating}
                onAiSummary={handleAiSummary}
                isSummarizing={isSummarizing}
                aiSummary={aiSummary}
                allTasks={tasks}
                allDocs={[]}
                onOpenFieldsPanel={() => {}} // No custom fields panel in simple split screen
              />
            </div>
          </div>
        ) : selectedNotif ? (
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Split Screen Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#0d0e19]/60 select-none shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Notification Details</span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedNotif.cleared ? (
                  <button 
                    onClick={() => handleRestore(selectedNotif.id)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-450 border border-indigo-100 dark:border-indigo-900/30 text-[10px] font-bold hover:scale-103 transition-transform cursor-pointer"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    <span>Restore Notification</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-bold hover:scale-103 transition-transform cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Archive Notification</span>
                  </button>
                )}
                {/* Back button visible only on mobile */}
                <button 
                  onClick={() => setSelectedNotificationId(null)}
                  className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-655"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Notification Content Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto text-left custom-scrollbar">
              {/* Main Card */}
              <div className="p-6 bg-slate-50/50 dark:bg-[#0c0d18] border border-slate-150/40 dark:border-slate-800/80 rounded-3xl space-y-4 shadow-3xs">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    selectedNotif.type === 'comment' || selectedNotif.type === 'assignment' ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40' :
                    selectedNotif.type === 'deadline' ? 'bg-rose-50 text-rose-500 dark:bg-rose-955/40' :
                    'bg-slate-100 text-slate-550 dark:bg-slate-805 dark:text-slate-400'
                  }`}>
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 leading-tight">
                      {selectedNotif.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mt-1">
                      Received at {selectedNotif.timestamp}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-relaxed bg-slate-100/50 dark:bg-[#121424] border border-slate-200/80 dark:border-slate-700/60 p-4 rounded-2xl whitespace-pre-wrap">
                  {selectedNotif.message}
                </p>

                {/* Metadata List */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <div className="p-3 bg-slate-100/50 dark:bg-[#121424] border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-1 shadow-3xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider block">Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedNotif.read ? 'bg-slate-400' : 'bg-indigo-500'}`} />
                      <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-100">
                        {selectedNotif.read ? 'Marked Read' : 'Unread'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100/50 dark:bg-[#121424] border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-1 shadow-3xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider block">Importance</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedNotif.pinned ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-100">
                        {selectedNotif.pinned ? 'Pinned to Top' : 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons strip */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    onClick={() => handleToggleRead(selectedNotif.id)}
                    className="flex items-center gap-1.5 py-2 px-3 text-[10.5px] font-extrabold rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#16182c] hover:bg-slate-100 dark:hover:bg-[#1f223d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{selectedNotif.read ? 'Mark as Unread' : 'Mark as Read'}</span>
                  </button>

                  <button 
                    onClick={() => handleTogglePin(selectedNotif.id)}
                    className={`flex items-center gap-1.5 py-2 px-3 text-[10.5px] font-extrabold rounded-xl border transition-colors cursor-pointer ${
                      selectedNotif.pinned 
                        ? 'text-amber-500 border-amber-200 dark:border-amber-500/40 bg-amber-50/10 dark:bg-amber-500/10' 
                        : 'border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#16182c] hover:bg-slate-100 dark:hover:bg-[#1f223d] text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{selectedNotif.pinned ? 'Unpin from Top' : 'Pin to Top'}</span>
                  </button>
                </div>
              </div>

              {/* Smart AI Actions/Explanation (Premium Feel) */}
              <div className="p-5 bg-indigo-50/10 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/30 rounded-3xl space-y-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <h4 className="text-[11px] font-black uppercase text-indigo-500 tracking-wider">Apexa AI Suggestion</h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedNotif.type === 'assignment' && 'This notification informs you about a new task assigned to you. Recommend reviewing the task description, updating the estimate hours, or adding subtasks.'}
                  {selectedNotif.type === 'deadline' && 'Urgent: This task completion deadline is approaching rapidly. Please ensure that work is on track or request adjustments.'}
                  {selectedNotif.type === 'comment' && 'A team member commented. You can quickly respond to their queries in the task discussion section.'}
                  {['success', 'info'].includes(selectedNotif.type) && 'System notification. This confirms a change has synced successfully to our database and is active across all team devices.'}
                  {!['assignment', 'deadline', 'comment', 'success', 'info'].includes(selectedNotif.type) && 'This notification represents a general update. Review changes and archive once resolved.'}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-[10px] font-black rounded-xl cursor-pointer"
                  >
                    Archive & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Placeholder empty panel state */
          <div className="flex flex-col items-center justify-center p-10 text-center space-y-3.5 select-none h-full">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-[#090a12] border border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-3xs">
              <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            </div>
            <div className="max-w-xs">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No Notification Selected</p>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                Click on any notification in the list to inspect details, configure states, or resolve tasks in real time.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
