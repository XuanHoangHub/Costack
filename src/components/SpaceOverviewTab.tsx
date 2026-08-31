"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  Gauge,
  Layers,
  Link2,
  List,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Zap,
  Lock
} from 'lucide-react';
import { Task, TaskStatus, User, Space, SpaceBookmark } from '../types';
import { useTranslation } from '../contexts/TranslationContext';
import EmojiIconPicker, { renderSpaceIcon } from './EmojiIconPicker';
import SignedImage from './SignedImage';
import { presenceDotClass } from '../lib/presence';
import { callAiApi, isAiAccessError } from '../lib/aiClient';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

interface SpaceOverviewTabProps {
  space: Space;
  tasks: Task[];
  members: User[];
  docs?: any[];
  onOpenList: (listId: string) => void;
  onAddList: () => void;
  onAddTask: (taskObj: any) => void;
  triggerToast?: (type: string, title: string, message: string) => void;
  onAddFolder?: () => void;
  onAddDoc?: () => void;
  onOpenDoc?: (docId: string) => void;
  activeFolderId?: string | null;
  onUpdateSpaceEmoji?: (emoji: string) => void;
  onUpdateBookmarks?: (bookmarks: SpaceBookmark[]) => void;
}

const THEME_COLORS: Record<
  string,
  {
    accent: string;
    soft: string;
    tint: string;
    text: string;
    gradient: string;
    glow: string;
    border: string;
  }
> = {
  indigo: {
    accent: '#6366f1',
    soft: 'rgba(99, 102, 241, 0.12)',
    tint: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-600 dark:text-indigo-400',
    gradient: 'from-blue-600 via-sky-500 to-cyan-400',
    glow: 'rgba(99, 102, 241, 0.25)',
    border: 'border-indigo-500/20'
  },
  rose: {
    accent: '#f43f5e',
    soft: 'rgba(244, 63, 94, 0.12)',
    tint: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-rose-600 via-pink-600 to-rose-700',
    glow: 'rgba(244, 63, 94, 0.25)',
    border: 'border-rose-500/20'
  },
  sky: {
    accent: '#0ea5e9',
    soft: 'rgba(14, 165, 233, 0.12)',
    tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    gradient: 'from-sky-600 via-cyan-600 to-teal-500',
    glow: 'rgba(14, 165, 233, 0.25)',
    border: 'border-sky-500/20'
  },
  emerald: {
    accent: '#10b981',
    soft: 'rgba(16, 185, 129, 0.12)',
    tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    glow: 'rgba(16, 185, 129, 0.25)',
    border: 'border-emerald-500/20'
  },
  amber: {
    accent: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.12)',
    tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    glow: 'rgba(245, 158, 11, 0.25)',
    border: 'border-amber-500/20'
  },
  sunset: {
    accent: '#ea580c',
    soft: 'rgba(234, 88, 12, 0.12)',
    tint: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
    gradient: 'from-orange-600 via-amber-600 to-rose-600',
    glow: 'rgba(234, 88, 12, 0.25)',
    border: 'border-orange-500/20'
  }
};

const STATUS_META: Record<
  TaskStatus,
  { labelVi: string; labelEn: string; color: string; bg: string; border: string }
> = {
  todo: {
    labelVi: 'Cần làm',
    labelEn: 'To do',
    color: '#64748b',
    bg: 'bg-slate-500',
    border: 'border-slate-500/20'
  },
  inprogress: {
    labelVi: 'Đang làm',
    labelEn: 'In progress',
    color: '#f59e0b',
    bg: 'bg-amber-500',
    border: 'border-amber-500/20'
  },
  review: {
    labelVi: 'Duyệt',
    labelEn: 'Review',
    color: '#3b82f6',
    bg: 'bg-blue-500',
    border: 'border-blue-500/20'
  },
  completed: {
    labelVi: 'Hoàn tất',
    labelEn: 'Done',
    color: '#10b981',
    bg: 'bg-emerald-500',
    border: 'border-emerald-500/20'
  }
};

function formatShortDate(dateStr?: string, locale = 'vi') {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: 'short' });
}

