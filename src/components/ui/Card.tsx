"use client";

import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "ghost" | "interactive" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles = {
  default: "cu-card border-[var(--cu-border)] bg-[var(--cu-surface)] rounded-[var(--cu-radius-xl)]",
  elevated: "cu-card cu-card-elevated border-[var(--cu-border-strong)] bg-[var(--cu-surface)] rounded-[var(--cu-radius-xl)] shadow-md",
  ghost: "bg-transparent border-transparent shadow-none",
  interactive: "cu-card cu-card-interactive cursor-pointer hover:border-[var(--cu-primary)]/40 hover:-translate-y-0.5 transition-all duration-200 rounded-[var(--cu-radius-xl)]",
  glass: "glass-card-ultra rounded-[var(--cu-radius-xl)]",
};

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
};

export function Card({
  variant = "default",
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={[variantStyles[variant], paddingStyles[padding], className]
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
