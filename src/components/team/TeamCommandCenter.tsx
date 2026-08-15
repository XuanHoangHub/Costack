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

const DEPARTMENT_LABELS: Record<string, string> = {
  'd-hq': 'Điều hành',
  'd-eng': 'Kỹ thuật',
  'd-design': 'Sản phẩm & Thiết kế',
  'd-growth': 'Marketing & Kinh doanh',
};

const isOverdue = (task: Task, now: Date) => Boolean(
  task.dueDate && task.status !== 'completed' && new Date(task.dueDate).getTime() < now.getTime()
);

const memberTaskIds = (task: Task) => new Set([task.assigneeId, ...(task.assigneeIds || [])].filter(Boolean));

const formatDueDate = (date: string, now: Date) => {
  const dueDate = new Date(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const days = Math.round((startOfDueDate - startOfToday) / 86_400_000);

  if (days < -1) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === -1) return 'Quá hạn hôm qua';
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Ngày mai';
  return dueDate.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
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
    ? { label: 'Vận hành tốt', text: 'Đội nhóm đang cân bằng. Tiếp tục duy trì nhịp phối hợp hiện tại.', tone: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' }
    : teamHealth >= 65
      ? { label: 'Cần theo dõi', text: 'Một vài tín hiệu cần được xử lý để giữ tiến độ ổn định.', tone: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' }
      : { label: 'Cần hành động', text: 'Ưu tiên xử lý công việc quá hạn và cân bằng lại khối lượng.', tone: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' };

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
    { label: 'Thành viên', value: scopedMembers.length, note: `${onlineCount} đang hoạt động`, icon: Users, iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { label: 'Công việc mở', value: openTasks.length, note: `${unassignedCount} chưa giao`, icon: FolderKanban, iconClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400' },
    { label: 'Hoàn thành', value: `${completionRate}%`, note: `${completedTasks.length}/${scopedTasks.length} công việc`, icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Hero Command Center Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-900 p-6 text-white shadow-2xl shadow-indigo-950/20 md:p-8 dark:border-indigo-500/20">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Tổng quan vận hành Đội ngũ
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              Nắm nhịp đội ngũ. Gỡ vướng đúng lúc.
            </h3>
            <p className="max-w-xl text-xs md:text-sm font-medium leading-relaxed text-slate-300">
              <span className="font-bold text-white">{workspace?.name || 'Workspace'}</span> có <span className="text-indigo-300 font-bold">{scopedMembers.length} thành viên</span> và <span className="text-cyan-300 font-bold">{openTasks.length} công việc</span> đang mở. Các tín hiệu quan trọng đã được ưu tiên bên dưới.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button 
              type="button" 
              onClick={onInvite} 
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> Mời thành viên
            </button>
            <button 
              type="button" 
              onClick={onOpenWorkload} 
              className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-extrabold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              <CircleGauge className="h-4 w-4" /> Xem khối lượng công việc
            </button>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {stats.map(stat => (
          <div 
            key={stat.label} 
            className="rounded-3xl border border-slate-200/80 bg-white/90 p-4.5 shadow-sm backdrop-blur-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/90"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.label}</p>
                <p className="mt-1.5 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
              </div>
              <div className={`rounded-2xl p-2.5 shadow-2xs ${stat.iconClass}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2.5 text-[10.5px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>{stat.note}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Health Gauge & Dept Breakdown */}
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Team Health Score */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-sm backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <CircleGauge className="h-4.5 w-4.5 text-indigo-500" /> Sức khỏe & Vận hành Đội nhóm
              </h4>
              <p className={`mt-1 text-[11px] font-bold ${healthMeta.tone}`}>{healthMeta.text}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black shadow-xs ${healthMeta.badge}`}>
              {teamHealth}/100 · {healthMeta.label}
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500" 
              style={{ width: `${teamHealth}%` }} 
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Công việc quá hạn', value: overdueTasks.length, icon: CalendarClock, iconClass: overdueTasks.length ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
              { label: 'Chưa có người phụ trách', value: unassignedCount, icon: UserPlus, iconClass: unassignedCount ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
              { label: 'Thành viên quá tải', value: overloadedCount, icon: TrendingUp, iconClass: overloadedCount ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-slate-50/80 p-3.5 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className={`p-1.5 rounded-xl ${item.iconClass}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
                </div>
                <p className="mt-2 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dept Structure Breakdown */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-sm backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <GitBranch className="h-4.5 w-4.5 text-violet-500" /> Cơ cấu phòng ban
              </h4>
              <p className="mt-1 text-[11px] font-medium text-slate-400">Phân bổ nhân sự theo phòng ban</p>
            </div>
            <button 
              type="button" 
              onClick={onOpenDirectory} 
              className="rounded-xl px-2.5 py-1 text-[10.5px] font-extrabold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
            >
              Mở danh bạ
            </button>
          </div>

          <div className="space-y-3.5 pt-1">
            {departments.map(([department, count], index) => {
              const percentage = Math.round((count / Math.max(1, scopedMembers.length)) * 100);
              return (
                <div key={department}>
                  <div className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>{DEPARTMENT_LABELS[department] || 'Nhóm chung'}</span>
                    <span className="text-slate-400">{count} người · {percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      className={`h-full rounded-full ${['bg-indigo-500','bg-purple-500','bg-cyan-500','bg-emerald-500'][index % 4]}`} 
                      style={{ width: `${percentage}%` }} 
                    />
                  </div>
                </div>
              );
            })}
            {!departments.length && <p className="py-8 text-center text-xs text-slate-400 font-medium">Chưa có dữ liệu phòng ban.</p>}
          </div>
        </div>
      </section>

      {/* Workload Distribution & Attention Tasks */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Workload Distribution */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-sm backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <BriefcaseBusiness className="h-4.5 w-4.5 text-cyan-500" /> Phân bổ khối lượng công việc
              </h4>
              <p className="mt-1 text-[11px] font-medium text-slate-400">Tải công việc mở theo thành viên</p>
            </div>
            <button 
              type="button" 
              onClick={onOpenWorkload} 
              className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Chi tiết <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {workload.slice(0, 6).map(item => (
              <div key={item.member.id} className="flex items-center gap-3">
                <SignedImage 
                  filePath={item.member.avatar} 
                  alt={item.member.name} 
                  className="h-9 w-9 rounded-full border border-slate-200 object-cover shadow-xs dark:border-slate-700 shrink-0" 
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">{item.member.name}</span>
                    <span className={`text-[10.5px] font-black ${item.capacity > 90 ? 'text-rose-500' : item.capacity > 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {item.assigned.length} việc · {item.capacity}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      className={`h-full rounded-full ${item.capacity > 90 ? 'bg-rose-500' : item.capacity > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(4, Math.min(100, item.capacity))}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            {!workload.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 py-9 text-center dark:border-slate-800">
                <Users className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-500">Chưa có thành viên để tính workload</p>
                <button type="button" onClick={onInvite} className="mt-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400">Mời thành viên đầu tiên</button>
              </div>
            )}
          </div>
        </div>

        {/* Attention Tasks */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-sm backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="mb-4">
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Zap className="h-4.5 w-4.5 text-amber-500" /> Công việc cần chú ý
            </h4>
            <p className="mt-1 text-[11px] font-medium text-slate-400">Hạn chót sắp tới, ưu tiên việc quá hạn</p>
          </div>

          <div className="space-y-2">
            {attentionTasks.map(task => {
              const overdue = isOverdue(task, now);
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${overdue ? 'border-rose-200/80 bg-rose-50/70 dark:border-rose-950/60 dark:bg-rose-950/20' : 'border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900/50'}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${overdue || task.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : task.priority === 'high' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">{task.title}</p>
                    <p className={`mt-0.5 text-[10px] font-bold ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      {formatDueDate(task.dueDate!, now)}
                    </p>
                  </div>
                  <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[9.5px] font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                    {task.assigneeId || task.assigneeIds?.length ? 'Đã giao' : 'Chưa giao'}
                  </span>
                </div>
              );
            })}
            {!attentionTasks.length && (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">Không có hạn chót cần chú ý</p>
                <p className="mt-1 text-[11px] text-slate-400">Đội ngũ đang kiểm soát tiến độ rất tốt.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Connect Section */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 md:p-6 shadow-sm backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-500" /> Kết nối & Trao đổi nhanh
            </h4>
            <p className="mt-1 text-[11px] font-medium text-slate-400">Tìm kiếm đồng đội và bắt đầu cuộc trò chuyện.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              value={memberQuery} 
              onChange={event => setMemberQuery(event.target.value)} 
              placeholder="Tìm theo tên, email..." 
              className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 py-2 pl-9 pr-8 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:w-64 shadow-2xs" 
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPeople.map(member => (
            <button 
              key={member.id} 
              type="button" 
              onClick={() => onStartChat?.(member.id)} 
              disabled={!onStartChat} 
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-3 text-left transition-all hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 disabled:cursor-default cursor-pointer group shadow-2xs"
            >
              <div className="relative shrink-0">
                <SignedImage filePath={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover shadow-xs" />
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'busy' ? 'bg-rose-500' : member.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {member.name}
                </p>
                <p className="truncate text-[10px] font-semibold text-slate-400 mt-0.5">
                  {DEPARTMENT_LABELS[member.department || ''] || member.role}
                </p>
              </div>
              {onStartChat && (
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center text-slate-400 shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
              )}
            </button>
          ))}
        </div>

        {!filteredPeople.length && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200/80 py-8 text-center dark:border-slate-800">
            <Search className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-500">{memberQuery ? 'Không tìm thấy thành viên phù hợp' : 'Workspace chưa có thành viên'}</p>
            {!memberQuery && (
              <button type="button" onClick={onInvite} className="mt-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                Mời thành viên ngay
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
  const setAppTab = useUiStore(state => state.setActiveTab);
  const [query, setQuery] = useState('');
  const nativeApps = [
    { name: 'Công việc', desc: `${tasks.length} công việc đang đồng bộ`, icon: FolderKanban, tab: 'tasks', iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { name: 'Chat & Channels', desc: 'Trao đổi theo workspace và nhóm', icon: MessageSquare, tab: 'chat', iconClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400' },
    { name: 'Lịch & Deadline', desc: 'Lịch nhóm và lịch cá nhân', icon: CalendarClock, tab: 'calendar', iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { name: 'Docs', desc: 'Tài liệu cộng tác realtime', icon: Workflow, tab: 'docs', iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
  ];
  const externalApps = [
    { name: 'Google Calendar', desc: 'Đồng bộ lịch và deadline', mark: 'G', tone: 'bg-blue-500' },
    { name: 'Google Drive', desc: 'Đính kèm và tìm kiếm tệp', mark: 'D', tone: 'bg-emerald-500' },
    { name: 'Slack', desc: 'Thông báo và tạo task từ hội thoại', mark: 'S', tone: 'bg-fuchsia-500' },
    { name: 'Microsoft Teams', desc: 'Họp, chat và thông báo nhóm', mark: 'T', tone: 'bg-indigo-500' },
    { name: 'GitHub', desc: 'Liên kết issue, PR và commit', mark: 'GH', tone: 'bg-slate-800' },
    { name: 'Zoom', desc: 'Tạo cuộc họp cho đội nhóm', mark: 'Z', tone: 'bg-blue-600' },
  ].filter(app => `${app.name} ${app.desc}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="space-y-5">
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500"><PlugZap className="h-4 w-4" /> Trung tâm tích hợp</div><h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Kết nối công việc của cả đội</h3><p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">Tập trung dữ liệu, giao tiếp và tự động hóa tại một nơi. Các kết nối bên ngoài cần quản trị viên cấu hình OAuth/API trong Cài đặt.</p></div><button type="button" onClick={() => setAppTab('settings')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-900"><Settings2 className="h-4 w-4" /> Mở cài đặt tích hợp</button></div></section>
    <section><div className="mb-3 flex items-end justify-between"><div><h4 className="text-sm font-black text-slate-900 dark:text-white">Ứng dụng Apexa</h4><p className="mt-1 text-[10px] text-slate-400">Đã kết nối sẵn với Team workspace</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><ShieldCheck className="mr-1 inline h-3 w-3" /> {workspaces.length} không gian · {members.length} thành viên</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{nativeApps.map(app => <button key={app.name} type="button" onClick={() => setAppTab(app.tab)} className="rounded-2xl border border-slate-200/70 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900"><div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${app.iconClass}`}><app.icon className="h-5 w-5" /></div><span className="flex items-center gap-1 text-[9px] font-black text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đã kết nối</span></div><p className="mt-4 text-xs font-black text-slate-800 dark:text-white">{app.name}</p><p className="mt-1 text-[10px] font-medium text-slate-400">{app.desc}</p></button>)}</div></section>
    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-black text-slate-900 dark:text-white">Kết nối bên ngoài</h4><p className="mt-1 text-[10px] text-slate-400">Danh mục tích hợp sẵn sàng để quản trị viên thiết lập</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tích hợp..." className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{externalApps.map(app => <div key={app.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${app.tone} text-xs font-black text-white`}>{app.mark}</div><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-800 dark:text-white">{app.name}</p><p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">{app.desc}</p></div><button type="button" onClick={() => setAppTab('settings')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">Thiết lập</button></div>)}</div></section>
    <section className="grid gap-3 md:grid-cols-3">{[{ icon: Workflow, title: 'Automation', desc: 'Tự động giao việc, nhắc hạn và cập nhật trạng thái.' },{ icon: ShieldCheck, title: 'Quyền truy cập', desc: 'Kiểm soát kết nối theo vai trò workspace.' },{ icon: Activity, title: 'Nhật ký đồng bộ', desc: 'Theo dõi trạng thái và lỗi của các luồng dữ liệu.' }].map(item => <div key={item.title} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60"><item.icon className="h-5 w-5 text-indigo-500" /><p className="mt-3 text-xs font-black text-slate-800 dark:text-white">{item.title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">{item.desc}</p></div>)}</section>
  </div>;
}
