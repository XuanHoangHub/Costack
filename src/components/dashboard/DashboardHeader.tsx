"use client";

import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  UsersRound,
  UserRound,
  ArrowUpRight,
  WifiOff,
  FileText
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { SegmentedControl } from '@/components/ui';
import type { DashboardScope } from './types';

interface DashboardHeaderProps {
  currentUser: any;
  workspaceName?: string;
  dashboardScope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  personalTaskCount: number;
  totalTaskCount: number;
  isOffline: boolean;
  isSynced?: boolean;
  onNavigate: (tab: string) => void;
  onOpenAiReport?: () => void;
}

export default function DashboardHeader({
  currentUser,
  workspaceName,
  dashboardScope,
  onScopeChange,
  personalTaskCount,
  totalTaskCount,
  isOffline,
  isSynced = false,
  onNavigate,
  onOpenAiReport,
}: DashboardHeaderProps) {
  const { t, locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  const greetingInfo = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      return {
        icon: '☀️',
        greeting: locale === 'vi' ? 'Chào buổi sáng' : 'Good morning',
        sub: locale === 'vi' ? 'Khởi động ngày mới đầy năng lượng & hiệu quả.' : 'Start your day with high focus and clarity.',
      };
    }
    if (currentHour >= 12 && currentHour < 14) {
      return {
        icon: '🌤️',
        greeting: locale === 'vi' ? 'Chào buổi trưa' : 'Good afternoon',
        sub: locale === 'vi' ? 'Kiểm tra tiến độ công việc trong buổi sáng.' : 'Check your morning progress and recharge.',
      };
    }
    if (currentHour >= 14 && currentHour < 18) {
      return {
        icon: '🌇',
        greeting: locale === 'vi' ? 'Chào buổi chiều' : 'Good afternoon',
        sub: locale === 'vi' ? 'Tăng tốc hoàn thành các mục tiêu trong ngày.' : 'Accelerate today’s remaining deliverables.',
      };
    }
    return {
      icon: '🌙',
      greeting: locale === 'vi' ? 'Chào buổi tối' : 'Good evening',
      sub: locale === 'vi' ? 'Tổng kết kết quả và lập kế hoạch cho ngày mai.' : 'Review results and prepare for tomorrow.',
    };
  }, [locale]);

  const userName = currentUser?.name || (locale === 'vi' ? 'Bạn' : 'there');

  return (
    <motion.header
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col gap-5 pt-1 pb-4 sm:pb-5 text-left border-b border-black/[0.05] dark:border-white/[0.07]"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left column: Greeting & Workspace context */}
        <div className="space-y-2 min-w-0 flex-1">
          {/* Status pill row */}
          <div className="flex flex-wrap items-center gap-2">
            {isOffline && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                <WifiOff className="h-3 w-3 animate-pulse" />
                <span>{locale === 'vi' ? 'Ngoại tuyến' : 'Offline'}</span>
              </span>
            )}
          </div>

          {/* Heading */}
          <h1 className="flex items-center flex-wrap gap-2 text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-neutral-900 dark:text-white leading-tight">
            <span className="inline-flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 dark:border-amber-400/20 text-base shadow-xs shrink-0">
              {greetingInfo.icon}
            </span>
            <span>{greetingInfo.greeting}, </span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">
              {userName}
            </span>
          </h1>

          <p className="max-w-2xl text-[13px] font-normal leading-relaxed text-neutral-500 dark:text-zinc-400">
            {dashboardScope === 'mine'
              ? (locale === 'vi' 
                  ? `Nhiệm vụ cá nhân trong ${workspaceName || 'workspace'}. Tập trung vào các việc cần ưu tiên xử lý trước.`
                  : `Personal command center in ${workspaceName || 'workspace'}. Focus on what matters to you today.`)
              : (locale === 'vi'
                  ? `${greetingInfo.sub} Bảng số liệu tổng quan thời gian thực của toàn bộ đội ngũ.`
                  : `${greetingInfo.sub} Real-time performance and task pulse across your entire team.`)}
          </p>
        </div>

        {/* Right column: Scope toggle & Quick Action buttons */}
        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center lg:flex-row lg:items-center lg:justify-end">
          
          {/* Scope Segmented Control */}
          <div className="w-full sm:w-auto">
            <SegmentedControl<DashboardScope>
              value={dashboardScope}
              onChange={onScopeChange}
              size="sm"
              layoutIdPrefix="apexa-dashboard-scope"
              className="bg-black/[0.04] dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.08] p-0.5 rounded-xl shadow-none"
              options={[
                {
                  id: 'mine',
                  label: locale === 'vi' ? 'Của tôi' : 'My Work',
                  icon: UserRound,
                  badge: personalTaskCount,
                },
                {
                  id: 'workspace',
                  label: locale === 'vi' ? 'Toàn bộ' : 'Workspace',
                  icon: UsersRound,
                  badge: totalTaskCount,
                },
              ]}
            />
          </div>

          {/* Quick Actions buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="flex-1 sm:flex-initial inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-bold text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer group"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{locale === 'vi' ? 'Quản lý nhiệm vụ' : 'Manage Tasks'}</span>
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-80" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              title={locale === 'vi' ? 'Mở lịch trình' : 'Open Calendar'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.06] dark:border-white/[0.09] bg-white dark:bg-white/[0.05] text-neutral-600 dark:text-zinc-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.09] hover:text-neutral-900 dark:hover:text-white transition-all shadow-xs backdrop-blur-md cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
            </button>

            {onOpenAiReport && (
              <button
                type="button"
                onClick={onOpenAiReport}
                title={locale === 'vi' ? 'Báo cáo thông minh AI' : 'AI Smart Report'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-500/25 transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>
    </motion.header>
  );
}
