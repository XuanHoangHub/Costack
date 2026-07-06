"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
  activeWorkspaceId: string;
  onUpdateTask: (task: Task) => void;
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
  activeWorkspaceId,
  onUpdateTask,
  onDeleteTask,
  onAddSyncLog,
  triggerToast,
  currentUser,
  onUpgradePremium,
  workspaceInvitations = [],
  onAcceptInvite,
  onDeclineInvite
}: InboxViewProps) {
  // Tabs: 'important' | 'other' | 'snoozed' | 'cleared'
  const [activeTab, setActiveTab] = useState<'important' | 'other' | 'snoozed' | 'cleared'>('important');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  
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
        // Remove snooze parameters
        return { ...n, snoozedUntil: undefined };
      }
      return n;
    }));
  }, [setNotificationsList]);

  // Extract task ID from title or message using regex (matching double quoted strings)
  const getAssociatedTaskId = (notif: any): string | undefined => {
    if (notif.taskId) return notif.taskId;
    
    // Try matching task title in quotes e.g. Task "Design Landing" has been assigned
    const quoteMatch = notif.message?.match(/"([^"]+)"/) || notif.title?.match(/"([^"]+)"/);
    if (quoteMatch) {
      const matchedText = quoteMatch[1];
      const task = tasks.find(t => t.title.toLowerCase() === matchedText.toLowerCase());
      if (task) return task.id;
    }
    
    // If no quotes, search if any task title is a substring of the message/title
    const taskSub = tasks.find(t => 
      notif.message?.toLowerCase().includes(t.title.toLowerCase()) || 
      notif.title?.toLowerCase().includes(t.title.toLowerCase())
    );
    return taskSub?.id;
  };

  // Find the selected notification object
  const selectedNotif = useMemo(() => {
    return notificationsList.find(n => n.id === selectedNotificationId);
  }, [notificationsList, selectedNotificationId]);

  // Resolve the task associated with the selected notification
  const selectedTask = useMemo(() => {
    if (!selectedNotif) return null;
    const taskId = getAssociatedTaskId(selectedNotif);
    return tasks.find(t => t.id === taskId) || null;
  }, [selectedNotif, tasks]);

  // Categorize and filter notifications
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    return notificationsList.filter(n => {
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

      // 3. Tab Filter
      const isSnoozed = n.snoozedUntil && n.snoozedUntil > now;
      const isCleared = n.cleared === true;

      if (activeTab === 'snoozed') return isSnoozed && !isCleared;
      if (activeTab === 'cleared') return isCleared;
      
      // If snoozed or cleared, hide from active tabs
      if (isSnoozed || isCleared) return false;

      // Split active into Important vs Other
      const isImportantType = ['assignment', 'deadline', 'comment'].includes(n.type);
      if (activeTab === 'important') return isImportantType;
      if (activeTab === 'other') return !isImportantType;

      return true;
    }).sort((a, b) => {
      // Pinned notifications sit at the very top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0; // Chronological order preserved otherwise
    });
  }, [notificationsList, activeTab, searchQuery, filterType]);

  // Actions
  const handleToggleRead = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, read: !n.read } : n
    ));
  };

  const handleClear = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, cleared: true } : n
    ));
    if (selectedNotificationId === id) {
      setSelectedNotificationId(null);
    }
    if (triggerToast) triggerToast('success', 'Cleared Notification', 'Notification cleared and moved to archive.');
  };

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

  const handleSnooze = (id: string, durationHours: number) => {
    const snoozeTime = Date.now() + durationHours * 60 * 60 * 1000;
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, snoozedUntil: snoozeTime } : n
    ));
    if (selectedNotificationId === id) {
      setSelectedNotificationId(null);
    }
    setShowSnoozeDropdownId(null);
    if (triggerToast) triggerToast('success', 'Snoozed Notification', `Snoozed for ${durationHours} hours.`);
  };

  const handleClearSnooze = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, snoozedUntil: undefined } : n
    ));
    if (triggerToast) triggerToast('success', 'Snooze Removed', 'Notification returned to active Inbox.');
  };

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => {
      // Only read notifications in the current active tab
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
        localStorage.setItem(`avaxa_task_ai_summary_${task.id}`, data.text);
        onAddSyncLog(`AI summary for "${task.title}"`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col md:flex-row gap-5">
      
      {/* Left Column: Notifications List Pane */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.015)] ${
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
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-2.5 py-1.5 flex-1 shadow-3xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search inbox..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
              />
            </div>
            
            <div className="relative shrink-0 flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-2 py-1 shadow-3xs">
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
          <div className="flex bg-slate-105/75 dark:bg-slate-950/40 p-0.5 rounded-xl border border-slate-200/10 select-none">
            {[
              { id: 'important', label: 'Important' },
              { id: 'other', label: 'Other' },
              { id: 'snoozed', label: 'Snoozed' },
              { id: 'cleared', label: 'Cleared' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedNotificationId(null);
                }}
                className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center relative ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
                {/* Badge count for unread in important/other */}
                {['important', 'other'].includes(tab.id) && (() => {
                  const now = Date.now();
                  const count = notificationsList.filter(n => {
                    const isImportantType = ['assignment', 'deadline', 'comment'].includes(n.type);
                    const matchTab = tab.id === 'important' ? isImportantType : !isImportantType;
                    return matchTab && !n.read && !n.cleared && !(n.snoozedUntil && n.snoozedUntil > now);
                  }).length;
                  return count > 0 ? (
                    <span className="absolute -top-1 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-pink-500 text-white text-[7.5px] font-black flex items-center justify-center border border-white dark:border-slate-800 animate-pulse">
                      {count}
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
            <div className="mb-4 space-y-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4 shrink-0">
              <div className="flex items-center gap-1.5 px-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Workspace Invitations ({workspaceInvitations.length})</span>
              </div>
              {workspaceInvitations.map(inv => (
                <div 
                  key={inv.id} 
                  className="p-3.5 bg-indigo-50/20 dark:bg-indigo-950/5 border border-indigo-100/40 dark:border-indigo-900/15 rounded-2xl flex flex-col gap-3 shadow-3xs"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <h5 className="text-[11.5px] font-black text-slate-850 dark:text-slate-100 truncate">{inv.workspaceName}</h5>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                        You have been invited to join as <span className="font-extrabold uppercase text-indigo-500">{inv.role}</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => onDeclineInvite?.(inv.id)}
                      className="px-3 py-1 text-[10px] font-bold rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => onAcceptInvite?.(inv.id, inv.workspaceId, inv.role)}
                      className="px-3 py-1 text-[10px] font-black rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-2xs shadow-indigo-200"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredNotifications.map(notif => {
            const hasTaskLink = !!getAssociatedTaskId(notif);
            const isSelected = selectedNotificationId === notif.id;

            return (
              <div 
                key={notif.id}
                onClick={() => setSelectedNotificationId(notif.id)}
                className={`group p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/15 border-indigo-200 dark:border-indigo-905 shadow-3xs'
                    : notif.read 
                      ? 'bg-slate-50/30 dark:bg-slate-950/10 border-slate-150/40 dark:border-slate-800/40 opacity-70 hover:opacity-100 hover:bg-slate-50/60' 
                      : 'bg-pink-50/20 dark:bg-pink-955/5 border-pink-100/40 dark:border-pink-900/15 hover:bg-pink-50/40 hover:border-pink-200/50 shadow-3xs'
                }`}
              >
                {/* Pin indicator */}
                {notif.pinned && (
                  <div className="absolute top-2.5 right-2.5 text-amber-500 fill-amber-400">
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45" />
                  </div>
                )}

                {/* Left Side: Unread dot & Icon */}
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${notif.read ? 'opacity-0' : 'bg-pink-500'}`} />
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    notif.type === 'assignment' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' :
                    notif.type === 'deadline' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455' :
                    notif.type === 'comment' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450' :
                    'bg-slate-105 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-5">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <h4 className={`text-[11.5px] truncate ${notif.read ? 'font-semibold text-slate-655 dark:text-slate-350' : 'font-extrabold text-slate-850 dark:text-slate-100'}`}>
                      {notif.title}
                    </h4>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 line-clamp-2">{notif.message}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{notif.timestamp}</span>
                    {hasTaskLink && (
                      <span className="text-[8px] bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black px-1 py-0.5 rounded tracking-wide uppercase">Linked Task</span>
                    )}
                  </div>
                </div>

                {/* Right Side Hover Actions */}
                <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 rounded-lg p-0.5 shadow-xs border border-slate-100 dark:border-slate-800/80" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => handleTogglePin(notif.id)}
                    className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${notif.pinned ? 'text-amber-500' : 'text-slate-400'}`}
                    title={notif.pinned ? "Unpin notification" : "Pin notification"}
                  >
                    <Pin className="w-3 h-3 fill-current" />
                  </button>

                  <button 
                    onClick={() => handleToggleRead(notif.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={notif.read ? "Mark as unread" : "Mark as read"}
                  >
                    {notif.read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>

                  {/* Snooze Toggle Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === notif.id ? null : notif.id)}
                      className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${notif.snoozedUntil ? 'text-indigo-650' : 'text-slate-400'}`}
                      title="Snooze notification"
                    >
                      <Clock className="w-3 h-3" />
                    </button>

                    {showSnoozeDropdownId === notif.id && (
                      <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md p-1 z-30 flex flex-col gap-0.5 text-[9.5px] min-w-[90px]">
                        <button onClick={() => handleSnooze(notif.id, 2)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded font-semibold text-left">2 Hours</button>
                        <button onClick={() => handleSnooze(notif.id, 24)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded font-semibold text-left">Tomorrow</button>
                        <button onClick={() => handleSnooze(notif.id, 168)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded font-semibold text-left">Next Week</button>
                        {notif.snoozedUntil && (
                          <button onClick={() => handleClearSnooze(notif.id)} className="px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded font-semibold text-left border-t border-slate-100/50">Clear Snooze</button>
                        )}
                      </div>
                    )}
                  </div>

                  {activeTab === 'cleared' ? (
                    <button 
                      onClick={() => handleRestore(notif.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Restore from archive"
                    >
                      <ArchiveRestore className="w-3 h-3" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleClear(notif.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Clear / Archive"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty States */}
          {filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2.5 select-none">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-105 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-3xs">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Inbox empty</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">No notifications in this view.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Split Screen Task Editor Pane */}
      <div className={`flex-[1.5] min-w-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col justify-center relative ${
        selectedTask ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedTask ? (
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Split Screen Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 select-none shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Resolving Task Details</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Clear notification shortcut */}
                {selectedNotif && activeTab !== 'cleared' && (
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
                spaces={[]} // Empty array or mock spaces
                onClose={() => setSelectedNotificationId(null)}
                onUpdateTask={(t) => {
                  onUpdateTask(t);
                }}
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
        ) : (
          /* Placeholder empty panel state */
          <div className="flex flex-col items-center justify-center p-10 text-center space-y-3.5 select-none h-full">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-105 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-3xs">
              <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            </div>
            <div className="max-w-xs">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No Task Selected</p>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                Click on any notification in the list that has a linked task to view and resolve details in real time.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
