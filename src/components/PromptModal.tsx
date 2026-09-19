"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, AlertCircle, Sparkles,
  CheckSquare, ListPlus, FileText, Brain, 
  RefreshCw, Edit3, Tag, Plus, Layers, LayoutGrid
} from 'lucide-react';

import { useTranslation } from '../contexts/TranslationContext';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export type PromptModalType = 
  | 'task' 
  | 'list' 
  | 'sprint' 
  | 'doc' 
  | 'whiteboard' 
  | 'rename' 
  | 'subtask' 
  | 'tag' 
  | 'view' 
  | 'status'
  | 'custom_field'
  | 'generic';

export interface PromptModalConfig {
  isOpen: boolean;
  type?: PromptModalType;
  title: string;
  subtitle?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  themeColor?: 'blue' | 'indigo' | 'violet' | 'amber' | 'rose' | 'emerald' | 'cyan' | 'slate';
  showSecondaryInput?: boolean;
  secondaryLabel?: string;
  secondaryPlaceholder?: string;
  secondaryDefaultValue?: string;
  onConfirm: (value: string, secondaryValue?: string) => void;
  onCancel?: () => void;
}

const TYPE_CONFIRM_TEXTS: Record<PromptModalType, { vi: string; en: string }> = {
  task: { vi: 'Tạo công việc', en: 'Create Task' },
  list: { vi: 'Tạo danh sách', en: 'Create List' },
  sprint: { vi: 'Tạo Sprint', en: 'Create Sprint' },
  doc: { vi: 'Tạo tài liệu', en: 'Create Doc' },
  whiteboard: { vi: 'Tạo bảng trắng', en: 'Create Whiteboard' },
  rename: { vi: 'Lưu thay đổi', en: 'Save Changes' },
  subtask: { vi: 'Thêm việc phụ', en: 'Add Subtask' },
  tag: { vi: 'Thêm thẻ tag', en: 'Add Tag' },
  view: { vi: 'Tạo chế độ xem', en: 'Create View' },
  status: { vi: 'Thêm trạng thái', en: 'Add Status' },
  custom_field: { vi: 'Tạo trường dữ liệu', en: 'Create Field' },
  generic: { vi: 'Xác nhận', en: 'Confirm' }
};

const TYPE_CONFIGS: Record<PromptModalType, {
  icon: typeof CheckSquare;
  gradient: string;
  bgBadge: string;
  textBadge: string;
  ring: string;
}> = {
  task: {
    icon: CheckSquare,
    gradient: 'from-blue-600 via-sky-500 to-cyan-400',
    bgBadge: 'bg-blue-500/10 dark:bg-blue-500/20',
    textBadge: 'text-blue-600 dark:text-blue-400',
    ring: 'focus:border-blue-500 focus:ring-blue-500/20'
  },
  list: {
    icon: ListPlus,
    gradient: 'from-indigo-600 via-indigo-500 to-purple-500',
    bgBadge: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    textBadge: 'text-indigo-600 dark:text-indigo-400',
    ring: 'focus:border-indigo-500 focus:ring-indigo-500/20'
  },
  sprint: {
    icon: RefreshCw,
    gradient: 'from-amber-500 via-orange-500 to-yellow-400',
    bgBadge: 'bg-amber-500/10 dark:bg-amber-500/20',
    textBadge: 'text-amber-600 dark:text-amber-400',
    ring: 'focus:border-amber-500 focus:ring-amber-500/20'
  },
  doc: {
    icon: FileText,
    gradient: 'from-purple-600 via-violet-500 to-fuchsia-500',
    bgBadge: 'bg-purple-500/10 dark:bg-purple-500/20',
    textBadge: 'text-purple-600 dark:text-purple-400',
    ring: 'focus:border-purple-500 focus:ring-purple-500/20'
  },
  whiteboard: {
    icon: Brain,
    gradient: 'from-orange-500 via-rose-500 to-amber-500',
    bgBadge: 'bg-orange-500/10 dark:bg-orange-500/20',
    textBadge: 'text-orange-600 dark:text-orange-400',
    ring: 'focus:border-orange-500 focus:ring-orange-500/20'
  },
  rename: {
    icon: Edit3,
    gradient: 'from-blue-600 via-indigo-500 to-purple-500',
    bgBadge: 'bg-blue-500/10 dark:bg-blue-500/20',
    textBadge: 'text-blue-600 dark:text-blue-400',
    ring: 'focus:border-blue-500 focus:ring-blue-500/20'
  },
  subtask: {
    icon: CheckSquare,
    gradient: 'from-teal-600 via-emerald-500 to-cyan-500',
    bgBadge: 'bg-teal-500/10 dark:bg-teal-500/20',
    textBadge: 'text-teal-600 dark:text-teal-400',
    ring: 'focus:border-teal-500 focus:ring-teal-500/20'
  },
  tag: {
    icon: Tag,
    gradient: 'from-pink-500 via-rose-500 to-orange-400',
    bgBadge: 'bg-pink-500/10 dark:bg-pink-500/20',
    textBadge: 'text-pink-600 dark:text-pink-400',
    ring: 'focus:border-pink-500 focus:ring-pink-500/20'
  },
  view: {
    icon: LayoutGrid,
    gradient: 'from-indigo-500 via-blue-500 to-sky-400',
    bgBadge: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    textBadge: 'text-indigo-600 dark:text-indigo-400',
    ring: 'focus:border-indigo-500 focus:ring-indigo-500/20'
  },
  status: {
    icon: Layers,
    gradient: 'from-cyan-500 via-sky-500 to-blue-500',
    bgBadge: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    textBadge: 'text-cyan-600 dark:text-cyan-400',
    ring: 'focus:border-cyan-500 focus:ring-cyan-500/20'
  },
  custom_field: {
    icon: Plus,
    gradient: 'from-violet-600 via-purple-500 to-indigo-500',
    bgBadge: 'bg-violet-500/10 dark:bg-violet-500/20',
    textBadge: 'text-violet-600 dark:text-violet-400',
    ring: 'focus:border-violet-500 focus:ring-violet-500/20'
  },
  generic: {
    icon: Sparkles,
    gradient: 'from-blue-600 via-indigo-500 to-purple-500',
    bgBadge: 'bg-slate-500/10 dark:bg-slate-500/20',
    textBadge: 'text-slate-700 dark:text-slate-300',
    ring: 'focus:border-blue-500 focus:ring-blue-500/20'
  }
};

