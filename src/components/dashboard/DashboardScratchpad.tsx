"use client";

import React, { useState, useEffect } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  ArrowUpRight,
  Pin,
  Check,
  Sparkles,
  Tag
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Task } from '@/types';

interface ScratchpadNote {
  id: string;
  title: string;
  content: string;
  color: 'amber' | 'emerald' | 'indigo' | 'rose';
  isPinned: boolean;
  createdAt: number;
}

interface DashboardScratchpadProps {
  onAddTask?: (task: Partial<Task>) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message', title: string, message: string) => void;
}

const COLOR_STYLES = {
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/25',
    border: 'border-amber-200/80 dark:border-amber-800/40',
    header: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    border: 'border-emerald-200/80 dark:border-emerald-800/40',
    header: 'text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-400',
  },
  indigo: {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/25',
    border: 'border-indigo-200/80 dark:border-indigo-800/40',
    header: 'text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-200/60 dark:bg-indigo-800/40 text-indigo-800 dark:text-indigo-300',
    dot: 'bg-indigo-400',
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/25',
    border: 'border-rose-200/80 dark:border-rose-800/40',
    header: 'text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-200/60 dark:bg-rose-800/40 text-rose-800 dark:text-rose-300',
    dot: 'bg-rose-400',
  },
};

const DEFAULT_NOTES: ScratchpadNote[] = [
  {
    id: 'note-default-1',
    title: 'Ý tưởng tối ưu quy trình',
    content: '1. Rút ngắn thời gian duyệt task\n2. Tích hợp AI tóm tắt cuộc họp hàng ngày',
    color: 'amber',
    isPinned: true,
    createdAt: Date.now(),
  },
  {
    id: 'note-default-2',
    title: 'Mục tiêu tuần',
    content: 'Hoàn thành báo cáo tài chính quý & kiểm tra hiệu suất tải trang',
    color: 'indigo',
    isPinned: false,
    createdAt: Date.now() - 3600000,
  },
];

export default function DashboardScratchpad({
  onAddTask,
  triggerToast,
}: DashboardScratchpadProps) {
  const { locale } = useTranslation();
  const [notes, setNotes] = useState<ScratchpadNote[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('apexa_dashboard_scratchpad');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_NOTES;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState<ScratchpadNote['color']>('amber');

  useEffect(() => {
    try {
      localStorage.setItem('apexa_dashboard_scratchpad', JSON.stringify(notes));
    } catch (e) {}
  }, [notes]);

  const handleCreateNote = () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    const note: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: newTitle.trim() || (locale === 'vi' ? 'Ghi chú mới' : 'New note'),
      content: newContent.trim(),
      color: newColor,
      isPinned: false,
      createdAt: Date.now(),
    };
    setNotes([note, ...notes]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã tạo ghi chú' : 'Note Created',
      locale === 'vi' ? 'Ghi chú đã được lưu vào bảng nháp.' : 'Note saved to scratchpad.'
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const handleTogglePin = (id: string) => {
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleConvertToTask = (note: ScratchpadNote) => {
    if (!onAddTask) return;

    onAddTask({
      title: note.title,
      description: note.content,
      priority: 'medium',
      status: 'todo',
      createdAt: new Date().toISOString(),
    });

    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã chuyển thành công việc!' : 'Converted to Task!',
      locale === 'vi'
        ? `Đã tạo công việc "${note.title}" từ ghi chú nháp.`
        : `Created task "${note.title}" from note.`
    );
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#12141d] text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Bảng nháp & Ghi chú nhanh' : 'Personal Scratchpad'}
              </h3>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">
                {notes.length} {locale === 'vi' ? 'mẩu nháp' : 'notes'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === 'vi'
                ? 'Lưu nhanh ý tưởng, việc cần nhớ và chuyển thành công việc với 1-click'
                : 'Quick thoughts, memos & 1-click convert to real tasks'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-600 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{locale === 'vi' ? 'Thêm ghi chú' : 'Add Note'}</span>
        </button>
      </div>

      {/* Inline Note Creation Form */}
      {isAdding && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20 space-y-3">
          <input
            type="text"
            placeholder={locale === 'vi' ? 'Tiêu đề ghi chú...' : 'Note title...'}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-amber-200 dark:border-amber-800 pb-1.5 outline-none placeholder:text-slate-400"
            autoFocus
          />
          <textarea
            rows={3}
            placeholder={locale === 'vi' ? 'Nội dung chi tiết (hỗ trợ nhiều dòng)...' : 'Note content...'}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full text-xs text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none resize-none placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
            {/* Color selection */}
            <div className="flex items-center gap-1.5">
              {(['amber', 'emerald', 'indigo', 'rose'] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`h-5 w-5 rounded-full ${COLOR_STYLES[color].dot} transition-transform ${
                    newColor === color ? 'scale-125 ring-2 ring-slate-400 dark:ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
              >
                {locale === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                {locale === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-4">
        {sortedNotes.map((note) => {
          const style = COLOR_STYLES[note.color] || COLOR_STYLES.amber;

          return (
            <div
              key={note.id}
              className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all hover:shadow-xs ${style.bg} ${style.border}`}
            >
              <div>
                {/* Note Top */}
                <div className="flex items-start justify-between gap-2 pb-2">
                  <h4 className={`text-xs font-black truncate flex-1 ${style.header}`}>
                    {note.title}
                  </h4>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(note.id)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        note.isPinned
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                      }`}
                      title={locale === 'vi' ? 'Ghim ghi chú' : 'Pin note'}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title={locale === 'vi' ? 'Xóa ghi chú' : 'Delete note'}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              {/* Bottom: 1-Click Convert to Task Button */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-[9.5px] text-slate-400 font-mono">
                  {new Date(note.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>

                <button
                  type="button"
                  onClick={() => handleConvertToTask(note)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all cursor-pointer"
                  title={locale === 'vi' ? 'Tạo việc thật từ ghi chú này' : 'Convert to actual workspace task'}
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>{locale === 'vi' ? 'Tạo việc' : 'Convert'}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
