"use client";

import React, { useMemo } from 'react';
import {
  Users,
  Flame,
  CheckCircle2,
  Clock,
  Briefcase,
  UserPlus,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task, User } from '@/types';
import SignedImage from '../SignedImage';

interface DashboardTeamWorkloadProps {
  tasks: Task[];
  members: User[];
  onOpenTask?: (taskId: string) => void;
  onNavigate: (tab: string) => void;
  selectedMemberId?: string | null;
  onSelectMember?: (memberId: string | null) => void;
}

export default function DashboardTeamWorkload({
  tasks,
  members,
  onOpenTask,
  onNavigate,
  selectedMemberId,
  onSelectMember,
}: DashboardTeamWorkloadProps) {
  const { locale } = useTranslation();

  const workloadStats = useMemo(() => {
    return members.map((member) => {
      const assignedTasks = tasks.filter((t) => {
        if (t.assigneeId === member.id) return true;
        return t.assigneeIds?.includes(member.id) || false;
      });

      const activeTasks = assignedTasks.filter((t) => t.status !== 'completed');
      const completedTasks = assignedTasks.filter((t) => t.status === 'completed');
      const urgentTasks = activeTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');

      const totalEstimated = activeTasks.reduce((sum, t) => sum + Number(t.hoursEstimate || 0), 0);
      const totalLogged = assignedTasks.reduce((sum, t) => sum + Number(t.hoursLogged || 0), 0);

      // Capacity benchmark: 40 hours standard weekly capacity
      const capacityPercentage = Math.min(100, Math.round((totalEstimated / 40) * 100));

      let status: 'overloaded' | 'balanced' | 'available';
      if (activeTasks.length > 5 || totalEstimated > 35) {
        status = 'overloaded';
      } else if (activeTasks.length >= 2 || totalEstimated >= 15) {
        status = 'balanced';
      } else {
        status = 'available';
      }

      return {
        member,
        assignedTotal: assignedTasks.length,
        activeCount: activeTasks.length,
        completedCount: completedTasks.length,
        urgentCount: urgentTasks.length,
        totalEstimated,
        totalLogged,
        capacityPercentage,
        status,
      };
    }).sort((a, b) => b.activeCount - a.activeCount);
  }, [members, tasks]);

  const overloadedCount = workloadStats.filter((s) => s.status === 'overloaded').length;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#12141d] text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Tải công việc & Năng lực đội ngũ' : 'Team Workload & Capacity'}
              </h3>
              {overloadedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-black text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                  <Flame className="h-3 w-3" />
                  {overloadedCount} {locale === 'vi' ? 'thành viên quá tải' : 'overloaded'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === 'vi'
                ? 'Theo dõi phân bổ nhiệm vụ và dung lượng thực tế để cân bằng nguồn lực'
                : 'Monitor real-time task distribution and member bandwidth'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedMemberId && (
            <button
              type="button"
              onClick={() => onSelectMember?.(null)}
              className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {locale === 'vi' ? 'Bỏ lọc thành viên' : 'Clear filter'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('team')}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
          >
            <span>{locale === 'vi' ? 'Quản lý đội ngũ' : 'Team Directory'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Members Workload Grid */}
      {workloadStats.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          {locale === 'vi' ? 'Chưa có thành viên nào trong không gian này.' : 'No members found in this workspace.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-4">
          {workloadStats.map((item) => {
            const isSelected = selectedMemberId === item.member.id;
            const isOnline = item.member.status === 'online' || item.member.customStatus === 'online';

            return (
              <div
                key={item.member.id}
                onClick={() => onSelectMember?.(isSelected ? null : item.member.id)}
                className={`group relative rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/30'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-[#161822] dark:hover:border-slate-700'
                }`}
              >
                {/* Top: Avatar, Name & Capacity badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <SignedImage
                        filePath={item.member.avatar}
                        className="h-10 w-10 rounded-2xl object-cover shadow-3xs"
                        alt={item.member.name}
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.member.name}
                      </h4>
                      <p className="truncate text-[10px] text-slate-400 capitalize">
                        {item.member.role || (locale === 'vi' ? 'Thành viên' : 'Member')}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {item.status === 'overloaded' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 shrink-0">
                      <Flame className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Quá tải' : 'Heavy'}
                    </span>
                  )}
                  {item.status === 'balanced' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Cân bằng' : 'Balanced'}
                    </span>
                  )}
                  {item.status === 'available' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 shrink-0">
                      <UserPlus className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Sẵn sàng' : 'Open'}
                    </span>
                  )}
                </div>

                {/* Metrics Row */}
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-900/60">
                  <div>
                    <span className="block text-[9.5px] font-semibold text-slate-400 uppercase">
                      {locale === 'vi' ? 'Đang làm' : 'Active'}
                    </span>
                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                      {item.activeCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-semibold text-slate-400 uppercase">
                      {locale === 'vi' ? 'Đã xong' : 'Done'}
                    </span>
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {item.completedCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-semibold text-slate-400 uppercase">
                      {locale === 'vi' ? 'Giờ ghi' : 'Logged'}
                    </span>
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {item.totalLogged}h
                    </span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                    <span>{locale === 'vi' ? 'Ước tính tải việc' : 'Weekly Capacity'}</span>
                    <span className="font-mono font-bold">{item.totalEstimated}h / 40h</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === 'overloaded'
                          ? 'bg-rose-500'
                          : item.status === 'balanced'
                          ? 'bg-emerald-500'
                          : 'bg-sky-400'
                      }`}
                      style={{ width: `${item.capacityPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
