"use client";

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Task, User, Space } from '../types';
import {
  Settings, Plus, CheckCircle2, Clock, AlertTriangle, 
  LayoutList, Users, Activity,
  ListChecks, Target, BarChart3, ChevronRight, Briefcase
} from 'lucide-react';

// ── Theme color map ──
const THEME_COLORS: Record<string, { 
  gradient: string; 
  bg: string; 
  text: string; 
  border: string;
  ring: string;
  badge: string;
  badgeText: string;
  accent: string;
  accentLight: string;
}> = {
  indigo: {
    gradient: 'from-indigo-500 via-violet-500 to-purple-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200/60',
    ring: '#7B61FF',
    badge: 'bg-indigo-50 border-indigo-100',
    badgeText: 'text-indigo-600',
    accent: '#7B61FF',
    accentLight: 'rgba(123, 97, 255, 0.08)',
  },
  rose: {
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200/60',
    ring: '#e11d48',
    badge: 'bg-rose-50 border-rose-100',
    badgeText: 'text-rose-600',
    accent: '#e11d48',
    accentLight: 'rgba(225, 29, 72, 0.08)',
  },
  sky: {
    gradient: 'from-sky-500 via-cyan-500 to-teal-400',
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200/60',
    ring: '#0284c7',
    badge: 'bg-sky-50 border-sky-100',
    badgeText: 'text-sky-600',
    accent: '#0284c7',
    accentLight: 'rgba(2, 132, 199, 0.08)',
  },
  emerald: {
    gradient: 'from-emerald-500 via-green-500 to-teal-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200/60',
    ring: '#059669',
    badge: 'bg-emerald-50 border-emerald-100',
    badgeText: 'text-emerald-600',
    accent: '#059669',
    accentLight: 'rgba(5, 150, 105, 0.08)',
  },
  sunset: {
    gradient: 'from-orange-500 via-rose-500 to-pink-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200/60',
    ring: '#ea580c',
    badge: 'bg-orange-50 border-orange-100',
    badgeText: 'text-orange-600',
    accent: '#ea580c',
    accentLight: 'rgba(234, 88, 12, 0.08)',
  },
};

// ── SVG Progress Ring ──
function ProgressRing({ percent, color, size = 100, strokeWidth = 8 }: { percent: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.04)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      />
    </svg>
  );
}

// ── Helper: format relative time ──
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
}

// ── Props ──
interface SpaceOverviewProps {
  space: Space;
  tasks: Task[];
  members: User[];
  onOpenSettings: (space: Space) => void;
  onOpenList: (spaceId: string, listId: string) => void;
  onAddList: (spaceId: string) => void;
  onNavigateToTasks: () => void;
  triggerToast?: (type: string, title: string, message: string) => void;
}

