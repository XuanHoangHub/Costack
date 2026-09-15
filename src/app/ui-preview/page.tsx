"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Inbox, Layers, Menu, Moon, Sun, PanelLeftClose, ChevronRight, X } from 'lucide-react';
import { NavItem } from '@/components/ui/NavItem';
import DashboardOverview from '@/components/DashboardOverview';
import type { Space, Task, User, Workspace } from '@/types';

const SpacePage = dynamic(() => import('@/components/SpacePage'), { ssr: false });
const InboxView = dynamic(() => import('@/components/InboxView'), { ssr: false });

const workspace: Workspace = { id: 'ui-preview', name: 'Upgen Studio', theme: 'blue', initial: 'U' };
const members: User[] = [
  { id: 'preview-1', name: 'Minh Anh', email: 'minhanh@example.com', avatar: '', role: 'admin', status: 'online' },
  { id: 'preview-2', name: 'Quang Huy', email: 'quanghuy@example.com', avatar: '', role: 'member', status: 'online' },
  { id: 'preview-3', name: 'Lan Chi', email: 'lanchi@example.com', avatar: '', role: 'member', status: 'away' },
];
const initialSpaces: Space[] = [
  { id: 'preview-product', workspaceId: workspace.id, name: 'Sản phẩm', emoji: 'Layers', lists: [{ id: 'preview-sprint', name: 'Sprint tháng 9' }, { id: 'preview-research', name: 'Nghiên cứu người dùng' }] },
  { id: 'preview-marketing', workspaceId: workspace.id, name: 'Marketing', emoji: 'Rocket', lists: [{ id: 'preview-launch', name: 'Kế hoạch ra mắt' }] },
];
const titles = ['Hoàn thiện trải nghiệm onboarding', 'Thiết kế trang thanh toán', 'Tối ưu giao diện trên điện thoại', 'Kiểm thử luồng mời thành viên', 'Chuẩn hóa thư viện thành phần', 'Phỏng vấn người dùng mới'];
const initialTasks: Task[] = titles.map((title, index) => ({
  id: `preview-task-${index}`, title, description: 'Thống nhất trải nghiệm rõ ràng, dễ sử dụng trên mọi kích thước màn hình.\n\nTiêu chí hoàn thành: kiểm tra desktop, mobile và điều hướng bàn phím.',
  priority: index === 0 ? 'high' : 'medium', status: (['inprogress', 'review', 'todo', 'completed', 'completed', 'todo'] as const)[index],
  workspaceId: workspace.id, spaceId: 'preview-product', listId: 'preview-sprint',
  assigneeId: members[index % members.length].id, subtasks: [], progress: index === 3 || index === 4 ? 100 : 30,
  createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), dueDate: new Date(Date.now() + (index + 1) * 86400000).toISOString().slice(0, 10), commentsCount: index, hoursEstimate: 4,
}));
const navigation = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'tasks', label: 'Không gian', icon: Layers },
  { id: 'inbox', label: 'Hộp thư đến', icon: Inbox },
] as const;
const noop = () => {};

