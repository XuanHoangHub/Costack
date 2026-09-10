"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Globe, Sparkles, ExternalLink, ShieldCheck, AlertCircle,
  Database, Terminal, Code2, Compass, Bookmark, Headphones,
  Radio, Tv, Cpu, Layers, BarChart3, Users2, GitBranch, Target, Shield, FileText
} from 'lucide-react';
import { CustomMiniAppInput, MiniAppCategory, MiniAppItem, MiniAppOpenMode } from '@/types/miniapp';
import { MINI_APP_CATEGORIES } from '@/lib/miniAppsRegistry';
import { useTranslation } from '@/contexts/TranslationContext';
import MiniAppIcon from './MiniAppIcon';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

interface CustomMiniAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CustomMiniAppInput) => void;
  editingApp?: MiniAppItem | null;
}

const PRESET_VECTOR_ICONS = [
  { id: 'globe', label: 'Web', Icon: Globe },
  { id: 'database', label: 'Database', Icon: Database },
  { id: 'sparkles', label: 'AI/Magic', Icon: Sparkles },
  { id: 'terminal', label: 'Terminal', Icon: Terminal },
  { id: 'code', label: 'Code', Icon: Code2 },
  { id: 'chart', label: 'Analytics', Icon: BarChart3 },
  { id: 'layers', label: 'Layers', Icon: Layers },
  { id: 'users', label: 'Team', Icon: Users2 },
  { id: 'workflow', label: 'Pipeline', Icon: GitBranch },
  { id: 'compass', label: 'Explore', Icon: Compass },
  { id: 'bookmark', label: 'Saved', Icon: Bookmark },
  { id: 'shield', label: 'Security', Icon: Shield },
  { id: 'target', label: 'Target', Icon: Target },
  { id: 'file-text', label: 'Document', Icon: FileText },
  { id: 'headphones', label: 'Audio', Icon: Headphones },
  { id: 'tv', label: 'Media', Icon: Tv },
];