export default function PromptModal({
  isOpen,
  type = 'generic',
  title,
  subtitle,
  placeholder,
  defaultValue = '',
  confirmText,
  cancelText,
  icon,
  showSecondaryInput = false,
  secondaryLabel,
  secondaryPlaceholder,
  secondaryDefaultValue = '',
  onConfirm,
  onCancel
}: PromptModalConfig) {
  const { isVietnamese } = useTranslation();
  const effectiveConfirmText = confirmText || (isVietnamese ? TYPE_CONFIRM_TEXTS[type]?.vi : TYPE_CONFIRM_TEXTS[type]?.en) || (isVietnamese ? 'Xác nhận' : 'Confirm');
  const effectiveCancelText = cancelText || (isVietnamese ? 'Hủy' : 'Cancel');
  const [value, setValue] = useState(defaultValue);
  const [secondaryValue, setSecondaryValue] = useState(secondaryDefaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const typeConfig = TYPE_CONFIGS[type] || TYPE_CONFIGS.generic;
  const IconComponent = typeConfig.icon;

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setSecondaryValue(secondaryDefaultValue);
      setError(null);
      // Auto focus with slight delay to ensure smooth transition
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultValue, secondaryDefaultValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!value.trim()) {
      setError('Vui lòng nhập nội dung');
      inputRef.current?.focus();
      return;
    }
    onConfirm(value.trim(), showSecondaryInput ? secondaryValue.trim() : undefined);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="prompt-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            {/* Backdrop with Apple-standard Blur */}
            <motion.div
              key="prompt-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCancel}
              className="absolute inset-0 modal-backdrop bg-black/40 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Container */}
            <motion.div
              key="prompt-modal-card"
              initial={{ scale: 0.94, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 14, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-[440px] rounded-xl bg-white dark:bg-[#0a0b10] border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] p-5 sm:p-6 z-10 text-left font-sans select-none"
            >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0071E3] dark:text-[#0A84FF] border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
                  {icon || <IconComponent className="w-4.5 h-4.5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-1">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    required
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={placeholder || 'Nhập tiêu đề hoặc tên...'}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-lg border ${
                      error 
                        ? 'border-rose-500 dark:border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200' 
                        : 'border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#0d0f15] text-slate-900 dark:text-slate-100'
                    } placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-[#0a0b10] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs`}
                  />
                  {value && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('');
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500 dark:text-rose-400 px-1 pt-0.5"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Optional Secondary Input */}
              {showSecondaryInput && (
                <div className="space-y-1 pt-0.5">
                  {secondaryLabel && (
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {secondaryLabel}
                    </label>
                  )}
                  <input
                    type="text"
                    value={secondaryValue}
                    onChange={(e) => setSecondaryValue(e.target.value)}
                    placeholder={secondaryPlaceholder || 'Nhập các tùy chọn, phân cách bởi dấu phẩy...'}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#0d0f15] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-[#0a0b10] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer active:scale-95"
                >
                  {effectiveCancelText}
                </button>
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] dark:hover:bg-[#0071E3] transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{effectiveConfirmText}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
