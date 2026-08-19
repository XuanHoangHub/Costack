"use client";

import React from "react";
import { motion } from "motion/react";

export interface SegmentedOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md" | "lg";
  layoutIdPrefix?: string;
  className?: string;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: {
    container: "p-1 rounded-full text-xs gap-1",
    item: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    iconSize: 13,
  },
  md: {
    container: "p-1.5 rounded-full text-xs gap-1.5",
    item: "px-3.5 py-1.5 text-xs font-bold gap-2",
    iconSize: 15,
  },
  lg: {
    container: "p-1.5 rounded-2xl text-sm gap-2",
    item: "px-4 py-2 text-sm font-extrabold gap-2.5",
    iconSize: 17,
  },
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  layoutIdPrefix = "segmentedControl",
  className = "",
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const currentSize = sizeStyles[size];

  return (
    <div
      role="tablist"
      className={[
        "relative inline-flex items-center bg-slate-200/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300/60 dark:border-white/10 shadow-inner select-none",
        currentSize.container,
        fullWidth ? "w-full flex" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {options.map((option) => {
        const isSelected = option.id === value;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={isSelected}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.id)}
            className={[
              "relative z-10 inline-flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              currentSize.item,
              fullWidth ? "flex-1" : "",
              isSelected
                ? "text-slate-950 dark:text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
            ].filter(Boolean).join(" ")}
          >
            {isSelected && (
              <motion.div
                layoutId={`${layoutIdPrefix}-pill`}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] -z-10"
              />
            )}
            {Icon && (
              <Icon
                size={currentSize.iconSize}
                className={[
                  "shrink-0 transition-transform duration-200",
                  isSelected
                    ? "text-blue-600 dark:text-sky-400 scale-105"
                    : "text-slate-500 dark:text-slate-400",
                ].join(" ")}
              />
            )}
            <span className="truncate">{option.label}</span>
            {option.badge && (
              <span
                className={[
                  "ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider",
                  isSelected
                    ? "bg-blue-100 text-blue-700 dark:bg-sky-950 dark:text-sky-300"
                    : "bg-slate-300/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
