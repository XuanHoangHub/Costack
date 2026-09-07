"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ProgressColor = "primary" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: "linear" | "circular";
  color?: ProgressColor;
  size?: ProgressSize;
  showLabel?: boolean;
  indeterminate?: boolean;
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const circleSizes = {
  sm: 32,
  md: 48,
  lg: 64,
};

const colorClasses = {
  primary: "bg-[var(--cu-primary)]",
  success: "bg-[var(--cu-success)]",
  warning: "bg-[var(--cu-warning)]",
  danger: "bg-[var(--cu-danger)]",
};

const strokeColors = {
  primary: "var(--cu-primary)",
  success: "var(--cu-success)",
  warning: "var(--cu-warning)",
  danger: "var(--cu-danger)",
};

export const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, max = 100, variant = "linear", color = "primary", size = "md", showLabel, indeterminate, ...props }, ref) => {
    const percentage = value != null ? Math.round((value / max) * 100) : 0;
    
    if (variant === "circular") {
      const dim = circleSizes[size];
      const strokeWidth = size === "sm" ? 3 : size === "md" ? 4 : 5;
      const radius = (dim - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const offset = indeterminate ? 0 : circumference - (percentage / 100) * circumference;

      return (
        <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: dim, height: dim }}>
          <svg width={dim} height={dim} className={cn(indeterminate && "animate-spin")}>
            <circle
              stroke="var(--cu-surface-2)"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={radius}
              cx={dim / 2}
              cy={dim / 2}
            />
            <motion.circle
              stroke={strokeColors[color]}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              strokeLinecap="round"
              r={radius}
              cx={dim / 2}
              cy={dim / 2}
              style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
            />
          </svg>
          {showLabel && !indeterminate && (
            <span className="absolute text-[10px] font-medium text-[var(--cu-text-primary)]">
              {percentage}%
            </span>
          )}
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col gap-1.5 w-full", className)}>
        {showLabel && (
          <div className="flex justify-between text-xs font-medium text-[var(--cu-text-secondary)]">
            <span>{percentage}%</span>
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-[var(--cu-surface-2)]",
            sizeClasses[size]
          )}
          {...props}
        >
          <motion.div
            className={cn(
              "h-full w-full flex-1 transition-all",
              colorClasses[color],
              indeterminate ? "animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] -ml-[100%]" : ""
            )}
            style={{ transform: indeterminate ? undefined : `translateX(-${100 - percentage}%)` }}
            initial={!indeterminate ? { transform: "translateX(-100%)" } : undefined}
            animate={!indeterminate ? { transform: `translateX(-${100 - percentage}%)` } : undefined}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export const CircularProgress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, Omit<ProgressProps, "variant">>(
  (props, ref) => <Progress ref={ref} variant="circular" {...props} />
);
CircularProgress.displayName = "CircularProgress";

export default Progress;
