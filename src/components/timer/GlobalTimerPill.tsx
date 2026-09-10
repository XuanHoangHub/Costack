"use client";

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Clock } from 'lucide-react';
import { Task } from '@/types';
import { useGlobalTimerStore, formatTimerDuration } from '@/store/globalTimerStore';

interface GlobalTimerPillProps {
  tasks: Task[];
  onStop: () => void;
  onTogglePause: () => void;
}

export const GlobalTimerPill = memo(function GlobalTimerPill({
  tasks,
  onStop,
  onTogglePause,
}: GlobalTimerPillProps) {
  const activeTimerTaskId = useGlobalTimerStore((s) => s.activeTimerTaskId);
  const activeTimerElapsed = useGlobalTimerStore((s) => s.activeTimerElapsed);
  const isTimerPaused = useGlobalTimerStore((s) => s.isTimerPaused);
  const setActiveTimerElapsed = useGlobalTimerStore((s) => s.setActiveTimerElapsed);

  // Interval runs ONLY while a timer is active and not paused
  React.useEffect(() => {
    if (!activeTimerTaskId || isTimerPaused) return;
    const interval = setInterval(() => {
      setActiveTimerElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimerTaskId, isTimerPaused, setActiveTimerElapsed]);

  if (!activeTimerTaskId) return null;

  const timedTask = tasks.find((t) => t.id === activeTimerTaskId);
  if (!timedTask) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[80] font-sans flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 shadow-2xl px-4 py-2.5 rounded-2xl select-none pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 ${isTimerPaused ? '' : 'animate-ping'}`} />
          <div className="flex flex-col text-left max-w-[140px] truncate">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
              Đang theo dõi thời gian
            </span>
            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate mt-0.5" title={timedTask.title}>
              {timedTask.title}
            </span>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800" />

        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 tabular-nums">
          {formatTimerDuration(activeTimerElapsed)}
        </span>

        <div className="flex items-center gap-1">
          {/* Pause/Resume Button */}
          <button
            type="button"
            onClick={onTogglePause}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer transition-colors"
            title={isTimerPaused ? 'Resume' : 'Pause'}
          >
            {isTimerPaused ? <Play className="w-3.5 h-3.5 fill-current text-indigo-500" /> : <Pause className="w-3.5 h-3.5 fill-current text-indigo-500" />}
          </button>

          {/* Stop Button */}
          <button
            type="button"
            onClick={onStop}
            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-colors"
            title="Dừng và ghi nhận thời gian"
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default GlobalTimerPill;
