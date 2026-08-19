"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, AlertCircle, Sparkles,
  CheckSquare, ListPlus, FileText, Brain, 
  RefreshCw, Edit3, Tag, Plus, Layers, LayoutGrid
} from 'lucide-react';

import { useTranslation } from '../contexts/TranslationContext';

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="relative w-full max-w-[440px] rounded-[28px] bg-white/95 dark:bg-[#0c101c]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] p-5 sm:p-6 overflow-hidden z-10 text-left font-sans select-none"
          >
            {/* Ambient Radial Glow */}
            <div className={`absolute -top-24 -right-24 w-52 h-52 bg-gradient-to-br ${typeConfig.gradient} opacity-20 rounded-full blur-3xl pointer-events-none transition-all duration-500`} />

            {/* Header */}
            <div className="flex items-start justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${typeConfig.gradient} text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 transition-all duration-300`}>
                  {icon || <IconComponent className="w-5 h-5 drop-shadow-xs" />}
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight leading-snug">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                    className={`w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-2xl border ${
                      error 
                        ? 'border-rose-500 dark:border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200' 
                        : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-850/80 text-slate-900 dark:text-slate-100'
                    } placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 ${typeConfig.ring} shadow-3xs`}
                  />
                  {value && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('');
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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

              {/* Optional Secondary Input (e.g. for Options in dropdown custom field) */}
              {showSecondaryInput && (
                <div className="space-y-1.5 pt-1">
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
                    className="w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-850/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:border-indigo-500 focus:ring-indigo-500/20 shadow-3xs"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
                >
                  {effectiveCancelText}
                </button>
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className={`group px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${typeConfig.gradient} hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{effectiveConfirmText}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
