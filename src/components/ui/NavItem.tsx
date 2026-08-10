"use client";

import React from "react";
import { motion } from "motion/react";

interface NavItemProps {
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>;
  label: string;
  shortLabel?: string;
  isActive?: boolean;
  count?: number;
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
  return (
    <motion.button
      whileHover={{ scale: collapsed ? 1.05 : 1.01, x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      draggable
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDragLeave={onDragLeave as any}
      onDragEnd={onDragEnd as any}
      onDrop={onDrop as any}
      onClick={onClick}
      style={style}
      className={[
        "group w-full relative flex transition-all duration-200 cursor-pointer select-none",
        collapsed
          ? "flex-col items-center justify-center py-2.5 px-1 rounded-2xl gap-1"
          : "py-2 px-3 rounded-2xl items-center gap-3",
        isActive
          ? collapsed
            ? "bg-gradient-to-tr from-violet-600/20 via-indigo-600/15 to-purple-600/25 text-[var(--cu-primary)] border border-[var(--cu-primary)]/35 shadow-[0_4px_16px_rgba(123,104,238,0.25)] dark:shadow-[0_4px_20px_rgba(139,92,246,0.3)] font-black"
            : "bg-gradient-to-r from-[var(--cu-primary)]/15 via-[var(--cu-primary)]/10 to-transparent text-[var(--cu-primary)] font-extrabold border-l-0"
          : "text-[var(--cu-text-secondary)] hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-[var(--cu-text-primary)] border-transparent",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Floating Active Glow Indicator */}
      {isActive && (
        <motion.div
          layoutId={collapsed ? "sidebarActiveIndicatorCollapsed" : "sidebarActiveIndicator"}
          className={
            collapsed
              ? "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-[#7B61FF] via-[#8B5CF6] to-[#FF3366] shadow-[0_0_12px_rgba(123,104,238,0.8)]"
              : "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-[#7B61FF] via-[#8B5CF6] to-[#FF3366] shadow-[0_0_12px_rgba(123,104,238,0.8)]"
          }
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}

      {/* Icon with Hover Glow Scaling */}
      <div className="relative flex items-center justify-center shrink-0">
        <Icon
          size={collapsed ? 22 : 18}
          weight={isActive ? "duotone" : "regular"}
          className={[
            "shrink-0 transition-all duration-200 group-hover:scale-115",
            isActive
              ? "text-[var(--cu-primary)] filter drop-shadow-[0_2px_8px_rgba(123,104,238,0.4)]"
              : "text-slate-400 dark:text-slate-500 group-hover:text-[var(--cu-primary)]",
          ].join(" ")}
        />
      </div>

      {/* Label Text */}
      <span
        className={[
          "truncate transition-colors duration-200",
          collapsed
            ? "text-[9.5px] font-extrabold text-center leading-tight max-w-full tracking-tight"
            : "text-[13px] font-bold flex-1 text-left tracking-tight",
          isActive
            ? "text-[var(--cu-primary)] font-extrabold"
            : "text-[var(--cu-text-secondary)] group-hover:text-[var(--cu-text-primary)] font-bold",
        ].join(" ")}
      >
        {collapsed ? shortLabel || label : label}
      </span>

      {/* Item Count Badge */}
      {count !== undefined && count > 0 && (
        <span
          className={[
            "font-extrabold text-white bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-center shadow-[0_2px_8px_rgba(225,29,72,0.4)] animate-pulse",
            collapsed
              ? "absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[8.5px]"
              : "ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px]",
          ].join(" ")}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}

      {/* Floating Hover Tooltip Popover (Collapsed State) */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-extrabold py-1.5 px-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-slate-800 z-50 whitespace-nowrap flex items-center gap-2">
          <span>{label}</span>
          {count !== undefined && count > 0 && (
            <span className="bg-rose-500 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full">
              {count}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

export default NavItem;
