"use client";

import React, { useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  Flag,
  User as UserIcon,
  Folder,
  Sparkles,
  Check
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task, User, Space, Priority } from '@/types';
import SignedImage from '../SignedImage';

interface DashboardQuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask?: (task: Partial<Task>) => void;
  members: User[];
  spaces?: Space[];
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message', title: string, message: string) => void;
}

export default function DashboardQuickTaskModal({
  isOpen,
  onClose,
  onAddTask,
  members,
  spaces = [],
  triggerToast,
}: DashboardQuickTaskModalProps) {
  const { locale } = useTranslation();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [spaceId, setSpaceId] = useState(spaces[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      onAddTask?.({
        title: title.trim(),
        priority,
        status: 'todo',
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
        assigneeIds: assigneeId ? [assigneeId] : [],
        spaceId: spaceId || undefined,
        createdAt: new Date().toISOString(),
      });

      triggerToast?.(
        'success',
        locale === 'vi' ? 'Đã tạo công việc' : 'Task Created',
        locale === 'vi' ? `Công việc "${title.trim()}" đã sẵn sàng.` : `Task "${title.trim()}" has been created.`
      );

      setTitle('');
      setDueDate('');
      setAssigneeId('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPresetDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs text-left animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#151824] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Tạo công việc nhanh' : 'Quick Task Creation'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {locale === 'vi' ? 'Thêm việc ngay vào hàng đợi mà không cần rời Dashboard' : 'Instantly queue a task without leaving Dashboard'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              {locale === 'vi' ? 'Tên công việc *' : 'Task Title *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder={locale === 'vi' ? 'Ví dụ: Thiết kế giao diện báo cáo mới...' : 'e.g. Design new report layout...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-3xs"
            />
          </div>

          {/* Quick Presets for Due Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>{locale === 'vi' ? 'Hạn chót' : 'Due Date'}</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(0)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {locale === 'vi' ? 'Hôm nay' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(1)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {locale === 'vi' ? 'Ngày mai' : 'Tomorrow'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(7)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {locale === 'vi' ? 'Tuần sau' : 'Next week'}
                </button>
              </div>
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
            />
          </div>

          {/* Grid: Priority & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-indigo-500" />
                <span>{locale === 'vi' ? 'Độ ưu tiên' : 'Priority'}</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
              >
                <option value="urgent">{locale === 'vi' ? '🔴 Khẩn cấp (Urgent)' : '🔴 Urgent'}</option>
                <option value="high">{locale === 'vi' ? '🟠 Cao (High)' : '🟠 High'}</option>
                <option value="medium">{locale === 'vi' ? '🔵 Trung bình (Medium)' : '🔵 Medium'}</option>
                <option value="low">{locale === 'vi' ? '⚪ Thấp (Low)' : '⚪ Low'}</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>{locale === 'vi' ? 'Người phụ trách' : 'Assignee'}</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
              >
                <option value="">{locale === 'vi' ? 'Chưa giao ai' : 'Unassigned'}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Space / Project selector if spaces exist */}
          {spaces.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-indigo-500" />
                <span>{locale === 'vi' ? 'Không gian / Dự án' : 'Space / Project'}</span>
              </label>
              <select
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/25 cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{locale === 'vi' ? 'Tạo công việc' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
