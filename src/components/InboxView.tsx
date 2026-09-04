"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Bell, Check, Trash2, Eye, EyeOff, Pin, Archive, Clock, Search, 
  ArrowRight, Inbox, HelpCircle, ArchiveRestore, Sparkles, Filter, CheckSquare,
  Bookmark, MailOpen, User as UserIcon, Send, MessageSquare,
  ChevronRight, Calendar, AlertTriangle, X, CheckCheck,
  Tag, Paperclip, CornerDownRight, ExternalLink, Command, ShieldCheck, Flame,
  TrendingUp, Target, Plus, CheckCircle2, RefreshCw, Zap, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, User, Workspace, WorkspaceInvitation } from '../types';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';
import SignedImage from './SignedImage';
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
  const { isVietnamese, locale } = useTranslation();
  // Tabs: 'all' | 'important' | 'other' | 'saved' | 'cleared'
  const [activeTab, setActiveTab] = useState<'all' | 'important' | 'other' | 'saved' | 'cleared'>('all');
  const [workspaceScope, setWorkspaceScope] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'unread' | 'assigned' | 'comments' | 'deadlines'>('all');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [showSnoozeDropdownId, setShowSnoozeDropdownId] = useState<string | null>(null);
  
  // Bulk Selection
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);

  // Inline Quick Reply input
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Local states for TaskDetailsPanel
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  // AI Daily Digest in Right Pane
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

    const otherItems = active.filter(n => !importantItems.some(item => item.id === n.id));

    const importantUnread = importantItems.filter(n => !n.read).length + workspaceInvitations.length;
    const otherUnread = otherItems.filter(n => !n.read).length;
    const totalUnread = active.filter(n => !n.read).length + workspaceInvitations.length;

    return {
      all: active.length + workspaceInvitations.length,
      allUnread: totalUnread,
      total: active.length + workspaceInvitations.length,
      unread: totalUnread,
      important: importantItems.length + workspaceInvitations.length,
      importantUnread,
      other: otherItems.length,
      otherUnread,
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

  // Productivity Metrics for the Empty Right Panel
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
      if (quickFilter === 'unread' && n.read) return false;
      if (quickFilter === 'assigned' && n.type !== 'assignment') {
        const taskId = getAssociatedTaskId(n);
        const task = tasks.find(t => t.id === taskId);
        const isAssigned = task?.assigneeId === currentUser?.id || task?.assigneeIds?.includes(currentUser?.id);
        if (!isAssigned) return false;
      }
      if (quickFilter === 'comments' && n.type !== 'comment' && !n.title?.includes('@') && !n.message?.includes('@')) return false;
      if (quickFilter === 'deadlines' && n.type !== 'deadline') return false;

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

      // All Tab
      if (activeTab === 'all') {
        return true;
      }

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
  }, [notificationsList, activeTab, searchQuery, quickFilter, tasks, currentUser, getAssociatedTaskId, activeWorkspaceId, workspaceScope]);


  // Group notifications into Date categories: Today, Yesterday, Older
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
    triggerToast?.('success', 'Đã lưu trữ', 'Thông báo đã được chuyển vào mục Lưu trữ.');
  }, [selectedNotificationId, setNotificationsList, triggerToast]);

  const handleRestore = (id: string) => {
    setNotificationsList(prev => prev.map(n => 
      n.id === id ? { ...n, cleared: false } : n
    ));
    triggerToast?.('success', 'Đã khôi phục', 'Thông báo đã trở lại hộp thư chính.');
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
    triggerToast?.('info', 'Đã tạm ẩn ⏰', `Tạm ẩn thông báo trong ${durationHours} giờ.`);
  }, [selectedNotificationId, setNotificationsList, triggerToast]);

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentScope = workspaceScope === 'all' || !n.workspaceId || n.workspaceId === activeWorkspaceId || n.workspaceId === 'all';
      if (!isInCurrentScope || n.cleared) return n;
      return { ...n, read: true };
    }));
    triggerToast?.('success', 'Hoàn tất', 'Tất cả thông báo đã được đánh dấu đã đọc.');
  };

  const handleClearAllVisible = () => {
    setNotificationsList(prev => prev.map(n => {
      const isInCurrentTab = filteredNotifications.some(fn => fn.id === n.id);
      return isInCurrentTab ? { ...n, cleared: true } : n;
    }));
    setSelectedNotificationId(null);
    triggerToast?.('success', 'Dọn sạch hộp thư', 'Các thông báo hiển thị đã chuyển vào lưu trữ.');
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
    triggerToast?.('success', 'Đã lưu trữ', 'Các thông báo đã chọn đã được chuyển vào lưu trữ.');
  };

  const handleMarkReadSelected = () => {
    setNotificationsList(prev => prev.map(n => 
      selectedNotifIds.includes(n.id) ? { ...n, read: true } : n
    ));
    setSelectedNotifIds([]);
    triggerToast?.('success', 'Đã đọc', 'Đã đánh dấu đã đọc các mục đã chọn.');
  };

  // Quick Reply handler right from detail pane
  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTask) return;

    setIsSendingReply(true);

    const newComment = {
      id: `comm-${Date.now()}`,
      senderName: currentUser?.name || 'Bạn',
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
    onAddSyncLog(`Bình luận trên "${selectedTask.title}" từ Hộp thư`);
    triggerToast?.('success', 'Đã gửi phản hồi 🚀', 'Bình luận của bạn đã được đăng lên công việc.');

    setReplyText('');
    setIsSendingReply(false);
  };

  // Generate AI Daily Briefing for Inbox
  const handleGenerateAiDigest = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium();
      return;
    }
    setAiDigestLoading(true);
    try {
      const activeUnread = notificationsList.filter(n => !n.cleared && !n.read).slice(0, 10);
      const res = await callAiApi('/api/ai/inbox-digest', {
        userName: currentUser?.name || 'Thành viên Apexa',
        notifications: activeUnread,
        tasksCount: tasks.length
      });
      const data = await res.json();
      if (data.success && data.digest) {
        setAiDigestText(data.digest);
        triggerToast?.('success', 'AI Daily Digest ✨', 'Đã tổng hợp tóm tắt thông minh cho hôm nay.');
      } else {
        // Fallback friendly summary
        setAiDigestText(`Chào ${currentUser?.name || 'bạn'}! Hôm nay bạn có ${inboxStats.important} thông báo quan trọng và ${productivityStats.totalAssigned} công việc được giao cần xử lý. Tỉ lệ hoàn thành hiện tại đạt ${productivityStats.completionRate}%. Hãy ưu tiên các đầu việc có mức khẩn cấp cao!`);
      }
    } catch (error) {
      if (isAiAccessError(error)) return;
      setAiDigestText(`Chào ${currentUser?.name || 'bạn'}! Bạn đang có ${inboxStats.unread} thông báo chưa đọc trong Hộp thư Apexa. Hãy kiểm tra các thông báo được giao và cập nhật tiến độ công việc để duy trì hiệu suất cao nhất.`);
    } finally {
      setAiDigestLoading(false);
    }
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
    triggerToast?.('success', 'Tải tệp đính kèm', `Đã đính kèm ${file.name}`);
  };

  const handleAttachmentDelete = async (task: Task, att: any) => {
    const attachmentId = typeof att === 'string' ? att : att.id;
    const updatedTask = {
      ...task,
      attachments: (task.attachments || []).filter(a => a.id !== attachmentId)
    };
    onUpdateTask(updatedTask);
    triggerToast?.('success', 'Đã xóa tệp đính kèm', 'Đã xóa tệp thành công.');
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
        onAddSyncLog(`AI đề xuất ${gen.length} nhiệm vụ phụ cho "${task.title}"`);
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
      const res = await callAiApi('/api/ai/task-summarize', { task, assigneeName: assignee?.name || 'Chưa giao' });
      const data = await res.json();
      if (data.success && data.text) {
        setAiSummary(data.text);
        localStorage.setItem(`apexa_task_ai_summary_${task.id}`, data.text);
        onAddSyncLog(`AI tóm tắt cho "${task.title}"`);
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

  // Modern tabs list
  const TABS_CONFIG = [
    { id: 'all', label: isVietnamese ? 'Tất cả' : 'All', count: inboxStats.all, unread: inboxStats.allUnread, icon: Inbox },
    { id: 'important', label: isVietnamese ? 'Quan trọng' : 'Important', count: inboxStats.important, unread: inboxStats.importantUnread, icon: Flame },
    { id: 'other', label: isVietnamese ? 'Khác' : 'Other', count: inboxStats.other, unread: inboxStats.otherUnread, icon: Bell },
    { id: 'saved', label: isVietnamese ? 'Đã lưu' : 'Saved', count: inboxStats.saved, unread: 0, icon: Bookmark },
    { id: 'cleared', label: isVietnamese ? 'Lưu trữ' : 'Archived', count: inboxStats.cleared, unread: 0, icon: Archive },
  ];

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-3 font-sans text-left text-slate-800 dark:text-slate-100 select-none overflow-hidden p-1 sm:p-2">
      
      {/* ── Left Column: Stream Panel ── */}
      <div className={`flex flex-col min-w-0 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all ${
        selectedNotificationId 
          ? 'hidden md:flex md:w-[350px] lg:w-[390px] xl:w-[420px] shrink-0' 
          : 'flex-1 md:flex-initial md:w-[380px] lg:w-[420px] xl:w-[460px] shrink-0'
      }`}>
        
        {/* Sleek Top Header & Scope */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-2.5 shrink-0 bg-white/60 dark:bg-[#121212]/60 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <Inbox className="w-4 h-4 drop-shadow-xs" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {isVietnamese ? 'Hộp thư' : 'Inbox'}
                  </h1>
                  {inboxStats.unread > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9.5px] font-black shrink-0">
                      {inboxStats.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setWorkspaceScope(prev => prev === 'current' ? 'all' : 'current')}
                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isVietnamese ? 'Phạm vi thông báo' : 'Scope'}
              >
                {workspaceScope === 'current' ? (isVietnamese ? 'Space này' : 'Current') : (isVietnamese ? 'Tất cả Space' : 'All Spaces')}
              </button>

              <button 
                onClick={handleMarkAllRead}
                disabled={inboxStats.unread === 0 && filteredNotifications.length === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 cursor-pointer disabled:opacity-35 transition-all"
                title={isVietnamese ? 'Đánh dấu tất cả đã đọc' : 'Mark all as read'}
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              </button>
              
              <button 
                onClick={handleClearAllVisible}
                disabled={filteredNotifications.length === 0}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer disabled:opacity-35 transition-all"
                title={isVietnamese ? 'Lưu trữ tất cả' : 'Archive all'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compact Sliding Category Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-x-auto scrollbar-none">
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
                  className={`flex-1 min-w-[54px] py-1 px-1.5 rounded-xl transition-all cursor-pointer relative flex items-center justify-center gap-1 text-center shrink-0 ${
                    isTabActive
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-300 shadow-xs font-black border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold hover:bg-white/40 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <tab.icon className={`w-3 h-3 shrink-0 ${isTabActive ? 'text-blue-600 dark:text-sky-300' : 'text-slate-400'}`} />
                  <span className="text-[10.5px] truncate">{tab.label}</span>
                  <span className={`text-[9.5px] px-1 rounded-full ${isTabActive ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300 font-black' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                  {hasUnread && !isTabActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Slim Search Input */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder={isVietnamese ? "Tìm thông báo, công việc..." : "Search notifications, tasks..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
            )}
          </div>

          {/* Micro Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
            {[
              { id: 'all', label: isVietnamese ? 'Tất cả' : 'All' },
              { id: 'unread', label: isVietnamese ? 'Chưa đọc' : 'Unread' },
              { id: 'assigned', label: isVietnamese ? 'Được giao' : 'Assigned' },
              { id: 'comments', label: isVietnamese ? 'Nhắc đến (@)' : 'Mentions' },
              { id: 'deadlines', label: isVietnamese ? 'Hạn chót' : 'Deadlines' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setQuickFilter(f.id as any)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all cursor-pointer ${
                  quickFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stream Content */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3 custom-scrollbar min-h-0">
          
          {/* Workspace Invitations */}
          {workspaceInvitations.length > 0 && (activeTab === 'important' || activeTab === 'all') && (
            <div className="space-y-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-sky-300 tracking-wider">
                  Lời mời tham gia ({workspaceInvitations.length})
                </span>
              </div>
              {workspaceInvitations.map(inv => (
                <div 
                  key={inv.id} 
                  className={`p-3 bg-gradient-to-r from-blue-50/80 via-sky-50/40 to-slate-50 dark:from-blue-950/30 dark:via-sky-950/20 dark:to-slate-900/30 border rounded-2xl flex flex-col gap-2 shadow-xs ${inv.token && inv.token === highlightedInviteToken ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-200/70 dark:border-blue-800/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {inv.workspaceName || 'Không gian mới'}
                        </h3>
                        <span className="px-1.5 py-0.2 text-[8.5px] font-black uppercase rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                        <strong>{inv.invitedByName || inv.invitedBy || 'Quản trị viên'}</strong> mời bạn tham gia không gian.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-end pt-1 border-t border-blue-100/50 dark:border-blue-900/30">
                    <button 
                      disabled={processingInviteId === inv.id}
                      onClick={async () => {
                        setProcessingInviteId(inv.id);
                        try { await onDeclineInvite?.(inv.id); } finally { setProcessingInviteId(null); }
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Từ chối</span>
                    </button>
                    <button 
                      disabled={processingInviteId === inv.id}
                      onClick={async () => {
                        setProcessingInviteId(inv.id);
                        try { await onAcceptInvite?.(inv.id, inv.workspaceId, inv.role); } finally { setProcessingInviteId(null); }
                      }}
                      className="px-3 py-1 text-[11px] font-black rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all shadow-xs flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>{processingInviteId === inv.id ? 'Đang vào…' : 'Chấp nhận'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grouped Notifications */}
          {groupedNotifications.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9.5px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="space-y-1.5">
                {group.items.map(notif => {
                  const hasTaskLink = !!getAssociatedTaskId(notif);
                  const isSelected = selectedNotificationId === notif.id;
                  const isChecked = selectedNotifIds.includes(notif.id);

                  const isComment = notif.type === 'comment';
                  const isAssignment = notif.type === 'assignment';
                  const isDeadline = notif.type === 'deadline';

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => setSelectedNotificationId(notif.id)}
                      className={`group p-2 sm:p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-600/15 border-blue-400/80 dark:border-blue-500/60 ring-2 ring-blue-500/20 shadow-xs'
                          : notif.read 
                            ? 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700' 
                            : 'bg-white dark:bg-slate-900 border-blue-200/70 dark:border-blue-900/60 shadow-3xs hover:border-blue-400 dark:hover:border-blue-600'
                      }`}
                    >
                      {/* Pin indicator */}
                      {notif.pinned && (
                        <div className="absolute top-2 right-2 text-amber-500">
                          <Pin className="w-3 h-3 fill-current rotate-45" />
                        </div>
                      )}

                      {/* Checkbox & Visual Icon */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleSelectNotif(notif.id, e as any)}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${notif.read ? 'opacity-0' : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)] animate-pulse'}`} />
                        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${
                          isAssignment ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border-blue-200/80 dark:border-blue-800/60' :
                          isComment ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60' :
                          isDeadline ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60' :
                          'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60'
                        }`}>
                          {isAssignment ? <UserIcon className="w-3.5 h-3.5" /> :
                           isComment ? <MessageSquare className="w-3.5 h-3.5" /> :
                           isDeadline ? <Clock className="w-3.5 h-3.5" /> :
                           <Bell className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className={`text-xs truncate ${notif.read ? 'font-bold text-slate-700 dark:text-slate-300' : 'font-black text-slate-900 dark:text-white'}`}>
                          {notif.title}
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold">{notif.timestamp}</span>
                          {notif.workspaceId && notif.workspaceId !== 'all' && (
                            <span className="text-[8.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-1 py-0.2 rounded">
                              {workspaces.find(w => w.id === notif.workspaceId)?.name || 'Không gian'}
                            </span>
                          )}
                          {hasTaskLink && (
                            <span className="text-[8.5px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 font-black px-1.5 py-0.2 rounded tracking-wider uppercase flex items-center gap-0.5">
                              <CheckSquare className="w-2.5 h-2.5 text-blue-600 dark:text-sky-400" />
                              Task
                            </span>
                          )}
                        </div>
                      </div>

                      {/* On-Hover Action Toolbar */}
                      <div className="absolute right-2 bottom-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-md z-20" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleTogglePin(notif.id)}
                          className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${notif.pinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                          title={notif.pinned ? "Bỏ ghim" : "Ghim"}
                        >
                          <Pin className="w-3 h-3 fill-current" />
                        </button>

                        <button 
                          onClick={() => handleToggleRead(notif.id)}
                          className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={notif.read ? "Đánh dấu chưa đọc" : "Đã đọc"}
                        >
                          {notif.read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>

                        <div className="relative">
                          <button 
                            onClick={() => setShowSnoozeDropdownId(showSnoozeDropdownId === notif.id ? null : notif.id)}
                            className={`p-1 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${notif.snoozedUntil ? 'text-blue-600 dark:text-sky-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            title="Tạm ẩn"
                          >
                            <Clock className="w-3 h-3" />
                          </button>

                          {showSnoozeDropdownId === notif.id && (
                            <>
                              <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setShowSnoozeDropdownId(null); }} />
                              <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-30 flex flex-col gap-0.5 text-[11px] min-w-[100px]">
                                <button onClick={() => handleSnooze(notif.id, 2)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-bold text-left text-slate-800 dark:text-slate-200">2 giờ</button>
                                <button onClick={() => handleSnooze(notif.id, 24)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-bold text-left text-slate-800 dark:text-slate-200">Ngày mai</button>
                                <button onClick={() => handleSnooze(notif.id, 168)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-bold text-left text-slate-800 dark:text-slate-200">Tuần tới</button>
                              </div>
                            </>
                          )}
                        </div>

                        {activeTab === 'cleared' ? (
                          <button 
                            onClick={() => handleRestore(notif.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-sky-300 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Khôi phục"
                          >
                            <ArchiveRestore className="w-3 h-3" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleClear(notif.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Lưu trữ"
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

          {/* Compact Modern Empty State */}
          {filteredNotifications.length === 0 && workspaceInvitations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 select-none">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="max-w-xs space-y-1">
                <h3 className="text-xs font-black text-slate-900 dark:text-white">Hộp thư gọn gàng!</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Không còn thông báo nào cần xử lý trong mục này.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedNotifIds.length > 0 && (
          <div className="p-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl m-2.5 flex items-center justify-between shadow-xl">
            <span className="text-[11px] font-black px-2">{selectedNotifIds.length} đã chọn</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleMarkReadSelected}
                className="px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
              >
                Đã đọc
              </button>
              <button 
                onClick={handleClearSelected}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3 h-3" />
                Lưu trữ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Detail / Productivity Hub (Responsive) ── */}
      <div className={`flex-1 min-w-0 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col justify-between relative ${
        selectedNotificationId ? 'flex' : 'hidden md:flex'
      }`}>
        
        {selectedTask ? (
          <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Split Screen Header with Mobile Back Button */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSelectedNotificationId(null)}
                  className="md:hidden p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  {selectedTask.title}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedNotif && !selectedNotif.cleared && (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-black hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Lưu trữ</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedNotificationId(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Details Component */}
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

            {/* Inline Quick Reply */}
            <form onSubmit={handleSendQuickReply} className="p-3 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 shrink-0 flex items-center gap-2">
              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={isVietnamese ? `Phản hồi nhanh vào "${selectedTask.title}"...` : `Quick reply to "${selectedTask.title}"...`}
                className="flex-1 text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <button 
                type="submit"
                disabled={!replyText.trim() || isSendingReply}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        ) : selectedNotif ? (
          /* General Notification Details */
          <div className="w-full h-full flex flex-col min-h-0 relative">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedNotificationId(null)}
                  className="md:hidden p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                  Chi tiết thông báo
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedNotif.cleared ? (
                  <button 
                    onClick={() => handleRestore(selectedNotif.id)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-black cursor-pointer"
                  >
                    Khôi phục
                  </button>
                ) : (
                  <button 
                    onClick={() => handleClear(selectedNotif.id)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-black cursor-pointer"
                  >
                    Lưu trữ
                  </button>
                )}
                <button onClick={() => setSelectedNotificationId(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-y-auto text-left">
              <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 border border-blue-200/80 dark:border-blue-800/60">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {selectedNotif.title}
                    </h2>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
                      {selectedNotif.timestamp}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                  {selectedNotif.message}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Redesigned Sleek Productivity & Focus Hub */
          <div className="w-full h-full flex flex-col p-4 sm:p-6 overflow-y-auto justify-between text-left space-y-4">
            <div className="space-y-4">
              
              {/* Compact Sleek Greeting Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-blue-700/90 text-white shadow-md relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="relative z-10 space-y-1.5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[9.5px] font-black tracking-wide uppercase border border-white/20">
                    <Zap className="w-2.5 h-2.5 text-amber-300" />
                    Trung tâm hiệu suất
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    Chào {currentUser?.name || 'bạn'}! Hôm nay mọi thứ đã sẵn sàng.
                  </h2>
                  <p className="text-[11.5px] text-blue-100 max-w-lg font-medium leading-relaxed">
                    Bạn có <strong className="text-white font-black">{productivityStats.totalAssigned}</strong> công việc được giao ({productivityStats.urgent} việc khẩn cấp) với tỷ lệ hoàn thành đạt <strong className="text-white font-black">{productivityStats.completionRate}%</strong>.
                  </p>
                </div>
              </div>

              {/* 3 Interactive Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div 
                  onClick={() => setQuickFilter('assigned')}
                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-3xs cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10.5px] font-bold group-hover:text-blue-600 transition-colors">Được giao</span>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {productivityStats.totalAssigned}
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-semibold truncate">Đầu việc cần xử lý</p>
                </div>

                <div 
                  onClick={() => setQuickFilter('deadlines')}
                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-3xs cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10.5px] font-bold group-hover:text-amber-600 transition-colors">Khẩn cấp</span>
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {productivityStats.urgent}
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-semibold truncate">Ưu tiên cao nhất</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-3xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10.5px] font-bold">Hoàn thành</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {productivityStats.completionRate}%
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-semibold truncate">{productivityStats.completed} việc đã xong</p>
                </div>
              </div>

              {/* AI Daily Briefing */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 via-sky-50/30 to-slate-50 dark:from-blue-950/20 dark:via-sky-950/15 dark:to-slate-900/30 border border-blue-200/60 dark:border-blue-800/50 space-y-2.5 shadow-3xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ApexaAiIcon className="w-4 h-4" variant="gradient" animated={aiDigestLoading} />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">Apexa AI Daily Briefing</h3>
                  </div>
                  <button
                    onClick={handleGenerateAiDigest}
                    disabled={aiDigestLoading}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {aiDigestLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ApexaAiIcon className="w-3 h-3" variant="white" />}
                    <span>{aiDigestLoading ? 'Đang tóm tắt…' : 'Tạo tóm tắt AI'}</span>
                  </button>
                </div>
                {aiDigestText ? (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200/50 dark:border-blue-800/40 text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                    {aiDigestText}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Nhấn nút trên để AI quét toàn bộ công việc, thảo luận và tiến độ dự án để tạo báo cáo tổng hợp nhanh cho bạn.
                  </p>
                )}
              </div>
            </div>

            {/* Sleek Action Shortcuts */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[9.5px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-2">
                Lối tắt nhanh
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => onNavigateToTab?.('tasks')}
                  className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>Công việc</span>
                </button>
                <button
                  onClick={() => onNavigateToTab?.('calendar')}
                  className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />
                  <span>Lịch tuần</span>
                </button>
                <button
                  onClick={() => onNavigateToTab?.('chat')}
                  className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-500 group-hover:scale-110 transition-transform" />
                  <span>Trò chuyện</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
