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
  Layers,
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
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 22 }}
      className="relative isolate overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/70 to-indigo-50/30 p-5 shadow-[0_16px_45px_-24px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/[0.08] dark:from-[#13141c]/95 dark:via-[#0e1017]/95 dark:to-indigo-950/25 sm:p-7 md:p-8 text-left"
    >
      {/* Dynamic ambient lights */}
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left column: Greeting & Workspace context */}
        <div className="space-y-3 min-w-0 flex-1">
          {/* Status pill row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span className="truncate max-w-[200px]">{workspaceName || 'Apexa Workspace'}</span>
            </span>

            {isOffline && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                <WifiOff className="h-3 w-3 animate-pulse" />
                <span>{locale === 'vi' ? 'Ngoại tuyến' : 'Offline'}</span>
              </span>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-[34px] leading-tight">
            <span className="mr-2.5 inline-block">{greetingInfo.icon}</span>
            <span>{greetingInfo.greeting}, </span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300">
              {userName}
            </span>
          </h1>

          <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {dashboardScope === 'mine'
              ? (locale === 'vi' 
                  ? `Khu vực nhiệm vụ cá nhân của bạn trong ${workspaceName || 'workspace'}. Tập trung vào các việc cần ưu tiên xử lý trước.`
                  : `Your personal command center in ${workspaceName || 'workspace'}. Focus on what matters to you today.`)
              : (locale === 'vi'
                  ? `${greetingInfo.sub} Bảng số liệu tổng quan thời gian thực của toàn bộ đội ngũ.`
                  : `${greetingInfo.sub} Real-time performance and task pulse across your entire team.`)}
          </p>
        </div>

        {/* Right column: Scope toggle & Quick Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end shrink-0">
          
          {/* Scope Segmented Control */}
          <div className="w-full sm:w-auto">
            <SegmentedControl<DashboardScope>
              value={dashboardScope}
              onChange={onScopeChange}
              size="sm"
              fullWidth
              layoutIdPrefix="apexa-dashboard-scope"
              className="bg-white/80 dark:bg-slate-900/80 shadow-xs border border-slate-200/70 dark:border-slate-800"
              options={[
                {
                  id: 'mine',
                  label: locale === 'vi' ? 'Của tôi' : 'My Work',
                  icon: UserRound,
                  badge: personalTaskCount,
                },
                {
                  id: 'workspace',
                  label: locale === 'vi' ? 'Workspace' : 'Workspace',
                  icon: UsersRound,
                  badge: totalTaskCount,
                },
              ]}
            />
          </div>

          {/* Quick Actions buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="flex-1 sm:flex-initial inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{locale === 'vi' ? 'Quản lý nhiệm vụ' : 'Manage Tasks'}</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              title={locale === 'vi' ? 'Mở lịch trình' : 'Open Calendar'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/85 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-indigo-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
            </button>

            {onOpenAiReport && (
              <button
                type="button"
                onClick={onOpenAiReport}
                title={locale === 'vi' ? 'Báo cáo thông minh AI' : 'AI Smart Report'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200/80 bg-indigo-50/70 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60 transition-colors shadow-2xs cursor-pointer"
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
              </button>
            )}
          </div>

        </div>

      </div>
    </motion.section>
  );
}
