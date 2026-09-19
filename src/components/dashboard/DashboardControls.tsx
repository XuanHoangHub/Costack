"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Download,
  Crown,
  Settings2,
  LineChart,
  BarChart3,
  RotateCcw,
  LockKeyhole,
  Check,
  Plus
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import type { DashboardRange, DashboardChartMode, DashboardWidgetKey, PeriodInsights } from './types';

interface DashboardControlsProps {
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  chartMode: DashboardChartMode;
  onChartModeChange: (mode: DashboardChartMode) => void;
  periodInsights: PeriodInsights;
  isPremium?: boolean;
  onUpgradePremium?: () => void;
  onExportCsv: () => void;
  visibleWidgets: Record<DashboardWidgetKey, boolean>;
  onToggleWidget: (key: DashboardWidgetKey) => void;
  onResetPreferences: () => void;
  onOpenQuickTask?: () => void;
}

export default function DashboardControls({
  range,
  onRangeChange,
  chartMode,
  onChartModeChange,
  periodInsights,
  isPremium,
  onUpgradePremium,
  onExportCsv,
  visibleWidgets,
  onToggleWidget,
  onResetPreferences,
  onOpenQuickTask,
}: DashboardControlsProps) {
  const { locale } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  const widgetLabels: Array<[DashboardWidgetKey, string]> = [
    ['kpis', locale === 'vi' ? 'Thẻ chỉ số tổng quan (KPIs)' : 'Overview KPI Cards'],
    ['health', locale === 'vi' ? 'Thanh sức khỏe công việc' : 'Task Health Strip'],
    ['focus', locale === 'vi' ? 'Hàng công việc ưu tiên' : 'Priority Focus Queue'],
    ['agenda', locale === 'vi' ? 'Lịch trình & Hạn chót 7 ngày' : 'Upcoming Deadlines & Agenda'],
    ['workload', locale === 'vi' ? 'Tải công việc & Năng lực đội ngũ' : 'Team Workload & Capacity'],
    ['scratchpad', locale === 'vi' ? 'Bảng nháp & Ghi chú nhanh' : 'Personal Scratchpad & Notes'],
    ['milestones', locale === 'vi' ? 'Tiến độ mục tiêu & Dự án' : 'Project Milestones & Goals'],
    ['charts', locale === 'vi' ? 'Biểu đồ hiệu suất & trạng thái' : 'Performance & Status Charts'],
    ['velocity', locale === 'vi' ? 'Vận tốc hoàn thành 30 ngày' : '30-Day Team Velocity'],
    ['ai', locale === 'vi' ? 'Báo cáo năng suất AI' : 'AI Productivity Insights'],
    ['activity', locale === 'vi' ? 'Dòng hoạt động gần nhất' : 'Recent Activity Stream'],
  ];

  return (
    <div className="apexa-inset-group rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] p-2.5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-left">
      
      {/* Left controls: Range & Trend comparison */}
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        
        {/* Range Buttons (Apple Segmented Capsule) */}
        <div className="apexa-segmented-capsule" role="group" aria-label="Date range">
          {([7, 30, 90] as DashboardRange[]).map((r) => {
            const isLocked = r === 90 && !isPremium;
            const isSelected = range === r;
            return (
              <button
                key={r}
                type="button"
                data-active={isSelected}
                onClick={() => onRangeChange(r)}
                className="apexa-segmented-pill inline-flex items-center gap-1"
              >
                <span>{r} {locale === 'vi' ? 'ngày' : 'days'}</span>
                {isLocked && <LockKeyhole className="h-2.5 w-2.5 text-amber-500" />}
              </button>
            );
          })}
        </div>

        {/* Period Delta Tag */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            periodInsights.completionDelta >= 0
              ? 'bg-emerald-500/[0.1] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/[0.1] text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          <TrendingUp className={`h-3 w-3 ${periodInsights.completionDelta < 0 ? 'rotate-180 text-rose-500' : 'text-emerald-500'}`} />
          <span className="tabular-nums">
            {periodInsights.completionDelta >= 0 ? '+' : ''}{periodInsights.completionDelta}% {locale === 'vi' ? 'so với kỳ trước' : 'vs last period'}
          </span>
        </span>

      </div>

      {/* Right controls: Chart toggle, Export CSV, Pro Upgrade, Customizer */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Chart mode switcher */}
        <div className="apexa-segmented-capsule">
          <button
            type="button"
            data-active={chartMode === 'area'}
            onClick={() => onChartModeChange('area')}
            className="apexa-segmented-pill flex items-center gap-1"
            title={locale === 'vi' ? 'Biểu đồ miền' : 'Area Chart'}
          >
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === 'vi' ? 'Miền' : 'Area'}</span>
          </button>
          <button
            type="button"
            data-active={chartMode === 'bar'}
            onClick={() => onChartModeChange('bar')}
            className="apexa-segmented-pill flex items-center gap-1"
            title={locale === 'vi' ? 'Biểu đồ cột' : 'Bar Chart'}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === 'vi' ? 'Cột' : 'Bar'}</span>
          </button>
        </div>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-zinc-200 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
          <span>{locale === 'vi' ? 'Xuất CSV' : 'Export CSV'}</span>
        </button>

        {/* Upgrade Pro Button if free user */}
        {!isPremium && onUpgradePremium && (
          <button
            type="button"
            onClick={onUpgradePremium}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Nâng cấp Pro' : 'Upgrade Pro'}</span>
          </button>
        )}

        {/* Quick Task Button */}
        {onOpenQuickTask && (
          <button
            type="button"
            onClick={onOpenQuickTask}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Tạo việc nhanh' : 'Quick Task'}</span>
          </button>
        )}

        {/* Layout Customizer Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            aria-expanded={showSettings}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
              showSettings
                ? 'border-blue-400/60 bg-blue-50/70 text-blue-600 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300'
                : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-zinc-200'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Tuỳ chỉnh' : 'Customize'}</span>
          </button>

          {showSettings && (
            <div className="absolute right-0 top-11 z-50 w-[300px] rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xl backdrop-blur-xl dark:border-white/[0.12] dark:bg-[#0d0f15] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    {locale === 'vi' ? 'Bố cục Dashboard' : 'Dashboard Layout'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Bật hoặc ẩn các khu vực nội dung' : 'Show or hide dashboard sections'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetPreferences}
                  title={locale === 'vi' ? 'Khôi phục mặc định' : 'Reset to default'}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {widgetLabels.map(([key, label]) => {
                  const isVisible = visibleWidgets[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onToggleWidget(key)}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70 cursor-pointer"
                    >
                      <span className="truncate pr-2">{label}</span>
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          isVisible ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            isVisible ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
