"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Task, User, SyncLog, Document } from '../types';
import { 
  CheckCircle2, TrendingUp,
  Activity, FileText, Bot, Clock, Sparkles, AlertCircle,
  PieChart as PieIcon, ListTodo, Flame, Zap, X, Database, WifiOff, ArrowUpRight, Calendar,
  UserRound, UsersRound, Pin, ArrowRight, Settings2, Download, LockKeyhole,
  Crown, BarChart3, LineChart, ShieldCheck, Target, CalendarDays, RotateCcw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useTranslation } from '../contexts/TranslationContext';
import { callAiApi } from '@/lib/aiClient';
import { SegmentedControl } from '@/components/ui';

type DashboardScope = 'workspace' | 'mine';
type DashboardRange = 7 | 30 | 90;
type DashboardChartMode = 'area' | 'bar';
type DashboardWidgetKey = 'focus' | 'kpis' | 'charts' | 'execution' | 'ai';

const DEFAULT_DASHBOARD_WIDGETS: Record<DashboardWidgetKey, boolean> = {
  focus: true,
  kpis: true,
  charts: true,
  execution: true,
  ai: true,
};

interface DashboardOverviewProps {
  tasks: Task[];
  members: User[];
  docs: Document[];
  syncLogs: SyncLog[];
  isOffline: boolean;
  onNavigate: (tab: string) => void;
  onOpenTask?: (taskId: string) => void;
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
  onOpenTask,
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
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>('workspace');
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>(30);
  const [chartMode, setChartMode] = useState<DashboardChartMode>('area');
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<DashboardWidgetKey, boolean>>(DEFAULT_DASHBOARD_WIDGETS);

