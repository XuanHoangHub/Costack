"use client";

import React from "react";
import { motion } from "motion/react";

export interface CommandAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
}

export interface FloatingCommandBarProps {
  actions: CommandAction[];
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
}

export function FloatingCommandBar({
  actions,
  centerContent,
  rightContent,
  className = "",
}: FloatingCommandBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "inline-flex items-center gap-1.5 p-1.5 shots-dock text-slate-800 dark:text-slate-200 select-none z-40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              disabled={action.disabled}
              onClick={action.onClick}
              title={action.label}
              className={[
                "group relative p-2 rounded-full transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                action.active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}
            >
              <Icon size={16} className="shrink-0 transition-transform group-hover:scale-110" />

              {/* Tooltip */}
              <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 px-2.5 py-1 rounded-lg bg-slate-950 text-white text-[10px] font-bold whitespace-nowrap shadow-xl border border-white/10 flex items-center gap-1.5 z-50">
                <span>{action.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {centerContent && (
        <>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1" />
          <div className="flex items-center">{centerContent}</div>
        </>
      )}

      {rightContent && (
        <>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1" />
          <div className="flex items-center gap-1">{rightContent}</div>
        </>
      )}
    </motion.div>
  );
}

export default FloatingCommandBar;