export default function UiPreview() {
  const [view, setView] = useState<string>('dashboard');
  const [tasks, setTasks] = useState(initialTasks);
  const [spaces, setSpaces] = useState(initialSpaces);
  const [spaceId, setSpaceId] = useState<string | null>('preview-product');
  const [listId, setListId] = useState<string | null>('preview-sprint');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => {
    const previous = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', dark);
    return () => { document.documentElement.classList.toggle('dark', previous); };
  }, [dark]);
  const updateTask = (task: Task) => setTasks(current => current.map(item => item.id === task.id ? task : item));
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => setTasks(current => [...current, { ...task, id: `preview-${Date.now()}`, createdAt: new Date().toISOString(), commentsCount: 0, progress: 0 }]);
  const currentUser = { ...members[0], isPremium: false };
  return <div className="apexa-app-shell apexa-design-system fixed inset-0 flex flex-col overflow-hidden">
    <header className="apexa-app-header flex shrink-0 items-center">
      <div className={`apexa-header-sidebar hidden h-full shrink-0 items-center gap-3 px-4 md:flex ${collapsed ? 'w-[64px]' : 'w-[232px]'}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 font-semibold text-white">U</span>{!collapsed && <span className="text-sm font-semibold">Upgen Studio</span>}</div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4"><div className="flex min-w-0 items-center gap-3"><button aria-label="Mở điều hướng" onClick={() => setDrawer(true)} className="p-2 md:hidden"><Menu size={20} /></button><span className="hidden text-sm text-slate-500 sm:inline">Workspace</span><ChevronRight size={14} className="hidden text-slate-400 sm:block" /><span className="truncate text-sm font-medium">{navigation.find(item => item.id === view)?.label}</span></div><div className="flex items-center gap-3"><span className="hidden rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-500 sm:block">Dữ liệu mẫu · Chỉ lưu trong bản xem trước</span><button aria-label={dark ? 'Giao diện sáng' : 'Giao diện tối'} onClick={() => setDark(value => !value)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-slate-700">{dark ? <Sun size={17} /> : <Moon size={17} />}</button></div></div>
    </header>
    <div className="flex min-h-0 flex-1">
      {drawer && <button aria-label="Đóng điều hướng" className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setDrawer(false)} />}
      <aside className={`apexa-desktop-sidebar flex-col ${drawer ? 'fixed inset-y-0 left-0 z-50 flex w-[250px]' : `hidden shrink-0 md:flex ${collapsed ? 'w-[64px]' : 'w-[232px]'}`}`}>
        <div className="flex items-center justify-between px-2 pb-4 text-xs text-slate-400">{!collapsed && 'KHÔNG GIAN LÀM VIỆC'}<button aria-label={drawer ? 'Đóng menu' : 'Thu gọn thanh bên'} onClick={() => drawer ? setDrawer(false) : setCollapsed(value => !value)} className="grid h-8 w-8 place-items-center">{drawer ? <X size={16} /> : <PanelLeftClose size={16} />}</button></div>
        {navigation.map(item => <NavItem key={item.id} icon={item.icon} label={item.label} collapsed={collapsed && !drawer} isActive={view === item.id} onClick={() => { setView(item.id); setDrawer(false); }} />)}
        {!collapsed && <div className="mt-auto rounded-xl border border-white/10 p-3 text-xs leading-5 text-slate-400">Bản xem trước giao diện.<br />Các màn hình sử dụng component thật của ứng dụng.</div>}
      </aside>
      <main className="apexa-content-shell min-w-0 flex-1 overflow-hidden"><div className={`apexa-route-canvas apexa-module h-full w-full ${view === 'dashboard' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {view === 'dashboard' && <DashboardOverview tasks={tasks} members={members} docs={[]} syncLogs={[]} isOffline={false} isSynced workspaceName={workspace.name} currentUser={currentUser} onNavigate={setView} onOpenTask={task => { setSelectedTask(task); setView('tasks'); }} onToggleOffline={noop} onUpgradePremium={noop} />}
        {view === 'tasks' && <SpacePage tasks={tasks} members={members} spaces={spaces} onSaveSpaces={setSpaces} activeSpaceId={spaceId} setActiveSpaceId={setSpaceId} activeListId={listId} setActiveListId={setListId} activeWorkspaceId={workspace.id} allWorkspaces={[workspace]} currentUser={currentUser} isOffline onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={id => setTasks(current => current.filter(task => task.id !== id))} onAddSyncLog={noop} initialSelectedTaskId={selectedTask} onClearInitialSelectedTaskId={() => setSelectedTask(null)} />}
        {view === 'inbox' && <InboxView notificationsList={notifications} setNotificationsList={setNotifications} tasks={tasks} members={members} workspaces={[workspace]} activeWorkspaceId={workspace.id} onUpdateTask={updateTask} onAddTask={addTask} onDeleteTask={noop} onAddSyncLog={noop} currentUser={currentUser} onUpgradePremium={noop} />}
      </div></main>
    </div>
  </div>;
}
