"use client";

import React from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gradient"
  | "glass"
  | "shots"
  | "shots-new";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--cu-surface-2)] text-[var(--cu-text-secondary)] border-[var(--cu-border)]",
  primary: "bg-[var(--cu-primary-light)] text-[var(--cu-primary)] border-[var(--cu-primary)]/20 shadow-xs",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-xs",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-xs",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-xs",
  gradient: "bg-gradient-to-r from-[#2563EB] to-[#0284C7] text-white border-transparent shadow-xs font-bold",
  glass: "bg-white/40 dark:bg-white/10 backdrop-blur-md text-[var(--cu-text-primary)] border-white/40 dark:border-white/10 shadow-xs",
  shots: "shots-tag font-extrabold",
  "shots-new": "shots-tag-new font-black shadow-xs",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3.5 py-1.5 text-xs font-bold tracking-wide",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-bold leading-none rounded-full border border-transparent select-none",
        sizeStyles[size],
        variantStyles[variant],
        className,
      ].join(" ")}
    >
      {dot && (
        <span
          className={[
            "w-1.5 h-1.5 rounded-full shrink-0",
            variant === "success" ? "bg-emerald-500 animate-pulse" : "",
            variant === "danger" ? "bg-rose-500 animate-pulse" : "",
            variant === "shots-new" ? "bg-pink-500 animate-pulse" : "",
            variant === "primary" || variant === "shots" ? "bg-[var(--cu-primary)]" : "bg-current opacity-60",
          ].join(" ")}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
