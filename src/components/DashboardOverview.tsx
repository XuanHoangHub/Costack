"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, SyncLog, Document } from '../types';
import { 
  CheckCircle2, ArrowUpRight, TrendingUp, Users, 
  Activity, FileText, Bot, Clock, Sparkles, AlertCircle,
  Calendar, Check, Circle, BarChart3, PieChart as PieIcon, ListTodo, Star, Flag, Flame,
  UserCheck, ShieldCheck, Zap, X
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Badge } from './ui';
import { useTranslation } from '../contexts/TranslationContext';

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
}

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
  onClearSyncLogs
}: DashboardOverviewProps) {
  const { t, locale } = useTranslation();
  const [activeMetricTab, setActiveMetricTab] = useState<'progress' | 'priority'>('progress');
  const [reportText, setReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');

  // Daily morning briefing notification state
  const [showBriefing, setShowBriefing] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('avaxa_show_briefing_panel');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const [briefingTasks, setBriefingTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [isBriefingChecked, setIsBriefingChecked] = useState<boolean>(false);

  // Checks task deadlines once per calendar day
  useEffect(() => {
    const now = new Date();
    const nearList: Task[] = [];
    const overdueList: Task[] = [];

    tasks.forEach(t => {
      if (t.status !== 'completed' && t.dueDate) {
        const dueVal = new Date(t.dueDate);
        const diffMs = dueVal.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffMs < 0) {
          overdueList.push(t);
        } else if (diffHours <= 36) {
          nearList.push(t);
        }
      }
    });

    setBriefingTasks(nearList);
    setOverdueTasks(overdueList);

    if (!isBriefingChecked && (nearList.length > 0 || overdueList.length > 0)) {
      const todayStr = now.toLocaleDateString('vi-VN');
      const lastTriggerDate = localStorage.getItem('avaxa_last_briefing_trigger_date');

      if (lastTriggerDate !== todayStr) {
        if (triggerToast) {
          triggerToast(
            'deadline',
            t('dashboardMorningBriefing') || 'Bản tin Sáng nay ☀️',
            locale === 'vi' 
              ? `Bạn có ${overdueList.length} việc quá hạn & ${nearList.length} việc sắp đến hạn chót cần hoàn tất.`
              : `You have ${overdueList.length} overdue tasks & ${nearList.length} tasks due soon.`
          );
          localStorage.setItem('avaxa_last_briefing_trigger_date', todayStr);
        }
      }
      setIsBriefingChecked(true);
    }
  }, [tasks, isBriefingChecked, triggerToast, locale, t]);

  const handleGenerateReport = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setIsGenerating(true);
    setReportError('');
    try {
      const response = await fetch('/api/ai/productivity-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, members })
      });
      const data = await response.json();
      if (data.success) {
        setReportText(data.text);
        if (onAddSyncLog) {
          onAddSyncLog(locale === 'vi' ? "Đã khởi tạo thành công Báo cáo Hiệu Năng Năng Suất Tuần qua Gemini AI." : "Successfully generated weekly AI Productivity Report.");
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

  // ── Calculate Real Data Indicators ──
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'inprogress').length;
  const reviewTasks = tasks.filter(t => t.status === 'review').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Real Weekly Progress data
  const getWeeklyProgressData = () => {
    const days = [
      t('mondayShort') || 'Mon',
      t('tuesdayShort') || 'Tue',
      t('wednesdayShort') || 'Wed',
      t('thursdayShort') || 'Thu',
      t('fridayShort') || 'Fri',
      t('saturdayShort') || 'Sat',
      t('sundayShort') || 'Sun'
    ];
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0,0,0,0);

    return days.map((dayName, idx) => {
      const targetDay = new Date(monday);
      targetDay.setDate(monday.getDate() + idx);
      const dateStr = targetDay.toISOString().split('T')[0];

      const created = tasks.filter(t => t.createdAt && t.createdAt.startsWith(dateStr)).length;
      const completed = tasks.filter(t => {
        if (t.status !== 'completed') return false;
        if (t.completedAt) return t.completedAt.startsWith(dateStr);
        if (t.dueDate) return t.dueDate.startsWith(dateStr);
        if (t.createdAt) return t.createdAt.startsWith(dateStr);
        return true;
      }).length;

      return {
        name: dayName,
        created,
        completed
      };
    });
  };

  const weeklyData = getWeeklyProgressData();

  // Real 30-day velocity data
  const getVelocityData = () => {
    const data: { date: string; completed: number; hours: number }[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayStr = `${d.getDate()}/${d.getMonth() + 1}`;

      const completed = tasks.filter(t => {
        if (t.status !== 'completed') return false;
        if (t.completedAt) return t.completedAt.startsWith(dateStr);
        if (t.dueDate) return t.dueDate.startsWith(dateStr);
        if (t.createdAt) return t.createdAt.startsWith(dateStr);
        return true;
      }).length;
      const hours = tasks.filter(t => t.createdAt && t.createdAt.startsWith(dateStr)).reduce((sum, t) => sum + (t.hoursLogged || 0), 0);

      data.push({
        date: displayStr,
        completed,
        hours
      });
    }
    return data;
  };

  const velocityData = getVelocityData();

  // Real effort comparison data per assignee
  const getMemberEffortData = () => {
    return members.map(m => {
      const memberTasks = tasks.filter(t => t.assigneeId === m.id || (t.assigneeIds && t.assigneeIds.includes(m.id)));
      const estimated = memberTasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0);
      const logged = memberTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);

      return {
        name: m.name.split(' ')[0],
        estimated,
        logged
      };
    }).filter(d => d.estimated > 0 || d.logged > 0);
  };

  const memberEffortData = getMemberEffortData();

  // Statuses breakdown data
  const statusData = [
    { name: 'To Do', value: todoTasks, color: '#6366f1' },
    { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
    { name: 'Review', value: reviewTasks, color: '#a855f7' },
    { name: 'Completed', value: completedTasks, color: '#10b981' }
  ].filter(item => item.value > 0);

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

  const urgentTasks = tasks
    .filter(t => t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high'))
    .slice(0, 5);

  const onlineMembersCount = members.filter(m => m.status === 'online').length;
  const todayDateFormatted = new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });

  return (
    <div className="min-h-full w-full bg-white dark:bg-[#07080c] text-slate-800 dark:text-slate-100 select-none flex flex-col p-5 md:p-8 space-y-6 md:space-y-8">
      
      {/* ── Morning Briefing Notification Banner ── */}
      {showBriefing && (overdueTasks.length > 0 || briefingTasks.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-500/30 p-4 flex items-center justify-between gap-4 backdrop-blur-md select-none text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
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

          <div className="flex items-center gap-2 shrink-0">
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
                try { localStorage.setItem('avaxa_show_briefing_panel', 'false'); } catch (e) {}
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl bg-gradient-to-r from-indigo-900/5 via-violet-900/5 to-purple-900/5 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 overflow-hidden text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm"
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              <span>{todayDateFormatted}</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineMembersCount} {locale === 'vi' ? 'Thành viên Online' : 'Members Online'}</span>
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('goodMorning') || 'Chào buổi sáng'}, <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">{currentUser?.name || 'Avaxa Member'}</span> 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl font-medium leading-relaxed">
            {t('dashboardSyncDescription') || 'Tất cả tài liệu, lịch biểu, nhiệm vụ và báo cáo năng suất được đồng bộ thời gian thực liền mạch.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => onNavigate('tasks')}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{locale === 'vi' ? 'Quản lý nhiệm vụ' : 'Manage Tasks'}</span>
          </button>
          <button
            onClick={onToggleOffline}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              isOffline 
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {isOffline ? (locale === 'vi' ? 'Ngoại tuyến' : 'Offline') : (locale === 'vi' ? 'Trực tuyến' : 'Online')}
          </button>
        </div>
      </motion.div>

      {/* ── 4 Hero KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: t('dashboardCompletionRate') || 'Tỷ lệ hoàn thành', 
            value: `${completionPercentage}%`, 
            detail: locale === 'vi' ? `Đã xong ${completedTasks}/${totalTasks} việc` : `Done ${completedTasks}/${totalTasks} tasks`, 
            icon: CheckCircle2, 
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/60',
            progress: completionPercentage
          },
          { 
            label: t('dashboardTasksInProgress') || 'Việc đang thực hiện', 
            value: (inProgressTasks + reviewTasks).toString(), 
            detail: `${inProgressTasks} In-progress · ${reviewTasks} Review`, 
            icon: Activity, 
            color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/60',
            progress: totalTasks ? Math.round(((inProgressTasks + reviewTasks) / totalTasks) * 100) : 0
          },
          { 
            label: t('dashboardChartTotalHours') || 'Tổng giờ cống hiến', 
            value: `${tasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0)}h`, 
            detail: locale === 'vi' ? `Kế hoạch: ${tasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0)}h` : `Plan: ${tasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0)}h`, 
            icon: Clock, 
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/60',
            progress: Math.min(100, Math.round((tasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0) / (tasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0) || 1)) * 100))
          },
          { 
            label: locale === 'vi' ? 'Tài liệu & Đội ngũ' : 'Docs & Team', 
            value: `${docs.length} Docs`, 
            detail: locale === 'vi' ? `${onlineMembersCount}/${members.length} thành viên online` : `${onlineMembersCount}/${members.length} members online`, 
            icon: FileText, 
            color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200/60 dark:border-cyan-800/60',
            progress: members.length ? Math.round((onlineMembersCount / members.length) * 100) : 100
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="rounded-3xl bg-white dark:bg-[#0d0e17] p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between text-left group hover:border-indigo-500/40 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</span>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-3 space-y-2">
              <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{card.detail}</p>
              
              {/* Mini progress bar */}
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" 
                  style={{ width: `${card.progress}%` }} 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Interactive Productivity Charts Grid ── */}
      {totalTasks === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 md:p-12 text-center rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-3"
        >
          <ListTodo className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto animate-bounce" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{t('noTasksFound') || 'Chưa có dữ liệu phân tích'}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {locale === 'vi' ? 'Vui lòng thêm công việc hoặc thành viên để hệ thống tự động khởi tạo biểu đồ phân tích.' : 'Please add tasks or members to generate real-time analytics.'}
          </p>
          <button 
            onClick={() => onNavigate('tasks')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {t('createTaskBtn') || 'Tạo nhiệm vụ đầu tiên'}
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Weekly Performance Analytics Area Chart (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between text-left shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('dashboardWeeklyProgress') || 'Phân tích hiệu năng năng suất'}</span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{locale === 'vi' ? 'Dữ liệu ghi nhận tiến độ tuần này' : 'Data recorded live from current task states'}</p>
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
            <div className="h-[260px] w-full pt-6">
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
          </div>

          {/* Status Breakdown Donut Chart (4 Cols) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between text-left shadow-xs">
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
                      isAnimationActive={false}
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
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">TOTAL TASKS</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: item.color }} />
                    <span>{item.name === 'To Do' ? (t('dashboardToDo') || 'Cần làm') : item.name === 'In Progress' ? (t('dashboardInProgress') || 'Đang làm') : item.name === 'Completed' ? (t('dashboardCompleted') || 'Đã hoàn thành') : (t('review') || item.name)}</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-mono font-extrabold">{item.value} ({Math.round((item.value / totalTasks) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Bottom Section: 30-Day Velocity & Urgent Action Items ── */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Team Velocity Over 30 Days (8 Columns) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 space-y-4 text-left shadow-xs flex flex-col justify-between"
          >
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span>{t('dashboardTeamVelocity') || 'Tốc độ hoàn thành 30 ngày (Team Velocity)'}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">{t('dashboardVelocityDesc') || 'Giám sát tổng số nhiệm vụ hoàn thành và tổng số giờ logs cống hiến thực tế'}</p>
            </div>

            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="velHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area name={t('dashboardVelocityTasks') || 'Công việc đã hoàn thành'} type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#velTasks)" />
                  <Area name={t('dashboardVelocityHours') || 'Tổng số giờ đã ghi nhận'} type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#velHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Urgent Action Items List (4 Columns) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between text-left shadow-xs"
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
                  <div 
                    key={task.id} 
                    onClick={() => onNavigate('tasks')}
                    className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:border-indigo-500/30 transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {task.title}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 font-mono uppercase">
                        Due: {task.dueDate ? task.dueDate.split('T')[0] : 'N/A'}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg shrink-0 uppercase tracking-wider ${
                      task.priority === 'urgent' 
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60' 
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => onNavigate('tasks')}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl text-center text-xs font-extrabold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {locale === 'vi' ? 'Xem tất cả nhiệm vụ' : 'View all tasks'}
            </button>
          </motion.div>

        </div>
      )}

      {/* ── Weekly AI Productivity Insight Report Widget ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 space-y-6 text-left shadow-xs"
        id="weekly_productivity_insight_report_widget"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg flex items-center gap-2">
                <span>{t('dashboardSmartReport') || 'Báo cáo Năng suất thông minh AI'}</span>
                <span className="text-[9px] bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
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
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              isGenerating
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:brightness-105'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/80 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
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
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Tổng thời gian logged' : 'Total hours logged'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {tasks.reduce((sum, t) => sum + (t.hoursLogged ?? 0), 0)} {locale === 'vi' ? 'giờ' : 'hours'}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">{locale === 'vi' ? 'Cống hiến toàn dự án' : 'Whole project contribution'}</span>
          </div>
          <div className="space-y-1 border-l-0 md:border-l border-slate-200/60 dark:border-slate-800/60 md:pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Độ chuẩn xác ước tính' : 'Estimation accuracy'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {(() => {
                const totalLogged = tasks.reduce((sum, t) => sum + (t.hoursLogged ?? 0), 0);
                const totalEstimated = tasks.reduce((sum, t) => sum + (t.hoursEstimate ?? 0), 0);
                if (!totalEstimated) return "0%";
                const accuracy = Math.min(100, Math.round((Math.min(totalLogged, totalEstimated) / Math.max(totalLogged, totalEstimated)) * 100));
                return `${accuracy}%`;
              })()}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-1">{locale === 'vi' ? 'Sai số ước lượng thời gian' : 'Time estimation error'}</span>
          </div>
          <div className="space-y-1 border-l-0 md:border-l border-slate-200/60 dark:border-slate-800/60 md:pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Độ bao phủ đội ngũ' : 'Team coverage'}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {(() => {
                const assignedAssignees = new Set(tasks.map(t => t.assigneeId).filter(Boolean));
                return `${assignedAssignees.size} / ${members.length} ${locale === 'vi' ? 'Th.viên' : 'Members'}`;
              })()}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">{locale === 'vi' ? 'Độ phân bố đều task' : 'Task distribution scale'}</span>
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
              <span>Avaxa AI Drafted</span>
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
                  alert(locale === 'vi' ? "Đã sao chép báo cáo vào bộ nhớ tạm!" : "Report copied to clipboard!");
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
      </motion.div>

    </div>
  );
}

const MemoizedDashboardOverview = React.memo(DashboardOverview);
export default MemoizedDashboardOverview;
export { DashboardOverview };
