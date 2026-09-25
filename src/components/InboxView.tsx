"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, Check, Trash2, Eye, EyeOff, Pin, Archive, Clock, Search, 
  Inbox, ArchiveRestore, Sparkles, CheckSquare,
  Bookmark, Send, MessageSquare,
  ChevronRight, ChevronDown, Minus, X, CheckCheck,
  Flame, ArrowLeft,
  CreditCard, Copy, Layers, SlidersHorizontal,
  AlertTriangle, ShieldCheck,
  Award, Mail
} from 'lucide-react';
import { Task, User, Workspace, WorkspaceInvitation, TaskStatus, Priority } from '../types';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';
import { callAiApi } from '@/lib/aiClient';
import { useTranslation } from '@/contexts/TranslationContext';


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
  
  // Bulk Multi-Select & Selection Mode
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const selectDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  // Quick Reply
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Local states for TaskDetailsPanel
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(e.target as Node)) {
        setIsSelectDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (e.shiftKey && lastSelectedIdRef.current) {
      const currentIndex = filteredNotifications.findIndex(n => n.id === id);
      const lastIndex = filteredNotifications.findIndex(n => n.id === lastSelectedIdRef.current);
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = filteredNotifications.slice(start, end + 1).map(n => n.id);
        setSelectedNotifIds(prev => Array.from(new Set([...prev, ...rangeIds])));
        lastSelectedIdRef.current = id;
        return;
      }
    }
    lastSelectedIdRef.current = id;
    setSelectedNotifIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (filteredNotifications.length === 0) return;
    const allVisibleIds = filteredNotifications.map(n => n.id);
    const isAllSelected = allVisibleIds.every(id => selectedNotifIds.includes(id));
    if (isAllSelected) {
      setSelectedNotifIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      setSelectedNotifIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
      setIsMultiSelectMode(true);
    }
    setIsSelectDropdownOpen(false);
  };

  const handleSelectUnreadVisible = () => {
    const unreadIds = filteredNotifications.filter(n => !n.read).map(n => n.id);
    setSelectedNotifIds(unreadIds);
    setIsMultiSelectMode(true);
    setIsSelectDropdownOpen(false);
  };

  const handleSelectReadVisible = () => {
    const readIds = filteredNotifications.filter(n => n.read).map(n => n.id);
    setSelectedNotifIds(readIds);
    setIsMultiSelectMode(true);
    setIsSelectDropdownOpen(false);
  };

  const handleSelectImportantVisible = () => {
    const importantIds = filteredNotifications.filter(n => {
      const taskId = getAssociatedTaskId(n);
      const task = tasks.find(t => t.id === taskId);
      const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
      const isMention = n.type === 'comment' || n.title?.includes('@') || n.message?.includes('@');
      return n.type === 'assignment' || n.type === 'deadline' || isAssigned || isMention;
    }).map(n => n.id);
    setSelectedNotifIds(importantIds);
    setIsMultiSelectMode(true);
    setIsSelectDropdownOpen(false);
  };

  const handleClearSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, cleared: true } : n
    ));
    if (selectedNotificationId && selectedNotifIds.includes(selectedNotificationId)) {
      setSelectedNotificationId(null);
    }
    setSelectedNotifIds([]);
    triggerToast?.('success', isVietnamese ? 'Đã lưu trữ' : 'Archived', isVietnamese ? 'Các thông báo đã chọn đã được chuyển vào lưu trữ.' : 'Selected items archived.');
  };

  const handleRestoreSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, cleared: false } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', isVietnamese ? 'Đã khôi phục' : 'Restored', isVietnamese ? 'Các thông báo đã chọn đã trở lại hộp thư.' : 'Selected notifications restored.');
  };

  const handleMarkReadSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, read: true } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', isVietnamese ? 'Đã đọc' : 'Marked read', isVietnamese ? 'Đã đánh dấu đã đọc các mục đã chọn.' : 'Selected items marked as read.');
  };

  const handleMarkUnreadSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, read: false } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', isVietnamese ? 'Chưa đọc' : 'Marked unread', isVietnamese ? 'Đã đánh dấu chưa đọc các mục đã chọn.' : 'Selected items marked as unread.');
  };

  const handlePinSelected = () => {
    const allPinned = selectedNotifIds.every(id => notificationsList.find(n => n.id === id)?.pinned);
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, pinned: !allPinned } : n
    ));
    triggerToast?.('success', allPinned ? (isVietnamese ? 'Đã bỏ ghim' : 'Unpinned') : (isVietnamese ? 'Đã ghim' : 'Pinned'), isVietnamese ? 'Đã cập nhật trạng thái ghim.' : 'Pin status updated.');
  };

  const handleDeleteSelected = () => {
    setNotificationsList(prev => prev.filter(n => !selectedNotifIds.includes(n.id)));
    if (selectedNotificationId && selectedNotifIds.includes(selectedNotificationId)) {
      setSelectedNotificationId(null);
    }
    setSelectedNotifIds([]);
    triggerToast?.('success', isVietnamese ? 'Đã xóa' : 'Deleted', isVietnamese ? 'Đã xóa các thông báo đã chọn.' : 'Selected items deleted.');
  };

  const isAllVisibleSelected = filteredNotifications.length > 0 && 
    filteredNotifications.every(n => selectedNotifIds.includes(n.id));
  const isSomeVisibleSelected = selectedNotifIds.length > 0 && !isAllVisibleSelected;

  const handleMasterCheckboxClick = () => {
    if (isAllVisibleSelected) {
      const visibleIds = filteredNotifications.map(n => n.id);
      setSelectedNotifIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const visibleIds = filteredNotifications.map(n => n.id);
      setSelectedNotifIds(prev => Array.from(new Set([...prev, ...visibleIds])));
      setIsMultiSelectMode(true);
    }
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
    { id: 'unread', label: isVietnamese ? 'Chưa đọc' : 'Unread', count: inboxStats.unread, unread: inboxStats.unread, icon: Bell },
    { id: 'important', label: isVietnamese ? 'Quan trọng' : 'Important', count: inboxStats.important, unread: inboxStats.importantUnread, icon: Flame },
    { id: 'saved', label: isVietnamese ? 'Đã lưu' : 'Saved', count: inboxStats.saved, unread: 0, icon: Bookmark },
    { id: 'cleared', label: isVietnamese ? 'Lưu trữ' : 'Archived', count: inboxStats.cleared, unread: 0, icon: Archive },
  ];

  // Chip Filters
  const CHIP_FILTERS = useMemo(() => [
    { id: 'all', label: isVietnamese ? 'Tất cả loại' : 'All types', icon: SlidersHorizontal, count: quickFilterCounts.all },
    { id: 'assigned', label: isVietnamese ? 'Được giao' : 'Assigned', icon: CheckSquare, count: quickFilterCounts.assigned },
    { id: 'comments', label: isVietnamese ? 'Nhắc đến' : 'Mentions', icon: MessageSquare, count: quickFilterCounts.comments },
    { id: 'deadlines', label: isVietnamese ? 'Hạn chót' : 'Deadlines', icon: Flame, count: quickFilterCounts.deadlines },
    { id: 'billing', label: isVietnamese ? 'Thanh toán' : 'Billing', icon: CreditCard, count: quickFilterCounts.billing },
    { id: 'system', label: isVietnamese ? 'Hệ thống' : 'System', icon: Bell, count: quickFilterCounts.system },
  ], [isVietnamese, quickFilterCounts]);

  const activeChipMeta = useMemo(() => {
    return CHIP_FILTERS.find(f => f.id === quickFilter) || CHIP_FILTERS[0];
  }, [CHIP_FILTERS, quickFilter]);

  return (
    <div className="apexa-inbox w-full h-full flex flex-col md:flex-row gap-0 font-sans text-left text-slate-800 dark:text-slate-100 select-none overflow-hidden p-0 bg-slate-50/50 dark:bg-slate-950/50">
      
      {/* ── Left Column: Stream Panel ── */}
      <div className={`apexa-inbox-list flex flex-col min-w-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 shadow-none overflow-hidden transition-all duration-300 ${
        selectedNotificationId 
          ? 'hidden md:flex md:w-[410px] lg:w-[440px] xl:w-[460px] shrink-0' 
          : 'flex-1 md:flex-initial md:w-[420px] lg:w-[450px] xl:w-[480px] shrink-0'
      }`}>
        
        {/* Compact Top Header & Control Bar */}
        <div className="px-3 pt-3 pb-2.5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
          
          {/* Row 1: Title, Scope, Multi-select mode toggle & Global actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Inbox className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {isVietnamese ? 'Hộp thư' : 'Inbox'}
                </h1>
                {inboxStats.unread > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-blue-500/15 dark:bg-blue-500/25 text-blue-600 dark:text-sky-300 text-[10px] font-bold border border-blue-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {inboxStats.unread} {isVietnamese ? 'mới' : 'new'}
                  </span>
                )}
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Workspace Scope Toggle */}
              <button
                onClick={() => setWorkspaceScope(prev => prev === 'current' ? 'all' : 'current')}
                className={`h-7 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                  workspaceScope === 'current'
                    ? 'border-blue-200/80 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 hover:bg-blue-100/80'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title={isVietnamese ? 'Chuyển phạm vi không gian làm việc (Không gian này / Tất cả)' : 'Toggle workspace scope (This space / All spaces)'}
              >
                <Layers className={`w-3 h-3 ${workspaceScope === 'current' ? 'text-blue-600 dark:text-sky-400' : 'text-slate-500'}`} />
                <span>{workspaceScope === 'current' ? (isVietnamese ? 'Space này' : 'Current') : (isVietnamese ? 'Tất cả' : 'All')}</span>
              </button>

              {/* Toggle Multi-Select Mode */}
              <button
                onClick={() => {
                  setIsMultiSelectMode(prev => !prev);
                  if (isMultiSelectMode && selectedNotifIds.length > 0) {
                    setSelectedNotifIds([]);
                  }
                }}
                className={`h-7 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                  isMultiSelectMode || selectedNotifIds.length > 0
                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 font-bold'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100'
                }`}
                title={isVietnamese ? 'Bật/tắt chế độ chọn nhiều thư' : 'Toggle multi-select mode'}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isVietnamese ? 'Chọn' : 'Select'}</span>
              </button>

              {/* Mark All Read */}
              <button 
                onClick={handleMarkAllRead}
                disabled={inboxStats.unread === 0 && filteredNotifications.length === 0}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-sky-300 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                title={isVietnamese ? 'Đánh dấu tất cả là đã đọc' : 'Mark all as read'}
                aria-label={isVietnamese ? 'Đánh dấu tất cả là đã đọc' : 'Mark all as read'}
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
              
              {/* Archive All Visible */}
              <button 
                onClick={handleClearAllVisible}
                disabled={filteredNotifications.length === 0}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
                title={isVietnamese ? 'Lưu trữ tất cả thông báo hiển thị' : 'Archive all visible'}
                aria-label={isVietnamese ? 'Lưu trữ tất cả thông báo hiển thị' : 'Archive all visible'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Search Input + Type Filter Popover */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/90 rounded-xl px-2.5 h-7.5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-950 group shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors shrink-0" />
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
                className="apexa-search-input w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none !border-0 !outline-none focus:!outline-none focus-visible:!outline-none focus:!ring-0 focus-visible:!ring-0 shadow-none p-0"
              />
              {searchQuery ? (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isVietnamese ? 'Xóa tìm kiếm' : 'Clear search'}
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-800/80 px-1 py-0.2 rounded border border-slate-300/60 dark:border-slate-700/60 select-none">
                  /
                </kbd>
              )}
            </div>

            {/* Type Filter Dropdown Popover */}
            <div className="relative shrink-0" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(prev => !prev)}
                className={`h-7.5 px-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  quickFilter !== 'all'
                    ? 'border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-bold'
                    : 'border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
                title={isVietnamese ? 'Lọc theo loại thông báo' : 'Filter by notification type'}
              >
                <activeChipMeta.icon className={`w-3 h-3 shrink-0 ${quickFilter !== 'all' ? 'text-blue-600 dark:text-sky-400' : 'text-slate-500'}`} />
                <span className="max-w-[90px] truncate">{activeChipMeta.label}</span>
                {activeChipMeta.count > 0 && quickFilter !== 'all' && (
                  <span className="text-[9px] px-1 py-0.2 rounded-full bg-blue-200/80 dark:bg-blue-900/80 text-blue-800 dark:text-sky-200 font-bold">
                    {activeChipMeta.count}
                  </span>
                )}
                {quickFilter !== 'all' ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickFilter('all');
                    }}
                    className="p-0.5 -mr-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-sky-300 cursor-pointer"
                    title={isVietnamese ? 'Xóa lọc' : 'Clear filter'}
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[9.5px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    {isVietnamese ? 'Loại thông báo' : 'Notification Type'}
                  </div>
                  {CHIP_FILTERS.map(f => {
                    const isChipActive = quickFilter === f.id;
                    const ChipIcon = f.icon;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setQuickFilter(f.id as any);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                          isChipActive
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ChipIcon className={`w-3.5 h-3.5 ${isChipActive ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'}`} />
                          <span>{f.label}</span>
                        </div>
                        {f.count > 0 && (
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                            isChipActive 
                              ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {f.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Master Checkbox + Navigation Tabs OR Bulk Action Toolbar */}
          {selectedNotifIds.length > 0 ? (
            /* Bulk Action Toolbar when items are selected */
            <div className="flex items-center justify-between gap-1 p-1 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 rounded-xl transition-all">
              <div className="flex items-center gap-1.5 min-w-0 pl-1" ref={selectDropdownRef}>
                {/* Master Checkbox */}
                <button
                  type="button"
                  onClick={handleMasterCheckboxClick}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                    isAllVisibleSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isSomeVisibleSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-sky-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                  title={isAllVisibleSelected ? (isVietnamese ? 'Bỏ chọn tất cả' : 'Deselect all') : (isVietnamese ? 'Chọn tất cả' : 'Select all')}
                >
                  {isAllVisibleSelected ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isSomeVisibleSelected ? (
                    <Minus className="w-3 h-3 stroke-[3]" />
                  ) : null}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSelectDropdownOpen(prev => !prev)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title={isVietnamese ? 'Tùy chọn chọn thư' : 'Selection options'}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isSelectDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={handleSelectAllVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Tất cả' : 'All'}</span>
                        <span className="text-[10px] text-slate-400">{filteredNotifications.length}</span>
                      </button>
                      <button
                        onClick={handleSelectUnreadVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Chưa đọc' : 'Unread'}</span>
                        <span className="text-[10px] text-slate-400">{filteredNotifications.filter(n => !n.read).length}</span>
                      </button>
                      <button
                        onClick={handleSelectReadVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Đã đọc' : 'Read'}</span>
                        <span className="text-[10px] text-slate-400">{filteredNotifications.filter(n => n.read).length}</span>
                      </button>
                      <button
                        onClick={handleSelectImportantVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Quan trọng' : 'Important'}</span>
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-700/80 my-1" />
                      <button
                        onClick={() => {
                          setSelectedNotifIds([]);
                          setIsSelectDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-500 cursor-pointer"
                      >
                        {isVietnamese ? 'Bỏ chọn' : 'Deselect all'}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-black text-blue-700 dark:text-sky-300 truncate">
                  {selectedNotifIds.length} {isVietnamese ? 'đã chọn' : 'selected'}
                </span>
              </div>

              {/* Bulk Actions Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleMarkReadSelected}
                  className="h-6 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title={isVietnamese ? 'Đánh dấu đã đọc' : 'Mark as read'}
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="hidden xs:inline">{isVietnamese ? 'Đã đọc' : 'Read'}</span>
                </button>
                <button
                  onClick={handleMarkUnreadSelected}
                  className="h-6 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title={isVietnamese ? 'Đánh dấu chưa đọc' : 'Mark as unread'}
                >
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span className="hidden xs:inline">{isVietnamese ? 'Chưa đọc' : 'Unread'}</span>
                </button>
                <button
                  onClick={handleClearSelected}
                  className="h-6 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-[10.5px] font-bold text-white flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title={isVietnamese ? 'Lưu trữ các mục đã chọn' : 'Archive selected'}
                >
                  <Archive className="w-3 h-3" />
                  <span className="hidden xs:inline">{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                </button>
                <button
                  onClick={handlePinSelected}
                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center cursor-pointer transition-all shadow-2xs"
                  title={isVietnamese ? 'Ghim / Bỏ ghim' : 'Pin / Unpin'}
                >
                  <Pin className="w-3 h-3" />
                </button>
                {activeTab === 'cleared' && (
                  <button
                    onClick={handleRestoreSelected}
                    className="h-6 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10.5px] font-bold text-white flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    title={isVietnamese ? 'Khôi phục vào hộp thư chính' : 'Restore'}
                  >
                    <ArchiveRestore className="w-3 h-3" />
                    <span className="hidden xs:inline">{isVietnamese ? 'Khôi phục' : 'Restore'}</span>
                  </button>
                )}
                <button
                  onClick={handleDeleteSelected}
                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center cursor-pointer transition-all shadow-2xs"
                  title={isVietnamese ? 'Xóa vĩnh viễn' : 'Delete'}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setSelectedNotifIds([])}
                  className="w-6 h-6 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-all"
                  title={isVietnamese ? 'Bỏ chọn' : 'Deselect'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Normal Mode: Master Checkbox + Segmented Navigation Tabs */
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Master Checkbox with Dropdown */}
              <div className="flex items-center gap-0.5 shrink-0" ref={selectDropdownRef}>
                <button
                  type="button"
                  onClick={handleMasterCheckboxClick}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                    isAllVisibleSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isSomeVisibleSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-sky-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400'
                  }`}
                  title={isAllVisibleSelected ? (isVietnamese ? 'Bỏ chọn tất cả' : 'Deselect all') : (isVietnamese ? 'Chọn tất cả' : 'Select all')}
                >
                  {isAllVisibleSelected ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isSomeVisibleSelected ? (
                    <Minus className="w-3 h-3 stroke-[3]" />
                  ) : null}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSelectDropdownOpen(prev => !prev)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title={isVietnamese ? 'Tùy chọn chọn thư' : 'Selection options'}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isSelectDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={handleSelectAllVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Tất cả' : 'All'}</span>
                        <span className="text-[10px] text-slate-400">{filteredNotifications.length}</span>
                      </button>
                      <button
                        onClick={handleSelectUnreadVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Chưa đọc' : 'Unread'}</span>
                        <span className="text-[10px] text-slate-400">{filteredNotifications.filter(n => !n.read).length}</span>
                      </button>
                      <button
                        onClick={handleSelectReadVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Đã đọc' : 'Read'}</span>
                        <span className="text-[10px] text-slate-400">{filteredNotifications.filter(n => n.read).length}</span>
                      </button>
                      <button
                        onClick={handleSelectImportantVisible}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isVietnamese ? 'Quan trọng' : 'Important'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

              {/* Segmented Navigation Tabs */}
              <div className="flex-1 flex items-center gap-1 p-0.5 bg-slate-100/90 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto scrollbar-none min-w-0">
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
                      className={`flex-1 min-w-0 py-1 px-1.5 rounded-lg transition-all cursor-pointer relative flex items-center justify-center gap-1 text-center whitespace-nowrap ${
                        isTabActive
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-300 shadow-xs font-bold border border-slate-200/70 dark:border-slate-700/70'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold hover:bg-white/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <tab.icon className={`w-3 h-3 shrink-0 transition-colors ${isTabActive ? 'text-blue-600 dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="text-[11px] font-bold">{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
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
            </div>
          )}
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
                  className={`p-3.5 bg-white dark:bg-slate-900 border rounded-2xl flex flex-col gap-2.5 shadow-xs ${
                    inv.token && inv.token === highlightedInviteToken 
                      ? 'border-blue-500 ring-2 ring-blue-500/25' 
                      : 'border-slate-200/80 dark:border-slate-800'
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
            <div key={gIdx} className="space-y-1.5">
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/80" />
                <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
                  {group.items.length}
                </span>
                {(group.label.toLowerCase().includes('cũ') || group.label.toLowerCase().includes('older')) && olderReadNotifications.length > 0 && (
                  <button
                    onClick={handleTriageOlderRead}
                    className="text-[9.5px] font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer ml-1"
                    title={isVietnamese ? 'Lưu trữ tất cả thông báo cũ đã đọc' : 'Archive all older read'}
                  >
                    {isVietnamese ? 'Dọn dẹp' : 'Clean up'}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
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
                      className={`group p-2.5 sm:p-3 rounded-xl border transition-all duration-150 flex flex-col gap-1.5 cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 ring-1 ring-blue-500/25 shadow-xs'
                          : isChecked
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/80 shadow-2xs'
                            : notif.read 
                              ? 'bg-slate-50/40 dark:bg-slate-900/30 border-transparent hover:border-slate-200/80 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-900/70 text-slate-600 dark:text-slate-300' 
                              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700/60'
                      }`}
                    >
                      {/* Left glowing accent line for unread items */}
                      {!notif.read && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-full bg-blue-600 dark:bg-blue-500" />
                      )}

                      {/* Header Row: Checkbox, Icon, Category Badge, Title preview, Pin, Timestamp */}
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Interactive selection checkbox - visible on hover, when items are selected, or in multi-select mode */}
                        <div 
                          onClick={(e) => handleToggleSelectNotif(notif.id, e)} 
                          className={`shrink-0 transition-all duration-150 flex items-center justify-center p-0.5 cursor-pointer ${
                            isChecked || selectedNotifIds.length > 0 || isMultiSelectMode
                              ? 'w-4.5 opacity-100' 
                              : 'w-0 opacity-0 group-hover:w-4.5 group-hover:opacity-100 overflow-hidden'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                          />
                        </div>

                        {/* Category Icon Badge */}
                        <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center border shadow-2xs ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>

                        {/* Category label badge */}
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${catMeta.badge}`}>
                          {catMeta.label}
                        </span>

                        {/* Unread Glowing Dot */}
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.8)] animate-pulse" />
                        )}

                        {/* Right header actions: Pin & Timestamp */}
                        <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-1">
                          {notif.pinned && (
                            <span title={isVietnamese ? 'Đã ghim' : 'Pinned'}>
                              <Pin className="w-3 h-3 text-amber-500 fill-current rotate-45 shrink-0" />
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {notif.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Title & Preview Content */}
                      <div className="min-w-0 pl-0 sm:pl-8 pr-1 space-y-0.5">
                        <h3 className={`text-xs leading-snug truncate ${
                          notif.read 
                            ? 'font-semibold text-slate-700 dark:text-slate-300' 
                            : 'font-black text-slate-900 dark:text-white'
                        }`}>
                          {notif.title}
                        </h3>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 group-hover:line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Footer Metadata Badges */}
                      <div className="min-w-0 pl-0 sm:pl-8 flex items-center gap-1.5 flex-wrap pt-0.5">
                        {notif.workspaceId && notif.workspaceId !== 'all' && (
                          <span className="text-[9px] bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 truncate max-w-[130px]">
                            {workspaces.find(w => w.id === notif.workspaceId)?.name || (isVietnamese ? 'Không gian' : 'Workspace')}
                          </span>
                        )}

                        {hasTaskLink && (
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckSquare className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                            Task
                          </span>
                        )}

                        {notif.priority === 'urgent' && (
                          <span className="text-[9px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50 font-bold px-1.5 py-0.5 rounded">
                            {isVietnamese ? 'Khẩn cấp' : 'Urgent'}
                          </span>
                        )}
                      </div>

                      {/* On-Hover Quick Floating Action Dock */}
                      <div 
                        className="absolute right-2 bottom-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-md z-20" 
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Pin toggle */}
                        <button 
                          onClick={() => handleTogglePin(notif.id)}
                          className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            notif.pinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                          }`}
                          title={notif.pinned ? (isVietnamese ? "Bỏ ghim" : "Unpin") : (isVietnamese ? "Ghim" : "Pin")}
                        >
                          <Pin className="w-3 h-3 fill-current" />
                        </button>

                        {/* Read toggle */}
                        <button 
                          onClick={() => handleToggleRead(notif.id)}
                          className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={notif.read ? (isVietnamese ? "Đánh dấu chưa đọc" : "Mark as unread") : (isVietnamese ? "Đã đọc" : "Mark as read")}
                        >
                          {notif.read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>

                        {/* Snooze button with popover */}
                        <div className="relative">
                          <button 
                            onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === notif.id ? null : notif.id)}
                            className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                              notif.snoozedUntil ? 'text-blue-600 dark:text-sky-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                            }`}
                            title={isVietnamese ? "Tạm ẩn" : "Snooze"}
                          >
                            <Clock className="w-3 h-3" />
                          </button>

                          {showSnoozeDropdownId === notif.id && (
                            <>
                              <div className="fixed inset-0 z-30 cursor-default" onClick={(e) => { e.stopPropagation(); setShowSnoozeDropdownId(null); }} />
                              <div className="absolute bottom-full right-0 mb-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-40 flex flex-col gap-0.5 text-xs min-w-[130px]">
                                <button onClick={() => handleSnooze(notif.id, 2)} className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold text-left text-slate-700 dark:text-slate-200">
                                  {isVietnamese ? 'Sau 2 giờ' : 'In 2 hours'}
                                </button>
                                <button onClick={() => handleSnooze(notif.id, 24)} className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold text-left text-slate-700 dark:text-slate-200">
                                  {isVietnamese ? 'Ngày mai' : 'Tomorrow'}
                                </button>
                                <button onClick={() => handleSnooze(notif.id, 168)} className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold text-left text-slate-700 dark:text-slate-200">
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
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-sky-300 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={isVietnamese ? "Khôi phục" : "Restore"}
                          >
                            <ArchiveRestore className="w-3 h-3" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleClear(notif.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={isVietnamese ? "Lưu trữ" : "Archive"}
                          >
                            <Check className="w-3 h-3" />
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
              <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-sky-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-xs">
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
          <div className="p-2 bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 backdrop-blur-xl rounded-2xl m-2.5 flex items-center justify-between shadow-2xl border border-white/10 dark:border-black/10 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-1.5">
                {selectedNotifIds.length} {isVietnamese ? 'đã chọn' : 'selected'}
              </span>
              <button 
                onClick={() => setSelectedNotifIds([])}
                className="text-[11px] text-slate-400 hover:text-white dark:hover:text-black underline cursor-pointer"
              >
                {isVietnamese ? 'Bỏ chọn' : 'Deselect'}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleMarkReadSelected}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title={isVietnamese ? 'Đánh dấu đã đọc' : 'Mark as read'}
              >
                <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                <span>{isVietnamese ? 'Đã đọc' : 'Read'}</span>
              </button>
              <button 
                onClick={handleMarkUnreadSelected}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title={isVietnamese ? 'Đánh dấu chưa đọc' : 'Mark as unread'}
              >
                <Mail className="w-3 h-3 text-blue-400 dark:text-blue-600" />
                <span>{isVietnamese ? 'Chưa đọc' : 'Unread'}</span>
              </button>
              <button 
                onClick={handleClearSelected}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                title={isVietnamese ? 'Lưu trữ các mục đã chọn' : 'Archive selected'}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Detail & Productivity Hub ── */}
      <div className={`apexa-inbox-detail flex-1 min-w-0 bg-white dark:bg-slate-900 shadow-none overflow-hidden flex flex-col relative ${
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
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentUser?.name?.charAt(0) || 'C').toUpperCase()}</span>
                )}
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
            {(() => {
              const catMeta = getCategoryMeta(selectedNotif);
              const isBilling = catMeta.key === 'billing';
              const isMention = catMeta.key === 'comment';
              const isDeadline = catMeta.key === 'deadline';
              const IconComp = catMeta.icon;
              const notifWorkspace = workspaces.find(w => w.id === selectedNotif.workspaceId);
              const workspaceName = notifWorkspace?.name || (selectedNotif.workspaceId && selectedNotif.workspaceId !== 'all' ? selectedNotif.workspaceId : (isVietnamese ? 'Costack Cloud' : 'Costack Cloud'));
              const refId = `#PAY-${selectedNotif.id.slice(-6).toUpperCase()}`;

              return (
                <>
                  {/* Top Inspector Header */}
                  <div className="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => setSelectedNotificationId(null)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
                        title={isVietnamese ? "Quay lại tổng quan" : "Back to Overview"}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isVietnamese ? 'Tổng quan' : 'Overview'}</span>
                      </button>

                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shrink-0 ${catMeta.badge}`}>
                          {catMeta.label}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                          {selectedNotif.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Read / Unread toggle */}
                      <button 
                        onClick={() => handleToggleRead(selectedNotif.id)}
                        className={`h-8 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                          selectedNotif.read
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-300 hover:bg-blue-100'
                        }`}
                        title={selectedNotif.read ? (isVietnamese ? "Đánh dấu chưa đọc" : "Mark as unread") : (isVietnamese ? "Đánh dấu đã đọc" : "Mark as read")}
                      >
                        {selectedNotif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="hidden md:inline">{selectedNotif.read ? (isVietnamese ? 'Chưa đọc' : 'Unread') : (isVietnamese ? 'Đã đọc' : 'Read')}</span>
                      </button>

                      {/* Pin button */}
                      <button
                        onClick={() => handleTogglePin(selectedNotif.id)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-2xs ${
                          selectedNotif.pinned
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                        title={selectedNotif.pinned ? (isVietnamese ? "Bỏ ghim" : "Unpin") : (isVietnamese ? "Ghim" : "Pin")}
                      >
                        <Pin className={`w-3.5 h-3.5 ${selectedNotif.pinned ? 'fill-current rotate-45' : ''}`} />
                      </button>

                      {/* Snooze popover */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === `detail-${selectedNotif.id}` ? null : `detail-${selectedNotif.id}`)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                          title={isVietnamese ? "Tạm ẩn" : "Snooze"}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        {showSnoozeDropdownId === `detail-${selectedNotif.id}` && (
                          <>
                            <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowSnoozeDropdownId(null)} />
                            <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-40 flex flex-col gap-1 text-xs min-w-[130px]">
                              <button onClick={() => handleSnooze(selectedNotif.id, 2)} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-left text-slate-800 dark:text-slate-200">
                                {isVietnamese ? '⏰ Sau 2 giờ' : '⏰ In 2 hours'}
                              </button>
                              <button onClick={() => handleSnooze(selectedNotif.id, 24)} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-left text-slate-800 dark:text-slate-200">
                                {isVietnamese ? '☀️ Ngày mai' : '☀️ Tomorrow'}
                              </button>
                              <button onClick={() => handleSnooze(selectedNotif.id, 168)} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-left text-slate-800 dark:text-slate-200">
                                {isVietnamese ? '📅 Tuần tới' : '📅 Next week'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Archive / Restore */}
                      {selectedNotif.cleared ? (
                        <button 
                          onClick={() => handleRestore(selectedNotif.id)}
                          className="h-8 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200 dark:border-blue-800 text-xs font-black cursor-pointer hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-2xs"
                          title={isVietnamese ? "Khôi phục" : "Restore"}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isVietnamese ? 'Khôi phục' : 'Restore'}</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleClear(selectedNotif.id)}
                          className="h-8 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                          title={isVietnamese ? "Lưu trữ" : "Archive"}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                        </button>
                      )}

                      {/* Close button */}
                      <button 
                        onClick={() => setSelectedNotificationId(null)} 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title={isVietnamese ? "Đóng chi tiết" : "Close"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inspector Body: Full-bleed Responsive Multi-Column Canvas */}
                  <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar text-left bg-white dark:bg-slate-950">
                    <div className="w-full max-w-7xl mx-auto">
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        
                        {/* Left / Main Workspace Content (8 cols) */}
                        <div className="xl:col-span-8 space-y-6">
                          
                          {/* Hero Notification Banner */}
                          {isBilling ? (
                            /* Billing Hero Card */
                            <div className="p-6 sm:p-7 bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-emerald-800/60 rounded-3xl space-y-5 shadow-xs">
                              <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 flex items-center justify-center shadow-xs shrink-0">
                                    <CreditCard className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 tracking-wider">
                                        {isVietnamese ? 'Cổng Thanh toán' : 'Billing Gateway'}
                                      </span>
                                      <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {selectedNotif.timestamp}
                                      </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                                      {selectedNotif.title}
                                    </h2>
                                  </div>
                                </div>

                                <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1.5 shrink-0">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                                  <span>{isVietnamese ? 'Cần xử lý' : 'Action Required'}</span>
                                </span>
                              </div>

                              {/* Notification Body Message */}
                              <div className="p-4 sm:p-5 bg-white/95 dark:bg-slate-950/90 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl space-y-3 shadow-2xs">
                                <p className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                                  {selectedNotif.message}
                                </p>
                              </div>

                              {/* Structured Metadata Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-2xs">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {isVietnamese ? 'Mã tham chiếu' : 'Reference ID'}
                                  </span>
                                  <div className="flex items-center justify-between gap-1 mt-1">
                                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{refId}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(refId);
                                        triggerToast?.('success', isVietnamese ? 'Đã sao chép' : 'Copied', refId);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title={isVietnamese ? "Sao chép mã" : "Copy ID"}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-2xs">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {isVietnamese ? 'Cổng giao dịch' : 'Payment Gateway'}
                                  </span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate">
                                    PayOS VietQR / Visa Master
                                  </span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-2xs">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {isVietnamese ? 'Không gian' : 'Workspace'}
                                  </span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate">
                                    {workspaceName}
                                  </span>
                                </div>
                              </div>

                              {/* Action Toolbar */}
                              <div className="flex items-center gap-3 pt-2 flex-wrap">
                                <button
                                  onClick={onUpgradePremium}
                                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  <span>{isVietnamese ? 'Thử lại thanh toán / Nâng cấp gói' : 'Retry Payment / Upgrade Plan'}</span>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${selectedNotif.title}\n${selectedNotif.message}\nID: ${refId}\nWorkspace: ${workspaceName}`);
                                    triggerToast?.('success', isVietnamese ? 'Đã sao chép' : 'Copied', isVietnamese ? 'Đã chép thông tin lỗi vào bộ nhớ đệm.' : 'Copied error info.');
                                  }}
                                  className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{isVietnamese ? 'Sao chép thông tin lỗi' : 'Copy Error Details'}</span>
                                </button>

                                <button
                                  onClick={() => handleClear(selectedNotif.id)}
                                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isVietnamese ? 'Đã giải quyết & Lưu trữ' : 'Mark Resolved'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* General Hero Card for Other Categories */
                            <div className="p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-5 shadow-xs">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3.5">
                                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs shrink-0 ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                                    <IconComp className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${catMeta.badge}`}>
                                        {catMeta.label}
                                      </span>
                                      <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {selectedNotif.timestamp}
                                      </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                                      {selectedNotif.title}
                                    </h2>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${selectedNotif.title}\n\n${selectedNotif.message}`);
                                    triggerToast?.('success', isVietnamese ? 'Đã sao chép' : 'Copied', isVietnamese ? 'Đã chép nội dung thông báo vào bộ nhớ đệm.' : 'Copied to clipboard.');
                                  }}
                                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
                                  title={isVietnamese ? "Sao chép nội dung" : "Copy content"}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                                {selectedNotif.message}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs flex-wrap gap-2">
                                <span className="text-xs text-slate-400 font-medium">
                                  {isVietnamese ? 'Trạng thái: ' : 'Status: '}
                                  <strong className="text-slate-700 dark:text-slate-300">
                                    {selectedNotif.read ? (isVietnamese ? 'Đã đọc' : 'Read') : (isVietnamese ? 'Mới' : 'Unread')}
                                  </strong>
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleRead(selectedNotif.id)}
                                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                                  >
                                    {selectedNotif.read ? (isVietnamese ? 'Đánh dấu chưa đọc' : 'Mark unread') : (isVietnamese ? 'Đánh dấu đã đọc' : 'Mark read')}
                                  </button>
                                  <button
                                    onClick={() => handleClear(selectedNotif.id)}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actionable Troubleshooting Guide (For Billing) */}
                          {isBilling ? (
                            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                  {isVietnamese ? 'Hướng dẫn xử lý sự cố đề xuất' : 'Recommended Troubleshooting Steps'}
                                </h3>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                                    1
                                  </div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    {isVietnamese ? 'Kiểm tra tài khoản' : 'Check Account Balance'}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {isVietnamese ? 'Xác nhận số dư tài khoản ngân hàng hoặc hạn mức tín dụng còn đủ chi trả.' : 'Verify that your bank balance or card credit limit is sufficient.'}
                                  </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                                    2
                                  </div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    {isVietnamese ? 'Quét lại VietQR / Thẻ' : 'Retry via VietQR / Card'}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {isVietnamese ? 'Nhấn nút "Thử lại thanh toán" để nhận mã VietQR mới hoặc đổi phương thức khác.' : 'Click "Retry Payment" to generate a fresh QR code or switch method.'}
                                  </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                                    3
                                  </div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    {isVietnamese ? 'Liên hệ hỗ trợ' : 'Contact Support'}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {isVietnamese ? 'Nếu đã trừ tiền, hãy sao chép mã tham chiếu và gửi bộ phận chăm sóc khách hàng.' : 'If debited, copy the reference ID and message support for manual activation.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {/* Mention / Discussion Specific Interactive Quick Reply */}
                          {isMention && (
                            <div className="p-5 sm:p-6 rounded-3xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/50 space-y-4 shadow-xs">
                              <div className="flex items-center justify-between gap-3">
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
                            </div>
                          )}

                          {/* Deadline Specific Quick Navigation */}
                          {isDeadline && (
                            <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <Flame className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                  {isVietnamese ? 'Hạn chót công việc đang đến gần. Vui lòng kiểm tra tiến độ.' : 'Deadline is approaching. Please review and update task status.'}
                                </span>
                              </div>
                              <button
                                onClick={() => onNavigateToTab?.('tasks')}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <span>{isVietnamese ? 'Xem công việc' : 'View Tasks'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                        </div>

                        {/* Right Sidebar: Context & Metadata & Shortcuts (4 cols) */}
                        <div className="xl:col-span-4 space-y-5">
                          
                          {/* Card 1: Context & Source Info */}
                          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                {isVietnamese ? 'Ngữ cảnh thông báo' : 'Context & Metadata'}
                              </h3>
                            </div>

                            <div className="space-y-2.5 text-xs">
                              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                                <span className="text-slate-400 font-semibold">{isVietnamese ? 'Không gian' : 'Workspace'}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-slate-400" />
                                  {workspaceName}
                                </span>
                              </div>

                              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                                <span className="text-slate-400 font-semibold">{isVietnamese ? 'Phân loại' : 'Category'}</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${catMeta.badge}`}>
                                  {catMeta.label}
                                </span>
                              </div>

                              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                                <span className="text-slate-400 font-semibold">{isVietnamese ? 'Thời gian nhận' : 'Received At'}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedNotif.timestamp}</span>
                              </div>

                              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                                <span className="text-slate-400 font-semibold">{isVietnamese ? 'Trạng thái' : 'Status'}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  selectedNotif.read 
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                                    : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300'
                                }`}>
                                  {selectedNotif.read ? (isVietnamese ? 'Đã đọc' : 'Read') : (isVietnamese ? 'Chưa đọc' : 'Unread')}
                                </span>
                              </div>

                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-slate-400 font-semibold">{isVietnamese ? 'Ghim ưu tiên' : 'Pinned'}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {selectedNotif.pinned ? (isVietnamese ? '⭐ Đã ghim' : '⭐ Pinned') : (isVietnamese ? 'Chưa' : 'No')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Quick Actions Panel */}
                          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-3.5 shadow-xs">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                              {isVietnamese ? 'Thao tác nhanh' : 'Quick Actions'}
                            </h3>

                            <div className="space-y-2">
                              <button
                                onClick={() => handleToggleRead(selectedNotif.id)}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-all cursor-pointer"
                              >
                                <span className="flex items-center gap-2">
                                  {selectedNotif.read ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-blue-500" />}
                                  <span>{selectedNotif.read ? (isVietnamese ? 'Đánh dấu chưa đọc' : 'Mark as unread') : (isVietnamese ? 'Đánh dấu đã đọc' : 'Mark as read')}</span>
                                </span>
                                <kbd className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">R</kbd>
                              </button>

                              <button
                                onClick={() => handleTogglePin(selectedNotif.id)}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-all cursor-pointer"
                              >
                                <span className="flex items-center gap-2">
                                  <Pin className={`w-3.5 h-3.5 ${selectedNotif.pinned ? 'text-amber-500 fill-current' : 'text-slate-400'}`} />
                                  <span>{selectedNotif.pinned ? (isVietnamese ? 'Bỏ ghim thông báo' : 'Unpin notification') : (isVietnamese ? 'Ghim lên đầu' : 'Pin to top')}</span>
                                </span>
                              </button>

                              <button
                                onClick={() => handleClear(selectedNotif.id)}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-all cursor-pointer"
                              >
                                <span className="flex items-center gap-2">
                                  <Archive className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{isVietnamese ? 'Lưu trữ thông báo' : 'Archive notification'}</span>
                                </span>
                                <kbd className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">E</kbd>
                              </button>
                            </div>
                          </div>

                          {/* Card 3: Keyboard Shortcuts Guide */}
                          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/70 rounded-3xl space-y-2.5 text-xs">
                            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
                              {isVietnamese ? 'Phím tắt bàn phím' : 'Keyboard Shortcuts'}
                            </span>
                            <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <div className="flex items-center justify-between">
                                <span>{isVietnamese ? 'Di chuyển lên/xuống' : 'Navigate up/down'}</span>
                                <div className="flex gap-1">
                                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">J</kbd>
                                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">K</kbd>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>{isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">E</kbd>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>{isVietnamese ? 'Đã đọc / Chưa đọc' : 'Toggle read'}</span>
                                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">R</kbd>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>{isVietnamese ? 'Đóng chi tiết' : 'Close details'}</span>
                                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">Esc</kbd>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          /* ── Case 3: Clean Notification Overview ── */
          <div className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-7 overflow-y-auto text-center space-y-5 custom-scrollbar">
            
            {/* Central Inbox Status */}
            {inboxStats.unread > 0 ? (
              <div className="flex flex-col items-center gap-4 max-w-sm">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-xs">
                  <Bell className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {inboxStats.unread} {isVietnamese ? 'thông báo chưa đọc' : 'unread notifications'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {isVietnamese 
                      ? 'Chọn một thông báo bên trái để xem chi tiết, hoặc dùng phím J/K để di chuyển nhanh.' 
                      : 'Select a notification on the left to view details, or use J/K keys to navigate quickly.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Đánh dấu tất cả đã đọc' : 'Mark all read'}</span>
                  </button>
                  {olderReadNotifications.length > 0 && (
                    <button
                      onClick={handleTriageOlderRead}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Dọn dẹp' : 'Clean up'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 max-w-sm">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {isVietnamese ? 'Hộp thư gọn gàng!' : 'Inbox Zero!'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {isVietnamese 
                      ? 'Tuyệt vời! Không còn thông báo nào cần xử lý.' 
                      : 'All caught up! No notifications requiring attention.'}
                  </p>
                </div>
              </div>
            )}

            {/* Inbox Health Triage - only show when there are read items to clean */}
            {olderReadNotifications.length > 0 && inboxStats.unread === 0 && (
              <div className="w-full max-w-md p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <Sparkles className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-blue-800 dark:text-sky-300">
                    {isVietnamese 
                      ? `${olderReadNotifications.length} thông báo đã đọc có thể lưu trữ` 
                      : `${olderReadNotifications.length} read notifications can be archived`}
                  </span>
                </div>
                <button
                  onClick={handleTriageOlderRead}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Dọn dẹp' : 'Clean up'}</span>
                </button>
              </div>
            )}

            {/* Keyboard Shortcuts - Compact */}
            <div className="w-full max-w-lg p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
              <div className="flex items-center justify-center text-[10.5px] font-bold text-slate-500 dark:text-slate-400 flex-wrap gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">J</kbd><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">K</kbd> {isVietnamese ? 'Lên/Xuống' : 'Navigate'}</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">E</kbd> {isVietnamese ? 'Lưu trữ' : 'Archive'}</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">R</kbd> {isVietnamese ? 'Đã đọc' : 'Read'}</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">S</kbd> {isVietnamese ? 'Tạm ẩn' : 'Snooze'}</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">/</kbd> {isVietnamese ? 'Tìm' : 'Search'}</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono">Esc</kbd> {isVietnamese ? 'Đóng' : 'Close'}</span>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
