"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderPlus, X, Lock, Globe, ChevronDown, Check, ArrowRight, ShieldCheck
} from 'lucide-react';
import EmojiIconPicker from '../EmojiIconPicker';
import { useTranslation } from '@/contexts/TranslationContext';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface AddSpaceData {
  name: string;
  emoji: string;
  color: string;
  description: string;
  isPrivate: boolean;
  permission: string;
}

interface AddSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSpace: (data: AddSpaceData) => void;
  locale?: string;
}

const SPACE_COLORS = [
  { id: 'indigo', label: 'Indigo', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', accent: 'linear-gradient(90deg, #38bdf8, #2563eb, #6366f1)' },
  { id: 'purple', label: 'Tím', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', accent: 'linear-gradient(90deg, #c084fc, #8b5cf6, #6d28d9)' },
  { id: 'rose', label: 'Hồng', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', accent: 'linear-gradient(90deg, #fb7185, #e11d48, #be123c)' },
  { id: 'sky', label: 'Lam', gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)', accent: 'linear-gradient(90deg, #38bdf8, #0284c7, #0369a1)' },
  { id: 'emerald', label: 'Lục', gradient: 'linear-gradient(135deg, #10b981, #059669)', accent: 'linear-gradient(90deg, #34d399, #059669, #047857)' },
  { id: 'amber', label: 'Hổ phách', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', accent: 'linear-gradient(90deg, #fbbf24, #d97706, #b45309)' },
  { id: 'sunset', label: 'Cam', gradient: 'linear-gradient(135deg, #f97316, #ea580c)', accent: 'linear-gradient(90deg, #fb923c, #ea580c, #c2410c)' },
];

export default function AddSpaceModal({
  isOpen,
  onClose,
  onAddSpace,
  locale: propLocale,
}: AddSpaceModalProps) {
  const { t, locale: ctxLocale } = useTranslation();
  const locale = propLocale || ctxLocale;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [color, setColor] = useState('indigo');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [permission, setPermission] = useState('Full edit');
  const [showPermissionMenu, setShowPermissionMenu] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmoji('📦');
      setColor('indigo');
      setDescription('');
      setIsPrivate(false);
      setPermission('Full edit');
      setShowPermissionMenu(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeColorObj = SPACE_COLORS.find(c => c.id === color) || SPACE_COLORS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddSpace({
      name: name.trim(),
      emoji,
      color,
      description: description.trim(),
      isPrivate,
      permission,
    });
  };

  return (
    <Portal>
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowPermissionMenu(false);
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => {
              setShowPermissionMenu(false);
              onClose();
            }} 
            className="fixed inset-0 bg-slate-950/50 cursor-pointer" 
          />

          <motion.div 
            initial={{ scale: 0.95, y: 12, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="relative w-full max-w-[460px] max-h-[min(90vh,680px)] rounded-2xl bg-white dark:bg-[#111216] border border-slate-200/90 dark:border-white/[0.08] overflow-hidden z-10 text-left font-sans select-none shadow-2xl flex flex-col my-auto"
          >
            {/* Top Accent Light Line */}
            <div 
              className="h-1 w-full shrink-0 transition-all duration-300"
              style={{ background: activeColorObj.accent }}
            />

            {/* Modal Content - Scrollable to prevent overflow on small viewports */}
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 transition-all duration-300"
                      style={{ background: activeColorObj.gradient }}
                    >
                      <FolderPlus className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                        {t('createSpace') || (locale === 'vi' ? 'Tạo Không gian mới' : 'Create Space')}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                        {locale === 'vi' ? 'Không gian làm việc cho dự án và đội nhóm' : 'Workspaces & team project hubs'}
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setShowPermissionMenu(false);
                      onClose();
                    }} 
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    aria-label="Đóng cửa sổ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Space Name & Identity Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                      {t('spaceName') || (locale === 'vi' ? 'Tên Không gian' : 'Space Name')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="shrink-0">
                        <EmojiIconPicker
                          value={emoji || 'Package'}
                          onChange={setEmoji}
                        />
                      </div>
                      <input 
                        type="text" 
                        required 
                        autoFocus
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder={locale === 'vi' ? 'Ví dụ: Kỹ thuật, Marketing, HR, Vận hành...' : 'e.g. Engineering, Marketing, HR...'} 
                        className="flex-1 min-w-0 h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] focus:bg-white dark:focus:bg-black/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <input 
                      type="text" 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      placeholder={locale === 'vi' ? 'Mô tả ngắn về mục đích không gian này (không bắt buộc)...' : 'Brief description of this space (optional)...'} 
                      className="w-full h-8.5 px-3 text-[11px] font-medium rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] focus:bg-white dark:focus:bg-black/50 focus:border-blue-500 text-slate-800 dark:text-zinc-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/[0.06]">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      {locale === 'vi' ? 'Màu chủ đề' : 'Theme Color'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {SPACE_COLORS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColor(c.id)}
                          className={`w-5 h-5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                            color === c.id 
                              ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#111216] scale-110' 
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ background: c.gradient }}
                          title={c.label}
                        >
                          {color === c.id && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Privacy & Permissions Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-white/[0.06] flex items-center justify-center text-slate-600 dark:text-zinc-300 shrink-0">
                        {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                          {isPrivate 
                            ? (locale === 'vi' ? 'Không gian riêng tư' : 'Private Space') 
                            : (locale === 'vi' ? 'Không gian chung của nhóm' : 'Shared Workspace Space')}
                        </div>
                        <div className="text-[10.5px] font-medium text-slate-400 dark:text-zinc-500 truncate">
                          {isPrivate 
                            ? (locale === 'vi' ? 'Chỉ bạn và người được mời mới xem được' : 'Only invited members have access') 
                            : (locale === 'vi' ? 'Tất cả thành viên trong nhóm có thể truy cập' : 'All workspace members can access')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPrivate}
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isPrivate ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isPrivate ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {!isPrivate && (
                    <div className="relative pt-2 border-t border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                          {locale === 'vi' ? 'Quyền mặc định' : 'Default Permission'}
                        </span>
                        
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowPermissionMenu(!showPermissionMenu)}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3 text-blue-500" />
                            <span>
                              {permission === 'Full edit' 
                                ? (locale === 'vi' ? 'Toàn quyền chỉnh sửa' : 'Full edit') 
                                : permission === 'Edit task only' 
                                ? (locale === 'vi' ? 'Chỉ chỉnh sửa công việc' : 'Edit tasks only') 
                                : (locale === 'vi' ? 'Chỉ xem' : 'View only')}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {showPermissionMenu && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setShowPermissionMenu(false)} />
                              <div className="absolute right-0 top-full mt-1 w-48 p-1 rounded-xl bg-white dark:bg-[#1a1b22] border border-slate-200 dark:border-white/10 shadow-xl z-40 space-y-0.5">
                                {[
                                  { id: 'Full edit', label: locale === 'vi' ? 'Toàn quyền chỉnh sửa' : 'Full edit' },
                                  { id: 'Edit task only', label: locale === 'vi' ? 'Chỉ chỉnh sửa công việc' : 'Edit tasks only' },
                                  { id: 'View only', label: locale === 'vi' ? 'Chỉ xem' : 'View only' }
                                ].map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setPermission(p.id);
                                      setShowPermissionMenu(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                      permission === p.id 
                                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-300' 
                                        : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                                    }`}
                                  >
                                    <span>{p.label}</span>
                                    {permission === p.id && <Check className="w-3 h-3 text-blue-600 dark:text-sky-300" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:px-6 bg-slate-50/90 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                  <kbd className="inline-flex items-center justify-center h-4.5 px-1.5 text-[9.5px] font-mono font-semibold rounded bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-zinc-400 border border-slate-200/80 dark:border-white/10 shadow-xs">
                    ↵
                  </kbd>
                  <span>{locale === 'vi' ? 'để tạo' : 'to create'}</span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPermissionMenu(false);
                      onClose();
                    }}
                    className="h-8.5 px-3.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                  >
                    {t('cancel') || (locale === 'vi' ? 'Hủy' : 'Cancel')}
                  </button>
                  
                  <button 
                    type="submit" 
                    disabled={!name.trim()}
                    className="h-8.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <span>{t('createSpace') || (locale === 'vi' ? 'Tạo Không gian' : 'Create Space')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}
