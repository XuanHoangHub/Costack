'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { useNotificationStore } from '@/store/notificationStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useTaskStore } from '@/store/taskStore';
import { useSyncStore } from '@/store/syncStore';

export function useNotificationsEngine() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const tasks = useTaskStore((s) => s.tasks);
  const pomodoroActive = usePomodoroStore((s) => s.pomodoroActive);
  const notificationSettings = useNotificationStore((s) => s.notificationSettings);
  const addToast = useNotificationStore((s) => s.addToast);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addSyncLog = useSyncStore((s) => s.addSyncLog);

  const lastToastsRef = useRef<Record<string, number>>({});

  const triggerToast = useCallback((type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message', title: string, message: string) => {
    if (pomodoroActive && type !== 'success' && type !== 'info') {
      console.log(`[Pomodoro Active - Notification Blocked]: ${title}: ${message}`);
      return;
    }

    const titleLower = title.toLowerCase();
    const msgLower = message.toLowerCase();

    if (!notificationSettings.enableAll || notificationSettings.dndActive) {
      console.log(`[Notification Suppressed - Off or DND]: ${title}`);
      return;
    }

    if ((titleLower.includes('nhãn') || msgLower.includes('nhãn') || titleLower.includes('lọc')) && !notificationSettings.enableFilteringTags) {
      return;
    }

    const isStatusChange = titleLower.includes('trạng thái') || 
                           msgLower.includes('trạng thái') || 
                           msgLower.includes('chuyển sang "cần làm"') || 
                           msgLower.includes('chuyển sang "đang làm"') || 
                           msgLower.includes('chuyển sang "đang duyệt"') || 
                           titleLower.includes('hoàn tất') ||
                           titleLower.includes('đã hoàn thành') ||
                           titleLower.includes('đã mở lại');
    if (isStatusChange && !notificationSettings.enableStatusChanges) {
      return;
    }

    if (type === 'assignment' && !notificationSettings.enableAssignments) return;
    if (type === 'deadline' && !notificationSettings.enableDeadlines) return;
    if ((type === 'comment' || type === 'message') && !notificationSettings.enableComments) return;
    if ((type === 'success' || type === 'info') && !isStatusChange && !notificationSettings.enableSystemNotify) {
      return;
    }

    if (notificationSettings.onlyImportant) {
      const isImportant = type === 'deadline' || 
                          type === 'assignment' || 
                          titleLower.includes('gấp') || 
                          titleLower.includes('quan trọng') || 
                          msgLower.includes('hoàn tất!') || 
                          titleLower.includes('hạn chót') || 
                          titleLower.includes('cảnh báo');
      if (!isImportant) return;
    }

    const now = Date.now();
    if (notificationSettings.frequencyLimit === 'throttled') {
      const key = `${type}_${title}_${message}`;
      const lastTime = lastToastsRef.current[key] || 0;
      if (now - lastTime < 3000) {
        console.log(`[Anti-Spam Suppress]: Repeated too quickly: ${title}`);
        return;
      }
      lastToastsRef.current[key] = now;

      const catKey = `cat_${type}`;
      const lastCatTime = lastToastsRef.current[catKey] || 0;
      if (now - lastCatTime < 1500) {
        console.log(`[Anti-Spam Suppress]: Category paced: ${type}`);
        return;
      }
      lastToastsRef.current[catKey] = now;
    } else if (notificationSettings.frequencyLimit === 'minimal') {
      const key = `global_minimal`;
      const lastTime = lastToastsRef.current[key] || 0;
      const isImportant = type === 'deadline' || type === 'assignment' || titleLower.includes('hạn chót');
      if (!isImportant || now - lastTime < 5000) {
        return;
      }
      lastToastsRef.current[key] = now;
    }

    const newNotifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    if (typeof window !== 'undefined') {
      addNotification({
        id: newNotifId,
        type,
        title,
        message,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
        read: false
      });
    }

    if (notificationSettings.enableSound && typeof window !== 'undefined') {
      try {
        const playSystemSoundFn = (window as any).playSystemSound;
        if (playSystemSoundFn) {
          playSystemSoundFn('notification');
        }
      } catch (e) {
        console.warn('System sound play failed:', e);
      }
    }

    addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      duration: notificationSettings.toastDuration
    });
  }, [pomodoroActive, notificationSettings, addToast, addNotification]);

  useEffect(() => {
    if (currentUser && tasks.length > 0) {
      const timer = setTimeout(() => {
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        const upcomingTasks = tasks.filter(t => {
          if (t.status === 'completed' || !t.dueDate) return false;
          try {
            const due = new Date(t.dueDate);
            return !isNaN(due.getTime()) && due <= threeDaysFromNow;
          } catch (e) {
            return false;
          }
        });

        if (upcomingTasks.length > 0) {
          let notifiedMap: Record<string, string> = {};
          try {
            const stored = typeof window !== 'undefined' ? localStorage.getItem('avaxa_notified_deadlines') : null;
            if (stored) notifiedMap = JSON.parse(stored);
          } catch (e) {
            console.error('Error loading notified deadlines:', e);
          }

          let wasUpdated = false;
          const newNotifiedMap = { ...notifiedMap };

          upcomingTasks.forEach((t, index) => {
            if (notifiedMap[t.id] === t.dueDate) {
              return;
            }

            setTimeout(() => {
              triggerToast(
                'deadline',
                'Deadline Warning',
                `Task "${t.title}" is approaching its completion date (${t.dueDate}). Please check!`
              );
            }, index * 1200);

            newNotifiedMap[t.id] = t.dueDate || '';
            wasUpdated = true;
          });

          if (wasUpdated) {
            try {
              localStorage.setItem('avaxa_notified_deadlines', JSON.stringify(newNotifiedMap));
            } catch (e) {
              console.error('Error saving notified deadlines:', e);
            }
          }
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, tasks, triggerToast]);

  return { triggerToast };
}
