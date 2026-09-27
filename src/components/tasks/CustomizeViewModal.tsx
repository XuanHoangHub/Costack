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
        {/* Backdrop without blur (user requested no frosted glass effect) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/25 dark:bg-black/50 cursor-pointer transition-opacity"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 w-full max-w-[360px] h-full bg-white dark:bg-[#12141a] border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col font-sans select-none text-slate-800 dark:text-zinc-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isVi ? 'Tùy chỉnh chế độ xem' : 'Customize View'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/40">
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
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-zinc-800/70 border border-slate-200/70 dark:border-zinc-700/60 focus-within:border-indigo-500 focus-within:ring-1.5 focus-within:ring-indigo-500/20 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={isVi ? 'Tìm kiếm cài đặt...' : 'Search settings...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            
            {/* SECTION 1: Layout & Display */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {isVi ? 'Bố cục & Hiển thị' : 'Layout & Display'}
              </div>

              <div className="space-y-0.5">
                {matchesSearch('Show empty statuses') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="pr-3">
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">
                        {isVi ? 'Hiện trạng thái trống' : 'Show empty statuses'}
                      </span>
                      <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 leading-tight block mt-0.5">
                        {isVi ? 'Tắt để ẩn các cột/nhóm chưa có công việc' : 'Turn off to only show statuses that contain tasks'}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={showEmptyStatuses}
                        onChange={e => onToggleShowEmptyStatuses(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Wrap text') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Tự động xuống dòng' : 'Wrap text'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={wrapText}
                        onChange={e => onToggleWrapText(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Show closed tasks') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Hiện công việc đã hoàn thành / đóng' : 'Show closed tasks'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={showClosedTasks}
                        onChange={e => onToggleShowClosedTasks(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Show task locations') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Hiện vị trí thư mục / danh sách cha' : 'Show task locations'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={showTaskLocations}
                        onChange={e => onToggleShowTaskLocations(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 my-1" />

            {/* SECTION 2: Data & Hierarchy */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {isVi ? 'Dữ liệu & Cấu trúc' : 'Data & Hierarchy'}
              </div>

              <div className="space-y-0.5">
                {/* Fields */}
                {matchesSearch('Fields') && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFields();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Trường dữ liệu' : 'Fields'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {visibleFieldsCount} {isVi ? 'đang hiện' : 'shown'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400" />
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
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Bộ lọc điều kiện' : 'Filters'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {activeFilterCount > 0 ? `${activeFilterCount} ${isVi ? 'áp dụng' : 'active'}` : (isVi ? 'Không' : 'None')}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400" />
                    </div>
                  </button>
                )}

                {/* Group By */}
                {matchesSearch('Group') && (
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Nhóm theo' : 'Group by'}
                    </span>
                    {onChangeGroupBy ? (
                      <select
                        value={groupBy}
                        onChange={e => onChangeGroupBy(e.target.value)}
                        className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 bg-transparent border-none outline-none cursor-pointer text-right"
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
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Chế độ việc con' : 'Subtasks mode'}
                    </span>
                    {onChangeSubtasksMode ? (
                      <select
                        value={subtasksMode}
                        onChange={e => onChangeSubtasksMode(e.target.value as any)}
                        className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 bg-transparent border-none outline-none cursor-pointer text-right"
                      >
                        <option value="collapsed">{isVi ? 'Thu gọn' : 'Collapsed'}</option>
                        <option value="expanded">{isVi ? 'Mở rộng' : 'Expanded'}</option>
                        <option value="separate">{isVi ? 'Hàng độc lập' : 'Separate tasks'}</option>
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
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Mẫu quy trình (Templates)' : 'Templates'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 my-1" />

            {/* SECTION 3: View Preferences */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {isVi ? 'Thiết lập chế độ xem' : 'View Preferences'}
              </div>

              <div className="space-y-0.5">
                {matchesSearch('Autosave') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Tự động lưu thay đổi' : 'Autosave for me'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={viewSettings.autosave}
                        onChange={e => onUpdateViewSetting('autosave', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Pin view') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Ghim chế độ xem' : 'Pin view'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={viewSettings.pin}
                        onChange={e => onUpdateViewSetting('pin', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Private view') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Chế độ xem riêng tư (Chỉ mình tôi)' : 'Private view'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={viewSettings.private}
                        onChange={e => onUpdateViewSetting('private', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Protect view') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Khóa chỉnh sửa cấu hình' : 'Protect view'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={viewSettings.protect}
                        onChange={e => onUpdateViewSetting('protect', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}

                {matchesSearch('Set as default view') && (
                  <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      {isVi ? 'Đặt làm chế độ xem mặc định' : 'Set as default view'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={viewSettings.default}
                        onChange={e => onUpdateViewSetting('default', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.25px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 my-1" />

            {/* SECTION 4: Actions & Sharing */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {isVi ? 'Thao tác & Chia sẻ' : 'Actions & Sharing'}
              </div>

              <div className="space-y-0.5">
                {/* Copy link */}
                {matchesSearch('Copy link to view') && (
                  <button
                    type="button"
                    onClick={onCopyLink}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer group"
                  >
                    <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />
                    <span>{isVi ? 'Sao chép liên kết tới chế độ xem' : 'Copy link to view'}</span>
                  </button>
                )}

                {/* Favorite */}
                {matchesSearch('Favorite') && (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300'}`} />
                      <span>{isVi ? 'Thêm vào mục yêu thích' : 'Favorite'}</span>
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
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer group"
                  >
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />
                    <span>{isVi ? 'Xuất dữ liệu chế độ xem (CSV)' : 'Export view'}</span>
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
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer group"
                  >
                    <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />
                    <span>{isVi ? 'Chia sẻ & Phân quyền' : 'Sharing & Permissions'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