function formatRelativeTime(dateStr: string, locale = 'vi') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return locale === 'vi' ? 'Vừa xong' : 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return locale === 'vi' ? 'Vừa xong' : 'Just now';
  if (diffMin < 60) return locale === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
  if (diffHours < 24) return locale === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
  if (diffDays < 7) return locale === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
  return formatShortDate(dateStr, locale);
}

// ── Custom Glassmorphism Circular Ring ──
function ProgressGauge({ percent, color, size = 110, strokeWidth = 9 }: { percent: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white font-sans">{percent}%</span>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">DONE</span>
      </div>
    </div>
  );
}

export default function SpaceOverviewTab({
  space,
  tasks,
  members,
  docs = [],
  onOpenList,
  onAddList,
  onAddTask,
  triggerToast,
  onAddFolder,
  onAddDoc,
  onOpenDoc,
  activeFolderId = null,
  onUpdateSpaceEmoji,
  onUpdateBookmarks
}: SpaceOverviewTabProps) {
  const { locale } = useTranslation();
  const isPremium = useAuthStore(state => Boolean(state.currentUser?.isPremium));
  const setShowPremiumModal = useUiStore(state => state.setShowPremiumModal);
  const [bookmarks, setBookmarks] = useState<SpaceBookmark[]>([]);
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskListId, setQuickTaskListId] = useState<string | null>(null);

  const theme = THEME_COLORS[space.themeColor || 'indigo'] || THEME_COLORS.indigo;
  const bookmarkKey = activeFolderId ? `apexa_bookmarks_folder_${activeFolderId}` : `apexa_bookmarks_${space.id}`;

  useEffect(() => {
    const preferences = space.clickApps?.spacePreferences;
    const syncedBookmarks = activeFolderId
      ? preferences?.folderBookmarks?.[activeFolderId]
      : preferences?.bookmarks;

    if (Array.isArray(syncedBookmarks)) {
      setBookmarks(syncedBookmarks);
      return;
    }

    try {
      const saved = localStorage.getItem(bookmarkKey);
      const parsed = saved ? JSON.parse(saved) : [];
      const migratedBookmarks = Array.isArray(parsed) ? parsed : [];
      setBookmarks(migratedBookmarks);
      if (migratedBookmarks.length > 0) onUpdateBookmarks?.(migratedBookmarks);
    } catch {
      setBookmarks([]);
    }
  }, [activeFolderId, bookmarkKey, onUpdateBookmarks, space.clickApps?.spacePreferences]);

  const contextListIds = useMemo(() => {
    if (!activeFolderId) return space.lists?.map(list => list.id) || [];
    return space.lists?.filter(list => list.folderId === activeFolderId).map(list => list.id) || [];
  }, [activeFolderId, space.lists]);

  const visibleLists = useMemo(() => {
    if (!activeFolderId) return space.lists || [];
    return space.lists?.filter(list => list.folderId === activeFolderId) || [];
  }, [activeFolderId, space.lists]);

  const visibleDocs = useMemo(() => {
    if (space.id === 'all-tasks' || !space.id) {
      return docs;
    }
    if (activeFolderId) return docs.filter(doc => doc.folderId === activeFolderId);
    return docs.filter(doc => doc.spaceId === space.id && !doc.folderId);
  }, [activeFolderId, docs, space.id]);

  const spaceTasks = useMemo(() => {
    if (space.id === 'all-tasks' || !space.id) {
      return tasks;
    }
    return tasks.filter(task => task.spaceId === space.id && (!activeFolderId || (task.listId && contextListIds.includes(task.listId))));
  }, [activeFolderId, contextListIds, space.id, tasks]);

  const statusCounts = useMemo(() => {
    return spaceTasks.reduce<Record<TaskStatus, number>>(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      { todo: 0, inprogress: 0, review: 0, completed: 0 }
    );
  }, [spaceTasks]);

  const totalTasksCount = spaceTasks.length;
  const completedTasksCount = statusCounts.completed;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const highPriorityCount = spaceTasks.filter(task => task.priority === 'urgent' || task.priority === 'high').length;
  const overdueCount = spaceTasks.filter(
    task => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
  ).length;

  const listStats = useMemo(() => {
    return visibleLists.map(list => {
      const listTasks = tasks.filter(task => task.listId === list.id);
      const completed = listTasks.filter(task => task.status === 'completed').length;
      const urgent = listTasks.filter(task => task.priority === 'urgent' || task.priority === 'high').length;
      const progress = listTasks.length > 0 ? Math.round((completed / listTasks.length) * 100) : 0;
      const nextDue = listTasks
        .filter(task => task.dueDate && task.status !== 'completed')
        .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())[0]?.dueDate;

      return { ...list, total: listTasks.length, completed, urgent, progress, nextDue };
    });
  }, [tasks, visibleLists]);

  const activeMembers = useMemo(() => {
    const assignedIds = new Set<string>();
    spaceTasks.forEach(task => {
      (task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : []).forEach(id => assignedIds.add(id));
    });
    return members.filter(member => assignedIds.has(member.id));
  }, [members, spaceTasks]);

  const recentTasks = useMemo(() => {
    return [...spaceTasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [spaceTasks]);

  const nextTasks = useMemo(() => {
    return [...spaceTasks]
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      })
      .slice(0, 6);
  }, [spaceTasks]);

  const handleAddBookmarkSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) return;

    let formattedUrl = bookmarkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const updated = [...bookmarks, { id: `bookmark-${Date.now()}`, title: bookmarkTitle.trim(), url: formattedUrl }];
    setBookmarks(updated);
    onUpdateBookmarks?.(updated);

    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(updated));
    } catch {}

    setBookmarkTitle('');
    setBookmarkUrl('');
    setShowAddBookmarkModal(false);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã ghim liên kết' : 'Bookmark added',
      locale === 'vi' ? 'Liên kết đã được lưu vào Space.' : 'The link was saved to this Space.'
    );
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter(bookmark => bookmark.id !== id);
    setBookmarks(updated);
    onUpdateBookmarks?.(updated);

    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(updated));
    } catch {}

    triggerToast?.(
      'info',
      locale === 'vi' ? 'Đã bỏ ghim' : 'Bookmark removed',
      locale === 'vi' ? 'Liên kết đã được xóa khỏi Space.' : 'The link was removed from this Space.'
    );
  };

  const handleQuickTaskSubmit = (event: React.FormEvent, listId?: string) => {
    event.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const targetListId = listId || visibleLists[0]?.id;

    onAddTask({
      title: quickTaskTitle.trim(),
      description: '',
      status: 'todo',
      priority: 'medium',
      spaceId: space.id,
      listId: targetListId
    });

    setQuickTaskTitle('');
    setQuickTaskListId(null);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã tạo việc mới' : 'Task created',
      locale === 'vi' ? `Công việc đã được thêm vào Space.` : `Task added to Space.`
    );
  };

  const handleRunAiAnalysis = async () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setIsAnalyzing(true);
    const fallbackSummary = locale === 'vi'
      ? `Space "${space.name}" hoàn thành ${completionPercentage}%. Có ${statusCounts.inprogress} việc đang làm, ${statusCounts.review} việc chờ duyệt, ${overdueCount} việc quá hạn và ${highPriorityCount} việc ưu tiên cao. ${overdueCount > 0 ? 'Nên xử lý các việc quá hạn trước, sau đó tập trung vào nhóm ưu tiên cao.' : 'Tiến độ đang đúng hạn; hãy tập trung hoàn tất nhóm ưu tiên cao.'}`
      : `Space "${space.name}" is ${completionPercentage}% complete, with ${statusCounts.inprogress} in progress, ${statusCounts.review} in review, ${overdueCount} overdue, and ${highPriorityCount} high-priority items. ${overdueCount > 0 ? 'Address overdue work first, then focus on high-priority items.' : 'Work is on schedule; focus on closing the high-priority items.'}`;

    try {
      const taskContext = spaceTasks.slice(0, 30).map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || null,
        progress: task.progress,
      }));
      const response = await callAiApi('/api/ai/chat', {
        message: locale === 'vi'
          ? `Phân tích sức khỏe Space "${space.name}" từ dữ liệu sau và trả lời bằng tiếng Việt trong 3-5 câu ngắn. Nêu rủi ro lớn nhất, ưu tiên tiếp theo và một hành động cụ thể. Không dùng markdown. Dữ liệu: ${JSON.stringify(taskContext)}`
          : `Analyze the health of Space "${space.name}" from the following data in 3-5 concise English sentences. Identify the biggest risk, next priority, and one concrete action. Do not use markdown. Data: ${JSON.stringify(taskContext)}`,
        history: [],
        googleSearch: false,
      });
      if (!response.ok) throw new Error('AI analysis request failed');
      const payload = await response.json();
      const summary = typeof payload.text === 'string' ? payload.text.trim() : '';
      if (!summary) throw new Error('AI analysis returned an empty response');
      setAiAnalysis(summary);
      setIsAnalyzing(false);
      triggerToast?.(
        'success',
        locale === 'vi' ? 'Phân tích AI hoàn tất' : 'AI Analysis Complete',
        locale === 'vi' ? 'Đã tổng hợp bức tranh toàn cảnh của Space.' : 'Generated space health brief.'
      );
    } catch (error) {
      if (isAiAccessError(error)) {
        setIsAnalyzing(false);
        return;
      }
      setAiAnalysis(fallbackSummary);
      setIsAnalyzing(false);
      triggerToast?.(
        'info',
        locale === 'vi' ? 'Đã tạo phân tích nhanh' : 'Quick analysis ready',
        locale === 'vi' ? 'AI đang không khả dụng nên Apexa đã dùng dữ liệu tiến độ hiện có.' : 'AI was unavailable, so Apexa used the current progress data.'
      );
    }
  };

  return (
    <div className="min-h-full select-none bg-white dark:bg-[#060810] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        
        {/* ── 1. Space Overview Header Banner ── */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 p-6 md:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Space Branding & Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
              {onUpdateSpaceEmoji ? (
                <EmojiIconPicker
                  size="inline"
                  value={space.emoji || 'Package'}
                  onChange={onUpdateSpaceEmoji}
                  title="Nhấn để đổi biểu tượng không gian"
                >
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white dark:border-slate-800 dark:bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                  >
                    {renderSpaceIcon(space.emoji || 'Package', 'w-8 h-8 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform')}
                  </motion.div>
                </EmojiIconPicker>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  {renderSpaceIcon(space.emoji || 'Package', 'w-8 h-8 text-indigo-600 dark:text-indigo-400')}
                </motion.div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${theme.tint} border ${theme.border}`}
                  >
                    <Layers className="h-3 w-3" />
                    {activeFolderId
                      ? locale === 'vi' ? 'Folder View' : 'Folder View'
                      : locale === 'vi' ? 'Space Command' : 'Space Command'}
                  </span>
                  {space.isPrivate && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                      <Lock className="w-3 h-3 text-slate-500" /> Private
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Khu vực đang hoạt động
                  </span>
                </div>

                <h1 className="truncate text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white font-sans">
                  {space.name}
                </h1>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-3">
                  <span>
                    {locale === 'vi' ? `${visibleLists.length} Danh sách` : `${visibleLists.length} Lists`}
                  </span>
                  <span>•</span>
                  <span>
                    {locale === 'vi' ? `${space.folders?.length || 0} Thư mục` : `${space.folders?.length || 0} Folders`}
                  </span>
                  <span>•</span>
                  <span>
                    {locale === 'vi' ? `${visibleDocs.length} Tài liệu` : `${visibleDocs.length} Docs`}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Action Control Bar */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800/60">
              <button
                type="button"
                onClick={onAddFolder}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
              >
                <Folder className="h-4 w-4 text-indigo-500" />
                <span>{locale === 'vi' ? '+ Thư mục' : '+ Folder'}</span>
              </button>

              <button
                type="button"
                onClick={onAddDoc}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                <span>{locale === 'vi' ? '+ Tài liệu' : '+ Doc'}</span>
              </button>

              <button
                type="button"
                onClick={onAddList}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-bold transition-colors cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>{locale === 'vi' ? 'Tạo List mới' : 'New List'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. Sleek KPI Metrics Strip ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: locale === 'vi' ? 'TỔNG NHIỆM VỤ' : 'TOTAL TASKS',
              value: totalTasksCount,
              sub: locale === 'vi' ? 'nhiệm vụ trong Space' : 'tasks in space',
              icon: Target,
              color: '#6366f1',
              bg: 'bg-indigo-500/10'
            },
            {
              label: locale === 'vi' ? 'TỐC ĐỘ HOÀN THÀNH' : 'VELOCITY DONE',
              value: `${completionPercentage}%`,
              sub: `${completedTasksCount}/${totalTasksCount} ${locale === 'vi' ? 'đã xong' : 'completed'}`,
              icon: TrendingUp,
              color: '#10b981',
              bg: 'bg-emerald-500/10'
            },
            {
              label: locale === 'vi' ? 'ƯU TIÊN CAO' : 'HIGH PRIORITY',
              value: highPriorityCount,
              sub: locale === 'vi' ? 'công việc quan trọng' : 'urgent & high items',
              icon: AlertTriangle,
              color: '#f43f5e',
              bg: 'bg-rose-500/10'
            },
            {
              label: locale === 'vi' ? 'THÀNH VIÊN' : 'SPACE MEMBERS',
              value: activeMembers.length || members.length,
              sub: locale === 'vi' ? 'đang tham gia' : 'active collaborators',
              icon: Users,
              color: '#0ea5e9',
              bg: 'bg-sky-500/10'
            }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/40 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg}`}>
                    <Icon className="h-4.5 w-4.5" style={{ color: item.color }} />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white font-sans whitespace-nowrap tabular-nums">
                  {item.value}
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.sub}</p>
              </div>
            );
          })}
        </section>

        {/* ── 3. Main Bento Box Dashboard Grid ── */}
        <section className="grid gap-6 lg:grid-cols-12">
          
          {/* ── BENTO 1: Space Health & AI Pulse (Span 7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between">
              
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Gauge className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold tracking-wider text-slate-950 dark:text-white font-sans uppercase">
                      {locale === 'vi' ? 'Sức khỏe & Phân tích Space' : 'Space Health & Pulse'}
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {locale === 'vi' ? 'Tổng quan tiến độ & AI Brief' : 'Progress Breakdown & AI Intelligence'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex h-8.5 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 text-xs font-bold text-white transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isAnalyzing ? <Bot className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-white" />}
                  <span>{locale === 'vi' ? 'Quét AI Space' : 'Scan AI Brief'}</span>
                </button>
              </div>

              {/* Middle Section: Progress Gauge + Status breakdown */}
              <div className="grid gap-6 sm:grid-cols-[130px_minmax(0,1fr)] items-center mb-6">
                <div className="flex justify-center">
                  <ProgressGauge percent={completionPercentage} color={theme.accent} size={115} />
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(STATUS_META) as TaskStatus[]).map(status => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].bg}`} />
                          <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">
                            {locale === 'vi' ? STATUS_META[status].labelVi : STATUS_META[status].labelEn}
                          </span>
                        </div>
                        <span className="text-xs font-black font-sans text-slate-900 dark:text-white">
                          {statusCounts[status]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Overdue alert banner if any */}
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        {locale === 'vi'
                          ? `Có ${overdueCount} công việc quá hạn cần giải quyết!`
                          : `${overdueCount} task(s) are overdue!`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Brief Result Container */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 relative">
                <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Tóm tắt nhanh bằng AI</span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-200 break-words text-pretty">
                  {aiAnalysis ||
                    (locale === 'vi'
                      ? `Space đang hoạt động tốt với ${totalTasksCount} công việc. Nhấn 'Quét AI Space' để nhận nhận xét chi tiết.`
                      : `Space active with ${totalTasksCount} total tasks. Click 'Scan AI Brief' for instant intelligent summary.`)}
                </p>
              </div>

            </div>

            {/* ── BENTO 2: Work Areas / Lists & Folders (Span 7 cols) ── */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <FolderOpen className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                      {locale === 'vi' ? 'Khu vực làm việc' : 'Work Areas'}
                    </h2>
                    <p className="text-[10px] font-medium text-slate-400">
                      {visibleLists.length} {locale === 'vi' ? 'danh sách công việc' : 'task lists'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAddList}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{locale === 'vi' ? 'Tạo List' : 'Add List'}</span>
                </button>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {listStats.map(list => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => onOpenList(list.id)}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 text-left transition-all duration-200 hover:border-indigo-500/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/60 cursor-pointer"
                  >
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition-transform">
                            <List className="h-4 w-4" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white font-sans">
                            {list.name}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
                      </div>

                      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>
                          {list.completed}/{list.total} {locale === 'vi' ? 'xong' : 'done'}
                        </span>
                        {list.nextDue && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <CalendarDays className="h-3 w-3 text-indigo-500" />
                            {formatShortDate(list.nextDue, locale)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${list.progress}%`, backgroundColor: theme.accent }}
                      />
                    </div>
                  </button>
                ))}

                {listStats.length === 0 && (
                  <div className="col-span-full space-y-3">
                    <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {locale === 'vi' ? 'Khởi tạo danh sách công việc đầu tiên' : 'Get Started with a Work Area Template'}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {locale === 'vi' ? 'Chọn mẫu cấu trúc hoặc tạo danh sách tùy chỉnh để tổ chức dự án.' : 'Select a pre-built workspace template or create your own custom list.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onAddList}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shrink-0 active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>{locale === 'vi' ? 'Tạo Custom List' : 'Custom List'}</span>
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          title: locale === 'vi' ? 'Dự án UI/UX Design' : 'UI/UX Design System',
                          desc: locale === 'vi' ? 'Quy trình thiết kế, Wireframe & Tokens' : 'Design specs, wireframes & component tokens',
                          icon: Layers,
                          color: 'from-purple-500 to-indigo-600'
                        },
                        {
                          title: locale === 'vi' ? 'Sprint Kỹ thuật & API' : 'Sprint & Engineering',
                          desc: locale === 'vi' ? 'API Endpoint, DB Schema & Testing' : 'Backend endpoints, DB schemas & QA testing',
                          icon: Zap,
                          color: 'from-emerald-400 to-teal-600'
                        },
                        {
                          title: locale === 'vi' ? 'Chiến dịch Marketing' : 'Growth & Marketing',
                          desc: locale === 'vi' ? 'Chiến dịch ra mắt, Email & Content' : 'Product launch, email sequences & SEO content',
                          icon: Sparkles,
                          color: 'from-rose-500 to-amber-500'
                        }
                      ].map(tmpl => {
                        const Icon = tmpl.icon;
                        return (
                          <button
                            key={tmpl.title}
                            type="button"
                            onClick={onAddList}
                            className="group flex flex-col justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 hover:shadow-xs transition-all text-left cursor-pointer"
                          >
                            <div className="space-y-2">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tmpl.color} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {tmpl.title}
                                </h5>
                                <p className="text-[10px] font-medium text-slate-400 leading-snug mt-0.5">
                                  {tmpl.desc}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              <span>{locale === 'vi' ? 'Tạo danh sách' : 'Create list'}</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── BENTO 3: Work Stream & Quick Task Creator (Span 5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Work Stream Radar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40 flex-1 flex flex-col justify-between">
              
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Radio className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                        {locale === 'vi' ? 'Dòng Công Việc' : 'Work Stream Radar'}
                      </h2>
                      <p className="text-[10px] font-medium text-slate-400">
                        {nextTasks.length} {locale === 'vi' ? 'việc ưu tiên tới' : 'upcoming items'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Task Creation Line */}
                <form
                  onSubmit={e => handleQuickTaskSubmit(e)}
                  className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <input
                    type="text"
                    value={quickTaskTitle}
                    onChange={e => setQuickTaskTitle(e.target.value)}
                    placeholder={
                      locale === 'vi'
                        ? 'Thêm nhanh việc cần làm vào Space...'
                        : 'Quickly create a task in Space...'
                    }
                    className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 text-[11px] font-bold text-white transition-colors active:scale-95 cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>{locale === 'vi' ? 'Thêm' : 'Add'}</span>
                  </button>
                </form>

                {/* Active Task List */}
                <div className="space-y-3">
                  {nextTasks.map(task => {
                    const list = space.lists?.find(item => item.id === task.listId);
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3.5 transition-all duration-200 hover:border-indigo-500/60 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block truncate text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                              {list?.name || (locale === 'vi' ? 'Chưa phân loại' : 'General')}
                            </span>
                            <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-950 dark:text-white font-sans mt-0.5">
                              {task.title}
                            </h3>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${STATUS_META[task.status].color}18`,
                              color: STATUS_META[task.status].color
                            }}
                          >
                            {locale === 'vi'
                              ? STATUS_META[task.status].labelVi
                              : STATUS_META[task.status].labelEn}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                            {formatShortDate(task.dueDate, locale)}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {nextTasks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300/80 p-6 text-center dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/20">
                      {totalTasksCount === 0 ? (
                        <div className="space-y-3">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <Target className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {locale === 'vi' ? 'Chưa có công việc nào trong Space' : 'No upcoming tasks found'}
                            </p>
                            <p className="text-[11px] font-medium text-slate-400 max-w-[220px] mx-auto mt-0.5">
                              {locale === 'vi'
                                ? 'Nhập tên công việc bên trên hoặc tạo danh sách đầu tiên.'
                                : 'Type a task name above or create your first list.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={onAddList}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 px-3 py-1.5 text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{locale === 'vi' ? 'Tạo danh sách đầu tiên' : 'Create first list'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-2">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {locale === 'vi' ? 'Tất cả công việc đã hoàn thành!' : 'All upcoming tasks completed!'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400">
                            {locale === 'vi' ? 'Không có việc nào trễ hạn hoặc đọng lại.' : 'Great job! No pending tasks remaining in queue.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ── 4. Bottom Grid: Team, Rhythm Feed, Bookmarks & Docs ── */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Team Collaboration Hub */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                  {locale === 'vi' ? 'Đội Ngũ Phụ Trách' : 'Space Roster'}
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {activeMembers.length || members.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {(activeMembers.length ? activeMembers : members).slice(0, 10).map(member => (
                <div key={member.id} className="relative group">
                  <SignedImage
                    filePath={member.avatar}
                    className="h-10 w-10 rounded-xl border border-slate-200 object-cover dark:border-slate-800 cursor-pointer"
                    alt={member.name}
                    title={member.name}
                  />
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${presenceDotClass(member.status)}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Rhythm Activity Feed */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                  {locale === 'vi' ? 'Nhịp Hoạt Động' : 'Recent Rhythm Feed'}
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Circle className="h-3.5 w-3.5" style={{ color: STATUS_META[task.status].color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white font-sans">
                      {task.title}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {formatRelativeTime(task.createdAt, locale)}
                    </p>
                  </div>
                </div>
              ))}

              {recentTasks.length === 0 && (
                <p className="py-6 text-center text-xs font-semibold text-slate-400">
                  {locale === 'vi' ? 'Chưa có hoạt động mới.' : 'No activity logs yet.'}
                </p>
              )}
            </div>
          </div>

          {/* Pinned Links & Docs Dock */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Bookmark className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                  {locale === 'vi' ? 'Ghim Liên Kết & Tài Liệu' : 'Pinned Links & Docs'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBookmarkModal(true)}
                className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                title="Thêm liên kết"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {bookmarks.map(bookmark => (
                <div
                  key={bookmark.id}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <Link2 className="h-4 w-4 shrink-0 text-amber-500" />
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800 hover:underline dark:text-slate-200"
                  >
                    {bookmark.title}
                  </a>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {visibleDocs.slice(0, 3).map(doc => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenDoc?.(doc.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850 cursor-pointer group"
                >
                  <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {doc.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}

              {bookmarks.length === 0 && visibleDocs.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddBookmarkModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300/80 p-4 text-xs font-bold text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:border-slate-800 cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>{locale === 'vi' ? 'Ghim liên kết mới' : 'Pin a new link'}</span>
                </button>
              )}
            </div>
          </div>

        </section>
      </div>

      {/* Add Bookmark Modal */}
      <AnimatePresence>
        {showAddBookmarkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                  {locale === 'vi' ? 'Thêm liên kết ghim' : 'Add Pinned Link'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddBookmarkModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBookmarkSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {locale === 'vi' ? 'Tiêu đề' : 'Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bookmarkTitle}
                    onChange={e => setBookmarkTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    URL
                  </label>
                  <input
                    type="text"
                    required
                    value={bookmarkUrl}
                    onChange={e => setBookmarkUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBookmarkModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {locale === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white transition-colors active:scale-95 cursor-pointer"
                  >
                    {locale === 'vi' ? 'Lưu' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
