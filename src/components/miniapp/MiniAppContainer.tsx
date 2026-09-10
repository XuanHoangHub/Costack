"use client";

import React, { useState } from 'react';
import {
  ArrowLeft, Pin, PinOff, RefreshCw, ExternalLink,
  Maximize2, Minimize2, Sparkles, AlertCircle, Globe, Power
} from 'lucide-react';
import { MiniAppItem } from '@/types/miniapp';
import { useMiniAppStore } from '@/store/miniAppStore';
import MiniAppIcon from './MiniAppIcon';
import { useTranslation } from '@/contexts/TranslationContext';

interface MiniAppContainerProps {
  app: MiniAppItem;
  onBackToHub: () => void;
  children?: React.ReactNode;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function MiniAppContainer({
  app,
  onBackToHub,
  children,
  triggerToast,
}: MiniAppContainerProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const pinnedAppIds = useMiniAppStore((s) => s.pinnedAppIds);
  const togglePin = useMiniAppStore((s) => s.togglePin);
  const disableApp = useMiniAppStore((s) => s.disableApp);
  const isPinned = pinnedAppIds.includes(app.id);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const handleTogglePin = () => {
    togglePin(app.id);
    if (!isPinned) {
      triggerToast?.(
        'success',
        isVi ? 'Đã ghim lên thanh bên' : 'Pinned to sidebar',
        isVi ? `Ứng dụng ${app.name} đã được thêm vào thanh điều hướng.` : `${app.name} is now accessible from your sidebar.`
      );
    } else {
      triggerToast?.(
        'info',
        isVi ? 'Đã bỏ ghim' : 'Unpinned',
        isVi ? `Đã gỡ ${app.name} khỏi thanh bên.` : `Removed ${app.name} from sidebar.`
      );
    }
  };

  const handleDisableApp = () => {
    if (confirm(isVi ? `Tắt ứng dụng "${app.nameVi || app.name}"? Ứng dụng sẽ được ẩn khỏi thanh bên và thanh khởi chạy nhanh.` : `Disable "${app.name}"? It will be removed from your sidebar and quick launcher.`)) {
      disableApp(app.id);
      triggerToast?.('info', isVi ? 'Đã tắt ứng dụng' : 'App disabled', app.nameVi || app.name);
      onBackToHub();
    }
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
    setIframeLoaded(false);
    setIframeError(false);
  };

  const openExternal = () => {
    if (app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  };

  const isCustomEmbed = Boolean(app.url && !app.isSystem);

  return (
    <div
      className={`w-full h-full flex flex-col bg-white dark:bg-transparent ${
        isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-[#09090b]' : 'relative'
      }`}
    >
      {/* Mini App Top Header Bar */}
      <header className="shrink-0 h-12 px-3 sm:px-4 border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-zinc-950/40 backdrop-blur-md select-none z-20">
        {/* Left: Back button & App title info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToHub}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-3xs"
            title={isVi ? 'Quay lại Kho ứng dụng' : 'Back to App Hub'}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isVi ? 'Kho ứng dụng' : 'Mini Apps'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

          <div className="flex items-center gap-2 min-w-0">
            <MiniAppIcon
              appId={app.id}
              icon={app.icon}
              iconName={app.iconName}
              gradient={app.gradient}
              color={app.color}
              variant="header"
            />
            <h1 className="text-sm font-black text-slate-900 dark:text-white truncate">
              {isVi ? app.nameVi || app.name : app.name}
            </h1>
            {app.badge && (
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/20 dark:text-sky-300 dark:border-blue-400/30">
                {app.badge}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pin to sidebar toggle */}
          <button
            type="button"
            onClick={handleTogglePin}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-3xs ${
              isPinned
                ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/60'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-700'
            }`}
            title={isPinned ? (isVi ? 'Bỏ ghim khỏi thanh bên' : 'Unpin from sidebar') : (isVi ? 'Ghim lên thanh bên' : 'Pin to sidebar')}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {isPinned ? (isVi ? 'Đã ghim' : 'Pinned') : (isVi ? 'Ghim thanh bên' : 'Pin to sidebar')}
            </span>
          </button>

          {/* Reload button for iframe web apps */}
          {isCustomEmbed && (
            <button
              type="button"
              onClick={handleReload}
              className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title={isVi ? 'Tải lại trang' : 'Reload'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* External link button */}
          {app.url && (
            <button
              type="button"
              onClick={openExternal}
              className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title={isVi ? 'Mở trong tab mới' : 'Open in new tab'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            title={isFullscreen ? (isVi ? 'Thu nhỏ' : 'Exit fullscreen') : (isVi ? 'Toàn màn hình' : 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Disable App Button */}
          <button
            type="button"
            onClick={handleDisableApp}
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title={isVi ? 'Tắt ứng dụng này' : 'Disable this app'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Canvas Body */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden">
        {isCustomEmbed ? (
          <div className="w-full h-full relative flex flex-col">
            {!iframeLoaded && !iframeError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 p-6">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {isVi ? `Đang kết nối tới ${app.name}...` : `Connecting to ${app.name}...`}
                </p>
              </div>
            )}

            <iframe
              key={iframeKey}
              src={app.url}
              title={app.name}
              className="w-full h-full border-0 flex-1 bg-white dark:bg-zinc-900"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
            />

            {/* Bottom helper bar for embed web apps */}
            <div className="h-8 px-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <Globe className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span className="truncate">{app.url}</span>
              </span>
              <button
                type="button"
                onClick={openExternal}
                className="text-blue-600 dark:text-sky-400 font-bold hover:underline shrink-0 ml-2"
              >
                {isVi ? 'Mở cửa sổ riêng ↗' : 'Open in new window ↗'}
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
