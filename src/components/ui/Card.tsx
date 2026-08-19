"use client";

import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "ghost" | "interactive" | "glass" | "shots" | "bento";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  radius?: "lg" | "xl" | "2xl" | "3xl";
}

const variantStyles = {
  default: "cu-card border-[var(--cu-border)] bg-[var(--cu-surface)]",
  elevated: "cu-card cu-card-elevated border-[var(--cu-border-strong)] bg-[var(--cu-surface)] shadow-md",
  ghost: "bg-transparent border-transparent shadow-none",
  interactive: "cu-card cu-card-interactive cursor-pointer hover:border-[var(--cu-primary)]/40 hover:-translate-y-0.5 transition-all duration-200",
  glass: "glass-card-ultra",
  shots: "shots-glass-card",
  bento: "shots-glass-card hover:scale-[1.01] hover:shadow-[0_20px_45px_-10px_rgba(37,99,235,0.2)]",
};

const radiusStyles = {
  lg: "rounded-[var(--cu-radius-lg)]",
  xl: "rounded-[var(--cu-radius-xl)]",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
  xl: "p-6 md:p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  radius = "2xl",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={[variantStyles[variant], radiusStyles[radius], paddingStyles[padding], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </motion.div>
  );
}

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

export function CardTitle({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={[
        "text-sm font-bold text-[var(--cu-text-primary)] tracking-tight",
        className,
      ].join(" ")}
    >
      {children}
    </h3>
  );
}

export default Card;
