"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

/* ═══════════════════════════════════════════════════════
   Apexa ViewSwitcher — Horizontal Tab Bar for Views
   Views: List, Board, Calendar, Gantt, Table, Overview
   Features: Animated sliding pill indicator, Add View button
   ═══════════════════════════════════════════════════════ */

export interface ViewOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface ViewSwitcherProps {
  /** Available views */
  views: ViewOption[];
  /** Currently active view */
  activeView: string;
  /** Callback when a view is selected */
  onViewChange: (viewId: string) => void;
  /** Show the add view button */
  showAddView?: boolean;
  /** Callback when add view is clicked */
  onAddView?: () => void;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

export function ViewSwitcher({
  views,
  activeView,
  onViewChange,
  showAddView = false,
  onAddView,
  size = "sm",
  className = "",
}: ViewSwitcherProps) {
  const reducedMotion = useReducedMotion();

  const sizeStyles = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-8 px-3 text-[13px]",
  };

  return (
    <div
      className={[
        "inline-flex items-center gap-0.5 p-1",
        "bg-[var(--cu-surface-2)] rounded-[var(--ax-radius-lg)]",
        "border border-[var(--cu-border)]",
        className,
      ].join(" ")}
      role="tablist"
      aria-label="View switcher"
    >
      {views.map((view) => {
        const isActive = activeView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onViewChange(view.id)}
            className={[
              "relative flex items-center gap-1.5 rounded-[var(--ax-radius-md)]",
              "font-medium transition-colors cursor-pointer select-none",
              sizeStyles[size],
              isActive
                ? "text-[var(--cu-text-primary)]"
                : "text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)]",
            ].join(" ")}
          >
            {/* Active pill background */}
            {isActive && (
              <motion.div
                layoutId={reducedMotion ? undefined : "view-switcher-pill"}
                className="absolute inset-0 rounded-[var(--ax-radius-md)] bg-[var(--cu-surface)] shadow-[var(--ax-shadow-xs)] border border-[var(--cu-border)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            {/* Icon */}
            {view.icon && (
              <span className="relative z-10 [&>svg]:w-3.5 [&>svg]:h-3.5">
                {view.icon}
              </span>
            )}

            {/* Label */}
            <span className="relative z-10">{view.label}</span>

            {/* Badge */}
            {view.badge !== undefined && view.badge > 0 && (
              <span className="relative z-10 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold bg-[var(--cu-primary-light)] text-[var(--cu-primary)] rounded-full">
                {view.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Add View Button */}
      {showAddView && (
        <button
          type="button"
          onClick={onAddView}
          className="flex items-center justify-center w-7 h-7 rounded-[var(--ax-radius-md)] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface)] transition-colors cursor-pointer"
          aria-label="Add view"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ViewSwitcher;
