"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, Check, Trash2, Eye, EyeOff, Pin, Archive, Clock, Search, 
  Inbox, ArchiveRestore, Sparkles, CheckSquare,
  Bookmark, User as UserIcon, Send, MessageSquare,
  ChevronRight, Calendar, X, CheckCheck,
  Flame, TrendingUp, Target, RefreshCw, ArrowLeft,
  CreditCard, Copy, Layers, SlidersHorizontal,
  AlertTriangle, ShieldCheck, CheckCircle2,
  ExternalLink, Share2, Plus, Flag, Award,
  ListTodo, CheckCircle, ArrowUpRight
} from 'lucide-react';
import { Task, User, Workspace, WorkspaceInvitation, TaskStatus, Priority } from '../types';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';
import { callAiApi, isAiAccessError } from '@/lib/aiClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { ApexaAiIcon } from './ApexaAiIcon';

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
  highlightedInviteToken?: string | null;
  onAcceptInvite?: (id: string, workspaceId: string, role: string) => void | Promise<void>;
  onDeclineInvite?: (id: string) => void | Promise<void>;
  onNavigateToTab?: (tab: string) => void;
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
  highlightedInviteToken,
  onAcceptInvite,
  onDeclineInvite,
  onNavigateToTab
}: InboxViewProps) {
  const { isVietnamese } = useTranslation();

  // Navigation & Scope
  const [activeTab, setActiveTab] = useState<'all' | 'important' | 'unread' | 'saved' | 'cleared'>('all');
  const [workspaceScope, setWorkspaceScope] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'assigned' | 'comments' | 'deadlines' | 'billing' | 'system'>('all');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [showSnoozeDropdownId, setShowSnoozeDropdownId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk Multi-Select
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);

  // Quick Reply
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Local states for TaskDetailsPanel
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  // AI Daily Digest
  const [aiDigestLoading, setAiDigestLoading] = useState(false);
  const [aiDigestText, setAiDigestText] = useState<string | null>(null);

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

  // Extract task ID from notification
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

  // Resolve associated task
  const selectedTask = useMemo(() => {
    if (!selectedNotif) return null;
    const taskId = getAssociatedTaskId(selectedNotif);
    return tasks.find(t => t.id === taskId) || null;
  }, [selectedNotif, tasks, getAssociatedTaskId]);

  // Visual Category Helper
  const getCategoryMeta = useCallback((notif: any) => {
    const t = notif.type?.toLowerCase() || '';
    const title = notif.title?.toLowerCase() || '';
    const message = notif.message?.toLowerCase() || '';

    if (t === 'assignment' || title.includes('được giao') || title.includes('assigned') || message.includes('được giao')) {
      return {
        key: 'assignment',
        label: isVietnamese ? 'Giao việc' : 'Assigned',
        icon: CheckSquare,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/50',
        border: 'border-indigo-200/80 dark:border-indigo-800/60',
        badge: 'bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
      };
    }
    if (t === 'comment' || title.includes('@') || message.includes('@') || title.includes('bình luận') || message.includes('bình luận')) {
      return {
        key: 'comment',
        label: isVietnamese ? 'Thảo luận' : 'Mention',
        icon: MessageSquare,
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-950/50',
        border: 'border-sky-200/80 dark:border-sky-800/60',
        badge: 'bg-sky-100/80 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'
      };
    }
    if (t === 'deadline' || title.includes('hạn chót') || title.includes('deadline') || message.includes('hạn chót') || message.includes('khẩn')) {
      return {
        key: 'deadline',
        label: isVietnamese ? 'Hạn chót' : 'Deadline',
        icon: Flame,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/50',
        border: 'border-amber-200/80 dark:border-amber-800/60',
        badge: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
      };
    }
    if (t === 'billing' || title.includes('thanh toán') || title.includes('payos') || title.includes('gói') || title.includes('payment') || message.includes('thanh toán') || message.includes('payos')) {
      return {
        key: 'billing',
        label: isVietnamese ? 'Thanh toán' : 'Billing',
        icon: CreditCard,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        border: 'border-emerald-200/80 dark:border-emerald-800/60',
        badge: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
      };
    }
    if (t === 'invitation' || title.includes('lời mời') || title.includes('invit')) {
      return {
        key: 'invitation',
        label: isVietnamese ? 'Lời mời' : 'Invitation',
        icon: Sparkles,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-950/50',
        border: 'border-violet-200/80 dark:border-violet-800/60',
        badge: 'bg-violet-100/80 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300'
      };
    }
    return {
      key: 'system',
      label: isVietnamese ? 'Hệ thống' : 'System',
      icon: Bell,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      border: 'border-blue-200/80 dark:border-blue-800/60',
      badge: 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
    };
  }, [isVietnamese]);

  // Overall Inbox Statistics
  const inboxStats = useMemo(() => {
    const now = Date.now();
    const active = notificationsList.filter(n => {
      const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      return matchesWorkspace && !n.cleared && !(n.snoozedUntil && n.snoozedUntil > now);
    });

    const importantItems = active.filter(n => {
      const taskId = getAssociatedTaskId(n);
      const task = tasks.find(t => t.id === taskId);
      const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
      const isMention = n.type === 'comment' || n.title?.includes('@') || n.message?.includes('@');
      return isAssigned || isMention || n.type === 'assignment' || n.type === 'deadline';
    });

    const unreadItems = active.filter(n => !n.read);
    const totalUnread = unreadItems.length + workspaceInvitations.length;

    return {
      all: active.length + workspaceInvitations.length,
      allUnread: totalUnread,
      total: active.length + workspaceInvitations.length,
      unread: totalUnread,
      important: importantItems.length + workspaceInvitations.length,
      importantUnread: importantItems.filter(n => !n.read).length + workspaceInvitations.length,
      saved: notificationsList.filter(n => {
        const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
        return matchesWorkspace && (n.pinned || (n.snoozedUntil && n.snoozedUntil > now)) && !n.cleared;
      }).length,
      cleared: notificationsList.filter(n => {
        const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
        return matchesWorkspace && n.cleared;
      }).length,
    };
  }, [notificationsList, workspaceScope, activeWorkspaceId, workspaceInvitations.length, tasks, currentUser, getAssociatedTaskId]);

  // Productivity Metrics
  const productivityStats = useMemo(() => {
    const userTasks = tasks.filter(t => t.assigneeId === currentUser?.id || t.assigneeIds?.includes(currentUser?.id));
    const completedTasks = userTasks.filter(t => t.status === 'completed');
    const urgentTasks = userTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
    const completionRate = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 100;
    
    return {
      totalAssigned: userTasks.length,
      completed: completedTasks.length,
      urgent: urgentTasks.length,
      completionRate
    };
  }, [tasks, currentUser]);

  // Live Counts for Filter Chips
  const quickFilterCounts = useMemo(() => {
    const now = Date.now();
    const base = notificationsList.filter(n => {
      const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      if (!matchesWorkspace) return false;
      if (activeTab === 'cleared') return n.cleared === true;
      if (n.cleared) return false;
      const isSnoozed = n.snoozedUntil && n.snoozedUntil > now;
      if (activeTab === 'saved') return n.pinned || isSnoozed;
      if (isSnoozed) return false;
      if (activeTab === 'unread') return !n.read;
      return true;
    });

    return {
      all: base.length,
      assigned: base.filter(n => {
        if (n.type === 'assignment') return true;
        const taskId = getAssociatedTaskId(n);
        const task = tasks.find(t => t.id === taskId);
        return task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
      }).length,
      comments: base.filter(n => n.type === 'comment' || n.title?.includes('@') || n.message?.includes('@')).length,
      deadlines: base.filter(n => n.type === 'deadline' || n.title?.toLowerCase().includes('hạn chót') || n.message?.toLowerCase().includes('hạn chót')).length,
      billing: base.filter(n => {
        const title = n.title?.toLowerCase() || '';
        const msg = n.message?.toLowerCase() || '';
        return n.type === 'billing' || title.includes('thanh toán') || title.includes('payos') || title.includes('gói') || title.includes('payment') || msg.includes('thanh toán') || msg.includes('payos');
      }).length,
      system: base.filter(n => {
        const cat = getCategoryMeta(n);
        return cat.key === 'system';
      }).length,
    };
  }, [notificationsList, workspaceScope, activeWorkspaceId, activeTab, tasks, currentUser, getAssociatedTaskId, getCategoryMeta]);

  // Auto-mark notification as read upon selection
  useEffect(() => {
    if (!selectedNotif || selectedNotif.read) return;
    setNotificationsList(prev => prev.map(n =>
      n.id === selectedNotif.id ? { ...n, read: true } : n
    ));
  }, [selectedNotif, setNotificationsList]);

  // Categorize and filter notifications
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    return notificationsList.filter(n => {
      // 0. Workspace Filter
      const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      if (!matchesWorkspace) return false;

      // 1. Text Search Filter
      const matchesSearch = 
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Quick Filter Chips
      if (quickFilter === 'assigned' && n.type !== 'assignment') {
        const taskId = getAssociatedTaskId(n);
        const task = tasks.find(t => t.id === taskId);
        const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
        if (!isAssigned) return false;
      }
      if (quickFilter === 'comments' && n.type !== 'comment' && !n.title?.includes('@') && !n.message?.includes('@')) return false;
      if (quickFilter === 'deadlines' && n.type !== 'deadline' && !n.title?.toLowerCase().includes('hạn chót') && !n.message?.toLowerCase().includes('hạn chót')) return false;
      if (quickFilter === 'billing') {
        const title = n.title?.toLowerCase() || '';
        const msg = n.message?.toLowerCase() || '';
        const isBilling = n.type === 'billing' || title.includes('thanh toán') || title.includes('payos') || title.includes('gói') || title.includes('payment') || msg.includes('thanh toán') || msg.includes('payos');
        if (!isBilling) return false;
      }
      if (quickFilter === 'system') {
        const cat = getCategoryMeta(n);
        if (cat.key !== 'system') return false;
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

      // Unread Tab
      if (activeTab === 'unread') {
        return !n.read;
      }

      // Important Tab (Assigned to Me, Mentions, Deadlines)
      if (activeTab === 'important') {
        const taskId = getAssociatedTaskId(n);
        const task = tasks.find(t => t.id === taskId);
        const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
        const isMention = n.type === 'comment' || n.title?.includes('@') || n.message?.includes('@');
        return n.type === 'assignment' || n.type === 'deadline' || isAssigned || isMention;
      }

      // All Tab
      return true;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [notificationsList, activeTab, searchQuery, quickFilter, tasks, currentUser, getAssociatedTaskId, activeWorkspaceId, workspaceScope, getCategoryMeta]);

  // Group notifications into Date categories
  const groupedNotifications = useMemo(() => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const todayDate = now.toDateString();
    const yesterdayDate = new Date(now.setDate(now.getDate() - 1)).toDateString();

    filteredNotifications.forEach(item => {
      const itemDate = item.timestamp ? new Date(item.timestamp).toDateString() : todayDate;
      if (itemDate === todayDate || item.timestamp?.includes('phút') || item.timestamp?.includes('giờ') || item.timestamp?.includes('vừa xong')) {
        today.push(item);
      } else if (itemDate === yesterdayDate || item.timestamp?.includes('hôm qua')) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    });

    return [
      { label: isVietnamese ? 'Hôm nay' : 'Today', items: today },
      { label: isVietnamese ? 'Hôm qua' : 'Yesterday', items: yesterday },
      { label: isVietnamese ? 'Cũ hơn' : 'Older', items: older }
    ].filter(g => g.items.length > 0);
  }, [filteredNotifications, isVietnamese]);

  // Next Up / Active Tasks for the Productivity Hub
  const upcomingTasks = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'completed');
    const myTasks = pending.filter(t => t.assigneeId === currentUser?.id || t.assigneeIds?.includes(currentUser?.id));
    if (myTasks.length > 0) {
      return myTasks.slice(0, 4);
    }
    return pending.slice(0, 4);
  }, [tasks, currentUser]);

  // Recent Workspace Activities
  const recentActivities = useMemo(() => {
    const now = Date.now();
    return [...notificationsList]
      .filter(n => {
        const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
        return matchesWorkspace && !n.cleared && !(n.snoozedUntil && n.snoozedUntil > now);
      })
      .slice(0, 5);
  }, [notificationsList, workspaceScope, activeWorkspaceId]);

  // Older read notifications that can be triaged
  const olderReadNotifications = useMemo(() => {
    const now = Date.now();
    return notificationsList.filter(n => {
      const matchesWorkspace = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      return matchesWorkspace && !n.cleared && n.read && !n.pinned && !(n.snoozedUntil && n.snoozedUntil > now);
    });
  }, [notificationsList, workspaceScope, activeWorkspaceId]);

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
    triggerToast?.('success', isVietnamese ? 'Đã lưu trữ' : 'Archived', isVietnamese ? 'Thông báo đã được chuyển vào mục Lưu trữ.' : 'Notification archived.');
  }, [selectedNotificationId, setNotificationsList, triggerToast, isVietnamese]);

  const handleRestore = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, cleared: false } : n
    ));
    triggerToast?.('success', isVietnamese ? 'Đã khôi phục' : 'Restored', isVietnamese ? 'Thông báo đã trở lại hộp thư chính.' : 'Notification restored.');
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
    triggerToast?.('info', isVietnamese ? 'Đã tạm ẩn ⏰' : 'Snoozed ⏰', isVietnamese ? `Tạm ẩn thông báo trong ${durationHours} giờ.` : `Snoozed for ${durationHours} hours.`);
  }, [selectedNotificationId, setNotificationsList, triggerToast, isVietnamese]);

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentScope = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      if (!isInCurrentScope || n.cleared) return n;
      return { ...n, read: true };
    }));
    triggerToast?.('success', isVietnamese ? 'Hoàn tất' : 'Done', isVietnamese ? 'Tất cả thông báo đã được đánh dấu đã đọc.' : 'All notifications marked as read.');
  };

  const handleClearAllVisible = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentTab = filteredNotifications.some(fn => fn.id === n.id);
      return isInCurrentTab ? { ...n, cleared: true } : n;
    }));
    setSelectedNotificationId(null);
    triggerToast?.('success', isVietnamese ? 'Dọn sạch hộp thư' : 'Cleared', isVietnamese ? 'Các thông báo hiển thị đã chuyển vào lưu trữ.' : 'Visible notifications archived.');
  };

  const handleTriageOlderRead = () => {
    if (olderReadNotifications.length === 0) return;
    const idsToArchive = olderReadNotifications.map(n => n.id);
    setNotificationsList(prev => prev.map(n => 
      idsToArchive.includes(n.id) ? { ...n, cleared: true } : n
    ));
    if (selectedNotificationId && idsToArchive.includes(selectedNotificationId)) {
      setSelectedNotificationId(null);
    }
    triggerToast?.('success', isVietnamese ? 'Hộp thư gọn gàng ✨' : 'Inbox Zero ✨', isVietnamese ? `Đã lưu trữ ${idsToArchive.length} thông báo đã đọc.` : `Archived ${idsToArchive.length} read notifications.`);
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
    triggerToast?.('success', isVietnamese ? 'Đã lưu trữ' : 'Archived', isVietnamese ? 'Các thông báo đã chọn đã được chuyển vào lưu trữ.' : 'Selected items archived.');
  };

  const handleMarkReadSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, read: true } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', isVietnamese ? 'Đã đọc' : 'Marked read', isVietnamese ? 'Đã đánh dấu đã đọc các mục đã chọn.' : 'Selected items marked as read.');
  };

  // Quick Reply handler
  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTask) return;

    setIsSendingReply(true);

    const newComment = {
      id: `comm-${Date.now()}`,
      senderName: currentUser?.name || (isVietnamese ? 'Bạn' : 'You'),
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
    onAddSyncLog(isVietnamese ? `Bình luận trên "${selectedTask.title}" từ Hộp thư` : `Commented on "${selectedTask.title}" from Inbox`);
    triggerToast?.('success', isVietnamese ? 'Đã gửi phản hồi 🚀' : 'Reply sent 🚀', isVietnamese ? 'Bình luận của bạn đã được đăng lên công việc.' : 'Your comment was posted to the task.');

    setReplyText('');
    setIsSendingReply(false);
  };

  // Generate AI Daily Briefing
  const handleGenerateAiDigest = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium();
      return;
    }
    setAiDigestLoading(true);
    try {
      const activeUnread = notificationsList.filter(n => !n.cleared && !n.read).slice(0, 10);
      const res = await callAiApi('/api/ai/inbox-digest', {
        userName: currentUser?.name || (isVietnamese ? 'Thành viên Apexa' : 'Apexa Member'),
        notifications: activeUnread,
        tasksCount: tasks.length
      });
      const data = await res.json();
      if (data.success && data.digest) {
        setAiDigestText(data.digest);
        triggerToast?.('success', 'AI Daily Digest ✨', isVietnamese ? 'Đã tổng hợp tóm tắt thông minh cho hôm nay.' : 'Smart summary prepared for today.');
      } else {
        setAiDigestText(isVietnamese 
          ? `Chào ${currentUser?.name || 'bạn'}! Hôm nay bạn có ${inboxStats.important} thông báo quan trọng và ${productivityStats.totalAssigned} công việc được giao cần xử lý. Tỉ lệ hoàn thành hiện tại đạt ${productivityStats.completionRate}%. Hãy ưu tiên các đầu việc có mức khẩn cấp cao!`
          : `Hello ${currentUser?.name || 'there'}! Today you have ${inboxStats.important} important notifications and ${productivityStats.totalAssigned} assigned tasks. Your current completion rate is ${productivityStats.completionRate}%. Focus on high-priority items first!`
        );
      }
    } catch (error) {
      if (isAiAccessError(error)) return;
      setAiDigestText(isVietnamese
        ? `Chào ${currentUser?.name || 'bạn'}! Bạn đang có ${inboxStats.unread} thông báo chưa đọc trong Hộp thư Apexa. Hãy kiểm tra các thông báo được giao và cập nhật tiến độ công việc để duy trì hiệu suất cao nhất.`
        : `Hello ${currentUser?.name || 'there'}! You have ${inboxStats.unread} unread notifications in Apexa Inbox. Review your assigned tasks and update progress to maintain peak productivity.`
      );
    } finally {
      setAiDigestLoading(false);
    }
  };

  // Task Attachment & AI utilities
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
    triggerToast?.('success', isVietnamese ? 'Tải tệp đính kèm' : 'Attachment Uploaded', file.name);
  };

  const handleAttachmentDelete = async (task: Task, att: any) => {
    const attachmentId = typeof att === 'string' ? att : att.id;
    const updatedTask = {
      ...task,
      attachments: (task.attachments || []).filter(a => a.id !== attachmentId)
    };
    onUpdateTask(updatedTask);
    triggerToast?.('success', isVietnamese ? 'Đã xóa tệp đính kèm' : 'Deleted Attachment', isVietnamese ? 'Đã xóa tệp thành công.' : 'File removed successfully.');
  };

  const triggerAiSubtasks = async (task: Task) => {
    if (!currentUser?.isPremium) {
      onUpgradePremium();
      return;
    }
    setAiGenerating(true);
    try {
      const res = await callAiApi('/api/ai/subtasks', { title: task.title, description: task.description });
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
        onAddSyncLog(isVietnamese ? `AI đề xuất ${gen.length} nhiệm vụ phụ cho "${task.title}"` : `AI suggested ${gen.length} subtasks for "${task.title}"`);
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
      const res = await callAiApi('/api/ai/task-summarize', { task, assigneeName: assignee?.name || (isVietnamese ? 'Chưa giao' : 'Unassigned') });
      const data = await res.json();
      if (data.success && data.text) {
        setAiSummary(data.text);
        localStorage.setItem(`apexa_task_ai_summary_${task.id}`, data.text);
        onAddSyncLog(isVietnamese ? `AI tóm tắt cho "${task.title}"` : `AI summary for "${task.title}"`);
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
      // Global shortcut: '/' or 'Cmd+K' / 'Ctrl+K' to focus search input
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
        if (!isInputFocused) {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          return;
        }
      }

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
      } else if (e.key === 'Escape') {
        if (selectedNotificationId) {
          e.preventDefault();
          setSelectedNotificationId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIds, selectedNotificationId, handleClear, handleSnooze, handleToggleRead]);

  // Tab configurations
  const TABS_CONFIG = [
    { id: 'all', label: isVietnamese ? 'Tất cả' : 'All', count: inboxStats.all, unread: inboxStats.allUnread, icon: Inbox },
    { id: 'important', label: isVietnamese ? 'Quan trọng' : 'Important', count: inboxStats.important, unread: inboxStats.importantUnread, icon: Flame },
    { id: 'unread', label: isVietnamese ? 'Chưa đọc' : 'Unread', count: inboxStats.unread, unread: inboxStats.unread, icon: Bell },
    { id: 'saved', label: isVietnamese ? 'Đã lưu' : 'Saved', count: inboxStats.saved, unread: 0, icon: Bookmark },
    { id: 'cleared', label: isVietnamese ? 'Lưu trữ' : 'Archived', count: inboxStats.cleared, unread: 0, icon: Archive },
  ];

  // Chip Filters
  const CHIP_FILTERS = [
    { id: 'all', label: isVietnamese ? 'Tất cả loại' : 'All types', icon: SlidersHorizontal, count: quickFilterCounts.all },
    { id: 'assigned', label: isVietnamese ? 'Được giao' : 'Assigned', icon: CheckSquare, count: quickFilterCounts.assigned },
    { id: 'comments', label: isVietnamese ? 'Nhắc đến' : 'Mentions', icon: MessageSquare, count: quickFilterCounts.comments },
    { id: 'deadlines', label: isVietnamese ? 'Hạn chót' : 'Deadlines', icon: Flame, count: quickFilterCounts.deadlines },
    { id: 'billing', label: isVietnamese ? 'Thanh toán' : 'Billing', icon: CreditCard, count: quickFilterCounts.billing },
    { id: 'system', label: isVietnamese ? 'Hệ thống' : 'System', icon: Bell, count: quickFilterCounts.system },
  ];

  return (
    <div className="apexa-inbox w-full h-full flex flex-col md:flex-row gap-3.5 font-sans text-left text-slate-800 dark:text-slate-100 select-none overflow-hidden p-1 sm:p-2">
      
      {/* ── Left Column: Stream Panel ── */}
      <div className={`apexa-inbox-list flex flex-col min-w-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden transition-all duration-300 ${
        selectedNotificationId 
          ? 'hidden md:flex md:w-[380px] lg:w-[410px] xl:w-[440px] shrink-0' 
          : 'flex-1 md:flex-initial md:w-[420px] lg:w-[460px] xl:w-[480px] shrink-0'
      }`}>
        
        {/* Top Header & Scope Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3 shrink-0 bg-gradient-to-b from-white via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/40">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                <Inbox className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {isVietnamese ? 'Hộp thư' : 'Inbox'}
                  </h1>
                  {inboxStats.unread > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 dark:bg-blue-500/25 text-blue-600 dark:text-sky-300 text-[10px] font-black border border-blue-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {inboxStats.unread} {isVietnamese ? 'mới' : 'new'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Workspace Scope Toggle */}
              <button
                onClick={() => setWorkspaceScope(prev => prev === 'current' ? 'all' : 'current')}
                className={`h-8 px-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                  workspaceScope === 'current'
                    ? 'border-blue-200/80 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 hover:bg-blue-100/80'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title={isVietnamese ? 'Chuyển phạm vi không gian làm việc (Không gian này / Tất cả)' : 'Toggle workspace scope (This space / All spaces)'}
              >
                <Layers className={`w-3.5 h-3.5 ${workspaceScope === 'current' ? 'text-blue-600 dark:text-sky-400' : 'text-slate-500'}`} />
                <span>{workspaceScope === 'current' ? (isVietnamese ? 'Space này' : 'Current') : (isVietnamese ? 'Tất cả' : 'All')}</span>
              </button>

              {/* Mark All Read */}
              <button 
                onClick={handleMarkAllRead}
                disabled={inboxStats.unread === 0 && filteredNotifications.length === 0}
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-sky-300 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                title={isVietnamese ? 'Đánh dấu tất cả là đã đọc' : 'Mark all as read'}
                aria-label={isVietnamese ? 'Đánh dấu tất cả là đã đọc' : 'Mark all as read'}
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              
              {/* Archive All Visible */}
              <button 
                onClick={handleClearAllVisible}
                disabled={filteredNotifications.length === 0}
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                title={isVietnamese ? 'Lưu trữ tất cả thông báo hiển thị' : 'Archive all visible'}
                aria-label={isVietnamese ? 'Lưu trữ tất cả thông báo hiển thị' : 'Archive all visible'}
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto scrollbar-none">
            {TABS_CONFIG.map(tab => {
              const isTabActive = activeTab === tab.id;
              const hasUnread = tab.unread > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedNotificationId(null);
                  }}
                  aria-pressed={isTabActive}
                  className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl transition-all cursor-pointer relative flex items-center justify-center gap-1.5 text-center whitespace-nowrap ${
                    isTabActive
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-300 shadow-xs font-bold border border-slate-200/70 dark:border-slate-700/70'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold hover:bg-white/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isTabActive ? 'text-blue-600 dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="text-[11.5px] font-bold">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                      isTabActive 
                        ? 'bg-blue-100/90 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300' 
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {hasUnread && !isTabActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2.5 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/90 rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-950 group shadow-2xs">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors shrink-0" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={isVietnamese ? "Tìm thông báo, công việc (nhấn /)..." : "Search notifications, tasks (press /)..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (searchQuery) {
                    setSearchQuery('');
                  } else {
                    (e.target as HTMLInputElement).blur();
                  }
                }
              }}
              data-no-focus-outline="true"
              className="apexa-search-input w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none !border-0 !outline-none focus:!outline-none focus-visible:!outline-none focus:!ring-0 focus-visible:!ring-0 shadow-none"
            />
            {searchQuery ? (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isVietnamese ? 'Xóa tìm kiếm' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-300/60 dark:border-slate-700/60 select-none">
                /
              </kbd>
            )}
          </div>

          {/* Quick Filter Chips with Anti-Clipping & Counters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 pt-0.5 px-0.5">
            {CHIP_FILTERS.map(f => {
              const isChipActive = quickFilter === f.id;
              const ChipIcon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setQuickFilter(f.id as any)}
                  className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isChipActive
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/60'
                  }`}
                >
                  <ChipIcon className={`w-3 h-3 shrink-0 ${isChipActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      isChipActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification Stream Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 custom-scrollbar min-h-0">
          
          {/* Workspace Invitations Banner */}
          {workspaceInvitations.length > 0 && (activeTab === 'important' || activeTab === 'all') && (
            <div className="space-y-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <span className="text-[10.5px] font-black uppercase text-blue-600 dark:text-sky-300 tracking-wider">
                  {isVietnamese ? `Lời mời tham gia không gian (${workspaceInvitations.length})` : `Workspace Invitations (${workspaceInvitations.length})`}
                </span>
              </div>
              {workspaceInvitations.map(inv => (
                <div 
                  key={inv.id} 
                  className={`p-3.5 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900/40 border rounded-2xl flex flex-col gap-2.5 shadow-xs ${
                    inv.token && inv.token === highlightedInviteToken 
                      ? 'border-blue-500 ring-2 ring-blue-500/25' 
                      : 'border-blue-200/70 dark:border-blue-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {inv.workspaceName || (isVietnamese ? 'Không gian mới' : 'New Workspace')}
                        </h3>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                        <strong>{inv.invitedByName || inv.invitedBy || (isVietnamese ? 'Quản trị viên' : 'Admin')}</strong> {isVietnamese ? 'mời bạn tham gia không gian này.' : 'invited you to join this workspace.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1.5 border-t border-blue-100/60 dark:border-blue-900/30">
                    <button 
                      disabled={processingInviteId === inv.id}
                      onClick={async () => {
                        setProcessingInviteId(inv.id);
                        try { await onDeclineInvite?.(inv.id); } finally { setProcessingInviteId(null); }
                      }}
                      className="px-3 py-1 text-[11px] font-bold rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{isVietnamese ? 'Từ chối' : 'Decline'}</span>
                    </button>
                    <button 
                      disabled={processingInviteId === inv.id}
                      onClick={async () => {
                        setProcessingInviteId(inv.id);
                        try { await onAcceptInvite?.(inv.id, inv.workspaceId, inv.role); } finally { setProcessingInviteId(null); }
                      }}
                      className="px-3.5 py-1 text-[11px] font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3" />
                      <span>{processingInviteId === inv.id ? (isVietnamese ? 'Đang vào…' : 'Joining…') : (isVietnamese ? 'Chấp nhận' : 'Accept')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grouped Notifications Feed */}
          {groupedNotifications.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/80" />
                <span className="text-[9.5px] font-bold text-slate-400">
                  {group.items.length}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map(notif => {
                  const hasTaskLink = !!getAssociatedTaskId(notif);
                  const isSelected = selectedNotificationId === notif.id;
                  const isChecked = selectedNotifIds.includes(notif.id);
                  const catMeta = getCategoryMeta(notif);
                  const IconComp = catMeta.icon;

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => setSelectedNotificationId(notif.id)}
                      className={`group p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                          : notif.read 
                            ? 'bg-white/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs' 
                            : 'bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-900/70 shadow-xs hover:border-blue-400 dark:hover:border-blue-600'
                      }`}
                    >
                      {/* Left glowing accent line for unread items */}
                      {!notif.read && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                      )}

                      {/* Pin indicator */}
                      {notif.pinned && (
                        <div className="absolute top-2.5 right-2.5 text-amber-500">
                          <Pin className="w-3.5 h-3.5 fill-current rotate-45" />
                        </div>
                      )}

                      {/* Selection checkbox & Category icon badge */}
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleSelectNotif(notif.id, e as any)}
                          className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                        />
                        
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-2xs ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Notification Content Body */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded-md tracking-wider ${catMeta.badge}`}>
                            {catMeta.label}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                          )}
                        </div>

                        <h3 className={`text-xs leading-snug truncate ${
                          notif.read 
                            ? 'font-bold text-slate-700 dark:text-slate-300' 
                            : 'font-black text-slate-900 dark:text-white'
                        }`}>
                          {notif.title}
                        </h3>

                        <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        
                        {/* Meta chips footer */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-slate-400">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notif.timestamp}
                          </span>

                          {notif.workspaceId && notif.workspaceId !== 'all' && (
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                              {workspaces.find(w => w.id === notif.workspaceId)?.name || (isVietnamese ? 'Không gian' : 'Workspace')}
                            </span>
                          )}

                          {hasTaskLink && (
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase flex items-center gap-1">
                              <CheckSquare className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                              Task
                            </span>
                          )}
                        </div>
                      </div>

                      {/* On-Hover Interactive Action Dock */}
                      <div 
                        className="absolute right-2.5 bottom-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-md z-20" 
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Pin toggle */}
                        <button 
                          onClick={() => handleTogglePin(notif.id)}
                          className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            notif.pinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                          }`}
                          title={notif.pinned ? (isVietnamese ? "Bỏ ghim" : "Unpin") : (isVietnamese ? "Ghim" : "Pin")}
                        >
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Read toggle */}
                        <button 
                          onClick={() => handleToggleRead(notif.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={notif.read ? (isVietnamese ? "Đánh dấu chưa đọc" : "Mark as unread") : (isVietnamese ? "Đã đọc" : "Mark as read")}
                        >
                          {notif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Snooze button with popover */}
                        <div className="relative">
                          <button 
                            onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === notif.id ? null : notif.id)}
                            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                              notif.snoozedUntil ? 'text-blue-600 dark:text-sky-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                            }`}
                            title={isVietnamese ? "Tạm ẩn" : "Snooze"}
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {showSnoozeDropdownId === notif.id && (
                            <>
                              <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setShowSnoozeDropdownId(null); }} />
                              <div className="absolute bottom-full right-0 mb-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-30 flex flex-col gap-1 text-xs min-w-[120px]">
                                <button onClick={() => handleSnooze(notif.id, 2)} className="px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-left text-slate-800 dark:text-slate-200">
                                  {isVietnamese ? 'Sau 2 giờ' : 'In 2 hours'}
                                </button>
                                <button onClick={() => handleSnooze(notif.id, 24)} className="px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-left text-slate-800 dark:text-slate-200">
                                  {isVietnamese ? 'Ngày mai' : 'Tomorrow'}
                                </button>
                                <button onClick={() => handleSnooze(notif.id, 168)} className="px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-left text-slate-800 dark:text-slate-200">
                                  {isVietnamese ? 'Tuần tới' : 'Next week'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Archive / Restore button */}
                        {activeTab === 'cleared' ? (
                          <button 
                            onClick={() => handleRestore(notif.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-sky-300 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={isVietnamese ? "Khôi phục" : "Restore"}
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleClear(notif.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={isVietnamese ? "Lưu trữ" : "Archive"}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filteredNotifications.length === 0 && workspaceInvitations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3.5 select-none">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-violet-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
                <Check className="w-7 h-7" />
              </div>
              <div className="max-w-xs space-y-1.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Hộp thư gọn gàng!' : 'Inbox Zero!'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isVietnamese ? 'Tuyệt vời! Không còn thông báo nào cần xử lý trong mục này.' : 'All caught up! No notifications requiring attention.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Capsule Bar for Multi-Select */}
        {selectedNotifIds.length > 0 && (
          <div className="p-3 bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 backdrop-blur-xl rounded-2xl m-3 flex items-center justify-between shadow-2xl border border-white/10 dark:border-black/10">
            <span className="text-xs font-black px-2">
              {selectedNotifIds.length} {isVietnamese ? 'đã chọn' : 'selected'}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleMarkReadSelected}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {isVietnamese ? 'Đã đọc' : 'Mark Read'}
              </button>
              <button 
                onClick={handleClearSelected}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Detail & Productivity Hub ── */}
      <div className={`apexa-inbox-detail flex-1 min-w-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col relative ${
        selectedNotificationId ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedTask ? (
          /* ── Case 1: Connected Task Inspector ── */
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Header with Breadcrumb Back Button */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedNotificationId(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title={isVietnamese ? "Quay lại tổng quan" : "Back to Overview"}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Tổng quan' : 'Overview'}</span>
                </button>
                <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {isVietnamese ? 'Công việc liên kết' : 'Linked Task'}
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate block max-w-md">
                    {selectedTask.title}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {selectedNotif && !selectedNotif.cleared && (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/70 dark:border-blue-800/60 text-xs font-black hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Lưu trữ thông báo' : 'Archive'}</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedNotificationId(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  title={isVietnamese ? "Đóng chi tiết" : "Close"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Details Component Container */}
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

            {/* Inline Quick Reply Dock */}
            <form onSubmit={handleSendQuickReply} className="p-3.5 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 shrink-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={isVietnamese ? `Phản hồi nhanh vào "${selectedTask.title}"...` : `Quick reply to "${selectedTask.title}"...`}
                className="flex-1 text-xs font-semibold px-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
              />
              <button 
                type="submit"
                disabled={!replyText.trim() || isSendingReply}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Gửi' : 'Send'}</span>
              </button>
            </form>
          </div>
        ) : selectedNotif ? (
          /* ── Case 2: Deep Master-Detail Inspector for Billing, System, Invites, Mentions ── */
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedNotificationId(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title={isVietnamese ? "Quay lại tổng quan" : "Back to Overview"}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Tổng quan' : 'Overview'}</span>
                </button>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  {isVietnamese ? 'Chi tiết thông báo' : 'Notification Details'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedNotif.cleared ? (
                  <button 
                    onClick={() => handleRestore(selectedNotif.id)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-black cursor-pointer hover:bg-blue-100 transition-all"
                  >
                    {isVietnamese ? 'Khôi phục' : 'Restore'}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-black cursor-pointer hover:bg-blue-100 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedNotificationId(null)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Deep Inspector Body */}
            <div className="flex-1 p-5 sm:p-7 space-y-5 overflow-y-auto custom-scrollbar text-left">
              {(() => {
                const catMeta = getCategoryMeta(selectedNotif);
                const isBilling = catMeta.key === 'billing';
                const isSystem = catMeta.key === 'system';
                const isMention = catMeta.key === 'comment';
                const IconComp = catMeta.icon;

                return (
                  <div className="space-y-5 max-w-3xl">
                    
                    {/* Category Specific Hero Card */}
                    {isBilling ? (
                      /* Billing & Transaction Inspector */
                      <div className="p-6 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl space-y-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60">
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 tracking-wider">
                                  {isVietnamese ? 'Cổng Thanh toán' : 'Billing Gateway'}
                                </span>
                                <span className="text-[11px] text-slate-400 font-bold">
                                  {selectedNotif.timestamp}
                                </span>
                              </div>
                              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                {selectedNotif.title}
                              </h2>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{isVietnamese ? 'Cần xử lý' : 'Action Required'}</span>
                          </span>
                        </div>

                        {/* Diagnostic Explanation */}
                        <div className="p-4 bg-white/90 dark:bg-slate-950/90 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                          <p className="font-semibold leading-relaxed">
                            {selectedNotif.message}
                          </p>
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-slate-500">
                              <span>{isVietnamese ? 'Mã tham chiếu' : 'Reference ID'}:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#PAY-{selectedNotif.id.slice(-6).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                              <span>{isVietnamese ? 'Cổng giao dịch' : 'Payment Gateway'}:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">PayOS VietQR / Visa Master</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                              <span>{isVietnamese ? 'Không gian' : 'Workspace'}:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{selectedNotif.workspaceId || 'Apexa Cloud'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center gap-3 pt-2 flex-wrap">
                          <button
                            onClick={onUpgradePremium}
                            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:opacity-95 text-white font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>{isVietnamese ? 'Thử lại thanh toán / Nâng cấp gói' : 'Retry Payment / Upgrade Plan'}</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${selectedNotif.title}\n${selectedNotif.message}\nID: #PAY-${selectedNotif.id.slice(-6).toUpperCase()}`);
                              triggerToast?.('success', isVietnamese ? 'Đã sao chép' : 'Copied', isVietnamese ? 'Đã chép thông tin lỗi vào bộ nhớ đệm.' : 'Copied error info.');
                            }}
                            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isVietnamese ? 'Sao chép thông tin lỗi' : 'Copy Error Details'}</span>
                          </button>

                          <button
                            onClick={() => handleClear(selectedNotif.id)}
                            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isVietnamese ? 'Đã giải quyết & Lưu trữ' : 'Mark Resolved'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* General & System Inspector */
                      <div className="p-6 bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl border ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                              <IconComp className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${catMeta.badge}`}>
                                  {catMeta.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-bold">
                                  {selectedNotif.timestamp}
                                </span>
                              </div>
                              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                {selectedNotif.title}
                              </h2>
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${selectedNotif.title}\n\n${selectedNotif.message}`);
                              triggerToast?.('success', isVietnamese ? 'Đã sao chép' : 'Copied', isVietnamese ? 'Đã chép nội dung thông báo vào bộ nhớ đệm.' : 'Copied to clipboard.');
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            title={isVietnamese ? "Sao chép nội dung" : "Copy content"}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                          {selectedNotif.message}
                        </div>

                        {/* Notification Footer Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {isVietnamese ? 'Trạng thái: ' : 'Status: '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {selectedNotif.read ? (isVietnamese ? 'Đã đọc' : 'Read') : (isVietnamese ? 'Mới' : 'Unread')}
                            </strong>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleRead(selectedNotif.id)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                            >
                              {selectedNotif.read ? (isVietnamese ? 'Đánh dấu chưa đọc' : 'Mark unread') : (isVietnamese ? 'Đánh dấu đã đọc' : 'Mark read')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Context Shortcuts if Comment or Mention */}
                    {isMention && (
                      <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-sky-600" />
                          <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                            {isVietnamese ? 'Thảo luận này thuộc một công việc hoặc tài liệu chung.' : 'This mention is from a shared workspace conversation.'}
                          </span>
                        </div>
                        <button
                          onClick={() => onNavigateToTab?.('chat')}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>{isVietnamese ? 'Mở Chat' : 'Open Chat'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          /* ── Case 3: World-Class Productivity & Focus Command Hub ── */
          <div className="w-full h-full flex flex-col p-5 sm:p-7 overflow-y-auto text-left space-y-6 custom-scrollbar">
            
            {/* 4 Interactive Live Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
              {/* 1. Unread */}
              <div 
                onClick={() => {
                  setActiveTab('unread');
                  setQuickFilter('all');
                }}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-2xs cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold group-hover:text-blue-600 transition-colors">
                    {isVietnamese ? 'Cần xử lý' : 'Pending'}
                  </span>
                  <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/70 dark:border-blue-800/50">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {inboxStats.unread}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold truncate">
                  {isVietnamese ? 'Thông báo chưa đọc' : 'Unread notifications'}
                </p>
              </div>

              {/* 2. Assigned */}
              <div 
                onClick={() => setQuickFilter('assigned')}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-2xs cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold group-hover:text-indigo-600 transition-colors">
                    {isVietnamese ? 'Được giao' : 'Assigned'}
                  </span>
                  <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/50">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {productivityStats.totalAssigned}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold truncate">
                  {isVietnamese ? 'Đầu việc cần làm' : 'Tasks in progress'}
                </p>
              </div>

              {/* 3. Urgent */}
              <div 
                onClick={() => setQuickFilter('deadlines')}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-2xs cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold group-hover:text-amber-600 transition-colors">
                    {isVietnamese ? 'Khẩn cấp' : 'Urgent'}
                  </span>
                  <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/50">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {productivityStats.urgent}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold truncate">
                  {isVietnamese ? 'Ưu tiên cao nhất' : 'High priority items'}
                </p>
              </div>

              {/* 4. Completion Rate */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold">
                    {isVietnamese ? 'Hoàn thành' : 'Completed'}
                  </span>
                  <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {productivityStats.completionRate}%
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${productivityStats.completionRate}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Apexa AI Daily Briefing Smart Card */}
            <div className="p-5 rounded-[24px] bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-violet-50/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-violet-950/30 border border-blue-200/70 dark:border-blue-800/60 space-y-3.5 shadow-sm shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-2xs border border-blue-200/60 dark:border-blue-800/60">
                    <ApexaAiIcon className="w-4 h-4" variant="gradient" animated={aiDigestLoading} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                      <span>Apexa AI Daily Briefing</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[9px] font-black uppercase">
                        Gemini 2.5 Flash
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {isVietnamese ? 'Tóm tắt thông minh công việc & thông báo trọng tâm trong ngày' : 'Smart daily executive overview powered by Gemini'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {aiDigestText && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiDigestText);
                        triggerToast?.('success', isVietnamese ? 'Đã sao chép' : 'Copied', isVietnamese ? 'Đã sao chép tóm tắt AI vào bộ nhớ đệm.' : 'AI briefing copied.');
                      }}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
                      title={isVietnamese ? "Sao chép tóm tắt" : "Copy summary"}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={handleGenerateAiDigest}
                    disabled={aiDigestLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {aiDigestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ApexaAiIcon className="w-3.5 h-3.5" variant="white" />}
                    <span>{aiDigestLoading ? (isVietnamese ? 'Đang tóm tắt…' : 'Generating…') : (isVietnamese ? 'Tạo tóm tắt AI' : 'Generate Briefing')}</span>
                  </button>
                </div>
              </div>

              {aiDigestText ? (
                <div className="p-4 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-blue-200/60 dark:border-blue-800/50 text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium shadow-2xs space-y-2">
                  <p>{aiDigestText}</p>
                </div>
              ) : (
                <div className="p-3.5 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-dashed border-blue-200 dark:border-blue-800/60 text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      {isVietnamese 
                        ? 'Nhấn "Tạo tóm tắt AI" để Gemini đọc thông báo, thời hạn công việc và tiến độ để xuất báo cáo nhanh đầu ngày cho bạn.' 
                        : 'Click "Generate Briefing" to let Gemini scan notifications and upcoming deadlines for an executive morning brief.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Next Up & Priority Tasks Queue */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {isVietnamese ? 'Hàng đợi công việc trọng tâm' : 'Next Up & Priority Tasks'}
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateToTab?.('tasks')}
                  className="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{isVietnamese ? 'Xem tất cả' : 'View all'}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {upcomingTasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {upcomingTasks.map(task => {
                    const isCompleted = task.status === 'completed';
                    const isUrgent = task.priority === 'urgent' || task.priority === 'high';
                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          const linkedNotif = notificationsList.find(n => getAssociatedTaskId(n) === task.id);
                          if (linkedNotif) {
                            setSelectedNotificationId(linkedNotif.id);
                          } else {
                            // Link to tasks
                            onNavigateToTab?.('tasks');
                          }
                        }}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newStatus: TaskStatus = isCompleted ? 'inprogress' : 'completed';
                              onUpdateTask({ ...task, status: newStatus });
                              triggerToast?.('success', isVietnamese ? 'Cập nhật tiến độ' : 'Progress Updated', `${task.title}: ${newStatus}`);
                            }}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 text-transparent hover:text-blue-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <div className="min-w-0">
                            <h4 className={`text-xs font-black truncate group-hover:text-blue-600 transition-colors ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                            }`}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              {task.dueDate && (
                                <span className="flex items-center gap-1 font-bold">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {task.dueDate}
                                </span>
                              )}
                              {task.priority && (
                                <span className={`font-black uppercase text-[9px] px-1.5 py-0.2 rounded ${
                                  isUrgent 
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{isVietnamese ? 'Không có công việc tồn đọng cần xử lý!' : 'No pending tasks on your plate!'}</span>
                  </div>
                  <button
                    onClick={() => onNavigateToTab?.('tasks')}
                    className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Tạo việc' : 'New Task'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Workspace Activity Pulse & Recent Timeline */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {isVietnamese ? 'Dòng hoạt động không gian' : 'Workspace Activity Pulse'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {recentActivities.length} {isVietnamese ? 'hoạt động gần đây' : 'recent events'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {recentActivities.map(item => {
                  const catMeta = getCategoryMeta(item);
                  const IconComp = catMeta.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedNotificationId(item.id)}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl ${catMeta.bg} ${catMeta.color} shrink-0`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400">
                          {item.timestamp}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inbox Health & 1-Click Triage */}
            {olderReadNotifications.length > 0 ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-sky-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {isVietnamese ? 'Dọn dẹp đạt Inbox Zero' : 'Inbox Health Triage'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVietnamese 
                        ? `Bạn có ${olderReadNotifications.length} thông báo đã đọc có thể lưu trữ để hộp thư gọn gàng.` 
                        : `You have ${olderReadNotifications.length} read notifications ready to be archived.`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTriageOlderRead}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Lưu trữ thông báo đã đọc' : 'Archive Read'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-3 shrink-0">
                <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-black text-emerald-900 dark:text-emerald-300">Inbox Zero 100%! </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    {isVietnamese ? 'Mọi thông báo đã được xử lý ngăn nắp.' : 'All items are neatly triaged and up to date.'}
                  </span>
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts Cheat Sheet */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 shrink-0">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                <span className="uppercase tracking-wider font-black text-slate-400 dark:text-slate-500">
                  {isVietnamese ? 'Phím tắt nhanh' : 'Keyboard Shortcuts'}
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">J</kbd><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">K</kbd> {isVietnamese ? 'Lên / Xuống' : 'Navigate'}</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">E</kbd> {isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">R</kbd> {isVietnamese ? 'Đã đọc' : 'Read'}</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">S</kbd> {isVietnamese ? 'Tạm ẩn' : 'Snooze'}</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">/</kbd> {isVietnamese ? 'Tìm' : 'Search'}</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">Esc</kbd> {isVietnamese ? 'Đóng' : 'Close'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Shortcuts Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-2.5">
                {isVietnamese ? 'Lối tắt nhanh' : 'Quick Actions'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => onNavigateToTab?.('tasks')}
                  className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300">
                    <CheckSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span>{isVietnamese ? 'Công việc' : 'Tasks'}</span>
                </button>

                <button
                  onClick={() => onNavigateToTab?.('calendar')}
                  className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300">
                    <Calendar className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span>{isVietnamese ? 'Lịch tuần' : 'Calendar'}</span>
                </button>

                <button
                  onClick={() => onNavigateToTab?.('chat')}
                  className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="p-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300">
                    <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span>{isVietnamese ? 'Trò chuyện' : 'Team Chat'}</span>
                </button>

                <button
                  onClick={() => onNavigateToTab?.('goals')}
                  className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300">
                    <Target className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span>{isVietnamese ? 'Mục tiêu' : 'Goals'}</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
