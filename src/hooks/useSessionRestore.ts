'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useWorkspaceStore } from '@/store';
import { useNotificationStore } from '@/store';
import { useUiStore } from '@/store';
import { usePomodoroStore } from '@/store';
import { safeJsonParse } from '@/lib/security';

export function useSessionRestore() {
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const setAccentPreset = useWorkspaceStore((s) => s.setAccentPreset);
  const setSoundEnabled = useNotificationStore((s) => s.setSoundEnabled);
  const setBlurIntensity = useUiStore((s) => s.setBlurIntensity);
  const setNotificationSettings = useNotificationStore((s) => s.setNotificationSettings);
  const setWorkDuration = usePomodoroStore((s) => s.setWorkDuration);
  const setShortBreakDuration = usePomodoroStore((s) => s.setShortBreakDuration);
  const setLongBreakDuration = usePomodoroStore((s) => s.setLongBreakDuration);
  const setPomodoroTime = usePomodoroStore((s) => s.setPomodoroTime);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedSession = localStorage.getItem('avaxa_session');
      if (savedSession) {
        const parsed = safeJsonParse<{ user: any; expiresAt: number } | null>(savedSession, null);
        if (parsed && parsed.user && typeof parsed.expiresAt === 'number' && Date.now() < parsed.expiresAt) {
          setCurrentUser(parsed.user);
        } else {
          localStorage.removeItem('avaxa_session');
        }
      }
    } catch (e) {
      console.error('Error restoring login session:', e);
    }

    try {
      const savedDark = localStorage.getItem('avaxa_dark_mode');
      if (savedDark !== null) {
        const isDark = savedDark === 'true';
        useUiStore.getState().setIsDarkMode(isDark);
        if (isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('avaxa_accent_preset');
      if (saved === 'ocean' || saved === 'forest' || saved === 'sunset' || saved === 'indigo') {
        setAccentPreset(saved as any);
        useUiStore.getState().setAccentPreset(saved as any);
      }
    } catch (e) {
      console.error('Error restoring color preset:', e);
    }

    try {
      const savedSound = localStorage.getItem('avaxa_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound !== 'false');
      }
    } catch (e) {}

    try {
      const savedBlur = localStorage.getItem('avaxa_blur_intensity');
      if (savedBlur === 'soft' || savedBlur === 'default' || savedBlur === 'immersive') {
        setBlurIntensity(savedBlur);
      }
    } catch (e) {}

    try {
      const savedNotifications = localStorage.getItem('avaxa_notification_settings');
      if (savedNotifications) {
        setNotificationSettings((prev: any) => ({ ...prev, ...JSON.parse(savedNotifications) }));
      }
    } catch (e) {}

    try {
      const workVal = localStorage.getItem('avaxa_pomo_work');
      const shortVal = localStorage.getItem('avaxa_pomo_short');
      const longVal = localStorage.getItem('avaxa_pomo_long');
      if (workVal) {
        const workNum = Number(workVal);
        setWorkDuration(workNum);
        setPomodoroTime(workNum * 60);
      }
      if (shortVal) setShortBreakDuration(Number(shortVal));
      if (longVal) setLongBreakDuration(Number(longVal));
    } catch (e) {}
  }, [setCurrentUser, setAccentPreset, setSoundEnabled, setBlurIntensity, setNotificationSettings, setWorkDuration, setShortBreakDuration, setLongBreakDuration, setPomodoroTime]);
}
