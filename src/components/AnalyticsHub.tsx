"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Space } from '../types';
import { 
  BarChart3, PieChart as PieIcon, LineChart, TrendingUp, Users, 
  Award, AlertCircle, Calendar, Flame, Star, Sparkles, Filter, 
  CheckCircle2, Clock, Zap, ArrowUpRight, ArrowDownRight, Compass
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface AnalyticsHubProps {
  tasks: Task[];
  members: User[];
  spaces: Space[];
  activeWorkspaceId: string;
}

export default function AnalyticsHub({
  tasks = [],
  members = [],
  spaces = [],
  activeWorkspaceId
}: AnalyticsHubProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7days' | '30days' | 'all'>('all');
  const [selectedMetric, setSelectedMetric] = useState<'count' | 'hours'>('count');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Filter tasks based on space and timeframe
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => t.workspaceId === activeWorkspaceId);
    
    if (selectedSpaceId !== 'all') {
      result = result.filter(t => t.spaceId === selectedSpaceId);
    }
    
    const now = new Date();
    if (selectedTimeframe === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      result = result.filter(t => t.createdAt && new Date(t.createdAt) >= sevenDaysAgo);
    } else if (selectedTimeframe === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      result = result.filter(t => t.createdAt && new Date(t.createdAt) >= thirtyDaysAgo);
    }
    
    return result;
  }, [tasks, activeWorkspaceId, selectedSpaceId, selectedTimeframe]);

  // General Metrics
  const stats = useMemo(() => {
    if (isDemoMode) {
      return {
        total: 24,
        completed: 16,
        inProgress: 5,
        review: 2,
        todo: 1,
        loggedHours: 42.5,
        estimatedHours: 60,
        completionRate: 67,
        avgLeadTimeHours: 4.8,
        overdue: 1
      };
    }

    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'inprogress').length;
    const review = filteredTasks.filter(t => t.status === 'review').length;
    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    
    const loggedHours = filteredTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
    const estimatedHours = filteredTasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0);
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Average completion time (lead time) in hours
    let totalLeadTimeMs = 0;
    let completedWithDates = 0;
    filteredTasks.forEach(t => {
      if (t.status === 'completed' && t.createdAt && t.completedAt) {
        const created = new Date(t.createdAt).getTime();
        const finished = new Date(t.completedAt).getTime();
        if (finished > created) {
          totalLeadTimeMs += (finished - created);
          completedWithDates++;
        }
      }
    });
    const avgLeadTimeHours = completedWithDates > 0 
      ? Math.round((totalLeadTimeMs / (1000 * 60 * 60 * completedWithDates)) * 10) / 10
      : 0;

    // Overdue count
    const now = new Date();
    const overdue = filteredTasks.filter(t => 
      t.status !== 'completed' && 
      t.dueDate && 
      new Date(t.dueDate) < now
    ).length;

    return {
      total,
      completed,
      inProgress,
      review,
      todo,
      loggedHours,
      estimatedHours,
      completionRate,
      avgLeadTimeHours,
      overdue
    };
  }, [filteredTasks, isDemoMode]);

  // 1. Task status data for Donut Chart
  const statusChartData = useMemo(() => {
    if (isDemoMode) {
      return [
        { name: 'To Do', value: 1, color: '#6366f1' },
        { name: 'In Progress', value: 5, color: '#f59e0b' },
        { name: 'Review', value: 2, color: '#a855f7' },
        { name: 'Completed', value: 16, color: '#10b981' }
      ];
    }

    return [
      { name: 'To Do', value: stats.todo, color: '#6366f1' },
      { name: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
      { name: 'Review', value: stats.review, color: '#a855f7' },
      { name: 'Completed', value: stats.completed, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [stats, isDemoMode]);

  // 2. Priority breakdown data
  const priorityChartData = useMemo(() => {
    if (isDemoMode) {
      return [
        { name: 'Low', value: 4, color: '#3b82f6' },
        { name: 'Medium', value: 10, color: '#eab308' },
        { name: 'High', value: 7, color: '#f97316' },
        { name: 'Urgent', value: 3, color: '#ef4444' }
      ];
    }

    const urgent = filteredTasks.filter(t => t.priority === 'urgent').length;
    const high = filteredTasks.filter(t => t.priority === 'high').length;
    const medium = filteredTasks.filter(t => t.priority === 'medium').length;
    const low = filteredTasks.filter(t => t.priority === 'low').length;
    
    return [
      { name: 'Low', value: low, color: '#3b82f6' },
      { name: 'Medium', value: medium, color: '#eab308' },
      { name: 'High', value: high, color: '#f97316' },
      { name: 'Urgent', value: urgent, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [filteredTasks, isDemoMode]);

  // 3. Weekly Velocity Area Chart
  const velocityChartData = useMemo(() => {
    if (isDemoMode) {
      return [
        { name: 'Thứ 2', 'Đã tạo': 3, 'Hoàn thành': 1 },
        { name: 'Thứ 3', 'Đã tạo': 5, 'Hoàn thành': 3 },
        { name: 'Thứ 4', 'Đã tạo': 2, 'Hoàn thành': 4 },
        { name: 'Thứ 5', 'Đã tạo': 6, 'Hoàn thành': 5 },
        { name: 'Thứ 6', 'Đã tạo': 4, 'Hoàn thành': 6 },
        { name: 'Thứ 7', 'Đã tạo': 2, 'Hoàn thành': 2 },
        { name: 'Chủ Nhật', 'Đã tạo': 1, 'Hoàn thành': 1 }
      ];
    }

    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0, 0, 0, 0);

    return days.map((dayName, idx) => {
      const targetDay = new Date(monday);
      targetDay.setDate(monday.getDate() + idx);
      const dateStr = targetDay.toISOString().split('T')[0];

      const created = filteredTasks.filter(t => t.createdAt && t.createdAt.startsWith(dateStr)).length;
      const completed = filteredTasks.filter(t => t.status === 'completed' && t.completedAt && t.completedAt.startsWith(dateStr)).length;

      return {
        name: dayName,
        'Đã tạo': created,
        'Hoàn thành': completed
      };
    });
  }, [filteredTasks, isDemoMode]);

  // 4. Performance radar per Member
  const memberPerformanceData = useMemo(() => {
    if (isDemoMode) {
      return [
        { subject: 'Hoàng', 'Hiệu suất': 85, 'Số task': 12, 'Số giờ': 18, 'Task khẩn cấp': 20, fullMark: 100 },
        { subject: 'Thảo', 'Hiệu suất': 92, 'Số task': 8, 'Số giờ': 12, 'Task khẩn cấp': 10, fullMark: 100 },
        { subject: 'Minh', 'Hiệu suất': 70, 'Số task': 15, 'Số giờ': 24, 'Task khẩn cấp': 30, fullMark: 100 }
      ];
    }

    return members.map(m => {
      const memberTasks = filteredTasks.filter(t => t.assigneeId === m.id || (t.assigneeIds && t.assigneeIds.includes(m.id)));
      const completed = memberTasks.filter(t => t.status === 'completed').length;
      const hoursLogged = memberTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
      const urgentDone = memberTasks.filter(t => t.status === 'completed' && t.priority === 'urgent').length;
      
      const score = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0;

      return {
        subject: m.name.split(' ')[0],
        'Hiệu suất': score,
        'Số task': memberTasks.length,
        'Số giờ': hoursLogged,
        'Task khẩn cấp': urgentDone * 10,
        fullMark: 100
      };
    }).filter(m => m['Số task'] > 0);
  }, [members, filteredTasks, isDemoMode]);

  // 5. Space task distribution
  const spaceDistributionData = useMemo(() => {
    if (isDemoMode) {
      return [
        { name: 'Dự án A', 'Tổng số': 15, 'Hoàn thành': 10, 'Số giờ': 28 },
        { name: 'Marketing', 'Tổng số': 8, 'Hoàn thành': 5, 'Số giờ': 14 }
      ];
    }

    const spaceIds = Array.from(new Set(filteredTasks.map(t => t.spaceId).filter(Boolean)));
    return spaceIds.map(sid => {
      const spaceObj = spaces.find(s => s.id === sid);
      const spaceTasks = filteredTasks.filter(t => t.spaceId === sid);
      const completed = spaceTasks.filter(t => t.status === 'completed').length;
      const hours = spaceTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);

      return {
        name: spaceObj?.name || 'Chung',
        'Tổng số': spaceTasks.length,
        'Hoàn thành': completed,
        'Số giờ': hours
      };
    });
  }, [filteredTasks, spaces, isDemoMode]);

  // Top Performer computation
  const topPerformer = useMemo<{ member: User; completed: number; hours: number } | null>(() => {
    if (isDemoMode && members.length > 0) {
      return {
        member: members[0],
        completed: 10,
        hours: 18
      };
    }

    if (members.length === 0 || filteredTasks.length === 0) return null;
    
    let bestMember: User | null = null;
    let maxCompleted = -1;
    let maxHours = -1;

    members.forEach(m => {
      const memberTasks = filteredTasks.filter(t => t.assigneeId === m.id);
      const completedCount = memberTasks.filter(t => t.status === 'completed').length;
      const hoursLogged = memberTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);

      if (completedCount > maxCompleted || (completedCount === maxCompleted && hoursLogged > maxHours)) {
        maxCompleted = completedCount;
        maxHours = hoursLogged;
        bestMember = m;
      }
    });

    return bestMember ? {
      member: bestMember,
      completed: maxCompleted,
      hours: maxHours
    } : null;
  }, [members, filteredTasks, isDemoMode]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-xl shadow-xl space-y-1 backdrop-blur-md z-50 text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
          <div className="space-y-0.5">
            {payload.map((item: any, idx: number) => (
              <p key={idx} className="text-xs font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                <span className="text-slate-300">{item.name}:</span>
                <span className="text-white font-extrabold font-mono">
                  {item.value} {item.name.includes('giờ') || item.name.includes('Số giờ') ? 'h' : 'việc'}
                </span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans select-none text-left">
      
      {/* ── Header Welcome & Controls Row ── */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100/40">
            Advanced Analytics Hub
          </span>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black font-display text-slate-850 dark:text-slate-50 tracking-tight">
              Thống Kê & Báo Cáo Hiệu Năng
            </h1>
            <BarChart3 className="w-5.5 h-5.5 text-indigo-500 animate-pulse shrink-0" />
          </div>
          <p className="text-xs md:text-sm text-slate-505 dark:text-slate-400 max-w-xl leading-relaxed">
            Phân tích tự động hiệu suất làm việc của thành viên, biểu đồ thời gian thực về tiến độ công việc và hiệu năng của các Space.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 w-full lg:w-auto shrink-0 text-xs font-bold">
          {/* Space Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <Compass className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-1.5" />
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 outline-none pr-3 py-1 text-xs cursor-pointer font-bold border-0 focus:ring-0"
            >
              <option value="all">Tất cả Space</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-1.5" />
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="bg-transparent text-slate-700 dark:text-slate-200 outline-none pr-3 py-1 text-xs cursor-pointer font-bold border-0 focus:ring-0"
            >
              <option value="all">Mọi lúc</option>
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
            </select>
          </div>

          {/* Demo Mode Toggle */}
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer select-none ${
              isDemoMode 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? 'animate-pulse text-white' : 'text-indigo-500'}`} />
            <span>{isDemoMode ? 'Demo Mode: ON' : 'Demo Mode'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tỷ Lệ Hoàn Thành', value: `${stats.completionRate}%`, desc: `Đã xong ${stats.completed}/${stats.total} đầu việc`, icon: CheckCircle2, status: stats.completionRate >= 80 ? 'positive' : stats.completionRate >= 50 ? 'neutral' : 'negative' },
          { label: 'Năng Suất Thời Gian', value: `${stats.loggedHours} giờ`, desc: `Kế hoạch ước tính: ${stats.estimatedHours}h`, icon: Clock, status: stats.loggedHours >= stats.estimatedHours ? 'positive' : 'neutral' },
          { label: 'Lead Time Trung Bình', value: `${stats.avgLeadTimeHours}h`, desc: 'Thời gian hoàn thành trung bình', icon: Zap, status: 'neutral' },
          { label: 'Đầu Việc Quá Hạn', value: stats.overdue, desc: 'Cần xử lý khẩn cấp ngay', icon: AlertCircle, status: stats.overdue > 0 ? 'negative' : 'positive' }
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">{card.label}</span>
              <div className={`p-2 rounded-xl border ${
                card.status === 'positive' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                  : card.status === 'negative' 
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400' 
                  : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              }`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h2 className="text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight font-display">{card.value}</h2>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wide">{card.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Charts Area ── */}
      {stats.total === 0 ? (
        <div className="p-16 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <TrendingUp className="w-12 h-12 text-slate-305 dark:text-slate-600 mx-auto animate-bounce" />
          <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-lg">Chưa tìm thấy dữ liệu phân tích</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Không tìm thấy công việc nào khớp với bộ lọc Space và Thời gian hiện tại. Hãy tạo các nhiệm vụ mới hoặc thay đổi bộ lọc.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. Area Chart: Weekly Velocity */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
              <h3 className="font-display font-black text-slate-850 dark:text-slate-100 text-base flex items-center gap-2">
                <LineChart className="w-4.5 h-4.5 text-indigo-500" />
                <span>Xu Hướng Hoàn Thành Công Việc Tuần Này</span>
              </h3>
              <p className="text-[11px] text-slate-450 dark:text-slate-500">So sánh số lượng task được tạo mới và hoàn thành theo ngày</p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="velocityCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="Đã tạo" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#velocityCreated)" />
                  <Area type="monotone" dataKey="Hoàn thành" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#velocityDone)" />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Donut Chart: Status Distribution */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <h3 className="font-display font-black text-slate-850 dark:text-slate-100 text-base flex items-center gap-2">
                <PieIcon className="w-4.5 h-4.5 text-indigo-500" />
                <span>Trạng Thái Công Việc</span>
              </h3>
              <p className="text-[11px] text-slate-450 dark:text-slate-500">Phân bố công việc theo trạng thái xử lý</p>
            </div>

            <div className="flex items-center justify-center py-6 relative">
              <div className="w-[160px] h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData.length > 0 ? statusChartData : [{ name: 'Trống', value: 1, color: '#e2e8f0' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(statusChartData.length > 0 ? statusChartData : [{ name: 'Trống', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">{stats.total}</span>
                <span className="text-[9px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-black mt-1">Tổng Task</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              {statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-550 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">
                    {item.value} ({Math.round((item.value / stats.total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Bar Chart: Space Distribution */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
              <h3 className="font-display font-black text-slate-850 dark:text-slate-100 text-base flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-indigo-500" />
                <span>Năng Suất Giữa Các Space</span>
              </h3>
              <p className="text-[11px] text-slate-450 dark:text-slate-500">So sánh số lượng công việc của từng Space</p>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spaceDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="Tổng số" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} name="Tổng đầu việc" />
                  <Bar dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Đã hoàn thành" />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 15 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Radar Chart: Member capability/performance stats */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
              <h3 className="font-display font-black text-slate-850 dark:text-slate-100 text-base flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-500" />
                <span>Chỉ Số Phân Phối Kỹ Năng & Nỗ Lực</span>
              </h3>
              <p className="text-[11px] text-slate-450 dark:text-slate-500">Hiệu suất và sự cống hiến thực tế của từng nhân viên</p>
            </div>

            {memberPerformanceData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-12">
                Chưa có dữ liệu thành viên đóng góp
              </div>
            ) : (
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={memberPerformanceData}>
                    <PolarGrid stroke="rgba(226, 232, 240, 0.4)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Hiệu suất (%)" dataKey="Hiệu suất" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    <Radar name="Số giờ đã log" dataKey="Số giờ" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 5. Award and Summary Cards */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Top Contributor Award */}
            {topPerformer ? (
              <motion.div 
                whileHover={{ scale: 1.005 }}
                className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-150/40 dark:border-indigo-900/35 shadow-sm flex items-center gap-5 text-left relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex items-center justify-center shrink-0">
                  <Award className="w-8 h-8 text-amber-500 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/30">
                    Top Contributor of Active Scope
                  </span>
                  <h4 className="text-base font-black text-slate-850 dark:text-slate-50 tracking-tight">
                    {topPerformer.member.name}
                  </h4>
                  <p className="text-xs text-slate-505 dark:text-slate-400 leading-normal">
                    Hoàn thành xuất sắc <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{topPerformer.completed} công việc</span> và đóng góp <span className="font-extrabold text-emerald-650 dark:text-emerald-400">{topPerformer.hours} giờ làm việc thực tế</span> trong khoảng thời gian này.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-xs text-slate-400">
                Chưa đủ số liệu xếp hạng thành viên cống hiến
              </div>
            )}

            {/* Workspace Health Indicator */}
            <motion.div 
              whileHover={{ scale: 1.005 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-150/40 dark:border-emerald-900/35 shadow-sm flex items-center gap-5 text-left relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-center shrink-0">
                <Flame className="w-8 h-8 text-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/30">
                  Workspace Health Score
                </span>
                <h4 className="text-base font-black text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-1.5">
                  <span>Chỉ số hoạt động:</span>
                  <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">{stats.completionRate}%</span>
                </h4>
                <p className="text-xs text-slate-505 dark:text-slate-400 leading-normal">
                  {stats.completionRate >= 80 
                    ? 'Tuyệt vời! Workspace đang hoạt động hết công suất và các nhiệm vụ được giải quyết nhanh chóng.' 
                    : stats.completionRate >= 50 
                    ? 'Ổn định. Hãy tập trung giải quyết các công việc đang ở trạng thái In Progress và Review.' 
                    : 'Cảnh báo. Tiến độ hoàn thành khá chậm, đề xuất phân bổ lại tài nguyên và đôn đốc các thành viên.'}
                </p>
              </div>
            </motion.div>

          </div>

        </div>
      )}

    </div>
  );
}