const PRESET_EMOJIS = ['🌐', '📊', '🚀', '🛠️', '🎨', '💼', '💡', '📑', '📈', '🎧', '📹', '🤖'];
const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export default function CustomMiniAppModal({
  isOpen,
  onClose,
  onSave,
  editingApp,
}: CustomMiniAppModalProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('🌐');
  const [iconName, setIconName] = useState<string | undefined>('globe');
  const [iconType, setIconType] = useState<'vector' | 'emoji'>('vector');
  const [category, setCategory] = useState<MiniAppCategory>('custom');
  const [color, setColor] = useState('#3b82f6');
  const [openMode, setOpenMode] = useState<MiniAppOpenMode>('embedded');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingApp) {
      setName(editingApp.name);
      setDescription(editingApp.description);
      setUrl(editingApp.url || '');
      setIcon(editingApp.icon || '🌐');
      setIconName(editingApp.iconName || (editingApp.icon && !/\p{Extended_Pictographic}/u.test(editingApp.icon) ? editingApp.icon : undefined));
      setIconType(editingApp.iconName ? 'vector' : (editingApp.icon && /\p{Extended_Pictographic}/u.test(editingApp.icon) ? 'emoji' : 'vector'));
      setCategory(editingApp.category || 'custom');
      setColor(editingApp.color || '#3b82f6');
      setOpenMode(editingApp.openMode || 'embedded');
    } else {
      setName('');
      setDescription('');
      setUrl('');
      setIcon('🌐');
      setIconName('globe');
      setIconType('vector');
      setCategory('custom');
      setColor('#3b82f6');
      setOpenMode('embedded');
    }
    setError('');
  }, [editingApp, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanUrl = url.trim();

    if (!cleanName) {
      setError(isVi ? 'Vui lòng nhập tên ứng dụng' : 'Please enter app name');
      return;
    }

    if (!cleanUrl) {
      setError(isVi ? 'Vui lòng nhập đường dẫn URL của ứng dụng' : 'Please enter app URL');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError(isVi ? 'Đường dẫn URL phải bắt đầu bằng https:// hoặc http://' : 'URL must start with https:// or http://');
      return;
    }

    onSave({
      name: cleanName,
      description: description.trim() || (isVi ? 'Ứng dụng nhúng Web tùy chỉnh' : 'Custom Web Embed Application'),
      url: cleanUrl,
      icon,
      iconName: iconType === 'vector' ? iconName : undefined,
      category,
      color,
      openMode,
      tags: ['custom', 'web', category],
    });

    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
        />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 font-sans"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MiniAppIcon
              icon={icon}
              iconName={iconType === 'vector' ? iconName : undefined}
              color={color}
              variant="card"
              className="w-11 h-11 rounded-xl shadow-md"
            />
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingApp
                  ? (isVi ? 'Chỉnh sửa Mini App' : 'Edit Mini App')
                  : (isVi ? 'Thêm Mini App mới (Web Embed)' : 'Add Custom Web Mini App')}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                {isVi
                  ? 'Nhúng công cụ web, tài liệu hoặc bảng tính ngoài vào workspace'
                  : 'Embed external web tools, docs, or dashboards into your workspace'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                {isVi ? 'Tên ứng dụng *' : 'App Name *'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isVi ? 'Ví dụ: Bảng tính Google / Figma' : 'e.g., Google Sheet / Figma'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                {isVi ? 'Phân loại danh mục' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MiniAppCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MINI_APP_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {isVi ? c.labelVi : c.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
              {isVi ? 'Đường dẫn URL ứng dụng web *' : 'Web URL *'}
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/... hoặc https://figma.com/..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-sky-400"
                required
              />
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              {isVi
                ? 'Lưu ý: Một số website có thể hạn chế nhúng iframe do chính sách bảo mật (X-Frame-Options).'
                : 'Note: Some sites block iframe embedding due to X-Frame-Options headers.'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
              {isVi ? 'Mô tả ngắn gọn' : 'Description'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVi ? 'Mô tả công dụng của ứng dụng...' : 'Brief purpose of this tool...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Icon & Color pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {isVi ? 'Biểu tượng ứng dụng' : 'App Icon'}
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIconType('vector');
                      if (!iconName) setIconName('globe');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      iconType === 'vector'
                        ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-300 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    SVG Vector
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIconType('emoji');
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      iconType === 'emoji'
                        ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-sky-300 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Emoji
                  </button>
                </div>
              </div>

              {iconType === 'vector' ? (
                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/40 max-h-36 overflow-y-auto custom-scrollbar">
                  {PRESET_VECTOR_ICONS.map((item) => {
                    const ItemIcon = item.Icon;
                    const isSelected = iconName === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIconName(item.id);
                          setIcon(item.id);
                        }}
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs scale-105'
                            : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                        }`}
                        title={item.label}
                      >
                        <ItemIcon className="w-4 h-4 stroke-[2.2]" />
                        <span className="text-[9px] font-bold truncate max-w-full leading-none">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/40">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setIcon(em)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                        icon === em ? 'bg-white dark:bg-zinc-700 shadow-xs scale-110' : 'hover:bg-slate-200/60 dark:hover:bg-white/10'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                {isVi ? 'Màu sắc chủ đề' : 'Theme Color'}
              </label>
              <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/40 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                      color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:opacity-80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Open Mode Option */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
              {isVi ? 'Chế độ mở ứng dụng' : 'Launch Mode'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpenMode('embedded')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  openMode === 'embedded'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-sky-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                }`}
              >
                <span className="text-xs font-bold block">{isVi ? '🖼️ Nhúng trực tiếp' : '🖼️ Embedded Iframe'}</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                  {isVi ? 'Hiển thị ngay bên trong Apexa' : 'Open inside Apexa canvas'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpenMode('new_tab')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  openMode === 'new_tab'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-sky-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                }`}
              >
                <span className="text-xs font-bold block">{isVi ? '↗️ Mở tab mới' : '↗️ New Tab'}</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                  {isVi ? 'Phù hợp trang web chặn iframe' : 'Bypasses iframe security blocks'}
                </span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/25 transition-all cursor-pointer hover:scale-102 active:scale-98"
            >
              {editingApp
                ? (isVi ? 'Lưu thay đổi' : 'Save Changes')
                : (isVi ? 'Tạo Mini App' : 'Create Mini App')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
    </Portal>
  );
}
