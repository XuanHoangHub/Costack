"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, GripVertical, ChevronUp, ChevronDown, RotateCcw, 
  Check, SlidersHorizontal, Sparkles, LayoutDashboard,
  Inbox, Calendar, Target,
  Landmark, FileText, MessageSquare, Users, Layers
} from 'lucide-react';
import { DEFAULT_SIDEBAR_ORDER, useUiStore } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';

interface SidebarOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarOrder?: string[];
  setSidebarOrder?: (order: string[]) => void;
  sidebarItemsMeta?: Record<string, { 
    label: string; 
    icon: React.ComponentType<any>; 
    count?: number; 
    badge?: string; 
    description?: string;
  }>;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export function SidebarOrderModal({
  isOpen,
  onClose,
  sidebarOrder: propSidebarOrder,
  setSidebarOrder: propSetSidebarOrder,
  sidebarItemsMeta: propSidebarItemsMeta,
  triggerToast,
}: SidebarOrderModalProps) {
  const { locale, t } = useTranslation();
  const isVi = locale === 'vi';

  const storeSidebarOrder = useUiStore((s) => s.sidebarOrder);
  const storeSetSidebarOrder = useUiStore((s) => s.setSidebarOrder);

  const activeSidebarOrder = propSidebarOrder || storeSidebarOrder || DEFAULT_SIDEBAR_ORDER;
  const activeSetSidebarOrder = propSetSidebarOrder || storeSetSidebarOrder;

  // Fallback metadata for all 11 default modules
  const defaultMeta = useMemo<Record<string, { label: string; icon: React.ComponentType<any>; badge?: string; description?: string }>>(() => {
    return {
      dashboard: {
        label: t('homeOverview') || (isVi ? 'Tổng quan' : 'Home Overview'),
        icon: LayoutDashboard,
        description: isVi ? 'Tổng quan dự án & tiến độ chung' : 'Workspace overview & metrics',
      },
      inbox: {
        label: t('inbox') || (isVi ? 'Hộp thư' : 'Inbox'),
        icon: Inbox,
        description: isVi ? 'Thông báo công việc & lời mời' : 'Notifications & updates',
      },
      tasks: {
        label: t('space') || (isVi ? 'Không gian làm việc' : 'Spaces & Tasks'),
        icon: Layers,
        description: isVi ? 'Không gian làm việc & danh sách việc' : 'Spaces, lists & task tracking',
      },
      calendar: {
        label: t('calendarView') || (isVi ? 'Lịch trình' : 'Calendar'),
        icon: Calendar,
        description: isVi ? 'Lịch trình, mốc thời gian & deadline' : 'Calendar & milestone deadlines',
      },
      goals: {
        label: isVi ? 'Mục tiêu (OKRs)' : 'Goals & OKRs',
        icon: Target,
        badge: isVi ? 'Mới' : 'New',
        description: isVi ? 'Chiến lược mục tiêu & đo lường kết quả' : 'Strategic goals & measurable OKRs',
      },
      finance: {
        label: isVi ? 'Tài chính & Kế toán' : 'Finance & Accounting',
        icon: Landmark,
        description: isVi ? 'Thu chi, hóa đơn & báo cáo tài chính' : 'Finance invoicing & accounting',
      },
      docs: {
        label: t('docs') || (isVi ? 'Tài liệu' : 'Docs'),
        icon: FileText,
        description: isVi ? 'Tài liệu kiến thức, quy trình & Wiki' : 'Collaborative documents & Wiki',
      },
      chat: {
        label: t('chat') || (isVi ? 'Trò chuyện' : 'Chat'),
        icon: MessageSquare,
        description: isVi ? 'Kênh thảo luận & tin nhắn tức thời' : 'Channels & instant messaging',
      },
      team: {
        label: isVi ? 'Đội nhóm' : 'Team',
        icon: Users,
        description: isVi ? 'Danh bạ thành viên & phân quyền' : 'Team directory & workspace roles',
      },
    };
  }, [isVi, t]);

  const resolvedMeta = propSidebarItemsMeta || defaultMeta;

  // Ensure all valid items are present in current order
  const validOrder = useMemo(() => {
    const defaultItems = DEFAULT_SIDEBAR_ORDER;
    const current = [...activeSidebarOrder];
    defaultItems.forEach(id => {
      if (!current.includes(id)) {
        current.push(id);
      }
    });
    return current.filter(id => id in resolvedMeta);
  }, [activeSidebarOrder, resolvedMeta]);

  const [items, setItems] = useState<string[]>(validOrder);
  const [draggedModalItemId, setDraggedModalItemId] = useState<string | null>(null);
  const [dragOverModalItemId, setDragOverModalItemId] = useState<string | null>(null);

  // Sync internal items when validOrder changes externally
  useEffect(() => {
    setItems(validOrder);
  }, [validOrder]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setItems(newItems);
    activeSetSidebarOrder(newItems);

    if (typeof window !== 'undefined') {
      (window as any).playSystemSound?.('toggle');
    }
  };

  const handleModalDragStart = (e: React.DragEvent, id: string) => {
    setDraggedModalItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleModalDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedModalItemId && draggedModalItemId !== id) {
      setDragOverModalItemId(id);
    }
  };

  const handleModalDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedModalItemId || draggedModalItemId === targetId) {
      setDraggedModalItemId(null);
      setDragOverModalItemId(null);
      return;
    }

    const currentIndex = items.indexOf(draggedModalItemId);
    const targetIndex = items.indexOf(targetId);

    if (currentIndex !== -1 && targetIndex !== -1) {
      const newItems = [...items];
      const [moved] = newItems.splice(currentIndex, 1);
      newItems.splice(targetIndex, 0, moved);

      setItems(newItems);
      activeSetSidebarOrder(newItems);

      if (typeof window !== 'undefined') {
        (window as any).playSystemSound?.('toggle');
      }

      const meta = resolvedMeta[draggedModalItemId];
      triggerToast?.(
        'success',
        isVi ? 'Đã đổi vị trí module' : 'Module Reordered',
        isVi
          ? `Đã di chuyển "${meta?.label || draggedModalItemId}" đến vị trí mới`
          : `Moved "${meta?.label || draggedModalItemId}" to new position`
      );
    }

    setDraggedModalItemId(null);
    setDragOverModalItemId(null);
  };

  const handleResetDefault = () => {
    const defaultOrder = [...DEFAULT_SIDEBAR_ORDER];
    setItems(defaultOrder);
    activeSetSidebarOrder(defaultOrder);

    if (typeof window !== 'undefined') {
      (window as any).playSystemSound?.('click');
    }

    triggerToast?.(
      'info',
      isVi ? 'Đã khôi phục mặc định' : 'Reset to Default',
      isVi 
        ? 'Thứ tự các module đã được đặt lại về cấu hình chuẩn ban đầu'
        : 'Sidebar module order has been reset to default'
    );
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-white/12 bg-[#0d0e14] text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {isVi ? 'Tùy chỉnh & Sắp xếp Module' : 'Customize Sidebar Modules'}
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {items.length} {isVi ? 'Module' : 'Modules'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isVi 
                  ? 'Kéo thả hoặc dùng nút mũi tên để thay đổi thứ tự hiển thị trên thanh bên' 
                  : 'Drag and drop or use arrow buttons to arrange sidebar navigation items'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Notice bar */}
        <div className="px-5 py-2.5 bg-sky-500/[0.06] border-b border-sky-500/15 flex items-center justify-between text-xs text-sky-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-sky-400" />
            <span>
              {isVi 
                ? 'Thứ tự mới sẽ tự động lưu và áp dụng ngay lập tức cho tài khoản của bạn.' 
                : 'Changes are automatically saved and applied immediately.'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-sky-300 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-white/[0.06]"
            title={isVi ? 'Khôi phục về thứ tự gốc ban đầu' : 'Reset to original default order'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isVi ? 'Khôi phục mặc định' : 'Reset default'}</span>
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-1.5">
          <AnimatePresence initial={false}>
            {items.map((id, index) => {
              const meta = resolvedMeta[id];
              if (!meta) return null;
              const Icon = meta.icon;
              const isFirst = index === 0;
              const isLast = index === items.length - 1;
              const isDragged = draggedModalItemId === id;
              const isOver = dragOverModalItemId === id;

              return (
                <motion.div
                  key={id}
                  layout
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  draggable
                  onDragStart={(e) => handleModalDragStart(e as any, id)}
                  onDragOver={(e) => handleModalDragOver(e as any, id)}
                  onDragEnd={() => {
                    setDraggedModalItemId(null);
                    setDragOverModalItemId(null);
                  }}
                  onDrop={(e) => handleModalDrop(e as any, id)}
                  className={[
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 select-none",
                    isDragged
                      ? "opacity-35 scale-[0.98] border-dashed border-sky-400/60 bg-sky-500/10"
                      : isOver
                        ? "border-sky-400 bg-sky-500/15 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.06]"
                  ].join(" ")}
                >
                  {/* Position number & Drag Grip */}
                  <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
                    <span className="w-5 text-right font-mono text-[11px] font-bold text-zinc-500 group-hover:text-zinc-400">
                      #{index + 1}
                    </span>
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-sky-400 hover:bg-white/[0.08] transition-colors"
                      title={isVi ? 'Kéo để đổi vị trí' : 'Drag to reorder'}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sky-400 border border-white/[0.08] group-hover:border-sky-500/30 group-hover:bg-sky-500/10 transition-all">
                    <Icon size={18} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white tracking-tight truncate">
                        {meta.label}
                      </span>
                      {meta.badge && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    {meta.description && (
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {meta.description}
                      </p>
                    )}
                  </div>

                  {/* Reorder Buttons (Up / Down) */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveItem(index, 'up')}
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
                        isFirst
                          ? "opacity-25 border-transparent text-zinc-600 cursor-not-allowed"
                          : "border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/[0.1] active:scale-90 cursor-pointer"
                      ].join(" ")}
                      title={isVi ? 'Di chuyển lên trên' : 'Move up'}
                      aria-label={isVi ? 'Di chuyển lên' : 'Move up'}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveItem(index, 'down')}
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
                        isLast
                          ? "opacity-25 border-transparent text-zinc-600 cursor-not-allowed"
                          : "border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/[0.1] active:scale-90 cursor-pointer"
                      ].join(" ")}
                      title={isVi ? 'Di chuyển xuống dưới' : 'Move down'}
                      aria-label={isVi ? 'Di chuyển xuống' : 'Move down'}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.08] bg-white/[0.02]">
          <span className="text-xs text-zinc-400">
            {isVi 
              ? 'Mẹo: Bạn cũng có thể kéo thả trực tiếp trên thanh bên.' 
              : 'Tip: You can also drag & drop directly on the sidebar.'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-black active:scale-95 transition-all shadow-[0_0_16px_rgba(56,189,248,0.35)] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isVi ? 'Hoàn tất' : 'Done'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default SidebarOrderModal;
