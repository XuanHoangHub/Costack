"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, ListPlus, Folder, Plus, Check, Palette
} from 'lucide-react';
import { Space } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import { renderSpaceIcon } from '@/components/RenderSpaceIcon';
import { Select } from './ui/Select';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

interface AddListModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string | null;
  spaces: Space[];
  onAddList: (spaceId: string, name: string, folderId?: string, color?: string) => void;
  locale?: string;
}

const LIST_COLORS = [
  { id: 'blue', name: 'Xanh dương', bg: 'bg-blue-500', text: 'text-blue-500', ring: 'ring-blue-500', gradient: 'from-blue-600 via-sky-500 to-cyan-400' },
  { id: 'indigo', name: 'Chàm', bg: 'bg-indigo-500', text: 'text-indigo-500', ring: 'ring-indigo-500', gradient: 'from-indigo-600 via-indigo-500 to-purple-500' },
  { id: 'violet', name: 'Tím', bg: 'bg-purple-500', text: 'text-purple-500', ring: 'ring-purple-500', gradient: 'from-purple-600 via-violet-500 to-fuchsia-500' },
  { id: 'emerald', name: 'Lục', bg: 'bg-emerald-500', text: 'text-emerald-500', ring: 'ring-emerald-500', gradient: 'from-emerald-600 via-emerald-500 to-teal-400' },
  { id: 'amber', name: 'Hổ phách', bg: 'bg-amber-500', text: 'text-amber-500', ring: 'ring-amber-500', gradient: 'from-amber-500 via-orange-500 to-yellow-400' },
  { id: 'rose', name: 'Hồng đỏ', bg: 'bg-rose-500', text: 'text-rose-500', ring: 'ring-rose-500', gradient: 'from-rose-600 via-rose-500 to-pink-400' },
  { id: 'cyan', name: 'Xanh ngọc', bg: 'bg-cyan-500', text: 'text-cyan-500', ring: 'ring-cyan-500', gradient: 'from-cyan-500 via-sky-500 to-blue-500' },
];

export default function AddListModal({
  isOpen,
  onClose,
  spaceId,
  spaces,
  onAddList,
  locale: propLocale
}: AddListModalProps) {
  const { locale: contextLocale } = useTranslation();
  const locale = propLocale || contextLocale;
  const [listName, setListName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [selectedColor, setSelectedColor] = useState<string>('blue');

  const targetSpace = spaces.find(s => s.id === spaceId);
  const activeColorObj = LIST_COLORS.find(c => c.id === selectedColor) || LIST_COLORS[0];

  // Reset states upon modal open
  useEffect(() => {
    if (isOpen) {
      setListName('');
      setSelectedFolderId('root');
      setSelectedColor('blue');
    }
  }, [isOpen]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !spaceId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;
    const folderIdParam = selectedFolderId === 'root' ? undefined : selectedFolderId;
    onAddList(spaceId, listName.trim(), folderIdParam, selectedColor);
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer" 
        />

      <motion.div 
        initial={{ scale: 0.95, y: 10, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        exit={{ scale: 0.95, y: 10, opacity: 0 }} 
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="relative w-[min(95vw,460px)] max-sm:w-full max-sm:mx-2 max-h-[90dvh] overflow-y-auto rounded-xl bg-white dark:bg-[#12141e] border border-slate-200/90 dark:border-white/10 shadow-xl p-4 sm:p-5 md:p-6 z-10 text-left font-sans select-none"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0071E3] dark:text-[#0A84FF] border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
              <ListPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {locale === 'vi' ? 'Tạo danh sách công việc' : 'Create Task List'}
              </h3>
              {targetSpace && (
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>{locale === 'vi' ? 'Không gian:' : 'Space:'}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/10 text-[11px]">
                    <span className="flex items-center justify-center shrink-0">{renderSpaceIcon(targetSpace.emoji || 'Folder', "w-3.5 h-3.5 shrink-0", undefined, { preserveEmoji: true })}</span>
                    <span className="truncate max-w-[150px]">{targetSpace.name}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center justify-between">
              <span>{locale === 'vi' ? 'Tên danh sách' : 'List Name'}</span>
              <span className="text-[10px] font-semibold text-slate-400 lowercase">{locale === 'vi' ? 'bắt buộc' : 'required'}</span>
            </label>
            
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center pointer-events-none">
                <div className={`w-2.5 h-2.5 rounded-full ${activeColorObj.bg} shadow-xs`} />
              </div>
              <input 
                type="text" 
                required 
                autoFocus
                value={listName} 
                onChange={e => setListName(e.target.value)} 
                placeholder={locale === 'vi' ? 'Nhập tên danh sách...' : 'Enter list name...'} 
                className="w-full pl-8 pr-9 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#181a26] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white dark:focus:bg-[#12141e] focus:ring-2 focus:ring-blue-500/20 shadow-2xs" 
              />
              {listName && (
                <button 
                  type="button" 
                  onClick={() => setListName('')}
                  className="absolute right-1.5 p-1 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Color Palette Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Palette className="w-3 h-3 text-slate-400" />
                <span>{locale === 'vi' ? 'Màu nhận diện' : 'List Color'}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 capitalize">{activeColorObj.name}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50/80 dark:bg-[#181a26] rounded-lg border border-slate-200/60 dark:border-white/10 overflow-x-auto">
              {LIST_COLORS.map(c => {
                const isSelected = selectedColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-6 h-6 shrink-0 rounded-md ${c.bg} transition-all duration-150 flex items-center justify-center cursor-pointer relative ${
                      isSelected 
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#12141e] scale-110 shadow-sm ' + c.ring
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Folder Destination (if folders exist in targetSpace) */}
          {targetSpace?.folders && targetSpace.folders.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Folder className="w-3 h-3 text-slate-400" />
                <span>{locale === 'vi' ? 'Vị trí lưu' : 'Location / Folder'}</span>
              </label>
              <Select
                value={selectedFolderId}
                onChange={v => setSelectedFolderId(v)}
                className="w-full"
                ariaLabel={locale === 'vi' ? 'Vị trí lưu' : 'Location / Folder'}
                options={[
                  { value: 'root', label: `📁 ${locale === 'vi' ? `Thư mục gốc (${targetSpace.name})` : `Root Space (${targetSpace.name})` }` },
                  ...targetSpace.folders.map(f => ({ value: f.id, label: `📂 ${f.name}` })),
                ]}
              />
            </div>
          )}

          {/* ── Actions / Footer ── */}
          <div className="flex items-center justify-end gap-2 pt-2.5 mt-1 border-t border-slate-100 dark:border-white/10">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer active:scale-95"
            >
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              disabled={!listName.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] dark:hover:bg-[#0071E3] transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{locale === 'vi' ? 'Tạo danh sách' : 'Create List'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
    </Portal>
  );
}
