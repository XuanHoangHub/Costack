"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-left overflow-hidden z-10 font-sans"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                {/* Icon Wrapper */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDestructive 
                    ? 'bg-rose-50 dark:bg-rose-955/30 text-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.1)]' 
                    : 'bg-indigo-50 dark:bg-indigo-955/30 text-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 space-y-1.5 pr-2">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
                    {title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-505 dark:text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-55 dark:hover:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-white transition-all cursor-pointer select-none shadow-md ${
                    isDestructive
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-650/10'
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
