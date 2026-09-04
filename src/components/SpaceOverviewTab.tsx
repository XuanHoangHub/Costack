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
  Lock,
  ArrowRight,
  Check
} from 'lucide-react';
import { Task, TaskStatus, User, Space, SpaceBookmark } from '../types';
import { useTranslation } from '../contexts/TranslationContext';
import EmojiIconPicker, { renderSpaceIcon } from './EmojiIconPicker';
import SignedImage from './SignedImage';
import { presenceDotClass } from '../lib/presence';
import { callAiApi } from '../lib/aiClient';
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
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
    tint: 'bg-blue-500/10 text-blue-600 dark:text-sky-400',
    text: 'text-blue-600 dark:text-sky-400',
    gradient: 'from-blue-600 via-sky-500 to-cyan-400',
    glow: 'rgba(37, 99, 235, 0.25)',
    border: 'border-blue-500/20'
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

// ── Custom Glassmorphic Donut Gauge ──
function ProgressGauge({ percent, color, size = 110, strokeWidth = 9 }: { percent: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-100 dark:text-zinc-800"
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
        <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans tabular-nums">{percent}%</span>
        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">TIẾN ĐỘ</span>
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

    const targetListId = listId || quickTaskListId || visibleLists[0]?.id;

    onAddTask({
      title: quickTaskTitle.trim(),
      description: '',
      status: 'todo',
      priority: 'medium',
      spaceId: space.id,
      listId: targetListId
    });

    setQuickTaskTitle('');
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
        taskContext: `Space: ${space.name}, Lists: ${visibleLists.length}, Tasks: ${totalTasksCount}, Done: ${completedTasksCount}`
      });

      if (response && response.ok) {
        const data = await response.json();
        if (data && typeof data.text === 'string' && data.text.trim()) {
          setAiAnalysis(data.text.trim());
          triggerToast?.(
            'success',
            locale === 'vi' ? 'Apexa AI Space Brief' : 'AI Analysis Ready',
            locale === 'vi' ? 'Đã quét và cập nhật nhận định sức khỏe công việc.' : 'Workspace pulse and recommendations updated.'
          );
        } else {
          setAiAnalysis(fallbackSummary);
        }
      } else {
        setAiAnalysis(fallbackSummary);
      }
    } catch {
      setAiAnalysis(fallbackSummary);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="apexa-space-overview min-h-full select-none bg-slate-50/50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-4.5">
        
        {/* ── 1. Hero Command Center Banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 dark:border-white/[0.08] dark:bg-zinc-900/60 p-5 sm:p-6 shadow-xs backdrop-blur-md">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Space Branding */}
            <div className="flex items-center gap-4 min-w-0">
              {onUpdateSpaceEmoji ? (
                <EmojiIconPicker
                  size="inline"
                  value={space.emoji || 'Package'}
                  onChange={onUpdateSpaceEmoji}
                  title="Nhấn để đổi biểu tượng không gian"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-50/80 dark:border-blue-500/30 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 cursor-pointer shadow-3xs hover:shadow-xs transition-all"
                  >
                    {renderSpaceIcon(space.emoji || 'Package', 'w-6.5 h-6.5')}
                  </motion.div>
                </EmojiIconPicker>
              ) : (
                <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-50/80 dark:border-blue-500/30 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 shadow-3xs">
                  {renderSpaceIcon(space.emoji || 'Package', 'w-6.5 h-6.5')}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                    <Layers className="h-2.5 w-2.5" />
                    {activeFolderId ? 'Chế độ thư mục' : 'Trung tâm Space'}
                  </span>
                  {space.isPrivate && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-2 py-0.5 text-[9.5px] font-bold text-slate-500 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400">
                      <Lock className="w-2.5 h-2.5" /> {locale === 'vi' ? 'Riêng tư' : 'Private'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                </div>

                <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans">
                  {space.name}
                </h1>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                  <span>{visibleLists.length} Danh sách</span>
                  <span>•</span>
                  <span>{space.folders?.length || 0} Thư mục</span>
                  <span>•</span>
                  <span>{visibleDocs.length} Tài liệu</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={onAddFolder}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-3xs"
              >
                <Folder className="h-3.5 w-3.5 text-blue-500" />
                <span>+ Thư mục</span>
              </button>

              <button
                type="button"
                onClick={onAddDoc}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-3xs"
              >
                <FileText className="h-3.5 w-3.5 text-sky-500" />
                <span>+ Tài liệu</span>
              </button>

              <button
                type="button"
                onClick={onAddList}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shadow-blue-500/25"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Tạo List mới</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Smart Metrics Strip (4 Bento Cards) ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'TỔNG NHIỆM VỤ',
              value: totalTasksCount,
              sub: 'trong phạm vi Space',
              icon: Target,
              color: 'text-blue-600 dark:text-sky-400',
              bg: 'bg-blue-500/10'
            },
            {
              label: 'TIẾN ĐỘ HOÀN TẤT',
              value: `${completionPercentage}%`,
              sub: `${completedTasksCount}/${totalTasksCount} đã hoàn thành`,
              icon: TrendingUp,
              color: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-500/10'
            },
            {
              label: 'ƯU TIÊN CAO',
              value: highPriorityCount,
              sub: 'công việc quan trọng & khẩn',
              icon: AlertTriangle,
              color: 'text-rose-600 dark:text-rose-400',
              bg: 'bg-rose-500/10'
            },
            {
              label: 'THÀNH VIÊN',
              value: activeMembers.length || members.length,
              sub: 'đang cùng cộng tác',
              icon: Users,
              color: 'text-sky-600 dark:text-sky-400',
              bg: 'bg-sky-500/10'
            }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4.5 dark:border-white/[0.08] dark:bg-zinc-900/60 transition-all hover:border-blue-500/30 dark:hover:border-white/15 shadow-3xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                    {item.label}
                  </span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans tabular-nums">
                  {item.value}
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">{item.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── 3. Main Bento Dashboard (8 cols left / 4 cols right) ── */}
        <div className="grid gap-4.5 lg:grid-cols-12">
          
          {/* ── LEFT MAIN WORKSTREAM (8 cols) ── */}
          <div className="lg:col-span-8 flex flex-col gap-4.5">
            
            {/* Card A: Space Health & AI Pulse */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-zinc-900/60 shadow-3xs">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                      Sức khỏe & Tiến độ Space
                    </h2>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400">
                      Phân bổ trạng thái & Báo cáo AI
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer shadow-xs shadow-blue-500/20"
                >
                  {isAnalyzing ? <Bot className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>Quét AI Space</span>
                </button>
              </div>

              {/* Progress and status grid */}
              <div className="grid gap-5 sm:grid-cols-[115px_minmax(0,1fr)] items-center mb-4">
                <div className="flex justify-center">
                  <ProgressGauge percent={completionPercentage} color={theme.accent} size={110} />
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(STATUS_META) as TaskStatus[]).map(status => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-2 dark:border-white/[0.06] dark:bg-zinc-800/40"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].bg}`} />
                          <span className="truncate text-xs font-bold text-slate-700 dark:text-zinc-300">
                            {STATUS_META[status].labelVi}
                          </span>
                        </div>
                        <span className="text-xs font-black font-sans text-slate-900 dark:text-white tabular-nums">
                          {statusCounts[status]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Có {overdueCount} công việc quá hạn cần giải quyết</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Brief result pill */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 p-3 relative">
                <div className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  <Sparkles className="h-3 w-3" />
                  <span>Tóm tắt thông minh từ Apexa AI</span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-zinc-200">
                  {aiAnalysis || `Space đang hoạt động với ${totalTasksCount} công việc. Nhấn 'Quét AI Space' để nhận báo cáo chi tiết.`}
                </p>
              </div>
            </div>

            {/* Card B: Work Areas / Lists Grid */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-zinc-900/60 shadow-3xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                      Danh Sách & Dự Án
                    </h2>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400">
                      {visibleLists.length} danh sách trong Space
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAddList}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 transition-all cursor-pointer shadow-3xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tạo List</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {listStats.map(list => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => onOpenList(list.id)}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 text-left transition-all duration-150 hover:border-blue-500/50 hover:bg-white dark:border-white/[0.06] dark:bg-zinc-800/30 dark:hover:border-sky-500/40 dark:hover:bg-zinc-800/60 shadow-3xs hover:shadow-xs cursor-pointer"
                  >
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 transition-transform group-hover:scale-105">
                            <List className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white font-sans">
                            {list.name}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-500" />
                      </div>

                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <span>
                          {list.completed}/{list.total} hoàn tất
                        </span>
                        {list.nextDue && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-400">
                            <CalendarDays className="h-3 w-3 text-blue-500" />
                            {formatShortDate(list.nextDue, locale)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${list.progress}%`, background: 'linear-gradient(90deg, #2563eb, #38bdf8)' }}
                      />
                    </div>
                  </button>
                ))}

                {listStats.length === 0 && (
                  <div className="col-span-full space-y-3">
                    <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Khởi tạo danh sách công việc đầu tiên
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                          Chọn một mẫu cấu trúc sẵn hoặc tạo danh sách tùy chỉnh theo ý bạn.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onAddList}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shrink-0 shadow-xs shadow-blue-500/20"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Tạo Danh sách</span>
                      </button>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {[
                        {
                          title: 'Dự án UI/UX Design',
                          desc: 'Wireframe, Tokens & UI Components',
                          icon: Layers,
                          color: 'from-blue-500 to-sky-500'
                        },
                        {
                          title: 'Sprint Kỹ thuật & API',
                          desc: 'Backend, API endpoints & Testing',
                          icon: Zap,
                          color: 'from-emerald-500 to-teal-500'
                        },
                        {
                          title: 'Chiến dịch Marketing',
                          desc: 'Ra mắt sản phẩm, Content & SEO',
                          icon: Sparkles,
                          color: 'from-amber-500 to-rose-500'
                        }
                      ].map(tmpl => {
                        const Icon = tmpl.icon;
                        return (
                          <button
                            key={tmpl.title}
                            type="button"
                            onClick={onAddList}
                            className="group flex flex-col justify-between p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-zinc-800/30 hover:border-blue-500/50 hover:bg-white dark:hover:bg-zinc-800/60 shadow-3xs transition-all text-left cursor-pointer"
                          >
                            <div className="space-y-2">
                              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tmpl.color} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                                  {tmpl.title}
                                </h5>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400 leading-snug mt-0.5">
                                  {tmpl.desc}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-sky-400">
                              <span>Khởi tạo</span>
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

          {/* ── RIGHT STREAM & DOCK (4 cols) ── */}
          <div className="lg:col-span-4 flex flex-col gap-4.5">
            
            {/* Priority Workstream & Fast Task Creator */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-zinc-900/60 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400">
                      <Radio className="h-3.5 w-3.5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                        Dòng Công Việc
                      </h2>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400">
                        {nextTasks.length} việc cần ưu tiên tiếp theo
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Task input form */}
                <form
                  onSubmit={e => handleQuickTaskSubmit(e)}
                  className="mb-3.5 flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-1.5 dark:border-white/[0.08] dark:bg-zinc-800/40"
                >
                  <input
                    type="text"
                    value={quickTaskTitle}
                    onChange={e => setQuickTaskTitle(e.target.value)}
                    placeholder="Thêm nhanh việc cần làm..."
                    className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-7 items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-2.5 text-[10.5px] font-bold text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    <span>Thêm</span>
                  </button>
                </form>

                {/* Active Priority Queue */}
                <div className="space-y-2">
                  {nextTasks.map(task => {
                    const list = space.lists?.find(item => item.id === task.listId);
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-2.5 transition-all hover:border-blue-500/40 hover:bg-white dark:border-white/[0.06] dark:bg-zinc-800/30 dark:hover:bg-zinc-800/60 shadow-3xs"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                              {list?.name || 'Chung'}
                            </span>
                            <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 dark:text-white font-sans mt-0.5">
                              {task.title}
                            </h3>
                          </div>
                          <span
                            className="shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${STATUS_META[task.status].color}18`,
                              color: STATUS_META[task.status].color
                            }}
                          >
                            {STATUS_META[task.status].labelVi}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-zinc-400 pt-1">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-2.5 w-2.5 text-blue-500" />
                            {formatShortDate(task.dueDate, locale)}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-wider text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {nextTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300/80 p-4 text-center dark:border-white/10 bg-slate-50/40 dark:bg-zinc-800/20">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Chưa có việc cần làm
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Nhập tên việc bên trên để tạo mới.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Team & Resources Dock */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-zinc-900/60 shadow-3xs space-y-4">
              
              {/* Member Roster */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-sky-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                      Đội Ngũ Phụ Trách
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {activeMembers.length || members.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(activeMembers.length ? activeMembers : members).slice(0, 8).map(member => (
                    <div key={member.id} className="relative group">
                      <SignedImage
                        filePath={member.avatar}
                        className="h-8 w-8 rounded-xl border border-slate-200/80 object-cover dark:border-white/10 cursor-pointer shadow-3xs"
                        alt={member.name}
                        title={member.name}
                      />
                      <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-zinc-900 ${presenceDotClass(member.status)}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pinned Bookmarks & Docs */}
              <div className="border-t border-slate-100 dark:border-white/[0.06] pt-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-3.5 w-3.5 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                      Liên Kết & Tài Liệu
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddBookmarkModal(true)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    title="Thêm liên kết"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-white/[0.06] hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition-colors group"
                    >
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 min-w-0 flex-1 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">{bm.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {visibleDocs.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onOpenDoc?.(doc.id)}
                      className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-white/[0.06] hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate text-xs font-bold text-slate-700 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                          {doc.title || doc.name || 'Tài liệu không tên'}
                        </span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}

                  {bookmarks.length === 0 && visibleDocs.length === 0 && (
                    <p className="py-2 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
                      Chưa có liên kết hoặc tài liệu.
                    </p>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
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
              className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#09090b] shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                  {locale === 'vi' ? 'Thêm liên kết ghim' : 'Add Pinned Link'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddBookmarkModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBookmarkSubmit} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                    {locale === 'vi' ? 'Tiêu đề' : 'Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bookmarkTitle}
                    onChange={e => setBookmarkTitle(e.target.value)}
                    placeholder="VD: Tài liệu thiết kế Figma..."
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                    URL
                  </label>
                  <input
                    type="text"
                    required
                    value={bookmarkUrl}
                    onChange={e => setBookmarkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBookmarkModal(false)}
                    className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition-colors active:scale-95 cursor-pointer shadow-xs shadow-blue-500/20"
                  >
                    Lưu
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
