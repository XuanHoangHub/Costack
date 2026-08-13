"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, Check, Trash2, Eye, EyeOff, Pin, Archive, Clock, Search, 
  ArrowRight, Inbox, HelpCircle, ArchiveRestore, Sparkles, Filter, CheckSquare,
  CircleAlert, Bookmark, MailOpen, User as UserIcon, Send, MessageSquare,
  ChevronRight, Calendar, AlertTriangle, MoreVertical, X, CheckCheck,
  Tag, Paperclip, CornerDownRight, ExternalLink, Command, ShieldCheck, Flame
} from 'lucide-react';
import { Task, User, Workspace, WorkspaceInvitation } from '../types';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';
import SignedImage from './SignedImage';

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
  // Tabs: 'important' (mentions, assigned, direct) | 'other' | 'saved' | 'cleared'
  const [activeTab, setActiveTab] = useState<'important' | 'other' | 'saved' | 'cleared'>('important');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showSnoozeDropdownId, setShowSnoozeDropdownId] = useState<string | null>(null);
  
  // Bulk Selection
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);

  // Inline Quick Reply input
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Local states for TaskDetailsPanel
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

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

  // Extract task ID from title or message using regex or explicit property
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

  // Overall Inbox Statistics
  const inboxStats = useMemo(() => {
    const now = Date.now();
    const active = notificationsList.filter(n => {
      const matchesWorkspace = !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      return matchesWorkspace && !n.cleared && !(n.snoozedUntil && n.snoozedUntil > now);
    });

    const importantCount = active.filter(n => {
      const taskId = getAssociatedTaskId(n);
      const task = tasks.find(t => t.id === taskId);
      const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
      const isMention = n.type === 'comment' || n.title?.includes('@') || n.message?.includes('@');
      return isAssigned || isMention || n.type === 'assignment' || n.type === 'deadline';
    }).length;

    return {
      total: active.length + workspaceInvitations.length,
      unread: active.filter(n => !n.read).length + workspaceInvitations.length,
      important: importantCount + workspaceInvitations.length,
      other: Math.max(0, active.length - importantCount),
      saved: notificationsList.filter(n => (n.pinned || (n.snoozedUntil && n.snoozedUntil > now)) && !n.cleared).length,
      cleared: notificationsList.filter(n => n.cleared).length,
    };
  }, [notificationsList, activeWorkspaceId, workspaceInvitations.length, tasks, currentUser, getAssociatedTaskId]);

  // Auto-mark notification as read upon selection
  useEffect(() => {
    if (!selectedNotif || selectedNotif.read) return;
    setNotificationsList(prev => prev.map(n =>
      n.id === selectedNotif.id ? { ...n, read: true } : n
    ));
  }, [selectedNotif, setNotificationsList]);

  // Categorize and filter notifications according to ClickUp Inbox 3.0 rules
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    return notificationsList.filter(n => {
      // 0. Workspace Filter
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

      const isSnoozed = n.snoozedUntil && n.snoozedUntil > now;
      const isCleared = n.cleared === true;

      // Cleared / Archived Tab
      if (activeTab === 'cleared') {
        return isCleared;
      }

      if (isCleared) return false;

      // Saved for Later Tab (Pinned or Snoozed)
      if (activeTab === 'saved') {
        return n.pinned || isSnoozed;
      }

      if (isSnoozed) return false;

      // Important Tab (Assigned to Me, Mentions, Deadlines)
      const taskId = getAssociatedTaskId(n);
      const task = tasks.find(t => t.id === taskId);
      const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
      const isMention = n.type === 'comment' || n.title?.includes('@') || n.message?.includes('@');
      const isImportantType = n.type === 'assignment' || n.type === 'deadline' || isAssigned || isMention;

      if (activeTab === 'important') {
        return isImportantType;
      }

      // Other Tab
      if (activeTab === 'other') {
        return !isImportantType;
      }

      return true;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [notificationsList, activeTab, searchQuery, filterType, tasks, currentUser, getAssociatedTaskId, activeWorkspaceId]);

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
    triggerToast?.('success', 'Cleared Notification', 'Moved notification to archive.');
  }, [selectedNotificationId, setNotificationsList, triggerToast]);

  const handleRestore = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, cleared: false } : n
    ));
    triggerToast?.('success', 'Restored Notification', 'Returned to active Inbox.');
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
    triggerToast?.('info', 'Notification Snoozed ⏰', `Snoozed for ${durationHours} hours.`);
  }, [selectedNotificationId, setNotificationsList, triggerToast]);

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentTab = filteredNotifications.some(fn => fn.id === n.id);
      return isInCurrentTab ? { ...n, read: true } : n;
    }));
    triggerToast?.('success', 'Marked as Read', 'All visible notifications marked as read.');
  };

  const handleClearAllVisible = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentTab = filteredNotifications.some(fn => fn.id === n.id);
      return isInCurrentTab ? { ...n, cleared: true } : n;
    }));
    setSelectedNotificationId(null);
    triggerToast?.('success', 'Cleared Inbox', 'All visible items cleared to archive.');
  };

  // Bulk Multi-Select actions
  const handleToggleSelectNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNotifIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, cleared: true } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', 'Cleared Selected', 'Selected items cleared.');
  };

  const handleMarkReadSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, read: true } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', 'Marked Read', 'Selected items marked as read.');
  };

  // Quick Reply handler right from detail pane
  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTask) return;

    setIsSendingReply(true);

    const newComment = {
      id: `comm-${Date.now()}`,
      senderName: currentUser?.name || 'You',
      senderAvatar: currentUser?.avatar || '',
      content: replyText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedTask: Task = {
      ...selectedTask,
      comments: [...(selectedTask.comments || []), newComment],
      commentsCount: (selectedTask.commentsCount || 0) + 1
    };

    onUpdateTask(updatedTask);
    onAddSyncLog(`Posted reply on "${selectedTask.title}" from Inbox`);
    triggerToast?.('success', 'Reply Sent 🚀', 'Your comment was posted to the task thread.');

    setReplyText('');
    setIsSendingReply(false);
  };

  // Local Task Attachment & AI utilities for TaskDetailsPanel
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
    triggerToast?.('success', 'Attachment Uploaded', `Uploaded ${file.name}`);
  };

  const handleAttachmentDelete = async (task: Task, att: any) => {
    const attachmentId = typeof att === 'string' ? att : att.id;
    const updatedTask = {
      ...task,
      attachments: (task.attachments || []).filter(a => a.id !== attachmentId)
    };
    onUpdateTask(updatedTask);
    triggerToast?.('success', 'Attachment Deleted', 'Removed attachment successfully.');
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

  // Keyboard navigation (J/K next/prev, E clear, R read, S snooze)
  const activeIds = useMemo(() => filteredNotifications.map(n => n.id), [filteredNotifications]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      const currentIdx = activeIds.indexOf(selectedNotificationId || '');
      if (e.key === 'j') {
        e.preventDefault();
        const nextIdx = currentIdx < activeIds.length - 1 ? currentIdx + 1 : currentIdx;
        if (nextIdx >= 0 && activeIds[nextIdx]) {
          setSelectedNotificationId(activeIds[nextIdx]);
        }
      } else if (e.key === 'k') {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : 0;
        if (prevIdx >= 0 && activeIds[prevIdx]) {
          setSelectedNotificationId(activeIds[prevIdx]);
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
  }, [activeIds, selectedNotificationId, handleClear, handleSnooze, handleToggleRead]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 font-sans text-left text-slate-800 dark:text-slate-100 select-none overflow-hidden">
      
      {/* ── Left Column: Master Notifications Stream ── */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-[#07080c] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs ${
        selectedNotificationId ? 'hidden md:flex md:max-w-md lg:max-w-lg' : 'flex'
      }`}>
        
        {/* ClickUp 3.0 Style Inbox Header & Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3.5 shrink-0 bg-white/50 dark:bg-[#07080c]/50 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Inbox className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">ClickUp Inbox 3.0</h1>
                  {inboxStats.unread > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-black">
                      {inboxStats.unread} unread
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500">Centralized notification & activity stream</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleMarkAllRead}
                disabled={filteredNotifications.length === 0}
                className="px-2.5 py-1.5 text-[10.5px] font-extrabold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
              <button 
                onClick={handleClearAllVisible}
                disabled={filteredNotifications.length === 0}
                className="px-2.5 py-1.5 text-[10.5px] font-extrabold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1"
                title="Clear all to archive"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Badges Grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'important', label: 'Important', count: inboxStats.important, icon: Flame, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
              { id: 'other', label: 'Other', count: inboxStats.other, icon: Bell, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300' },
              { id: 'saved', label: 'Saved', count: inboxStats.saved, icon: Bookmark, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300' },
              { id: 'cleared', label: 'Archived', count: inboxStats.cleared, icon: Archive, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedNotificationId(null);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer text-center relative ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md'
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-indigo-400 dark:text-indigo-600' : ''}`} />
                  <span className="text-[11px] font-black">{tab.count}</span>
                </div>
                <span className="text-[9.5px] font-bold mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search & Type Dropdown */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search notifications, tasks, comments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
              )}
            </div>
            
            <div className="relative shrink-0 flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1">
              <Filter className="w-3 h-3 text-slate-400 mr-1.5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer text-slate-700 dark:text-slate-300 border-none pr-1"
              >
                <option value="all">All Types</option>
                <option value="assignments">Assignments</option>
                <option value="deadlines">Deadlines</option>
                <option value="comments">Comments</option>
                <option value="updates">System</option>
              </select>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div className="px-4 py-1.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span>Shortcuts: <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">J</kbd> <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">K</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">E</kbd> clear</span>
            <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">S</kbd> snooze</span>
          </div>
          {selectedNotifIds.length > 0 && (
            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{selectedNotifIds.length} selected</span>
          )}
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0">
          
          {/* Workspace Invitations Section */}
          {workspaceInvitations.length > 0 && (activeTab === 'important' || activeTab === 'other') && (
            <div className="mb-4 space-y-2.5 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Workspace Invitations ({workspaceInvitations.length})
                  </span>
                </div>
              </div>
              {workspaceInvitations.map(inv => (
                <div 
                  key={inv.id} 
                  className="p-4 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/40 border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {inv.workspaceName || 'New Workspace'}
                        </h3>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                        <strong>{inv.invitedByName || inv.invitedBy || 'Admin'}</strong> invited you to join this workspace as <span className="font-extrabold uppercase text-indigo-600 dark:text-indigo-400">{inv.role}</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1 border-t border-indigo-100/50 dark:border-indigo-900/30">
                    <button 
                      onClick={() => onDeclineInvite?.(inv.id)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button 
                      onClick={() => onAcceptInvite?.(inv.id, inv.workspaceId, inv.role)}
                      className="px-4 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept & Join</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List of Notification Item Cards */}
          {filteredNotifications.map(notif => {
            const hasTaskLink = !!getAssociatedTaskId(notif);
            const isSelected = selectedNotificationId === notif.id;
            const isChecked = selectedNotifIds.includes(notif.id);

            return (
              <div 
                key={notif.id}
                onClick={() => setSelectedNotificationId(notif.id)}
                className={`group p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-md'
                    : notif.read 
                      ? 'bg-slate-50/40 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-85 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-900/60' 
                      : 'bg-white dark:bg-slate-900 border-indigo-200/70 dark:border-indigo-900/40 shadow-xs hover:border-indigo-300'
                } ${
                  notif.type === 'comment' || notif.type === 'assignment' ? 'border-l-4 border-l-indigo-500' :
                  notif.type === 'deadline' ? 'border-l-4 border-l-rose-500' :
                  'border-l-4 border-l-slate-400 dark:border-l-slate-600'
                }`}
              >
                {/* Pin indicator badge */}
                {notif.pinned && (
                  <div className="absolute top-2.5 right-2.5 text-amber-500">
                    <Pin className="w-3 h-3 fill-current rotate-45" />
                  </div>
                )}

                {/* Left Indicator & Unread Dot */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleToggleSelectNotif(notif.id, e as any)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${notif.read ? 'opacity-0' : 'bg-indigo-500 animate-pulse'}`} />
                  <div className="w-8 h-8 rounded-xl shrink-0 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                    <Bell className="w-4 h-4" />
                  </div>
                </div>

                {/* Main Notification Summary */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className={`text-xs truncate ${notif.read ? 'font-bold text-slate-700 dark:text-slate-300' : 'font-black text-slate-900 dark:text-white'}`}>
                      {notif.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-1 line-clamp-2">
                    {notif.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9.5px] text-slate-400 font-extrabold">{notif.timestamp}</span>
                    {hasTaskLink && (
                      <span className="text-[8.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase flex items-center gap-1">
                        <CheckSquare className="w-2.5 h-2.5 text-indigo-500" />
                        Task Attached
                      </span>
                    )}
                  </div>
                </div>

                {/* On-Hover Action Buttons Toolbar */}
                <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-md z-20" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => handleTogglePin(notif.id)}
                    className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${notif.pinned ? 'text-amber-500' : 'text-slate-400'}`}
                    title={notif.pinned ? "Unpin" : "Pin to Top"}
                  >
                    <Pin className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button 
                    onClick={() => handleToggleRead(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={notif.read ? "Mark as unread" : "Mark as read"}
                  >
                    {notif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {/* Snooze Dropdown Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === notif.id ? null : notif.id)}
                      className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${notif.snoozedUntil ? 'text-indigo-600' : 'text-slate-400'}`}
                      title="Snooze notification"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>

                    {showSnoozeDropdownId === notif.id && (
                      <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-30 flex flex-col gap-1 text-xs min-w-[110px]">
                        <button onClick={() => handleSnooze(notif.id, 2)} className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-left">In 2 Hours</button>
                        <button onClick={() => handleSnooze(notif.id, 24)} className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-left">Tomorrow</button>
                        <button onClick={() => handleSnooze(notif.id, 168)} className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-left">Next Week</button>
                      </div>
                    )}
                  </div>

                  {activeTab === 'cleared' ? (
                    <button 
                      onClick={() => handleRestore(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Restore to Inbox"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleClear(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Clear to Archive"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty Inbox State */}
          {filteredNotifications.length === 0 && workspaceInvitations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 select-none">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-md">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">You&apos;re completely caught up!</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No pending notifications in this stream.</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bulk Triage Bar */}
        {selectedNotifIds.length > 0 && (
          <div className="p-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl m-3 flex items-center justify-between shadow-xl">
            <span className="text-xs font-black px-2">{selectedNotifIds.length} items selected</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleMarkReadSelected}
                className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Mark Read
              </button>
              <button 
                onClick={handleClearSelected}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Clear Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Detail & Discussion Context Pane (Split Screen) ── */}
      <div className={`flex-[1.4] lg:flex-[1.6] min-w-0 bg-white dark:bg-[#07080c] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col justify-between relative ${
        selectedNotificationId ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedTask ? (
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Split Screen Header */}
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <CheckSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  Task Discussion & Activity Context
                </span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {selectedNotif && !selectedNotif.cleared && (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-black hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Clear Notification</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedNotificationId(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Screen Task Details Component */}
            <div className="flex-1 overflow-y-auto relative min-h-0">
              <TaskDetailsPanel 
                task={selectedTask}
                members={members}
                workspaces={workspaces}
                spaces={spaces}
                onClose={() => setSelectedNotificationId(null)}
                onUpdateTask={onUpdateTask}
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
                onOpenFieldsPanel={() => {}}
              />
            </div>

            {/* ClickUp 3.0 Style Quick Reply Footer Bar */}
            <form onSubmit={handleSendQuickReply} className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 shrink-0 flex items-center gap-2">
              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to discussion thread on "${selectedTask.title}"...`}
                className="flex-1 text-xs font-semibold px-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
              />
              <button 
                type="submit"
                disabled={!replyText.trim() || isSendingReply}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </form>
          </div>
        ) : selectedNotif ? (
          /* Notification Detail Card View */
          <div className="w-full h-full flex flex-col min-h-0 relative">
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Notification Details
              </span>
              <div className="flex items-center gap-2">
                {selectedNotif.cleared ? (
                  <button 
                    onClick={() => handleRestore(selectedNotif.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-black cursor-pointer"
                  >
                    Restore
                  </button>
                ) : (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-black cursor-pointer"
                  >
                    Archive
                  </button>
                )}
                <button onClick={() => setSelectedNotificationId(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto text-left">
              <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                      {selectedNotif.title}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">
                      {selectedNotif.timestamp}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-medium leading-relaxed">
                  {selectedNotif.message}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Placeholder State */
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3.5 select-none h-full">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-400 shadow-xs">
              <Inbox className="w-7 h-7 text-indigo-500" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">No Notification Selected</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                Click on any notification in the left list to inspect task details, read comments, or reply inline in real-time.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
