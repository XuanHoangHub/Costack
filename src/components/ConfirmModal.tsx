"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDestructive = true,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop with smooth blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
              className="absolute inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Glass Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-6 text-left overflow-hidden z-10 font-sans"
            >
              {/* Top Accent Gradient Bar */}
              <div 
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isDestructive 
                    ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600' 
                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                }`} 
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 pt-1">
                {/* Icon Wrapper */}
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border relative ${
                    isDestructive 
                      ? 'bg-gradient-to-tr from-rose-500/15 via-pink-500/10 to-rose-500/20 text-rose-500 border-rose-200/60 dark:border-rose-800/50 shadow-[0_4px_20px_rgba(244,63,94,0.22)]' 
                      : 'bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/20 text-indigo-500 border-indigo-200/60 dark:border-indigo-800/50 shadow-[0_4px_20px_rgba(99,102,241,0.22)]'
                  }`}
                >
                  {isDestructive ? (
                    <AlertTriangle className="w-6 h-6 shrink-0 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 space-y-1.5 pr-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                    {title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-150/60 dark:border-slate-800/70">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none active:scale-95"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white transition-all cursor-pointer select-none shadow-md active:scale-95 flex items-center gap-1.5 ${
                    isDestructive
                      ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-rose-500/25 hover:shadow-rose-500/40'
                      : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-indigo-600/25 hover:shadow-indigo-600/40'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
