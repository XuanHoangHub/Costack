import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotificationSettings } from '@/types';
import { Toast } from '@/components/ToastNotification';

interface NotificationState {
  toasts: Toast[];
  notificationsList: any[];
  notificationSettings: NotificationSettings;
  soundEnabled: boolean;
  addToast: (toast: Toast) => void;
  addNotification: (notification: any) => void;
  removeToast: (id: string) => void;
  setNotificationsList: (list: any[]) => void;
  setNotificationSettings: (settings: NotificationSettings | ((prev: NotificationSettings) => NotificationSettings)) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

const defaultSettings: NotificationSettings = {
  enableAll: true,
  enableSound: true,
  onlyImportant: false,
  enableAssignments: true,
  enableDeadlines: true,
  enableComments: true,
  enableStatusChanges: true,
  enableFilteringTags: false,
  enableSystemNotify: true,
  toastDuration: 4000,
  dndActive: false,
  frequencyLimit: 'throttled',
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      toasts: [],
      notificationsList: [],
      notificationSettings: defaultSettings,
      soundEnabled: true,
      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts.slice(-3), toast],
        })),
      addNotification: (notification) =>
        set((state) => ({
          notificationsList: [notification, ...state.notificationsList].slice(0, 50),
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      setNotificationsList: (notificationsList: any[] | ((prev: any[]) => any[])) => set({ notificationsList: typeof notificationsList === 'function' ? notificationsList(get().notificationsList) : notificationsList }),
      setNotificationSettings: (notificationSettings) => set({ notificationSettings: typeof notificationSettings === 'function' ? notificationSettings(get().notificationSettings) : notificationSettings }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    {
      name: 'avaxa_notifications',
      partialize: (state) => ({
        notificationsList: state.notificationsList,
        notificationSettings: state.notificationSettings,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
