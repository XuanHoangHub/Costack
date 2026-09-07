"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TooltipProvider = TooltipPrimitive.Provider;

export interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
  enabled?: boolean;
}

export const Tooltip = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, TooltipProps>(
  ({ children, content, shortcut, side = "top", sideOffset = 4, className, enabled = true, ...props }, ref) => {
    if (!enabled) {
      return <>{children}</>;
    }
    return (
      <TooltipPrimitive.Root {...props} delayDuration={props.delayDuration ?? 300}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <AnimatePresence>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              ref={ref}
              side={side}
              sideOffset={sideOffset}
              asChild
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm",
                  "bg-[var(--cu-text-primary)] text-[var(--cu-bg)] dark:bg-[var(--cu-surface-3)] dark:text-[var(--cu-text-primary)]",
                  "shadow-md animate-in fade-in-0 zoom-in-95",
                  className
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{content}</span>
                  {shortcut && (
                    <span className="ml-auto text-xs tracking-widest opacity-60">
                      {shortcut}
                    </span>
                  )}
                </div>
                <TooltipPrimitive.Arrow className="fill-[var(--cu-text-primary)] dark:fill-[var(--cu-surface-3)]" />
              </motion.div>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </AnimatePresence>
      </TooltipPrimitive.Root>
    );
  }
);
Tooltip.displayName = "Tooltip";

export default Tooltip;
