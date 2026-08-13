"use client";

import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarClock,
  CheckCircle2, CircleGauge, Clock3, FolderKanban, GitBranch, LayoutDashboard,
  MessageSquare, PlugZap, Search, Settings2, ShieldCheck, Sparkles, Target,
  TrendingUp, UserPlus, Users, Workflow, X
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
  const workspaceMembers = members.filter(member => member.workspaceIds?.includes(activeWorkspaceId));
  const scopedMembers = workspaceMembers.length ? workspaceMembers : members;
  const scopedTasks = tasks.filter(task => !task.workspaceId || task.workspaceId === activeWorkspaceId);
  const openTasks = scopedTasks.filter(task => task.status !== 'completed');
  const completedTasks = scopedTasks.filter(task => task.status === 'completed');
  const overdueTasks = openTasks.filter(task => isOverdue(task, now));
  const dueSoon = openTasks
    .filter(task => task.dueDate && new Date(task.dueDate).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
  const completionRate = scopedTasks.length ? Math.round((completedTasks.length / scopedTasks.length) * 100) : 0;
  const onlineCount = scopedMembers.filter(member => member.status === 'online' || member.status === 'busy').length;

  const workload = scopedMembers.map(member => {
    const assigned = openTasks.filter(task => memberTaskIds(task).has(member.id));
    const estimated = assigned.reduce((sum, task) => sum + (task.hoursEstimate || 0), 0);
    const score = estimated || assigned.length * 4;
    return { member, assigned, score, capacity: Math.min(100, Math.round((score / 40) * 100)) };
  }).sort((a, b) => b.score - a.score);

  const unassignedCount = openTasks.filter(task => !task.assigneeId && !task.assigneeIds?.length).length;
  const overloadedCount = workload.filter(item => item.capacity > 90).length;
  const teamHealth = Math.max(0, Math.min(100,
    100 - overdueTasks.length * 5 - overloadedCount * 8 - unassignedCount * 2
  ));

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
    { label: 'Cần chú ý', value: overdueTasks.length + overloadedCount, note: `${overdueTasks.length} quá hạn · ${overloadedCount} quá tải`, icon: AlertTriangle, iconClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' },
  ] as const;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-200/60 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 md:p-7 text-white shadow-xl shadow-indigo-500/10">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" /> Team Command Center
            </div>
            <h3 className="text-2xl font-black tracking-tight md:text-3xl">{workspace?.name || 'Workspace'} đang vận hành thế nào?</h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-indigo-100">
              Một góc nhìn thống nhất về con người, tiến độ, năng lực và các tín hiệu cần xử lý của đội nhóm.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onInvite} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5">
              <UserPlus className="h-4 w-4" /> Mời thành viên
            </button>
            <button type="button" onClick={onOpenWorkload} className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-black text-white backdrop-blur transition hover:bg-white/20">
              <CircleGauge className="h-4 w-4" /> Xem workload
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p></div>
              <div className={`rounded-xl p-2.5 ${stat.iconClass}`}><stat.icon className="h-5 w-5" /></div>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><CircleGauge className="h-4 w-4 text-indigo-500" /> Sức khỏe đội nhóm</h4><p className="mt-1 text-[10px] font-medium text-slate-400">Tổng hợp deadline, phân công và năng lực hiện tại.</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${teamHealth >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : teamHealth >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'}`}>{teamHealth}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${teamHealth}%` }} /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Công việc quá hạn', value: overdueTasks.length, icon: CalendarClock, iconClass: overdueTasks.length ? 'text-rose-500' : 'text-emerald-500' },
              { label: 'Chưa có người phụ trách', value: unassignedCount, icon: UserPlus, iconClass: unassignedCount ? 'text-amber-500' : 'text-emerald-500' },
              { label: 'Thành viên quá tải', value: overloadedCount, icon: TrendingUp, iconClass: overloadedCount ? 'text-rose-500' : 'text-emerald-500' },
            ].map(item => <div key={item.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50"><item.icon className={`h-4 w-4 ${item.iconClass}`} /><p className="mt-3 text-xl font-black text-slate-900 dark:text-white">{item.value}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{item.label}</p></div>)}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between"><div><h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><GitBranch className="h-4 w-4 text-violet-500" /> Cơ cấu đội ngũ</h4><p className="mt-1 text-[10px] text-slate-400">Theo phòng ban</p></div><button type="button" onClick={onOpenDirectory} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">Danh bạ</button></div>
          <div className="space-y-3">
            {departments.map(([department, count], index) => {
              const percentage = Math.round((count / Math.max(1, scopedMembers.length)) * 100);
              return <div key={department}><div className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300"><span>{DEPARTMENT_LABELS[department] || 'Nhóm chung'}</span><span>{count} · {percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${['bg-indigo-500','bg-violet-500','bg-cyan-500','bg-emerald-500'][index % 4]}`} style={{ width: `${percentage}%` }} /></div></div>;
            })}
            {!departments.length && <p className="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu phòng ban.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between"><div><h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><BriefcaseBusiness className="h-4 w-4 text-cyan-500" /> Phân bổ năng lực</h4><p className="mt-1 text-[10px] text-slate-400">Khối lượng công việc mở theo thành viên</p></div><button type="button" onClick={onOpenWorkload} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400">Chi tiết <ArrowRight className="h-3 w-3" /></button></div>
          <div className="space-y-3">
            {workload.slice(0, 6).map(item => <div key={item.member.id} className="flex items-center gap-3"><SignedImage filePath={item.member.avatar} alt={item.member.name} className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-700" /><div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{item.member.name}</span><span className={`text-[10px] font-black ${item.capacity > 90 ? 'text-rose-500' : item.capacity > 70 ? 'text-amber-500' : 'text-emerald-500'}`}>{item.assigned.length} việc</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${item.capacity > 90 ? 'bg-rose-500' : item.capacity > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(4, item.capacity)}%` }} /></div></div></div>)}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4"><h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Clock3 className="h-4 w-4 text-amber-500" /> Deadline sắp tới</h4><p className="mt-1 text-[10px] text-slate-400">Các công việc cần phối hợp sớm</p></div>
          <div className="space-y-2">
            {dueSoon.map(task => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === 'urgent' ? 'bg-rose-500' : task.priority === 'high' ? 'bg-amber-500' : 'bg-indigo-500'}`} /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{task.title}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{new Date(task.dueDate!).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })}</p></div><span className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800">{task.status}</span></div>)}
            {!dueSoon.length && <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" /><p className="mt-2 text-xs font-bold text-slate-500">Không có deadline gần</p></div>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><MessageSquare className="h-4 w-4 text-indigo-500" /> Kết nối nhanh với đồng đội</h4><p className="mt-1 text-[10px] text-slate-400">Tìm người, xem trạng thái và bắt đầu trao đổi.</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={memberQuery} onChange={event => setMemberQuery(event.target.value)} placeholder="Tìm thành viên..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:w-64" />{memberQuery && <button type="button" onClick={() => setMemberQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-3.5 w-3.5" /></button>}</div></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{filteredPeople.map(member => <button key={member.id} type="button" onClick={() => onStartChat?.(member.id)} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"><div className="relative"><SignedImage filePath={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover" /><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'busy' ? 'bg-rose-500' : member.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'}`} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{member.name}</p><p className="truncate text-[9px] font-semibold text-slate-400">{DEPARTMENT_LABELS[member.department || ''] || member.role}</p></div><MessageSquare className="h-4 w-4 text-slate-300" /></button>)}</div>
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
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500"><PlugZap className="h-4 w-4" /> Integration Hub</div><h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Kết nối công việc của cả đội</h3><p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">Tập trung dữ liệu, giao tiếp và tự động hóa tại một nơi. Các kết nối bên ngoài cần quản trị viên cấu hình OAuth/API trong Cài đặt.</p></div><button type="button" onClick={() => setAppTab('settings')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-900"><Settings2 className="h-4 w-4" /> Mở cài đặt tích hợp</button></div></section>
    <section><div className="mb-3 flex items-end justify-between"><div><h4 className="text-sm font-black text-slate-900 dark:text-white">Ứng dụng Avaxa</h4><p className="mt-1 text-[10px] text-slate-400">Đã kết nối sẵn với Team workspace</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><ShieldCheck className="mr-1 inline h-3 w-3" /> {workspaces.length} workspace · {members.length} thành viên</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{nativeApps.map(app => <button key={app.name} type="button" onClick={() => setAppTab(app.tab)} className="rounded-2xl border border-slate-200/70 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900"><div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${app.iconClass}`}><app.icon className="h-5 w-5" /></div><span className="flex items-center gap-1 text-[9px] font-black text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đã kết nối</span></div><p className="mt-4 text-xs font-black text-slate-800 dark:text-white">{app.name}</p><p className="mt-1 text-[10px] font-medium text-slate-400">{app.desc}</p></button>)}</div></section>
    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-black text-slate-900 dark:text-white">Kết nối bên ngoài</h4><p className="mt-1 text-[10px] text-slate-400">Danh mục tích hợp sẵn sàng để quản trị viên thiết lập</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tích hợp..." className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{externalApps.map(app => <div key={app.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${app.tone} text-xs font-black text-white`}>{app.mark}</div><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-800 dark:text-white">{app.name}</p><p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">{app.desc}</p></div><button type="button" onClick={() => setAppTab('settings')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">Thiết lập</button></div>)}</div></section>
    <section className="grid gap-3 md:grid-cols-3">{[{ icon: Workflow, title: 'Automation', desc: 'Tự động giao việc, nhắc hạn và cập nhật trạng thái.' },{ icon: ShieldCheck, title: 'Quyền truy cập', desc: 'Kiểm soát kết nối theo vai trò workspace.' },{ icon: Activity, title: 'Nhật ký đồng bộ', desc: 'Theo dõi trạng thái và lỗi của các luồng dữ liệu.' }].map(item => <div key={item.title} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60"><item.icon className="h-5 w-5 text-indigo-500" /><p className="mt-3 text-xs font-black text-slate-800 dark:text-white">{item.title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">{item.desc}</p></div>)}</section>
  </div>;
}
