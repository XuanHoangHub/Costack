"use client";

import { useState } from 'react';
import DashboardOverview from '@/components/DashboardOverview';
import type { Document, Task, User } from '@/types';

const members: User[] = [
  { id: 'u1', name: 'Xuân Hoàng', email: 'xuan@example.com', avatar: '', role: 'admin', status: 'online' },
  { id: 'u2', name: 'Minh Anh', email: 'minh@example.com', avatar: '', role: 'member', status: 'busy' },
  { id: 'u3', name: 'Quang Bảo', email: 'bao@example.com', avatar: '', role: 'member', status: 'online' },
  { id: 'u4', name: 'Lan Chi', email: 'chi@example.com', avatar: '', role: 'member', status: 'away' },
];

const priorities: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];
const statuses: Task['status'][] = ['todo', 'inprogress', 'review', 'completed'];
const now = new Date();
const isoDaysAgo = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 10).toISOString();
const dateDaysFromNow = (days: number) => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const tasks: Task[] = Array.from({ length: 46 }, (_, index) => {
  const status = statuses[index % statuses.length];
  const createdDaysAgo = (index * 3) % 55;
  return {
    id: `task-${index + 1}`,
    title: ['Hoàn thiện luồng onboarding', 'Tối ưu hiệu suất API', 'Kiểm thử thanh toán', 'Thiết kế báo cáo điều hành', 'Chuẩn hoá dữ liệu khách hàng'][index % 5] + ` #${index + 1}`,
    description: 'Dữ liệu mẫu phục vụ kiểm thử Dashboard.',
    priority: priorities[index % priorities.length],
    status,
    assigneeId: index % 7 === 0 ? undefined : members[index % members.length].id,
    assigneeIds: index % 6 === 0 ? ['u1', 'u2'] : undefined,
    startDate: dateDaysFromNow(-createdDaysAgo),
    dueDate: index % 8 === 0 ? undefined : dateDaysFromNow((index % 15) - 5),
    subtasks: [],
    progress: status === 'completed' ? 100 : status === 'review' ? 80 : status === 'inprogress' ? 45 : 0,
    createdAt: isoDaysAgo(createdDaysAgo),
    completedAt: status === 'completed' ? isoDaysAgo(Math.max(0, createdDaysAgo - 3)) : undefined,
    hoursEstimate: 2 + (index % 8),
    hoursLogged: status === 'completed' ? 2 + (index % 7) : index % 4,
    commentsCount: index % 6,
    isPinned: index < 2,
  };
});

const docs: Document[] = Array.from({ length: 12 }, (_, index) => ({
  id: `doc-${index}`,
  title: `Tài liệu ${index + 1}`,
  content: '',
  category: 'Project',
  updatedAt: isoDaysAgo(index),
  updatedBy: 'u1',
}));

export default function DashboardLabPage() {
  const [premium, setPremium] = useState(false);
  return (
    <main className="apexa-app-shell apexa-design-system apexa-preview-shell min-h-screen bg-slate-50 dark:bg-[#090909]">
      <button type="button" onClick={() => setPremium((value) => !value)} className="fixed right-4 top-4 z-[100] rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-xl">
        Test: {premium ? 'Premium' : 'Free'}
      </button>
      <DashboardOverview
        tasks={tasks}
        members={members}
        docs={docs}
        syncLogs={[]}
        isOffline={false}
        isSynced
        workspaceName="Upgen Product"
        onNavigate={() => {}}
        onOpenTask={() => {}}
        onToggleOffline={() => {}}
        currentUser={{ ...members[0], isPremium: premium }}
        onUpgradePremium={() => setPremium(true)}
      />
    </main>
  );
}
