"use client";

import React from "react";
import { motion } from "motion/react";

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
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDragEnd?: () => void;
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
  shortcut,
  description,
  collapsed = false,
  onClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  style,
  dragIndicator,
}: NavItemProps) {
  const displayText = collapsed ? shortLabel || label : label;

  if (collapsed) {
    return (
      <div className="relative my-0.5 flex w-full items-center justify-center">
        {dragIndicator}

        <motion.button
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          draggable={Boolean(onDragStart)}
          onDragStart={onDragStart as any}
          onDragOver={onDragOver as any}
          onDragLeave={onDragLeave as any}
          onDragEnd={onDragEnd as any}
          onDrop={onDrop as any}
          onClick={onClick}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
          style={style}
          className={[
            "apexa-nav-item apexa-nav-item-collapsed group relative flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-xl border transition-all duration-150",
            isActive
              ? "border-sky-500/35 bg-sky-500/15 text-white ring-1 ring-sky-400/20 shadow-2xs"
              : "border-transparent text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.06] hover:text-white",
          ].join(" ")}
        >
          {/* Active side indicator */}
          {isActive && (
            <motion.div
              layoutId="collapsedSidebarActivePill"
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="apexa-nav-active-marker absolute -left-1 top-2 bottom-2 w-1 rounded-r-full bg-sky-400"
            />
          )}

          <Icon
            size={18}
            weight={isActive ? "fill" : "regular"}
            className="shrink-0 transition-transform duration-150"
          />

          {/* Unread / Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white font-black text-[8px] flex items-center justify-center ring-2 ring-[#09090b] z-30">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Rich Floating Flyout Card on Hover */}
          <div className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 flex -translate-y-1/2 min-w-[200px] max-w-[250px] flex-col gap-1.5 rounded-xl border border-white/10 bg-[#09090b]/98 p-3 text-left opacity-0 shadow-2xl backdrop-blur-2xl transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 scale-95 group-hover:scale-100 origin-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-500/20 text-sky-300' : 'bg-white/[0.08] text-slate-300'}`}>
                  <Icon size={15} weight={isActive ? "fill" : "regular"} />
                </div>
                <span className="font-bold text-[13px] text-white tracking-tight truncate">{label}</span>
              </div>
            </div>

            {description && (
              <p className="text-[11px] font-medium text-slate-400 leading-snug">
                {description}
              </p>
            )}

            {(badge || (count !== undefined && count > 0)) && (
              <div className="mt-1 flex items-center gap-1.5 pt-1.5 border-t border-white/10">
                {badge && (
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-sky-400/20 text-sky-300 border-sky-400/30">
                    {badge}
                  </span>
                )}
                {count !== undefined && count > 0 && (
                  <span className="text-[8.5px] font-black text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded">
                    {count} chưa đọc
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.button>
      </div>
    );
  }

  // Expanded View Mode
  return (
    <motion.button
      type="button"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDragLeave={onDragLeave as any}
      onDragEnd={onDragEnd as any}
      onDrop={onDrop as any}
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      style={style}
      className={[
        "apexa-nav-item group relative my-0.5 flex h-[38px] min-h-[38px] w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all duration-150 border",
        isActive
          ? "border-sky-500/30 bg-gradient-to-r from-blue-600/20 via-blue-600/15 to-sky-500/10 text-white font-semibold shadow-2xs"
          : "border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.05] hover:text-zinc-100 font-medium",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Active Left Indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebarActivePill"
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="apexa-nav-active-marker absolute -left-[2px] top-2 bottom-2 w-1 rounded-r-full bg-sky-400"
        />
      )}

      {/* Icon Frame */}
      <div className={[
        "apexa-nav-item-icon relative flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
        isActive
          ? "bg-sky-500/20 text-sky-300"
          : "text-zinc-400 group-hover:text-zinc-200",
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
        isActive ? "text-white font-semibold" : "text-zinc-300 group-hover:text-white",
      ].join(" ")}>
        {displayText}
      </span>

      {/* Count Badge */}
      {count !== undefined && count > 0 && (
        <span className={[
          "font-black flex items-center justify-center shrink-0 tabular-nums transition-all ml-auto min-w-[17px] h-[17px] px-1 rounded-full text-[9px]",
          isActive
            ? "bg-rose-500 text-white"
            : "bg-rose-500/20 text-rose-300 border border-rose-500/40 group-hover:bg-rose-500 group-hover:text-white",
        ].join(" ")}>
          {count > 99 ? "99+" : count}
        </span>
      )}

      {/* Feature Badge */}
      {badge && (
        <span className={[
          "ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border transition-all",
          badge === 'Enterprise' || badge === 'ENTERPRISE'
            ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/30"
            : badge === 'AMIS'
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
              : "bg-sky-400/20 text-sky-300 border-sky-400/30"
        ].join(" ")}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export default NavItem;
