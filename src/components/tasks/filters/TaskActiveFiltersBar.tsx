"use client";

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Search,
  CheckCircle2,
  Flag,
  User,
  Calendar,
  Tag,
  Sliders,
  FilterX,
  Layers,
} from 'lucide-react';
import type {
  TaskFilterState,
  TaskDatePreset,
} from '@/lib/taskFilterSort';
import {
  STATUS_META,
  PRIORITY_META,
  defaultFilterState,
} from '@/lib/taskFilterSort';
import type { CustomFieldDefinition, TaskStatus, Priority, User as UserType } from '@/types';

interface TaskActiveFiltersBarProps {
  filterState: TaskFilterState;
  onChangeFilter: (state: TaskFilterState) => void;
  onClearAll: () => void;
  onOpenFilterDrawer?: (tab?: 'quick' | 'advanced') => void;
  totalTasksCount: number;
  filteredTasksCount: number;
  members?: UserType[];
  customFields?: CustomFieldDefinition[];
  locale?: string;
  className?: string;
}

const DATE_PRESET_LABELS: Record<TaskDatePreset, { vi: string; en: string }> = {
  all: { vi: 'Tất cả', en: 'All' },
  overdue: { vi: 'Quá hạn', en: 'Overdue' },
  today: { vi: 'Hôm nay', en: 'Today' },
  tomorrow: { vi: 'Ngày mai', en: 'Tomorrow' },
  this_week: { vi: 'Tuần này', en: 'This week' },
  next_week: { vi: 'Tuần tới', en: 'Next week' },
  no_date: { vi: 'Không có hạn', en: 'No due date' },
  has_date: { vi: 'Có hạn chót', en: 'Has due date' },
  custom: { vi: 'Tùy chỉnh ngày', en: 'Custom date' },
};

