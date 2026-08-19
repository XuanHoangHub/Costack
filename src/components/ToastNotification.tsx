"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, UserPlus, Calendar, MessageSquare, X, CheckCircle, Info, AlertTriangle, ArrowRight 
} from 'lucide-react';

export interface Toast {
  id: string;
  type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message';
  title: string;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function ToastNotification({ toasts, onClose }: ToastNotificationProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
  key?: string;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onClose]);

  // Styling based on toast category
  const getTheme = () => {
    switch (toast.type) {
      case 'assignment':
        return {
          icon: <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
          accentClass: 'bg-indigo-600 dark:bg-indigo-500',
          bgClass: 'border-indigo-100/50 shadow-blue-500/10 dark:border-indigo-500/20 dark:shadow-blue-500/20'
        };
      case 'deadline':
        return {
          icon: <Calendar className="w-5 h-5 text-rose-500 dark:text-rose-400 animate-pulse" />,
          accentClass: 'bg-rose-500 dark:bg-rose-400',
          bgClass: 'border-rose-100/50 shadow-rose-500/10 dark:border-rose-500/20 dark:shadow-rose-500/20'
        };
      case 'comment':
        return {
          icon: <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
          accentClass: 'bg-purple-600 dark:bg-purple-500',
          bgClass: 'border-purple-100/50 shadow-purple-500/10 dark:border-purple-500/20 dark:shadow-purple-500/20'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          accentClass: 'bg-emerald-500 dark:bg-emerald-400',
          bgClass: 'border-emerald-100/50 shadow-emerald-500/10 dark:border-emerald-500/20 dark:shadow-emerald-500/20'
        };
      case 'chat_message':
        return {
          icon: <MessageSquare className="w-5 h-5 text-sky-500 dark:text-sky-400" />,
          accentClass: 'bg-sky-500 dark:bg-sky-400',
          bgClass: 'border-sky-100/50 shadow-sky-500/10 dark:border-sky-500/20 dark:shadow-sky-500/20'
        };
      case 'message':
        return {
          icon: <MessageSquare className="w-5 h-5 text-pink-500 dark:text-pink-400" />,
          accentClass: 'bg-pink-500 dark:bg-pink-400',
          bgClass: 'border-pink-100/50 shadow-pink-500/10 dark:border-pink-500/20 dark:shadow-pink-500/20'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-slate-500 dark:text-slate-400" />,
          accentClass: 'bg-slate-500 dark:bg-slate-400',
          bgClass: 'border-slate-200/50 shadow-slate-500/10 dark:border-slate-700/50 dark:shadow-slate-500/10'
        };
    }
  };

  const theme = getTheme();

  return (
    <motion.div
      id={`toast_${toast.id}`}
      layout
      initial={{ opacity: 0, y: -20, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, x: 100, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
      className={`pointer-events-auto relative w-full md:w-85 liquid-glass p-4.5 rounded-2xl flex items-start gap-4 overflow-hidden ${theme.bgClass}`}
    >
      {/* Dynamic Left accent bar indicator */}
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accentClass}`} />

      {/* Primary Category Graphic Icon Circle */}
      <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-950/40 border border-white/60 dark:border-slate-800/60 shadow-sm flex items-center justify-center shrink-0">
        {theme.icon}
      </div>

      <div className="flex-1 min-w-0 pr-4 mt-0.5">
        <h4 className="font-display font-extrabold text-slate-800 dark:text-slate-100 text-[13px] tracking-tight mb-1 truncate">
          {toast.title}
        </h4>
        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-snug break-words">
          {toast.message}
        </p>
      </div>

      {/* Manual close controller icon */}
      <button
        id={`btn_close_toast_${toast.id}`}
        onClick={() => onClose(toast.id)}
        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 absolute right-3 top-3 p-1 rounded-full hover:bg-slate-150 transition-colors cursor-pointer"
        title="Đóng thông báo"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Visual active countdown timer slide bar on footer */}
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.8 ${theme.accentClass}`}
      />
    </motion.div>
  );
}
