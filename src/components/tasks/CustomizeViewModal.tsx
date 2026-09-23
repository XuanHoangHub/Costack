"use client";

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Sliders, 
  ChevronRight, 
  Filter, 
  Layers, 
  ListTodo, 
  FileSpreadsheet, 
  Star, 
  Link as LinkIcon, 
  Download, 
  Users, 
  Check,
  Eye,
  Lock,
  Shield,
  Pin,
  Save,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface CustomizeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  viewTitle?: string;
  // Section 1 Toggles
  showEmptyStatuses: boolean;
  onToggleShowEmptyStatuses: (val: boolean) => void;
  wrapText: boolean;
  onToggleWrapText: (val: boolean) => void;
  showTaskLocations: boolean;
  onToggleShowTaskLocations: (val: boolean) => void;
  showSubtaskParentNames: boolean;
  onToggleShowSubtaskParentNames: (val: boolean) => void;
  showClosedTasks: boolean;
  onToggleShowClosedTasks: (val: boolean) => void;
  // Section 2 Nav rows
  visibleFieldsCount: number;
  onOpenFields: () => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
  groupBy: string;
  onChangeGroupBy?: (group: string) => void;
  subtasksMode?: 'collapsed' | 'expanded' | 'separate';
  onChangeSubtasksMode?: (mode: 'collapsed' | 'expanded' | 'separate') => void;
  onOpenTemplates?: () => void;
  // Section 3 View settings
  viewSettings: {
    autosave: boolean;
    pin: boolean;
    private: boolean;
    protect: boolean;
    default: boolean;
  };
  onUpdateViewSetting: (key: 'autosave' | 'pin' | 'private' | 'protect' | 'default', val: boolean) => void;
  // Section 4 Actions
  onCopyLink: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onExport: () => void;
  onOpenShare: () => void;
}

