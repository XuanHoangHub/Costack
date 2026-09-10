"use client";

import React from 'react';
import {
  AlertCircle,
  CalendarDays,
  UserRound,
  Target,
  Clock,
  Check,
  X
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import type { HealthFilterKey, PeriodInsights } from './types';

interface DashboardHealthBarProps {
  periodInsights: PeriodInsights;
  activeHealthFilter: HealthFilterKey;
  onSelectHealthFilter: (filter: HealthFilterKey) => void;
}

export default function DashboardHealthBar({
  periodInsights,
  activeHealthFilter,
  onSelectHealthFilter,
}: DashboardHealthBarProps) {
  const { locale } = useTranslation();

  const healthItems = [
    {
      key: 'at_risk' as HealthFilterKey,
      label: locale === 'vi' ? 'Có rủi ro' : 'At Risk',
      value: periodInsights.atRisk,
      desc: locale === 'vi' ? 'Quá hạn hoặc khẩn cấp' : 'Overdue or urgent',
      icon: AlertCircle,
      tone: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/60',
      activeRing: 'ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30',
      isFilterable: true,
    },
    {
      key: 'due_soon' as HealthFilterKey,
      label: locale === 'vi' ? 'Đến hạn 7 ngày' : 'Due in 7 Days',
      value: periodInsights.dueSoon,
      desc: locale === 'vi' ? 'Cần lên lịch giải quyết' : 'Needs scheduled focus',
      icon: CalendarDays,
      tone: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/60',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30',
      isFilterable: true,
    },
    {
      key: 'unassigned' as HealthFilterKey,
      label: locale === 'vi' ? 'Chưa phân công' : 'Unassigned',
      value: periodInsights.unassigned,
      desc: locale === 'vi' ? 'Chưa có người phụ trách' : 'Awaiting owner',
      icon: UserRound,
      tone: 'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/40 border-violet-200/70 dark:border-violet-800/60',
      activeRing: 'ring-2 ring-violet-500 bg-violet-50/40 dark:bg-violet-950/30',
      isFilterable: true,
    },
    {
      key: 'no_due_date' as HealthFilterKey,
      label: locale === 'vi' ? 'Chưa có hạn' : 'No Due Date',
      value: periodInsights.noDueDate,
      desc: locale === 'vi' ? 'Thiếu mốc thời hạn' : 'Missing deadline',
      icon: Target,
      tone: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/40 border-sky-200/70 dark:border-sky-800/60',
      activeRing: 'ring-2 ring-sky-500 bg-sky-50/40 dark:bg-sky-950/30',
      isFilterable: true,
    },
    {
      key: 'none' as HealthFilterKey,
      label: locale === 'vi' ? 'Chu kỳ trung bình' : 'Avg Cycle Time',
      value: `${periodInsights.averageCycleDays}d`,
      desc: locale === 'vi' ? 'Từ tạo đến hoàn thành' : 'From create to done',
      icon: Clock,
      tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60',
      activeRing: '',
      isFilterable: false,
    },
  ];

  return (
    <section
      className="apexa-inset-group rounded-2xl bg-white dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden text-left"
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
                item.isFilterable ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]' : 'cursor-default'
              } ${isActive ? 'bg-[#0071e3]/[0.06] dark:bg-[#0a84ff]/[0.1]' : ''}`}
            >
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-transform duration-200 ${
                  item.tone
                } ${item.isFilterable ? 'group-hover:scale-105' : ''}`}
              >
                <item.icon className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[10.5px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {item.label}
                  </p>
                  {isActive && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0071e3] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {item.value}
                </p>
                <p className="truncate text-[10.5px] font-normal text-neutral-400 dark:text-neutral-500">
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
