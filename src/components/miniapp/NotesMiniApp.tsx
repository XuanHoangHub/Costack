"use client";

import React, { useState, useEffect } from 'react';
import {
  FileText, Copy, Check, Download, Trash2, Plus, Sparkles,
  Bold, Italic, List, ListChecks, Code, Eye, Edit3, Share2
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  color?: string;
}

interface NotesMiniAppProps {
  onExportToDoc?: (title: string, content: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

const STORAGE_KEY = 'apexa_scratchpad_notes';

const NOTE_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

export default function NotesMiniApp({ onExportToDoc, triggerToast }: NotesMiniAppProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [isPreview, setIsPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          setActiveNoteId(parsed[0].id);
          return;
        }
      }
    } catch (e) {}

    // Default note
    const defaultNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: isVi ? 'Ghi chú ý tưởng nhanh' : 'Quick Idea Scratchpad',
      content: isVi
        ? `# Ý tưởng công việc hôm nay\n\n- [x] Rà soát tiến độ dự án tuần này\n- [ ] Gặp đối tác trao đổi về hợp đồng mới\n- [ ] Cập nhật bảng kế hoạch mục tiêu OKRs\n\n> Ghi chú này được tự động lưu vào bộ nhớ đệm và bạn có thể chuyển thành Apexa Doc bất kỳ lúc nào!`
        : `# Today's Quick Thoughts\n\n- [x] Review this week's roadmap\n- [ ] Sync with client about new deliverable\n- [ ] Refine OKR milestones\n\n> This note is automatically saved offline. Click 'Export to Doc' to publish to Document Hub anytime!`,
      updatedAt: new Date().toISOString(),
      color: '#f59e0b',
    };
    setNotes([defaultNote]);
    setActiveNoteId(defaultNote.id);
  }, [isVi]);

  // Persist notes
  const saveNotes = (updated: NoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const updateCurrentNote = (titleUpdates: string, contentUpdates: string) => {
    if (!activeNote) return;
    const updated = notes.map((n) =>
      n.id === activeNote.id
        ? {
            ...n,
            title: titleUpdates,
            content: contentUpdates,
            updatedAt: new Date().toISOString(),
          }
        : n
    );
    saveNotes(updated);
  };

  const createNewNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: isVi ? 'Ghi chú mới' : 'New Note',
      content: '',
      updatedAt: new Date().toISOString(),
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
    };
    const updated = [newNote, ...notes];
    saveNotes(updated);
    setActiveNoteId(newNote.id);
  };

  const deleteCurrentNote = () => {
    if (notes.length <= 1) {
      // Clear content instead of deleting last note
      updateCurrentNote(isVi ? 'Ghi chú mới' : 'New Note', '');
      return;
    }
    const filtered = notes.filter((n) => n.id !== activeNoteId);
    saveNotes(filtered);
    setActiveNoteId(filtered[0].id);
    triggerToast?.('info', isVi ? 'Đã xóa ghi chú' : 'Note deleted', '');
  };

  const copyContent = () => {
    if (!activeNote?.content) return;
    navigator.clipboard.writeText(activeNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    triggerToast?.('success', isVi ? 'Đã sao chép nội dung' : 'Content copied to clipboard', '');
  };

  const handleExport = () => {
    if (!activeNote) return;
    if (onExportToDoc) {
      onExportToDoc(activeNote.title, activeNote.content);
      triggerToast?.('success', isVi ? 'Đã xuất sang Docs Hub' : 'Exported to Docs Hub', activeNote.title);
    } else {
      copyContent();
    }
  };

  const insertSnippet = (prefix: string, suffix: string = '') => {
    if (!activeNote) return;
    const textarea = document.getElementById('scratchpad-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeNote.content;
    const selected = text.substring(start, end);
    const replacement = prefix + selected + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    updateCurrentNote(activeNote.title, newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const wordCount = activeNote?.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0;
  const charCount = activeNote?.content.length || 0;

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-transparent">
      {/* Sidebar: Note list */}
      <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-200/90 dark:border-white/10 flex flex-col shrink-0 bg-slate-50/50 dark:bg-zinc-950/20">
        <div className="p-3.5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 font-black text-sm">📝</span>
            <span className="text-xs font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
              {isVi ? 'Ghi chú nháp' : 'Scratchpads'}
            </span>
          </div>

          <button
            type="button"
            onClick={createNewNote}
            className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title={isVi ? 'Tạo ghi chú mới' : 'Create new note'}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {notes.map((n) => {
            const isSelected = n.id === activeNoteId;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setActiveNoteId(n.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800/80 shadow-xs border border-slate-200/90 dark:border-white/15'
                    : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.04] text-slate-600 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: n.color || '#f59e0b' }}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {n.title || (isVi ? 'Không có tiêu đề' : 'Untitled')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate mt-1 pl-4.5">
                  {n.content ? n.content.replace(/[#*`_\[\]]/g, '').slice(0, 50) : (isVi ? 'Chưa có nội dung...' : 'Empty note...')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Editor Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Editor Toolbar */}
        <div className="px-4 py-2.5 border-b border-slate-200/90 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-slate-50/30 dark:bg-white/[0.01]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertSnippet('**', '**')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-bold"
              title="Đậm (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('*', '*')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-bold"
              title="Nghiêng (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('- ')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-bold"
              title="Danh sách"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('- [ ] ')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-bold"
              title="Checklist"
            >
              <ListChecks className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('`', '`')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10 text-xs font-bold"
              title="Mã code"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                isPreview
                  ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
              }`}
            >
              {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPreview ? (isVi ? 'Soạn thảo' : 'Edit') : (isVi ? 'Xem trước' : 'Preview')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mr-2">
              {wordCount} {isVi ? 'từ' : 'words'} · {charCount} {isVi ? 'ký tự' : 'chars'}
            </span>

            <button
              type="button"
              onClick={copyContent}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-3xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isVi ? 'Đã sao chép' : 'Copied') : (isVi ? 'Sao chép' : 'Copy')}</span>
            </button>

            {onExportToDoc && (
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isVi ? 'Xuất sang Doc' : 'Export to Doc'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={deleteCurrentNote}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title={isVi ? 'Xóa ghi chú này' : 'Delete note'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Title Input */}
        <div className="px-6 pt-4 pb-2">
          <input
            type="text"
            value={activeNote?.title || ''}
            onChange={(e) => updateCurrentNote(e.target.value, activeNote?.content || '')}
            placeholder={isVi ? 'Tiêu đề ghi chú...' : 'Note title...'}
            className="w-full text-xl sm:text-2xl font-black text-slate-900 dark:text-white bg-transparent outline-none border-none placeholder:text-slate-300 dark:placeholder:text-zinc-600"
          />
        </div>

        {/* Note Body: Edit or Markdown Preview */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar">
          {isPreview ? (
            <div className="prose dark:prose-invert max-w-none text-sm text-slate-800 dark:text-zinc-200 whitespace-pre-wrap font-sans">
              {activeNote?.content || (
                <span className="italic text-slate-400 dark:text-zinc-600">
                  {isVi ? 'Chưa có nội dung xem trước' : 'No content to preview'}
                </span>
              )}
            </div>
          ) : (
            <textarea
              id="scratchpad-textarea"
              value={activeNote?.content || ''}
              onChange={(e) => updateCurrentNote(activeNote?.title || '', e.target.value)}
              placeholder={isVi ? 'Bắt đầu viết ghi chú, ý tưởng hoặc dán văn bản vào đây...' : 'Start jotting down thoughts, checklist, or snippets here...'}
              className="w-full h-full min-h-[300px] resize-none bg-transparent text-sm leading-relaxed text-slate-800 dark:text-zinc-200 outline-none font-mono placeholder:text-slate-300 dark:placeholder:text-zinc-600"
            />
          )}
        </div>
      </div>
    </div>
  );
}
