"use client";

import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "shots" | "glass";
type ButtonSize = "tiny" | "xs" | "sm" | "md" | "lg" | "huge";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--cu-primary)] text-white shadow-[var(--cu-shadow-primary)] hover:bg-[var(--cu-primary-hover)] hover:shadow-[0_16px_32px_-18px_rgba(79,110,247,0.85)] border-transparent active:scale-[0.98]",
  secondary:
    "bg-[var(--cu-surface)] text-[var(--cu-text-primary)] hover:bg-[var(--cu-surface-2)] border-[var(--cu-border)] hover:border-[var(--cu-border-strong)] shadow-[var(--cu-shadow-xs)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--cu-text-secondary)] hover:bg-[var(--cu-primary-subtle)] hover:text-[var(--cu-primary)] border-transparent active:scale-[0.98]",
  danger:
    "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)] border-transparent active:scale-[0.98]",
  outline:
    "bg-transparent text-[var(--cu-text-primary)] border-[var(--cu-border-strong)] hover:bg-[var(--cu-primary-subtle)] hover:text-[var(--cu-primary)] hover:border-[var(--cu-primary)]/40 active:scale-[0.98]",
  shots:
    "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-600 text-white font-extrabold shadow-[0_10px_25px_-8px_rgba(79,110,247,0.5)] hover:shadow-[0_14px_30px_-6px_rgba(79,110,247,0.65)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border-transparent transition-all",
  glass:
    "shots-glass text-slate-800 dark:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  tiny: "min-h-6 px-2 py-0.5 text-[10px] font-bold gap-1 rounded-full",
  xs: "min-h-7 px-2.5 py-1 text-[11px] font-medium gap-1 rounded-[var(--cu-radius-sm)]",
  sm: "min-h-9 px-3.5 py-1.5 text-xs font-semibold gap-1.5 rounded-[var(--cu-radius-md)]",
  md: "min-h-10 px-4 py-2 text-sm font-semibold gap-2 rounded-[var(--cu-radius-lg)]",
  lg: "min-h-11 px-5 py-2.5 text-sm font-bold gap-2.5 rounded-[var(--cu-radius-lg)]",
  huge: "min-h-13 px-7 py-3.5 text-base font-extrabold gap-3 rounded-full",
};

export function Button({
  variant = "primary",
  size = "md",
  pill = false,
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center whitespace-nowrap font-semibold border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cu-bg)]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "cursor-pointer select-none",
        variantStyles[variant],
        sizeStyles[size],
        pill ? "rounded-full" : "",
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </motion.button>
  );
}

export default Button;
