import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '../api/storage';
import { NotificationItem } from '../types';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: NotificationItem) => void;
  getUnreadCount: () => number;
}

const defaultNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Nhiệm vụ mới được gán',
    message: 'Hoàng vừa gán công việc "Xây dựng bản mẫu ứng dụng React Native" cho bạn.',
    type: 'task_assigned',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Nhắc nhở hạn chót',
    message: 'Công việc "Tích hợp trợ lý Costack Brain AI" sắp đến hạn hoàn thành.',
    type: 'deadline',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Hệ thống',
    message: 'Hệ thống đã đồng bộ toàn bộ cơ sở dữ liệu với phiên bản Web mới nhất.',
    type: 'system',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: defaultNotifications,
      unreadCount: defaultNotifications.filter((n) => !n.read).length,
      markAsRead: (id) =>
        set((state) => {
          const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      addNotification: (n) =>
        set((state) => {
          const updated = [n, ...state.notifications];
          return {
            notifications: updated,
            unreadCount: updated.filter((item) => !item.read).length,
          };
        }),
      getUnreadCount: () => get().unreadCount,
    }),
    {
      name: 'apexa_mobile_notifications',
      storage: createJSONStorage(() => safeAsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unreadCount = (state.notifications || []).filter((n) => !n.read).length;
        }
      },
    }
  )
);
