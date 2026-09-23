"use client";

import React, { useState } from 'react';
import DashboardOverview from '@/components/DashboardOverview';
import type { Document, Task, User, SyncLog } from '@/types';
import { Sun, Moon, Sparkles, ShieldCheck } from 'lucide-react';

const mockMembers: User[] = [
  { id: 'u1', name: 'Xuân Hoàng', email: 'xuanhoang@example.com', avatar: '', role: 'admin', status: 'online' },
  { id: 'u2', name: 'Minh Anh', email: 'minhanh@example.com', avatar: '', role: 'member', status: 'online' },
  { id: 'u3', name: 'Quang Bảo', email: 'quangbao@example.com', avatar: '', role: 'member', status: 'busy' },
  { id: 'u4', name: 'Lan Chi', email: 'lanchi@example.com', avatar: '', role: 'member', status: 'away' },
  { id: 'u5', name: 'Tuấn Kiệt', email: 'tuankiet@example.com', avatar: '', role: 'member', status: 'offline' },
];

const now = new Date();
const formatDate = (daysOffset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatIso = (daysOffset: number) => {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset, 10, 0, 0).toISOString();
};

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Thiết kế hệ thống Design System v2 cho Dashboard',
    description: 'Nâng cấp toàn bộ bảng màu, typography, và các tương tác micro-animations.',
    priority: 'urgent',
    status: 'inprogress',
    assigneeId: 'u1',
    assigneeIds: ['u1', 'u2'],
    startDate: formatDate(-3),
    dueDate: formatDate(0),
    hoursEstimate: 16,
    hoursLogged: 12,
    progress: 75,
    isPinned: true,
    subtasks: [],
    commentsCount: 3,
    createdAt: formatIso(-5),
  },
  {
    id: 'task-2',
    title: 'Tối ưu hóa thời gian tải trang Dashboard & phân vùng dữ liệu',
    description: 'Code-splitting các subcomponents và tối ưu hóa Recharts rendering.',
    priority: 'high',
    status: 'inprogress',
    assigneeId: 'u2',
    startDate: formatDate(-2),
    dueDate: formatDate(2),
    hoursEstimate: 10,
    hoursLogged: 6,
    progress: 60,
    isPinned: true,
    subtasks: [],
    commentsCount: 1,
    createdAt: formatIso(-4),
  },
  {
    id: 'task-3',
    title: 'Xử lý lỗi hết hạn token WebSocket trong Presence Channel',
    description: 'Cần kiểm tra reconnect loop và fallback polling.',
    priority: 'urgent',
    status: 'todo',
    assigneeId: 'u1',
    startDate: formatDate(-4),
    dueDate: formatDate(-1), // overdue
    hoursEstimate: 6,
    hoursLogged: 0,
    progress: 0,
    subtasks: [],
    commentsCount: 0,
    createdAt: formatIso(-4),
  },
  {
    id: 'task-4',
    title: 'Kiểm thử toàn diện luồng thanh toán PayOS & Stripe Webhook',
    description: 'Bảo đảm giao dịch cập nhật tức thì trạng thái gói đăng ký Pro.',
    priority: 'high',
    status: 'review',
    assigneeId: 'u3',
    startDate: formatDate(-3),
    dueDate: formatDate(3),
    hoursEstimate: 8,
    hoursLogged: 7,
    progress: 85,
    subtasks: [],
    commentsCount: 4,
    createdAt: formatIso(-3),
  },
  {
    id: 'task-5',
    title: 'Tích hợp mô hình AI Gemini Flash 2.5 cho Báo cáo điều hành',
    description: 'Tự động phân tích điểm nghẽn và đưa ra gợi ý phân bổ tài nguyên.',
    priority: 'medium',
    status: 'completed',
    assigneeId: 'u1',
    startDate: formatDate(-6),
    dueDate: formatDate(-1),
    completedAt: formatIso(-1),
    hoursEstimate: 12,
    hoursLogged: 11,
    progress: 100,
    subtasks: [],
    commentsCount: 2,
    createdAt: formatIso(-7),
  },
  {
    id: 'task-6',
    title: 'Chuẩn hóa định dạng xuất dữ liệu CSV & Excel cho báo cáo KPI',
    description: 'Đảm bảo tương thích UTF-8 BOM với Microsoft Excel tiếng Việt.',
    priority: 'low',
    status: 'completed',
    assigneeId: 'u4',
    startDate: formatDate(-5),
    dueDate: formatDate(-2),
    completedAt: formatIso(-2),
    hoursEstimate: 4,
    hoursLogged: 4,
    progress: 100,
    subtasks: [],
    commentsCount: 0,
    createdAt: formatIso(-6),
  },
  {
    id: 'task-7',
    title: 'Lập kế hoạch phân bổ Sprint tiếp theo cho team Frontend',
    description: 'Xem xét phân bổ số giờ làm việc dựa trên dữ liệu vận tốc tuần.',
    priority: 'medium',
    status: 'todo',
    startDate: formatDate(1),
    dueDate: formatDate(5),
    hoursEstimate: 5,
    hoursLogged: 0,
    progress: 0,
    subtasks: [],
    commentsCount: 0,
    createdAt: formatIso(-1),
  },
];

const mockDocs: Document[] = [
  { id: 'doc-1', title: 'Tài liệu Kiến trúc Costack v2', content: '', category: 'Architecture', updatedAt: formatIso(-1), updatedBy: 'u1' },
  { id: 'doc-2', title: 'Quy chuẩn Viết Code & Review PR', content: '', category: 'Guidelines', updatedAt: formatIso(-3), updatedBy: 'u2' },
  { id: 'doc-3', title: 'Kế hoạch Phát hành Q3/2026', content: '', category: 'Roadmap', updatedAt: formatIso(-5), updatedBy: 'u1' },
];

const mockSyncLogs: SyncLog[] = [
  { id: 'log-1', action: 'Đã hoàn thành công việc: Tích hợp mô hình AI Gemini Flash 2.5', time: '11:45', status: 'synced', category: 'task' },
  { id: 'log-2', action: 'Đã cập nhật tiến độ công việc: Thiết kế hệ thống Design System v2', time: '10:30', status: 'synced', category: 'task' },
  { id: 'log-3', action: 'Đã thêm tài liệu mới: Kế hoạch Phát hành Q3/2026', time: '09:15', status: 'synced', category: 'doc' },
];

export default function DashboardPreviewPage() {
  const [isPremium, setIsPremium] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b0d13] dark:text-slate-100 transition-colors">
        {/* Preview Control Bar */}
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-xl dark:border-slate-800 dark:bg-[#10121a]/80">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">
              U
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              Costack Dashboard NextGen
            </span>
            <span className="hidden sm:inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              Live Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPremium((prev) => !prev)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black shadow-xs transition-all cursor-pointer ${
                isPremium
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isPremium ? 'Pro Mode' : 'Free Mode'}
            </button>

            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* The New Dashboard Component */}
        <div className="p-2 sm:p-4 lg:p-6">
          <DashboardOverview
            tasks={mockTasks}
            members={mockMembers}
            docs={mockDocs}
            syncLogs={mockSyncLogs}
            isOffline={false}
            isSynced={true}
            workspaceName="Costack Engineering"
            currentUser={{ ...mockMembers[0], isPremium }}
            onNavigate={(tab) => console.log('Navigate to:', tab)}
            onOpenTask={(taskId) => console.log('Open task:', taskId)}
            onToggleOffline={() => {}}
            onUpgradePremium={() => setIsPremium(true)}
            onClearSyncLogs={() => {}}
          />
        </div>
      </main>
    </div>
  );
}
