"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, ChevronRight, MoreHorizontal, Edit3, 
  Trash2, Plus, ArrowUp, ArrowDown, GripVertical, Layers
} from 'lucide-react';
import { SidebarZone, useUiStore } from '@/store/uiStore';
import { NavItem } from '@/components/ui/NavItem';
import { useTranslation } from '@/contexts/TranslationContext';

export interface SidebarZoneGroupProps {
  zone: SidebarZone;
  collapsed?: boolean;
  activeTab: string;
  activeSpaceId: string | null;
  activeListId: string | null;
  sidebarItemsMeta: Record<string, {
    label: string;
    icon: React.ComponentType<any>;
    count?: number;
    badge?: string;
    shortcut?: string;
    description?: string;
  }>;
  draggedItemId: string | null;
  dragOverItemId: string | null;
  dragOverSide: 'top' | 'bottom' | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOverItem: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDropOnItem: (e: React.DragEvent, targetId: string) => void;
  onDropOnZone: (e: React.DragEvent, zoneId: string) => void;
  onItemClick: (id: string, label: string) => void;
  onEditZone: (zone: SidebarZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onMoveZone?: (zoneId: string, direction: 'up' | 'down') => void;
  isFirstZone?: boolean;
  isLastZone?: boolean;
  getShortLabel?: (label: string) => string;
}

const COLOR_MAP: Record<string, {
  border: string;
  bg: string;
  text: string;
  glow: string;
  dot: string;
  badge: string;
}> = {
  sky: {
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    glow: 'rgba(56, 189, 248, 0.25)',
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  indigo: {
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    glow: 'rgba(99, 102, 241, 0.25)',
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  emerald: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: 'rgba(52, 211, 153, 0.25)',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  amber: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    glow: 'rgba(251, 191, 36, 0.25)',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  rose: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    glow: 'rgba(244, 63, 94, 0.25)',
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  purple: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    glow: 'rgba(192, 132, 252, 0.25)',
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
};

export function SidebarZoneGroup({
  zone,
  collapsed = false,
  activeTab,
  activeSpaceId,
  activeListId,
  sidebarItemsMeta,
  draggedItemId,
  dragOverItemId,
  dragOverSide,
  onDragStart,
  onDragOverItem,
  onDragLeave,
  onDragEnd,
  onDropOnItem,
  onDropOnZone,
  onItemClick,
  onEditZone,
  onDeleteZone,
  onMoveZone,
  isFirstZone = false,
  isLastZone = false,
  getShortLabel = (l) => l.slice(0, 2),
}: SidebarZoneGroupProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const toggleSidebarZoneCollapse = useUiStore((s) => s.toggleSidebarZoneCollapse);

  const [showMenu, setShowMenu] = useState(false);
  const [isDragOverZoneHeader, setIsDragOverZoneHeader] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCollapsed = Boolean(zone.isCollapsed);
  const zoneColor = COLOR_MAP[zone.color || 'sky'] || COLOR_MAP.sky;

  // Aggregate unread count from items inside this zone
  const totalUnreadCount = zone.itemIds.reduce((sum, id) => {
    const meta = sidebarItemsMeta[id];
    return sum + (meta?.count || 0);
  }, 0);

  // Check if any item inside this zone is active
  const hasActiveChild = zone.itemIds.some((id) => {
    if (id === 'tasks') {
      return activeTab === 'tasks' && activeSpaceId === null && activeListId === null;
    }
    return activeTab === id;
  });

  // Close context menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Handle drag over zone header
  const handleZoneHeaderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId && !isDragOverZoneHeader) {
      setIsDragOverZoneHeader(true);
    }
  };

  const handleZoneHeaderDragLeave = (e: React.DragEvent) => {
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOverZoneHeader(false);
    }
  };

