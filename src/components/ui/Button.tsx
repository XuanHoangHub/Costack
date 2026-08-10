"use client";

import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#7B61FF] to-[#6045EB] text-white shadow-[0_4px_14px_rgba(123,97,255,0.35)] hover:shadow-[0_6px_20px_rgba(123,97,255,0.5)] border-transparent active:scale-[0.98]",
  secondary:
    "bg-[var(--cu-surface-2)] text-[var(--cu-text-primary)] hover:bg-[var(--cu-surface-3)] border-[var(--cu-border)] hover:border-[var(--cu-border-strong)] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--cu-text-secondary)] hover:bg-[var(--cu-primary-subtle)] hover:text-[var(--cu-primary)] border-transparent active:scale-[0.98]",
  danger:
    "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)] border-transparent active:scale-[0.98]",
  outline:
    "bg-transparent text-[var(--cu-text-primary)] border-[var(--cu-border)] hover:bg-[var(--cu-surface-2)] hover:border-[var(--cu-primary)]/50 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-[11px] font-medium gap-1 rounded-[var(--cu-radius-sm)]",
  sm: "px-3.5 py-1.5 text-xs font-semibold gap-1.5 rounded-[var(--cu-radius-md)]",
  md: "px-4 py-2 text-sm font-semibold gap-2 rounded-[var(--cu-radius-lg)]",
  lg: "px-5 py-2.5 text-sm font-bold gap-2.5 rounded-[var(--cu-radius-lg)]",
};

export function Button({
  variant = "primary",
  size = "md",
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
