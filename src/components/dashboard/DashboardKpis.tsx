"use client";

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Activity,
  Clock,
  FileText,
  Users,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface DashboardKpisProps {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  totalLoggedHours: number;
  totalEstimatedHours: number;
  docsCount: number;
  membersCount: number;
  onlineMembersCount: number;
  completionPercentage: number;
}

export default function DashboardKpis({
  totalTasks,
  completedTasks,
  inProgressTasks,
  reviewTasks,
  totalLoggedHours,
  totalEstimatedHours,
  docsCount,
  membersCount,
  onlineMembersCount,
  completionPercentage,
}: DashboardKpisProps) {
  const { locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  const activeTasksCount = inProgressTasks + reviewTasks;
  const activeTasksPercentage = totalTasks > 0 ? Math.round((activeTasksCount / totalTasks) * 100) : 0;
  
  const loggedProgress = totalEstimatedHours > 0
    ? Math.min(100, Math.round((totalLoggedHours / totalEstimatedHours) * 100))
    : 0;

  const cards = [
    {
      id: 'completion',
      title: locale === 'vi' ? 'Tỷ lệ hoàn thành' : 'Completion Rate',
      value: `${completionPercentage}%`,
      subtitle: locale === 'vi' ? `Đã hoàn thành ${completedTasks}/${totalTasks} việc` : `Done ${completedTasks}/${totalTasks} tasks`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/60',
      glowColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      barColor: 'from-emerald-500 to-teal-400',
      progress: completionPercentage,
      badge: `${completedTasks} ${locale === 'vi' ? 'xong' : 'done'}`,
    },
    {
      id: 'active',
      title: locale === 'vi' ? 'Đang thực hiện' : 'In Progress',
      value: activeTasksCount.toString(),
      subtitle: locale === 'vi' ? `${inProgressTasks} đang làm · ${reviewTasks} chờ duyệt` : `${inProgressTasks} in progress · ${reviewTasks} in review`,
      icon: Activity,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/60',
      glowColor: 'bg-amber-500/10 dark:bg-amber-500/15',
      barColor: 'from-amber-400 to-orange-500',
      progress: activeTasksPercentage,
      badge: `${activeTasksPercentage}% ${locale === 'vi' ? 'tổng việc' : 'of total'}`,
    },
    {
      id: 'time',
      title: locale === 'vi' ? 'Thời gian ghi nhận' : 'Tracked Time',
      value: `${totalLoggedHours.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}h`,
      subtitle: locale === 'vi' 
        ? `Ước tính: ${totalEstimatedHours.toLocaleString('vi-VN')}h`
        : `Estimate: ${totalEstimatedHours.toLocaleString('en-US')}h`,
      icon: Clock,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/60',
      glowColor: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      barColor: 'from-indigo-500 to-blue-500',
      progress: loggedProgress,
      badge: totalEstimatedHours > 0 ? `${loggedProgress}% ${locale === 'vi' ? 'kế hoạch' : 'of plan'}` : '0h plan',
    },
    {
      id: 'team',
      title: locale === 'vi' ? 'Tài liệu & Đội ngũ' : 'Docs & Team',
      value: docsCount.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'),
      subtitle: locale === 'vi' ? `${membersCount} thành viên · ${onlineMembersCount} trực tuyến` : `${membersCount} members · ${onlineMembersCount} online`,
      icon: FileText,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200/60 dark:border-cyan-800/60',
      glowColor: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      barColor: 'from-cyan-400 to-sky-500',
      progress: membersCount > 0 ? Math.round((onlineMembersCount / membersCount) * 100) : 0,
      badge: `${onlineMembersCount} ${locale === 'vi' ? 'online' : 'online'}`,
    },
  ];

  return (
    <div className="apexa-telemetry-ribbon rounded-2xl bg-white dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.05] dark:divide-white/[0.06]">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex flex-col justify-between p-4 sm:p-5 hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
          >
            {/* Top Row: Title, Badge, and Minimalist Icon */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                {card.title}
              </span>
              
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor} transition-transform duration-200 group-hover:scale-105`}>
                <card.icon className="h-3.5 w-3.5 stroke-[1.8]" />
              </div>
            </div>

            {/* Metric Value & Subtitle */}
            <div className="mt-2.5 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-white tabular-nums">
                  {card.value}
                </span>
                <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                  {card.badge}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate font-normal">
                {card.subtitle}
              </p>
            </div>

            {/* Micro Progress Bar */}
            <div className="mt-3.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                <motion.div
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                  transition={{ delay: 0.1 + index * 0.04, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${card.barColor}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
