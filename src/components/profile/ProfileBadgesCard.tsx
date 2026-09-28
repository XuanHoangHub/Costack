"use client";

import React from 'react';
import { Award, CheckCircle2, Lock, Sparkles, Zap, Flame, ShieldCheck, HeartHandshake } from 'lucide-react';
import { GamificationBadge } from './types';

interface ProfileBadgesCardProps {
  completedTasksCount: number;
  completionRate: number;
  hasOverdueTasks: boolean;
  isPremium?: boolean;
  isAdmin?: boolean;
  profileCompleteness: number;
  locale: string;
}

export const ProfileBadgesCard: React.FC<ProfileBadgesCardProps> = ({
  completedTasksCount,
  completionRate,
  hasOverdueTasks,
  isPremium,
  isAdmin,
  profileCompleteness,
  locale,
}) => {
  const badges: GamificationBadge[] = [
    {
      id: 'completionist',
      titleVi: 'Thánh Giải Quyết Task',
      titleEn: 'Task Crusher',
      descriptionVi: 'Hoàn thành từ 10 nhiệm vụ trở lên',
      descriptionEn: 'Completed 10 or more tasks',
      icon: '⚡',
      color: 'from-amber-400 to-orange-500',
      unlocked: completedTasksCount >= 10,
      progressText: `${completedTasksCount}/10`,
    },
    {
      id: 'punctual',
      titleVi: 'Chiến Binh Đúng Hạn',
      titleEn: 'Punctual Warrior',
      descriptionVi: 'Không có nhiệm vụ nào bị trễ hạn',
      descriptionEn: 'Zero overdue tasks currently assigned',
      icon: '🎯',
      color: 'from-emerald-400 to-teal-500',
      unlocked: !hasOverdueTasks && completedTasksCount > 0,
      progressText: hasOverdueTasks 
        ? (locale === 'vi' ? 'Có task trễ' : 'Has overdue') 
        : (locale === 'vi' ? 'Hoàn hảo' : 'Clean'),
    },
    {
      id: 'high_velocity',
      titleVi: 'Hiệu Suất Cực Đỉnh',
      titleEn: 'Peak Velocity',
      descriptionVi: 'Đạt tỷ lệ hoàn thành từ 80% trở lên',
      descriptionEn: 'Maintained 80%+ task completion rate',
      icon: '🚀',
      color: 'from-blue-500 to-indigo-600',
      unlocked: completionRate >= 80,
      progressText: `${completionRate}% / 80%`,
    },
    {
      id: 'profile_master',
      titleVi: 'Hồ Sơ Gương Mẫu',
      titleEn: 'Profile Master',
      descriptionVi: 'Hoàn thiện 100% hồ sơ cá nhân',
      descriptionEn: '100% completed profile information',
      icon: '🌟',
      color: 'from-purple-500 to-pink-500',
      unlocked: profileCompleteness >= 100,
      progressText: `${profileCompleteness}%`,
    },
    {
      id: 'vip_pro',
      titleVi: 'Thành Viên VIP PRO',
      titleEn: 'Costack VIP Pro',
      descriptionVi: 'Sở hữu gói dịch vụ Premium Pro',
      descriptionEn: 'Active Costack Pro subscription',
      icon: '💎',
      color: 'from-cyan-400 to-blue-600',
      unlocked: Boolean(isPremium),
      progressText: isPremium ? 'PRO' : 'FREE',
    },
    {
      id: 'workspace_leader',
      titleVi: isAdmin ? 'Đội Trưởng Uy Tín' : 'Đồng Đội Tích Cực',
      titleEn: isAdmin ? 'Workspace Leader' : 'Active Teammate',
      descriptionVi: isAdmin ? 'Quản trị viên cấp cao của workspace' : 'Thành viên đóng góp tích cực cho nhóm',
      descriptionEn: isAdmin ? 'Workspace administrator' : 'Active team contributor',
      icon: isAdmin ? '🛡️' : '🤝',
      color: 'from-indigo-500 to-violet-600',
      unlocked: true,
      progressText: isAdmin ? 'Admin' : 'Member',
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-[28px] shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              {locale === 'vi' ? 'Huy hiệu & Thành tựu' : 'Badges & Achievements'}
            </h3>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {locale === 'vi' ? `Đã mở khóa ${unlockedCount}/${badges.length} danh hiệu` : `Unlocked ${unlockedCount}/${badges.length} badges`}
            </p>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
          {Math.round((unlockedCount / badges.length) * 100)}%
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`relative p-3 rounded-2xl border transition-all text-left group select-none ${
              badge.unlocked
                ? 'bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-800/60 dark:to-slate-900/90 border-slate-200 dark:border-slate-700/80 hover:shadow-md hover:scale-[1.02]'
                : 'bg-slate-50/40 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl ${!badge.unlocked ? 'grayscale' : ''}`}>
                {badge.icon}
              </span>
              {badge.unlocked ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <Lock className="w-3 h-3 text-slate-400" />
              )}
            </div>

            <h4 className="text-[11px] font-black text-slate-900 dark:text-white truncate">
              {locale === 'vi' ? badge.titleVi : badge.titleEn}
            </h4>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium leading-tight">
              {locale === 'vi' ? badge.descriptionVi : badge.descriptionEn}
            </p>

            {badge.progressText && (
              <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9.5px] font-mono">
                <span className="text-slate-400 uppercase tracking-wider">{locale === 'vi' ? 'Tiến độ' : 'Progress'}</span>
                <span className={`font-bold ${badge.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {badge.progressText}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