  const handleZoneHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverZoneHeader(false);
    onDropOnZone(e, zone.id);
  };

  // ─────────────────────────────────────────────────────────────
  // COLLAPSED SIDEBAR MODE (Mini-rail 56px)
  // ─────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="relative my-1 flex flex-col items-center group/zone">
        {/* Main Zone Mini Icon Button */}
        <button
          type="button"
          onClick={() => toggleSidebarZoneCollapse(zone.id)}
          onDragOver={handleZoneHeaderDragOver}
          onDragLeave={handleZoneHeaderDragLeave}
          onDrop={handleZoneHeaderDrop}
          aria-label={zone.name}
          title={zone.name}
          className={`relative flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-[13px] border transition-all duration-150 active:scale-92 hover:scale-105 ${
            isDragOverZoneHeader
              ? 'border-sky-400 bg-sky-500/25 ring-2 ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)] scale-108'
              : hasActiveChild
                ? `${zoneColor.border} ${zoneColor.bg} text-slate-900 dark:text-white ring-1 ${zoneColor.border}`
                : 'border-slate-200/80 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white'
          }`}
        >
          {/* Zone Accent Dot */}
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${zoneColor.dot} ring-2 ring-white dark:ring-[var(--sidebar-bg)] shadow-sm`} />

          {/* Emoji */}
          <span className="text-sm select-none">{zone.emoji || '📁'}</span>

          {/* Unread badge if any */}
          {totalUnreadCount > 0 && (
            <span className="absolute -bottom-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white font-black text-[8px] flex items-center justify-center ring-2 ring-white dark:ring-[var(--sidebar-bg)] shadow-sm">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}

          {/* Hover Flyout Card */}
          <div className="pointer-events-none absolute left-full top-1/2 z-[130] ml-3.5 flex -translate-y-1/2 min-w-[220px] max-w-[280px] flex-col gap-2 rounded-2xl border border-slate-200 dark:border-white/12 bg-white/98 dark:bg-[#0c0d12]/98 p-3 text-left opacity-0 shadow-[0_12px_36px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-150 group-hover/zone:opacity-100 group-hover/zone:pointer-events-auto scale-95 group-hover/zone:scale-100 origin-left">
            {/* Flyout Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{zone.emoji || '📁'}</span>
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{zone.name}</span>
              </div>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${zoneColor.badge}`}>
                {zone.itemIds.length} {isVi ? 'mục' : 'items'}
              </span>
            </div>

            {/* Flyout Items List */}
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {zone.itemIds.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic py-1 text-center">
                  {isVi ? 'Chưa có module nào trong vùng này' : 'No modules in this zone'}
                </p>
              ) : (
                zone.itemIds.map((itemId) => {
                  const meta = sidebarItemsMeta[itemId];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  const isActive = itemId === 'tasks'
                    ? (activeTab === 'tasks' && activeSpaceId === null && activeListId === null)
                    : activeTab === itemId;

                  return (
                    <button
                      key={`flyout-${itemId}`}
                      type="button"
                      onClick={() => onItemClick(itemId, meta.label)}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                          : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <Icon size={14} className="shrink-0 text-zinc-400" />
                      <span className="text-xs truncate flex-1">{meta.label}</span>
                      {meta.count !== undefined && meta.count > 0 && (
                        <span className="min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white font-bold text-[8px] flex items-center justify-center">
                          {meta.count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick edit button in flyout */}
            <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
              <button
                type="button"
                onClick={() => onEditZone(zone)}
                className="flex items-center gap-1 hover:text-sky-300 transition-colors cursor-pointer"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>{isVi ? 'Sửa vùng' : 'Edit Zone'}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleSidebarZoneCollapse(zone.id)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {isCollapsed ? (isVi ? 'Mở rộng' : 'Expand') : (isVi ? 'Thu gọn' : 'Collapse')}
              </button>
            </div>
          </div>
        </button>

        {/* When expanded in collapsed rail, render mini items below with color dot indicator */}
        {!isCollapsed && zone.itemIds.length > 0 && (
          <div className="flex flex-col items-center space-y-1 mt-1 pl-1 border-l-2 border-white/10">
            {zone.itemIds.map((itemId) => {
              const meta = sidebarItemsMeta[itemId];
              if (!meta) return null;
              const isActive = itemId === 'tasks'
                ? (activeTab === 'tasks' && activeSpaceId === null && activeListId === null)
                : activeTab === itemId;

              return (
                <NavItem
                  key={itemId}
                  icon={meta.icon}
                  label={meta.label}
                  shortLabel={getShortLabel(meta.label)}
                  shortcut={meta.shortcut}
                  description={meta.description}
                  isActive={isActive}
                  count={meta.count}
                  badge={meta.badge}
                  disabled={(meta as any).disabled}
                  disabledTooltip={(meta as any).disabledTooltip}
                  collapsed={true}
                  isDragging={draggedItemId === itemId}
                  onDragStart={(e) => onDragStart(e, itemId)}
                  onDragOver={(e) => onDragOverItem(e, itemId)}
                  onDragLeave={onDragLeave}
                  onDragEnd={onDragEnd}
                  onDrop={(e) => onDropOnItem(e, itemId)}
                  onClick={() => onItemClick(itemId, meta.label)}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EXPANDED SIDEBAR MODE
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="relative my-1.5 select-none">
      {/* Zone Header Bar */}
      <div
        onDragOver={handleZoneHeaderDragOver}
        onDragLeave={handleZoneHeaderDragLeave}
        onDrop={handleZoneHeaderDrop}
        className={`group relative flex items-center justify-between rounded-xl px-2 py-1.5 transition-all duration-150 border border-transparent ${
          isDragOverZoneHeader
            ? 'border-sky-400 bg-sky-500/20 ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.35)] scale-[1.01]'
            : 'hover:border-slate-200/80 hover:bg-slate-100/60 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.04]'
        }`}
      >
        {/* Clickable Area to Toggle Collapse */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleSidebarZoneCollapse(zone.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSidebarZoneCollapse(zone.id);
            }
          }}
          className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer"
        >
          {/* Chevron Indicator */}
          <div className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 group-hover:text-slate-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-transform">
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>

          {/* Zone Icon / Emoji */}
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${zoneColor.bg} border ${zoneColor.border} text-xs`}>
            {zone.emoji || '📁'}
          </div>

          {/* Zone Title */}
          <span className="truncate text-[10.5px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors">
            {zone.name}
          </span>

          {/* Total items badge */}
          <span className={`shrink-0 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${zoneColor.badge}`}>
            {zone.itemIds.length}
          </span>

          {/* Total Unread Notification Badge */}
          {totalUnreadCount > 0 && (
            <span className="ml-auto min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white font-bold text-[8.5px] flex items-center justify-center shadow-xs tabular-nums">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </div>

        {/* Options Menu Trigger */}
        <div className="relative shrink-0 ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="flex h-5.5 w-5.5 items-center justify-center rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Tùy chọn vùng"
            title={isVi ? 'Tùy chọn Vùng' : 'Zone Options'}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-200/90 dark:border-white/12 bg-white dark:bg-[#121318] p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  {zone.name}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEditZone(zone);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                  <span>{isVi ? 'Sửa vùng & màu' : 'Edit Zone'}</span>
                </button>

                {onMoveZone && (
                  <>
                    {!isFirstZone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onMoveZone(zone.id, 'up');
                        }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
                        <span>{isVi ? 'Di chuyển lên' : 'Move Up'}</span>
                      </button>
                    )}
                    {!isLastZone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onMoveZone(zone.id, 'down');
                        }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
                        <span>{isVi ? 'Di chuyển xuống' : 'Move Down'}</span>
                      </button>
                    )}
                  </>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-white/[0.08]" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDeleteZone(zone.id);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isVi ? 'Xóa Vùng' : 'Delete Zone'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapsible Content Area */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key={`zone-content-${zone.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative ml-2.5 pl-2 border-l border-slate-200/80 dark:border-white/[0.08] space-y-0.5 pt-0.5 pb-1">
              {zone.itemIds.length === 0 ? (
                // Empty state placeholder - also acts as droppable target!
                <div
                  onDragOver={handleZoneHeaderDragOver}
                  onDragLeave={handleZoneHeaderDragLeave}
                  onDrop={handleZoneHeaderDrop}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border border-dashed text-center transition-all ${
                    isDragOverZoneHeader
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-sky-300 shadow-xs'
                      : 'border-slate-200/80 bg-slate-50/50 text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-500 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 mb-1 text-slate-400 dark:text-zinc-500 opacity-60" />
                  <p className="text-[11px] font-medium">
                    {isVi ? 'Kéo thả module vào đây' : 'Drop modules here'}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    {isVi ? 'Hoặc chọn trong phần sửa vùng' : 'Or select in edit zone'}
                  </p>
                </div>
              ) : (
                zone.itemIds.map((itemId) => {
                  const meta = sidebarItemsMeta[itemId];
                  if (!meta) return null;
                  const isActive = itemId === 'tasks'
                    ? (activeTab === 'tasks' && activeSpaceId === null && activeListId === null)
                    : activeTab === itemId;

                  return (
                    <NavItem
                      key={itemId}
                      icon={meta.icon}
                      label={meta.label}
                      shortLabel={getShortLabel(meta.label)}
                      shortcut={meta.shortcut}
                      description={meta.description}
                      isActive={isActive}
                      count={meta.count}
                      badge={meta.badge}
                      disabled={(meta as any).disabled}
                      disabledTooltip={(meta as any).disabledTooltip}
                      collapsed={false}
                      isDragging={draggedItemId === itemId}
                      onDragStart={(e) => onDragStart(e, itemId)}
                      onDragOver={(e) => onDragOverItem(e, itemId)}
                      onDragLeave={onDragLeave}
                      onDragEnd={onDragEnd}
                      onDrop={(e) => onDropOnItem(e, itemId)}
                      onClick={() => onItemClick(itemId, meta.label)}
                      dragIndicator={dragOverItemId === itemId && dragOverSide ? (
                        <div
                          className={`absolute left-1 right-1 h-1 z-30 pointer-events-none rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.9)] transition-all ${
                            dragOverSide === 'top' ? '-top-0.5' : '-bottom-0.5'
                          }`}
                        >
                          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-300 ring-2 ring-blue-500 shadow-[0_0_8px_rgba(56,189,248,1)]" />
                        </div>
                      ) : undefined}
                    />
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