export default function CustomizeViewModal({
  isOpen,
  onClose,
  activeView,
  viewTitle,
  showEmptyStatuses,
  onToggleShowEmptyStatuses,
  wrapText,
  onToggleWrapText,
  showTaskLocations,
  onToggleShowTaskLocations,
  showSubtaskParentNames,
  onToggleShowSubtaskParentNames,
  showClosedTasks,
  onToggleShowClosedTasks,
  visibleFieldsCount,
  onOpenFields,
  activeFilterCount,
  onOpenFilter,
  groupBy,
  onChangeGroupBy,
  subtasksMode = 'collapsed',
  onChangeSubtasksMode,
  onOpenTemplates,
  viewSettings,
  onUpdateViewSetting,
  onCopyLink,
  isFavorite,
  onToggleFavorite,
  onExport,
  onOpenShare,
}: CustomizeViewModalProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const matchesSearch = (text: string) => {
    if (!search.trim()) return true;
    return text.toLowerCase().includes(search.trim().toLowerCase());
  };

  const getViewDisplayName = () => {
    if (viewTitle) return viewTitle;
    switch (activeView) {
      case 'table': return isVi ? 'Bảng dữ liệu' : 'Table';
      case 'list': return isVi ? 'Danh sách' : 'List';
      case 'board': return isVi ? 'Bảng Kanban' : 'Kanban Board';
      case 'gantt': return 'Gantt';
      default: return isVi ? 'Chế độ xem' : 'View';
    }
  };

  const getGroupByDisplayName = () => {
    switch (groupBy) {
      case 'status': return isVi ? 'Trạng thái' : 'Status';
      case 'priority': return isVi ? 'Mức ưu tiên' : 'Priority';
      case 'assignee': return isVi ? 'Người phụ trách' : 'Assignee';
      default: return isVi ? 'Trạng thái' : 'Status';
    }
  };

  const getSubtasksDisplayName = () => {
    switch (subtasksMode) {
      case 'collapsed': return isVi ? 'Thu gọn' : 'Collapsed';
      case 'expanded': return isVi ? 'Mở rộng' : 'Expanded';
      case 'separate': return isVi ? 'Tách riêng' : 'As separate tasks';
      default: return isVi ? 'Thu gọn' : 'Collapsed';
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[350] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer transition-opacity"
        />

        {/* Slide-over Drawer Panel (Image 5 style) */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 w-full max-w-[360px] h-full bg-white dark:bg-[#14151a] border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col font-sans select-none text-slate-800 dark:text-zinc-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isVi ? 'Tùy chỉnh chế độ xem' : 'Customize View'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                {getViewDisplayName()}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={isVi ? 'Tìm kiếm cài đặt...' : 'Search...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            
            {/* SECTION 1: Quick Display Toggles (Image 5) */}
            <div className="space-y-1">
              {matchesSearch('Show empty statuses') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="pr-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
                      {isVi ? 'Hiện trạng thái trống (chưa có công việc)' : 'Show empty statuses'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 leading-tight block mt-0.5">
                      {isVi ? 'Tắt tùy chọn này để chỉ hiển thị các trạng thái đang có công việc' : 'Turn off to only show statuses that contain tasks'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showEmptyStatuses}
                      onChange={e => onToggleShowEmptyStatuses(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Wrap text') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Tự động xuống dòng' : 'Wrap text'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wrapText}
                      onChange={e => onToggleWrapText(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Show task locations') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Hiện vị trí công việc' : 'Show task locations'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTaskLocations}
                      onChange={e => onToggleShowTaskLocations(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Show subtask parent names') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Hiện tên việc cha cho việc phụ' : 'Show subtask parent names'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSubtaskParentNames}
                      onChange={e => onToggleShowSubtaskParentNames(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Show closed tasks') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Hiện công việc đã đóng / xong' : 'Show closed tasks'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showClosedTasks}
                      onChange={e => onToggleShowClosedTasks(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 my-2" />

            {/* SECTION 2: Navigation / Settings Rows (Image 5) */}
            <div className="space-y-0.5">
              {/* Fields */}
              {matchesSearch('Fields') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFields();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Trường dữ liệu' : 'Fields'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {visibleFieldsCount} {isVi ? 'đang hiện' : 'shown'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200" />
                  </div>
                </button>
              )}

              {/* Filter */}
              {matchesSearch('Filter') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFilter();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Bộ lọc' : 'Filter'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {activeFilterCount > 0 ? `${activeFilterCount} ${isVi ? 'áp dụng' : 'active'}` : (isVi ? 'Không' : 'None')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200" />
                  </div>
                </button>
              )}

              {/* Group */}
              {matchesSearch('Group') && (
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Nhóm theo' : 'Group'}
                  </span>
                  {onChangeGroupBy ? (
                    <select
                      value={groupBy}
                      onChange={e => onChangeGroupBy(e.target.value)}
                      className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 bg-transparent border-none outline-none cursor-pointer text-right"
                    >
                      <option value="status">{isVi ? 'Trạng thái' : 'Status'}</option>
                      <option value="priority">{isVi ? 'Mức ưu tiên' : 'Priority'}</option>
                      <option value="assignee">{isVi ? 'Người phụ trách' : 'Assignee'}</option>
                    </select>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                      {getGroupByDisplayName()}
                    </span>
                  )}
                </div>
              )}

              {/* Subtasks */}
              {matchesSearch('Subtasks') && (
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Công việc phụ' : 'Subtasks'}
                  </span>
                  {onChangeSubtasksMode ? (
                    <select
                      value={subtasksMode}
                      onChange={e => onChangeSubtasksMode(e.target.value as any)}
                      className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 bg-transparent border-none outline-none cursor-pointer text-right"
                    >
                      <option value="collapsed">{isVi ? 'Thu gọn' : 'Collapsed'}</option>
                      <option value="expanded">{isVi ? 'Mở rộng' : 'Expanded'}</option>
                      <option value="separate">{isVi ? 'Tách riêng' : 'As separate tasks'}</option>
                    </select>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                      {getSubtasksDisplayName()}
                    </span>
                  )}
                </div>
              )}

              {/* Templates */}
              {onOpenTemplates && matchesSearch('Templates') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTemplates();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Mẫu quy trình (Templates)' : 'Templates'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200" />
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 my-2" />

            {/* SECTION 3: View Preferences Toggles (Image 5) */}
            <div className="space-y-1">
              {matchesSearch('Autosave for me') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Tự động lưu cho tôi' : 'Autosave for me'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewSettings.autosave}
                      onChange={e => onUpdateViewSetting('autosave', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Pin view') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Ghim chế độ xem' : 'Pin view'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewSettings.pin}
                      onChange={e => onUpdateViewSetting('pin', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Private view') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Chế độ xem riêng tư' : 'Private view'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewSettings.private}
                      onChange={e => onUpdateViewSetting('private', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Protect view') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Khóa chỉnh sửa' : 'Protect view'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewSettings.protect}
                      onChange={e => onUpdateViewSetting('protect', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}

              {matchesSearch('Set as default view') && (
                <div className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {isVi ? 'Đặt làm chế độ xem mặc định' : 'Set as default view'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewSettings.default}
                      onChange={e => onUpdateViewSetting('default', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 my-2" />

            {/* SECTION 4: View Actions (Image 5) */}
            <div className="space-y-1">
              {/* Copy link */}
              {matchesSearch('Copy link to view') && (
                <button
                  type="button"
                  onClick={onCopyLink}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4 text-slate-400" />
                  <span>{isVi ? 'Sao chép liên kết tới chế độ xem' : 'Copy link to view'}</span>
                </button>
              )}

              {/* Favorite */}
              {matchesSearch('Favorite') && (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    <span>{isVi ? 'Thêm vào yêu thích' : 'Favorite'}</span>
                  </div>
                  {isFavorite && (
                    <span className="text-[10px] text-amber-500 font-bold">{isVi ? 'Đã thích' : 'Favorited'}</span>
                  )}
                </button>
              )}

              {/* Export view */}
              {matchesSearch('Export view') && (
                <button
                  type="button"
                  onClick={onExport}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>{isVi ? 'Xuất dữ liệu chế độ xem' : 'Export view'}</span>
                </button>
              )}

              {/* Sharing & Permissions */}
              {matchesSearch('Sharing & Permissions') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShare();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{isVi ? 'Chia sẻ & Phân quyền' : 'Sharing & Permissions'}</span>
                </button>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
