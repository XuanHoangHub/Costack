"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, ArrowUpRight, Search, Plus, Sparkles, Pin } from 'lucide-react';
import { selectAllMiniApps, useMiniAppStore } from '@/store/miniAppStore';
import MiniAppIcon from '@/components/miniapp/MiniAppIcon';
import { useTranslation } from '@/contexts/TranslationContext';

interface MiniAppLauncherButtonProps {
  onSelectApp: (appId: string) => void;
  onOpenHub: () => void;
  className?: string;
  disabled?: boolean;
}

export default function MiniAppLauncherButton({
  onSelectApp,
  onOpenHub,
  className = '',
  disabled = false,
}: MiniAppLauncherButtonProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const pinnedAppIds = useMiniAppStore((s) => s.pinnedAppIds);
  const customApps = useMiniAppStore((s) => s.customApps);
  const recentAppIds = useMiniAppStore((s) => s.recentAppIds);
  const disabledAppIds = useMiniAppStore((s) => s.disabledAppIds);

  const allApps = useMemo(() => {
    return selectAllMiniApps(pinnedAppIds, customApps, disabledAppIds);
  }, [pinnedAppIds, customApps, disabledAppIds]);

  const enabledApps = useMemo(() => {
    return allApps.filter((app) => app.isEnabled !== false);
  }, [allApps]);

  const filteredApps = useMemo(() => {
    if (!search.trim()) return enabledApps;
    const q = search.toLowerCase().trim();
    return enabledApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.nameVi?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [enabledApps, search]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAppClick = (appId: string) => {
    setIsOpen(false);
    onSelectApp(appId);
  };

  return (
    <div className={`relative ${className}`}>
      {/* ▦ Launcher Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (disabled) {
            onOpenHub();
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={`apexa-header-icon-button h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-3xs ${
          disabled
            ? 'opacity-60 bg-white/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/[0.06] text-slate-400 dark:text-zinc-500'
            : isOpen
              ? 'bg-blue-50 dark:bg-zinc-800 border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-sky-300 ring-2 ring-blue-500/15'
              : 'bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
        }`}
        title={disabled ? (isVi ? 'Kho ứng dụng Mini Apps đang phát triển' : 'Mini Apps is under development') : (isVi ? 'Trình khởi chạy Mini App (▦)' : 'Mini App Launcher (▦)')}
        aria-label="Open mini apps launcher"
        aria-disabled={disabled}
        aria-expanded={isOpen}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 p-3 bg-white/95 dark:bg-zinc-900/95 border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl z-[150] overflow-hidden font-sans"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                {isVi ? 'Ứng dụng Mini Apps' : 'Workspace Mini Apps'}
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenHub();
                }}
                className="text-[11px] font-extrabold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isVi ? 'Xem tất cả' : 'View all'}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isVi ? 'Tìm nhanh ứng dụng...' : 'Filter apps...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-100"
              />
            </div>

            {/* Apps Grid */}
            <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto custom-scrollbar p-0.5">
              {filteredApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleAppClick(app.id)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer group text-center"
                >
                  <MiniAppIcon
                    appId={app.id}
                    icon={app.icon}
                    iconName={app.iconName}
                    gradient={app.gradient}
                    color={app.color}
                    variant="launcher"
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 mt-1.5 truncate w-full group-hover:text-blue-600 dark:group-hover:text-sky-400">
                    {isVi ? app.nameVi || app.name : app.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Bottom Footer */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/10 space-y-1.5">
              {disabledAppIds.length > 0 && (
                <div className="px-2 py-1 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                  <span>{isVi ? `${disabledAppIds.length} ứng dụng đang tắt` : `${disabledAppIds.length} apps disabled`}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenHub();
                    }}
                    className="font-bold underline cursor-pointer hover:text-amber-900 dark:hover:text-amber-200"
                  >
                    {isVi ? 'Quản lý' : 'Manage'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenHub();
                }}
                className="w-full py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-sky-400 text-slate-600 dark:text-zinc-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isVi ? 'Khám phá Kho ứng dụng đầy đủ' : 'Explore full App Directory'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