export default function SpaceOverview({
  space,
  tasks,
  members,
  onOpenSettings,
  onOpenList,
  onAddList,
  onNavigateToTasks,
  triggerToast,
}: SpaceOverviewProps) {
  const theme = THEME_COLORS[space.themeColor || 'indigo'] || THEME_COLORS.indigo;

  // ── Computed stats ──
  const spaceTasks = useMemo(() => tasks.filter(t => t.spaceId === space.id), [tasks, space.id]);
  const totalTasks = spaceTasks.length;
  const inProgressTasks = spaceTasks.filter(t => t.status === 'inprogress').length;
  const completedTasks = spaceTasks.filter(t => t.status === 'completed').length;
  const todoTasks = spaceTasks.filter(t => t.status === 'todo').length;
  const reviewTasks = spaceTasks.filter(t => t.status === 'review').length;
  const overdueTasks = spaceTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && t.status !== 'completed';
  }).length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority distribution
  const priorityDist = useMemo(() => ({
    urgent: spaceTasks.filter(t => t.priority === 'urgent').length,
    high: spaceTasks.filter(t => t.priority === 'high').length,
    medium: spaceTasks.filter(t => t.priority === 'medium').length,
    low: spaceTasks.filter(t => t.priority === 'low').length,
  }), [spaceTasks]);

  const maxPriority = Math.max(priorityDist.urgent, priorityDist.high, priorityDist.medium, priorityDist.low, 1);

  // ── Active members (assigned to tasks in this space) ──
  const activeMembers = useMemo(() => {
    const assigneeMap = new Map<string, number>();
    spaceTasks.forEach(t => {
      const ids = t.assigneeIds?.length ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []);
      ids.forEach(id => assigneeMap.set(id, (assigneeMap.get(id) || 0) + 1));
    });
    return members
      .filter(m => assigneeMap.has(m.id))
      .map(m => ({ ...m, taskCount: assigneeMap.get(m.id) || 0 }))
      .sort((a, b) => b.taskCount - a.taskCount);
  }, [spaceTasks, members]);

  // ── List stats ──
  const listStats = useMemo(() => {
    return space.lists.map(list => {
      const listTasks = spaceTasks.filter(t => t.listId === list.id);
      const completed = listTasks.filter(t => t.status === 'completed').length;
      const total = listTasks.length;
      return {
        ...list,
        totalTasks: total,
        completedTasks: completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [space.lists, spaceTasks]);

  // ── Recent activity (derived from tasks) ──
  const recentActivity = useMemo(() => {
    const activities: { id: string; text: string; time: string; icon: 'create' | 'complete' | 'update' }[] = [];
    
    const sorted = [...spaceTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    sorted.slice(0, 3).forEach(t => {
      activities.push({
        id: `create-${t.id}`,
        text: `Task "${t.title}" created`,
        time: formatRelativeTime(t.createdAt),
        icon: 'create',
      });
    });

    spaceTasks
      .filter(t => t.status === 'completed')
      .slice(0, 2)
      .forEach(t => {
        activities.push({
          id: `done-${t.id}`,
          text: `"${t.title}" completed`,
          time: formatRelativeTime(t.createdAt),
          icon: 'complete',
        });
      });

    return activities.slice(0, 5);
  }, [spaceTasks]);

  // ── Stat cards data ──
  const statCards = [
    { label: 'Total Tasks', value: totalTasks, icon: Briefcase, color: theme.accent, bgColor: theme.accentLight },
    { label: 'In Progress', value: inProgressTasks, icon: Clock, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.08)' },
    { label: 'Completed', value: completedTasks, icon: CheckCircle2, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
    { label: 'Overdue', value: overdueTasks, icon: AlertTriangle, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm"
      >
        {/* Gradient accent top bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />
        
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100"
              style={{ background: theme.accentLight }}
            >
              {space.emoji || '📦'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                {space.name}
                <span 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge} ${theme.badgeText}`}
                >
                  {space.lists.length} Lists
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalTasks} tasks · {completedTasks} completed · {overdueTasks > 0 ? `${overdueTasks} overdue` : 'No overdue'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToTasks}
              className="px-3.5 py-2 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LayoutList className="w-3.5 h-3.5" />
              View Tasks
            </button>
            <button
              onClick={() => onOpenSettings(space)}
              className="px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5"
              style={{ color: theme.accent, borderColor: theme.accent + '40', background: theme.accentLight }}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Stats + Progress Ring ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
                className="bg-white rounded-2xl border border-slate-200/60 p-4 flex flex-col gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow"
              >
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: stat.bgColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Progress Ring + Priority Bars */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-2xl border border-slate-200/60 p-5 flex items-center gap-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-w-[280px]"
        >
          <div className="relative">
            <ProgressRing percent={completionPercent} color={theme.ring} size={90} strokeWidth={7} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-slate-900">{completionPercent}%</span>
              <span className="text-[8px] font-semibold text-slate-400 uppercase">Completed</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Priority Distribution</div>
            {[
              { key: 'urgent', label: 'Urgent', color: '#ef4444', count: priorityDist.urgent },
              { key: 'high', label: 'High', color: '#f59e0b', count: priorityDist.high },
              { key: 'medium', label: 'Normal', color: '#3b82f6', count: priorityDist.medium },
              { key: 'low', label: 'Low', color: '#94a3b8', count: priorityDist.low },
            ].map(p => (
              <div key={p.key} className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 w-7 text-right">{p.label}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: p.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.count / maxPriority) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-400 w-4">{p.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══ Status Breakdown Bar ═══ */}
      {totalTasks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Overall progress
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-px">
            {todoTasks > 0 && (
              <motion.div
                className="h-full bg-slate-300 rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${(todoTasks / totalTasks) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                title={`To Do: ${todoTasks}`}
              />
            )}
            {inProgressTasks > 0 && (
              <motion.div
                className="h-full bg-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
                title={`In Progress: ${inProgressTasks}`}
              />
            )}
            {reviewTasks > 0 && (
              <motion.div
                className="h-full bg-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${(reviewTasks / totalTasks) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
                title={`Review: ${reviewTasks}`}
              />
            )}
            {completedTasks > 0 && (
              <motion.div
                className="h-full bg-emerald-400 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.6 }}
                title={`Done: ${completedTasks}`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            {[
              { label: 'To Do', color: 'bg-slate-300', count: todoTasks },
              { label: 'In Progress', color: 'bg-amber-400', count: inProgressTasks },
              { label: 'Review', color: 'bg-cyan-400', count: reviewTasks },
              { label: 'Done', color: 'bg-emerald-400', count: completedTasks },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-[9px] font-semibold text-slate-400">{s.label} ({s.count})</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ Lists Grid + Team Members ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Lists Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <ListChecks className="w-4 h-4" style={{ color: theme.accent }} />
              Lists
            </h3>
            <button
              onClick={() => onAddList(space.id)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:opacity-80"
              style={{ color: theme.accent, background: theme.accentLight }}
            >
              <Plus className="w-3 h-3" />
              Add List
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {listStats.map((list, i) => (
              <motion.button
                key={list.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                onClick={() => onOpenList(space.id, list.id)}
                className="group text-left p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-white transition-all cursor-pointer hover:shadow-sm"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ background: theme.accent }} 
                    />
                    <span className="text-xs font-bold text-slate-800 truncate">{list.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {list.totalTasks} tasks · {list.completedTasks} done
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: theme.accent }}>
                    {list.progress}%
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: theme.accent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${list.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.05 }}
                  />
                </div>
              </motion.button>
            ))}

            {listStats.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-400 text-xs italic">
                No lists yet. Click &quot;Add List&quot; to start.
              </div>
            )}
          </div>
        </motion.div>

        {/* Team Members */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
        >
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: theme.accent }} />
            Active Members
            <span className="ml-auto text-[10px] font-bold text-slate-400">{activeMembers.length}</span>
          </h3>

          <div className="space-y-2">
            {activeMembers.length > 0 ? (
              activeMembers.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <img 
                    src={member.avatar} 
                    alt={member.name} 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{member.name}</div>
                    <div className="text-[10px] text-slate-400">{member.taskCount} task{member.taskCount !== 1 ? 's' : ''} assigned</div>
                  </div>
                  <div 
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: theme.accentLight, color: theme.accent }}
                  >
                    {member.taskCount}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                No members have been assigned tasks in this Space yet.
              </div>
            )}
          </div>

          {/* Avatar stack preview */}
          {activeMembers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {activeMembers.slice(0, 5).map(m => (
                    <img 
                      key={m.id}
                      src={m.avatar} 
                      alt={m.name}
                      className="w-6 h-6 rounded-full border-2 border-white"
                      title={m.name}
                    />
                  ))}
                  {activeMembers.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                      +{activeMembers.length - 5}
                    </div>
                  )}
                </div>
                <span className="ml-2.5 text-[10px] text-slate-400 font-medium">
                  {activeMembers.length} participants
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══ ClickApps + Activity Feed ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ClickApps Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
        >
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: theme.accent }} />
            Enabled ClickApps
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'subtasks', label: 'Subtasks', icon: '📋' },
              { key: 'priorities', label: 'Priorities', icon: '🎯' },
              { key: 'customFields', label: 'Custom Fields', icon: '🧩' },
              { key: 'timeTracking', label: 'Time Tracking', icon: '⏱️' },
              { key: 'multipleAssignees', label: 'Multi Assignees', icon: '👥' },
              { key: 'relationships', label: 'Relationships', icon: '🔗' },
            ].map(app => {
              const isEnabled = space.clickApps?.[app.key as keyof typeof space.clickApps];
              return (
                <div
                  key={app.key}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isEnabled 
                      ? 'bg-emerald-50/60 text-emerald-700 border border-emerald-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}
                >
                  <span className="text-sm">{app.icon}</span>
                  <span className="truncate">{app.label}</span>
                  {isEnabled && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
        >
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: theme.accent }} />
            Recent Activity
          </h3>

          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((act, i) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    act.icon === 'complete' ? 'bg-emerald-50 text-emerald-500' :
                    act.icon === 'create' ? 'bg-blue-50 text-blue-500' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {act.icon === 'complete' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : act.icon === 'create' ? (
                      <Plus className="w-3.5 h-3.5" />
                    ) : (
                      <Activity className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 font-medium leading-snug truncate">{act.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                No activity yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
