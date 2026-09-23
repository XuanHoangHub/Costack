"use client";

import React from 'react';
import {
  AlertCircle,
  CalendarDays,
  UserRound,
  Target,
  Clock,
  Check,
  X,
  Activity
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import type { HealthFilterKey, PeriodInsights } from './types';

interface DashboardHealthBarProps {
  periodInsights: PeriodInsights;
  activeHealthFilter: HealthFilterKey;
  onSelectHealthFilter: (filter: HealthFilterKey) => void;
  layout?: 'horizontal' | 'vertical';
}

export default function DashboardHealthBar({
  periodInsights,
  activeHealthFilter,
  onSelectHealthFilter,
  layout = 'horizontal',
}: DashboardHealthBarProps) {
  const { locale } = useTranslation();

  const healthItems = [
    {
      key: 'at_risk' as HealthFilterKey,
      label: locale === 'vi' ? 'Có rủi ro' : 'At Risk',
      value: periodInsights.atRisk,
      desc: locale === 'vi' ? 'Quá hạn hoặc khẩn cấp' : 'Overdue or urgent',
      icon: AlertCircle,
      tone: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/20 dark:border-rose-400/25 shadow-xs shadow-rose-500/10',
      activeRing: 'ring-1 ring-inset ring-rose-500/60 bg-rose-500/[0.08] dark:bg-rose-500/[0.12]',
      isFilterable: true,
    },
    {
      key: 'due_soon' as HealthFilterKey,
      label: locale === 'vi' ? 'Đến hạn 7 ngày' : 'Due in 7 Days',
      value: periodInsights.dueSoon,
      desc: locale === 'vi' ? 'Cần lên lịch giải quyết' : 'Needs scheduled focus',
      icon: CalendarDays,
      tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-400/25 shadow-xs shadow-amber-500/10',
      activeRing: 'ring-1 ring-inset ring-amber-500/60 bg-amber-500/[0.08] dark:bg-amber-500/[0.12]',
      isFilterable: true,
    },
    {
      key: 'unassigned' as HealthFilterKey,
      label: locale === 'vi' ? 'Chưa phân công' : 'Unassigned',
      value: periodInsights.unassigned,
      desc: locale === 'vi' ? 'Chưa có người phụ trách' : 'Awaiting owner',
      icon: UserRound,
      tone: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/20 dark:border-purple-400/25 shadow-xs shadow-purple-500/10',
      activeRing: 'ring-1 ring-inset ring-purple-500/60 bg-purple-500/[0.08] dark:bg-purple-500/[0.12]',
      isFilterable: true,
    },
    {
      key: 'no_due_date' as HealthFilterKey,
      label: locale === 'vi' ? 'Chưa có hạn' : 'No Due Date',
      value: periodInsights.noDueDate,
      desc: locale === 'vi' ? 'Thiếu mốc thời hạn' : 'Missing deadline',
      icon: Target,
      tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/20 dark:border-sky-400/25 shadow-xs shadow-sky-500/10',
      activeRing: 'ring-1 ring-inset ring-sky-500/60 bg-sky-500/[0.08] dark:bg-sky-500/[0.12]',
      isFilterable: true,
    },
    {
      key: 'none' as HealthFilterKey,
      label: locale === 'vi' ? 'Chu kỳ trung bình' : 'Avg Cycle Time',
      value: `${periodInsights.averageCycleDays}d`,
      desc: locale === 'vi' ? 'Từ tạo đến hoàn thành' : 'From create to done',
      icon: Clock,
      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-400/25 shadow-xs shadow-emerald-500/10',
      activeRing: '',
      isFilterable: false,
    },
  ];

  if (layout === 'vertical') {
    return (
      <section
        className="apexa-inset-group rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 text-left space-y-3"
        aria-label="Task Health Indicators"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-[#0071e3] dark:text-sky-400">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                {locale === 'vi' ? 'Sức khỏe công việc' : 'Task Health Pulse'}
              </h3>
              <p className="text-[10px] text-neutral-400 dark:text-zinc-400">
                {locale === 'vi' ? 'Nhấn để lọc theo tiêu chí' : 'Click to filter work queue'}
              </p>
            </div>
          </div>
          {activeHealthFilter !== 'none' && (
            <button
              type="button"
              onClick={() => onSelectHealthFilter('none')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-blue-600 dark:text-sky-400 bg-blue-500/10 hover:bg-blue-500/15 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>{locale === 'vi' ? 'Bỏ lọc' : 'Clear'}</span>
            </button>
          )}
        </div>

        {/* 5 items in vertical layout */}
        <div className="grid grid-cols-2 gap-2">
          {healthItems.map((item, idx) => {
            const isActive = item.isFilterable && activeHealthFilter === item.key;
            const isSpanFull = idx === healthItems.length - 1;
            return (
              <button
                key={item.label}
                type="button"
                disabled={!item.isFilterable}
                onClick={() => {
                  if (item.isFilterable) {
                    onSelectHealthFilter(isActive ? 'none' : item.key);
                  }
                }}
                className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  isSpanFull ? 'col-span-2' : 'col-span-1'
                } ${
                  item.isFilterable ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.025]' : 'cursor-default'
                } ${
                  isActive
                    ? 'border-blue-500/50 bg-blue-500/[0.08] dark:bg-blue-500/[0.12] ring-1 ring-blue-500/20'
                    : 'border-black/[0.04] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.02]'
                }`}
              >
                <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-transform group-hover:scale-105 ${item.tone}`}>
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-400">
                      {item.label}
                    </p>
                    {isActive && (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0071e3] text-white shrink-0">
                        <Check className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-extrabold tabular-nums text-neutral-900 dark:text-white">
                      {item.value}
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate hidden sm:inline">
                      {item.desc}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      className="apexa-inset-group rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden text-left"
      aria-label="Task Health Indicators"
    >
      <div className="grid grid-cols-2 divide-y divide-black/[0.05] dark:divide-white/[0.06] md:grid-cols-5 md:divide-y-0 md:divide-x">
        {healthItems.map((item) => {
          const isActive = item.isFilterable && activeHealthFilter === item.key;
          return (
            <button
              key={item.label}
              type="button"
              disabled={!item.isFilterable}
              onClick={() => {
                if (item.isFilterable) {
                  onSelectHealthFilter(isActive ? 'none' : item.key);
                }
              }}
              className={`group flex min-h-[86px] items-center gap-3 p-3.5 transition-all text-left ${
                item.isFilterable ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.025]' : 'cursor-default'
              } ${isActive ? 'bg-[#0071e3]/[0.06] dark:bg-[#0a84ff]/[0.1]' : ''}`}
            >
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition-transform duration-200 ${
                  item.tone
                } ${item.isFilterable ? 'group-hover:scale-105' : ''}`}
              >
                <item.icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 dark:text-zinc-400">
                    {item.label}
                  </p>
                  {isActive && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0071e3] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xl font-extrabold tabular-nums text-neutral-900 dark:text-white">
                  {item.value}
                </p>
                <p className="truncate text-[11px] font-medium text-neutral-400 dark:text-zinc-400">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
