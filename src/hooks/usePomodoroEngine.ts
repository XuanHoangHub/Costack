'use client';

import { useCallback, useEffect } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSyncStore } from '@/store/syncStore';
import { useUiStore } from '@/store/uiStore';

export function usePomodoroEngine() {
  const workDuration = usePomodoroStore((s) => s.workDuration);
  const shortBreakDuration = usePomodoroStore((s) => s.shortBreakDuration);
  const longBreakDuration = usePomodoroStore((s) => s.longBreakDuration);
  const pomodoroMode = usePomodoroStore((s) => s.pomodoroMode);
  const pomodoroTime = usePomodoroStore((s) => s.pomodoroTime);
  const pomodoroActive = usePomodoroStore((s) => s.pomodoroActive);
  const previousStatus = usePomodoroStore((s) => s.previousStatus);
  const showPomoSettings = usePomodoroStore((s) => s.showPomoSettings);

  const setPomodoroMode = usePomodoroStore((s) => s.setPomodoroMode);
  const setPomodoroTime = usePomodoroStore((s) => s.setPomodoroTime);
  const setPomodoroActive = usePomodoroStore((s) => s.setPomodoroActive);
  const setPreviousStatus = usePomodoroStore((s) => s.setPreviousStatus);
  const setWorkDuration = usePomodoroStore((s) => s.setWorkDuration);
  const setShortBreakDuration = usePomodoroStore((s) => s.setShortBreakDuration);
  const setLongBreakDuration = usePomodoroStore((s) => s.setLongBreakDuration);
  const setUserStatus = useUiStore((s) => s.setUserStatus);

  const addSyncLog = useSyncStore((s) => s.addSyncLog);
  const addToast = useNotificationStore((s) => s.addToast);

  const startPomodoro = useCallback(() => {
    if (!pomodoroActive) {
      setPreviousStatus('online');
      if (pomodoroMode === 'work') {
        setPreviousStatus('focused');
      }
      setPomodoroActive(true);
      const modeLabel = pomodoroMode === 'work' ? 'Focus' : (pomodoroMode === 'short' ? 'Short Break' : 'Long Break');
      const minutes = pomodoroMode === 'work' ? workDuration : (pomodoroMode === 'short' ? shortBreakDuration : longBreakDuration);
      addToast({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'info',
        title: 'Focus Mode Active',
        message: `Launched Pomodoro ${modeLabel} for ${minutes} minutes. Blocking non-critical notifications.`,
        duration: 4000
      });
      addSyncLog(`Activated Pomodoro ${modeLabel} session (${minutes} minutes)`);
    }
  }, [pomodoroActive, pomodoroMode, workDuration, shortBreakDuration, longBreakDuration, setPomodoroActive, setPreviousStatus, addToast, addSyncLog]);

  const pausePomodoro = useCallback(() => {
    setPomodoroActive(false);
    addToast({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'info',
      title: 'Paused',
      message: 'Pomodoro focus timer paused.',
      duration: 4000
    });
    addSyncLog('Paused Pomodoro focus session');
  }, [setPomodoroActive, addToast, addSyncLog]);

  const stopPomodoro = useCallback(() => {
    setPomodoroActive(false);
    const d = pomodoroMode === 'work' ? workDuration : (pomodoroMode === 'short' ? shortBreakDuration : longBreakDuration);
    setPomodoroTime(d * 60);
    setUserStatus(previousStatus === 'focused' ? 'online' : previousStatus);
    addToast({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'info',
      title: 'Focus Ended',
      message: 'Pomodoro stopped, restoring notifications.',
      duration: 4000
    });
    addSyncLog('Stopped Pomodoro focus session');
  }, [pomodoroMode, workDuration, shortBreakDuration, longBreakDuration, setPomodoroActive, setPomodoroTime, previousStatus, setUserStatus, addToast, addSyncLog]);

  const switchPomodoroMode = useCallback((mode: 'work' | 'short' | 'long') => {
    setPomodoroActive(false);
    setPomodoroMode(mode);
    const d = mode === 'work' ? workDuration : (mode === 'short' ? shortBreakDuration : longBreakDuration);
    setPomodoroTime(d * 60);
    setUserStatus(previousStatus === 'focused' ? 'online' : previousStatus);
    addSyncLog(`Changed Pomodoro mode to: ${mode === 'work' ? 'Work' : (mode === 'short' ? 'Short Break' : 'Long Break')}`);
  }, [workDuration, shortBreakDuration, longBreakDuration, setPomodoroActive, setPomodoroMode, setPomodoroTime, previousStatus, setUserStatus, addSyncLog]);

  const updatePomoDurations = useCallback((workVal: number, shortVal: number, longVal: number) => {
    setWorkDuration(workVal);
    setShortBreakDuration(shortVal);
    setLongBreakDuration(longVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('avaxa_pomo_work', String(workVal));
      localStorage.setItem('avaxa_pomo_short', String(shortVal));
      localStorage.setItem('avaxa_pomo_long', String(longVal));
    }
    const currentDuration = pomodoroMode === 'work' ? workVal : (pomodoroMode === 'short' ? shortVal : longVal);
    if (!pomodoroActive) {
      setPomodoroTime(currentDuration * 60);
    }
    addToast({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'success',
      title: 'Updated Successfully',
      message: 'New Pomodoro durations configuration applied.',
      duration: 4000
    });
  }, [pomodoroMode, pomodoroActive, setWorkDuration, setShortBreakDuration, setLongBreakDuration, setPomodoroTime, addToast]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoroActive) {
      interval = setInterval(() => {
        setPomodoroTime((prev: number) => {
          if (prev <= 1) {
            setPomodoroActive(false);
            setPreviousStatus(previousStatus === 'focused' ? 'online' : previousStatus);
            
            const modeLabel = pomodoroMode === 'work' ? 'Focus' : (pomodoroMode === 'short' ? 'Short Break' : 'Long Break');
            const minutes = pomodoroMode === 'work' ? workDuration : (pomodoroMode === 'short' ? shortBreakDuration : longBreakDuration);
            
            let nextMode: 'work' | 'short' | 'long' = 'work';
            let nextTime = workDuration * 60;
            if (pomodoroMode === 'work') {
              nextMode = 'short';
              nextTime = shortBreakDuration * 60;
            } else {
              nextMode = 'work';
              nextTime = workDuration * 60;
            }
            
            setPomodoroMode(nextMode);
            
            setTimeout(() => {
              addToast({
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: 'success',
                title: 'Focus Completed!',
                message: `Pomodoro focus session ${modeLabel} of ${minutes} minutes completed successfully.`,
                duration: 4000
              });
              addSyncLog(`Completed Pomodoro focus session ${modeLabel} of ${minutes} minutes`);
            }, 0);
            return nextTime;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroActive, previousStatus, pomodoroMode, workDuration, shortBreakDuration, longBreakDuration, setPomodoroTime, setPomodoroActive, setPreviousStatus, setPomodoroMode, addToast, addSyncLog]);

  return {
    pomodoroMode,
    pomodoroTime,
    pomodoroActive,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    showPomoSettings,
    startPomodoro,
    pausePomodoro,
    stopPomodoro,
    switchPomodoroMode,
    updatePomoDurations,
  };
}
