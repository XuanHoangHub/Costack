"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "avatar" | "card" | "row" | "rect";
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "rect", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-[var(--cu-surface-2)] dark:bg-[var(--cu-surface-3)]",
          variant === "text" && "h-4 w-full",
          variant === "avatar" && "h-10 w-10 rounded-full",
          variant === "card" && "h-32 w-full rounded-xl",
          variant === "row" && "h-12 w-full",
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn(
          i === lines - 1 && "w-[80%]",
          i === lines - 2 && "w-[90%]"
        )}
      />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = "md", className }: { size?: "sm"|"md"|"lg"; className?: string }) => {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };
  return <Skeleton variant="avatar" className={cn(sizes[size], className)} />;
};

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("space-y-3 rounded-xl border border-[var(--cu-border)] p-4", className)}>
    <Skeleton variant="card" className="h-24" />
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonRow = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-4", className)}>
    <Skeleton variant="avatar" className="h-10 w-10 shrink-0" />
    <SkeletonText lines={2} className="flex-1" />
  </div>
);

export default Skeleton;
