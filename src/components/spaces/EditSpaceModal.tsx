"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cog, X, Trash2, Plus } from 'lucide-react';
import { Space, TaskStatus } from '@/types';
import EmojiIconPicker from '../EmojiIconPicker';
import { useTranslation } from '@/contexts/TranslationContext';
import { createPortal } from 'react-dom';
import type { PromptModalConfig } from '../PromptModal';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface EditSpaceData {
  id: string;
  name: string;
  emoji: string;
  themeColor: string;
  clickApps: any;
  statuses: any[];
}

interface EditSpaceModalProps {
  isOpen: boolean;
  space: Space | null;
  onClose: () => void;
  onSave: (data: EditSpaceData) => void;
  onDelete: (spaceId: string) => void;
  setPromptModalConfig: (config: PromptModalConfig | null) => void;
  triggerToast: (type: any, title: string, message: string, options?: any) => void;
  locale?: string;
}

const SPACE_COLORS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'sunset', label: 'Sunset', bg: 'bg-orange-500' },
];

export default function EditSpaceModal({
  isOpen,
  space,
  onClose,
  onSave,
  onDelete,
  setPromptModalConfig,
  triggerToast,
  locale: propLocale,
}: EditSpaceModalProps) {
  const { t, locale: ctxLocale } = useTranslation();
  const locale = propLocale || ctxLocale;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [themeColor, setThemeColor] = useState('indigo');
  const [clickApps, setClickApps] = useState<any>({ subtasks: true, priorities: true });
  const [statuses, setStatuses] = useState<any[]>([]);

  useEffect(() => {
    if (space && isOpen) {
      setName(space.name || '');
      setEmoji(space.emoji || '📦');
      setThemeColor(space.themeColor || 'indigo');
      setClickApps(space.clickApps || { subtasks: true, priorities: true });
      setStatuses(space.statuses || [
        { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
        { id: 'inprogress', label: 'In Progress', color: '#f59e0b', type: 'inprogress' },
        { id: 'review', label: 'Review', color: '#06b6d4', type: 'review' },
        { id: 'completed', label: 'Done', color: '#10b981', type: 'completed' }
      ]);
    }
  }, [space, isOpen]);

  if (!isOpen || !space) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: space.id,
      name: name.trim(),
      emoji,
      themeColor,
      clickApps,
      statuses,
    });
  };

  return (
    <Portal>
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        >
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="fixed inset-0 bg-slate-950/60 cursor-pointer" 
          />

          <motion.div 
            initial={{ scale: 0.95, y: 15, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: 15, opacity: 0 }} 
            className="relative w-full max-w-lg max-h-[min(90vh,720px)] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-5 sm:p-6 overflow-hidden z-10 text-left flex flex-col my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-850 dark:text-white flex items-center gap-2">
                <Cog className="w-4 h-4 text-indigo-500" />
                <span>{t('spaceSettingsTitle') || (locale === 'vi' ? 'Cài đặt Không gian' : 'Space Settings')}</span>
              </h3>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                  {t('spaceName') || (locale === 'vi' ? 'Tên Không gian' : 'Space Name')}
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none focus:border-indigo-500 dark:text-white transition-all" 
                />
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                  {t('themeColor') || (locale === 'vi' ? 'Màu chủ đề' : 'Theme Color')}
                </label>
                <div className="flex gap-2">
                  {SPACE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setThemeColor(c.id)}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer ${c.bg} ${
                        themeColor === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Space Icon */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                  {t('spaceIcon') || (locale === 'vi' ? 'Biểu tượng không gian' : 'Space Icon')}
                </label>
                <EmojiIconPicker value={emoji} onChange={setEmoji} />
              </div>

              {/* ClickApps Configuration */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  {locale === 'vi' ? 'Tính năng mở rộng (Apps)' : 'Active Apps'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'customFields', label: 'Custom Fields' },
                    { key: 'timeTracking', label: 'Time Tracking' },
                    { key: 'relationships', label: 'Relationships & References' },
                    { key: 'subtasks', label: 'Subtasks' },
                    { key: 'priorities', label: 'Task Priorities' }
                  ].map(app => (
                    <label 
                      key={app.key} 
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                    >
                      <input 
                        type="checkbox" 
                        checked={!!clickApps[app.key]} 
                        onChange={e => setClickApps({ ...clickApps, [app.key]: e.target.checked })} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" 
                      />
                      <span className="truncate">{app.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Statuses Configuration */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  {t('customStatuses') || (locale === 'vi' ? 'Trạng thái công việc' : 'Task Statuses')}
                </span>
                <div className="space-y-1.5">
                  {statuses.map((status) => (
                    <div key={status.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: status.color }} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase flex-1 truncate">{status.label}</span>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-black uppercase shrink-0">{status.type}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (statuses.length <= 2) {
                            triggerToast('info', t('notification') || 'Notification', 'You must keep at least 2 statuses.');
                            return;
                          }
                          setStatuses(prev => prev.filter(s => s.id !== status.id));
                        }} 
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      setPromptModalConfig({
                        isOpen: true,
                        type: 'status',
                        title: t('addCustomStatus') || (locale === 'vi' ? 'Thêm trạng thái công việc' : 'Add custom status'),
                        placeholder: t('enterNewStatus') || (locale === 'vi' ? 'Nhập tên trạng thái mới...' : 'Enter new status name...'),
                        confirmText: locale === 'vi' ? 'Thêm trạng thái' : 'Add Status',
                        onConfirm: (statusName) => {
                          setPromptModalConfig(null);
                          if (!statusName) return;
                          const colors = ['#94a3b8', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#a855f7'];
                          const newStatus = {
                            id: `status-${Date.now()}`,
                            label: statusName,
                            color: colors[Math.floor(Math.random() * colors.length)],
                            type: 'inprogress' as TaskStatus
                          };
                          setStatuses(prev => [...prev, newStatus]);
                        },
                        onCancel: () => setPromptModalConfig(null)
                      });
                    }}
                    className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl cursor-pointer text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addCustomStatus') || '+ Add new task status'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 sm:gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  onDelete(space.id);
                  onClose();
                }} 
                className="mr-auto py-2 px-3 sm:px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
              >
                {t('deleteSpace') || (locale === 'vi' ? 'Xóa không gian' : 'Delete Space')}
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                className="py-2 px-3 sm:px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
              >
                {t('cancel') || (locale === 'vi' ? 'Hủy' : 'Cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleSave} 
                className="py-2 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors shadow-md shadow-blue-500/20"
              >
                {t('saveSettings') || (locale === 'vi' ? 'Lưu cài đặt' : 'Save Settings')}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}
