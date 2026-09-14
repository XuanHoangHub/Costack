"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, FolderPlus, Palette, Sparkles, Check, 
  Trash2, Layers, AlertCircle, Info, ChevronRight
} from 'lucide-react';
import { SidebarZone, useUiStore, DEFAULT_SIDEBAR_ORDER } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface SidebarZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone?: SidebarZone | null;
  sidebarItemsMeta?: Record<string, {
    label: string;
    icon: React.ComponentType<any>;
    badge?: string;
    description?: string;
  }>;
  onSave?: (zoneData: {
    name: string;
    emoji: string;
    color: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
    itemIds: string[];
  }) => void;
  onDelete?: (zoneId: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

const COLOR_PRESETS: Array<{
  id: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  labelVi: string;
  labelEn: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  ringClass: string;
}> = [
  { id: 'sky', labelVi: 'Xanh trời', labelEn: 'Sky', bgClass: 'bg-sky-500/20', borderClass: 'border-sky-500/40', textClass: 'text-sky-400', ringClass: 'ring-sky-400' },
  { id: 'indigo', labelVi: 'Chàm', labelEn: 'Indigo', bgClass: 'bg-indigo-500/20', borderClass: 'border-indigo-500/40', textClass: 'text-indigo-400', ringClass: 'ring-indigo-400' },
  { id: 'emerald', labelVi: 'Ngọc lục bảo', labelEn: 'Emerald', bgClass: 'bg-emerald-500/20', borderClass: 'border-emerald-500/40', textClass: 'text-emerald-400', ringClass: 'ring-emerald-400' },
  { id: 'amber', labelVi: 'Hổ phách', labelEn: 'Amber', bgClass: 'bg-amber-500/20', borderClass: 'border-amber-500/40', textClass: 'text-amber-400', ringClass: 'ring-amber-400' },
  { id: 'rose', labelVi: 'Hồng phấn', labelEn: 'Rose', bgClass: 'bg-rose-500/20', borderClass: 'border-rose-500/40', textClass: 'text-rose-400', ringClass: 'ring-rose-400' },
  { id: 'purple', labelVi: 'Tím hoa cà', labelEn: 'Purple', bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/40', textClass: 'text-purple-400', ringClass: 'ring-purple-400' },
];

const EMOJI_OPTIONS = [
  '📁', '💼', '📊', '🚀', '⚡', '🎯', '💬', '🏢', 
  '💡', '🛠️', '📌', '🌟', '📚', '🔒', '🎨', '🧭'
];

const SUGGESTED_NAMES = [
  { vi: 'Dự án & Không gian', en: 'Projects & Spaces', emoji: '🚀', color: 'sky' },
  { vi: 'Điều hành & Báo cáo', en: 'Operations & Reports', emoji: '📊', color: 'indigo' },
  { vi: 'Giao tiếp & Đội ngũ', en: 'Team & Collaboration', emoji: '💬', color: 'emerald' },
  { vi: 'Tài chính & Kế toán', en: 'Finance & Invoicing', emoji: '💼', color: 'amber' },
  { vi: 'Tài liệu & Wiki', en: 'Docs & Knowledge', emoji: '📚', color: 'purple' },
] as const;

export function SidebarZoneModal({
  isOpen,
  onClose,
  zone,
  sidebarItemsMeta,
  onSave,
  onDelete,
  triggerToast,
}: SidebarZoneModalProps) {
  const { locale, t } = useTranslation();
  const isVi = locale === 'vi';

  const sidebarZones = useUiStore((s) => s.sidebarZones || []);
  const createSidebarZone = useUiStore((s) => s.createSidebarZone);
  const updateSidebarZone = useUiStore((s) => s.updateSidebarZone);
  const deleteSidebarZone = useUiStore((s) => s.deleteSidebarZone);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState<'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple'>('sky');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(zone);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      if (zone) {
        setName(zone.name);
        setEmoji(zone.emoji || '📁');
        setColor(zone.color || 'sky');
        setSelectedItemIds([...zone.itemIds]);
      } else {
        setName('');
        setEmoji('📁');
        setColor('sky');
        setSelectedItemIds([]);
      }
      setError(null);
    }
  }, [isOpen, zone]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine item occupancy across other zones
  const itemZoneMap = useMemo(() => {
    const map = new Map<string, { zoneId: string; zoneName: string }>();
    sidebarZones.forEach((z) => {
      if (zone && z.id === zone.id) return; // ignore current editing zone
      z.itemIds.forEach((itemId) => {
        map.set(itemId, { zoneId: z.id, zoneName: z.name });
      });
    });
    return map;
  }, [sidebarZones, zone]);

  // Available modules to pick from
  const allModules = useMemo(() => {
    return DEFAULT_SIDEBAR_ORDER;
  }, []);

  if (!isOpen) return null;

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleApplyPreset = (preset: typeof SUGGESTED_NAMES[number]) => {
    setName(isVi ? preset.vi : preset.en);
    setEmoji(preset.emoji);
    setColor(preset.color);
    if (typeof window !== 'undefined') {
      (window as any).playSystemSound?.('toggle');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(isVi ? 'Vui lòng nhập tên cho Vùng làm việc' : 'Please enter a Zone name');
      return;
    }

    if (isEditing && zone) {
      if (onSave) {
        onSave({ name: trimmedName, emoji, color, itemIds: selectedItemIds });
      } else {
        updateSidebarZone(zone.id, {
          name: trimmedName,
          emoji,
          color,
          itemIds: selectedItemIds,
        });
      }
      triggerToast?.(
        'success',
        isVi ? 'Đã cập nhật Vùng' : 'Zone Updated',
        isVi ? `Đã lưu thay đổi cho vùng "${trimmedName}"` : `Saved changes for zone "${trimmedName}"`
      );
    } else {
      if (onSave) {
        onSave({ name: trimmedName, emoji, color, itemIds: selectedItemIds });
      } else {
        createSidebarZone({
          name: trimmedName,
          emoji,
          color,
          itemIds: selectedItemIds,
          isCollapsed: false,
        });
      }
      triggerToast?.(
        'success',
        isVi ? 'Đã tạo Vùng mới' : 'Zone Created',
        isVi ? `Vùng "${trimmedName}" đã được tạo thành công` : `Zone "${trimmedName}" was created successfully`
      );
    }

    if (typeof window !== 'undefined') {
      (window as any).playSystemSound?.('pop');
    }

    onClose();
  };

  const handleDelete = () => {
    if (!zone) return;
    if (onDelete) {
      onDelete(zone.id);
    } else {
      deleteSidebarZone(zone.id);
    }
    triggerToast?.(
      'info',
      isVi ? 'Đã xóa Vùng' : 'Zone Deleted',
      isVi 
        ? `Đã xóa vùng "${zone.name}". Các module đã được đưa trở lại thanh bên.`
        : `Deleted zone "${zone.name}". Modules moved back to sidebar.`
    );
    if (typeof window !== 'undefined') {
      (window as any).playSystemSound?.('click');
    }
    onClose();
  };

  const activeColorConfig = COLOR_PRESETS.find(c => c.id === color) || COLOR_PRESETS[0];

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
        />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-slate-200/90 dark:border-white/12 bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeColorConfig.bgClass} ${activeColorConfig.textClass} border ${activeColorConfig.borderClass} shadow-[0_0_12px_rgba(56,189,248,0.15)] text-lg`}>
              {emoji}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {isEditing 
                  ? (isVi ? 'Chỉnh sửa Vùng làm việc' : 'Edit Workspace Zone')
                  : (isVi ? 'Tạo Vùng làm việc mới' : 'Create Workspace Zone')}
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${activeColorConfig.bgClass} ${activeColorConfig.textClass} ${activeColorConfig.borderClass}`}>
                  ZONE
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {isVi 
                  ? 'Gom nhóm các tính năng liên quan thành thư mục để thanh bên luôn gọn gàng' 
                  : 'Group related modules into a folder-like section in your sidebar'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Quick presets */}
          {!isEditing && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3 w-3 text-sky-400" />
                {isVi ? 'Gợi ý nhanh' : 'Quick Presets'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_NAMES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:border-blue-500/40 hover:bg-slate-200/70 dark:hover:border-sky-500/40 dark:hover:bg-white/[0.08] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <span>{preset.emoji}</span>
                    <span>{isVi ? preset.vi : preset.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name & Emoji input row */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              {isVi ? 'Tên Vùng làm việc' : 'Zone Name'} <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-white/[0.05] text-lg hover:border-slate-300 dark:hover:border-white/25 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                  title={isVi ? 'Chọn biểu tượng' : 'Choose icon'}
                >
                  {emoji}
                </button>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={isVi ? 'Ví dụ: Điều hành, Dự án, Tài chính...' : 'e.g., Operations, Projects, Finance...'}
                autoFocus
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Emoji palette */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 custom-scrollbar">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-all cursor-pointer ${
                    emoji === em 
                      ? 'bg-sky-500/25 border border-sky-400 scale-110 shadow-[0_0_8px_rgba(56,189,248,0.3)]' 
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>

            {error && (
              <p className="flex items-center gap-1 text-xs text-rose-400 mt-1.5 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Color accent selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 mb-2">
              <Palette className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
              {isVi ? 'Màu sắc nhận diện' : 'Color Accent'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = color === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setColor(preset.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${preset.borderClass} ${preset.bgClass} ring-2 ${preset.ringClass} shadow-[0_0_10px_rgba(255,255,255,0.08)]`
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${preset.bgClass} border ${preset.borderClass}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">
                      {isVi ? preset.labelVi : preset.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module selection list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
                {isVi ? 'Chọn module đưa vào Vùng' : 'Select Modules to Include'}
              </label>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                {selectedItemIds.length} {isVi ? 'đã chọn' : 'selected'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] divide-y divide-slate-100 dark:divide-white/[0.05] max-h-56 overflow-y-auto custom-scrollbar">
              {allModules.map((itemId) => {
                const isChecked = selectedItemIds.includes(itemId);
                const otherZone = itemZoneMap.get(itemId);
                const meta = sidebarItemsMeta?.[itemId];
                const label = meta?.label || itemId;
                const IconComponent = meta?.icon || Layers;

                return (
                  <div
                    key={itemId}
                    onClick={() => handleToggleItem(itemId)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] cursor-pointer transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isChecked 
                          ? `${activeColorConfig.bgClass} ${activeColorConfig.textClass}` 
                          : 'bg-slate-200/70 dark:bg-white/[0.06] text-slate-500 dark:text-zinc-400'
                      }`}>
                        <IconComponent size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isChecked ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-zinc-300'}`}>
                          {label}
                        </p>
                        {otherZone && (
                          <p className="text-[10px] text-amber-500 dark:text-amber-400/80 truncate">
                            {isVi ? `Đang thuộc "${otherZone.zoneName}"` : `Currently in "${otherZone.zoneName}"`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      isChecked
                        ? `${activeColorConfig.borderClass} ${activeColorConfig.bgClass} ${activeColorConfig.textClass}`
                        : 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/[0.05] text-transparent'
                    }`}>
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0" />
              {isVi 
                ? 'Bạn cũng có thể kéo thả trực tiếp các module vào Vùng bất kỳ lúc nào trên thanh bên.' 
                : 'You can also drag and drop modules directly into the Zone anytime from the sidebar.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08]">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isVi ? 'Xóa Vùng này' : 'Delete Zone'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                {isVi ? 'Hủy bỏ' : 'Cancel'}
              </button>

              <button
                type="submit"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${
                  color === 'indigo' ? 'from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600' :
                  color === 'emerald' ? 'from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600' :
                  color === 'amber' ? 'from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600' :
                  color === 'rose' ? 'from-rose-600 to-pink-700 hover:from-rose-500 hover:to-pink-600' :
                  color === 'purple' ? 'from-purple-600 to-violet-700 hover:from-purple-500 hover:to-violet-600' :
                  'from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500'
                } shadow-md shadow-sky-500/20 active:scale-95 transition-all cursor-pointer`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>{isEditing ? (isVi ? 'Lưu thay đổi' : 'Save Changes') : (isVi ? 'Tạo Vùng' : 'Create Zone')}</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
    </Portal>
  );
}
