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

  return (
    <motion.button
      whileHover={{ scale: collapsed ? 1.03 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      draggable
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDragLeave={onDragLeave as any}
      onDragEnd={onDragEnd as any}
      onDrop={onDrop as any}
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      style={style}
      className={[
        "group w-full relative flex transition-all duration-200 cursor-pointer select-none border",
        collapsed
          ? "items-center justify-center h-10 px-0 rounded-xl overflow-visible"
          : "py-2 px-3 rounded-2xl items-center gap-2.5 overflow-hidden",
        isActive
          ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-sky-300 border-blue-200/80 dark:border-blue-500/30 shadow-xs font-bold"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-white border-transparent font-medium",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Clean Inset Active Pill */}
      {isActive && (
        <motion.div
          layoutId={collapsed ? "sidebarActiveIndicatorCollapsed" : "sidebarActiveIndicator"}
          className={
            collapsed
              ? "absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 rounded-full bg-blue-600 dark:bg-sky-400 shadow-sm z-20"
              : "absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-3.5 rounded-full bg-blue-600 dark:bg-sky-400 shadow-sm z-20"
          }
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}

      {/* Icon with soft squircle box */}
      <div className={[
        "relative flex items-center justify-center shrink-0 z-10 rounded-lg transition-colors",
        collapsed ? "w-7 h-7" : "w-6 h-6",
        isActive
          ? "text-blue-600 dark:text-sky-400 bg-blue-500/15 dark:bg-blue-400/20"
          : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white",
      ].join(" ")}>
        <Icon
          size={collapsed ? 18 : 16}
          weight={isActive ? "bold" : "regular"}
          className="shrink-0 transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Label Text */}
      <span
        className={[
          "transition-colors duration-200 z-10 truncate text-xs text-left tracking-tight",
          collapsed ? "sr-only" : "flex-1",
          isActive
            ? "text-blue-700 dark:text-sky-200 font-bold"
            : "text-slate-700 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white font-medium",
        ].join(" ")}
      >
        {displayText}
      </span>

      {/* Item Count Badge */}
      {count !== undefined && count > 0 && (
        <span
          className={[
            "font-extrabold flex items-center justify-center shrink-0 z-20 tabular-nums transition-colors",
            isActive
              ? "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60"
              : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
            collapsed
              ? "absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[8px]"
              : "ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[9.5px]",
          ].join(" ")}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}

      {badge && !collapsed && (
        <span className="ml-auto shrink-0 rounded-full bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/70 shadow-3xs">
          {badge}
        </span>
      )}

      {/* Tooltip on collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold py-1 px-2.5 rounded-xl shadow-lg border border-slate-800 z-50 whitespace-nowrap flex items-center gap-2">
          <span>{label}</span>
          {count !== undefined && count > 0 && (
            <span className="bg-blue-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
              {count}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

export default NavItem;
