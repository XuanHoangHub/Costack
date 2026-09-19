"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2,
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  Clock,
  Tag,
  Flag,
  Folder,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Task, Space, Priority, TaskStatus } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

interface TaskTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedTasks: Task[];
  onRestoreTask: (id: string) => void | Promise<void>;
  onPermanentDeleteTask: (id: string) => void | Promise<void>;
  onEmptyTrash: () => void | Promise<void>;
  spaces?: Space[];
}

function formatRelativeTime(dateString?: string, isVi = true): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return isVi ? 'vừa xong' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isVi ? `${diffMin} phút trước` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isVi ? `${diffHour} giờ trước` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return isVi ? `${diffDay} ngày trước` : `${diffDay}d ago`;
  return date.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TaskTrashModal({
  isOpen,
  onClose,
  deletedTasks,
  onRestoreTask,
  onPermanentDeleteTask,
  onEmptyTrash,
  spaces = [],
}: TaskTrashModalProps) {
  const { localize: l, locale } = useTranslation();
  const isVi = locale === 'vi';

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [taskToDeletePermanently, setTaskToDeletePermanently] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Map spaceId and listId to names
  const spaceListMap = useMemo(() => {
    const map = new Map<string, { spaceName: string; listName?: string }>();
    for (const sp of spaces) {
      if (sp.lists) {
        for (const ls of sp.lists) {
          map.set(ls.id, { spaceName: sp.name, listName: ls.name });
        }
      }
      map.set(sp.id, { spaceName: sp.name });
    }
    return map;
  }, [spaces]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return deletedTasks;
    const query = searchQuery.toLowerCase();
    return deletedTasks.filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(query);
      const descMatch = task.description?.toLowerCase().includes(query);
      const tagMatch = task.tags?.some(t => t.toLowerCase().includes(query));
      return titleMatch || descMatch || tagMatch;
    });
  }, [deletedTasks, searchQuery]);

  const handleRestore = async (id: string) => {
    try {
      setIsProcessing(true);
      await onRestoreTask(id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPermanentDelete = async (id: string) => {
    try {
      setIsProcessing(true);
      await onPermanentDeleteTask(id);
      setTaskToDeletePermanently(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    try {
      setIsProcessing(true);
      await onEmptyTrash();
      setConfirmEmpty(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="task-trash-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              key="task-trash-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              key="task-trash-card"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
            >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>{l('Thùng rác công việc', 'Task Trash')}</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {deletedTasks.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {l('Khôi phục công việc đã xóa hoặc xóa vĩnh viễn khỏi không gian làm việc', 'Restore deleted tasks or permanently delete them from your workspace')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {deletedTasks.length > 0 && (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{l('Dọn sạch thùng rác', 'Empty Trash')}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={l('Đóng', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Confirm Empty Trash Banner */}
          <AnimatePresence>
            {confirmEmpty && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{l('Bạn có chắc muốn xóa vĩnh viễn toàn bộ công việc trong thùng rác? Thao tác này không thể hoàn tác.', 'Are you sure you want to permanently delete all tasks in the trash? This action cannot be undone.')}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmEmpty(false)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    {l('Hủy', 'Cancel')}
                  </button>
                  <button
                    onClick={handleConfirmEmptyTrash}
                    disabled={isProcessing}
                    className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? l('Đang xóa...', 'Deleting...') : l('Xác nhận xóa hết', 'Confirm Delete All')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm Single Permanent Delete Modal / Banner */}
          <AnimatePresence>
            {taskToDeletePermanently && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-4 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{l('Xóa vĩnh viễn công việc này khỏi hệ thống?', 'Permanently remove this task from the system?')}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setTaskToDeletePermanently(null)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    {l('Hủy', 'Cancel')}
                  </button>
                  <button
                    onClick={() => handleConfirmPermanentDelete(taskToDeletePermanently)}
                    disabled={isProcessing}
                    className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? l('Đang xóa...', 'Deleting...') : l('Xóa vĩnh viễn', 'Delete Permanently')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search bar */}
          {deletedTasks.length > 0 && (
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={l('Tìm kiếm công việc đã xóa theo tiêu đề, nhãn...', 'Search deleted tasks by title, tag...')}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body / Task List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100 dark:divide-slate-800/60 min-h-[300px]">
            {deletedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {l('Thùng rác trống', 'Trash is empty')}
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                  {l('Các công việc bị xóa sẽ hiển thị ở đây để bạn có thể khôi phục lại bất kỳ lúc nào.', 'Tasks deleted from your workspace will appear here so you can restore them anytime.')}
                </p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">{l('Không tìm thấy công việc nào phù hợp.', 'No matching tasks found.')}</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const location = task.listId ? spaceListMap.get(task.listId) : task.spaceId ? spaceListMap.get(task.spaceId) : undefined;
                return (
                  <div
                    key={task.id}
                    className="py-3.5 flex items-center justify-between gap-4 group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 -mx-3 px-3 rounded-xl transition-colors"
                  >
                    {/* Left details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate line-through opacity-80 group-hover:opacity-100">
                          {task.title}
                        </span>

                        {/* Priority Badge */}
                        {task.priority && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' :
                            task.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                            task.priority === 'medium' || (task.priority as string) === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                        )}

                        {/* Status Badge */}
                        {task.status && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                            {task.status.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Meta info: Space/List, Deletion time */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
                        {location && (
                          <span className="inline-flex items-center gap-1">
                            <Folder className="w-3 h-3 text-slate-400" />
                            <span>{location.spaceName}</span>
                            {location.listName && (
                              <>
                                <span className="opacity-50">/</span>
                                <span>{location.listName}</span>
                              </>
                            )}
                          </span>
                        )}

                        {task.deletedAt && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{l('Đã xóa', 'Deleted')} {formatRelativeTime(task.deletedAt, isVi)}</span>
                          </span>
                        )}

                        {task.tags && task.tags.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>{task.tags.slice(0, 2).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore(task.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-900/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        title={l('Khôi phục công việc', 'Restore task')}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{l('Khôi phục', 'Restore')}</span>
                      </button>

                      <button
                        onClick={() => setTaskToDeletePermanently(task.id)}
                        disabled={isProcessing}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title={l('Xóa vĩnh viễn', 'Delete permanently')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {deletedTasks.length > 0 ? (
                <>
                  {l('Hiển thị', 'Showing')} {filteredTasks.length}/{deletedTasks.length} {l('công việc trong thùng rác', 'tasks in trash')}
                </>
              ) : (
                l('Không có công việc nào trong thùng rác', 'No tasks in trash')
              )}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {l('Đóng', 'Close')}
            </button>
          </div>
        </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
