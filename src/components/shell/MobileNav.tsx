"use client";

import React from "react";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { CountBadge } from "@/components/ui/Badge";

/* ═══════════════════════════════════════════════════════
   Apexa Mobile Nav — Bottom Tab Bar
   Features: Fixed bottom bar, safe area support,
             badge counts, active indicator
   ═══════════════════════════════════════════════════════ */

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MobileNavProps {
  items: MobileNavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function MobileNav({
  items,
  activeTab,
  onTabChange,
  className = "",
}: MobileNavProps) {
  // Show max 5 items on mobile
  const visibleItems = items.slice(0, 5);

  return (
    <nav
      className={[
        "md:hidden fixed bottom-0 left-0 right-0 z-[var(--ax-z-fixed)]",
        "flex items-center justify-around",
        "h-[var(--ax-mobile-nav-height)]",
        "bg-[var(--cu-surface)] border-t border-[var(--cu-border)]",
        "backdrop-blur-xl",
        "safe-area-bottom",
        className,
      ].join(" ")}
      aria-label="Mobile navigation"
    >
      {visibleItems.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={[
              "relative flex flex-col items-center justify-center gap-0.5",
              "flex-1 h-full pt-1 cursor-pointer select-none",
              "transition-colors duration-150",
              isActive
                ? "text-[var(--cu-primary)]"
                : "text-[var(--cu-text-muted)]",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Active top indicator bar */}
            {isActive && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[var(--cu-primary)] rounded-full" />
            )}

            {/* Icon with badge */}
            <span className="relative [&>svg]:w-5 [&>svg]:h-5">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold bg-[var(--cu-danger)] text-white rounded-full">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </span>

            {/* Label */}
            <span className="text-[10px] font-medium leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileNav;
