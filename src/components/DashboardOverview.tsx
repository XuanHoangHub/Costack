"use client";

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Task, User, SyncLog, Document } from '../types';
import { 
  CheckCircle2, TrendingUp,
  Activity, FileText, Bot, Clock, Sparkles, AlertCircle,
  PieChart as PieIcon, ListTodo, Flame, Zap, X, Database, WifiOff, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useTranslation } from '../contexts/TranslationContext';
import { callAiApi } from '@/lib/aiClient';

interface DashboardOverviewProps {
  tasks: Task[];
  members: User[];
  docs: Document[];
  syncLogs: SyncLog[];
  isOffline: boolean;
  onNavigate: (tab: string) => void;
  onToggleOffline: () => void;
  currentUser: any;
  onUpgradePremium?: () => void;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message', title: string, message: string) => void;
  onClearSyncLogs?: () => void;
  isLoading?: boolean;
  isSynced?: boolean;
  workspaceName?: string;
}

const parseTaskDate = (value?: string, endOfDay = false) => {
  if (!value) return null;
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function DashboardOverview({
  tasks = [],
  members = [],
  docs = [],
  syncLogs = [],
  isOffline,
  onNavigate,
  onToggleOffline,
  currentUser,
  onUpgradePremium,
  onAddSyncLog,
  triggerToast,
  isLoading = false,
  isSynced = false,
  workspaceName
}: DashboardOverviewProps) {
  const { t, locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [activeMetricTab, setActiveMetricTab] = useState<'progress' | 'priority'>('progress');
  const [reportText, setReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');

  // Daily morning briefing notification state
  const [showBriefing, setShowBriefing] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('apexa_show_briefing_panel');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const { briefingTasks, overdueTasks } = useMemo(() => {
    const now = Date.now();
    const dueSoonThreshold = now + (36 * 60 * 60 * 1000);
    const dueSoon: Task[] = [];
    const overdue: Task[] = [];

    tasks.forEach((task) => {
      if (task.status === 'completed') return;
      const dueDate = parseTaskDate(task.dueDate, true);
      if (!dueDate) return;
      if (dueDate.getTime() < now) overdue.push(task);
      else if (dueDate.getTime() <= dueSoonThreshold) dueSoon.push(task);
    });

    return { briefingTasks: dueSoon, overdueTasks: overdue };
  }, [tasks]);

  const handleGenerateReport = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setIsGenerating(true);
    setReportError('');
    try {
      const response = await callAiApi('/api/ai/productivity-report', { tasks, members });
      const data = await response.json();
      if (data.success) {
        setReportText(data.text);
        if (onAddSyncLog) {
          onAddSyncLog("Đã tạo báo cáo năng suất tuần bằng Gemini AI.");
        }
      } else {
        throw new Error(data.error || (locale === 'vi' ? "Không thể kết nối với máy chủ AI." : "Unable to connect to AI server."));
      }
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || (locale === 'vi' ? "Đã xảy ra lỗi khi kết nối Gemini. Vui lòng kiểm tra khóa API." : "An error occurred connecting to Gemini. Please check your API key."));
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to render text to custom clean markdown beautifully
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-slate-700 dark:text-slate-200 font-sans text-xs md:text-sm leading-relaxed text-left">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('###')) {
            return (
              <h4 key={i} className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight mt-4 mb-2 flex items-center gap-1.5 border-b border-indigo-100 dark:border-indigo-900/40 pb-1">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>{trimmed.replace('###', '').trim()}</span>
              </h4>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <h3 key={i} className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-5 mb-2">
                {trimmed.replace('##', '').trim()}
              </h3>
            );
          }
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const cleanLine = trimmed.replace(/^[\s-*]+/, '').trim();
            const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)/);
            if (boldMatch) {
              return (
                <div key={i} className="flex gap-2 ml-2 items-start text-xs">
                  <span className="text-indigo-500 font-extrabold mt-1 text-[8px] shrink-0">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white font-bold">{boldMatch[1]}</strong>
                    {boldMatch[2]}
                  </span>
                </div>
              );
            }
            return (
              <div key={i} className="flex gap-2 ml-2 items-start text-xs">
                <span className="text-indigo-500 font-extrabold mt-1 text-[8px] shrink-0">•</span>
                <span>{cleanLine}</span>
              </div>
            );
          }
          if (trimmed === '') return <div key={i} className="h-1.5" />;
          return <p key={i} className="pl-1 text-slate-600 dark:text-slate-300 text-xs">{trimmed}</p>;
        })}
      </div>
    );
  };

  const metrics = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const inProgress = tasks.filter((task) => task.status === 'inprogress').length;
    const review = tasks.filter((task) => task.status === 'review').length;
    const todo = tasks.filter((task) => task.status === 'todo').length;
    const totalEstimated = tasks.reduce((sum, task) => sum + Number(task.hoursEstimate || 0), 0);
    const totalLogged = tasks.reduce((sum, task) => sum + Number(task.hoursLogged || 0), 0);
    const workspaceMemberIds = new Set(members.map((member) => member.id));
    const assignedMemberIds = new Set<string>();

    tasks.forEach((task) => {
      if (task.assigneeId && workspaceMemberIds.has(task.assigneeId)) assignedMemberIds.add(task.assigneeId);
      task.assigneeIds?.forEach((memberId) => {
        if (workspaceMemberIds.has(memberId)) assignedMemberIds.add(memberId);
      });
    });

    return {
      total: tasks.length,
      completed,
      inProgress,
      review,
      todo,
      totalEstimated,
      totalLogged,
      assignedMemberCount: assignedMemberIds.size,
    };
  }, [members, tasks]);

  const totalTasks = metrics.total;
  const completedTasks = metrics.completed;
  const inProgressTasks = metrics.inProgress;
  const reviewTasks = metrics.review;
  const todoTasks = metrics.todo;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const weeklyData = useMemo(() => {
    const labels = locale === 'vi'
      ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    return labels.map((name, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      const dateKey = getLocalDateKey(targetDate);
      return {
        name,
        created: tasks.filter((task) => {
          const createdAt = parseTaskDate(task.createdAt);
          return createdAt ? getLocalDateKey(createdAt) === dateKey : false;
        }).length,
        completed: tasks.filter((task) => {
          if (task.status !== 'completed' || !task.completedAt) return false;
          const completedAt = parseTaskDate(task.completedAt);
          return completedAt ? getLocalDateKey(completedAt) === dateKey : false;
        }).length,
      };
    });
  }, [locale, tasks]);

  const velocityData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (29 - index));
      const dateKey = getLocalDateKey(date);
      return {
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        completed: tasks.filter((task) => {
          if (task.status !== 'completed' || !task.completedAt) return false;
          const completedAt = parseTaskDate(task.completedAt);
          return completedAt ? getLocalDateKey(completedAt) === dateKey : false;
        }).length,
      };
    });
  }, [tasks]);

  const memberEffortData = useMemo(() => members.map((member) => {
    const memberTasks = tasks.filter((task) => (
      task.assigneeId === member.id || task.assigneeIds?.includes(member.id)
    ));
    return {
      name: member.name.split(' ')[0],
      estimated: memberTasks.reduce((sum, task) => sum + Number(task.hoursEstimate || 0), 0),
      logged: memberTasks.reduce((sum, task) => sum + Number(task.hoursLogged || 0), 0),
    };
  }).filter((item) => item.estimated > 0 || item.logged > 0), [members, tasks]);

  const statusData = useMemo(() => [
    { name: locale === 'vi' ? 'Cần làm' : 'To do', value: todoTasks, color: '#6366f1' },
    { name: locale === 'vi' ? 'Đang thực hiện' : 'In progress', value: inProgressTasks, color: '#f59e0b' },
    { name: locale === 'vi' ? 'Đang duyệt' : 'In review', value: reviewTasks, color: '#a855f7' },
    { name: locale === 'vi' ? 'Đã hoàn thành' : 'Completed', value: completedTasks, color: '#10b981' },
  ].filter((item) => item.value > 0), [completedTasks, inProgressTasks, locale, reviewTasks, todoTasks]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl shadow-xl space-y-1 backdrop-blur-md z-50 text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
          <div className="space-y-0.5">
            {payload.map((item: any, idx: number) => (
              <p key={idx} className="text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                <span className="text-slate-300">{item.name}:</span>
                <span className="text-white font-black font-mono">
                  {item.value} {item.name.includes('Giờ') || item.name.toLowerCase().includes('hour') ? 'h' : (locale === 'vi' ? 'việc' : 'tasks')}
                </span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const urgentTasks = useMemo(() => tasks
    .filter((task) => task.status !== 'completed' && (task.priority === 'urgent' || task.priority === 'high'))
    .sort((first, second) => {
      const firstDue = parseTaskDate(first.dueDate, true)?.getTime() ?? Number.POSITIVE_INFINITY;
      const secondDue = parseTaskDate(second.dueDate, true)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (firstDue !== secondDue) return firstDue - secondDue;
      return first.priority === 'urgent' ? -1 : 1;
    })
    .slice(0, 5), [tasks]);

  const onlineMembersCount = useMemo(() => members.filter((member) => member.status === 'online').length, [members]);
  const now = new Date();
  const todayDateFormatted = now.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const greeting = locale === 'vi'
    ? (now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối')
    : (now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening');

  if (isLoading && !isOffline) {
    return (
      <div className="min-h-full w-full bg-white p-5 text-slate-800 dark:bg-[#07080c] dark:text-slate-100 md:p-8" role="status" aria-live="polite">
        <span className="sr-only">{locale === 'vi' ? 'Đang tải dữ liệu Home từ Supabase' : 'Loading Home data from Supabase'}</span>
        <div className="space-y-6 animate-pulse">
          <div className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-900" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-3xl bg-slate-100 dark:bg-slate-900" />)}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-900 lg:col-span-8" />
            <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-900 lg:col-span-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1800px] select-none flex-col space-y-5 overflow-x-hidden bg-white px-4 py-5 text-slate-800 dark:bg-[#07080c] dark:text-slate-100 sm:space-y-6 sm:px-6 sm:py-6 xl:space-y-8 xl:px-8 xl:py-8">
      
      {/* ── Morning Briefing Notification Banner ── */}
      {showBriefing && (overdueTasks.length > 0 || briefingTasks.length > 0) && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, y: -14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-[22px] border border-amber-300/60 bg-gradient-to-r from-amber-50 via-orange-50/70 to-rose-50/80 p-4 text-left shadow-[0_12px_40px_-24px_rgba(245,158,11,0.55)] backdrop-blur-xl select-none dark:border-amber-800/50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-rose-950/30 sm:flex-row sm:items-center"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500" />
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="flex flex-wrap items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
                <span>{t('dashboardMorningBriefing') || 'Bản tin chú ý công việc ☀️'}</span>
                <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full uppercase">
                  {overdueTasks.length} quá hạn · {briefingTasks.length} sắp hết hạn
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                {locale === 'vi' 
                  ? `Có ${overdueTasks.length} công việc đã quá hạn cần hoàn tất gấp và ${briefingTasks.length} công việc sắp tới hạn chót.`
                  : `You have ${overdueTasks.length} overdue tasks that need immediate resolution and ${briefingTasks.length} tasks due soon.`
                }
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0">
            <button 
              type="button" 
              onClick={() => onNavigate('tasks')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
            >
              {locale === 'vi' ? 'Xử lý ngay' : 'Review Tasks'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowBriefing(false);
                try { localStorage.setItem('apexa_show_briefing_panel', 'false'); } catch (e) {}
              }}
              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Hero Welcome Command Header ── */}
      <motion.div 
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="relative isolate flex min-h-[210px] flex-col items-start justify-between gap-7 overflow-hidden rounded-[30px] border border-indigo-200/70 bg-[linear-gradient(125deg,#f8faff_0%,#f4f1ff_52%,#fbf7ff_100%)] p-6 text-left shadow-[0_24px_70px_-38px_rgba(79,70,229,0.5)] dark:border-indigo-900/60 dark:bg-[linear-gradient(125deg,#11152a_0%,#171128_55%,#0d0f18_100%)] sm:p-7 md:flex-row md:items-center md:p-9"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.18) 1px, transparent 1px)', backgroundSize: '34px 34px' }}
        />
        <motion.div
          className="pointer-events-none absolute -right-24 -top-32 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-blue-400/35 via-sky-400/25 to-cyan-400/10 blur-3xl"
          animate={prefersReducedMotion ? undefined : { x: [0, -18, 0], y: [0, 16, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-32 left-[38%] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10"
          animate={prefersReducedMotion ? undefined : { x: [0, 24, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-200/70 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600 shadow-sm backdrop-blur-lg dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Zap className="w-3 h-3" />
              <span>{todayDateFormatted}</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 shadow-sm backdrop-blur-lg dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineMembersCount}/{members.length} {locale === 'vi' ? 'thành viên trực tuyến' : 'members online'}</span>
            </span>
            <span className={`flex items-center gap-1.5 rounded-full border bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur-lg dark:bg-slate-950/50 ${
              isOffline
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60'
            }`}>
              {isOffline ? <WifiOff className="h-3 w-3" /> : <Database className="h-3 w-3" />}
              <span>
                {isOffline
                  ? (locale === 'vi' ? 'Dữ liệu cục bộ' : 'Local data')
                  : isSynced
                    ? 'Supabase Realtime'
                    : (locale === 'vi' ? 'Đang đồng bộ Supabase' : 'Syncing with Supabase')}
              </span>
            </span>
          </div>

          <h1 className="max-w-3xl text-[clamp(1.75rem,4vw,3.25rem)] font-black leading-[1.04] tracking-[-0.045em] text-slate-950 dark:text-white">
            {greeting}, <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 dark:from-blue-400 dark:via-sky-400 dark:to-cyan-400 bg-clip-text text-transparent">{currentUser?.name || (locale === 'vi' ? 'thành viên Apexa' : 'Apexa member')}</span>
          </h1>
          <p className="max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">
            {locale === 'vi'
              ? `Tổng quan trực tiếp của ${workspaceName || 'không gian làm việc hiện tại'}, được tính từ dữ liệu đã lưu.`
              : `Live overview for ${workspaceName || 'the current workspace'}, calculated from stored data.`}
          </p>
        </div>

        <div className="relative z-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row md:shrink-0">
          <motion.button
            onClick={() => onNavigate('tasks')}
            whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.015 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 py-3 text-xs font-black text-white shadow-[0_14px_30px_-14px_rgba(99,102,241,0.9)] transition-[filter,box-shadow] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:ring-offset-slate-950 sm:min-w-[176px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{locale === 'vi' ? 'Quản lý nhiệm vụ' : 'Manage Tasks'}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.button>
          <motion.button
            onClick={onToggleOffline}
            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            className={`min-h-11 rounded-2xl border px-4 py-3 text-xs font-black shadow-sm backdrop-blur-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isOffline 
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {isOffline ? (locale === 'vi' ? 'Ngoại tuyến' : 'Offline') : (locale === 'vi' ? 'Trực tuyến' : 'Online')}
          </motion.button>
        </div>
      </motion.div>

      {/* ── 4 Hero KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { 
            label: t('dashboardCompletionRate') || 'Tỷ lệ hoàn thành', 
            value: `${completionPercentage}%`, 
            detail: locale === 'vi' ? `Đã xong ${completedTasks}/${totalTasks} việc` : `Done ${completedTasks}/${totalTasks} tasks`, 
            icon: CheckCircle2, 
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/60',
            glow: 'bg-indigo-500/12 dark:bg-indigo-400/10',
            bar: 'from-blue-500 to-cyan-500',
            progress: completionPercentage
          },
          { 
            label: t('dashboardTasksInProgress') || 'Việc đang thực hiện', 
            value: (inProgressTasks + reviewTasks).toString(), 
            detail: locale === 'vi' ? `${inProgressTasks} đang làm · ${reviewTasks} đang duyệt` : `${inProgressTasks} in progress · ${reviewTasks} in review`, 
            icon: Activity, 
            color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/60',
            glow: 'bg-amber-400/15 dark:bg-amber-400/10',
            bar: 'from-amber-400 to-orange-500',
            progress: totalTasks ? Math.round(((inProgressTasks + reviewTasks) / totalTasks) * 100) : 0
          },
          { 
            label: locale === 'vi' ? 'Thời gian đã ghi nhận' : 'Logged time',
            value: `${metrics.totalLogged.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}h`,
            detail: locale === 'vi' ? `Ước tính: ${metrics.totalEstimated.toLocaleString('vi-VN')}h` : `Estimated: ${metrics.totalEstimated.toLocaleString('en-US')}h`,
            icon: Clock, 
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/60',
            glow: 'bg-emerald-400/15 dark:bg-emerald-400/10',
            bar: 'from-emerald-400 to-teal-500',
            progress: metrics.totalEstimated > 0 ? Math.min(100, Math.round((metrics.totalLogged / metrics.totalEstimated) * 100)) : 0
          },
          { 
            label: locale === 'vi' ? 'Tài liệu & Đội ngũ' : 'Docs & Team', 
            value: docs.length.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'),
            detail: locale === 'vi' ? `${members.length} thành viên · ${onlineMembersCount} trực tuyến` : `${members.length} members · ${onlineMembersCount} online`,
            icon: FileText, 
            color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200/60 dark:border-cyan-800/60',
            glow: 'bg-cyan-400/15 dark:bg-cyan-400/10',
            bar: 'from-cyan-400 to-sky-500',
            progress: members.length ? Math.round((onlineMembersCount / members.length) * 100) : 0
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.01 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 180, damping: 20 }}
            className="group relative min-h-[154px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/95 p-5 text-left shadow-[0_18px_55px_-36px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-colors hover:border-indigo-300/80 hover:shadow-[0_22px_60px_-32px_rgba(79,70,229,0.38)] dark:border-slate-800/90 dark:bg-[#0d0f18]/95 dark:hover:border-indigo-800/80 sm:p-6"
          >
            <div className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${card.glow}`} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tabular-nums text-slate-300 dark:text-slate-700">0{i + 1}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{card.label}</span>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-[13px] border shadow-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105 ${card.color}`}>
                <card.icon className="h-[17px] w-[17px]" />
              </div>
            </div>
            
            <div className="relative mt-4 space-y-2.5">
              <motion.span
                key={card.value}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="block text-[2rem] font-black leading-none tracking-[-0.04em] text-slate-950 dark:text-white md:text-[2.15rem]"
              >
                {card.value}
              </motion.span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{card.detail}</p>
              
              {/* Mini progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/90">
                <motion.div
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${card.progress}%` }}
                  transition={{ delay: 0.18 + i * 0.06, duration: 0.7, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${card.bar}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Interactive Productivity Charts Grid ── */}
      {totalTasks === 0 ? (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1 }}
          className="space-y-3 rounded-[28px] border border-dashed border-indigo-200/80 bg-gradient-to-br from-blue-50/60 via-white to-sky-50/50 p-8 text-center shadow-inner dark:border-indigo-900/60 dark:from-blue-950/20 dark:via-[#0d0f18] dark:to-sky-950/20 md:p-12"
        >
          <ListTodo className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto animate-bounce" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{t('noTasksFound') || 'Chưa có dữ liệu phân tích'}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {locale === 'vi' ? 'Tạo công việc đầu tiên để Home bắt đầu tổng hợp dữ liệu thực tế.' : 'Create the first task to start building this live overview.'}
          </p>
          <button 
            onClick={() => onNavigate('tasks')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {t('createTaskBtn') || 'Tạo nhiệm vụ đầu tiên'}
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          
          {/* Weekly Performance Analytics Area Chart (8 Cols) */}
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 140, damping: 22 }}
            className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-white/95 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#0d0f18]/95 sm:p-6 lg:col-span-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('dashboardWeeklyProgress') || 'Phân tích hiệu năng năng suất'}</span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{locale === 'vi' ? 'Số công việc được tạo và hoàn thành theo thời điểm đã lưu' : 'Tasks created and completed using their stored timestamps'}</p>
              </div>

              {/* Selector Tabs */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold shrink-0">
                <button
                  onClick={() => setActiveMetricTab('progress')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeMetricTab === 'progress' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {locale === 'vi' ? 'Tuần này' : 'This week'}
                </button>
                {memberEffortData.length > 0 && (
                  <button
                    onClick={() => setActiveMetricTab('priority')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeMetricTab === 'priority' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    {locale === 'vi' ? 'Nỗ lực thành viên' : 'Member Effort'}
                  </button>
                )}
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-[240px] w-full pt-5 sm:h-[280px] sm:pt-6">
              <ResponsiveContainer width="100%" height="100%">
                {activeMetricTab === 'progress' ? (
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weeklyDone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="weeklyCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area name={t('dashboardCompleted') || 'Đã hoàn thành'} type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#weeklyDone)" />
                    <Area name={t('dashboardCreated') || 'Đã tạo mới'} type="monotone" dataKey="created" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#weeklyCreated)" />
                  </AreaChart>
                ) : (
                  <BarChart data={memberEffortData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar name={locale === 'vi' ? 'Kế hoạch (giờ)' : 'Estimated (h)'} dataKey="estimated" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar name={locale === 'vi' ? 'Thực tế (giờ)' : 'Logged (h)'} dataKey="logged" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Status Breakdown Donut Chart (4 Cols) */}
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, type: 'spring', stiffness: 140, damping: 22 }}
            className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-white/95 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#0d0f18]/95 sm:p-6 lg:col-span-4"
          >
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <PieIcon className="w-3.5 h-3.5" />
                </div>
                <span>{t('dashboardTaskStatusBreakdown') || 'Phân bổ trạng thái'}</span>
              </h3>
            </div>

            <div className="relative my-4 flex justify-center items-center">
              <div className="w-[170px] h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData.length > 0 ? statusData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={800}
                    >
                      {(statusData.length > 0 ? statusData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{totalTasks}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">TỔNG CÔNG VIỆC</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-mono font-extrabold">{item.value} ({Math.round((item.value / totalTasks) * 100)}%)</span>
                </div>
              ))}
            </div>
          </motion.section>

        </div>
      )}

      {/* ── Bottom Section: 30-Day Velocity & Urgent Action Items ── */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          
          {/* Team Velocity Over 30 Days (8 Columns) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 140, damping: 22 }}
            className="flex flex-col justify-between space-y-4 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/30 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] dark:border-slate-800/90 dark:from-[#0d0f18] dark:via-[#0d0f18] dark:to-indigo-950/20 sm:p-6 lg:col-span-8"
          >
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span>{locale === 'vi' ? 'Công việc hoàn thành trong 30 ngày' : 'Tasks completed in the last 30 days'}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">{locale === 'vi' ? 'Chỉ tính công việc có thời điểm hoàn thành được lưu trong hệ thống' : 'Only tasks with a stored completion timestamp are counted'}</p>
            </div>

            <div className="h-[220px] w-full pt-2 sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area name={t('dashboardVelocityTasks') || 'Công việc đã hoàn thành'} type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#velTasks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Urgent Action Items List (4 Columns) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, type: 'spring', stiffness: 140, damping: 22 }}
            className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-rose-50/40 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] dark:border-slate-800/90 dark:from-[#0d0f18] dark:via-[#0d0f18] dark:to-rose-950/20 sm:p-6 lg:col-span-4"
          >
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <span>{t('urgentLabel') || 'Nhiệm vụ khẩn cấp'}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">{locale === 'vi' ? 'Các công việc có mức ưu tiên cao cần xử lý ngay' : 'High priority tasks requiring immediate attention'}</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 my-4 pr-1 custom-scrollbar max-h-[210px]">
              {urgentTasks.length === 0 ? (
                <div className="py-8 text-center italic text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  {locale === 'vi' ? 'Không có nhiệm vụ khẩn cấp 👍' : 'No urgent tasks.'}
                </div>
              ) : (
                urgentTasks.map(task => (
                  <motion.button
                    type="button"
                    key={task.id} 
                    onClick={() => onNavigate('tasks')}
                    whileHover={prefersReducedMotion ? undefined : { x: 3 }}
                    className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-3 text-left shadow-sm transition-colors hover:border-rose-300/70 hover:bg-rose-50/60 dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:border-rose-900/70 dark:hover:bg-rose-950/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {task.title}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 font-mono uppercase">
                        {locale === 'vi' ? 'Hạn' : 'Due'}: {parseTaskDate(task.dueDate)?.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US') || (locale === 'vi' ? 'Chưa đặt' : 'Not set')}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg shrink-0 uppercase tracking-wider ${
                      task.priority === 'urgent' 
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60' 
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                    }`}>
                      {task.priority === 'urgent'
                        ? (locale === 'vi' ? 'Khẩn cấp' : 'Urgent')
                        : (locale === 'vi' ? 'Cao' : 'High')}
                    </span>
                  </motion.button>
                ))
              )}
            </div>

            <button 
              onClick={() => onNavigate('tasks')}
              className="w-full rounded-xl border border-slate-200/70 bg-white/70 py-2.5 text-center text-xs font-extrabold text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
            >
              {locale === 'vi' ? 'Xem tất cả nhiệm vụ' : 'View all tasks'}
            </button>
          </motion.div>

        </div>
      )}

      {/* ── Weekly AI Productivity Insight Report Widget ── */}
      {totalTasks > 0 && <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 130, damping: 22 }}
        className="relative space-y-6 overflow-hidden rounded-[30px] border border-indigo-200/70 bg-[linear-gradient(145deg,#ffffff_0%,#fafaff_55%,#f5f3ff_100%)] p-5 text-left shadow-[0_24px_70px_-42px_rgba(79,70,229,0.55)] dark:border-indigo-900/60 dark:bg-[linear-gradient(145deg,#0d0f18_0%,#111326_55%,#17112b_100%)] sm:p-6 md:p-8"
        id="weekly_productivity_insight_report_widget"
      >
        <motion.div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-blue-400/20 via-sky-400/15 to-cyan-400/10 blur-3xl"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.12, 1], rotate: [0, 12, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative z-10 flex items-start gap-3 sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/70 bg-white/80 text-indigo-600 shadow-sm backdrop-blur-xl dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="flex flex-wrap items-center gap-2 text-base font-black tracking-tight text-slate-950 dark:text-white md:text-lg">
                <span>{t('dashboardSmartReport') || 'Báo cáo Năng suất thông minh AI'}</span>
                <span className="text-[9px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                  Gemini Flash 2.5
                </span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{t('dashboardReportDesc') || 'Báo cáo đánh giá hiệu suất hoàn thành, quỹ đóng góp team và điều phối tài nguyên dự án.'}</p>
            </div>
          </div>
          
          <button
            id="btn_generate_productivity_report"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className={`relative z-10 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black shadow-md transition-all sm:w-auto ${
              isGenerating
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-105'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('dashboardGeneratingReport') || 'Đang phân tích bối cảnh...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>{t('dashboardGenerateReport') || 'Khởi tạo báo cáo AI'}</span>
              </>
            )}
          </button>
        </div>

        {/* Live Mathematical Indicators */}
        <div className="relative z-10 grid grid-cols-1 gap-4 rounded-[22px] border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35 sm:grid-cols-2 sm:p-5 md:grid-cols-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{t('dashboardChartCompletedTasks') || 'Hoàn thành công việc'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {completedTasks} / {totalTasks} {locale === 'vi' ? 'Việc' : 'Tasks'}
            </span>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="space-y-1 border-l-0 sm:border-l border-slate-200/60 dark:border-slate-800/60 sm:pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Thời gian đã ghi nhận' : 'Logged time'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {metrics.totalLogged.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} {locale === 'vi' ? 'giờ' : 'hours'}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">{locale === 'vi' ? 'Tổng theo dữ liệu chấm công' : 'Total from tracked time'}</span>
          </div>
          <div className="space-y-1 border-l-0 md:border-l border-slate-200/60 dark:border-slate-800/60 md:pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Độ chuẩn xác ước tính' : 'Estimation accuracy'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {metrics.totalEstimated
                ? `${Math.min(100, Math.round((Math.min(metrics.totalLogged, metrics.totalEstimated) / Math.max(metrics.totalLogged, metrics.totalEstimated)) * 100))}%`
                : '0%'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-1">{locale === 'vi' ? 'Sai số ước lượng thời gian' : 'Time estimation error'}</span>
          </div>
          <div className="space-y-1 border-l-0 md:border-l border-slate-200/60 dark:border-slate-800/60 md:pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Thành viên được phân công' : 'Assigned members'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {metrics.assignedMemberCount} / {members.length} {locale === 'vi' ? 'thành viên' : 'members'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">{locale === 'vi' ? 'Tính theo người nhận việc hiện tại' : 'Based on current assignees'}</span>
          </div>
        </div>

        {/* Content of the AI Report */}
        {reportText ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-6 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 relative overflow-hidden space-y-4 text-left shadow-xs"
          >
            <div className="absolute top-0 right-0 p-3 text-[9px] font-mono text-indigo-500 dark:text-indigo-400 uppercase font-black flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 rounded-bl-xl border-l border-b border-indigo-200/40 dark:border-indigo-800/40">
              <Bot className="w-3.5 h-3.5 animate-bounce" />
              <span>Bản nháp do AI Apexa tạo</span>
            </div>
            
            <div className="prose max-w-none pt-2">
              {renderMarkdown(reportText)}
            </div>

            <div className="flex justify-end pt-3 border-t border-indigo-200/40 dark:border-indigo-900/40">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(reportText);
                  if (onAddSyncLog) {
                    onAddSyncLog(locale === 'vi' ? "Đã sao chép nội dung báo cáo tuần vào Clipboard!" : "Copied weekly report to Clipboard!");
                  }
                  triggerToast?.('success', locale === 'vi' ? 'Đã sao chép báo cáo' : 'Report Copied', locale === 'vi' ? 'Đã sao chép nội dung báo cáo vào bộ nhớ tạm.' : 'Report content copied to clipboard.');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                {locale === 'vi' ? 'Sao chép báo cáo' : 'Copy Report'}
              </button>
            </div>
          </motion.div>
        ) : reportError ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{reportError}</span>
          </div>
        ) : null}
      </motion.div>}

    </div>
  );
}

const MemoizedDashboardOverview = React.memo(DashboardOverview);
export default MemoizedDashboardOverview;
export { DashboardOverview };
