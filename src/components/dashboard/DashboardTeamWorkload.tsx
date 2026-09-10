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
    <div className="apexa-inset-group text-left p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-slate-800 dark:bg-white/[0.06] dark:text-slate-200">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Tải công việc & Năng lực đội ngũ' : 'Team Workload & Capacity'}
              </h3>
              {overloadedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
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
              className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {locale === 'vi' ? 'Bỏ lọc thành viên' : 'Clear filter'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('team')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] hover:underline dark:text-[#0A84FF] cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-4">
          {workloadStats.map((item) => {
            const isSelected = selectedMemberId === item.member.id;
            const isOnline = item.member.status === 'online' || item.member.customStatus === 'online';

            return (
              <div
                key={item.member.id}
                onClick={() => onSelectMember?.(isSelected ? null : item.member.id)}
                className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#0071E3] bg-[#0071E3]/[0.06] dark:border-[#0A84FF] dark:bg-[#0A84FF]/10'
                    : 'border-black/[0.06] bg-white hover:bg-[#fafafa] dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]'
                }`}
              >
                {/* Top: Avatar, Name & Capacity badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <SignedImage
                        filePath={item.member.avatar}
                        className="h-9 w-9 rounded-full object-cover"
                        alt={item.member.name}
                      />
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#121214] ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-semibold text-slate-900 dark:text-white group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors">
                        {item.member.name}
                      </h4>
                      <p className="truncate text-[10px] text-slate-400 capitalize">
                        {item.member.role || (locale === 'vi' ? 'Thành viên' : 'Member')}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {item.status === 'overloaded' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                      <Flame className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Quá tải' : 'Heavy'}
                    </span>
                  )}
                  {item.status === 'balanced' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Cân bằng' : 'Balanced'}
                    </span>
                  )}
                  {item.status === 'available' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                      <UserPlus className="h-2.5 w-2.5" />
                      {locale === 'vi' ? 'Sẵn sàng' : 'Open'}
                    </span>
                  )}
                </div>

                {/* Metrics Row */}
                <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-lg bg-[#f7f7f9] p-1.5 text-center border border-black/[0.03] dark:border-transparent dark:bg-white/[0.04]">
                  <div>
                    <span className="block text-[9.5px] font-medium text-slate-400 uppercase tracking-wider">
                      {locale === 'vi' ? 'Đang làm' : 'Active'}
                    </span>
                    <span className="font-numeric text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                      {item.activeCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-medium text-slate-400 uppercase tracking-wider">
                      {locale === 'vi' ? 'Đã xong' : 'Done'}
                    </span>
                    <span className="font-numeric text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {item.completedCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-medium text-slate-400 uppercase tracking-wider">
                      {locale === 'vi' ? 'Giờ ghi' : 'Logged'}
                    </span>
                    <span className="font-numeric text-xs font-semibold tabular-nums text-[#0071E3] dark:text-[#0A84FF]">
                      {item.totalLogged}h
                    </span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                    <span>{locale === 'vi' ? 'Ước tính tải việc' : 'Weekly Capacity'}</span>
                    <span className="font-numeric font-medium tabular-nums">{item.totalEstimated}h / 40h</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === 'overloaded'
                          ? 'bg-rose-500'
                          : item.status === 'balanced'
                          ? 'bg-emerald-500'
                          : 'bg-[#0071E3] dark:bg-[#0A84FF]'
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
