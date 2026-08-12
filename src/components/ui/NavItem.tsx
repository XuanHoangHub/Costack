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
  const displayText = collapsed ? shortLabel || label : label;
  
  // Dynamic font scaling for collapsed mode based on text length to eliminate truncation (e.g. "Calendar")
  const collapsedFontSize = 
    displayText.length > 7
      ? "text-[8.5px] tracking-tighter"
      : displayText.length > 5
      ? "text-[9px] tracking-tighter"
      : "text-[10px] tracking-tight";

  return (
    <motion.button
      whileHover={{ scale: collapsed ? 1.03 : 1.01 }}
      whileTap={{ scale: 0.97 }}
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
        "group w-full relative flex transition-all duration-200 cursor-pointer select-none border overflow-hidden",
        collapsed
          ? "flex-col items-center justify-center py-2.5 px-0.5 rounded-2xl gap-1"
          : "py-2 px-3 rounded-2xl items-center gap-3",
        isActive
          ? collapsed
            ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/50 shadow-2xs font-extrabold"
            : "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/80 dark:border-indigo-900/40 font-extrabold"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 border-transparent font-semibold",
      ].join(" ")}
    >
      {dragIndicator}

      {/* Clean Left Active Bar */}
      {isActive && (
        <motion.div
          layoutId={collapsed ? "sidebarActiveIndicatorCollapsed" : "sidebarActiveIndicator"}
          className={
            collapsed
              ? "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-indigo-600 dark:bg-indigo-400 z-20"
              : "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-indigo-600 dark:bg-indigo-400 z-20"
          }
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}

      {/* Icon */}
      <div className="relative flex items-center justify-center shrink-0 z-10">
        <Icon
          size={collapsed ? 20 : 18}
          weight={isActive ? "bold" : "regular"}
          className={[
            "shrink-0 transition-all duration-200",
            isActive
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200",
          ].join(" ")}
        />
      </div>

      {/* Label Text */}
      <span
        className={[
          "transition-colors duration-200 z-10 w-full px-0.5 text-center truncate",
          collapsed
            ? `${collapsedFontSize} font-extrabold text-center leading-tight max-w-full block`
            : "text-[13px] font-bold flex-1 text-left tracking-tight",
          isActive
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
            : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 font-bold",
        ].join(" ")}
      >
        {displayText}
      </span>

      {/* Item Count Badge */}
      {count !== undefined && count > 0 && (
        <span
          className={[
            "font-extrabold text-white bg-rose-500 flex items-center justify-center shadow-2xs shrink-0 z-20",
            collapsed
              ? "absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[8.5px]"
              : "ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px]",
          ].join(" ")}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}

      {/* Floating Hover Tooltip Popover (Collapsed State) */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-extrabold py-1.5 px-3 rounded-xl shadow-lg border border-slate-800 z-50 whitespace-nowrap flex items-center gap-2">
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
