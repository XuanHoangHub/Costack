import { create } from 'zustand';

interface GlobalTimerState {
  activeTimerTaskId: string | null;
  activeTimerElapsed: number;
  isTimerPaused: boolean;
  setActiveTimerTaskId: (taskId: string | null) => void;
  setActiveTimerElapsed: (elapsed: number | ((prev: number) => number)) => void;
  setIsTimerPaused: (paused: boolean | ((prev: boolean) => boolean)) => void;
  resetTimer: () => void;
}

export const useGlobalTimerStore = create<GlobalTimerState>((set) => ({
  activeTimerTaskId: null,
  activeTimerElapsed: 0,
  isTimerPaused: false,
  setActiveTimerTaskId: (taskId) => set({ activeTimerTaskId: taskId }),
  setActiveTimerElapsed: (elapsed) =>
    set((state) => ({
      activeTimerElapsed: typeof elapsed === 'function' ? elapsed(state.activeTimerElapsed) : elapsed,
    })),
  setIsTimerPaused: (paused) =>
    set((state) => ({
      isTimerPaused: typeof paused === 'function' ? paused(state.isTimerPaused) : paused,
    })),
  resetTimer: () => set({ activeTimerTaskId: null, activeTimerElapsed: 0, isTimerPaused: false }),
}));

export function formatTimerDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
