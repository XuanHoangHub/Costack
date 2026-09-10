"use client";

import React, { useMemo } from 'react';
import {
  Folder,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Target,
  Sparkles,
  Layers
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task, Space } from '@/types';

interface DashboardMilestonesProps {
  tasks: Task[];
  spaces: Space[];
  onNavigate: (tab: string) => void;
  onSelectSpace?: (spaceId: string) => void;
}

export default function DashboardMilestones({
  tasks,
  spaces,
  onNavigate,
  onSelectSpace,
}: DashboardMilestonesProps) {
  const { locale } = useTranslation();

  const now = useMemo(() => Date.now(), []);

  const projectStats = useMemo(() => {
    if (!spaces || spaces.length === 0) return [];

    return spaces.map((space) => {
      const spaceTasks = tasks.filter((t) => t.spaceId === space.id);
      const total = spaceTasks.length;
      const completed = spaceTasks.filter((t) => t.status === 'completed').length;
      const inProgress = spaceTasks.filter((t) => t.status === 'inprogress').length;
      const overdue = spaceTasks.filter((t) => {
        if (t.status === 'completed' || !t.dueDate) return false;
        const d = new Date(t.dueDate);
        return !isNaN(d.getTime()) && d.getTime() < now;
      }).length;

      const remainingHours = spaceTasks
        .filter((t) => t.status !== 'completed')
        .reduce((sum, t) => sum + Number(t.hoursEstimate || 0), 0);

      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      let status: 'on_track' | 'at_risk' | 'delayed';
      if (overdue > 2) {
        status = 'delayed';
      } else if (overdue > 0 || (percentage < 30 && total > 5)) {
        status = 'at_risk';
      } else {
        status = 'on_track';
      }

      return {
        space,
        total,
        completed,
        inProgress,
        overdue,
        remainingHours,
        percentage,
        status,
      };
    }).sort((a, b) => b.total - a.total);
  }, [spaces, tasks, now]);

  if (!spaces || spaces.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#12141d] text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Tiến độ mục tiêu & Dự án' : 'Project Milestones & Goals'}
              </h3>
              <span className="rounded-md bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10.5px] font-bold text-violet-700 dark:text-violet-300">
                {projectStats.length} {locale === 'vi' ? 'không gian' : 'spaces'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === 'vi'
                ? 'Tổng hợp trạng thái tiến độ theo từng Không gian làm việc'
                : 'Workspace progress and delivery milestones by space'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer self-start sm:self-auto"
        >
          <span>{locale === 'vi' ? 'Xem tất cả không gian' : 'View all spaces'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-4">
        {projectStats.map((item) => {
          return (
            <div
              key={item.space.id}
              onClick={() => {
                if (onSelectSpace) {
                  onSelectSpace(item.space.id);
                } else {
                  onNavigate('tasks');
                }
              }}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-violet-300 hover:shadow-xs dark:border-slate-800 dark:bg-[#161822] cursor-pointer"
            >
              <div>
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 font-black text-xs shadow-3xs">
                      {item.space.emoji || <Folder className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-black text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {item.space.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {item.total} {locale === 'vi' ? 'công việc' : 'tasks'}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {item.status === 'on_track' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Đúng hạn' : 'On Track'}
                    </span>
                  )}
                  {item.status === 'at_risk' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Cần chú ý' : 'At Risk'}
                    </span>
                  )}
                  {item.status === 'delayed' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 shrink-0">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Chậm tiến độ' : 'Behind'}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {item.completed} / {item.total} {locale === 'vi' ? 'hoàn tất' : 'completed'}
                    </span>
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom stats */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {item.inProgress} {locale === 'vi' ? 'đang làm' : 'active'}
                  {item.overdue > 0 && ` · ${item.overdue} ${locale === 'vi' ? 'quá hạn' : 'overdue'}`}
                </span>
                <span className="font-mono font-semibold">
                  {item.remainingHours > 0 ? `${item.remainingHours}h ${locale === 'vi' ? 'còn lại' : 'left'}` : '0h'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
