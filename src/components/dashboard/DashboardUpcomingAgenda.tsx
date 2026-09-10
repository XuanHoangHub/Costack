"use client";

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task, User, TaskStatus } from '@/types';
import SignedImage from '../SignedImage';

interface DashboardUpcomingAgendaProps {
  tasks: Task[];
  members: User[];
  onOpenTask?: (taskId: string) => void;
  onUpdateTask?: (task: Task) => void;
  onNavigate: (tab: string) => void;
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

const getPriorityBadge = (priority?: string, locale: string = 'vi') => {
  switch (priority) {
    case 'urgent':
      return { label: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/50' };
    case 'high':
      return { label: locale === 'vi' ? 'Cao' : 'High', bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/50' };
    case 'medium':
      return { label: locale === 'vi' ? 'Trung bình' : 'Medium', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/50' };
    default:
      return { label: locale === 'vi' ? 'Thấp' : 'Low', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60' };
  }
};

export default function DashboardUpcomingAgenda({
  tasks,
  members,
  onOpenTask,
  onUpdateTask,
  onNavigate,
}: DashboardUpcomingAgendaProps) {
  const { locale } = useTranslation();
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);

  const memberMap = useMemo(() => {
    return new Map<string, User>(members.map((m) => [m.id, m]));
  }, [members]);

  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const todayEnd = useMemo(() => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [now]);
  const tomorrowEnd = useMemo(() => {
    const d = new Date(todayEnd);
    d.setDate(d.getDate() + 1);
    return d;
  }, [todayEnd]);
  const weekEnd = useMemo(() => {
    const d = new Date(todayEnd);
    d.setDate(d.getDate() + 7);
    return d;
  }, [todayEnd]);

  // Group non-completed tasks
  const agendaGroups = useMemo(() => {
    const uncompleted = tasks.filter((t) => t.status !== 'completed' && t.dueDate);

    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const thisWeek: Task[] = [];

    uncompleted.forEach((t) => {
      const due = parseDateOnly(t.dueDate);
      if (!due) return;

      if (due.getTime() < todayStart.getTime()) {
        overdue.push(t);
      } else if (due.getTime() <= todayEnd.getTime()) {
        today.push(t);
      } else if (due.getTime() <= tomorrowEnd.getTime()) {
        tomorrow.push(t);
      } else if (due.getTime() <= weekEnd.getTime()) {
        thisWeek.push(t);
      }
    });

    return { overdue, today, tomorrow, thisWeek };
  }, [tasks, todayStart, todayEnd, tomorrowEnd, weekEnd]);

  const totalUpcomingCount =
    agendaGroups.overdue.length +
    agendaGroups.today.length +
    agendaGroups.tomorrow.length +
    agendaGroups.thisWeek.length;

  const handleQuickComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    onUpdateTask({
      ...task,
      status: 'completed' as TaskStatus,
      completedAt: new Date().toISOString(),
    });
    if (typeof window !== 'undefined') {
      (window as any).playSystemSound?.('complete');
    }
  };

  const handleQuickPostpone = (e: React.MouseEvent, task: Task, daysToAdd: number) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    const currentDue = parseDateOnly(task.dueDate) || new Date();
    currentDue.setDate(currentDue.getDate() + daysToAdd);
    const newDueDate = `${currentDue.getFullYear()}-${String(currentDue.getMonth() + 1).padStart(2, '0')}-${String(currentDue.getDate()).padStart(2, '0')}`;
    onUpdateTask({
      ...task,
      dueDate: newDueDate,
    });
    setRescheduleTaskId(null);
  };

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                {locale === 'vi' ? 'Lịch trình & Hạn chót' : 'Upcoming Agenda & Deadlines'}
              </h3>
              {agendaGroups.overdue.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {agendaGroups.overdue.length} {locale === 'vi' ? 'quá hạn' : 'overdue'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
              {locale === 'vi'
                ? `${totalUpcomingCount} công việc cần chú ý trong 7 ngày tới`
                : `${totalUpcomingCount} tasks scheduled for the next 7 days`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#0071e3] hover:text-[#0077ed] dark:text-[#0a84ff] cursor-pointer self-start sm:self-auto hover:underline"
        >
          <span>{locale === 'vi' ? 'Xem chế độ Lịch' : 'Open Calendar View'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {totalUpcomingCount === 0 ? (
        <div className="apexa-inset-group rounded-2xl bg-white dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.08] p-8 text-center shadow-xs">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {locale === 'vi' ? 'Không có hạn chót nào trong tuần tới' : 'No upcoming deadlines this week'}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5 font-normal">
            {locale === 'vi' ? 'Mọi công việc đều đang trong tầm kiểm soát!' : 'All tasks are completed or scheduled later!'}
          </p>
        </div>
      ) : (
        <div className="apexa-inset-group rounded-2xl bg-white dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/[0.05] dark:divide-white/[0.06]">
          
          {/* 1. Overdue Group (if any) */}
          {agendaGroups.overdue.length > 0 && (
            <div className="p-3.5 flex flex-col gap-2.5 bg-rose-500/[0.02] dark:bg-rose-950/[0.1]">
              <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="h-3 w-3" />
                  {locale === 'vi' ? 'Quá hạn' : 'Overdue'}
                </span>
                <span className="rounded-full bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                  {agendaGroups.overdue.length}
                </span>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[300px] custom-scrollbar pr-0.5">
                {agendaGroups.overdue.map((task) => (
                  <AgendaTaskItem
                    key={task.id}
                    task={task}
                    members={memberMap}
                    locale={locale}
                    onOpenTask={onOpenTask}
                    onQuickComplete={handleQuickComplete}
                    onQuickPostpone={handleQuickPostpone}
                    rescheduleTaskId={rescheduleTaskId}
                    setRescheduleTaskId={setRescheduleTaskId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. Today Group */}
          <div className="p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                {locale === 'vi' ? 'Hôm nay' : 'Today'}
              </span>
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                {agendaGroups.today.length}
              </span>
            </div>
            {agendaGroups.today.length === 0 ? (
              <p className="text-[11px] text-neutral-400 font-normal italic py-4 text-center">
                {locale === 'vi' ? 'Không có việc đến hạn hôm nay' : 'Nothing due today'}
              </p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[300px] custom-scrollbar pr-0.5">
                {agendaGroups.today.map((task) => (
                  <AgendaTaskItem
                    key={task.id}
                    task={task}
                    members={memberMap}
                    locale={locale}
                    onOpenTask={onOpenTask}
                    onQuickComplete={handleQuickComplete}
                    onQuickPostpone={handleQuickPostpone}
                    rescheduleTaskId={rescheduleTaskId}
                    setRescheduleTaskId={setRescheduleTaskId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 3. Tomorrow Group */}
          <div className="p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[11px] font-medium text-[#0071e3] dark:text-[#0a84ff] flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="h-3 w-3" />
                {locale === 'vi' ? 'Ngày mai' : 'Tomorrow'}
              </span>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                {agendaGroups.tomorrow.length}
              </span>
            </div>
            {agendaGroups.tomorrow.length === 0 ? (
              <p className="text-[11px] text-neutral-400 font-normal italic py-4 text-center">
                {locale === 'vi' ? 'Không có việc đến hạn ngày mai' : 'Nothing due tomorrow'}
              </p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[300px] custom-scrollbar pr-0.5">
                {agendaGroups.tomorrow.map((task) => (
                  <AgendaTaskItem
                    key={task.id}
                    task={task}
                    members={memberMap}
                    locale={locale}
                    onOpenTask={onOpenTask}
                    onQuickComplete={handleQuickComplete}
                    onQuickPostpone={handleQuickPostpone}
                    rescheduleTaskId={rescheduleTaskId}
                    setRescheduleTaskId={setRescheduleTaskId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 4. This Week Group */}
          <div className="p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                <CalendarDays className="h-3 w-3" />
                {locale === 'vi' ? 'Tuần này' : 'This Week'}
              </span>
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                {agendaGroups.thisWeek.length}
              </span>
            </div>
            {agendaGroups.thisWeek.length === 0 ? (
              <p className="text-[11px] text-neutral-400 font-normal italic py-4 text-center">
                {locale === 'vi' ? 'Lịch trình trống' : 'No tasks scheduled'}
              </p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[300px] custom-scrollbar pr-0.5">
                {agendaGroups.thisWeek.map((task) => (
                  <AgendaTaskItem
                    key={task.id}
                    task={task}
                    members={memberMap}
                    locale={locale}
                    onOpenTask={onOpenTask}
                    onQuickComplete={handleQuickComplete}
                    onQuickPostpone={handleQuickPostpone}
                    rescheduleTaskId={rescheduleTaskId}
                    setRescheduleTaskId={setRescheduleTaskId}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
        </div>
      )}
    </div>
  );
}

function AgendaTaskItem({
  task,
  members,
  locale,
  onOpenTask,
  onQuickComplete,
  onQuickPostpone,
  rescheduleTaskId,
  setRescheduleTaskId,
}: {
  task: Task;
  members: Map<string, User>;
  locale: string;
  onOpenTask?: (id: string) => void;
  onQuickComplete: (e: React.MouseEvent, task: Task) => void;
  onQuickPostpone: (e: React.MouseEvent, task: Task, days: number) => void;
  rescheduleTaskId: string | null;
  setRescheduleTaskId: (id: string | null) => void;
}) {
  const priorityInfo = getPriorityBadge(task.priority, locale);
  const assignee = task.assigneeId ? members.get(task.assigneeId) : null;
  const isRescheduleOpen = rescheduleTaskId === task.id;

  return (
    <div
      onClick={() => onOpenTask?.(task.id)}
      className="group relative rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:bg-[#fafafa] dark:hover:bg-white/[0.05] p-2.5 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => onQuickComplete(e, task)}
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-slate-300 text-transparent transition-all hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600 cursor-pointer"
          title={locale === 'vi' ? 'Đánh dấu hoàn thành' : 'Mark complete'}
        >
          <CheckCircle2 className="h-3.5 w-3.5 fill-current" />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {task.title}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            {/* Priority */}
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold border ${priorityInfo.bg}`}>
              {priorityInfo.label}
            </span>

            {/* Due date tag */}
            {task.dueDate && (
              <span className="font-numeric tabular-nums text-slate-400">
                {task.dueDate.split('T')[0]}
              </span>
            )}

            {/* Assignee Avatar */}
            {assignee && (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <SignedImage
                  filePath={assignee.avatar}
                  className="h-3.5 w-3.5 rounded-full object-cover"
                  alt={assignee.name}
                />
                <span className="truncate max-w-[60px]">{assignee.name.split(' ')[0]}</span>
              </span>
            )}
          </div>
        </div>

        {/* Reschedule trigger button */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRescheduleTaskId(isRescheduleOpen ? null : task.id);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            title={locale === 'vi' ? 'Dời hạn' : 'Postpone'}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>

          {isRescheduleOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 text-left"
            >
              <div className="px-2 py-1 text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                {locale === 'vi' ? 'Dời hạn chót' : 'Reschedule'}
              </div>
              <button
                type="button"
                onClick={(e) => onQuickPostpone(e, task, 1)}
                className="w-full text-left px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                +1 {locale === 'vi' ? 'ngày' : 'day'}
              </button>
              <button
                type="button"
                onClick={(e) => onQuickPostpone(e, task, 3)}
                className="w-full text-left px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                +3 {locale === 'vi' ? 'ngày' : 'days'}
              </button>
              <button
                type="button"
                onClick={(e) => onQuickPostpone(e, task, 7)}
                className="w-full text-left px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                +1 {locale === 'vi' ? 'tuần' : 'week'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
