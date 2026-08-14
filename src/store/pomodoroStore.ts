import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UiPresenceStatus } from '@/lib/presence';

interface PomodoroState {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  pomodoroMode: 'work' | 'short' | 'long';
  pomodoroTime: number;
  pomodoroActive: boolean;
  previousStatus: UiPresenceStatus;
  showPomoSettings: boolean;
  setWorkDuration: (d: number) => void;
  setShortBreakDuration: (d: number) => void;
  setLongBreakDuration: (d: number) => void;
  setPomodoroMode: (mode: 'work' | 'short' | 'long') => void;
  setPomodoroTime: (time: number | ((prev: number) => number)) => void;
  setPomodoroActive: (active: boolean) => void;
  setPreviousStatus: (status: UiPresenceStatus) => void;
  setShowPomoSettings: (show: boolean) => void;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      pomodoroMode: 'work',
      pomodoroTime: 25 * 60,
      pomodoroActive: false,
      previousStatus: 'online',
      showPomoSettings: false,
      setWorkDuration: (workDuration) => set({ workDuration }),
      setShortBreakDuration: (shortBreakDuration) => set({ shortBreakDuration }),
      setLongBreakDuration: (longBreakDuration) => set({ longBreakDuration }),
      setPomodoroMode: (pomodoroMode) => set({ pomodoroMode }),
      setPomodoroTime: (pomodoroTime) => set({ pomodoroTime: typeof pomodoroTime === 'function' ? pomodoroTime(get().pomodoroTime) : pomodoroTime }),
      setPomodoroActive: (pomodoroActive) => set({ pomodoroActive }),
      setPreviousStatus: (previousStatus) => set({ previousStatus }),
      setShowPomoSettings: (showPomoSettings) => set({ showPomoSettings }),
    }),
    {
      name: 'apexa_pomodoro',
    }
  )
);
