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
  ChevronRight,
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

      const aWeight = (a.priority && priorityWeight[a.priority]) || 0;
      const bWeight = (b.priority && priorityWeight[b.priority]) || 0;
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
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-3 text-left"
    >
      {/* Header Row: Title, Filters & Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-1">
        
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-[#0071e3] dark:text-blue-400 dark:shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
              {locale === 'vi' ? 'Hàng ưu tiên cần xử lý' : 'Priority Action Queue'}
            </h2>
            <p className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {locale === 'vi' 
                ? 'Tự động xếp theo mức độ cấp bách, hạn chót và công việc đã ghim' 
                : 'Ranked automatically by urgency, deadline and pinned work'}
            </p>
          </div>
        </div>

        {/* Right tools: Search input & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          
          {/* Live Search Input */}
          <div className="relative min-w-[170px] sm:w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'vi' ? 'Tìm nhanh...' : 'Quick search...'}
              className="w-full rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] pl-8 pr-7 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#161926] dark:focus:border-blue-500/50 focus:outline-none dark:text-neutral-200 dark:placeholder-neutral-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs (Apple Capsule Segmented) */}
          <div className="apexa-segmented-capsule overflow-x-auto scrollbar-none">
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
                data-active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as DashboardPriorityTab)}
                className="apexa-segmented-pill flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                    activeTab === tab.id
                      ? 'bg-black/[0.06] dark:bg-white/[0.1] text-neutral-800 dark:text-neutral-200'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-neutral-500'
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
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#0071e3]/[0.06] border border-[#0071e3]/20 px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 dark:bg-blue-500/10 dark:border-blue-500/25">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#0071e3] dark:text-blue-400" />
            <span className="font-medium">
              {locale === 'vi' ? 'Đang lọc theo chỉ số sức khỏe công việc' : 'Filtered by task health metric'}
            </span>
          </span>
          <button
            type="button"
            onClick={onClearHealthFilter}
            className="flex items-center gap-1 text-[11px] font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline cursor-pointer"
          >
            <span>{locale === 'vi' ? 'Bỏ lọc' : 'Clear'}</span>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Apple Inset Grouped List */}
      {filteredTasks.length > 0 ? (
        <div className="apexa-inset-group divide-y divide-black/[0.05] dark:divide-white/[0.05] rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] shadow-xs dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden">
          {filteredTasks.slice(0, 10).map((task, index) => {
            const dueDate = parseDateOnly(task.dueDate);
            const isOverdue = dueDate && dueDate.getTime() < now.getTime();
            const isToday = task.dueDate && task.dueDate.startsWith(todayKey);

            let dueLabel = locale === 'vi' ? 'Chưa đặt hạn' : 'No deadline';
            if (dueDate) {
              if (isOverdue) {
                const diffDays = Math.max(1, Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
                dueLabel = locale === 'vi' ? `Quá hạn ${diffDays}d` : `Overdue ${diffDays}d`;
              } else if (isToday) {
                dueLabel = locale === 'vi' ? 'Hôm nay' : 'Today';
              } else {
                dueLabel = dueDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                  day: '2-digit',
                  month: '2-digit',
                });
              }
            }

            const priorityBadge = task.priority === 'urgent'
              ? { text: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', bg: 'bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25' }
              : task.priority === 'high'
              ? { text: locale === 'vi' ? 'Cao' : 'High', bg: 'bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25' }
              : task.priority === 'medium'
              ? { text: locale === 'vi' ? 'Trung bình' : 'Medium', bg: 'bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25' }
              : { text: locale === 'vi' ? 'Thấp' : 'Low', bg: 'bg-neutral-100 text-neutral-600 border border-neutral-200/80 dark:bg-white/[0.05] dark:text-neutral-400 dark:border-white/[0.08]' };

            const assignee = task.assigneeId ? memberMap.get(task.assigneeId) : null;

            return (
              <div
                key={task.id}
                onClick={() => (onOpenTask ? onOpenTask(task.id) : onNavigate('calendar'))}
                className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.035] transition-colors cursor-pointer"
              >
                {/* Left: Rank, Status Dot, Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-[11px] font-mono font-medium text-neutral-400 dark:text-neutral-500 tabular-nums w-4 shrink-0 text-center">
                    {index + 1}
                  </span>

                  <div className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 dark:border-white/20 group-hover:border-[#0071e3] dark:group-hover:border-[#0a84ff] transition-colors shrink-0" />

                  <span className="truncate text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-[#0071e3] dark:group-hover:text-[#0a84ff] transition-colors">
                    {task.title}
                  </span>

                  {task.isPinned && (
                    <Pin className="h-3 w-3 text-[#0071e3] shrink-0 rotate-45" />
                  )}
                </div>

                {/* Right metadata: Priority, Assignee, Due Date */}
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className={`hidden sm:inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityBadge.bg}`}>
                    {priorityBadge.text}
                  </span>

                  {/* Assignee Avatar */}
                  <div className="flex items-center gap-1.5">
                    {assignee ? (
                      <div className="relative h-5 w-5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium flex items-center justify-center text-[9px] shrink-0" title={assignee.name}>
                        {assignee.avatar ? (
                          <img src={assignee.avatar} alt={assignee.name} className="h-full w-full object-cover" />
                        ) : (
                          assignee.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    ) : (
                      <span className="hidden md:inline text-neutral-400 dark:text-neutral-500 text-[11px]">
                        —
                      </span>
                    )}
                  </div>

                  {/* Due Date */}
                  <span className={`inline-flex items-center gap-1 font-medium text-[11px] tabular-nums min-w-[70px] justify-end ${
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400'
                      : isToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}>
                    <Clock className="h-3 w-3 opacity-70" />
                    <span>{dueLabel}</span>
                  </span>

                  <ChevronRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0a0b10] p-8 text-center dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h4 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
            {locale === 'vi' ? 'Hàng ưu tiên đang trống!' : 'All clear! No pending priority tasks'}
          </h4>
          <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400 font-normal">
            {locale === 'vi'
              ? 'Tất cả công việc ưu tiên trong phạm vi này đã được giải quyết hoặc chưa có nhiệm vụ mới.'
              : 'All urgent and pending tasks in this view have been resolved.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <span>{locale === 'vi' ? 'Xem toàn bộ danh sách' : 'View all tasks'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.section>
  );
}
