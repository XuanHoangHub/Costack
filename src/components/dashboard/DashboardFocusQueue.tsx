"use client";

import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Zap,
  Flame,
  Calendar,
  Clock,
  Pin,
  Search,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  UserRound,
  X,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task, User } from '@/types';
import type { DashboardPriorityTab, HealthFilterKey } from './types';

interface DashboardFocusQueueProps {
  tasks: Task[];
  members: User[];
  onOpenTask?: (taskId: string) => void;
  onNavigate: (tab: string) => void;
  activeHealthFilter?: HealthFilterKey;
  onClearHealthFilter?: () => void;
}

const parseDateOnly = (val?: string): Date | null => {
  if (!val) return null;
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function DashboardFocusQueue({
  tasks,
  members,
  onOpenTask,
  onNavigate,
  activeHealthFilter = 'none',
  onClearHealthFilter,
}: DashboardFocusQueueProps) {
  const { locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<DashboardPriorityTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const memberMap = useMemo(() => {
    return new Map<string, User>(members.map((m) => [m.id, m]));
  }, [members]);

  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, [now]);

  // Filter tasks based on tabs, health filter, and search
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => t.status !== 'completed');

    // Apply Health Filter first if active
    if (activeHealthFilter === 'at_risk') {
      list = list.filter((t) => {
        const due = parseDateOnly(t.dueDate);
        const isOverdue = due && due.getTime() < now.getTime();
        return t.priority === 'urgent' || isOverdue;
      });
    } else if (activeHealthFilter === 'due_soon') {
      const threshold = now.getTime() + 7 * 24 * 60 * 60 * 1000;
      list = list.filter((t) => {
        const due = parseDateOnly(t.dueDate);
        return due && due.getTime() >= now.getTime() && due.getTime() <= threshold;
      });
    } else if (activeHealthFilter === 'unassigned') {
      list = list.filter((t) => !t.assigneeId && (!t.assigneeIds || t.assigneeIds.length === 0));
    } else if (activeHealthFilter === 'no_due_date') {
      list = list.filter((t) => !t.dueDate);
    }

    // Apply Priority Tab
    if (activeTab === 'urgent') {
      list = list.filter((t) => t.priority === 'urgent' || t.priority === 'high');
    } else if (activeTab === 'overdue') {
      list = list.filter((t) => {
        const due = parseDateOnly(t.dueDate);
        return due && due.getTime() < now.getTime();
      });
    } else if (activeTab === 'today') {
      list = list.filter((t) => t.dueDate && t.dueDate.startsWith(todayKey));
    } else if (activeTab === 'pinned') {
      list = list.filter((t) => t.isPinned);
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    // Sort order: Pinned first, then Urgent > High > Medium > Low, then dueDate asc
    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aWeight = priorityWeight[a.priority] || 0;
      const bWeight = priorityWeight[b.priority] || 0;
      if (aWeight !== bWeight) return bWeight - aWeight;

      const aDue = parseDateOnly(a.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bDue = parseDateOnly(b.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [tasks, activeHealthFilter, activeTab, searchQuery, now, todayKey]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const uncompleted = tasks.filter((t) => t.status !== 'completed');
    const urgent = uncompleted.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
    const overdue = uncompleted.filter((t) => {
      const due = parseDateOnly(t.dueDate);
      return due && due.getTime() < now.getTime();
    }).length;
    const today = uncompleted.filter((t) => t.dueDate && t.dueDate.startsWith(todayKey)).length;
    const pinned = uncompleted.filter((t) => t.isPinned).length;

    return { all: uncompleted.length, urgent, overdue, today, pinned };
  }, [tasks, now, todayKey]);

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 150, damping: 22 }}
      className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#12141d]/95 sm:p-6 text-left"
    >
      {/* Subtle ambient light */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />

      {/* Header Row: Title, Filters & Search */}
      <div className="relative z-10 mb-4 flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/80 bg-indigo-50 text-indigo-600 shadow-2xs dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              {locale === 'vi' ? 'Hàng ưu tiên cần xử lý' : 'Priority Action Queue'}
            </h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {locale === 'vi' 
                ? 'Tự động xếp theo mức độ cấp bách, hạn chót và công việc đã ghim' 
                : 'Ranked automatically by urgency, deadline and pinned work'}
            </p>
          </div>
        </div>

        {/* Right tools: Search input & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          
          {/* Live Search Input */}
          <div className="relative min-w-[180px] sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'vi' ? 'Tìm nhanh công việc...' : 'Quick search...'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:placeholder-slate-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80 text-xs font-bold overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: locale === 'vi' ? 'Tất cả' : 'All', count: tabCounts.all },
              { id: 'urgent', label: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', count: tabCounts.urgent },
              { id: 'overdue', label: locale === 'vi' ? 'Quá hạn' : 'Overdue', count: tabCounts.overdue },
              { id: 'today', label: locale === 'vi' ? 'Hôm nay' : 'Today', count: tabCounts.today },
              { id: 'pinned', label: locale === 'vi' ? 'Ghim' : 'Pinned', count: tabCounts.pinned },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardPriorityTab)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400 font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Active Health Filter banner if present */}
      {activeHealthFilter !== 'none' && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-indigo-50/70 border border-indigo-200/70 px-3 py-1.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {locale === 'vi' ? 'Đang lọc theo chỉ số sức khỏe công việc' : 'Filtered by task health metric'}
            </span>
          </span>
          <button
            type="button"
            onClick={onClearHealthFilter}
            className="flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 cursor-pointer"
          >
            <span>{locale === 'vi' ? 'Bỏ lọc' : 'Clear'}</span>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Task Cards Grid */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTasks.slice(0, 12).map((task, index) => {
            const dueDate = parseDateOnly(task.dueDate);
            const isOverdue = dueDate && dueDate.getTime() < now.getTime();
            const isToday = task.dueDate && task.dueDate.startsWith(todayKey);

            let dueLabel = locale === 'vi' ? 'Chưa đặt hạn' : 'No deadline';
            if (dueDate) {
              if (isOverdue) {
                const diffDays = Math.max(1, Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
                dueLabel = locale === 'vi' ? `Quá hạn ${diffDays} ngày` : `Overdue ${diffDays}d`;
              } else if (isToday) {
                dueLabel = locale === 'vi' ? 'Đến hạn hôm nay' : 'Due today';
              } else {
                dueLabel = dueDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                  day: '2-digit',
                  month: '2-digit',
                });
              }
            }

            const priorityBadge = task.priority === 'urgent'
              ? { text: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', bg: 'bg-rose-50 text-rose-600 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60' }
              : task.priority === 'high'
              ? { text: locale === 'vi' ? 'Cao' : 'High', bg: 'bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60' }
              : task.priority === 'medium'
              ? { text: locale === 'vi' ? 'Trung bình' : 'Medium', bg: 'bg-indigo-50 text-indigo-600 border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60' }
              : { text: locale === 'vi' ? 'Thấp' : 'Low', bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };

            const assignee = task.assigneeId ? memberMap.get(task.assigneeId) : null;

            return (
              <motion.button
                key={task.id}
                type="button"
                onClick={() => (onOpenTask ? onOpenTask(task.id) : onNavigate('calendar'))}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-left shadow-2xs hover:border-indigo-300/80 hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/50 dark:hover:border-indigo-800/80 dark:hover:bg-slate-900/80 transition-all cursor-pointer min-h-[140px]"
              >
                {/* Card Top: Rank, Priority, Pin */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400 tabular-nums">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${priorityBadge.bg}`}>
                        {priorityBadge.text}
                      </span>
                    </div>
                    {task.isPinned && (
                      <Pin className="h-3.5 w-3.5 text-indigo-500 rotate-45" />
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="mt-2.5 line-clamp-2 text-xs font-extrabold text-slate-800 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    {task.title}
                  </h4>
                </div>

                {/* Card Bottom: Assignee & Due Date */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80 text-[11px] font-medium">
                  {/* Assignee Avatar */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {assignee ? (
                      <>
                        <div className="relative h-5 w-5 rounded-full overflow-hidden bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[9px] shrink-0 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                          {assignee.avatar ? (
                            <img src={assignee.avatar} alt={assignee.name} className="h-full w-full object-cover" />
                          ) : (
                            assignee.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="truncate text-slate-600 dark:text-slate-400 max-w-[80px]">
                          {assignee.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic text-[10px]">
                        {locale === 'vi' ? 'Chưa giao' : 'Unassigned'}
                      </span>
                    )}
                  </div>

                  {/* Due Date */}
                  <span className={`inline-flex items-center gap-1 shrink-0 font-semibold ${
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : isToday
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <Calendar className="h-3 w-3" />
                    <span>{dueLabel}</span>
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300/70 bg-emerald-50/40 p-8 text-center dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-black text-slate-900 dark:text-white">
            {locale === 'vi' ? 'Hàng ưu tiên đang trống!' : 'All clear! No pending priority tasks'}
          </h4>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {locale === 'vi'
              ? 'Tất cả công việc ưu tiên trong phạm vi này đã được giải quyết hoặc chưa có nhiệm vụ mới.'
              : 'All urgent and pending tasks in this view have been resolved.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <span>{locale === 'vi' ? 'Xem toàn bộ danh sách' : 'View all tasks'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.section>
  );
}
