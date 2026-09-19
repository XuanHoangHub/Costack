"use client";

import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  TrendingUp,
  PieChart as PieIcon,
  Crown,
  LockKeyhole,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTranslation } from '@/contexts/TranslationContext';
import type { DashboardRange, DashboardChartMode } from './types';

interface ChartTrendItem {
  name: string;
  fullDate: string;
  created: number;
  completed: number;
}

interface MemberEffortItem {
  name: string;
  estimated: number;
  logged: number;
}

interface VelocityItem {
  date: string;
  completed: number;
}

interface StatusItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  weeklyData: ChartTrendItem[];
  velocityData: VelocityItem[];
  memberEffortData: MemberEffortItem[];
  statusData: StatusItem[];
  dashboardRange: DashboardRange;
  chartMode: DashboardChartMode;
  totalTasks: number;
  completionPercentage: number;
  isPremium?: boolean;
  onUpgradePremium?: () => void;
  showVelocity?: boolean;
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white/95 p-3 text-left shadow-xl backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0d0f15]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      <p className="mb-2 text-[11px] font-black text-slate-900 dark:text-white">
        {payload[0]?.payload?.fullDate || label}
      </p>
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-numeric font-black text-slate-900 dark:text-white">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardCharts({
  weeklyData,
  velocityData,
  memberEffortData,
  statusData,
  dashboardRange,
  chartMode,
  totalTasks,
  completionPercentage,
  isPremium,
  onUpgradePremium,
  showVelocity = true,
}: DashboardChartsProps) {
  const { locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'trend' | 'effort'>('trend');

  const totalCreated = useMemo(
    () => weeklyData.reduce((acc, curr) => acc + curr.created, 0),
    [weeklyData]
  );
  const totalCompleted = useMemo(
    () => weeklyData.reduce((acc, curr) => acc + curr.completed, 0),
    [weeklyData]
  );

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      
      {/* Upper row: Trend Chart (8 cols) + Status Donut (4 cols) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        
        {/* Trend Area / Bar Chart (8 cols) */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="apexa-inset-group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)] lg:col-span-8 text-left"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-[#0071e3] dark:text-blue-400 dark:shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span>
                  {locale === 'vi' ? `Xu hướng hiệu suất · ${dashboardRange} ngày` : `Performance Trend · ${dashboardRange} Days`}
                </span>
              </h3>
              <p className="mt-0.5 text-xs font-normal text-neutral-400 dark:text-neutral-500">
                {locale === 'vi' ? 'Theo dõi số công việc tạo mới và hoàn tất theo ngày' : 'Track tasks created and completed per day'}
              </p>
            </div>

            {/* Badges & Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium text-[#0071e3] dark:text-[#0a84ff] bg-[#0071e3]/[0.08] dark:bg-[#0a84ff]/[0.12]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0071e3] dark:bg-[#0a84ff]" />
                  <span>{locale === 'vi' ? 'Đã xong' : 'Done'}: <strong>{totalCompleted}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/[0.08] dark:bg-purple-400/[0.12]">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <span>{locale === 'vi' ? 'Tạo mới' : 'Created'}: <strong>{totalCreated}</strong></span>
                </span>
              </div>

              <div className="apexa-segmented-capsule">
                <button
                  type="button"
                  data-active={activeTab === 'trend'}
                  onClick={() => setActiveTab('trend')}
                  className="apexa-segmented-pill"
                >
                  {locale === 'vi' ? 'Xu hướng' : 'Trend'}
                </button>
                {memberEffortData.length > 0 && (
                  <button
                    type="button"
                    data-active={activeTab === 'effort'}
                    onClick={() => setActiveTab('effort')}
                    className="apexa-segmented-pill inline-flex items-center gap-1"
                  >
                    <span>{locale === 'vi' ? 'Nỗ lực' : 'Effort'}</span>
                    {!isPremium && <LockKeyhole className="h-2.5 w-2.5 text-amber-500" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chart View */}
          <div className="h-[230px] sm:h-[260px] md:h-[290px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'trend' ? (
                chartMode === 'area' ? (
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="areaCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis
                      dataKey="name"
                      interval={dashboardRange === 7 ? 0 : dashboardRange === 30 ? 4 : 12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, (max: number) => Math.max(max, 4)]}
                      tickCount={5}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      name={locale === 'vi' ? 'Đã xong' : 'Completed'}
                      type="monotone"
                      dataKey="completed"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                      fill="url(#areaCompleted)"
                    />
                    <Area
                      name={locale === 'vi' ? 'Tạo mới' : 'Created'}
                      type="monotone"
                      dataKey="created"
                      stroke="#a855f7"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#a855f7', stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                      fill="url(#areaCreated)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis
                      dataKey="name"
                      interval={dashboardRange === 7 ? 0 : dashboardRange === 30 ? 4 : 12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, (max: number) => Math.max(max, 4)]}
                      tickCount={5}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar
                      name={locale === 'vi' ? 'Đã xong' : 'Completed'}
                      dataKey="completed"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                    <Bar
                      name={locale === 'vi' ? 'Tạo mới' : 'Created'}
                      dataKey="created"
                      fill="#a855f7"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                  </BarChart>
                )
              ) : (
                <BarChart data={memberEffortData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    name={locale === 'vi' ? 'Kế hoạch (giờ)' : 'Estimated (h)'}
                    dataKey="estimated"
                    fill="#818cf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    name={locale === 'vi' ? 'Thực tế (giờ)' : 'Logged (h)'}
                    dataKey="logged"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Status Breakdown Donut Chart (4 cols) */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="apexa-inset-group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)] lg:col-span-4 text-left"
        >
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
            <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-purple-600 dark:text-purple-400 dark:shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                <PieIcon className="h-4 w-4" />
              </div>
              <span>{locale === 'vi' ? 'Phân bổ trạng thái' : 'Status Distribution'}</span>
            </h3>
            <span className="rounded-full bg-emerald-500/[0.08] dark:bg-emerald-400/[0.12] px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {completionPercentage}% {locale === 'vi' ? 'xong' : 'done'}
            </span>
          </div>

          {/* Donut with center text */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="h-[170px] w-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData.length > 0 ? statusData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={3}
                    cornerRadius={6}
                    dataKey="value"
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={600}
                  >
                    {(statusData.length > 0 ? statusData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {totalTasks}
              </span>
              <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {locale === 'vi' ? 'TỔNG VIỆC' : 'TOTAL TASKS'}
              </span>
            </div>
          </div>

          {/* Detailed Progress List */}
          <div className="space-y-2 border-t border-black/[0.05] dark:border-white/[0.06] pt-3">
            {statusData.map((item, idx) => {
              const pct = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0;
              return (
                <div key={idx} className="space-y-1 rounded-xl p-1 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-numeric font-black text-slate-900 dark:text-white">
                      {item.value} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ backgroundColor: item.color, width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

      </div>

      {/* Lower Row: 30-Day Velocity Chart */}
      {showVelocity && totalTasks > 0 && (
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="apexa-inset-group rounded-2xl bg-white dark:bg-[#0a0b10] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)] text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span>
                  {locale === 'vi' ? `Vận tốc hoàn thành công việc · ${dashboardRange} ngày` : `Task Completion Velocity · ${dashboardRange} Days`}
                </span>
              </h3>
              <p className="mt-0.5 text-xs font-normal text-neutral-400 dark:text-neutral-500">
                {locale === 'vi' ? 'Đo lường năng suất tích luỹ và động lực đóng góp theo mốc hoàn tất thực tế' : 'Measures team throughput based on recorded completion dates'}
              </p>
            </div>
          </div>

          <div className="relative h-[200px] sm:h-[240px] w-full pt-4">
            {isPremium ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                  <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(max, 4)]} tickCount={5} tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    name={locale === 'vi' ? 'Hoàn thành' : 'Completed'}
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    fill="url(#velocityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/70 p-6 text-center dark:border-amber-800/60 dark:from-amber-950/20 dark:via-slate-900/60 dark:to-orange-950/20">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/20">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                  {locale === 'vi' ? 'Tính năng Phân tích Vận tốc thuộc gói Pro' : 'Velocity Analytics is an Analytics Pro feature'}
                </p>
                <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">
                  {locale === 'vi' ? 'Mở khoá lịch sử phân tích 90 ngày, biểu đồ vận tốc nhóm và chi tiết nỗ lực thành viên.' : 'Unlock 90-day history, velocity trends and per-member effort analytics.'}
                </p>
                {onUpgradePremium && (
                  <button
                    type="button"
                    onClick={onUpgradePremium}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300 cursor-pointer"
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    <span>{locale === 'vi' ? 'Nâng cấp ngay' : 'Upgrade Plan'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.section>
      )}

    </div>
  );
}
