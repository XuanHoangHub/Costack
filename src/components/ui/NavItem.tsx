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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
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
              ? "border-blue-400/50 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.45)] ring-1 ring-white/20"
              : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.08] hover:text-white",
          ].join(" ")}
        >

          <Icon
            size={18}
            weight={isActive ? "fill" : "regular"}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
          />

          {/* Unread / Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white font-black text-[8.5px] flex items-center justify-center ring-2 ring-[#080a0f] shadow-xs z-30">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Tooltip */}
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-700/60 bg-[#0f172a]/95 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-2xl backdrop-blur-2xl transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span>{label}</span>
            {badge && (
              <span className="text-[8px] bg-sky-400/20 text-sky-300 border border-sky-400/30 font-black px-1.5 py-0.5 rounded-full uppercase">
                {badge}
              </span>
            )}
            {count !== undefined && count > 0 && (
              <span className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                {count}
              </span>
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
        "group relative my-0.5 flex min-h-[38px] w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-150 border",
        isActive
          ? "border-blue-400/30 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-bold shadow-[0_4px_14px_-2px_rgba(37,99,235,0.5)] ring-1 ring-white/15"
          : "border-transparent text-slate-300 hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white font-medium",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Icon Frame */}
      <div className={[
        "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
        isActive
          ? "bg-white/20 text-white shadow-xs"
          : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white",
      ].join(" ")}>
        <Icon
          size={16}
          weight={isActive ? "fill" : "regular"}
          className="shrink-0 transition-transform duration-150 group-hover:scale-105"
        />
      </div>

      {/* Label Text */}
      <span className={[
        "truncate text-[13px] tracking-tight flex-1 text-left",
        isActive ? "text-white font-bold" : "text-slate-300 group-hover:text-white",
      ].join(" ")}>
        {displayText}
      </span>

      {/* Count Badge */}
      {count !== undefined && count > 0 && (
        <span className={[
          "font-black flex items-center justify-center shrink-0 tabular-nums transition-colors ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[9px]",
          isActive
            ? "bg-rose-500 text-white shadow-xs"
            : "bg-white/[0.12] text-slate-300 border border-white/10 group-hover:bg-white/[0.18] group-hover:text-white",
        ].join(" ")}>
          {count > 99 ? "99+" : count}
        </span>
      )}

      {/* Feature Badge */}
      {badge && (
        <span className={[
          "ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider border",
          badge === 'Enterprise' || badge === 'ENTERPRISE'
            ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
            : badge === 'AMIS'
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
              : "bg-sky-400/20 text-sky-300 border-sky-400/30 shadow-[0_0_8px_rgba(56,189,248,0.2)]"
        ].join(" ")}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export default NavItem;
