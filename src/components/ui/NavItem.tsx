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
      <div className="relative my-1 flex w-full items-center justify-center">
        {dragIndicator}

        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
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
            "group relative flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-xl border transition-all duration-200",
            isActive
              ? "border-blue-400/50 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.5)] ring-1 ring-white/25"
              : "border-transparent text-slate-400 hover:border-white/[0.1] hover:bg-white/[0.08] hover:text-white",
          ].join(" ")}
        >
          {/* Active side indicator glow */}
          {isActive && (
            <motion.div
              layoutId="collapsedSidebarActivePill"
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="absolute -left-1.5 top-2.5 bottom-2.5 w-1 rounded-r-full bg-sky-400 shadow-[0_0_12px_#38bdf8]"
            />
          )}

          <Icon
            size={18}
            weight={isActive ? "fill" : "regular"}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
          />

          {/* Unread / Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white font-black text-[8.5px] flex items-center justify-center ring-2 ring-[#080d19] shadow-[0_0_8px_rgba(244,63,94,0.6)] z-30">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Rich Floating Flyout Card on Hover */}
          <div className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3.5 flex -translate-y-1/2 min-w-[210px] max-w-[260px] flex-col gap-1.5 rounded-2xl border border-white/12 bg-[#090e1a]/95 p-3 text-left opacity-0 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 scale-95 group-hover:scale-100 origin-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-500/20 text-sky-300' : 'bg-white/[0.08] text-slate-300'}`}>
                  <Icon size={14} weight={isActive ? "fill" : "regular"} />
                </div>
                <span className="font-extrabold text-[13px] text-white tracking-tight truncate">{label}</span>
              </div>
              {shortcut && (
                <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-300 shadow-xs shrink-0">
                  {shortcut}
                </kbd>
              )}
            </div>

            {description && (
              <p className="text-[11px] font-medium text-slate-400 leading-snug">
                {description}
              </p>
            )}

            {(badge || (count !== undefined && count > 0)) && (
              <div className="mt-1 flex items-center gap-1.5 pt-1.5 border-t border-white/10">
                {badge && (
                  <span className={[
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                    badge === 'Enterprise' || badge === 'ENTERPRISE'
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                      : badge === 'AMIS'
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                        : "bg-sky-400/20 text-sky-300 border-sky-400/30 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                  ].join(" ")}>
                    {badge}
                  </span>
                )}
                {count !== undefined && count > 0 && (
                  <span className="text-[9px] font-black text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md shadow-xs">
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
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
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
        "group relative my-0.5 flex min-h-[39px] w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all duration-200 border",
        isActive
          ? "border-blue-400/40 bg-gradient-to-r from-blue-600/90 via-blue-600/80 to-indigo-600/70 text-white font-bold shadow-[0_4px_20px_rgba(37,99,235,0.35)] ring-1 ring-white/20"
          : "border-transparent text-slate-300 hover:border-white/[0.08] hover:bg-white/[0.07] hover:text-white font-medium",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Active Glowing Left Pill */}
      {isActive && (
        <motion.div
          layoutId="sidebarActivePill"
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="absolute -left-[3px] top-2 bottom-2 w-1.5 rounded-r-full bg-sky-400 shadow-[0_0_12px_#38bdf8]"
        />
      )}

      {/* Icon Frame */}
      <div className={[
        "relative flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        isActive
          ? "bg-white/20 text-white shadow-xs"
          : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.09] group-hover:text-sky-300 group-hover:scale-105",
      ].join(" ")}>
        <Icon
          size={16.5}
          weight={isActive ? "fill" : "regular"}
          className="shrink-0 transition-transform duration-200"
        />
      </div>

      {/* Label Text */}
      <span className={[
        "truncate text-[13px] tracking-tight flex-1 text-left",
        isActive ? "text-white font-bold" : "text-slate-300 group-hover:text-white",
      ].join(" ")}>
        {displayText}
      </span>

      {/* Shortcut hint on hover */}
      {shortcut && !count && !badge && (
        <kbd className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[9px] font-bold text-slate-400 bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded-md shrink-0">
          {shortcut}
        </kbd>
      )}

      {/* Count Badge */}
      {count !== undefined && count > 0 && (
        <span className={[
          "font-black flex items-center justify-center shrink-0 tabular-nums transition-all ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[9px]",
          isActive
            ? "bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            : "bg-rose-500/20 text-rose-300 border border-rose-500/40 group-hover:bg-rose-500 group-hover:text-white",
        ].join(" ")}>
          {count > 99 ? "99+" : count}
        </span>
      )}

      {/* Feature Badge */}
      {badge && (
        <span className={[
          "ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider border transition-all",
          badge === 'Enterprise' || badge === 'ENTERPRISE'
            ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/30 shadow-[0_0_8px_rgba(99,102,241,0.15)]"
            : badge === 'AMIS'
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              : "bg-sky-400/20 text-sky-300 border-sky-400/30 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
        ].join(" ")}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export default NavItem;
