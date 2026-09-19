"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps, useReducedMotion } from "motion/react";

/* ═══════════════════════════════════════════════════════
   Apexa Button — Upgraded UI Component
   Variants: primary, secondary, ghost, danger, outline,
             gradient, soft, link, glass, icon-only
   Features: icon slots, keyboard shortcut badge, loading spinner,
             button groups, full accessible motion
   ═══════════════════════════════════════════════════════ */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline"
  | "gradient"
  | "soft"
  | "link"
  | "glass"
  | "shots";

type ButtonSize = "tiny" | "xs" | "sm" | "md" | "lg" | "xl" | "huge";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  /** Keyboard shortcut hint displayed as a badge (e.g. "⌘K") */
  kbd?: string;
  /** Icon-only mode — hides children, shows only the icon */
  iconOnly?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--cu-primary)] text-white shadow-[var(--ax-shadow-sm)] hover:bg-[var(--cu-primary-hover)] hover:shadow-[var(--ax-shadow-md)] border-transparent active:shadow-[var(--ax-shadow-xs)]",
  secondary:
    "bg-[var(--cu-surface)] text-[var(--cu-text-primary)] hover:bg-[var(--cu-surface-2)] border-[var(--cu-border)] hover:border-[var(--cu-border-strong)] shadow-[var(--ax-shadow-xs)]",
  ghost:
    "bg-transparent text-[var(--cu-text-secondary)] hover:bg-[var(--cu-primary-subtle)] hover:text-[var(--cu-primary)] border-transparent",
  danger:
    "bg-[var(--cu-danger)] text-white shadow-[var(--ax-shadow-sm)] hover:brightness-110 border-transparent",
  outline:
    "bg-transparent text-[var(--cu-text-primary)] border-[var(--cu-border-strong)] hover:bg-[var(--cu-primary-subtle)] hover:text-[var(--cu-primary)] hover:border-[var(--cu-primary)]",
  gradient:
    "bg-[var(--cu-primary)] text-white border-transparent shadow-[var(--ax-shadow-primary)] hover:bg-[var(--cu-primary-hover)] hover:shadow-[var(--ax-shadow-md)]",
  soft:
    "bg-[var(--cu-primary-light)] text-[var(--cu-primary)] border-transparent hover:bg-[var(--cu-primary-subtle)]",
  link:
    "bg-transparent text-[var(--cu-primary)] hover:text-[var(--cu-primary-hover)] border-transparent underline-offset-4 hover:underline p-0 min-h-0",
  glass:
    "bg-white/50 dark:bg-white/10 backdrop-blur-xl text-[var(--cu-text-primary)] border-white/30 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/15 shadow-[var(--ax-shadow-sm)]",
  shots:
    "bg-[var(--cu-primary)] text-white hover:bg-[var(--cu-primary-hover)] shadow-sm border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  tiny: "min-h-7 px-2 py-0.5 text-[11px] font-medium gap-1 rounded-lg",
  xs: "min-h-7 px-2.5 py-1 text-[11px] font-medium gap-1 rounded-[var(--ax-radius-md)]",
  sm: "min-h-8 px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-[var(--ax-radius-md)]",
  md: "min-h-9 px-4 py-2 text-[13px] font-semibold gap-2 rounded-[var(--ax-radius-lg)]",
  lg: "min-h-10 px-5 py-2.5 text-sm font-bold gap-2 rounded-[var(--ax-radius-lg)]",
  xl: "min-h-12 px-6 py-3 text-base font-bold gap-2.5 rounded-[var(--ax-radius-xl)]",
  huge: "min-h-13 px-7 py-3.5 text-base font-extrabold gap-3 rounded-full",
};

const iconOnlySizes: Record<ButtonSize, string> = {
  tiny: "min-h-7 w-7 p-0 rounded-lg",
  xs: "min-h-7 w-7 p-0 rounded-[var(--ax-radius-md)]",
  sm: "min-h-8 w-8 p-0 rounded-[var(--ax-radius-md)]",
  md: "min-h-9 w-9 p-0 rounded-[var(--ax-radius-lg)]",
  lg: "min-h-10 w-10 p-0 rounded-[var(--ax-radius-lg)]",
  xl: "min-h-12 w-12 p-0 rounded-[var(--ax-radius-xl)]",
  huge: "min-h-13 w-13 p-0 rounded-full",
};

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/** Keyboard shortcut badge displayed inside the button */
function KbdBadge({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center ml-1 px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none bg-black/10 dark:bg-white/10 rounded-[var(--ax-radius-xs)] border border-black/10 dark:border-white/10 opacity-70 pointer-events-none">
      {children}
    </kbd>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
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
    kbd,
    iconOnly = false,
    ...props
  },
  ref
) {
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      whileTap={reducedMotion || isDisabled ? undefined : { scale: 0.97 }}
      whileHover={reducedMotion || isDisabled ? undefined : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        "apexa-button inline-flex items-center justify-center whitespace-nowrap border transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cu-bg)]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "cursor-pointer select-none",
        variantStyles[variant],
        iconOnly ? iconOnlySizes[size] : sizeStyles[size],
        pill ? "!rounded-full" : "",
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(props as any)}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        leftIcon && <span className="inline-flex shrink-0 [&>svg]:w-4 [&>svg]:h-4">{leftIcon}</span>
      )}
      {!iconOnly && children}
      {!loading && rightIcon && (
        <span className="inline-flex shrink-0 [&>svg]:w-4 [&>svg]:h-4">{rightIcon}</span>
      )}
      {kbd && <KbdBadge>{kbd}</KbdBadge>}
    </motion.button>
  );
});

/* ── Button Group ── */
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  /** Merge borders between buttons */
  attached?: boolean;
}

export function ButtonGroup({ children, className = "", attached = false }: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={[
        "inline-flex items-center",
        attached
          ? "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px"
          : "gap-2",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default Button;
