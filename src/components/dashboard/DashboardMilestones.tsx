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
import { renderSpaceIcon } from '@/components/RenderSpaceIcon';

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
    <div className="flex flex-col gap-3 text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/20 text-violet-600 dark:text-violet-400 dark:shadow-[0_0_12px_rgba(139,92,246,0.2)]">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                {locale === 'vi' ? 'Tiến độ mục tiêu & Dự án' : 'Project Milestones & Goals'}
              </h3>
              <span className="rounded-full bg-violet-500/[0.08] dark:bg-violet-400/[0.12] px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                {projectStats.length} {locale === 'vi' ? 'không gian' : 'spaces'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
              {locale === 'vi'
                ? 'Tổng hợp trạng thái tiến độ theo từng Không gian làm việc'
                : 'Workspace progress and delivery milestones by space'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#0071e3] hover:text-[#0077ed] dark:text-[#0a84ff] cursor-pointer self-start sm:self-auto hover:underline"
        >
          <span>{locale === 'vi' ? 'Xem tất cả không gian' : 'View all spaces'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Projects Inset Group Grid */}
      <div className="apexa-inset-group rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-4 shadow-xs dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
              className="group relative flex flex-col justify-between rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-3.5 transition-all hover:bg-slate-50/80 dark:hover:bg-white/[0.06] cursor-pointer"
            >
              <div>
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:border dark:border-violet-500/20 dark:text-violet-400 font-semibold text-xs shadow-none">
                      {renderSpaceIcon(item.space.emoji || 'Folder', "h-4 w-4 shrink-0", undefined, { preserveEmoji: true })}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-[#0071e3] dark:group-hover:text-[#0a84ff] transition-colors">
                        {item.space.name}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {item.total} {locale === 'vi' ? 'công việc' : 'tasks'}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {item.status === 'on_track' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/25 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Đúng hạn' : 'On Track'}
                    </span>
                  )}
                  {item.status === 'at_risk' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/25 shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Cần chú ý' : 'At Risk'}
                    </span>
                  )}
                  {item.status === 'delayed' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/25 shrink-0">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Chậm tiến độ' : 'Behind'}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {item.completed} / {item.total} {locale === 'vi' ? 'hoàn tất' : 'completed'}
                    </span>
                    <span className="font-numeric font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0071e3] dark:bg-[#0a84ff] transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom stats */}
              <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {item.inProgress} {locale === 'vi' ? 'đang làm' : 'active'}
                  {item.overdue > 0 && ` · ${item.overdue} ${locale === 'vi' ? 'quá hạn' : 'overdue'}`}
                </span>
                <span className="font-numeric font-medium tabular-nums">
                  {item.remainingHours > 0 ? `${item.remainingHours}h ${locale === 'vi' ? 'còn lại' : 'left'}` : '0h'}
                </span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
