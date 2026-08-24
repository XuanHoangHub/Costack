"use client";

import React, { useId, forwardRef, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export type CheckboxSize = "sm" | "md" | "lg";
export type CheckboxVariant =
  | "indigo"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "purple"
  | "slate";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  size?: CheckboxSize;
  variant?: CheckboxVariant;
  indeterminate?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const sizeConfig: Record<
  CheckboxSize,
  {
    box: string;
    icon: string;
    strokeWidth: number;
    text: string;
    desc: string;
    gap: string;
  }
> = {
  sm: {
    box: "w-3.5 h-3.5 rounded-[4.5px]",
    icon: "w-2.5 h-2.5",
    strokeWidth: 2.8,
    text: "text-xs",
    desc: "text-[10px]",
    gap: "gap-2",
  },
  md: {
    box: "w-4 h-4 rounded-[5.5px]",
    icon: "w-3 h-3",
    strokeWidth: 2.6,
    text: "text-xs sm:text-sm font-semibold",
    desc: "text-xs",
    gap: "gap-2.5",
  },
  lg: {
    box: "w-5 h-5 rounded-[6.5px]",
    icon: "w-3.5 h-3.5",
    strokeWidth: 2.4,
    text: "text-sm sm:text-base font-bold",
    desc: "text-xs sm:text-sm",
    gap: "gap-3",
  },
};

const variantConfig: Record<
  CheckboxVariant,
  {
    checkedBg: string;
    checkedBorder: string;
    glow: string;
    hoverBorder: string;
  }
> = {
  indigo: {
    checkedBg: "bg-indigo-600 dark:bg-indigo-500",
    checkedBorder: "border-indigo-600 dark:border-indigo-500",
    glow: "shadow-[0_2px_8px_-1px_rgba(79,70,229,0.5)]",
    hoverBorder: "hover:border-indigo-500/70",
  },
  blue: {
    checkedBg: "bg-blue-600 dark:bg-blue-500",
    checkedBorder: "border-blue-600 dark:border-blue-500",
    glow: "shadow-[0_2px_8px_-1px_rgba(37,99,235,0.5)]",
    hoverBorder: "hover:border-blue-500/70",
  },
  emerald: {
    checkedBg: "bg-emerald-600 dark:bg-emerald-500",
    checkedBorder: "border-emerald-600 dark:border-emerald-500",
    glow: "shadow-[0_2px_8px_-1px_rgba(5,150,105,0.5)]",
    hoverBorder: "hover:border-emerald-500/70",
  },
  amber: {
    checkedBg: "bg-amber-500 dark:bg-amber-400",
    checkedBorder: "border-amber-500 dark:border-amber-400",
    glow: "shadow-[0_2px_8px_-1px_rgba(217,119,6,0.45)]",
    hoverBorder: "hover:border-amber-500/70",
  },
  rose: {
    checkedBg: "bg-rose-600 dark:bg-rose-500",
    checkedBorder: "border-rose-600 dark:border-rose-500",
    glow: "shadow-[0_2px_8px_-1px_rgba(225,29,72,0.5)]",
    hoverBorder: "hover:border-rose-500/70",
  },
  purple: {
    checkedBg: "bg-purple-600 dark:bg-purple-500",
    checkedBorder: "border-purple-600 dark:border-purple-500",
    glow: "shadow-[0_2px_8px_-1px_rgba(147,51,234,0.5)]",
    hoverBorder: "hover:border-purple-500/70",
  },
  slate: {
    checkedBg: "bg-slate-800 dark:bg-slate-200",
    checkedBorder: "border-slate-800 dark:border-slate-200",
    glow: "shadow-[0_2px_8px_-1px_rgba(15,23,42,0.4)]",
    hoverBorder: "hover:border-slate-500/70",
  },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size = "md",
      variant = "indigo",
      checked,
      defaultChecked,
      indeterminate = false,
      label,
      description,
      error,
      disabled = false,
      required = false,
      className = "",
      containerClassName = "",
      id,
      onChange,
      onCheckedChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const innerRef = useRef<HTMLInputElement>(null);

    // Sync indeterminate state to input DOM node
    useEffect(() => {
      const el = (ref && "current" in ref ? ref.current : null) || innerRef.current;
      if (el) {
        el.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate, ref]);

    const isControlled = typeof checked !== "undefined";
    const isChecked = Boolean(checked);
    const sizeStyle = sizeConfig[size];
    const variantStyle = variantConfig[variant];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    const checkboxBox = (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${sizeStyle.box} border-[1.5px] transition-all duration-150 select-none ${
          disabled
            ? "opacity-45 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700"
            : isChecked || indeterminate
            ? `${variantStyle.checkedBg} ${variantStyle.checkedBorder} ${variantStyle.glow} cursor-pointer`
            : `bg-white dark:bg-slate-900/60 border-slate-300/90 dark:border-slate-700 ${variantStyle.hoverBorder} hover:shadow-xs cursor-pointer`
        } ${className}`}
      >
        <input
          ref={ref || innerRef}
          type="checkbox"
          id={inputId}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          className="sr-only peer"
          aria-checked={indeterminate ? "mixed" : isChecked}
          {...props}
        />

        <AnimatePresence mode="wait">
          {isChecked && !indeterminate && (
            <motion.svg
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              viewBox="0 0 16 16"
              fill="none"
              className={`${sizeStyle.icon} ${
                variant === "slate"
                  ? "text-white dark:text-slate-900"
                  : "text-white"
              }`}
            >
              <motion.path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke="currentColor"
                strokeWidth={sizeStyle.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              />
            </motion.svg>
          )}

          {indeterminate && (
            <motion.svg
              key="minus"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              viewBox="0 0 16 16"
              fill="none"
              className={`${sizeStyle.icon} ${
                variant === "slate"
                  ? "text-white dark:text-slate-900"
                  : "text-white"
              }`}
            >
              <motion.line
                x1="4"
                y1="8"
                x2="12"
                y2="8"
                stroke="currentColor"
                strokeWidth={sizeStyle.strokeWidth}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
    );

    if (!label && !description && !error) {
      return (
        <label
          htmlFor={inputId}
          className={`inline-flex items-center ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          } ${containerClassName}`}
        >
          {checkboxBox}
        </label>
      );
    }

    return (
      <div className={`flex items-start ${sizeStyle.gap} ${containerClassName}`}>
        <label
          htmlFor={inputId}
          className={`pt-0.5 inline-flex items-center ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {checkboxBox}
        </label>

        <div className="flex-1 select-none">
          {label && (
            <label
              htmlFor={inputId}
              className={`block ${sizeStyle.text} leading-tight ${
                disabled
                  ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  : "text-slate-700 dark:text-slate-200 cursor-pointer"
              }`}
            >
              {label}
            </label>
          )}

          {description && (
            <p
              className={`mt-0.5 ${sizeStyle.desc} leading-normal ${
                disabled
                  ? "text-slate-400 dark:text-slate-600"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {description}
            </p>
          )}

          {error && (
            <p className="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 leading-tight animate-in fade-in slide-in-from-top-0.5">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
