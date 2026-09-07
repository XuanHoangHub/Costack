"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface EmptyStateProps extends Omit<HTMLMotionProps<"div">, "size"> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "p-6 gap-3",
  md: "p-10 gap-4",
  lg: "p-16 gap-6",
};

const iconSizeClasses = {
  sm: "h-10 w-10 text-2xl",
  md: "h-14 w-14 text-4xl",
  lg: "h-20 w-20 text-5xl",
};

const titleClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

const descClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, size = "md", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "flex flex-col items-center justify-center text-center w-full rounded-xl border border-dashed border-[var(--cu-border-strong)] bg-[var(--cu-surface)]/50",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon && (
          <div className={cn(
            "flex items-center justify-center rounded-full bg-[var(--cu-surface-2)] text-[var(--cu-text-muted)]",
            iconSizeClasses[size]
          )}>
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-1 max-w-sm">
          <h3 className={cn("font-semibold text-[var(--cu-text-primary)]", titleClasses[size])}>
            {title}
          </h3>
          {description && (
            <p className={cn("text-[var(--cu-text-secondary)]", descClasses[size])}>
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </motion.div>
    );
  }
);
EmptyState.displayName = "EmptyState";

export default EmptyState;
