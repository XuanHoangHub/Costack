"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smile, X, Check, Trash2, Sparkles } from 'lucide-react';
import { STATUS_PRESETS } from './types';

interface ProfileStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmoji: string;
  initialMessage: string;
  onSave: (emoji: string, message: string) => void;
  locale: string;
}

const COMMON_EMOJIS = ['💬', '⚡', '☕', '📞', '🏖️', '🚗', '🎧', '🎯', '🔥', '🚀', '💻', '💡'];

export const ProfileStatusModal: React.FC<ProfileStatusModalProps> = ({
  isOpen,
  onClose,
  initialEmoji,
  initialMessage,
  onSave,
  locale,
}) => {
  const [emoji, setEmoji] = useState(initialEmoji || '💬');
  const [message, setMessage] = useState(initialMessage || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(emoji.trim() || '💬', message.trim());
    onClose();
  };

  const handleClear = () => {
    setEmoji('💬');
    setMessage('');
    onSave('💬', '');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 text-left space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {locale === 'vi' ? 'Đặt trạng thái tùy chỉnh' : 'Set Custom Status'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {locale === 'vi' ? 'Hiển thị trên hồ sơ và danh sách thành viên' : 'Visible on profile & team members list'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status input form */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {locale === 'vi' ? 'Biểu tượng & Nội dung trạng thái' : 'Emoji & Status Text'}
            </label>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(-2))}
                  className="w-13 h-13 text-center text-2xl bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                  title={locale === 'vi' ? 'Chọn hoặc gõ emoji' : 'Emoji'}
                />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={locale === 'vi' ? 'Bạn đang làm gì? (vd: Đang code tính năng mới...)' : 'What are you working on?...'}
                  maxLength={60}
                  className="w-full text-xs font-bold px-4 py-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                  {message.length}/60
                </span>
              </div>
            </div>

            {/* Quick emoji palette */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto py-1">
              {COMMON_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all ${
                    emoji === em ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500' : ''
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{locale === 'vi' ? 'Gợi ý trạng thái nhanh' : 'Quick Presets'}</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {STATUS_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setEmoji(preset.emoji);
                    setMessage(locale === 'vi' ? preset.textVi : preset.textEn);
                  }}
                  className="p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 hover:scale-[1.01]"
                >
                  <span className="text-base shrink-0">{preset.emoji}</span>
                  <span className="truncate">{locale === 'vi' ? preset.textVi : preset.textEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Xóa trạng thái' : 'Clear status'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {locale === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{locale === 'vi' ? 'Áp dụng' : 'Apply'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
