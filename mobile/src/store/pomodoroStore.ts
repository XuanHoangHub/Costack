import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '../api/storage';

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroState {
  mode: PomodoroMode;
  timeLeft: number; // in seconds
  isActive: boolean;
  completedCycles: number;
  targetTaskId: string | null;
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes

  setMode: (mode: PomodoroMode) => void;
  setIsActive: (active: boolean) => void;
  setTimeLeft: (seconds: number) => void;
  setTargetTaskId: (taskId: string | null) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipMode: () => void;
  tick: () => boolean; // returns true if finished
  setDurations: (work: number, shortBreak: number, longBreak: number) => void;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: 'work',
      timeLeft: 25 * 60,
      isActive: false,
      completedCycles: 0,
      targetTaskId: null,
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,

      setMode: (mode) => {
        const state = get();
        let seconds = state.workDuration * 60;
        if (mode === 'shortBreak') seconds = state.shortBreakDuration * 60;
        if (mode === 'longBreak') seconds = state.longBreakDuration * 60;
        set({ mode, timeLeft: seconds, isActive: false });
      },

      setIsActive: (isActive) => set({ isActive }),
      setTimeLeft: (timeLeft) => set({ timeLeft }),
      setTargetTaskId: (targetTaskId) => set({ targetTaskId }),

      startTimer: () => set({ isActive: true }),
      pauseTimer: () => set({ isActive: false }),

      resetTimer: () => {
        const state = get();
        let seconds = state.workDuration * 60;
        if (state.mode === 'shortBreak') seconds = state.shortBreakDuration * 60;
        if (state.mode === 'longBreak') seconds = state.longBreakDuration * 60;
        set({ timeLeft: seconds, isActive: false });
      },

      skipMode: () => {
        const state = get();
        if (state.mode === 'work') {
          const nextCycles = state.completedCycles + 1;
          const nextMode: PomodoroMode = nextCycles % 4 === 0 ? 'longBreak' : 'shortBreak';
          const seconds = (nextMode === 'longBreak' ? state.longBreakDuration : state.shortBreakDuration) * 60;
          set({ mode: nextMode, timeLeft: seconds, isActive: false, completedCycles: nextCycles });
        } else {
          set({ mode: 'work', timeLeft: state.workDuration * 60, isActive: false });
        }
      },

      tick: () => {
        const state = get();
        if (!state.isActive) return false;

        if (state.timeLeft <= 1) {
          if (state.mode === 'work') {
            const nextCycles = state.completedCycles + 1;
            const nextMode: PomodoroMode = nextCycles % 4 === 0 ? 'longBreak' : 'shortBreak';
            const seconds = (nextMode === 'longBreak' ? state.longBreakDuration : state.shortBreakDuration) * 60;
            set({ mode: nextMode, timeLeft: seconds, isActive: false, completedCycles: nextCycles });
          } else {
            set({ mode: 'work', timeLeft: state.workDuration * 60, isActive: false });
          }
          return true; // Finished cycle!
        }

        set({ timeLeft: state.timeLeft - 1 });
        return false;
      },

      setDurations: (work, shortBreak, longBreak) => {
        set({ workDuration: work, shortBreakDuration: shortBreak, longBreakDuration: longBreak });
      },
    }),
    {
      name: 'apexa_mobile_pomodoro',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        completedCycles: state.completedCycles,
        workDuration: state.workDuration,
        shortBreakDuration: state.shortBreakDuration,
        longBreakDuration: state.longBreakDuration,
        targetTaskId: state.targetTaskId,
      }),
    }
  )
);
