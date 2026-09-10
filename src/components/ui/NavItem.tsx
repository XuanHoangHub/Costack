"use client";

import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "@/contexts/TranslationContext";

interface NavItemProps {
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>;
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
  style?: React.CSSProperties;
  dragIndicator?: React.ReactNode;
}

export function NavItem({
  icon: Icon,
  label,
  shortLabel,
  isActive = false,
  count,
  badge,
  description,
  collapsed = false,
  isDragging = false,
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

  if (collapsed) {
    return (
      <div 
        className="relative my-[3px] flex w-full items-center justify-center"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragIndicator}

        <button
          type="button"
          draggable={Boolean(onDragStart)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onClick}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
          style={style}
          className={[
            "apexa-nav-item apexa-nav-item-collapsed group relative flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-lg border transition-all duration-150 active:scale-95",
            isDragging
              ? "opacity-35 scale-95 border-dashed border-[#0071E3]/60 bg-[#0071E3]/10 shadow-xs"
              : isActive
                ? "border-black/[0.05] bg-black/[0.06] text-[#0071E3] dark:border-white/[0.08] dark:bg-white/[0.1] dark:text-[#0A84FF]"
                : "border-transparent text-slate-500 hover:border-black/[0.04] hover:bg-black/[0.03] hover:text-slate-900 dark:text-zinc-400 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.05] dark:hover:text-white",
          ].join(" ")}
        >
          <Icon
            size={18}
            weight={isActive ? "fill" : "regular"}
            className={`shrink-0 transition-all duration-150 ${isActive ? 'text-[#0071E3] dark:text-[#0A84FF]' : ''}`}
          />

          {/* Unread / Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white font-semibold text-[8px] flex items-center justify-center ring-2 ring-white dark:ring-[#121214] z-30 shadow-xs">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Rich Floating Flyout Card on Hover: Apple Popover */}
          <div className="pointer-events-none absolute left-full top-1/2 z-[120] ml-3 flex -translate-y-1/2 min-w-[180px] max-w-[240px] flex-col gap-1 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-[#1c1c1e]/95 p-3 text-left opacity-0 shadow-xl backdrop-blur-2xl transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 scale-95 group-hover:scale-100 origin-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-md flex items-center justify-center ${isActive ? 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]' : 'bg-black/[0.04] text-slate-700 dark:bg-white/[0.08] dark:text-slate-300'}`}>
                  <Icon size={14} weight={isActive ? "fill" : "regular"} />
                </div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white tracking-tight truncate">{label}</span>
              </div>
            </div>
            {description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </button>
      </div>
    );
  }

  // Expanded View Mode
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
        tabIndex={0}
        draggable={Boolean(onDragStart)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        style={style}
        className={[
          "apexa-nav-item group relative flex h-[34px] min-h-[34px] w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1 text-left transition-all duration-150 border active:scale-[0.99]",
          isDragging
            ? "opacity-35 scale-[0.98] border-dashed border-[#0071E3]/60 bg-[#0071E3]/10"
            : isActive
              ? "border-black/[0.04] bg-black/[0.05] text-[#0071E3] dark:border-white/[0.08] dark:bg-white/[0.09] dark:text-[#0A84FF] font-semibold"
              : "border-transparent text-slate-600 hover:bg-black/[0.03] hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-100 font-medium",
        ].join(" ")}
      >
        {/* Active Left Indicator */}
        {isActive && (
          <motion.div
            layoutId="sidebarActivePill"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="apexa-nav-active-marker absolute left-0.5 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]"
          />
        )}

        {/* Icon Frame */}
        <div className={[
          "apexa-nav-item-icon relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-150",
          isActive
            ? "text-[#0071E3] dark:text-[#0A84FF]"
            : "text-slate-400 group-hover:text-slate-700 dark:text-zinc-400 dark:group-hover:text-zinc-200",
        ].join(" ")}>
          <Icon
            size={16.5}
            weight={isActive ? "fill" : "regular"}
            className="shrink-0 transition-transform duration-150"
          />
        </div>

        {/* Label Text */}
        <span className={[
          "truncate text-[13px] tracking-tight flex-1 text-left",
          isActive ? "text-[#0071E3] dark:text-white font-semibold" : "text-slate-700 group-hover:text-slate-950 dark:text-zinc-300 dark:group-hover:text-white",
        ].join(" ")}>
          {displayText}
        </span>

        {/* Count Badge */}
        {count !== undefined && count > 0 && (
          <span className={[
            "font-semibold flex items-center justify-center shrink-0 tabular-nums transition-all ml-auto min-w-[16px] h-[16px] px-1 rounded-full text-[9px]",
            isActive
              ? "bg-[#0071E3] text-white dark:bg-[#0A84FF]"
              : "bg-black/[0.05] text-slate-600 dark:bg-white/[0.08] dark:text-slate-300",
          ].join(" ")}>
            {count > 99 ? "99+" : count}
          </span>
        )}

        {/* Feature Badge */}
        {badge && (
          <span className="apexa-nav-feature-badge ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-medium tracking-wide border border-black/[0.06] bg-black/[0.02] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default NavItem;
