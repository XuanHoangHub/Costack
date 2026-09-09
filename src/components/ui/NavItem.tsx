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
            "apexa-nav-item apexa-nav-item-collapsed group relative flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-[14px] border transition-all duration-150 active:scale-92 hover:scale-105",
            isDragging
              ? "opacity-35 scale-95 border-dashed border-sky-400/60 bg-sky-500/10 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
              : isActive
                ? "border-blue-200/90 bg-blue-100/80 text-blue-600 shadow-xs ring-1 ring-blue-300/40 dark:border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-400/25 dark:shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                : "border-transparent text-slate-500 hover:border-slate-200/70 hover:bg-slate-100/90 hover:text-slate-900 dark:text-zinc-400 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.08] dark:hover:text-white",
          ].join(" ")}
        >
          <Icon
            size={19}
            weight={isActive ? "fill" : "regular"}
            className={`shrink-0 transition-all duration-150 ${isActive ? 'text-blue-600 dark:text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.35)]' : ''}`}
          />

          {/* Unread / Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white font-black text-[8.5px] flex items-center justify-center ring-2 ring-white dark:ring-[#09090b] z-30 shadow-sm">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Rich Floating Flyout Card on Hover */}
          <div className="pointer-events-none absolute left-full top-1/2 z-[120] ml-3.5 flex -translate-y-1/2 min-w-[200px] max-w-[260px] flex-col gap-1.5 rounded-2xl border border-slate-200/90 dark:border-white/12 bg-white/98 dark:bg-[#0a0a0c]/98 p-3.5 text-left opacity-0 shadow-[0_12px_36px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 scale-95 group-hover:scale-100 origin-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-100/90 text-blue-600 dark:bg-sky-500/20 dark:text-sky-300' : 'bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300'}`}>
                  <Icon size={15} weight={isActive ? "fill" : "regular"} />
                </div>
                <span className="font-bold text-[13px] text-slate-900 dark:text-white tracking-tight truncate">{label}</span>
              </div>
            </div>

            {description && (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug pl-[30px]">
                {description}
              </p>
            )}

            {(badge || (count !== undefined && count > 0)) && (
              <div className="mt-0.5 flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-white/10 pl-[30px]">
                {badge && (
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200 dark:bg-sky-400/20 dark:text-sky-300 dark:border-sky-400/30">
                    {badge}
                  </span>
                )}
                {count !== undefined && count > 0 && (
                  <span className="text-[8.5px] font-black text-rose-500 bg-rose-50 border border-rose-200 dark:text-rose-400 dark:bg-rose-500/15 dark:border-rose-500/30 px-1.5 py-0.5 rounded">
                    {count} {isVietnamese ? 'chưa đọc' : 'unread'}
                  </span>
                )}
              </div>
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
          "apexa-nav-item group relative flex h-[38px] min-h-[38px] w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all duration-150 border active:scale-[0.98]",
          isDragging
            ? "opacity-35 scale-[0.98] border-dashed border-sky-400/60 bg-sky-500/10 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
            : isActive
              ? "border-blue-200/70 bg-blue-50/90 text-blue-700 dark:border-sky-500/30 dark:bg-gradient-to-r dark:from-blue-600/20 dark:via-blue-600/15 dark:to-sky-500/10 dark:text-white font-semibold shadow-xs"
              : "border-transparent text-slate-600 hover:border-slate-200/70 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.05] dark:hover:text-zinc-100 font-medium",
        ].join(" ")}
      >
        {/* Active Left Indicator */}
        {isActive && (
          <motion.div
            layoutId="sidebarActivePill"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="apexa-nav-active-marker absolute left-1 top-2 bottom-2 w-1 rounded-full bg-blue-600 dark:bg-sky-400"
          />
        )}

        {/* Icon Frame */}
        <div className={[
          "apexa-nav-item-icon relative flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
          isActive
            ? "bg-blue-100/90 text-blue-600 dark:bg-sky-500/20 dark:text-sky-300"
            : "text-slate-400 group-hover:text-slate-700 dark:text-zinc-400 dark:group-hover:text-zinc-200",
        ].join(" ")}>
          <Icon
            size={17.5}
            weight={isActive ? "fill" : "regular"}
            className="shrink-0 transition-transform duration-150"
          />
        </div>

        {/* Label Text */}
        <span className={[
          "truncate text-[13px] tracking-tight flex-1 text-left",
          isActive ? "text-blue-700 dark:text-white font-bold" : "text-slate-700 group-hover:text-slate-950 dark:text-zinc-300 dark:group-hover:text-white",
        ].join(" ")}>
          {displayText}
        </span>

        {/* Count Badge */}
        {count !== undefined && count > 0 && (
          <span className={[
            "font-black flex items-center justify-center shrink-0 tabular-nums transition-all ml-auto min-w-[17px] h-[17px] px-1 rounded-full text-[9px]",
            isActive
              ? "bg-rose-500 text-white"
              : "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 group-hover:bg-rose-500 group-hover:text-white",
          ].join(" ")}>
            {count > 99 ? "99+" : count}
          </span>
        )}

        {/* Feature Badge */}
        {badge && (
          <span className={[
            "apexa-nav-feature-badge ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border transition-all",
            badge === 'Enterprise' || badge === 'ENTERPRISE'
              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-400/30"
              : badge === 'AMIS'
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/30"
                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-sky-400/20 dark:text-sky-300 dark:border-sky-400/30"
          ].join(" ")}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default NavItem;
