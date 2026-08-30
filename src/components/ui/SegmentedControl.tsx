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
  ariaLabel?: string;
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
  ariaLabel,
}: SegmentedControlProps<T>) {
  const currentSize = sizeStyles[size];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        "relative inline-flex items-center bg-[var(--cu-surface-3)]/70 backdrop-blur-xl border border-[var(--cu-border)] shadow-inner select-none",
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
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.id)}
            className={[
              "relative z-10 inline-flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              currentSize.item,
              fullWidth ? "flex-1" : "",
              isSelected
                ? "text-[var(--cu-text-primary)]"
                : "text-[var(--cu-text-secondary)] hover:text-[var(--cu-text-primary)]",
            ].filter(Boolean).join(" ")}
          >
            {isSelected && (
              <motion.div
                layoutId={`${layoutIdPrefix}-pill`}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
                className="absolute inset-0 -z-10 rounded-full border border-[var(--cu-border)] bg-[var(--cu-surface)] shadow-[var(--cu-shadow-sm)]"
              />
            )}
            {Icon && (
              <Icon
                size={currentSize.iconSize}
                className={[
                  "shrink-0 transition-transform duration-200",
                  isSelected
                    ? "text-[var(--cu-primary)] scale-105"
                    : "text-[var(--cu-text-muted)]",
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
