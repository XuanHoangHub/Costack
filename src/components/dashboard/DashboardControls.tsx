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
  Check
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
    ['charts', locale === 'vi' ? 'Biểu đồ hiệu suất & trạng thái' : 'Performance & Status Charts'],
    ['velocity', locale === 'vi' ? 'Vận tốc hoàn thành 30 ngày' : '30-Day Team Velocity'],
    ['ai', locale === 'vi' ? 'Báo cáo năng suất AI' : 'AI Productivity Insights'],
    ['activity', locale === 'vi' ? 'Dòng hoạt động gần nhất' : 'Recent Activity Stream'],
  ];

  return (
    <div className="relative z-20 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-xs backdrop-blur-xl dark:border-slate-800 dark:bg-[#12141d]/90 lg:flex-row lg:items-center lg:justify-between text-left">
      
      {/* Left controls: Range & Trend comparison */}
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        
        {/* Range Buttons */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80" role="group" aria-label="Date range">
          {([7, 30, 90] as DashboardRange[]).map((r) => {
            const isLocked = r === 90 && !isPremium;
            const isSelected = range === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <span>{r} {locale === 'vi' ? 'ngày' : 'days'}</span>
                {isLocked && <LockKeyhole className="h-3 w-3 text-amber-500" />}
              </button>
            );
          })}
        </div>

        {/* Period Delta Tag */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black ${
            periodInsights.completionDelta >= 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
          }`}
        >
          <TrendingUp className={`h-3.5 w-3.5 ${periodInsights.completionDelta < 0 ? 'rotate-180 text-rose-500' : 'text-emerald-500'}`} />
          <span>
            {periodInsights.completionDelta >= 0 ? '+' : ''}{periodInsights.completionDelta}% {locale === 'vi' ? 'so với kỳ trước' : 'vs last period'}
          </span>
        </span>

      </div>

      {/* Right controls: Chart toggle, Export CSV, Pro Upgrade, Customizer */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Chart mode switcher */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onChartModeChange('area')}
            title={locale === 'vi' ? 'Biểu đồ miền' : 'Area chart'}
            className={`grid h-8 w-8 place-items-center rounded-lg transition-colors cursor-pointer ${
              chartMode === 'area'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <LineChart className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChartModeChange('bar')}
            title={locale === 'vi' ? 'Biểu đồ cột' : 'Bar chart'}
            className={`grid h-8 w-8 place-items-center rounded-lg transition-colors cursor-pointer ${
              chartMode === 'bar'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          <span>{locale === 'vi' ? 'Xuất CSV' : 'Export CSV'}</span>
        </button>

        {/* Upgrade Pro Button if free user */}
        {!isPremium && onUpgradePremium && (
          <button
            type="button"
            onClick={onUpgradePremium}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Nâng cấp Pro' : 'Upgrade Pro'}</span>
          </button>
        )}

        {/* Layout Customizer Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            aria-expanded={showSettings}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
              showSettings
                ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'border-slate-200/80 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Tuỳ chỉnh' : 'Customize'}</span>
          </button>

          {showSettings && (
            <div className="absolute right-0 top-11 z-50 w-[300px] rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-[#151722]">
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
