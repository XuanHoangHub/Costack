"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { Badge, CountBadge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";

/* ═══════════════════════════════════════════════════════
   Apexa Sidebar — Navigation Rail Component
   Features:
   - Workspace switcher header
   - Quick search trigger (⌘K)
   - AI Brain icon with shimmer
   - 13 navigation items with drag-drop reorder
   - Space hierarchy tree (Spaces > Folders > Lists)
   - Favorites section
   - Collapsed mode with tooltip hover cards
   - Spring animation for active pill
   ═══════════════════════════════════════════════════════ */

export interface SidebarNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "default" | "primary" | "success" | "warning" | "danger" | "info" | "gradient";
  /** Whether this item is hidden in current plan */
  hidden?: boolean;
}

interface SidebarProps {
  /** Currently active navigation tab */
  activeTab: string;
  /** Callback when a nav item is clicked */
  onTabChange: (tab: string) => void;
  /** Whether sidebar is collapsed */
  collapsed: boolean;
  /** Toggle collapse state */
  onToggleCollapse: () => void;
  /** Navigation items to render */
  navItems: SidebarNavItem[];
  /** Workspace display name */
  workspaceName?: string;
  /** Workspace avatar/emoji */
  workspaceEmoji?: string;
  /** Callback for workspace menu */
  onWorkspaceClick?: () => void;
  /** Callback for search trigger */
  onSearchClick?: () => void;
  /** Callback for AI button */
  onAiClick?: () => void;
  /** Notification count for inbox */
  unreadCount?: number;
  /** User's current plan */
  isPremium?: boolean;
  /** Whether to show upgrade button */
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
  /** Additional content below nav (space tree etc.) */
  children?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  navItems,
  workspaceName = "Apexa",
  workspaceEmoji = "🚀",
  onWorkspaceClick,
  onSearchClick,
  onAiClick,
  unreadCount = 0,
  isPremium = false,
  showUpgrade = false,
  onUpgradeClick,
  children,
  className = "",
}: SidebarProps) {
  const reducedMotion = useReducedMotion();

  const filteredItems = useMemo(
    () => navItems.filter((item) => !item.hidden),
    [navItems]
  );

  return (
    <TooltipProvider delayDuration={collapsed ? 100 : 500}>
      <div className={["flex flex-col h-full select-none", className].join(" ")}>
        {/* ── Workspace Header ── */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={onWorkspaceClick}
            className={[
              "flex items-center gap-2.5 w-full rounded-[var(--ax-radius-lg)] px-2.5 py-2",
              "hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-[var(--ax-radius-md)] bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm font-bold shrink-0">
              {workspaceEmoji}
            </span>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] font-bold text-white truncate leading-tight">
                  {workspaceName}
                </div>
                <div className="text-[10px] text-white/50 font-medium">
                  {isPremium ? "Pro Plan" : "Free Plan"}
                </div>
              </div>
            )}
            {!collapsed && (
              <svg className="w-3.5 h-3.5 text-white/40 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.427 7.427a.75.75 0 0 1 1.06-.084L8 9.62l2.513-2.277a.75.75 0 0 1 1.006 1.114l-3 2.714a.75.75 0 0 1-1.006 0l-3-2.714a.75.75 0 0 1-.086-1.06Z" />
              </svg>
            )}
          </button>

          {/* Quick Actions Row */}
          <div className={["flex items-center gap-1 mt-1.5", collapsed ? "flex-col px-0" : "px-1"].join(" ")}>
            {/* Search Trigger */}
            <Tooltip content="Tìm kiếm" shortcut="⌘K" side="right">
              <button
                type="button"
                onClick={onSearchClick}
                className={[
                  "flex items-center gap-2 rounded-[var(--ax-radius-md)]",
                  "hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer",
                  collapsed
                    ? "w-9 h-9 justify-center"
                    : "flex-1 h-8 px-2.5 text-left",
                ].join(" ")}
              >
                <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                {!collapsed && (
                  <span className="text-xs text-white/40 truncate">Tìm kiếm...</span>
                )}
                {!collapsed && (
                  <kbd className="ml-auto text-[9px] font-mono text-white/25 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
                    ⌘K
                  </kbd>
                )}
              </button>
            </Tooltip>

            {/* AI Brain Button */}
            <Tooltip content="Apexa AI" side="right">
              <button
                type="button"
                onClick={onAiClick}
                className={[
                  "flex items-center justify-center shrink-0 rounded-[var(--ax-radius-md)]",
                  "hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer",
                  "w-9 h-9",
                  collapsed ? "" : "",
                ].join(" ")}
              >
                <span className="relative">
                  <svg className="w-4.5 h-4.5 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                </span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-3 mb-1 border-t border-white/[0.06]" />

        {/* ── Navigation Items ── */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="px-2 py-1 space-y-0.5" aria-label="Main navigation">
            {filteredItems.map((item) => {
              const isActive = activeTab === item.id;
              const badgeCount = item.id === "inbox" ? unreadCount : undefined;
              const displayBadge = item.badge || (badgeCount && badgeCount > 0 ? badgeCount : undefined);

              return (
                <Tooltip
                  key={item.id}
                  content={item.label}
                  side="right"
                  enabled={collapsed}
                >
                  <button
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={[
                      "group relative flex items-center w-full rounded-[var(--ax-radius-md)]",
                      "transition-all duration-150",
                      "cursor-pointer select-none",
                      collapsed ? "justify-center h-10 w-10 mx-auto rounded-[14px]" : "gap-2.5 h-9 px-2.5",
                      isActive
                        ? (collapsed
                            ? "bg-blue-500/20 text-sky-300 border border-sky-400/30 font-semibold shadow-xs"
                            : "bg-white/[0.12] text-white")
                        : "text-white/60 hover:text-white/90 hover:bg-white/[0.06]",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Active Indicator Pill */}
                    {isActive && (
                      <motion.div
                        layoutId={reducedMotion ? undefined : "sidebar-active-pill"}
                        className="absolute inset-0 rounded-[var(--ax-radius-md)] bg-white/[0.12]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}

                    {/* Icon */}
                    <span className="relative z-10 flex items-center justify-center w-5 h-5 shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]">
                      {item.icon}
                    </span>

                    {/* Label */}
                    {!collapsed && (
                      <span className="relative z-10 text-[13px] font-medium truncate flex-1 text-left">
                        {item.shortLabel || item.label}
                      </span>
                    )}

                    {/* Badge */}
                    {!collapsed && displayBadge && (
                      <span className="relative z-10">
                        {typeof displayBadge === "number" ? (
                          <CountBadge count={displayBadge} variant="primary" />
                        ) : (
                          <Badge variant="primary" size="xs">
                            {displayBadge}
                          </Badge>
                        )}
                      </span>
                    )}

                    {/* Collapsed Badge Dot */}
                    {collapsed && displayBadge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 z-20" />
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </nav>

          {/* ── Additional Content (Space Tree, etc.) ── */}
          {children && (
            <div className="px-2 pt-2 pb-4">
              {children}
            </div>
          )}
        </ScrollArea>

        {/* ── Bottom Section ── */}
        <div className="shrink-0 px-2 pb-3 pt-1 border-t border-white/[0.06]">
          {/* Upgrade Button */}
          {showUpgrade && !isPremium && !collapsed && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="flex items-center justify-center gap-2 w-full h-9 mb-2 rounded-[var(--ax-radius-md)] bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
              Nâng cấp Pro
            </button>
          )}

          {/* Collapse Toggle */}
          <Tooltip content={collapsed ? "Mở rộng" : "Thu gọn"} shortcut="⌘\\" side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className={[
                "flex items-center justify-center rounded-[var(--ax-radius-md)]",
                "text-white/40 hover:text-white/80 hover:bg-white/[0.06]",
                "transition-colors cursor-pointer",
                collapsed ? "w-10 h-9 mx-auto" : "w-full h-8 gap-2",
              ].join(" ")}
            >
              <svg
                className={[
                  "w-4 h-4 transition-transform duration-200",
                  collapsed ? "" : "rotate-180",
                ].join(" ")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!collapsed && (
                <span className="text-xs font-medium">Thu gọn</span>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;
