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
      <div className="relative my-0.5 flex w-full items-center justify-center">
        {dragIndicator}

        {/* Left Glowing Neon Indicator Bar */}
        {isActive && (
          <motion.div
            layoutId="sidebarActiveIndicatorCollapsed"
            className="absolute left-0 top-1/2 z-20 h-5.5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-sky-400 shadow-[0_0_12px_rgba(99,102,241,0.85)]"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          draggable={Boolean(onDragStart)}
          onDragStart={onDragStart as any}
          onDragOver={onDragOver as any}
          onDragLeave={onDragLeave as any}
          onDragEnd={onDragEnd as any}
          onDrop={onDrop as any}
          onClick={onClick}
          aria-label={label}
          style={style}
          className={[
            "group relative flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-[13px] border transition-all duration-200",
            isActive
              ? "border-white/20 bg-white/[0.14] text-white shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-white/10"
              : "border-transparent bg-transparent text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.08] hover:text-white",
          ].join(" ")}
        >
          <Icon
            size={20}
            weight={isActive ? "fill" : "regular"}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
          />

          {/* Unread / Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white font-black text-[8.5px] flex items-center justify-center ring-2 ring-[#080a0f] shadow-xs">
              {count > 99 ? "99+" : count}
            </span>
          )}

          {/* Tooltip */}
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#11141d]/95 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-2xl backdrop-blur-2xl transition-all duration-200 group-hover:opacity-100">
            <span>{label}</span>
            {badge && (
              <span className="text-[8px] bg-blue-500/20 text-sky-300 border border-blue-400/30 font-black px-1.5 py-0.2 rounded-full uppercase">
                {badge}
              </span>
            )}
            {count !== undefined && count > 0 && (
              <span className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-xs">
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
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDragLeave={onDragLeave as any}
      onDragEnd={onDragEnd as any}
      onDrop={onDrop as any}
      onClick={onClick}
      aria-label={label}
      style={style}
      className={[
        "group relative my-0.5 flex min-h-10 w-full cursor-pointer select-none items-center gap-2.5 rounded-[14px] border px-2.5 py-2 transition-all duration-200",
        isActive
          ? "border-white/[0.12] bg-white/[0.10] font-bold text-white shadow-sm backdrop-blur-md"
          : "border-transparent font-medium text-zinc-300 hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Left indicator capsule for expanded mode */}
      {isActive && (
        <motion.div
          layoutId="sidebarActiveIndicatorExpanded"
          className="absolute left-0 top-1/2 z-20 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-sky-400 shadow-[0_0_10px_rgba(129,140,248,0.6)]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      {/* Icon Frame */}
      <div className={[
        "relative z-10 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200",
        isActive
          ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm shadow-indigo-500/30"
          : "bg-white/[0.05] text-zinc-300 group-hover:bg-white/[0.09] group-hover:text-white",
      ].join(" ")}>
        <Icon
          size={18}
          weight={isActive ? "fill" : "regular"}
          className="shrink-0 transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Label Text */}
      <span className={[
        "transition-colors duration-200 z-10 truncate text-xs text-left tracking-tight flex-1",
        isActive ? "text-white font-extrabold" : "text-zinc-300 group-hover:text-white font-semibold",
      ].join(" ")}>
        {displayText}
      </span>

      {/* Count Badge */}
      {count !== undefined && count > 0 && (
        <span className={[
          "font-black flex items-center justify-center shrink-0 z-20 tabular-nums transition-colors ml-auto min-w-[19px] h-[19px] px-1.5 rounded-full text-[9.5px]",
          isActive
            ? "bg-rose-500 text-white shadow-xs"
            : "bg-white/[0.12] text-zinc-300 border border-white/10 group-hover:bg-white/[0.18] group-hover:text-white",
        ].join(" ")}>
          {count > 99 ? "99+" : count}
        </span>
      )}

      {/* Feature Badge */}
      {badge && (
        <span className="ml-auto shrink-0 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-sky-300 border border-blue-400/30 shadow-[0_0_8px_rgba(56,189,248,0.2)]">
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export default NavItem;
