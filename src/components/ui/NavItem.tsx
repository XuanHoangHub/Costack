"use client";

import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "@/contexts/TranslationContext";

interface NavItemProps {
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string; strokeWidth?: number }>;
  label: string;
  shortLabel?: string;
  isActive?: boolean;
  count?: number;
  badge?: string;
  shortcut?: string;
  description?: string;
  collapsed?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  disabled?: boolean;
  disabledTooltip?: string;
  style?: React.CSSProperties;
  dragIndicator?: React.ReactNode;
}

function NavItemComponent({
  icon: Icon,
  label,
  shortLabel,
  isActive = false,
  count,
  badge,
  shortcut,
  description,
  collapsed = false,
  isDragging = false,
  disabled = false,
  disabledTooltip,
  onClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  style,
  dragIndicator,
}: NavItemProps) {
  const { isVietnamese } = useTranslation();
  const displayText = collapsed ? shortLabel || label : label;
  const effectiveIsActive = !disabled && isActive;
  const tooltipText = disabled ? (disabledTooltip || (isVietnamese ? 'Tính năng đang phát triển' : 'Feature under development')) : label;

  if (collapsed) {
    return (
      <div 
        className="relative my-0.5 flex w-full items-center justify-center"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragIndicator}

        <button
          type="button"
          draggable={!disabled && Boolean(onDragStart)}
          onDragStart={!disabled ? onDragStart : undefined}
          onDragEnd={!disabled ? onDragEnd : undefined}
          onClick={onClick}
          aria-label={label}
          aria-disabled={disabled}
          aria-current={effectiveIsActive ? "page" : undefined}
          title={tooltipText}
          style={style}
          className={[
            "apexa-nav-item apexa-nav-item-collapsed group relative flex h-9 w-9 select-none items-center justify-center rounded-xl transition-all duration-150 active:scale-95",
            disabled
              ? "cursor-not-allowed opacity-60 border border-transparent text-slate-400 hover:text-slate-500 hover:bg-slate-100/50 dark:text-zinc-500 dark:hover:text-zinc-400 dark:hover:bg-white/[0.03]"
              : isDragging
                ? "opacity-35 scale-95 border border-dashed border-blue-500/60 bg-blue-500/10 shadow-xs cursor-pointer"
                : effectiveIsActive
                  ? "border border-blue-200 bg-blue-50/90 text-blue-600 shadow-xs dark:border-sky-500/30 dark:bg-blue-500/15 dark:text-sky-300 ring-1 ring-blue-500/20 cursor-pointer"
                  : "border border-transparent text-slate-500 hover:border-slate-200/80 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer",
          ].join(" ")}
        >
          <Icon
            size={19}
            strokeWidth={effectiveIsActive ? 2.1 : 1.85}
            className={`shrink-0 transition-transform duration-150 ${disabled ? '' : 'group-hover:scale-105'} ${effectiveIsActive ? 'text-blue-600 dark:text-sky-300' : ''}`}
          />

          {/* Unread / Count Badge */}
          {!disabled && count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white font-bold text-[8.5px] flex items-center justify-center ring-2 ring-white dark:ring-[#121318] z-30 shadow-xs tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Rich Floating Flyout Card on Hover: ClickUp / Notion SaaS Popover */}
          <div className="pointer-events-none absolute left-full top-1/2 z-[120] ml-2.5 flex -translate-y-1/2 min-w-[190px] max-w-[250px] flex-col gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-2.5 text-left opacity-0 shadow-xl backdrop-blur-xl transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 scale-95 group-hover:scale-100 origin-left dark:border-white/[0.12] dark:bg-[#121318]/95 dark:shadow-[0_12px_32px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1 rounded-md flex items-center justify-center shrink-0 ${
                  disabled
                    ? 'bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-zinc-500'
                    : effectiveIsActive
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-sky-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300'
                }`}>
                  <Icon size={14} strokeWidth={effectiveIsActive ? 2 : 1.8} />
                </div>
                <span className="font-bold text-xs text-slate-900 dark:text-white tracking-tight truncate">{label}</span>
              </div>
              {shortcut && !disabled && (
                <kbd className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-white/[0.08] border border-slate-200/60 dark:border-white/10 shrink-0">
                  {shortcut}
                </kbd>
              )}
            </div>
            {disabled && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                <span>🚧 {isVietnamese ? 'Tính năng đang phát triển' : 'Under development'}</span>
              </div>
            )}
            {description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                {description}
              </p>
            )}
            {!disabled && count !== undefined && count > 0 && (
              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-[10.5px]">
                <span className="text-slate-400 dark:text-zinc-500">{isVietnamese ? 'Cần xử lý' : 'Pending'}</span>
                <span className="font-bold text-blue-600 dark:text-sky-300">{count}</span>
              </div>
            )}
          </div>
        </button>
      </div>
    );
  }

  // Expanded View Mode: High-density ClickUp/Notion ergonomics (32px standard height)
  return (
    <div 
      className="relative w-full my-0.5"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragIndicator}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        draggable={!disabled && Boolean(onDragStart)}
        onDragStart={!disabled ? onDragStart : undefined}
        onDragEnd={!disabled ? onDragEnd : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={label}
        aria-current={effectiveIsActive ? "page" : undefined}
        title={tooltipText}
        style={style}
        className={[
          "apexa-nav-item group relative flex h-8 min-h-[32px] w-full select-none items-center gap-2 rounded-lg px-2.5 py-1 text-left transition-all duration-150 active:scale-[0.99]",
          disabled
            ? "cursor-not-allowed opacity-65 border border-transparent text-slate-400 hover:bg-slate-100/40 dark:text-zinc-500 dark:hover:bg-white/[0.03]"
            : isDragging
              ? "opacity-35 scale-[0.98] border border-dashed border-blue-500/60 bg-blue-500/10 cursor-pointer"
              : effectiveIsActive
                ? "border border-blue-200/80 bg-blue-50/90 text-blue-700 dark:border-sky-500/25 dark:bg-blue-500/15 dark:text-white font-semibold shadow-2xs cursor-pointer"
                : "border border-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white font-medium cursor-pointer",
        ].join(" ")}
      >
        {/* Active Left Indicator Marker */}
        {effectiveIsActive && (
          <motion.div
            layoutId="sidebarActivePill"
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            className="apexa-nav-active-marker absolute left-0 top-1 bottom-1 w-0.75 rounded-r-full bg-blue-600 dark:bg-sky-400 dark:shadow-[0_0_8px_rgba(56,189,248,0.7)]"
          />
        )}

        {/* Icon Frame */}
        <div className={[
          "apexa-nav-item-icon relative flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all duration-150",
          disabled
            ? "text-slate-400 dark:text-zinc-600"
            : effectiveIsActive
              ? "text-blue-600 dark:text-sky-300"
              : "text-slate-500 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 group-hover:scale-105",
        ].join(" ")}>
          <Icon
            size={17}
            strokeWidth={effectiveIsActive ? 2 : 1.8}
            className="shrink-0 transition-transform duration-150"
          />
        </div>

        {/* Label Text */}
        <span className={[
          "truncate text-[12.5px] tracking-tight flex-1 text-left",
          disabled
            ? "text-slate-400 dark:text-zinc-500 font-medium"
            : effectiveIsActive
              ? "text-blue-700 dark:text-white font-semibold"
              : "text-slate-700 group-hover:text-slate-950 dark:text-zinc-400 dark:group-hover:text-white",
        ].join(" ")}>
          {displayText}
        </span>

        {/* Count Badge */}
        {!disabled && count !== undefined && count > 0 && (
          <span className={[
            "font-bold flex items-center justify-center shrink-0 tabular-nums transition-all ml-auto min-w-[17px] h-[17px] px-1 rounded-full text-[9px] border",
            effectiveIsActive
              ? "bg-blue-600 text-white border-blue-600 dark:bg-sky-400 dark:text-slate-950 dark:border-sky-400"
              : "bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-white/[0.08] dark:text-slate-300 dark:border-white/10",
          ].join(" ")}>
            {count > 99 ? "99+" : count}
          </span>
        )}

        {/* Shortcut Chip (Reveals subtly on hover) */}
        {!disabled && shortcut && !badge && count === undefined && (
          <kbd className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            {shortcut}
          </kbd>
        )}

        {/* Feature Badge */}
        {badge && (
          <span className={`apexa-nav-feature-badge ml-auto shrink-0 rounded px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-wider border ${
            disabled
              ? 'border-slate-200/60 bg-slate-100/60 text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-zinc-500'
              : 'border-slate-200/80 bg-slate-100/70 text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-400'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export const NavItem = React.memo(NavItemComponent);
export default NavItem;
