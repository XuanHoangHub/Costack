"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, ListPlus, Folder, Plus, Check, Palette
} from 'lucide-react';
import { Space } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity" 
      />

      {/* Modal Window */}
      <motion.div 
        initial={{ scale: 0.93, y: 16, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        exit={{ scale: 0.93, y: 16, opacity: 0 }} 
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="relative w-full max-w-[460px] rounded-[28px] bg-white/95 dark:bg-[#0c101c]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] p-5 sm:p-6 overflow-hidden z-10 text-left font-sans select-none"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className={`absolute -top-20 -right-20 w-44 h-44 bg-gradient-to-br ${activeColorObj.gradient} opacity-20 rounded-full blur-3xl pointer-events-none transition-all duration-500`} />

        {/* ── Header ── */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${activeColorObj.gradient} text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 transition-all duration-300`}>
              <ListPlus className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight">
                {locale === 'vi' ? 'Tạo danh sách công việc' : 'Create Task List'}
              </h3>
              {targetSpace && (
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>{locale === 'vi' ? 'Không gian:' : 'Space:'}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span>{targetSpace.emoji || '📁'}</span>
                    <span className="truncate max-w-[150px]">{targetSpace.name}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
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
                className="w-full pl-8 pr-9 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-850/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 shadow-3xs" 
              />
              {listName && (
                <button 
                  type="button" 
                  onClick={() => setListName('')}
                  className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
            <div className="flex items-center gap-2 p-1.5 bg-slate-50/80 dark:bg-slate-850/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
              {LIST_COLORS.map(c => {
                const isSelected = selectedColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-6 h-6 rounded-lg ${c.bg} transition-all duration-150 flex items-center justify-center cursor-pointer relative ${
                      isSelected 
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110 shadow-sm ' + c.ring
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
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
              <select
                value={selectedFolderId}
                onChange={e => setSelectedFolderId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-850/80 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-3xs"
              >
                <option value="root">📁 {locale === 'vi' ? `Thư mục gốc (${targetSpace.name})` : `Root Space (${targetSpace.name})`}</option>
                {targetSpace.folders.map(f => (
                  <option key={f.id} value={f.id}>
                    📂 {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Actions / Footer ── */}
          <div className="flex items-center justify-end gap-2.5 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
            >
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              disabled={!listName.trim()}
              className={`group px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${activeColorObj.gradient} hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3] transition-transform group-hover:rotate-90" />
              <span>{locale === 'vi' ? 'Tạo danh sách' : 'Create List'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
