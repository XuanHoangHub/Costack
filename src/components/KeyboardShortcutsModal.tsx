"use client";

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Command, Search, X } from 'lucide-react';

type KeyboardShortcutsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
};

const ShortcutKey = ({ children }: { children: ReactNode }) => (
  <kbd className="min-w-7 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-center font-mono text-[10px] font-black text-slate-600 shadow-[0_1px_0_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
    {children}
  </kbd>
);

export default function KeyboardShortcutsModal({ isOpen, onClose, locale = 'en' }: KeyboardShortcutsModalProps) {
  const vi = locale === 'vi';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const groups = [
    {
      title: vi ? 'Điều hướng toàn cục' : 'Global navigation',
      items: [
        { label: vi ? 'Tìm kiếm & Command Center' : 'Search & Command Center', keys: ['Ctrl', 'K'] },
        { label: vi ? 'Mở danh sách lệnh' : 'Open command list', keys: ['/'] },
        { label: vi ? 'Trang tổng quan' : 'Home overview', keys: ['H'] },
        { label: 'Inbox', keys: ['I'] },
        { label: vi ? 'Phân tích' : 'Dashboards & analytics', keys: ['D'] },
        { label: vi ? 'Thu gọn/mở sidebar' : 'Toggle sidebar', keys: ['Ctrl', '\\'] },
      ],
    },
    {
      title: vi ? 'Công việc & chế độ xem' : 'Tasks & views',
      items: [
        { label: vi ? 'Mở tất cả công việc' : 'Open all tasks', keys: ['T'] },
        { label: vi ? 'Chế độ Danh sách' : 'List view', keys: ['L'] },
        { label: vi ? 'Chế độ Bảng Kanban' : 'Board view', keys: ['B'] },
        { label: vi ? 'Chế độ Lịch' : 'Calendar view', keys: ['C'] },
      ],
    },
    {
      title: vi ? 'Trong hộp thoại' : 'Inside dialogs',
      items: [
        { label: vi ? 'Chọn kết quả' : 'Select result', keys: ['Enter'] },
        { label: vi ? 'Kết quả tiếp theo/trước' : 'Next/previous result', keys: ['↑', '↓'] },
        { label: vi ? 'Đóng cửa sổ' : 'Close dialog', keys: ['Esc'] },
        { label: vi ? 'Mở bảng phím tắt' : 'Open shortcut guide', keys: ['?'] },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label={vi ? 'Đóng bảng phím tắt' : 'Close shortcuts'}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b0c14]/95"
          >
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20"><Command className="h-5 w-5" /></span>
                <div>
                  <h2 id="keyboard-shortcuts-title" className="text-sm font-black text-slate-900 dark:text-white">{vi ? 'Phím tắt Apexa' : 'Apexa keyboard shortcuts'}</h2>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">{vi ? 'Điều hướng nhanh, không rời bàn phím.' : 'Navigate your workspace without leaving the keyboard.'}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid max-h-[65vh] gap-5 overflow-y-auto p-5 sm:grid-cols-2">
              {groups.map(group => (
                <section key={group.title} className="space-y-2.5">
                  <h3 className="px-1 text-[9.5px] font-black uppercase tracking-[0.16em] text-slate-400">{group.title}</h3>
                  <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/60 dark:border-slate-800 dark:bg-white/[0.025]">
                    {group.items.map((item, index) => (
                      <div key={item.label} className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${index ? 'border-t border-slate-200/60 dark:border-slate-800' : ''}`}>
                        <span className="text-[11px] font-bold text-slate-650 dark:text-slate-300">{item.label}</span>
                        <span className="flex shrink-0 items-center gap-1">{item.keys.map(key => <ShortcutKey key={key}>{key}</ShortcutKey>)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200/70 bg-slate-50/60 px-5 py-3 text-[10px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-white/[0.02]">
              <Search className="h-3.5 w-3.5 text-indigo-500" />
              <span>{vi ? 'Mẹo: nhập / trong Command Center để xem mọi hành động.' : 'Tip: type / in Command Center to browse every action.'}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
