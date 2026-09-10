"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RotateCcw, SkipForward, Bell, BellOff,
  Flame, CheckCircle2, Coffee, Sparkles, Target, Settings2,
  Volume2, VolumeX, ListTodo
} from 'lucide-react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task } from '@/types';

interface PomodoroMiniAppProps {
  tasks?: Task[];
  onOpenTask?: (taskId: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function PomodoroMiniApp({ tasks = [], onOpenTask, triggerToast }: PomodoroMiniAppProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const {
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    pomodoroMode,
    pomodoroTime,
    pomodoroActive,
    setPomodoroMode,
    setPomodoroTime,
    setPomodoroActive,
    setWorkDuration,
    setShortBreakDuration,
    setLongBreakDuration,
  } = usePomodoroStore();

  const [completedSessions, setCompletedSessions] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [focusGoal, setFocusGoal] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Timer tick interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoroActive) {
      interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            // Finished current session
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroActive, pomodoroMode]);

  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // AudioContext unavailable or blocked
    }
  };

  const handleSessionComplete = () => {
    setPomodoroActive(false);
    playChime();

    if (pomodoroMode === 'work') {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      triggerToast?.(
        'success',
        isVi ? 'Hoàn thành phiên làm việc!' : 'Work session complete!',
        isVi ? `Tuyệt vời! Bạn đã hoàn thành ${newCount} phiên tập trung.` : `Great job! You finished ${newCount} focus sessions.`
      );

      // Auto cycle: after 4 work sessions, offer long break, else short break
      if (newCount % 4 === 0) {
        setPomodoroMode('long');
        setPomodoroTime(longBreakDuration * 60);
      } else {
        setPomodoroMode('short');
        setPomodoroTime(shortBreakDuration * 60);
      }
    } else {
      triggerToast?.(
        'info',
        isVi ? 'Hết giờ giải lao' : 'Break ended',
        isVi ? 'Sẵn sàng cho phiên tập trung tiếp theo chưa?' : 'Ready for the next focus session?'
      );
      setPomodoroMode('work');
      setPomodoroTime(workDuration * 60);
    }
  };

  const switchMode = (mode: 'work' | 'short' | 'long') => {
    setPomodoroActive(false);
    setPomodoroMode(mode);
    if (mode === 'work') setPomodoroTime(workDuration * 60);
    else if (mode === 'short') setPomodoroTime(shortBreakDuration * 60);
    else setPomodoroTime(longBreakDuration * 60);
  };

  const resetCurrentMode = () => {
    setPomodoroActive(false);
    if (pomodoroMode === 'work') setPomodoroTime(workDuration * 60);
    else if (pomodoroMode === 'short') setPomodoroTime(shortBreakDuration * 60);
    else setPomodoroTime(longBreakDuration * 60);
  };

  // Progress percentage
  const totalDurationSeconds =
    pomodoroMode === 'work'
      ? workDuration * 60
      : pomodoroMode === 'short'
      ? shortBreakDuration * 60
      : longBreakDuration * 60;
  const progress = Math.max(0, Math.min(100, ((totalDurationSeconds - pomodoroTime) / totalDurationSeconds) * 100));

  const minutes = Math.floor(pomodoroTime / 60);
  const seconds = pomodoroTime % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 max-w-4xl mx-auto overflow-y-auto custom-scrollbar">
      {/* Top Banner Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <span className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-rose-500/25">
              ⏱️
            </span>
            {isVi ? 'Đồng hồ Pomodoro' : 'Pomodoro Focus Timer'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            {isVi
              ? 'Tập trung sâu 25 phút, nghỉ ngơi khoa học để tối ưu hiệu suất làm việc'
              : 'Deep work intervals with structured breaks for peak productivity'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'
                : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/[0.04] dark:text-zinc-500 dark:border-white/10'
            }`}
            title={soundEnabled ? (isVi ? 'Tắt âm thanh' : 'Mute sound') : (isVi ? 'Bật âm thanh' : 'Unmute sound')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              showSettings
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/[0.04] dark:text-zinc-300 dark:border-white/10 hover:bg-slate-200/70 dark:hover:bg-white/[0.08]'
            }`}
            title={isVi ? 'Tùy chỉnh thời gian' : 'Timer settings'}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Dropdown Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full overflow-hidden mb-6"
          >
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {isVi ? 'Làm việc (phút)' : 'Work (mins)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={workDuration}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 25);
                    setWorkDuration(val);
                    if (pomodoroMode === 'work' && !pomodoroActive) setPomodoroTime(val * 60);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {isVi ? 'Nghỉ ngắn (phút)' : 'Short break (mins)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={shortBreakDuration}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 5);
                    setShortBreakDuration(val);
                    if (pomodoroMode === 'short' && !pomodoroActive) setPomodoroTime(val * 60);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {isVi ? 'Nghỉ dài (phút)' : 'Long break (mins)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={longBreakDuration}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 15);
                    setLongBreakDuration(val);
                    if (pomodoroMode === 'long' && !pomodoroActive) setPomodoroTime(val * 60);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 mb-8 shadow-inner">
        <button
          type="button"
          onClick={() => switchMode('work')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            pomodoroMode === 'work'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" />
          {isVi ? 'Tập trung' : 'Focus'}
        </button>

        <button
          type="button"
          onClick={() => switchMode('short')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            pomodoroMode === 'short'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Coffee className="w-4 h-4" />
          {isVi ? 'Nghỉ ngắn' : 'Short Break'}
        </button>

        <button
          type="button"
          onClick={() => switchMode('long')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            pomodoroMode === 'long'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {isVi ? 'Nghỉ dài' : 'Long Break'}
        </button>
      </div>

      {/* Main Circular Countdown Display */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-4">
        {/* Outer Circular Progress Ring */}
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="5"
            className="text-slate-100 dark:text-white/[0.06]"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="5"
            strokeDasharray={263.89}
            strokeDashoffset={263.89 * (1 - progress / 100)}
            strokeLinecap="round"
            className={`transition-all duration-500 ${
              pomodoroMode === 'work'
                ? 'text-rose-500'
                : pomodoroMode === 'short'
                ? 'text-emerald-500'
                : 'text-indigo-500'
            }`}
          />
        </svg>

        {/* Center Timer Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">
            {formattedTime}
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-2">
            {pomodoroActive
              ? (isVi ? 'Đang chạy...' : 'Active')
              : (isVi ? 'Tạm dừng' : 'Paused')}
          </span>
          {completedSessions > 0 && (
            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-[11px] font-bold text-slate-600 dark:text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{completedSessions} {isVi ? 'phiên xong' : 'sessions'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Play / Pause / Reset Controls */}
      <div className="flex items-center gap-4 my-6">
        <button
          type="button"
          onClick={resetCurrentMode}
          className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/80 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          title={isVi ? 'Đặt lại bộ đếm' : 'Reset timer'}
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setPomodoroActive(!pomodoroActive)}
          className={`flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-2xl text-white font-extrabold text-base sm:text-lg transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
            pomodoroActive
              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
              : pomodoroMode === 'work'
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
              : pomodoroMode === 'short'
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
              : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30'
          }`}
        >
          {pomodoroActive ? (
            <>
              <Pause className="w-6 h-6 fill-current" />
              {isVi ? 'Tạm dừng' : 'Pause'}
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              {isVi ? 'Bắt đầu' : 'Start'}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSessionComplete}
          className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/80 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          title={isVi ? 'Bỏ qua / Hoàn thành phiên này' : 'Skip / Finish session'}
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Task & Goal Integration Widget */}
      <div className="w-full max-w-lg mt-4 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-rose-500" />
            {isVi ? 'Mục tiêu phiên tập trung' : 'Session focus goal'}
          </span>
          {selectedTask && (
            <button
              type="button"
              onClick={() => onOpenTask?.(selectedTask.id)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              {isVi ? 'Xem chi tiết việc' : 'View task'}
            </button>
          )}
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-2">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">{isVi ? '-- Chọn một công việc để hoàn thành --' : '-- Choose a task to work on --'}</option>
              {tasks.slice(0, 20).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input
            type="text"
            value={focusGoal}
            onChange={(e) => setFocusGoal(e.target.value)}
            placeholder={isVi ? 'Ví dụ: Viết xong bản đề xuất kế hoạch quý 3...' : 'e.g., Finish drafting Q3 strategy deck...'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500"
          />
        )}
      </div>
    </div>
  );
}
