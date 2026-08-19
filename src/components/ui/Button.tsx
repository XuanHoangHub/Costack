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
    "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)] border-transparent active:scale-[0.98]",
  secondary:
    "bg-[var(--cu-surface-2)] text-[var(--cu-text-primary)] hover:bg-[var(--cu-surface-3)] border-[var(--cu-border)] hover:border-[var(--cu-border-strong)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--cu-text-secondary)] hover:bg-[var(--cu-primary-subtle)] hover:text-[var(--cu-primary)] border-transparent active:scale-[0.98]",
  danger:
    "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)] border-transparent active:scale-[0.98]",
  outline:
    "bg-transparent text-[var(--cu-text-primary)] border-[var(--cu-border)] hover:bg-[var(--cu-surface-2)] hover:border-[var(--cu-primary)]/50 active:scale-[0.98]",
  shots:
    "bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black shadow-[0_8px_25px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] dark:shadow-[0_8px_25px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] hover:scale-[1.02] active:scale-[0.98] border-transparent transition-all",
  glass:
    "shots-glass text-slate-800 dark:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  tiny: "px-2 py-0.5 text-[10px] font-bold gap-1 rounded-full",
  xs: "px-2.5 py-1 text-[11px] font-medium gap-1 rounded-[var(--cu-radius-sm)]",
  sm: "px-3.5 py-1.5 text-xs font-semibold gap-1.5 rounded-[var(--cu-radius-md)]",
  md: "px-4 py-2 text-sm font-semibold gap-2 rounded-[var(--cu-radius-lg)]",
  lg: "px-5 py-2.5 text-sm font-bold gap-2.5 rounded-[var(--cu-radius-lg)]",
  huge: "px-7 py-3.5 text-base font-extrabold gap-3 rounded-full shadow-xl",
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
        "inline-flex items-center justify-center font-semibold border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)]/30 focus-visible:ring-offset-1",
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
