"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TabsVariant = "pill" | "underline" | "boxed";
export type TabsSize = "sm" | "md";

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
  size?: TabsSize;
  fullWidth?: boolean;
}

const TabsContext = React.createContext<{ variant: TabsVariant; size: TabsSize }>({
  variant: "underline",
  size: "md",
});

export const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ className, variant = "underline", size = "md", fullWidth, ...props }, ref) => {
    return (
      <TabsContext.Provider value={{ variant, size }}>
        <TabsPrimitive.Root
          ref={ref}
          className={cn("flex flex-col", fullWidth && "w-full", className)}
          {...props}
        />
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = TabsPrimitive.Root.displayName;

export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => {
    const { variant } = React.useContext(TabsContext);
    
    return (
      <div className="w-full overflow-x-auto no-scrollbar">
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "inline-flex items-center justify-center text-[var(--cu-text-muted)]",
            variant === "pill" && "rounded-lg bg-[var(--cu-surface)] p-1",
            variant === "underline" && "border-b border-[var(--cu-border)] w-full justify-start",
            variant === "boxed" && "gap-2",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  badge?: number | string;
}

export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, children, badge, value, ...props }, ref) => {
    const { variant, size } = React.useContext(TabsContext);
    
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        value={value}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)] disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-base",
          variant === "pill" && "rounded-md hover:text-[var(--cu-text-primary)] data-[state=active]:text-[var(--cu-text-primary)] z-10",
          variant === "underline" && "hover:text-[var(--cu-text-primary)] data-[state=active]:text-[var(--cu-primary)] -mb-[1px]",
          variant === "boxed" && "rounded-t-lg border border-transparent hover:bg-[var(--cu-surface)] data-[state=active]:border-[var(--cu-border)] data-[state=active]:border-b-transparent data-[state=active]:bg-[var(--cu-bg)]",
          className
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
          {badge !== undefined && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-[var(--cu-surface-2)] px-1.5 text-[10px] font-medium text-[var(--cu-text-secondary)]">
              {badge}
            </span>
          )}
        </span>
        
        {variant === "underline" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--cu-primary)] opacity-0 transition-opacity data-[state=active]:opacity-100" />
        )}
      </TabsPrimitive.Trigger>
    );
  }
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)]",
        className
      )}
      {...props}
    />
  )
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export default Tabs;
