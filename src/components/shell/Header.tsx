"use client";

import React from "react";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { Badge, CountBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

/* ═══════════════════════════════════════════════════════
   Apexa Header — Top Bar Component
   Features:
   - Mobile menu toggle
   - Breadcrumb navigation
   - View switcher tabs (center)
   - Search, Clock, Density, Language, Theme, Notifications, Profile
   ═══════════════════════════════════════════════════════ */

interface BreadcrumbItem {
  label: string;
  emoji?: string;
  onClick?: () => void;
}

interface HeaderProps {
  /** Breadcrumb items to display */
  breadcrumbs?: BreadcrumbItem[];
  /** Toggle mobile sidebar */
  onMobileMenuClick?: () => void;
  /** Toggle sidebar collapse */
  onSidebarToggle?: () => void;
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Search trigger */
  onSearchClick?: () => void;
  /** Current time display */
  currentTime?: string;
  /** UI density mode */
  density?: "comfortable" | "compact" | "spacious";
  onDensityChange?: (density: "comfortable" | "compact" | "spacious") => void;
  /** Notification count */
  unreadCount?: number;
  onNotificationClick?: () => void;
  /** User info */
  userName?: string;
  userAvatar?: string;
  userStatus?: "online" | "away" | "dnd" | "offline";
  onProfileClick?: () => void;
  /** Theme/Language controls */
  themeSlot?: React.ReactNode;
  languageSlot?: React.ReactNode;
  /** Upgrade button for free users */
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
  /** Optional center content (view switcher) */
  centerContent?: React.ReactNode;
  /** Optional right content (extra actions) */
  rightContent?: React.ReactNode;
  className?: string;
}

export function Header({
  breadcrumbs = [],
  onMobileMenuClick,
  onSidebarToggle,
  sidebarCollapsed = false,
  onSearchClick,
  currentTime,
  density = "comfortable",
  onDensityChange,
  unreadCount = 0,
  onNotificationClick,
  userName,
  userAvatar,
  userStatus = "online",
  onProfileClick,
  themeSlot,
  languageSlot,
  showUpgrade = false,
  onUpgradeClick,
  centerContent,
  rightContent,
  className = "",
}: HeaderProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={["flex items-center gap-2 w-full h-full", className].join(" ")}>
        {/* ── Left Section ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-[var(--ax-radius-md)] text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface-2)] transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Sidebar Toggle (Desktop) */}
          <Tooltip content={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"} shortcut="⌘\\" side="bottom">
            <button
              type="button"
              onClick={onSidebarToggle}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-[var(--ax-radius-md)] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface-2)] transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" d="M4 4h6v16H4zM14 4h6v16h-6z" />
                ) : (
                  <path strokeLinecap="round" d="M4 4h6v16H4zM14 4h6v16h-6z" />
                )}
              </svg>
            </button>
          </Tooltip>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 text-[13px]" aria-label="Breadcrumb">
              {breadcrumbs.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <svg className="w-3.5 h-3.5 text-[var(--cu-text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={[
                      "flex items-center gap-1.5 px-1.5 py-1 rounded-[var(--ax-radius-sm)]",
                      "hover:bg-[var(--cu-surface-2)] transition-colors cursor-pointer",
                      "max-w-[160px] truncate",
                      idx === breadcrumbs.length - 1
                        ? "text-[var(--cu-text-primary)] font-semibold"
                        : "text-[var(--cu-text-muted)]",
                    ].join(" ")}
                  >
                    {item.emoji && <span className="text-sm">{item.emoji}</span>}
                    <span className="truncate">{item.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        {/* ── Center Section (View Switcher) ── */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {centerContent}
        </div>

        {/* ── Right Section ── */}
        <div className="flex items-center gap-1 shrink-0">
          {rightContent}

          {/* Search Omnibar Button */}
          <Tooltip content="Tìm kiếm nhanh (⌘K)" shortcut="⌘K" side="bottom">
            <div>
              {/* Desktop Omnibar Input Simulation */}
              <button
                type="button"
                onClick={onSearchClick}
                className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-[var(--ax-radius-lg)] bg-[var(--cu-surface-2)] hover:bg-[var(--cu-surface-3)] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] border border-[var(--cu-border)]/70 hover:border-[var(--cu-border)] transition-all cursor-pointer group text-xs shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-[var(--cu-text-muted)] group-hover:text-[var(--cu-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
                <span className="hidden md:inline font-medium text-[12px]">Tìm kiếm hoặc lệnh...</span>
                <kbd className="ml-1 text-[10px] font-mono text-[var(--cu-text-muted)] bg-[var(--cu-surface-1)] px-1.5 py-0.5 rounded border border-[var(--cu-border)] shadow-xs">
                  ⌘K
                </kbd>
              </button>

              {/* Mobile Icon Button */}
              <button
                type="button"
                onClick={onSearchClick}
                className="sm:hidden flex items-center justify-center w-8 h-8 rounded-[var(--ax-radius-md)] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface-2)] transition-colors cursor-pointer"
                aria-label="Tìm kiếm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </div>
          </Tooltip>

          {/* Clock */}
          {currentTime && (
            <div className="hidden lg:flex items-center px-2 py-1 rounded-[var(--ax-radius-md)] bg-[var(--cu-surface-2)]/60 border border-[var(--cu-border)]/40 text-[11px] font-mono text-[var(--cu-text-muted)] tabular-nums shadow-xs">
              {currentTime}
            </div>
          )}

          {/* Density Toggle */}
          {onDensityChange && (
            <Tooltip content={`Mật độ: ${density === "comfortable" ? "Thoải mái" : density === "compact" ? "Thu gọn" : "Rộng rãi"}`} side="bottom">
              <button
                type="button"
                onClick={() => {
                  const next = density === "comfortable" ? "compact" : density === "compact" ? "spacious" : "comfortable";
                  onDensityChange(next);
                }}
                className="hidden md:flex items-center justify-center w-8 h-8 rounded-[var(--ax-radius-md)] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface-2)] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </Tooltip>
          )}

          {/* Upgrade CTA */}
          {showUpgrade && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="hidden md:flex items-center gap-1.5 h-7 px-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
              Pro
            </button>
          )}

          {/* Theme / Language Slots */}
          {languageSlot}
          {themeSlot}

          {/* Notifications */}
          <Tooltip content="Thông báo" side="bottom">
            <button
              type="button"
              onClick={onNotificationClick}
              className="relative flex items-center justify-center w-8 h-8 rounded-[var(--ax-radius-md)] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-surface-2)] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold bg-[var(--cu-danger)] text-white rounded-full shadow-xs ring-2 ring-[var(--cu-bg)] animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Profile Avatar */}
          <Tooltip content={userName || "Tài khoản"} side="bottom">
            <button
              type="button"
              onClick={onProfileClick}
              className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-[var(--cu-primary)]/20 transition-all cursor-pointer ml-1"
            >
              <Avatar
                src={userAvatar}
                name={userName || "User"}
                size="sm"
                status={userStatus}
              />
            </button>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Header;
