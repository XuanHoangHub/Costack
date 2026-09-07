"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "away" | "dnd" | "offline" | "none";

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string;
  alt?: string;
  name?: string;
  fallback?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  ring?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const statusColors: Record<AvatarStatus, string> = {
  online: "bg-[var(--cu-success)]",
  away: "bg-[var(--cu-warning)]",
  dnd: "bg-[var(--cu-danger)]",
  offline: "bg-[var(--cu-text-muted)]",
  none: "hidden",
};

const statusSizes: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-4 w-4",
};

function getHashColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"];
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, src, alt, name, fallback, size = "md", status = "none", ring, ...props }, ref) => {
    const displayName = name || alt;
    const initials = fallback || (displayName ? displayName.slice(0, 2).toUpperCase() : "??");
    const bgColor = getHashColor(initials);

    return (
      <div className={cn("relative inline-block", sizeClasses[size], className)}>
        <AvatarPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex h-full w-full shrink-0 overflow-hidden rounded-full",
            ring && "ring-2 ring-[var(--cu-primary)] ring-offset-2 ring-offset-[var(--cu-bg)]"
          )}
          {...props}
        >
          <AvatarPrimitive.Image
            src={src}
            alt={alt}
            className="aspect-square h-full w-full object-cover"
          />
          <AvatarPrimitive.Fallback
            className="flex h-full w-full items-center justify-center rounded-full text-white font-medium"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
        {status !== "none" && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block rounded-full ring-2 ring-[var(--cu-bg)]",
              statusColors[status],
              statusSizes[size]
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  children: React.ReactNode;
  size?: AvatarSize;
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 4, children, size = "md", ...props }, ref) => {
    const validChildren = React.Children.toArray(children).filter(React.isValidElement);
    const renderChildren = validChildren.slice(0, max);
    const extra = validChildren.length - max;

    return (
      <div ref={ref} className={cn("flex items-center -space-x-2", className)} {...props}>
        {renderChildren.map((child, i) => (
          <div key={i} className="relative z-0 hover:z-10 transition-transform hover:-translate-y-1">
            {React.cloneElement(child as React.ReactElement<any>, { size, ring: true })}
          </div>
        ))}
        {extra > 0 && (
          <div
            className={cn(
              "relative z-0 flex items-center justify-center rounded-full bg-[var(--cu-surface-2)] text-[var(--cu-text-secondary)] ring-2 ring-[var(--cu-bg)] font-medium",
              sizeClasses[size]
            )}
          >
            +{extra}
          </div>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";

export default Avatar;
