"use client";

import React from "react";

/* ═══════════════════════════════════════════════════════
   Apexa Badge — Upgraded UI Component
   Variants: default, primary, success, warning, danger, info,
             gradient, glass, outline, ai
   Features: dot indicator, animated count, removable, priority presets
   ═══════════════════════════════════════════════════════ */

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gradient"
  | "glass"
  | "outline"
  | "ai"
  | "shots"
  | "shots-new";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: "xs" | "sm" | "md" | "lg";
  /** Show a colored dot indicator */
  dot?: boolean;
  /** Pulsing dot animation */
  pulse?: boolean;
  /** Show a close/remove button */
  removable?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--cu-surface-2)] text-[var(--cu-text-secondary)] border-[var(--cu-border)]",
  primary:
    "bg-[var(--cu-primary-light)] text-[var(--cu-primary)] border-[var(--cu-primary)]/20",
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  info:
    "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  gradient:
    "bg-[var(--cu-primary)] text-white border-transparent font-bold",
  glass:
    "bg-white/40 dark:bg-white/10 backdrop-blur-md text-[var(--cu-text-primary)] border-white/30 dark:border-white/10",
  outline:
    "bg-transparent text-[var(--cu-text-secondary)] border-[var(--cu-border-strong)]",
  ai:
    "bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  shots: "shots-tag font-extrabold",
  "shots-new": "shots-tag-new font-black shadow-xs",
};

const dotColors: Partial<Record<BadgeVariant, string>> = {
  default: "bg-[var(--cu-text-muted)]",
  primary: "bg-[var(--cu-primary)]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  ai: "bg-violet-500",
};

const sizeStyles = {
  xs: "px-1.5 py-0.5 text-[9px] gap-1",
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3.5 py-1.5 text-xs gap-1.5",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  pulse = false,
  removable = false,
  onRemove,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-semibold leading-none rounded-full border select-none",
        sizeStyles[size],
        variantStyles[variant],
        className,
      ].join(" ")}
    >
      {dot && (
        <span className="relative inline-flex shrink-0">
          <span
            className={[
              "w-1.5 h-1.5 rounded-full shrink-0",
              dotColors[variant] || "bg-current opacity-60",
            ].join(" ")}
          />
          {pulse && (
            <span
              className={[
                "absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping opacity-40",
                dotColors[variant] || "bg-current",
              ].join(" ")}
            />
          )}
        </span>
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="inline-flex items-center justify-center w-3.5 h-3.5 -mr-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Remove"
        >
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}

/* ── Badge with animated count ── */
export function CountBadge({
  count,
  variant = "danger",
  className = "",
}: {
  count: number;
  variant?: BadgeVariant;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <Badge
      variant={variant}
      size="xs"
      className={["min-w-5 justify-center tabular-nums font-bold", className].join(" ")}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

/* ── Priority Badge Presets ── */
type PriorityLevel = "urgent" | "high" | "normal" | "low" | "none";

const priorityConfig: Record<PriorityLevel, { label: string; variant: BadgeVariant; icon: string }> = {
  urgent: { label: "Urgent", variant: "danger", icon: "🔴" },
  high: { label: "High", variant: "warning", icon: "🟠" },
  normal: { label: "Normal", variant: "info", icon: "🔵" },
  low: { label: "Low", variant: "default", icon: "⚪" },
  none: { label: "None", variant: "default", icon: "—" },
};

export function PriorityBadge({
  priority,
  showLabel = true,
  size = "sm",
  className = "",
}: {
  priority: PriorityLevel;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const config = priorityConfig[priority] || priorityConfig.none;

  return (
    <Badge variant={config.variant} size={size} dot pulse={priority === "urgent"} className={className}>
      {showLabel ? config.label : config.icon}
    </Badge>
  );
}

/* ── Status Badge ── */
export function StatusBadge({
  status,
  label,
  color,
  className = "",
}: {
  status: string;
  label?: string;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full select-none",
        "bg-[var(--cu-surface-2)] text-[var(--cu-text-secondary)] border border-[var(--cu-border)]",
        className,
      ].join(" ")}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color || "var(--cu-text-muted)" }}
      />
      {label || status}
    </span>
  );
}

export default Badge;
