'use client';

import { useNotificationStore } from '@/store/notificationStore';
import { Task } from '@/types';

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
        tag: taskId ? `apexa-task-${taskId}-${Date.now()}` : `apexa-notify-${Date.now()}`,
      });

      notification.onclick = () => {
        window.focus();
        if (taskId) {
          window.dispatchEvent(new CustomEvent('apexa-open-task', { detail: { taskId } }));
        }
        notification.close();
      };
    } catch (err) {
      console.warn('Could not show native Notification:', err);
    }
  }
}

/**
 * Send a test desktop notification to confirm permission and sound.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await requestBrowserNotificationPermission();
  }
  if (perm === 'granted') {
    sendSystemNotification({
      title: '🔔 Costack: Kiểm tra thông báo trình duyệt',
      message: 'Thông báo trên màn hình máy tính đã hoạt động hoàn hảo! Bạn sẽ nhận được cảnh báo khi đến hạn công việc.',
      type: 'success',
      playSound: true,
    });
    return true;
  }
  return false;
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

/**
 * Parses date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) into local Date object without timezone shift.
 */
export function parseDueDateTime(dueIso: string): Date | null {
  if (!dueIso) return null;
  try {
    if (dueIso.includes('T')) {
      const [datePart, timePart] = dueIso.split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      const [h = 9, min = 0, s = 0] = timePart.split(':').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d, h, min, s);
    }
    const [y, m, d] = dueIso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 18, 0, 0); // Default to 18:00 local on due date
  } catch {
    return null;
  }
}

export function calculateReminderTimestamp(dueIso: string, reminder: ReminderOption): number | null {
  if (!dueIso || reminder === 'none') return null;
  const dueDate = parseDueDateTime(dueIso);
  if (!dueDate || isNaN(dueDate.getTime())) return null;

  const config = REMINDER_OPTIONS.find((r) => r.id === reminder);
  if (!config || config.offsetMinutes < 0) return null;

  if (reminder === '1d') {
    // 1 day before at 09:00 AM
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

/**
 * Checks all tasks for pending deadline reminders and imminent deadlines.
 * Triggers browser notification, sound, and in-app toast when due.
 */
export function checkAndFirePendingReminders(tasks?: Task[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    const list: Record<string, TaskReminderRecord> = raw ? JSON.parse(raw) : {};
    const firedRaw = localStorage.getItem(FIRED_REMINDER_STORAGE_KEY);
    const firedSet = new Set<string>(firedRaw ? JSON.parse(firedRaw) : []);

    const now = Date.now();
    let firedCount = 0;

    // 1. Process tasks passed from runtime state (takes precedence)
    if (tasks && tasks.length > 0) {
      for (const t of tasks) {
        if (t.status === 'completed' || !t.dueDate) continue;

        const reminder = t.reminder || (t.custom_fields?.reminder as ReminderOption) || list[t.id]?.reminder || 'none';
        
        // Check configured reminder
        if (reminder !== 'none') {
          const targetTimestamp = calculateReminderTimestamp(t.dueDate, reminder);
          if (targetTimestamp) {
            const timeKey = Math.floor(targetTimestamp / 60000); // per-minute bucket
            const reminderKey = `rem_${t.id}_${reminder}_${timeKey}`;

            // Trigger if within [target, target + 24 hours]
            if (!firedSet.has(reminderKey) && now >= targetTimestamp && now <= targetTimestamp + 24 * 60 * 60 * 1000) {
              const option = REMINDER_OPTIONS.find((o) => o.id === reminder);
              const reminderDesc = option ? option.labelVi : 'Đến giờ hẹn';
              const dateObj = parseDueDateTime(t.dueDate);
              const formattedDate = dateObj ? dateObj.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : t.dueDate;

              sendSystemNotification({
                title: `🔔 Nhắc hẹn: ${t.title}`,
                message: `Hạn chót: ${formattedDate} (${reminderDesc}). Nhấn vào đây để xem chi tiết.`,
                type: 'deadline',
                taskId: t.id,
              });

              firedSet.add(reminderKey);
              firedCount++;
            }
          }
        }

        // Check imminent deadline: due in <= 30 minutes
        const dueObj = parseDueDateTime(t.dueDate);
        if (dueObj) {
          const diffMs = dueObj.getTime() - now;
          const diffMinutes = Math.floor(diffMs / 60000);

          if (diffMinutes > 0 && diffMinutes <= 30) {
            const urgentKey = `urgent_30m_${t.id}_${t.dueDate}`;
            if (!firedSet.has(urgentKey)) {
              sendSystemNotification({
                title: `⚠️ Sắp hết hạn trong ${diffMinutes} phút: ${t.title}`,
                message: `Công việc sẽ đến hạn lúc ${dueObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Vui lòng hoàn tất kịp thời!`,
                type: 'deadline',
                taskId: t.id,
              });
              firedSet.add(urgentKey);
              firedCount++;
            }
          }
        }
      }
    }

    // 2. Also check any standalone stored records in localStorage
    for (const [taskId, record] of Object.entries(list)) {
      const timeKey = Math.floor(record.targetTimestamp / 60000);
      const reminderKey = `rem_${taskId}_${record.reminder}_${timeKey}`;
      if (firedSet.has(reminderKey)) continue;

      if (now >= record.targetTimestamp && now <= record.targetTimestamp + 24 * 60 * 60 * 1000) {
        const option = REMINDER_OPTIONS.find((o) => o.id === record.reminder);
        const reminderDesc = option ? option.labelVi : 'Đến hạn';
        const dateObj = parseDueDateTime(record.dueIso);
        const formattedDate = dateObj ? dateObj.toLocaleString('vi-VN') : record.dueIso;

        sendSystemNotification({
          title: `🔔 Nhắc hẹn: ${record.taskTitle}`,
          message: `Hạn chót: ${formattedDate} (${reminderDesc}). Nhấn vào đây để xem chi tiết.`,
          type: 'deadline',
          taskId: record.taskId,
        });

        firedSet.add(reminderKey);
        firedCount++;
      }
    }

    if (firedCount > 0) {
      localStorage.setItem(FIRED_REMINDER_STORAGE_KEY, JSON.stringify(Array.from(firedSet).slice(-250)));
    }
  } catch (err) {
    console.error('Error checking reminders:', err);
  }
}
