import { create } from 'zustand';

export type PomodoroMode = 'focus' | 'break';

interface PomodoroState {
  isRunning: boolean;
  timeLeft: number; // in seconds
  mode: PomodoroMode;
  sessionsCompleted: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMode: (mode: PomodoroMode) => void;
  tick: () => void;
}

const FOCUS_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  isRunning: false,
  timeLeft: FOCUS_TIME,
  mode: 'focus',
  sessionsCompleted: 4,

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () =>
    set((state) => ({
      isRunning: false,
      timeLeft: state.mode === 'focus' ? FOCUS_TIME : BREAK_TIME,
    })),
  setMode: (mode) =>
    set({
      mode,
      isRunning: false,
      timeLeft: mode === 'focus' ? FOCUS_TIME : BREAK_TIME,
    }),
  tick: () => {
    const { timeLeft, mode, sessionsCompleted } = get();
    if (timeLeft > 1) {
      set({ timeLeft: timeLeft - 1 });
    } else {
      // Completed session
      if (mode === 'focus') {
        set({
          mode: 'break',
          timeLeft: BREAK_TIME,
          isRunning: false,
          sessionsCompleted: sessionsCompleted + 1,
        });
      } else {
        set({
          mode: 'focus',
          timeLeft: FOCUS_TIME,
          isRunning: false,
        });
      }
    }
  },
}));
