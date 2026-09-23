"use client";

import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarClock,
  CheckCircle2, CircleGauge, Clock3, FolderKanban, GitBranch,
  MessageSquare, PlugZap, Search, Settings2, ShieldCheck, Sparkles,
  TrendingUp, UserPlus, Users, Workflow, X, Zap
} from 'lucide-react';
import { Task, User, Workspace } from '@/types';
import SignedImage from '../SignedImage';
import { useUiStore } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';

interface TeamCommandCenterProps {
  members: User[];
  tasks: Task[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onInvite: () => void;
  onOpenDirectory: () => void;
  onOpenWorkload: () => void;
  onStartChat?: (memberId: string) => void;
}

const getDeptLabel = (key: string, isVi: boolean) => {
  const map: Record<string, { vi: string; en: string }> = {
    'd-hq': { vi: 'Điều hành', en: 'Executive HQ' },
    'd-eng': { vi: 'Kỹ thuật', en: 'Engineering' },
    'd-design': { vi: 'Sản phẩm & Thiết kế', en: 'Product & Design' },
    'd-growth': { vi: 'Marketing & Kinh doanh', en: 'Marketing & Growth' },
  };
  return map[key] ? (isVi ? map[key].vi : map[key].en) : (isVi ? 'Nhóm chung' : 'General');
};

const isOverdue = (task: Task, now: Date) => Boolean(
  task.dueDate && task.status !== 'completed' && new Date(task.dueDate).getTime() < now.getTime()
);

const memberTaskIds = (task: Task) => new Set([task.assigneeId, ...(task.assigneeIds || [])].filter(Boolean));

const formatDueDate = (date: string, now: Date, isVi: boolean) => {
  const dueDate = new Date(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const days = Math.round((startOfDueDate - startOfToday) / 86_400_000);

  if (days < -1) return isVi ? `Quá hạn ${Math.abs(days)} ngày` : `${Math.abs(days)} days overdue`;
  if (days === -1) return isVi ? 'Quá hạn hôm qua' : 'Overdue yesterday';
  if (days === 0) return isVi ? 'Hôm nay' : 'Today';
  if (days === 1) return isVi ? 'Ngày mai' : 'Tomorrow';
  return dueDate.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { day: '2-digit', month: 'short' });
};

export function TeamCommandCenter({
  members,
  tasks,
  workspaces,
  activeWorkspaceId,
  onInvite,
  onOpenDirectory,
  onOpenWorkload,
  onStartChat,
}: TeamCommandCenterProps) {
  const { isVietnamese, locale } = useTranslation();
  const [memberQuery, setMemberQuery] = useState('');
  const now = useMemo(() => new Date(), []);
  const workspace = workspaces.find(item => item.id === activeWorkspaceId);
  const scopedMembers = members;
  const scopedTasks = tasks.filter(task => !task.workspaceId || task.workspaceId === activeWorkspaceId);
  const openTasks = scopedTasks.filter(task => task.status !== 'completed');
  const completedTasks = scopedTasks.filter(task => task.status === 'completed');
  const overdueTasks = openTasks.filter(task => isOverdue(task, now));
  const attentionTasks = openTasks
    .filter(task => task.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6);
  const completionRate = scopedTasks.length ? Math.round((completedTasks.length / scopedTasks.length) * 100) : 0;
  const onlineCount = scopedMembers.filter(member => member.status === 'online' || member.status === 'busy').length;

  const workload = scopedMembers.map(member => {
    const assigned = openTasks.filter(task => memberTaskIds(task).has(member.id));
    const estimated = assigned.reduce((sum, task) => sum + (task.hoursEstimate || 0), 0);
    const score = estimated || assigned.length * 4;
    return { member, assigned, score, capacity: Math.round((score / 40) * 100) };
  }).sort((a, b) => b.score - a.score);

  const unassignedCount = openTasks.filter(task => !task.assigneeId && !task.assigneeIds?.length).length;
  const overloadedCount = workload.filter(item => item.capacity > 90).length;
  const overdueRate = openTasks.length ? overdueTasks.length / openTasks.length : 0;
  const unassignedRate = openTasks.length ? unassignedCount / openTasks.length : 0;
  const overloadRate = scopedMembers.length ? overloadedCount / scopedMembers.length : 0;
  const teamHealth = scopedTasks.length || scopedMembers.length
    ? Math.max(0, Math.min(100, Math.round(100 - overdueRate * 40 - unassignedRate * 25 - overloadRate * 25)))
    : 100;
  const healthMeta = teamHealth >= 85
    ? { 
        label: isVietnamese ? 'Vận hành tốt' : 'Optimal Flow', 
        text: isVietnamese ? 'Đội nhóm đang cân bằng. Tiếp tục duy trì nhịp phối hợp hiện tại.' : 'Team workload is balanced. Keep up the collaborative momentum.', 
        tone: 'text-emerald-600 dark:text-emerald-400', 
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
      }
    : teamHealth >= 65
      ? { 
          label: isVietnamese ? 'Cần theo dõi' : 'Needs Monitoring', 
          text: isVietnamese ? 'Một vài tín hiệu cần được xử lý để giữ tiến độ ổn định.' : 'A few bottlenecks detected. Follow up to maintain steady pace.', 
          tone: 'text-amber-600 dark:text-amber-400', 
          badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
        }
      : { 
          label: isVietnamese ? 'Cần hành động' : 'Action Required', 
          text: isVietnamese ? 'Ưu tiên xử lý công việc quá hạn và cân bằng lại khối lượng.' : 'Prioritize overdue items and redistribute team capacity.', 
          tone: 'text-rose-600 dark:text-rose-400', 
          badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
        };

  const departments = Object.entries(
    scopedMembers.reduce<Record<string, number>>((acc, member) => {
      const key = member.department || 'general';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const filteredPeople = scopedMembers.filter(member =>
    `${member.name} ${member.email} ${member.bio || ''}`.toLowerCase().includes(memberQuery.toLowerCase())
  ).slice(0, 6);

  const stats = [
    { label: isVietnamese ? 'Thành viên' : 'Members', value: scopedMembers.length, note: isVietnamese ? `${onlineCount} đang hoạt động` : `${onlineCount} active now`, icon: Users, iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { label: isVietnamese ? 'Công việc mở' : 'Open Tasks', value: openTasks.length, note: isVietnamese ? `${unassignedCount} chưa giao` : `${unassignedCount} unassigned`, icon: FolderKanban, iconClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400' },
    { label: isVietnamese ? 'Hoàn thành' : 'Completion', value: `${completionRate}%`, note: isVietnamese ? `${completedTasks.length}/${scopedTasks.length} công việc` : `${completedTasks.length}/${scopedTasks.length} tasks`, icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Hero Command Center Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-950 via-indigo-950/90 to-slate-900 p-6 text-white shadow-2xl shadow-indigo-950/30 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/25 to-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl space-y-3 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest text-indigo-300 backdrop-blur-md shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              <span>{isVietnamese ? 'Trung tâm Vận hành Đội ngũ' : 'Team Operations Center'}</span>
            </div>
            
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {isVietnamese ? 'Nắm nhịp đội ngũ. Gỡ vướng tức thì.' : 'Stay in sync. Resolve bottlenecks instantly.'}
            </h3>
            
            <p className="max-w-xl text-xs md:text-sm font-medium leading-relaxed text-slate-300">
              {isVietnamese ? 'Không gian ' : 'Workspace '}
              <span className="font-extrabold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">{workspace?.name || (isVietnamese ? 'Không gian làm việc' : 'Workspace')}</span>
              {isVietnamese ? ' hiện có ' : ' currently has '}
              <span className="text-indigo-300 font-extrabold">{scopedMembers.length} {isVietnamese ? 'thành viên' : 'members'}</span>
              {isVietnamese ? ' và ' : ' and '}
              <span className="text-cyan-300 font-extrabold">{openTasks.length} {isVietnamese ? 'công việc đang mở' : 'open tasks'}</span>.
            </p>
          </div>

          {/* Quick Actions and Health Summary Badge */}
          <div className="flex flex-col sm:flex-row xl:flex-col gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <button 
                type="button" 
                onClick={onInvite} 
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-5 py-3 text-xs font-black text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-103 active:scale-97 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isVietnamese ? 'Mời thành viên' : 'Invite Members'}</span>
              </button>

              <button 
                type="button" 
                onClick={onOpenWorkload} 
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-3 text-xs font-bold text-white backdrop-blur-md transition-all hover:scale-103 active:scale-97 cursor-pointer"
              >
                <CircleGauge className="h-4 w-4 text-cyan-300" />
                <span>{isVietnamese ? 'Khối lượng công việc' : 'Workload'}</span>
              </button>
            </div>

            {/* Micro Health Indicator */}
            <div className="flex items-center justify-between sm:justify-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-slate-300">{isVietnamese ? 'Chỉ số vận hành' : 'Operating Health'}</span>
              </div>
              <span className="text-xs font-black text-emerald-400 ml-auto font-sans tabular-nums">{teamHealth}/100</span>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid - Modern Bento Design */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={stat.label} 
            className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-5 shadow-xs backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-indigo-500/30 dark:border-slate-800/80 dark:hover:border-indigo-400/30 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-left space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
              </div>
              <div className={`rounded-2xl p-3 shadow-sm transition-transform duration-300 group-hover:scale-110 ${stat.iconClass}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                {stat.note}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Health Gauge & Dept Breakdown */}
      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Team Health Score Card */}
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xs backdrop-blur-md dark:border-slate-800/80">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-left">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <CircleGauge className="h-4.5 w-4.5 text-indigo-500" />
                <span>{isVietnamese ? 'Chỉ số Sức khỏe & Nhịp độ Đội nhóm' : 'Team Health & Momentum'}</span>
              </h4>
              <p className={`mt-1 text-xs font-bold ${healthMeta.tone}`}>{healthMeta.text}</p>
            </div>
            <span className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-black shadow-xs border ${healthMeta.badge}`}>
              {teamHealth}/100 · {healthMeta.label}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-700 shadow-[0_0_12px_rgba(99,102,241,0.3)]" 
              style={{ width: `${teamHealth}%` }} 
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: isVietnamese ? 'Công việc quá hạn' : 'Overdue Tasks', value: overdueTasks.length, icon: CalendarClock, iconClass: overdueTasks.length ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40' },
              { label: isVietnamese ? 'Chưa giao phụ trách' : 'Unassigned Tasks', value: unassignedCount, icon: UserPlus, iconClass: unassignedCount ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40' },
              { label: isVietnamese ? 'Thành viên quá tải' : 'Overloaded Capacity', value: overloadedCount, icon: TrendingUp, iconClass: overloadedCount ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/50 transition-all hover:bg-slate-50 dark:hover:bg-slate-950">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl shadow-2xs ${item.iconClass}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white font-sans tabular-nums">{item.value}</p>
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 text-left">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dept Structure Breakdown */}
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xs backdrop-blur-md dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-left">
                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <GitBranch className="h-4.5 w-4.5 text-violet-500" />
                  <span>{isVietnamese ? 'Cơ cấu Phòng ban' : 'Departments'}</span>
                </h4>
                <p className="mt-1 text-[11px] font-medium text-slate-400">{isVietnamese ? 'Phân bổ nhân sự theo khối ban' : 'Headcount distribution'}</p>
              </div>
              <button 
                type="button" 
                onClick={onOpenDirectory} 
                className="rounded-xl px-2.5 py-1.5 text-[10.5px] font-extrabold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
              >
                {isVietnamese ? 'Xem danh bạ' : 'View All'}
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {departments.map(([department, count], index) => {
                const percentage = Math.round((count / Math.max(1, scopedMembers.length)) * 100);
                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500'];
                return (
                  <div key={department} className="text-left">
                    <div className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span>{getDeptLabel(department, isVietnamese)}</span>
                      <span className="text-slate-400 font-sans font-semibold tabular-nums">{count} {isVietnamese ? 'người' : 'members'} · {percentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div 
                        className={`h-full rounded-full ${colors[index % colors.length]} transition-all duration-500`} 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
              {!departments.length && (
                <p className="py-8 text-center text-xs text-slate-400 font-medium">
                  {isVietnamese ? 'Chưa có dữ liệu phòng ban.' : 'No department data available.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Workload Distribution & Attention Tasks */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Workload Distribution */}
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xs backdrop-blur-md dark:border-slate-800/80">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-left">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <BriefcaseBusiness className="h-4.5 w-4.5 text-cyan-500" />
                <span>{isVietnamese ? 'Phân bổ Tải công việc' : 'Workload Distribution'}</span>
              </h4>
              <p className="mt-1 text-[11px] font-medium text-slate-400">{isVietnamese ? 'Khối lượng nhiệm vụ đang phụ trách' : 'Current task load per team member'}</p>
            </div>
            <button 
              type="button" 
              onClick={onOpenWorkload} 
              className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <span>{isVietnamese ? 'Chi tiết' : 'Details'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {workload.slice(0, 6).map(item => (
              <div key={item.member.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                <div className="relative shrink-0">
                  <SignedImage 
                    filePath={item.member.avatar} 
                    alt={item.member.name} 
                    className="h-9 w-9 rounded-full border border-slate-200 object-cover shadow-2xs dark:border-slate-700" 
                  />
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${item.member.status === 'online' ? 'bg-emerald-500' : item.member.status === 'busy' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">{item.member.name}</span>
                    <span className={`text-[10.5px] font-extrabold font-sans tabular-nums ${item.capacity > 90 ? 'text-rose-500' : item.capacity > 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {item.assigned.length} {isVietnamese ? 'việc' : 'tasks'} · {item.capacity}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${item.capacity > 90 ? 'bg-rose-500' : item.capacity > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(4, Math.min(100, item.capacity))}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            {!workload.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 py-9 text-center dark:border-slate-800">
                <Users className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-500">{isVietnamese ? 'Chưa có thành viên để tính workload' : 'No members to calculate workload'}</p>
                <button type="button" onClick={onInvite} className="mt-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400">{isVietnamese ? 'Mời thành viên đầu tiên' : 'Invite first member'}</button>
              </div>
            )}
          </div>
        </div>

        {/* Attention Tasks */}
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xs backdrop-blur-md dark:border-slate-800/80">
          <div className="mb-4 text-left">
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              <span>{isVietnamese ? 'Công việc Cần Chú Ý' : 'Urgent & Attention Tasks'}</span>
            </h4>
            <p className="mt-1 text-[11px] font-medium text-slate-400">{isVietnamese ? 'Hạn chót sắp tới hoặc đã quá hạn' : 'Upcoming deadlines & overdue items'}</p>
          </div>

          <div className="space-y-2.5">
            {attentionTasks.map(task => {
              const overdue = isOverdue(task, now);
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all hover:scale-101 ${
                    overdue 
                      ? 'border-rose-200 bg-rose-50/60 dark:border-rose-950/70 dark:bg-rose-950/20' 
                      : 'border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${overdue || task.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : task.priority === 'high' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">{task.title}</p>
                    <p className={`mt-0.5 text-[10.5px] font-bold ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      {formatDueDate(task.dueDate!, now, isVietnamese)}
                    </p>
                  </div>
                  <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                    {task.assigneeId || task.assigneeIds?.length ? (isVietnamese ? 'Đã giao' : 'Assigned') : (isVietnamese ? 'Chưa giao' : 'Unassigned')}
                  </span>
                </div>
              );
            })}
            {!attentionTasks.length && (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">{isVietnamese ? 'Không có công việc quá hạn' : 'No urgent deadlines'}</p>
                <p className="mt-1 text-[11px] text-slate-400">{isVietnamese ? 'Đội ngũ đang kiểm soát tiến độ rất tốt.' : 'The team is progressing right on schedule.'}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Connect Section */}
      <section className="rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xs backdrop-blur-md dark:border-slate-800/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-500" />
              <span>{isVietnamese ? 'Kết nối & Trao đổi Nhanh' : 'Quick Connect'}</span>
            </h4>
            <p className="mt-1 text-[11px] font-medium text-slate-400">{isVietnamese ? 'Tìm kiếm đồng đội và bắt đầu cuộc trò chuyện ngay.' : 'Find teammates and start direct conversations.'}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              value={memberQuery} 
              onChange={event => setMemberQuery(event.target.value)} 
              placeholder={isVietnamese ? "Tìm theo tên, email..." : "Search by name, email..."} 
              className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 py-2 pl-9 pr-8 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:w-64 shadow-2xs transition-all" 
            />
            {memberQuery && (
              <button 
                type="button" 
                onClick={() => setMemberQuery('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPeople.map(member => (
            <button 
              key={member.id} 
              type="button" 
              onClick={() => onStartChat?.(member.id)} 
              disabled={!onStartChat} 
              className="flex items-center gap-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-3.5 text-left transition-all hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/25 disabled:cursor-default cursor-pointer group shadow-2xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="relative shrink-0">
                <SignedImage filePath={member.avatar} alt={member.name} className="h-11 w-11 rounded-full object-cover shadow-2xs border border-slate-200 dark:border-slate-700" />
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'busy' ? 'bg-rose-500' : member.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-extrabold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {member.name}
                </p>
                <p className="truncate text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {getDeptLabel(member.department || '', isVietnamese) || member.role}
                </p>
              </div>
              {onStartChat && (
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center text-slate-400 shrink-0 shadow-3xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
              )}
            </button>
          ))}
        </div>

        {!filteredPeople.length && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200/80 py-8 text-center dark:border-slate-800">
            <Search className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-500">{memberQuery ? (isVietnamese ? 'Không tìm thấy thành viên phù hợp' : 'No matching members found') : (isVietnamese ? 'Workspace chưa có thành viên' : 'No members in workspace yet')}</p>
            {!memberQuery && (
              <button type="button" onClick={onInvite} className="mt-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                {isVietnamese ? 'Mời thành viên ngay' : 'Invite members now'}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

interface TeamIntegrationsProps {
  workspaces: Workspace[];
  members: User[];
  tasks: Task[];
}

export function TeamIntegrations({ workspaces, members, tasks }: TeamIntegrationsProps) {
  const { isVietnamese } = useTranslation();
  const setAppTab = useUiStore(state => state.setActiveTab);
  const [query, setQuery] = useState('');
  const nativeApps = [
    { name: isVietnamese ? 'Công việc' : 'Tasks', desc: isVietnamese ? `${tasks.length} công việc đang xử lý` : `${tasks.length} active tasks`, icon: FolderKanban, tab: 'tasks', iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { name: isVietnamese ? 'Chat & Kênh' : 'Chat & Channels', desc: isVietnamese ? 'Trao đổi theo workspace và nhóm' : 'Real-time team messaging', icon: MessageSquare, tab: 'chat', iconClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400' },
    { name: isVietnamese ? 'Lịch & Deadline' : 'Calendar & Deadlines', desc: isVietnamese ? 'Lịch nhóm và lịch cá nhân' : 'Team and personal schedule', icon: CalendarClock, tab: 'calendar', iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { name: isVietnamese ? 'Tài liệu Docs' : 'Docs & Knowledge', desc: isVietnamese ? 'Tài liệu cộng tác realtime' : 'Real-time collaborative docs', icon: Workflow, tab: 'docs', iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
  ];
  const externalApps = [
    { name: 'Google Calendar', desc: isVietnamese ? 'Đồng bộ lịch và deadline' : 'Sync schedules and deadlines', mark: 'G', tone: 'bg-blue-500' },
    { name: 'Google Drive', desc: isVietnamese ? 'Đính kèm và tìm kiếm tệp' : 'Attach and search files', mark: 'D', tone: 'bg-emerald-500' },
    { name: 'Slack', desc: isVietnamese ? 'Thông báo và tạo task từ hội thoại' : 'Notifications and task creation', mark: 'S', tone: 'bg-fuchsia-500' },
    { name: 'Microsoft Teams', desc: isVietnamese ? 'Họp, chat và thông báo nhóm' : 'Meetings, chat and team alerts', mark: 'T', tone: 'bg-indigo-500' },
    { name: 'GitHub', desc: isVietnamese ? 'Liên kết issue, PR và commit' : 'Link issues, PRs and commits', mark: 'GH', tone: 'bg-slate-800' },
    { name: 'Zoom', desc: isVietnamese ? 'Tạo cuộc họp cho đội nhóm' : 'Schedule team video meetings', mark: 'Z', tone: 'bg-blue-600' },
  ].filter(app => `${app.name} ${app.desc}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="space-y-5">
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500"><PlugZap className="h-4 w-4" /> {isVietnamese ? 'Trung tâm tích hợp' : 'Integration Hub'}</div><h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{isVietnamese ? 'Kết nối công việc của cả đội' : 'Connect All Team Workflows'}</h3><p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{isVietnamese ? 'Tập trung dữ liệu, giao tiếp và tự động hóa tại một nơi. Các kết nối bên ngoài cần quản trị viên cấu hình OAuth/API trong Cài đặt.' : 'Centralize data, communication, and automation in one place. External connections require Admin configuration.'}</p></div><button type="button" onClick={() => setAppTab('settings')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-900"><Settings2 className="h-4 w-4" /> {isVietnamese ? 'Mở cài đặt tích hợp' : 'Open Integration Settings'}</button></div></section>
    <section><div className="mb-3 flex items-end justify-between"><div><h4 className="text-sm font-black text-slate-900 dark:text-white">{isVietnamese ? 'Ứng dụng Costack' : 'Costack Native Apps'}</h4><p className="mt-1 text-[10px] text-slate-400">{isVietnamese ? 'Đã kết nối sẵn với Team workspace' : 'Pre-connected to this workspace'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><ShieldCheck className="mr-1 inline h-3 w-3" /> {workspaces.length} {isVietnamese ? 'không gian' : 'spaces'} · {members.length} {isVietnamese ? 'thành viên' : 'members'}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{nativeApps.map(app => <button key={app.name} type="button" onClick={() => setAppTab(app.tab)} className="rounded-2xl border border-slate-200/70 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900"><div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${app.iconClass}`}><app.icon className="h-5 w-5" /></div><span className="flex items-center gap-1 text-[9px] font-black text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {isVietnamese ? 'Đã kết nối' : 'Connected'}</span></div><p className="mt-4 text-xs font-black text-slate-800 dark:text-white">{app.name}</p><p className="mt-1 text-[10px] font-medium text-slate-400">{app.desc}</p></button>)}</div></section>
    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-black text-slate-900 dark:text-white">{isVietnamese ? 'Kết nối bên ngoài' : 'External Integrations'}</h4><p className="mt-1 text-[10px] text-slate-400">{isVietnamese ? 'Danh mục tích hợp sẵn sàng để quản trị viên thiết lập' : 'Ready for admin OAuth/API setup'}</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={isVietnamese ? "Tìm tích hợp..." : "Search integrations..."} className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{externalApps.map(app => <div key={app.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${app.tone} text-xs font-black text-white`}>{app.mark}</div><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-800 dark:text-white">{app.name}</p><p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">{app.desc}</p></div><button type="button" onClick={() => setAppTab('settings')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">{isVietnamese ? 'Thiết lập' : 'Configure'}</button></div>)}</div></section>
    <section className="grid gap-3 md:grid-cols-3">{[{ icon: Workflow, title: isVietnamese ? 'Automation' : 'Automation', desc: isVietnamese ? 'Tự động giao việc, nhắc hạn và cập nhật trạng thái.' : 'Automate task assignment, deadline alerts, and status updates.' },{ icon: ShieldCheck, title: isVietnamese ? 'Quyền truy cập' : 'Access Control', desc: isVietnamese ? 'Kiểm soát kết nối theo vai trò workspace.' : 'Control integration permissions by workspace role.' },{ icon: Activity, title: isVietnamese ? 'Nhật ký hoạt động' : 'Activity History', desc: isVietnamese ? 'Theo dõi lịch sử thay đổi và cập nhật trong không gian.' : 'Audit log and history of workspace updates.' }].map(item => <div key={item.title} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60"><item.icon className="h-5 w-5 text-indigo-500" /><p className="mt-3 text-xs font-black text-slate-800 dark:text-white">{item.title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">{item.desc}</p></div>)}</section>
  </div>;
}