  useEffect(() => {
    try {
      const savedScope = localStorage.getItem('apexa_dashboard_scope');
      if (savedScope === 'workspace' || savedScope === 'mine') setDashboardScope(savedScope);
      const savedPreferences = localStorage.getItem('apexa_dashboard_preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        if ([7, 30, 90].includes(preferences.range)) setDashboardRange(preferences.range);
        if (preferences.chartMode === 'area' || preferences.chartMode === 'bar') setChartMode(preferences.chartMode);
        if (preferences.widgets) {
          setVisibleWidgets({ ...DEFAULT_DASHBOARD_WIDGETS, ...preferences.widgets });
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('apexa_dashboard_preferences', JSON.stringify({
        range: dashboardRange,
        chartMode,
        widgets: visibleWidgets,
      }));
    } catch (e) {}
  }, [chartMode, dashboardRange, visibleWidgets]);

  const currentUserIds = useMemo(() => new Set(
    [currentUser?.id, currentUser?.userId].filter(Boolean) as string[]
  ), [currentUser?.id, currentUser?.userId]);

  const isAssignedToCurrentUser = useCallback((task: Task) => {
    if (currentUserIds.size === 0) return false;
    if (task.assigneeId && currentUserIds.has(task.assigneeId)) return true;
    return task.assigneeIds?.some((assigneeId) => currentUserIds.has(assigneeId)) || false;
  }, [currentUserIds]);

  const personalTaskCount = useMemo(
    () => tasks.filter(isAssignedToCurrentUser).length,
    [isAssignedToCurrentUser, tasks]
  );

  const scopedTasks = useMemo(
    () => dashboardScope === 'mine' ? tasks.filter(isAssignedToCurrentUser) : tasks,
    [dashboardScope, isAssignedToCurrentUser, tasks]
  );

  const handleScopeChange = (scope: DashboardScope) => {
    setDashboardScope(scope);
    try { localStorage.setItem('apexa_dashboard_scope', scope); } catch (e) {}
  };

  const handleRangeChange = (range: DashboardRange) => {
    if (range === 90 && !currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setDashboardRange(range);
  };

  const toggleWidget = (widget: DashboardWidgetKey) => {
    setVisibleWidgets((current) => ({ ...current, [widget]: !current[widget] }));
  };

  const resetDashboardPreferences = () => {
    setDashboardRange(30);
    setChartMode('area');
    setVisibleWidgets(DEFAULT_DASHBOARD_WIDGETS);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã đặt lại Dashboard' : 'Dashboard reset',
      locale === 'vi' ? 'Bố cục và bộ lọc đã trở về mặc định.' : 'Layout and filters were restored to defaults.',
    );
  };

  const exportDashboardCsv = () => {
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Start date', 'Due date', 'Estimated hours', 'Logged hours'];
    const memberMap = new Map(members.map((member) => [member.id, member.name]));
    const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = scopedTasks.map((task) => [
      task.id,
      task.title,
      task.status,
      task.priority,
      memberMap.get(task.assigneeId || '') || '',
      task.startDate || '',
      task.dueDate || '',
      task.hoursEstimate || 0,
      task.hoursLogged || 0,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `apexa-dashboard-${getLocalDateKey(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã xuất dữ liệu' : 'Export complete',
      locale === 'vi' ? `${scopedTasks.length} công việc đã được xuất ra CSV.` : `${scopedTasks.length} tasks were exported to CSV.`,
    );
  };

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

    scopedTasks.forEach((task) => {
      if (task.status === 'completed') return;
      const dueDate = parseTaskDate(task.dueDate, true);
      if (!dueDate) return;
      if (dueDate.getTime() < now) overdue.push(task);
      else if (dueDate.getTime() <= dueSoonThreshold) dueSoon.push(task);
    });

    return { briefingTasks: dueSoon, overdueTasks: overdue };
  }, [scopedTasks]);

  const handleGenerateReport = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setIsGenerating(true);
    setReportError('');
    try {
      const response = await callAiApi('/api/ai/productivity-report', { tasks: scopedTasks, members });
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
      setReportError(err.message || (locale === 'vi' ? "Không thể kết nối Apexa AI. Vui lòng thử lại hoặc kiểm tra gói đăng ký." : "Could not connect to Apexa AI. Please retry or check your subscription."));
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
          const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
          if (numMatch) {
            const num = numMatch[1];
            const content = numMatch[2];
            const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
            return (
              <div key={i} className="flex gap-2 ml-1 items-start text-xs">
                <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-[9.5px] font-black flex items-center justify-center shadow-3xs mt-0.5 select-none font-sans">
                  {num}
                </span>
                <span className="flex-1 pt-0.5">
                  {boldMatch ? (
                    <>
                      <strong className="text-slate-900 dark:text-white font-bold">{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </>
                  ) : (
                    content
                  )}
                </span>
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
    const completed = scopedTasks.filter((task) => task.status === 'completed').length;
    const inProgress = scopedTasks.filter((task) => task.status === 'inprogress').length;
    const review = scopedTasks.filter((task) => task.status === 'review').length;
    const todo = scopedTasks.filter((task) => task.status === 'todo').length;
    const totalEstimated = scopedTasks.reduce((sum, task) => sum + Number(task.hoursEstimate || 0), 0);
    const totalLogged = scopedTasks.reduce((sum, task) => sum + Number(task.hoursLogged || 0), 0);
    const workspaceMemberIds = new Set(members.map((member) => member.id));
    const assignedMemberIds = new Set<string>();

    scopedTasks.forEach((task) => {
      if (task.assigneeId && workspaceMemberIds.has(task.assigneeId)) assignedMemberIds.add(task.assigneeId);
      task.assigneeIds?.forEach((memberId) => {
        if (workspaceMemberIds.has(memberId)) assignedMemberIds.add(memberId);
      });
    });

    return {
      total: scopedTasks.length,
      completed,
      inProgress,
      review,
      todo,
      totalEstimated,
      totalLogged,
      assignedMemberCount: assignedMemberIds.size,
    };
  }, [members, scopedTasks]);

  const totalTasks = metrics.total;
  const completedTasks = metrics.completed;
  const inProgressTasks = metrics.inProgress;
  const reviewTasks = metrics.review;
  const todoTasks = metrics.todo;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const weeklyData = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    return Array.from({ length: dashboardRange }, (_, index) => {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (dashboardRange - 1 - index));
      const dateKey = getLocalDateKey(targetDate);
      return {
        name: targetDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
          day: '2-digit',
          month: dashboardRange === 7 ? undefined : '2-digit',
          weekday: dashboardRange === 7 ? 'short' : undefined,
        }),
        fullDate: targetDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        created: scopedTasks.filter((task) => {
          const createdAt = parseTaskDate(task.createdAt);
          return createdAt ? getLocalDateKey(createdAt) === dateKey : false;
        }).length,
        completed: scopedTasks.filter((task) => {
          if (task.status !== 'completed' || !task.completedAt) return false;
          const completedAt = parseTaskDate(task.completedAt);
          return completedAt ? getLocalDateKey(completedAt) === dateKey : false;
        }).length,
      };
    });
  }, [dashboardRange, locale, scopedTasks]);

  const velocityData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: dashboardRange }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (dashboardRange - 1 - index));
      const dateKey = getLocalDateKey(date);
      return {
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        completed: scopedTasks.filter((task) => {
          if (task.status !== 'completed' || !task.completedAt) return false;
          const completedAt = parseTaskDate(task.completedAt);
          return completedAt ? getLocalDateKey(completedAt) === dateKey : false;
        }).length,
      };
    });
  }, [dashboardRange, scopedTasks]);

  const memberEffortData = useMemo(() => members.map((member) => {
    const memberTasks = scopedTasks.filter((task) => (
      task.assigneeId === member.id || task.assigneeIds?.includes(member.id)
    ));
    return {
      name: member.name.split(' ')[0],
      estimated: memberTasks.reduce((sum, task) => sum + Number(task.hoursEstimate || 0), 0),
      logged: memberTasks.reduce((sum, task) => sum + Number(task.hoursLogged || 0), 0),
    };
  }).filter((item) => item.estimated > 0 || item.logged > 0), [members, scopedTasks]);

  const statusData = useMemo(() => [
    { name: locale === 'vi' ? 'Cần làm' : 'To do', value: todoTasks, color: '#6366f1' },
    { name: locale === 'vi' ? 'Đang thực hiện' : 'In progress', value: inProgressTasks, color: '#f59e0b' },
    { name: locale === 'vi' ? 'Đang duyệt' : 'In review', value: reviewTasks, color: '#a855f7' },
    { name: locale === 'vi' ? 'Đã hoàn thành' : 'Completed', value: completedTasks, color: '#10b981' },
  ].filter((item) => item.value > 0), [completedTasks, inProgressTasks, locale, reviewTasks, todoTasks]);

  const weeklySummary = useMemo(() => {
    const totalCreated = weeklyData.reduce((sum, item) => sum + item.created, 0);
    const totalCompleted = weeklyData.reduce((sum, item) => sum + item.completed, 0);
    return { totalCreated, totalCompleted };
  }, [weeklyData]);

  const periodInsights = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - (dashboardRange - 1));
    start.setHours(0, 0, 0, 0);
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - (dashboardRange - 1));
    previousStart.setHours(0, 0, 0, 0);

    const completedInRange = (from: Date, to: Date) => scopedTasks.filter((task) => {
      if (task.status !== 'completed' || !task.completedAt) return false;
      const completedAt = parseTaskDate(task.completedAt);
      return Boolean(completedAt && completedAt >= from && completedAt <= to);
    }).length;

    const completedCurrent = completedInRange(start, end);
    const completedPrevious = completedInRange(previousStart, previousEnd);
    const completionDelta = completedPrevious === 0
      ? (completedCurrent > 0 ? 100 : 0)
      : Math.round(((completedCurrent - completedPrevious) / completedPrevious) * 100);

    const now = Date.now();
    const dueSoonLimit = now + (7 * 24 * 60 * 60 * 1000);
    const openTasks = scopedTasks.filter((task) => task.status !== 'completed');
    const atRisk = openTasks.filter((task) => {
      const dueDate = parseTaskDate(task.dueDate, true)?.getTime();
      return task.priority === 'urgent' || Boolean(dueDate && dueDate < now);
    }).length;
    const dueSoon = openTasks.filter((task) => {
      const dueDate = parseTaskDate(task.dueDate, true)?.getTime();
      return Boolean(dueDate && dueDate >= now && dueDate <= dueSoonLimit);
    }).length;
    const unassigned = openTasks.filter((task) => !task.assigneeId && (!task.assigneeIds || task.assigneeIds.length === 0)).length;
    const noDueDate = openTasks.filter((task) => !task.dueDate).length;
    const cycleTimes = scopedTasks.flatMap((task) => {
      if (!task.createdAt || !task.completedAt) return [];
      const createdAt = parseTaskDate(task.createdAt);
      const completedAt = parseTaskDate(task.completedAt);
      if (!createdAt || !completedAt || completedAt < createdAt) return [];
      return [(completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)];
    });

    return {
      completedCurrent,
      completedPrevious,
      completionDelta,
      atRisk,
      dueSoon,
      unassigned,
      noDueDate,
      averageCycleDays: cycleTimes.length
        ? Math.round((cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length) * 10) / 10
        : 0,
    };
  }, [dashboardRange, scopedTasks]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const displayLabel = payload[0]?.payload?.fullDate || label;
      return (
        <div className="bg-slate-950/95 dark:bg-slate-900/95 border border-slate-700/80 p-3 rounded-2xl shadow-2xl space-y-1.5 backdrop-blur-xl z-50 text-left min-w-[150px]">
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
            <Calendar className="w-3 h-3 text-indigo-400" />
            <p className="text-[10.5px] font-black text-slate-300 uppercase tracking-wider">{displayLabel}</p>
          </div>
          <div className="space-y-1.5 pt-0.5">
            {payload.map((item: any, idx: number) => {
              const isHours = item.name?.includes('Giờ') || item.name?.toLowerCase().includes('hour');
              return (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <span className="w-2 h-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color || item.fill }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="text-white font-mono font-black text-xs px-1.5 py-0.2 rounded bg-white/10 shrink-0">
                    {item.value} {isHours ? 'h' : (locale === 'vi' ? 'việc' : 'tasks')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const urgentTasks = useMemo(() => scopedTasks
    .filter((task) => task.status !== 'completed' && (task.priority === 'urgent' || task.priority === 'high'))
    .sort((first, second) => {
      const firstDue = parseTaskDate(first.dueDate, true)?.getTime() ?? Number.POSITIVE_INFINITY;
      const secondDue = parseTaskDate(second.dueDate, true)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (firstDue !== secondDue) return firstDue - secondDue;
      return first.priority === 'urgent' ? -1 : 1;
    })
    .slice(0, 5), [scopedTasks]);

  const focusTasks = useMemo(() => {
    const nowTime = Date.now();
    return scopedTasks
      .filter((task) => task.status !== 'completed')
      .map((task) => {
        const dueTime = parseTaskDate(task.dueDate, true)?.getTime();
        let score = task.status === 'inprogress' ? 22 : task.status === 'review' ? 15 : 0;
        if (task.isPinned) score += 18;
        if (task.priority === 'urgent') score += 42;
        else if (task.priority === 'high') score += 28;
        else if (task.priority === 'medium') score += 12;
        if (dueTime) {
          const hoursUntilDue = (dueTime - nowTime) / (60 * 60 * 1000);
          if (hoursUntilDue < 0) score += 100;
          else if (hoursUntilDue <= 24) score += 72;
          else if (hoursUntilDue <= 72) score += 38;
        }
        return { task, score, dueTime };
      })
      .sort((first, second) => second.score - first.score || (first.dueTime ?? Number.POSITIVE_INFINITY) - (second.dueTime ?? Number.POSITIVE_INFINITY))
      .slice(0, 3)
      .map(({ task }) => task);
  }, [scopedTasks]);

  const onlineMembersCount = useMemo(() => members.filter((member) => member.status === 'online').length, [members]);
  
  // Real-time dynamic clock state to update greeting and time-of-day accurately
  const [currentDateTime, setCurrentDateTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  const { greetingIcon, greeting } = useMemo(() => {
    const currentHour = currentDateTime.getHours();
    
    // 05:00 - 10:59: Buổi sáng
    if (currentHour >= 5 && currentHour < 11) {
      return {
        greetingIcon: '🌅',
        greeting: locale === 'vi' ? 'Chào buổi sáng' : 'Good morning'
      };
    }
    
    // 11:00 - 13:59: Buổi trưa
    if (currentHour >= 11 && currentHour < 14) {
      return {
        greetingIcon: '☀️',
        greeting: locale === 'vi' ? 'Chào buổi trưa' : 'Good day'
      };
    }
    
    // 14:00 - 17:59: Buổi chiều
    if (currentHour >= 14 && currentHour < 18) {
      return {
        greetingIcon: '🌤️',
        greeting: locale === 'vi' ? 'Chào buổi chiều' : 'Good afternoon'
      };
    }
    
    // 18:00 - 21:59: Buổi tối
    if (currentHour >= 18 && currentHour < 22) {
      return {
        greetingIcon: '🌙',
        greeting: locale === 'vi' ? 'Chào buổi tối' : 'Good evening'
      };
    }
    
    // 22:00 - 04:59: Đêm muộn
    return {
      greetingIcon: '🌌',
      greeting: locale === 'vi' ? 'Chào buổi tối' : 'Good evening'
    };
  }, [currentDateTime, locale]);

  if (isLoading && !isOffline) {
    return (
      <div className="min-h-full w-full bg-transparent p-5 text-slate-800 dark:text-slate-100 md:p-8" role="status" aria-live="polite">
        <span className="sr-only">{locale === 'vi' ? 'Đang tải dữ liệu Home' : 'Loading Home data'}</span>
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
    <div className="mx-auto flex min-h-full w-full max-w-[1800px] select-none flex-col space-y-4 sm:space-y-6 lg:space-y-8 overflow-x-hidden bg-transparent px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 text-slate-800 dark:text-slate-100">
      
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
              onClick={() => onNavigate('calendar')}
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
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
        className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-white/[0.08] bg-gradient-to-br from-white/95 via-slate-50/80 to-indigo-50/25 dark:from-[#181818]/95 dark:via-[#121212]/90 dark:to-indigo-950/20 p-6 sm:p-7 md:flex-row md:items-center md:p-8 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_50px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-left"
      >
        {/* Organic ambient light gradients */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute -bottom-24 left-[40%] h-60 w-60 rounded-full bg-indigo-300/15 blur-3xl dark:bg-indigo-500/10" />
        
        <div className="relative z-10 flex-1 min-w-0 space-y-1.5">
          {/* Heading */}
          <h1 className="text-xl sm:text-2xl md:text-[26px] lg:text-[28px] xl:text-[32px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
            <span className="mr-2 inline-block shrink-0">{greetingIcon}</span>
            <span className="inline whitespace-nowrap">{greeting}, </span>
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 dark:from-indigo-400 dark:via-sky-300 dark:to-cyan-300 bg-clip-text text-transparent inline">
              {currentUser?.name || (locale === 'vi' ? 'bạn' : 'there')}
            </span>
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-zinc-400 sm:text-[14.5px]">
            {locale === 'vi'
              ? dashboardScope === 'mine'
                ? `Không gian ưu tiên cá nhân của bạn trong ${workspaceName || 'workspace hiện tại'}.`
                : `Tổng quan trực tiếp của ${workspaceName || 'không gian làm việc hiện tại'}, được tính từ dữ liệu đã lưu.`
              : dashboardScope === 'mine'
                ? `Your personal priority view in ${workspaceName || 'the current workspace'}.`
                : `Live overview for ${workspaceName || 'the current workspace'}, calculated from stored data.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex w-full flex-col gap-2.5 sm:w-auto md:shrink-0">
          <SegmentedControl<DashboardScope>
            value={dashboardScope}
            onChange={handleScopeChange}
            size="sm"
            fullWidth
            layoutIdPrefix="dashboard-scope"
            className="bg-white/75 dark:bg-slate-950/55"
            options={[
              {
                id: 'mine',
                label: locale === 'vi' ? 'Của tôi' : 'My work',
                icon: UserRound,
                badge: personalTaskCount,
                disabled: currentUserIds.size === 0,
              },
              {
                id: 'workspace',
                label: locale === 'vi' ? 'Workspace' : 'Workspace',
                icon: UsersRound,
                badge: tasks.length,
              },
            ]}
          />
          <motion.button
            onClick={() => onNavigate('calendar')}
            whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.01 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all cursor-pointer group"
          >
            <CheckCircle2 className="w-4 h-4 opacity-90" />
            <span>{locale === 'vi' ? 'Quản lý nhiệm vụ' : 'Manage Tasks'}</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </motion.button>
        </div>
      </motion.div>

      {/* ── Dashboard controls ── */}
      <div className="relative z-20 flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_14px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#121212]/90 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isOffline ? (locale === 'vi' ? 'Dữ liệu cục bộ' : 'Local data') : isSynced ? (locale === 'vi' ? 'Dữ liệu đã đồng bộ' : 'Synced data') : (locale === 'vi' ? 'Dữ liệu trực tiếp' : 'Live data')}
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-900/80" aria-label={locale === 'vi' ? 'Khoảng thời gian phân tích' : 'Analytics date range'}>
            {([7, 30, 90] as DashboardRange[]).map((range) => {
              const isLocked = range === 90 && !currentUser?.isPremium;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => handleRangeChange(range)}
                  aria-pressed={dashboardRange === range}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[11px] font-black transition-all ${dashboardRange === range ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  {range} {locale === 'vi' ? 'ngày' : 'days'}
                  {isLocked && <LockKeyhole className="h-3 w-3 text-amber-500" />}
                </button>
              );
            })}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-black ${periodInsights.completionDelta >= 0 ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
            <TrendingUp className={`h-3.5 w-3.5 ${periodInsights.completionDelta < 0 ? 'rotate-180' : ''}`} />
            {periodInsights.completionDelta >= 0 ? '+' : ''}{periodInsights.completionDelta}% {locale === 'vi' ? 'so với kỳ trước' : 'vs previous period'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => setChartMode('area')} aria-label={locale === 'vi' ? 'Biểu đồ đường' : 'Area chart'} aria-pressed={chartMode === 'area'} className={`grid h-8 w-8 place-items-center rounded-lg transition ${chartMode === 'area' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><LineChart className="h-4 w-4" /></button>
            <button type="button" onClick={() => setChartMode('bar')} aria-label={locale === 'vi' ? 'Biểu đồ cột' : 'Bar chart'} aria-pressed={chartMode === 'bar'} className={`grid h-8 w-8 place-items-center rounded-lg transition ${chartMode === 'bar' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><BarChart3 className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={exportDashboardCsv} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-black text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700">
            <Download className="h-4 w-4" /> {locale === 'vi' ? 'Xuất CSV' : 'Export CSV'}
          </button>
          {!currentUser?.isPremium && (
            <button type="button" onClick={onUpgradePremium} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3.5 text-[11px] font-black text-white shadow-md shadow-orange-500/20 transition hover:brightness-105">
              <Crown className="h-4 w-4" /> {locale === 'vi' ? 'Mở khoá Analytics Pro' : 'Unlock Analytics Pro'}
            </button>
          )}
          <div className="relative">
            <button type="button" onClick={() => setShowDashboardSettings((current) => !current)} aria-expanded={showDashboardSettings} aria-haspopup="menu" className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[11px] font-black shadow-sm transition ${showDashboardSettings ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>
              <Settings2 className="h-4 w-4" /> {locale === 'vi' ? 'Tuỳ chỉnh' : 'Customize'}
            </button>
            {showDashboardSettings && (
              <div role="menu" className="absolute right-0 top-12 z-50 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div><p className="text-xs font-black text-slate-900 dark:text-white">{locale === 'vi' ? 'Bố cục Dashboard' : 'Dashboard layout'}</p><p className="text-[10px] text-slate-400">{locale === 'vi' ? 'Ẩn hoặc hiện từng khu vực' : 'Show or hide each section'}</p></div>
                  <button type="button" onClick={resetDashboardPreferences} title={locale === 'vi' ? 'Đặt lại' : 'Reset'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-1">
                  {([
                    ['focus', locale === 'vi' ? 'Hàng ưu tiên' : 'Priority queue'],
                    ['kpis', locale === 'vi' ? 'Chỉ số tổng quan' : 'Overview metrics'],
                    ['charts', locale === 'vi' ? 'Biểu đồ hiệu suất' : 'Performance charts'],
                    ['execution', locale === 'vi' ? 'Vận tốc & cảnh báo' : 'Velocity & alerts'],
                    ['ai', locale === 'vi' ? 'Báo cáo AI' : 'AI report'],
                  ] as [DashboardWidgetKey, string][]).map(([key, label]) => (
                    <button key={key} type="button" role="menuitemcheckbox" aria-checked={visibleWidgets[key]} onClick={() => toggleWidget(key)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                      <span>{label}</span><span className={`relative h-5 w-9 rounded-full transition ${visibleWidgets[key] ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${visibleWidgets[key] ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Priority command queue ── */}
      {visibleWidgets.focus && <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 150, damping: 22 }}
        className="relative overflow-hidden rounded-[26px] border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 p-4 shadow-[0_20px_55px_-40px_rgba(79,70,229,0.65)] dark:border-indigo-900/55 dark:from-indigo-950/25 dark:via-[#121212] dark:to-sky-950/20 sm:p-5"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10" />
        <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/80 bg-white/80 text-indigo-600 shadow-sm dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-950 dark:text-white sm:text-base">
                {locale === 'vi' ? 'Hàng ưu tiên tiếp theo' : 'Your next priority queue'}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {locale === 'vi'
                  ? 'Tự động xếp theo hạn chót, độ ưu tiên, trạng thái và công việc đã ghim.'
                  : 'Automatically ranked by due date, priority, status and pinned work.'}
              </p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-200/70 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-600 dark:border-indigo-800/70 dark:bg-slate-950/50 dark:text-indigo-300">
            <ListTodo className="h-3.5 w-3.5" />
            {focusTasks.length} / {scopedTasks.filter((task) => task.status !== 'completed').length} {locale === 'vi' ? 'việc đang mở' : 'open'}
          </div>
        </div>

        {focusTasks.length > 0 ? (
          <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-3">
            {focusTasks.map((task, index) => {
              const dueDate = parseTaskDate(task.dueDate, true);
              const isOverdue = Boolean(dueDate && dueDate.getTime() < Date.now());
              const dueLabel = dueDate
                ? isOverdue
                  ? (locale === 'vi' ? 'Quá hạn' : 'Overdue')
                  : dueDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' })
                : (locale === 'vi' ? 'Chưa có hạn' : 'No due date');
              const priorityLabel = task.priority === 'urgent'
                ? (locale === 'vi' ? 'Khẩn cấp' : 'Urgent')
                : task.priority === 'high'
                  ? (locale === 'vi' ? 'Cao' : 'High')
                  : task.priority === 'medium'
                    ? (locale === 'vi' ? 'Trung bình' : 'Medium')
                    : (locale === 'vi' ? 'Thấp' : 'Low');

              return (
                <motion.button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask ? onOpenTask(task.id) : onNavigate('calendar')}
                  whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  className="group flex min-h-[136px] flex-col rounded-[20px] border border-white/90 bg-white/85 p-4 text-left shadow-[0_14px_35px_-28px_rgba(15,23,42,0.7)] transition-colors hover:border-indigo-300 hover:bg-white dark:border-slate-800/90 dark:bg-slate-950/60 dark:hover:border-indigo-800 dark:hover:bg-slate-950/85"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-black tabular-nums text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">0{index + 1}</span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                        task.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/45 dark:text-rose-300'
                          : task.priority === 'high'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/45 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                      }`}>{priorityLabel}</span>
                    </div>
                    {task.isPinned && <Pin className="h-3.5 w-3.5 rotate-45 text-indigo-400" />}
                  </div>
                  <p className="mt-3 line-clamp-2 flex-1 text-sm font-extrabold leading-snug text-slate-850 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300">
                    {task.title}
                  </p>
                  <div className="mt-3 flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[10px] font-bold dark:border-slate-800/80">
                    <span className={`inline-flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      {dueLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                      {locale === 'vi' ? 'Mở công việc' : 'Open task'}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center rounded-[20px] border border-dashed border-emerald-300/70 bg-emerald-50/65 px-5 py-8 text-center dark:border-emerald-900/70 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            <p className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">
              {locale === 'vi' ? 'Hàng ưu tiên đang trống' : 'Your priority queue is clear'}
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {dashboardScope === 'mine'
                ? (locale === 'vi' ? 'Bạn chưa được giao công việc đang mở nào trong workspace này.' : 'No open tasks are assigned to you in this workspace.')
                : (locale === 'vi' ? 'Không còn công việc đang mở cần xử lý.' : 'There are no open tasks left to handle.')}
            </p>
            {dashboardScope === 'mine' && (
              <button type="button" onClick={() => handleScopeChange('workspace')} className="mt-3 text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
                {locale === 'vi' ? 'Xem toàn workspace' : 'View the whole workspace'}
              </button>
            )}
          </div>
        )}
      </motion.section>}

      {/* ── 4 Hero KPI Cards ── */}
      {visibleWidgets.kpis && <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
            className="group relative min-h-[154px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/95 p-5 text-left shadow-[0_18px_55px_-36px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-colors hover:border-indigo-300/80 hover:shadow-[0_22px_60px_-32px_rgba(79,70,229,0.38)] dark:border-slate-800/90 dark:bg-[#121212]/95 dark:hover:border-indigo-800/80 sm:p-6"
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
      </div>}

      {visibleWidgets.kpis && totalTasks > 0 && (
        <section className="grid grid-cols-2 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/90 shadow-[0_14px_42px_-34px_rgba(15,23,42,0.5)] dark:border-slate-800/90 dark:bg-[#121212]/90 md:grid-cols-5" aria-label={locale === 'vi' ? 'Sức khoẻ công việc' : 'Task health'}>
          {[
            { label: locale === 'vi' ? 'Có rủi ro' : 'At risk', value: periodInsights.atRisk, detail: locale === 'vi' ? 'Quá hạn hoặc khẩn cấp' : 'Overdue or urgent', icon: AlertCircle, tone: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/35' },
            { label: locale === 'vi' ? 'Đến hạn 7 ngày' : 'Due in 7 days', value: periodInsights.dueSoon, detail: locale === 'vi' ? 'Cần lên kế hoạch' : 'Needs planning', icon: CalendarDays, tone: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/35' },
            { label: locale === 'vi' ? 'Chưa phân công' : 'Unassigned', value: periodInsights.unassigned, detail: locale === 'vi' ? 'Đang mở' : 'Open tasks', icon: UserRound, tone: 'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/35' },
            { label: locale === 'vi' ? 'Chưa có hạn' : 'No due date', value: periodInsights.noDueDate, detail: locale === 'vi' ? 'Thiếu lịch giao' : 'Missing schedule', icon: Target, tone: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/35' },
            { label: locale === 'vi' ? 'Chu kỳ trung bình' : 'Avg. cycle time', value: `${periodInsights.averageCycleDays}d`, detail: locale === 'vi' ? 'Tạo đến hoàn thành' : 'Created to completed', icon: Clock, tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/35' },
          ].map((item) => (
            <div key={item.label} className="flex min-h-[104px] items-center gap-3 border-b border-r border-slate-100 p-4 last:border-r-0 dark:border-slate-800/80 md:border-b-0">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.tone}`}><item.icon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{item.label}</p><p className="mt-1 text-xl font-black tabular-nums text-slate-950 dark:text-white">{item.value}</p><p className="truncate text-[10px] font-semibold text-slate-400">{item.detail}</p></div>
            </div>
          ))}
        </section>
      )}

      {/* ── Interactive Productivity Charts Grid ── */}
      {visibleWidgets.charts && (totalTasks === 0 ? (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1 }}
          className="space-y-3 rounded-[28px] border border-dashed border-indigo-200/80 bg-gradient-to-br from-blue-50/60 via-white to-sky-50/50 p-8 text-center shadow-inner dark:border-indigo-900/60 dark:from-blue-950/20 dark:via-[#121212] dark:to-sky-950/20 md:p-12"
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
            className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-white/95 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#121212]/95 sm:p-6 lg:col-span-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>{locale === 'vi' ? `Xu hướng hiệu suất · ${dashboardRange} ngày` : `Performance trend · ${dashboardRange} days`}</span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{locale === 'vi' ? 'Số công việc được tạo và hoàn thành theo thời điểm đã lưu' : 'Tasks created and completed using their stored timestamps'}</p>
              </div>

              {/* Header Right: Badges & Selector Tabs */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-xs" />
                    {locale === 'vi' ? 'Đã xong' : 'Done'}: <span className="font-mono font-black">{weeklySummary.totalCompleted}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/50 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-xs" />
                    {locale === 'vi' ? 'Tạo mới' : 'Created'}: <span className="font-mono font-black">{weeklySummary.totalCreated}</span>
                  </span>
                </div>

                <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setActiveMetricTab('progress')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeMetricTab === 'progress' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    {locale === 'vi' ? 'Xu hướng' : 'Trend'}
                  </button>
                  {memberEffortData.length > 0 && (
                    <button
                      onClick={() => currentUser?.isPremium ? setActiveMetricTab('priority') : onUpgradePremium?.()}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeMetricTab === 'priority' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                      <span className="inline-flex items-center gap-1">{locale === 'vi' ? 'Nỗ lực' : 'Effort'}{!currentUser?.isPremium && <LockKeyhole className="h-3 w-3 text-amber-500" />}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-[180px] w-full pt-4 sm:h-[240px] md:h-[280px] sm:pt-5">
              <ResponsiveContainer width="100%" height="100%">
                {activeMetricTab === 'progress' ? chartMode === 'area' ? (
                  <AreaChart data={weeklyData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weeklyDone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/>
                        <stop offset="90%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="weeklyCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25}/>
                        <stop offset="90%" stopColor="#a855f7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" interval={dashboardRange === 7 ? 0 : dashboardRange === 30 ? 4 : 13} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                    <YAxis allowDecimals={false} domain={[0, (dataMax: number) => Math.max(dataMax, 4)]} tickCount={5} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area name={t('dashboardCompleted') || (locale === 'vi' ? 'Đã xong' : 'Completed')} type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={3} dot={{ r: 3.5, fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6.5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#weeklyDone)" />
                    <Area name={t('dashboardCreated') || (locale === 'vi' ? 'Đã tạo mới' : 'Created')} type="monotone" dataKey="created" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3.5, fill: '#a855f7', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6.5, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#weeklyCreated)" />
                  </AreaChart>
                ) : (
                  <BarChart data={weeklyData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" interval={dashboardRange === 7 ? 0 : dashboardRange === 30 ? 4 : 13} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                    <YAxis allowDecimals={false} domain={[0, (dataMax: number) => Math.max(dataMax, 4)]} tickCount={5} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar name={t('dashboardCompleted') || (locale === 'vi' ? 'Đã xong' : 'Completed')} dataKey="completed" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={22} />
                    <Bar name={t('dashboardCreated') || (locale === 'vi' ? 'Đã tạo mới' : 'Created')} dataKey="created" fill="#a855f7" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  </BarChart>
                ) : (
                  <BarChart data={memberEffortData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar name={locale === 'vi' ? 'Kế hoạch (giờ)' : 'Estimated (h)'} dataKey="estimated" fill="#818cf8" radius={[6, 6, 0, 0]} />
                    <Bar name={locale === 'vi' ? 'Thực tế (giờ)' : 'Logged (h)'} dataKey="logged" fill="#34d399" radius={[6, 6, 0, 0]} />
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
            className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-white/95 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#121212]/95 sm:p-6 lg:col-span-4"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <span>{t('dashboardTaskStatusBreakdown') || 'Phân tích trạng thái công việc'}</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {completionPercentage}% {locale === 'vi' ? 'hoàn tất' : 'done'}
                </span>
              </div>
            </div>

            <div className="relative my-4 flex justify-center items-center">
              <div className="w-[180px] h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData.length > 0 ? statusData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={78}
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={800}
                    >
                      {(statusData.length > 0 ? statusData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{totalTasks}</span>
                <span className="text-[8.5px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">
                  {t('dashboardTotalTasks') || 'TỔNG CÔNG VIỆC'}
                </span>
              </div>
            </div>

            {/* Rich Progress Breakdown Legend */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
              {statusData.map((item, idx) => {
                const percentage = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full block shadow-xs shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="text-slate-900 dark:text-white font-mono font-black text-xs shrink-0">
                        {item.value} <span className="text-slate-400 dark:text-slate-500 font-medium text-[10.5px]">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: item.color,
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

        </div>
      ))}

      {/* ── Bottom Section: 30-Day Velocity & Urgent Action Items ── */}
      {visibleWidgets.execution && totalTasks > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          
          {/* Team Velocity Over 30 Days (8 Columns) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 140, damping: 22 }}
            className="flex flex-col justify-between space-y-4 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/30 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] dark:border-slate-800/90 dark:from-[#121212] dark:via-[#121212] dark:to-indigo-950/20 sm:p-6 lg:col-span-8"
          >
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                 <span>{locale === 'vi' ? `Vận tốc hoàn thành · ${dashboardRange} ngày` : `Completion velocity · ${dashboardRange} days`}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">{locale === 'vi' ? 'Chỉ tính công việc có thời điểm hoàn thành được lưu trong hệ thống' : 'Only tasks with a stored completion timestamp are counted'}</p>
            </div>

            <div className="relative h-[180px] w-full pt-2 sm:h-[220px] md:h-[250px]">
              {currentUser?.isPremium ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                  <YAxis allowDecimals={false} domain={[0, (dataMax: number) => Math.max(dataMax, 4)]} tickCount={5} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 700 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area name={t('dashboardVelocityTasks') || (locale === 'vi' ? 'Công việc đã hoàn thành' : 'Completed tasks')} type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} fillOpacity={1} fill="url(#velTasks)" />
                </AreaChart>
              </ResponsiveContainer> : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 text-center dark:border-amber-800/70 dark:from-amber-950/25 dark:via-slate-950/60 dark:to-orange-950/20">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20"><LockKeyhole className="h-5 w-5" /></span>
                  <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">{locale === 'vi' ? 'Phân tích vận tốc thuộc Analytics Pro' : 'Velocity analytics is an Analytics Pro feature'}</p>
                  <p className="mt-1 max-w-md text-[11px] font-medium text-slate-500 dark:text-slate-400">{locale === 'vi' ? 'Mở khoá lịch sử 90 ngày, xu hướng vận tốc và phân tích nỗ lực theo thành viên.' : 'Unlock 90-day history, velocity trends and per-member effort analytics.'}</p>
                  <button type="button" onClick={onUpgradePremium} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black text-white transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300"><Crown className="h-3.5 w-3.5" />{locale === 'vi' ? 'Nâng cấp gói' : 'Upgrade plan'}</button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Urgent Action Items List (4 Columns) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, type: 'spring', stiffness: 140, damping: 22 }}
            className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-rose-50/40 p-4 text-left shadow-[0_18px_55px_-38px_rgba(15,23,42,0.5)] dark:border-slate-800/90 dark:from-[#121212] dark:via-[#121212] dark:to-rose-950/20 sm:p-6 lg:col-span-4"
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
                    onClick={() => onNavigate('calendar')}
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
              onClick={() => onNavigate('calendar')}
              className="w-full rounded-xl border border-slate-200/70 bg-white/70 py-2.5 text-center text-xs font-extrabold text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
            >
              {locale === 'vi' ? 'Xem tất cả nhiệm vụ' : 'View all tasks'}
            </button>
          </motion.div>

        </div>
      )}

      {/* ── Weekly AI Productivity Insight Report Widget ── */}
      {visibleWidgets.ai && totalTasks > 0 && <motion.div
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
                  {currentUser?.isPremium ? 'Gemini Flash 2.5' : (locale === 'vi' ? 'Tính năng Premium' : 'Premium feature')}
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
                {currentUser?.isPremium ? <Sparkles className="w-4 h-4 text-white" /> : <LockKeyhole className="w-4 h-4 text-white" />}
                <span>{currentUser?.isPremium ? (t('dashboardGenerateReport') || 'Khởi tạo báo cáo AI') : (locale === 'vi' ? 'Nâng cấp để tạo báo cáo AI' : 'Upgrade for AI report')}</span>
              </>
            )}
          </button>
        </div>

        {/* Live Mathematical Indicators */}
        <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4 rounded-[22px] border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35 sm:p-5 md:grid-cols-4">
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
