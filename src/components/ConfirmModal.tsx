"use client";

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, X, Trash2, CheckCircle2, ShieldAlert, 
  Folder, List, CheckSquare, FileText, Brain, LayoutGrid, SlidersHorizontal, CornerDownLeft
} from 'lucide-react';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

import { useTranslation } from '../contexts/TranslationContext';

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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop with smooth blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCancel}
              className="absolute inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Glass Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative w-[min(95vw,480px)] max-sm:w-full max-sm:mx-2 max-h-[90dvh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] rounded-[28px] p-5 sm:p-6 md:p-7 text-left z-10 font-sans select-none ring-1 ring-black/5 dark:ring-white/10"
            >
              {/* Subtle Decorative Ambient Glow */}
              <div 
                className={`absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
                  resolvedIsDestructive 
                    ? 'bg-rose-500/20 dark:bg-rose-500/15' 
                    : 'bg-indigo-500/20 dark:bg-indigo-500/15'
                }`} 
              />
              <div 
                className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                  resolvedIsDestructive 
                    ? 'bg-red-500/10 dark:bg-red-500/10' 
                    : 'bg-cyan-500/10 dark:bg-cyan-500/10'
                }`} 
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              </button>

              <div className="flex items-start gap-4 pr-8">
                {/* Modern Icon Badge with Glow Ring */}
                <div className="relative shrink-0">
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md relative z-10 transition-transform group-hover:scale-105 ${
                      resolvedIsDestructive 
                        ? 'bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/80 shadow-rose-500/10' 
                        : 'bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-cyan-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/80 shadow-indigo-500/10'
                    }`}
                  >
                    {resolvedIsDestructive ? (
                      <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                    )}
                  </div>
                  {resolvedIsDestructive && (
                    <div className="absolute inset-0 rounded-2xl bg-rose-500/20 blur-md -z-0 animate-pulse" />
                  )}
                </div>

                {/* Text Header */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                      {title}
                    </h3>
                  </div>

                  {resolvedIsDestructive && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                      <ShieldAlert className="w-3 h-3" />
                      Không thể hoàn tác
                    </span>
                  )}
                </div>
              </div>

              {/* Item Preview Callout (if item name exists) */}
              {detectedInfo.name ? (
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-3xs">
                      {getItemIcon()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {isVietnamese ? 'Đối tượng bị xóa' : 'Target to delete'}
                      </div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate" title={detectedInfo.name}>
                        {detectedInfo.name}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    {description.replace(/["“][^"”]+["”]/, '').trim() || (isVietnamese ? 'Tất cả công việc và dữ liệu liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống.' : 'All associated tasks and data will be permanently deleted from the system.')}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mt-3 px-0.5">
                  {description}
                </p>
              )}

              {/* Actions Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                {/* Cancel Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onCancel}
                  className="px-4.5 py-2.5 min-h-[44px] rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-750 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer select-none shadow-3xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <span>{effectiveCancelText}</span>
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60">
                    Esc
                  </span>
                </motion.button>

                {/* Confirm Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onConfirm}
                  className={`group px-5 py-2.5 min-h-[44px] rounded-2xl text-xs font-black text-white transition-all cursor-pointer select-none flex items-center justify-center gap-2 shadow-lg relative overflow-hidden w-full sm:w-auto ${
                    resolvedIsDestructive
                      ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/25 hover:shadow-rose-500/40 border border-rose-400/30'
                      : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/25 hover:shadow-indigo-500/40 border border-indigo-400/30'
                  }`}
                >
                  {/* Subtle Top-Highlight Reflection */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-white/25 pointer-events-none" />

                  {resolvedIsDestructive ? (
                    <Trash2 className="w-4 h-4 stroke-[2.5] transition-transform group-hover:scale-110 group-hover:-rotate-6 duration-200" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{effectiveConfirmText}</span>

                  <span className="hidden sm:flex text-[10px] text-white/80 font-mono font-bold px-1.5 py-0.5 rounded bg-white/20 ml-0.5 items-center gap-0.5">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    Enter
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
