"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X, Search, Plus, Star, Eye, EyeOff, Archive, Trash2, Settings,
  ArrowUp, ArrowDown, LayoutGrid, Check, Folder, List
} from 'lucide-react';
import { Space } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

interface ManageSpacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  onSaveSpaces?: (spaces: Space[]) => void;
  onOpenSpaceSettings?: (space: Space) => void;
  onAddSpace?: () => void;
  onDeleteSpace?: (spaceId: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function ManageSpacesModal({
  isOpen,
  onClose,
  spaces,
  onSaveSpaces,
  onOpenSpaceSettings,
  onAddSpace,
  onDeleteSpace,
  triggerToast
}: ManageSpacesModalProps) {
  const { locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredSpaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return spaces;
    return spaces.filter(s => s.name.toLowerCase().includes(q));
  }, [spaces, searchQuery]);

  const updateSpace = (spaceId: string, patch: Partial<Space>, toastMsg?: string) => {
    if (!onSaveSpaces) return;
    const updated = spaces.map(s => s.id === spaceId ? { ...s, ...patch } : s);
    onSaveSpaces(updated);
    if (toastMsg) {
      triggerToast?.('success', locale === 'vi' ? 'Đã cập nhật' : 'Updated', toastMsg);
    }
  };

  const moveSpace = (index: number, direction: 'up' | 'down') => {
    if (!onSaveSpaces) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= spaces.length) return;
    const newSpaces = [...spaces];
    const temp = newSpaces[index];
    newSpaces[index] = newSpaces[targetIndex];
    newSpaces[targetIndex] = temp;
    onSaveSpaces(newSpaces);
  };

  const startRename = (space: Space) => {
    setEditingSpaceId(space.id);
    setEditName(space.name);
  };

  const saveRename = (spaceId: string) => {
    if (editName.trim()) {
      updateSpace(spaceId, { name: editName.trim() }, locale === 'vi' ? 'Đã đổi tên không gian' : 'Space renamed');
    }
    setEditingSpaceId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[#18191c] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Quản lý Không gian' : 'Manage Spaces'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {locale === 'vi' 
                  ? `Tổng cộng ${spaces.length} không gian làm việc` 
                  : `Total ${spaces.length} spaces`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search + Add */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'vi' ? 'Tìm kiếm không gian...' : 'Search spaces...'}
              className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {onAddSpace && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddSpace();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Tạo Không gian' : 'Create Space'}</span>
            </button>
          )}
        </div>

        {/* Spaces List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 divide-y divide-slate-100 dark:divide-white/[0.06] space-y-1">
          {filteredSpaces.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
              {locale === 'vi' ? 'Không tìm thấy không gian nào' : 'No spaces found'}
            </div>
          ) : (
            filteredSpaces.map((space, index) => {
              const originalIndex = spaces.findIndex(s => s.id === space.id);
              const isFirst = originalIndex === 0;
              const isLast = originalIndex === spaces.length - 1;

              return (
                <div
                  key={space.id}
                  className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Left: Reorder arrows + Icon + Name + Counts */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveSpace(originalIndex, 'up')}
                        className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 ${isFirst ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white'}`}
                        title={locale === 'vi' ? 'Di chuyển lên' : 'Move up'}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveSpace(originalIndex, 'down')}
                        className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 ${isLast ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white'}`}
                        title={locale === 'vi' ? 'Di chuyển xuống' : 'Move down'}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Emoji / Icon */}
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-sm shrink-0">
                      {space.emoji && space.emoji !== '📦' ? space.emoji : '📦'}
                    </div>

                    {/* Name or Rename Input */}
                    <div className="min-w-0 flex-1">
                      {editingSpaceId === space.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(space.id);
                              if (e.key === 'Escape') setEditingSpaceId(null);
                            }}
                            autoFocus
                            className="text-xs font-semibold px-2 py-1 rounded-md border border-blue-500 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveRename(space.id)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            onDoubleClick={() => startRename(space)}
                            className={`text-xs font-semibold truncate cursor-pointer ${
                              space.isHidden 
                                ? 'text-slate-400 dark:text-zinc-500 line-through' 
                                : 'text-slate-800 dark:text-zinc-200'
                            }`}
                            title={locale === 'vi' ? 'Nhấp đúp để đổi tên' : 'Double click to rename'}
                          >
                            {space.name}
                          </span>
                          {space.isArchived && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              {locale === 'vi' ? 'Lưu trữ' : 'Archived'}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {space.folders?.length || 0}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <List className="w-3 h-3" />
                          {space.lists?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Favorite Star */}
                    <button
                      type="button"
                      onClick={() => updateSpace(space.id, { isFavorite: !space.isFavorite })}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors ${
                        space.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                      title={space.isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className="w-3.5 h-3.5" fill={space.isFavorite ? 'currentColor' : 'none'} />
                    </button>

                    {/* Hide / Unhide Toggle */}
                    <button
                      type="button"
                      onClick={() => updateSpace(
                        space.id, 
                        { isHidden: !space.isHidden },
                        space.isHidden 
                          ? (locale === 'vi' ? 'Đã hiện không gian' : 'Space visible')
                          : (locale === 'vi' ? 'Đã ẩn không gian' : 'Space hidden')
                      )}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors ${
                        space.isHidden ? 'text-blue-500' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                      title={space.isHidden ? 'Unhide space' : 'Hide space'}
                    >
                      {space.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    {/* Archive / Unarchive */}
                    <button
                      type="button"
                      onClick={() => updateSpace(
                        space.id, 
                        { isArchived: !space.isArchived },
                        space.isArchived 
                          ? (locale === 'vi' ? 'Đã khôi phục không gian' : 'Space restored')
                          : (locale === 'vi' ? 'Đã lưu trữ không gian' : 'Space archived')
                      )}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors ${
                        space.isArchived ? 'text-amber-500' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                      title={space.isArchived ? 'Unarchive space' : 'Archive space'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>

                    {/* Space Settings */}
                    {onOpenSpaceSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSpaceSettings(space);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                        title={locale === 'vi' ? 'Cài đặt Không gian' : 'Space Settings'}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Space */}
                    {onDeleteSpace && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(locale === 'vi' ? `Bạn có chắc muốn xóa không gian "${space.name}"?` : `Delete space "${space.name}"?`)) {
                            onDeleteSpace(space.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        title={locale === 'vi' ? 'Xóa Không gian' : 'Delete Space'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-xs text-slate-500 dark:text-zinc-400">
          <span>
            {locale === 'vi' ? 'Nhấp đúp vào tên để sửa nhanh' : 'Double click space name to rename'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-zinc-200 font-medium transition-colors"
          >
            {locale === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
