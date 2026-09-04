'use client';

import { useNotificationStore } from '@/store/notificationStore';

export type ReminderOption = 'none' | 'at_time' | '5m' | '10m' | '30m' | '1h' | '1d';

export interface ReminderConfig {
  id: ReminderOption;
  labelVi: string;
  labelEn: string;
  offsetMinutes: number; // minutes before due date
}

export const REMINDER_OPTIONS: ReminderConfig[] = [
  { id: 'none', labelVi: 'Không thông báo', labelEn: 'No reminder', offsetMinutes: -1 },
  { id: 'at_time', labelVi: 'Đúng giờ hạn', labelEn: 'At due time', offsetMinutes: 0 },
  { id: '5m', labelVi: 'Trước 5 phút', labelEn: '5 minutes before', offsetMinutes: 5 },
  { id: '10m', labelVi: 'Trước 10 phút', labelEn: '10 minutes before', offsetMinutes: 10 },
  { id: '30m', labelVi: 'Trước 30 phút', labelEn: '30 minutes before', offsetMinutes: 30 },
  { id: '1h', labelVi: 'Trước 1 giờ', labelEn: '1 hour before', offsetMinutes: 60 },
  { id: '1d', labelVi: 'Trước 1 ngày (09:00)', labelEn: '1 day before (09:00)', offsetMinutes: 1440 },
];

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export interface SystemNotificationPayload {
  title: string;
  message: string;
  type?: 'deadline' | 'assignment' | 'comment' | 'success' | 'info' | 'message' | 'chat_message';
  taskId?: string;
  workspaceId?: string;
  playSound?: boolean;
}

/**
 * Triggers standard notification across:
 * 1. In-App Toast
 * 2. Persistent Inbox Notifications
 * 3. Web Audio System Sound
 * 4. Native Browser Desktop Push Notification (if permitted)
 */
export function sendSystemNotification({
  title,
  message,
  type = 'deadline',
  taskId,
  workspaceId,
  playSound = true,
}: SystemNotificationPayload) {
  if (typeof window === 'undefined') return;

  // 1. Play Audio Chime
  if (playSound) {
    try {
      if (typeof (window as any).playSystemSound === 'function') {
        (window as any).playSystemSound('notification');
      }
    } catch {}
  }

  // 2. In-App Toast
  const store = useNotificationStore.getState();
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  store.addToast({
    id: toastId,
    type,
    title,
    message,
    duration: 5500,
  });

  // 3. Persistent Inbox Notification
  store.addNotification({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
    taskId,
    workspaceId,
  });

  // 4. Native Desktop Notification
  if (isBrowserNotificationSupported() && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: taskId ? `apexa-task-${taskId}` : undefined,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {}
  }
}

// ── Local Task Reminders Storage & Scheduler ──
const REMINDER_STORAGE_KEY = 'apexa_task_reminders_v1';
const FIRED_REMINDER_STORAGE_KEY = 'apexa_fired_reminders_v1';

export interface TaskReminderRecord {
  taskId: string;
  taskTitle: string;
  dueIso: string;
  reminder: ReminderOption;
  targetTimestamp: number;
}

export function calculateReminderTimestamp(dueIso: string, reminder: ReminderOption): number | null {
  if (!dueIso || reminder === 'none') return null;
  const dueDate = new Date(dueIso);
  if (isNaN(dueDate.getTime())) return null;

  const config = REMINDER_OPTIONS.find((r) => r.id === reminder);
  if (!config || config.offsetMinutes < 0) return null;

  if (reminder === '1d') {
    // 1 day before at 09:00
    const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    oneDayBefore.setHours(9, 0, 0, 0);
    return oneDayBefore.getTime();
  }

  return dueDate.getTime() - config.offsetMinutes * 60 * 1000;
}

export function saveTaskReminder(
  taskId: string,
  taskTitle: string,
  dueIso: string,
  reminder: ReminderOption,
) {
  if (typeof window === 'undefined' || !taskId) return;
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    const list: Record<string, TaskReminderRecord> = raw ? JSON.parse(raw) : {};

    if (reminder === 'none' || !dueIso) {
      delete list[taskId];
    } else {
      const targetTimestamp = calculateReminderTimestamp(dueIso, reminder);
      if (targetTimestamp) {
        list[taskId] = {
          taskId,
          taskTitle: taskTitle || 'Công việc',
          dueIso,
          reminder,
          targetTimestamp,
        };
      }
    }
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save task reminder:', err);
  }
}

export function getTaskReminder(taskId: string): ReminderOption {
  if (typeof window === 'undefined' || !taskId) return 'none';
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return 'none';
    const list: Record<string, TaskReminderRecord> = JSON.parse(raw);
    return list[taskId]?.reminder || 'none';
  } catch {
    return 'none';
  }
}

export function checkAndFirePendingReminders() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return;
    const list: Record<string, TaskReminderRecord> = JSON.parse(raw);
    const firedRaw = localStorage.getItem(FIRED_REMINDER_STORAGE_KEY);
    const firedSet = new Set<string>(firedRaw ? JSON.parse(firedRaw) : []);

    const now = Date.now();
    let firedCount = 0;

    for (const [taskId, record] of Object.entries(list)) {
      const reminderKey = `${taskId}_${record.reminder}_${record.targetTimestamp}`;
      if (firedSet.has(reminderKey)) continue;

      // If target time reached (and not more than 24h expired)
      if (now >= record.targetTimestamp && now <= record.targetTimestamp + 24 * 60 * 60 * 1000) {
        const option = REMINDER_OPTIONS.find((o) => o.id === record.reminder);
        const reminderDesc = option ? option.labelVi : 'Đến hạn';

        sendSystemNotification({
          title: `🔔 Nhắc việc: ${record.taskTitle}`,
          message: `Hạn chót: ${new Date(record.dueIso).toLocaleString('vi-VN')} (${reminderDesc}).`,
          type: 'deadline',
          taskId: record.taskId,
        });

        firedSet.add(reminderKey);
        firedCount++;
      }
    }

    if (firedCount > 0) {
      localStorage.setItem(FIRED_REMINDER_STORAGE_KEY, JSON.stringify(Array.from(firedSet).slice(-200)));
    }
  } catch (err) {
    console.error('Error checking reminders:', err);
  }
}
