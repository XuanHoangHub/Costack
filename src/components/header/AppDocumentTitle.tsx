"use client";

import { useEffect, memo } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Space, User } from '@/types';

interface AppDocumentTitleProps {
  currentUser: User | null;
  activeTab: string;
  activeSpaceId: string | null;
  spaces: Space[];
  workspaceName?: string;
  locale: string;
}

const TAB_LABELS: Record<string, { vi: string; en: string }> = {
  dashboard: { vi: 'Tổng quan', en: 'Dashboard' },
  tasks: { vi: 'Công việc', en: 'Tasks' },
  'my-tasks': { vi: 'Việc của tôi', en: 'My Tasks' },
  inbox: { vi: 'Hộp thư đến', en: 'Inbox' },
  finance: { vi: 'Tài chính & Thu chi', en: 'Finance' },
  team: { vi: 'Đội ngũ', en: 'Team Directory' },
  calendar: { vi: 'Lịch biểu', en: 'Calendar' },
  chat: { vi: 'Kênh trao đổi', en: 'Chat' },
  docs: { vi: 'Tài liệu', en: 'Docs' },
  whiteboard: { vi: 'Bảng vẽ', en: 'Whiteboard' },
  analytics: { vi: 'Báo cáo năng suất', en: 'Analytics' },
  settings: { vi: 'Cài đặt', en: 'Settings' },
  profile: { vi: 'Hồ sơ cá nhân', en: 'Profile' },
  productivity: { vi: 'Năng suất', en: 'Productivity Hub' },
};

/**
 * Isolated browser document.title manager.
 * Isolates high-frequency Pomodoro countdown re-renders (1Hz) from the root App component.
 */
export const AppDocumentTitle = memo(function AppDocumentTitle({
  currentUser,
  activeTab,
  activeSpaceId,
  spaces,
  workspaceName,
  locale,
}: AppDocumentTitleProps) {
  const pomodoroTime = usePomodoroStore((s) => s.pomodoroTime);
  const pomodoroActive = usePomodoroStore((s) => s.pomodoroActive);
  const pomodoroMode = usePomodoroStore((s) => s.pomodoroMode);
  const unreadCount = useNotificationStore((s) => (s.notificationsList || []).filter((n: any) => !n.isRead && !n.read).length);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!currentUser) {
      document.title = 'Costack · Không gian làm việc thông minh & Trợ lý AI';
      return;
    }

    // 1. Pomodoro Focus Timer countdown takes top priority if active
    if (pomodoroActive && pomodoroMode) {
      const m = Math.floor(pomodoroTime / 60);
      const s = pomodoroTime % 60;
      const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      const modeLabel = pomodoroMode === 'work'
        ? (locale === 'vi' ? 'Tập trung' : 'Focus')
        : (locale === 'vi' ? 'Nghỉ ngơi' : 'Break');
      document.title = `⏱ ${timeStr} (${modeLabel}) · Costack`;
      return;
    }

    // 2. Tab title based on activeTab
    const tabLabel = TAB_LABELS[activeTab];
    let titlePart = tabLabel ? (locale === 'vi' ? tabLabel.vi : tabLabel.en) : 'Workspace';

    // If viewing tasks inside a specific Space
    if (activeTab === 'tasks' && activeSpaceId) {
      const activeSpace = spaces.find((sp) => sp.id === activeSpaceId);
      if (activeSpace?.name) {
        titlePart = `${activeSpace.name} · ${locale === 'vi' ? 'Công việc' : 'Tasks'}`;
      }
    }

    // Unread notifications badge prefix e.g. (3)
    const badgePrefix = unreadCount > 0 ? `(${unreadCount}) ` : '';
    const wsName = workspaceName && workspaceName !== 'U' ? workspaceName.trim() : 'Costack';

    if (wsName.toLowerCase() === 'costack') {
      document.title = `${badgePrefix}${titlePart} · Costack`;
    } else if (wsName.toLowerCase().includes('costack')) {
      document.title = `${badgePrefix}${titlePart} · ${wsName}`;
    } else {
      document.title = `${badgePrefix}${titlePart} · ${wsName} · Costack`;
    }
  }, [currentUser, activeTab, activeSpaceId, spaces, workspaceName, pomodoroActive, pomodoroMode, pomodoroTime, unreadCount, locale]);

  return null;
});

export default AppDocumentTitle;
