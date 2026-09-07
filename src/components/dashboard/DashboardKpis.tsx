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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 text-left">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={prefersReducedMotion ? undefined : { y: -3 }}
          transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 22 }}
          className="group relative isolate overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 hover:border-indigo-300/80 hover:shadow-[0_18px_48px_-20px_rgba(79,70,229,0.22)] dark:border-slate-800 dark:bg-[#12141d]/95 dark:hover:border-indigo-800/80"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${card.glowColor}`} />

          {/* Top Row: Title, Badge, and Icon */}
          <div className="relative flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {card.title}
              </span>
            </div>
            
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-2xs transition-transform duration-300 group-hover:scale-105 ${card.iconBg} ${card.iconColor}`}>
              <card.icon className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Metric Value & Subtitle */}
          <div className="relative mt-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                {card.value}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {card.badge}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {card.subtitle}
            </p>
          </div>

          {/* Mini Progress Bar */}
          <div className="relative mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={prefersReducedMotion ? false : { width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                transition={{ delay: 0.1 + index * 0.05, duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${card.barColor}`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
