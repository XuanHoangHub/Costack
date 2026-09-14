"use client";

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, X, Trash2, CheckCircle2,
  Folder, List, CheckSquare, FileText, Brain, LayoutGrid, SlidersHorizontal, CornerDownLeft
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../contexts/TranslationContext';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName?: string;
  itemType?: 'space' | 'folder' | 'list' | 'task' | 'doc' | 'whiteboard' | 'custom_field' | 'view' | 'generic';
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  itemName,
  itemType,
  confirmText,
  cancelText,
  isDestructive = true,
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const { isVietnamese } = useTranslation();
  const effectiveConfirmText = confirmText || (isVietnamese ? 'Xác nhận' : 'Confirm');
  const effectiveCancelText = cancelText || (isVietnamese ? 'Hủy' : 'Cancel');

  // Listen for Enter and Escape keys
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  // Extract item name from quotes if not explicitly provided
  const detectedInfo = useMemo(() => {
    let name = itemName;
    if (!name) {
      const match = description.match(/["“]([^"”]+)["”]/);
      if (match) name = match[1];
    }

    let detectedType = itemType;
    if (!detectedType) {
      const lower = (title + ' ' + description).toLowerCase();
      if (lower.includes('không gian') || lower.includes('space')) detectedType = 'space';
      else if (lower.includes('thư mục') || lower.includes('folder')) detectedType = 'folder';
      else if (lower.includes('danh sách') || lower.includes('list')) detectedType = 'list';
      else if (lower.includes('công việc') || lower.includes('task')) detectedType = 'task';
      else if (lower.includes('tài liệu') || lower.includes('doc')) detectedType = 'doc';
      else if (lower.includes('bảng trắng') || lower.includes('whiteboard')) detectedType = 'whiteboard';
      else if (lower.includes('trường') || lower.includes('field')) detectedType = 'custom_field';
      else if (lower.includes('chế độ xem') || lower.includes('view')) detectedType = 'view';
      else detectedType = 'generic';
    }

    return { name, type: detectedType };
  }, [description, itemName, itemType, title]);

  const resolvedIsDestructive = isDestructive ?? (type === 'danger');

  // Helper icon for detected type
  const getItemIcon = () => {
    switch (detectedInfo.type) {
      case 'space': return <LayoutGrid className="w-4 h-4 text-purple-500" />;
      case 'folder': return <Folder className="w-4 h-4 text-amber-500" />;
      case 'list': return <List className="w-4 h-4 text-sky-500" />;
      case 'task': return <CheckSquare className="w-4 h-4 text-indigo-500" />;
      case 'doc': return <FileText className="w-4 h-4 text-rose-500" />;
      case 'whiteboard': return <Brain className="w-4 h-4 text-orange-500" />;
      case 'custom_field': return <SlidersHorizontal className="w-4 h-4 text-emerald-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    }
  };

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
              transition={{ duration: 0.15 }}
              onClick={onCancel}
              className="absolute inset-0 modal-backdrop bg-black/25 dark:bg-black/60 cursor-pointer"
            />

            {/* Modal Card Container */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-[420px] bg-white dark:bg-[#111218] border border-slate-200/90 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.65)] rounded-2xl p-5 sm:p-6 text-left z-10 font-sans select-none overflow-hidden"
            >
              {/* Top Row: Icon + Title + Close Button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Clean Icon Badge */}
                  <div 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform ${
                      resolvedIsDestructive 
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50 shadow-3xs' 
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-900/50 shadow-3xs'
                    }`}
                  >
                    {resolvedIsDestructive ? (
                      <AlertTriangle className="w-4.5 h-4.5 stroke-[2.2]" />
                    ) : (
                      <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.2]" />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug break-words text-balance min-w-0">
                    {title}
                  </h3>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer shrink-0 -mt-1 -mr-1"
                  title="Đóng (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description Body */}
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mt-3 break-words text-pretty">
                {description}
              </p>

              {/* Target Item Callout (if specific item is targeted) */}
              {detectedInfo.name && (
                <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#161822] border border-slate-200/80 dark:border-white/10 flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-3xs">
                    {getItemIcon()}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1" title={detectedInfo.name}>
                    {detectedInfo.name}
                  </span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-100 dark:border-white/10">
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161822] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1f2230] transition-colors cursor-pointer select-none shadow-3xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span className="whitespace-nowrap">{effectiveCancelText}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 whitespace-nowrap">
                    Esc
                  </span>
                </button>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer select-none flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 ${
                    resolvedIsDestructive
                      ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 shadow-rose-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-indigo-500/20'
                  }`}
                >
                  {resolvedIsDestructive ? (
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{effectiveConfirmText}</span>
                  <span className="text-[10px] text-white/80 font-mono font-bold px-1 py-0.2 rounded bg-white/20 flex items-center gap-0.5 whitespace-nowrap">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    Enter
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