export default function TaskActiveFiltersBar({
  filterState,
  onChangeFilter,
  onClearAll,
  onOpenFilterDrawer,
  totalTasksCount,
  filteredTasksCount,
  members = [],
  customFields = [],
  locale = 'vi',
  className = '',
}: TaskActiveFiltersBarProps) {
  const isVi = locale === 'vi';
  const { query, quick, conditions, spaceFocus, showClosedTasks } = filterState;

  // Compute active chips
  const chips: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onRemove: () => void;
    onClick?: () => void;
  }> = [];

  // 1. Search Query
  if (query.trim()) {
    chips.push({
      id: 'query',
      icon: Search,
      label: `"${query.trim()}"`,
      onRemove: () => onChangeFilter({ ...filterState, query: '' }),
    });
  }

  // 2. Statuses
  if (quick.statuses.length > 0) {
    const labels = quick.statuses
      .map((s) => (isVi ? STATUS_META[s]?.labelVi : STATUS_META[s]?.labelEn) || s)
      .join(', ');
    chips.push({
      id: 'status',
      icon: CheckCircle2,
      label: `${isVi ? 'Trạng thái' : 'Status'}: ${labels}`,
      onRemove: () =>
        onChangeFilter({
          ...filterState,
          quick: { ...filterState.quick, statuses: [] },
        }),
      onClick: () => onOpenFilterDrawer?.('quick'),
    });
  }

  // 3. Priorities
  if (quick.priorities.length > 0) {
    const labels = quick.priorities
      .map((p) => (isVi ? PRIORITY_META[p]?.labelVi : PRIORITY_META[p]?.labelEn) || p)
      .join(', ');
    chips.push({
      id: 'priority',
      icon: Flag,
      label: `${isVi ? 'Ưu tiên' : 'Priority'}: ${labels}`,
      onRemove: () =>
        onChangeFilter({
          ...filterState,
          quick: { ...filterState.quick, priorities: [] },
        }),
      onClick: () => onOpenFilterDrawer?.('quick'),
    });
  }

  // 4. Assignees
  if (quick.assigneeIds.length > 0) {
    const labels = quick.assigneeIds
      .map((id) => {
        if (id === 'mine') return isVi ? 'Của tôi' : 'Assigned to me';
        if (id === 'unassigned') return isVi ? 'Chưa phân công' : 'Unassigned';
        const m = members.find((user) => user.id === id);
        return m?.name || m?.email || id;
      })
      .join(', ');
    chips.push({
      id: 'assignee',
      icon: User,
      label: `${isVi ? 'Người phụ trách' : 'Assignee'}: ${labels}`,
      onRemove: () =>
        onChangeFilter({
          ...filterState,
          quick: { ...filterState.quick, assigneeIds: [] },
        }),
      onClick: () => onOpenFilterDrawer?.('quick'),
    });
  }

  // 5. Date Preset
  if (quick.datePreset !== 'all') {
    const dateLabel = isVi
      ? DATE_PRESET_LABELS[quick.datePreset]?.vi || quick.datePreset
      : DATE_PRESET_LABELS[quick.datePreset]?.en || quick.datePreset;
    chips.push({
      id: 'date',
      icon: Calendar,
      label: `${isVi ? 'Hạn' : 'Due'}: ${dateLabel}`,
      onRemove: () =>
        onChangeFilter({
          ...filterState,
          quick: { ...filterState.quick, datePreset: 'all', customStartDate: '', customEndDate: '' },
        }),
      onClick: () => onOpenFilterDrawer?.('quick'),
    });
  }

  // 6. Tags
  quick.tags.forEach((tag) => {
    chips.push({
      id: `tag-${tag}`,
      icon: Tag,
      label: `#${tag}`,
      onRemove: () =>
        onChangeFilter({
          ...filterState,
          quick: { ...filterState.quick, tags: filterState.quick.tags.filter((t) => t !== tag) },
        }),
    });
  });

  // 7. Space Focus (if not 'all')
  if (spaceFocus && spaceFocus !== 'all') {
    const focusNames: Record<string, { vi: string; en: string }> = {
      mine: { vi: 'Của tôi', en: 'Assigned to me' },
      today: { vi: 'Hôm nay', en: 'Due today' },
      overdue: { vi: 'Quá hạn', en: 'Overdue' },
      priority: { vi: 'Ưu tiên cao', en: 'High priority' },
      unassigned: { vi: 'Chưa phân công', en: 'Unassigned' },
      completed: { vi: 'Đã hoàn thành', en: 'Completed' },
    };
    chips.push({
      id: 'spaceFocus',
      icon: Sliders,
      label: `${isVi ? 'Tiêu điểm' : 'Focus'}: ${isVi ? focusNames[spaceFocus]?.vi : focusNames[spaceFocus]?.en || spaceFocus}`,
      onRemove: () => onChangeFilter({ ...filterState, spaceFocus: 'all' }),
    });
  }

  // 8. Hidden closed tasks
  if (!showClosedTasks) {
    chips.push({
      id: 'closedTasks',
      icon: CheckCircle2,
      label: isVi ? 'Ẩn việc đã hoàn thành' : 'Hide closed tasks',
      onRemove: () => onChangeFilter({ ...filterState, showClosedTasks: true }),
    });
  }

  // 9. Advanced Conditions
  conditions.forEach((cond) => {
    let fieldName = cond.field;
    if (cond.field === 'title') fieldName = isVi ? 'Tiêu đề' : 'Title';
    else if (cond.field === 'status') fieldName = isVi ? 'Trạng thái' : 'Status';
    else if (cond.field === 'priority') fieldName = isVi ? 'Ưu tiên' : 'Priority';
    else if (cond.field === 'assignee') fieldName = isVi ? 'Người phụ trách' : 'Assignee';
    else if (cond.field.startsWith('custom:')) fieldName = cond.field.slice(7);

    const opMap: Record<string, string> = {
      is: '=',
      isNot: '≠',
      contains: '∋',
      notContains: '∌',
      isEmpty: isVi ? 'trống' : 'empty',
      isNotEmpty: isVi ? 'có giá trị' : 'not empty',
      gt: '>',
      lt: '<',
      gte: '≥',
      lte: '≤',
      before: '<',
      after: '>',
    };
    const opLabel = opMap[cond.operator] || cond.operator;
    const valDisplay = cond.operator === 'isEmpty' || cond.operator === 'isNotEmpty' ? '' : ` "${cond.value}"`;

    chips.push({
      id: `cond-${cond.id}`,
      icon: Layers,
      label: `${fieldName} ${opLabel}${valDisplay}`,
      onRemove: () =>
        onChangeFilter({
          ...filterState,
          conditions: filterState.conditions.filter((c) => c.id !== cond.id),
        }),
      onClick: () => onOpenFilterDrawer?.('advanced'),
    });
  });

  if (chips.length === 0) return null;

  return (
    <div
      className={`shrink-0 border-b border-slate-200/70 dark:border-white/[0.06] bg-slate-50/70 dark:bg-[#07090f]/70 px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
        {/* Counter indicator */}
        <div className="flex items-center gap-1.5 pl-0.5 pr-2 shrink-0 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
          <span className="text-slate-800 dark:text-white font-black">{filteredTasksCount}</span>
          <span>/</span>
          <span>{totalTasksCount} {isVi ? 'việc' : 'tasks'}</span>
        </div>

        <div className="h-3.5 w-px bg-slate-200 dark:bg-white/10 shrink-0" />

        {/* Chips list */}
        <AnimatePresence>
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <motion.div
                key={chip.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="group inline-flex items-center gap-1 bg-white dark:bg-white/[0.07] border border-slate-200/80 dark:border-white/10 rounded-lg pl-2 pr-1 py-0.5 shadow-3xs text-[11px] font-semibold text-slate-700 dark:text-zinc-200 shrink-0 hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                <button
                  type="button"
                  onClick={chip.onClick}
                  className="flex items-center gap-1 cursor-pointer truncate max-w-[200px]"
                  title={chip.label}
                >
                  <Icon className="w-3 h-3 text-slate-400 dark:text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                  <span className="truncate">{chip.label}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chip.onRemove();
                  }}
                  className="w-4 h-4 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer transition-colors shrink-0 ml-0.5"
                  title={isVi ? 'Bỏ bộ lọc này' : 'Remove filter'}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Clear all action */}
      <button
        type="button"
        onClick={onClearAll}
        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
        title={isVi ? 'Xóa tất cả bộ lọc' : 'Clear all filters'}
      >
        <FilterX className="w-3 h-3" />
        <span className="hidden sm:inline">{isVi ? 'Xóa bộ lọc' : 'Clear all'}</span>
      </button>
    </div>
  );
}
