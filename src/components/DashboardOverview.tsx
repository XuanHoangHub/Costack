"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, SyncLog, Document } from '../types';
import { 
  CheckCircle, ArrowUpRight, TrendingUp, Users, 
  Activity, FileText, Bot, Clock, Sparkles, AlertCircle, Trash2,
  Calendar, Check, Circle, BarChart3, PieChart as PieIcon, ListTodo, Star, Flag, Flame
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
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
        }
        localStorage.setItem('avaxa_last_briefing_trigger_date', todayStr);
      }
      setIsBriefingChecked(true);
    }
  }, [tasks, isBriefingChecked, triggerToast]);

  const handleGenerateReport = async () => {
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
              <h4 key={i} className="text-sm font-extrabold text-indigo-905 dark:text-indigo-200 tracking-tight mt-4 mb-2 flex items-center gap-1.5 border-b border-indigo-100/40 dark:border-indigo-400/30 pb-1">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>{trimmed.replace('###', '').trim()}</span>
              </h4>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <h3 key={i} className="text-base font-black text-slate-900 dark:text-slate-55 tracking-tight mt-5 mb-2">
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
          return <p key={i} className="pl-1 text-slate-655 text-xs">{trimmed}</p>;
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
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayStr = d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });

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
        name: m.name.split(' ')[0], // short name
        estimated,
        logged
      };
    }).filter(d => d.estimated > 0 || d.logged > 0);
  };

  const memberEffortData = getMemberEffortData();

  // Pie chart statuses breakdown data
  const statusData = [
    { name: 'To Do', value: todoTasks, color: '#6366f1' },
    { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
    { name: 'Review', value: reviewTasks, color: '#a855f7' },
    { name: 'Completed', value: completedTasks, color: '#10b981' }
  ].filter(item => item.value > 0);

  const priorityData = [
    { name: 'Urgent', value: tasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: '#f97316' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: '#eab308' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-xl space-y-1 backdrop-blur-md z-50 text-left">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
          <div className="space-y-0.5">
            {payload.map((item: any, idx: number) => (
              <p key={idx} className="text-xs font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                <span className="text-slate-355">{item.name}:</span>
                <span className="text-white font-extrabold font-mono">
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

  const getUrgentTasks = () => {
    return tasks
      .filter(t => t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high'))
      .slice(0, 5);
  };

  const urgentTasks = getUrgentTasks();

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 select-none">
      
      {/* ── Header Welcome Row ── */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-8 rounded-3xl glass-panel relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100/40">
            Realtime Dashboard Overview
          </span>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black font-display text-slate-850 dark:text-slate-50 tracking-tight">
            {t('goodMorning') || 'Chào buổi sáng'}, {currentUser?.name || 'Avaxa Member'} 👋
            </h1>
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            {t('dashboardSyncDescription') || 'All your documents, whiteboards, schedules and habits are automatically synced in real-time across all devices.'}
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
            isOffline 
              ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-955/20' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-955/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`} />
            <span>{isOffline ? (locale === 'vi' ? 'Ngoại tuyến' : 'Offline') : (locale === 'vi' ? 'Trực tuyến' : 'Online')}</span>
          </div>
        </div>
      </motion.div>



      {/* ── Primary KPI Cards Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('dashboardCompletionRate') || 'Tỷ lệ hoàn thành', value: `${completionPercentage}%`, detail: locale === 'vi' ? `Đã xong ${completedTasks}/${totalTasks} việc` : `Done ${completedTasks}/${totalTasks} tasks`, icon: CheckCircle, color: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40' },
          { label: t('dashboardTasksInProgress') || 'Việc đang thực hiện', value: inProgressTasks + reviewTasks, detail: `${inProgressTasks} In-progress, ${reviewTasks} Review`, icon: Activity, color: 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-955/30 dark:border-amber-900/40' },
          { label: t('dashboardChartTotalHours') || 'Tổng giờ đóng góp', value: `${tasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0)}h`, detail: locale === 'vi' ? `Kế hoạch ước tính: ${tasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0)}h` : `Estimated plan: ${tasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0)}h`, icon: Clock, color: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-955/30 dark:border-emerald-900/40' },
          { label: locale === 'vi' ? 'Tài liệu & Online' : 'Docs & Online', value: `${docs.length} Doc`, detail: locale === 'vi' ? `${members.filter(m => m.status === 'online').length}/${members.length} thành viên online` : `${members.filter(m => m.status === 'online').length}/${members.length} members online`, icon: FileText, color: 'text-cyan-600 bg-cyan-50 border-cyan-100 dark:bg-cyan-955/30 dark:border-cyan-900/40' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="ios27-card p-5.5 flex flex-col justify-between text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</span>
              <div className={`p-2 rounded-xl border ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">{card.value}</span>
              <p className="text-[10px] text-slate-500 font-extrabold mt-1 uppercase tracking-wide">{card.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Block ── */}
      {totalTasks === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
        >
          <ListTodo className="w-10 h-10 text-slate-300 mx-auto animate-bounce" />
          <h3 className="font-bold text-slate-855 dark:text-slate-100">{t('noTasksFound') || 'Chưa có dữ liệu phân tích'}</h3>
          <p className="text-xs text-slate-450 dark:text-slate-405 max-w-sm mx-auto">
            {locale === 'vi' ? 'Vui lòng thêm một vài công việc, danh sách folder hoặc thành viên để hệ thống tự động vẽ biểu đồ phân tích thời gian thực.' : 'Please add a few tasks, lists, folders or members to automatically generate real-time analytics.'}
          </p>
          <button 
            onClick={() => onNavigate('tasks')}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            {t('createTaskBtn') || 'Tạo nhiệm vụ đầu tiên'}
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Chart Panel (Area or Bar) */}
          <div className="lg:col-span-8 p-6 rounded-3xl glass-panel flex flex-col justify-between shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 text-left">
              <div>
                <h3 className="font-display font-bold text-slate-850 dark:text-slate-50 text-base flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <span>{t('dashboardWeeklyProgress') || 'Phân tích hiệu năng năng suất'}</span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Dữ liệu ghi nhận trực tiếp từ trạng thái công việc hiện tại' : 'Data recorded live from current task states'}</p>
              </div>

              {/* Selector Tabs */}
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 text-xs font-bold text-slate-500 shrink-0">
                <button
                  onClick={() => setActiveMetricTab('progress')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeMetricTab === 'progress' ? 'bg-white dark:bg-slate-850 shadow-sm text-indigo-655 font-black' : 'hover:text-slate-705'}`}
                >
                  {locale === 'vi' ? 'Tuần này' : 'This week'}
                </button>
                {memberEffortData.length > 0 && (
                  <button
                    onClick={() => setActiveMetricTab('priority')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeMetricTab === 'priority' ? 'bg-white dark:bg-slate-850 shadow-sm text-indigo-655 font-black' : 'hover:text-slate-705'}`}
                  >
                    {locale === 'vi' ? 'Nỗ lực thành viên' : 'Member Effort'}
                  </button>
                )}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-[260px] w-full pt-6">
              <ResponsiveContainer width="100%" height="100%">
                {activeMetricTab === 'progress' ? (
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weeklyDone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="weeklyCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area name={locale === 'vi' ? 'Công việc đã tạo' : 'Tasks Created'} type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#weeklyCreated)" />
                    <Area name={t('dashboardChartCompletedTasks') || 'Completed Tasks'} type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#weeklyDone)" />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 10 }} />
                  </AreaChart>
                ) : (
                  <BarChart data={memberEffortData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar name={locale === 'vi' ? 'Ước tính' : 'Estimated'} dataKey="estimated" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar name={locale === 'vi' ? 'Thực tế' : 'Actual'} dataKey="logged" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 10 }} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Chart Panel - Donut Task Statuses */}
          <div className="lg:col-span-4 p-6 rounded-3xl glass-panel flex flex-col justify-between text-left shadow-sm">
            <div>
              <h3 className="font-display font-bold text-slate-855 dark:text-slate-55 text-base flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                <span>{t('dashboardTaskStatusBreakdown') || 'Trạng thái công việc'}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('dashboardStatusDistribution') || 'Phân bổ tỷ lệ đầu việc theo quy trình'}</p>
            </div>

            <div className="flex items-center justify-center py-4 relative">
              <div className="w-[150px] h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData.length > 0 ? statusData : [{ name: locale === 'vi' ? 'Trống' : 'Empty', value: 1, color: '#e2e8f0' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(statusData.length > 0 ? statusData : [{ name: locale === 'vi' ? 'Trống' : 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{totalTasks}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black mt-1">{t('dashboardTotalTasks') || 'Tổng Task'}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-550 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: item.color }} />
                    <span>{item.name === 'To Do' ? (t('dashboardToDo') || 'Cần làm') : item.name === 'In Progress' ? (t('dashboardInProgress') || 'Đang làm') : item.name === 'Completed' ? (t('dashboardCompleted') || 'Đã xong') : (t('review') || item.name)}</span>
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 font-mono">{item.value} ({Math.round((item.value / totalTasks) * 100)}%)</span>
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-8 p-6 rounded-3xl glass-panel space-y-4 text-left shadow-sm"
          >
            <div>
              <h3 className="font-display font-extrabold text-slate-855 dark:text-slate-55 text-base flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>{t('dashboardTeamVelocity') || 'Tốc độ hoàn thành 30 ngày (Team Velocity)'}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('dashboardVelocityDesc') || 'Giám sát tổng số nhiệm vụ hoàn thành và tổng số giờ logs cống hiến thực tế'}</p>
            </div>

            <div className="h-[220px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="velHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area name={t('dashboardVelocityTasks') || 'Công việc đã hoàn thành'} type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#velTasks)" />
                  <Area name={t('dashboardVelocityHours') || 'Tổng số giờ đã ghi nhận'} type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#velHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Urgent Actions Items List */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 p-6 rounded-3xl glass-panel flex flex-col justify-between text-left shadow-sm"
          >
            <div>
              <h3 className="font-display font-bold text-slate-855 dark:text-slate-50 text-base flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                <span>{t('urgentLabel') || 'Nhiệm vụ khẩn cấp'}</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Các công việc có mức ưu tiên cao cần xử lý ngay' : 'High priority tasks that require immediate attention'}</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1 scrollbar-thin max-h-[200px]">
              {urgentTasks.length === 0 ? (
                <div className="py-6 text-center italic text-slate-450 text-xs">
                  {locale === 'vi' ? 'Không có nhiệm vụ khẩn cấp.' : 'No urgent tasks.'}
                </div>
              ) : (
                urgentTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => onNavigate('tasks')}
                    className="flex items-start justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-250 truncate group-hover:text-indigo-650 transition-colors">
                        {task.title}
                      </p>
                      <span className="text-[9px] font-bold text-slate-405 flex items-center gap-1 mt-0.5 font-mono uppercase">
                        Due: {task.dueDate ? task.dueDate.split('T')[0] : 'N/A'}
                      </span>
                    </div>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-widest ${
                      task.priority === 'urgent' 
                        ? 'bg-red-550/10 text-red-650 border border-red-550/20' 
                        : 'bg-orange-555/10 text-orange-655 border border-orange-550/20'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => onNavigate('tasks')}
              className="w-full py-2 bg-slate-55 dark:bg-slate-955 border border-slate-200/50 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-300 rounded-xl text-center text-xs font-extrabold text-slate-700 dark:text-slate-250 transition-colors cursor-pointer"
            >
              {locale === 'vi' ? 'Xem tất cả nhiệm vụ' : 'View all tasks'}
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Weekly AI Productivity Insight Report Widget ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="p-6 rounded-3xl glass-panel space-y-5 text-left shadow-sm"
        id="weekly_productivity_insight_report_widget"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100/50 text-indigo-650 dark:bg-indigo-950/20 dark:border-indigo-900/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-850 dark:text-slate-50 text-base md:text-lg flex items-center gap-2">
                {t('dashboardSmartReport') || 'Báo cáo Năng suất thông minh AI'}
                <span className="text-[9px] bg-indigo-105 text-indigo-750 font-black px-2 py-0.5 rounded-full uppercase border border-indigo-200/30">
                  Gemini Flash 2.5
                </span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('dashboardReportDesc') || 'Báo cáo đánh giá hiệu suất hoàn thành, quỹ đóng góp team và điều phối tài nguyên dự án.'}</p>
            </div>
          </div>
          
          <button
            id="btn_generate_productivity_report"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
              isGenerating
                ? 'bg-slate-105 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700/80 cursor-not-allowed'
                : 'bg-indigo-650 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>{t('dashboardGeneratingReport') || 'Đang phân tích bối cảnh...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>{t('dashboardGenerateReport') || 'Khởi tạo báo cáo AI'}</span>
              </>
            )}
          </button>
        </div>

        {/* Live Mathematical Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider block">{t('dashboardChartCompletedTasks') || 'Hoàn thành công việc'}</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
              {completedTasks} / {totalTasks} {locale === 'vi' ? 'Việc' : 'Tasks'}
            </span>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Tổng thời gian logged' : 'Total hours logged'}</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
              {tasks.reduce((sum, t) => sum + (t.hoursLogged ?? 0), 0)} {locale === 'vi' ? 'giờ' : 'hours'}
            </span>
            <span className="text-[9px] text-indigo-650 font-bold block mt-1">{locale === 'vi' ? 'Cống hiến toàn dự án' : 'Whole project contribution'}</span>
          </div>
          <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Độ chuẩn xác ước tính' : 'Estimation accuracy'}</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
              {(() => {
                const totalLogged = tasks.reduce((sum, t) => sum + (t.hoursLogged ?? 0), 0);
                const totalEstimated = tasks.reduce((sum, t) => sum + (t.hoursEstimate ?? 0), 0);
                if (!totalEstimated) return "0%";
                const accuracy = Math.min(100, Math.round((Math.min(totalLogged, totalEstimated) / Math.max(totalLogged, totalEstimated)) * 100));
                return `${accuracy}%`;
              })()}
            </span>
            <span className="text-[9px] text-slate-405 dark:text-slate-500 font-medium block mt-1">{locale === 'vi' ? 'Sai số ước lượng thời gian' : 'Time estimation error'}</span>
          </div>
          <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-4">
            <span className="text-[10px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider block">{locale === 'vi' ? 'Độ bao phủ đội ngũ' : 'Team coverage'}</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
              {(() => {
                const assignedAssignees = new Set(tasks.map(t => t.assigneeId).filter(Boolean));
                return `${assignedAssignees.size} / ${members.length} ${locale === 'vi' ? 'Th.viên' : 'Members'}`;
              })()}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">{locale === 'vi' ? 'Độ phân bố đều task' : 'Task distribution scale'}</span>
          </div>
        </div>

        {/* Content of the AI Report */}
        {reportText ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-5 rounded-2xl border border-indigo-100 bg-[#EEF2FF]/20 relative overflow-hidden space-y-4 text-left"
          >
            <div className="absolute top-0 right-0 p-3 text-[9px] font-mono text-indigo-400/80 uppercase font-black flex items-center gap-1 bg-white/40 dark:bg-slate-900/40 rounded-bl-xl border-l border-b border-indigo-100/30">
              <Bot className="w-3.5 h-3.5 animate-bounce" />
              <span>Avaxa AI Drafted</span>
            </div>
            
            <div className="prose max-w-none pt-2">
              {renderMarkdown(reportText)}
            </div>

            <div className="flex justify-end pt-3 border-t border-indigo-100/30">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(reportText);
                  if (onAddSyncLog) {
                    onAddSyncLog(locale === 'vi' ? "Đã sao chép nội dung báo cáo tuần vào Clipboard!" : "Copied weekly report to Clipboard!");
                  }
                  alert(locale === 'vi' ? "Đã sao chép báo cáo vào bộ nhớ tạm!" : "Report copied to clipboard!");
                }}
                className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#4F46E5] flex items-center gap-1.5 cursor-pointer"
                title={locale === 'vi' ? "Sao chép nội dung báo cáo" : "Copy report content"}
              >
                <span>{locale === 'vi' ? "Sao chép Báo cáo" : "Copy Report"}</span>
              </button>
            </div>
          </motion.div>
        ) : reportError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/55 text-rose-805 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <p className="font-semibold">{reportError}</p>
          </div>
        ) : (
          <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
            <Sparkles className="w-6 h-6 text-indigo-400/60 mx-auto mb-2 animate-pulse" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-sans">
              {t('dashboardNoReportGenerated') || 'Chưa có báo cáo tuần được sinh ra. Bấm '} 
              <strong className="text-indigo-650 font-black">"{t('dashboardGenerateReport') || 'Khởi tạo báo cáo AI'}"</strong> 
              {t('dashboardGenerateReportBtn') ? ` ${t('dashboardGenerateReportBtn')}` : ' để khởi chạy phân tích.'}
            </span>
          </div>
        )}
      </motion.div>

    </div>
  );
}

const MemoizedDashboardOverview = React.memo(DashboardOverview);
export default MemoizedDashboardOverview;
export { DashboardOverview };
