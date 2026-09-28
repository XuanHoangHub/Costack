"use client";

import { useEffect, memo } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
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
  tasks: { vi: 'Không gian làm việc', en: 'Tasks' },
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
 * Keeps browser tabs clean, branded, and legible without cluttering tab prefixes.
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!currentUser) {
      document.title = locale === 'vi'
        ? 'Costack · Không gian làm việc thông minh & Trợ lý AI'
        : 'Costack · Smart Workspace & AI Assistant';
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

    const wsName = workspaceName && workspaceName !== 'U' ? workspaceName.trim() : 'Costack';
    const isDefaultWorkspace = wsName.toLowerCase() === 'costack';

    // 2. Main Dashboard (Home Overview) -> Clean brand title first so browser tabs display "Costack"
    if (activeTab === 'dashboard') {
      if (isDefaultWorkspace) {
        document.title = locale === 'vi'
          ? 'Costack · Không gian làm việc thông minh & Trợ lý AI'
          : 'Costack · Smart Workspace & AI Assistant';
      } else {
        document.title = `${wsName} · Costack`;
      }
      return;
    }

    // 3. Tab title based on activeTab
    const tabLabel = TAB_LABELS[activeTab];
    let titlePart = tabLabel ? (locale === 'vi' ? tabLabel.vi : tabLabel.en) : 'Workspace';

    // If viewing tasks inside a specific Space
    if (activeTab === 'tasks' && activeSpaceId) {
      const activeSpace = spaces.find((sp) => sp.id === activeSpaceId);
      if (activeSpace?.name) {
        titlePart = `${activeSpace.name} · ${locale === 'vi' ? 'Không gian' : 'Space'}`;
      }
    }

    if (isDefaultWorkspace) {
      document.title = `${titlePart} · Costack`;
    } else {
      document.title = `${titlePart} · ${wsName} · Costack`;
    }
  }, [currentUser, activeTab, activeSpaceId, spaces, workspaceName, pomodoroActive, pomodoroMode, pomodoroTime, locale]);

  return null;
});

export default AppDocumentTitle;

