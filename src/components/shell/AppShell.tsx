"use client";

import React from "react";

/* ═══════════════════════════════════════════════════════
   Apexa App Shell — 3-Zone Grid Layout
   Zone 1: Navigation Rail (sidebar)
   Zone 2: Top Header Bar
   Zone 3: Main Content Canvas
   ═══════════════════════════════════════════════════════ */

interface AppShellProps {
  /** Left sidebar content */
  sidebar: React.ReactNode;
  /** Top header bar content */
  header: React.ReactNode;
  /** Main content area */
  children: React.ReactNode;
  /** Whether sidebar is collapsed to icon-only mode */
  sidebarCollapsed?: boolean;
  /** Whether mobile sidebar drawer is open */
  mobileSidebarOpen?: boolean;
  /** Callback to close mobile sidebar */
  onMobileSidebarClose?: () => void;
  className?: string;
}

export function AppShell({
  sidebar,
  header,
  children,
  sidebarCollapsed = false,
  mobileSidebarOpen = false,
  onMobileSidebarClose,
  className = "",
}: AppShellProps) {
  return (
    <div
      className={[
        "apexa-app-shell apexa-design-system",
        "fixed inset-0 flex h-screen w-screen overflow-hidden",
        "bg-[var(--cu-bg)] text-[var(--cu-text-primary)]",
        className,
      ].join(" ")}
    >
      {/* ── Zone 1: Desktop Sidebar ── */}
      <aside
        className={[
          "hidden md:flex flex-col shrink-0 h-full",
          "bg-[var(--sidebar-bg,#10121a)] text-white",
          "border-r border-white/[0.06]",
          "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "overflow-hidden z-[var(--ax-z-fixed)]",
          sidebarCollapsed ? "w-[var(--ax-sidebar-collapsed)]" : "w-[var(--ax-sidebar-width)]",
        ].join(" ")}
        aria-label="Main navigation"
      >
        {sidebar}
      </aside>

      {/* ── Zone 1b: Mobile Sidebar Drawer ── */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--ax-z-drawer)] bg-black/60 md:hidden"
            onClick={onMobileSidebarClose}
            aria-hidden="true"
          />
          <aside
            className={[
              "fixed inset-y-0 left-0 z-[var(--ax-z-drawer)]",
              "w-[280px] flex flex-col md:hidden",
              "bg-[var(--sidebar-bg,#10121a)] text-white",
              "shadow-2xl",
              "animate-[ax-slide-in-right_0.25s_ease-out]",
              "safe-area-top safe-area-bottom",
            ].join(" ")}
            aria-label="Mobile navigation"
          >
            {sidebar}
          </aside>
        </>
      )}

      {/* ── Zone 2 + 3: Header + Content ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header
          className={[
            "shrink-0 flex items-center",
            "h-[var(--ax-header-height)] px-3 md:px-4",
            "bg-[var(--cu-bg)] border-b border-[var(--cu-border)]",
            "z-[var(--ax-z-sticky)]",
          ].join(" ")}
        >
          {header}
        </header>

        {/* Main Content Canvas */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          id="apexa-main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
