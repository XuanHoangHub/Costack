"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps, useReducedMotion } from "motion/react";

/* ═══════════════════════════════════════════════════════
   Apexa Card — Upgraded UI Component
   Variants: default, elevated, ghost, interactive, glass,
             bento, outline, gradient
   Features: hover micro-interactions, skeleton loading,
             collapsible, drag handle support
   ═══════════════════════════════════════════════════════ */

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "ghost" | "interactive" | "glass" | "bento" | "outline" | "gradient";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  radius?: "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Disable entry animation */
  noAnimation?: boolean;
  /** Show as loading skeleton */
  skeleton?: boolean;
}

const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
  default:
    "bg-[var(--cu-surface)] border-[var(--cu-border)] shadow-[var(--ax-shadow-xs)]",
  elevated:
    "bg-[var(--cu-surface)] border-[var(--cu-border)] shadow-[var(--ax-shadow-md)]",
  ghost:
    "bg-transparent border-transparent shadow-none",
  interactive:
    "bg-[var(--cu-surface)] border-[var(--cu-border)] shadow-[var(--ax-shadow-xs)] cursor-pointer hover:border-[var(--cu-primary)]/30 hover:shadow-[var(--ax-shadow-md)] hover:-translate-y-0.5 transition-all duration-200",
  glass:
    "bg-[color-mix(in_srgb,var(--cu-surface)_75%,transparent)] backdrop-blur-xl border-[var(--cu-border)] shadow-[var(--ax-shadow-sm)]",
  bento:
    "bg-[var(--cu-surface)] border-[var(--cu-border)] shadow-[var(--ax-shadow-xs)] hover:shadow-[var(--ax-shadow-lg)] hover:border-[var(--cu-border-strong)] transition-all duration-300 overflow-hidden",
  outline:
    "bg-transparent border-[var(--cu-border-strong)] shadow-none hover:border-[var(--cu-primary)]/40 transition-colors",
  gradient:
    "bg-gradient-to-br from-[var(--cu-primary-light)] to-[var(--cu-surface)] border-[var(--cu-primary)]/15 shadow-[var(--ax-shadow-sm)]",
};

const radiusStyles: Record<NonNullable<CardProps["radius"]>, string> = {
  md: "rounded-[var(--ax-radius-md)]",
  lg: "rounded-[var(--ax-radius-lg)]",
  xl: "rounded-[var(--ax-radius-xl)]",
  "2xl": "rounded-[var(--ax-radius-2xl)]",
  "3xl": "rounded-[var(--ax-radius-3xl)]",
};

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
  xl: "p-6 md:p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    padding = "md",
    radius = "xl",
    noAnimation = false,
    skeleton = false,
    className = "",
    children,
    ...props
  },
  ref
) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = !noAnimation && !reducedMotion;

  if (skeleton) {
    return (
      <div
        className={[
          "border animate-pulse",
          "bg-[var(--cu-surface-2)]",
          radiusStyles[radius],
          paddingStyles[padding],
          className,
        ].join(" ")}
      >
        <div className="space-y-3">
          <div className="h-4 bg-[var(--cu-surface-3)] rounded-[var(--ax-radius-md)] w-3/4" />
          <div className="h-3 bg-[var(--cu-surface-3)] rounded-[var(--ax-radius-md)] w-1/2" />
          <div className="h-20 bg-[var(--cu-surface-3)] rounded-[var(--ax-radius-lg)]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "border",
        variantStyles[variant],
        radiusStyles[radius],
        paddingStyles[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </motion.div>
  );
});

/* ── Card Header ── */
export function CardHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={["flex items-center justify-between mb-4", className].join(" ")}>
      {children}
    </div>
  );
}

/* ── Card Title ── */
export function CardTitle({
  as: Tag = "h3",
  className = "",
  children,
}: {
  as?: "h2" | "h3" | "h4" | "h5";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={[
        "text-sm font-bold text-[var(--cu-text-primary)] tracking-tight leading-snug",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

/* ── Card Description ── */
export function CardDescription({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={["text-xs text-[var(--cu-text-muted)] leading-relaxed", className].join(" ")}>
      {children}
    </p>
  );
}

/* ── Card Footer ── */
export function CardFooter({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[var(--cu-border)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default Card;
