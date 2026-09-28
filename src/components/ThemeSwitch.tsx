"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, Laptop, Sparkles, Check, ChevronDown } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';
import { ThemePreference, resolveTheme } from '@/lib/theme';
import { executeThemeTransition } from '@/lib/themeTransition';

export interface ThemeSwitchProps {
  isDarkMode?: boolean;
  onToggle?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'celestial' | 'segmented' | 'icon';
  showLabel?: boolean;
  showModeMenu?: boolean;
  className?: string;
}

export default function ThemeSwitch({
  isDarkMode: propIsDark,
  onToggle: propOnToggle,
  size = 'sm',
  variant = 'celestial',
  showLabel = false,
  showModeMenu = false,
  className = '',
}: ThemeSwitchProps) {
  const { locale } = useTranslation();
  const storeIsDark = useUiStore((s) => s.isDarkMode);
  const storeThemePreference = useUiStore((s) => s.themePreference);
  const storeSetThemePreference = useUiStore((s) => s.setThemePreference);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const isDark = propIsDark !== undefined ? propIsDark : storeIsDark;
  const currentPreference = storeThemePreference || (isDark ? 'dark' : 'light');

  const handleApplyTheme = (targetPref: ThemePreference, e?: React.MouseEvent) => {
    if (propOnToggle && targetPref !== 'system') {
      propOnToggle();
      return;
    }

    try {
      (window as any).playSystemSound?.('pop');
    } catch {}

    executeThemeTransition(targetPref, e, () => {
      storeSetThemePreference(targetPref);
    });
  };

  const handleQuickToggle = (e: React.MouseEvent) => {
    const nextPref: ThemePreference = isDark ? 'light' : 'dark';
    handleApplyTheme(nextPref, e);
  };

  const handleMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
    }, 450);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Prevent SSR flash skeleton
  if (!mounted) {
    const skeletonClass =
      size === 'xs'
        ? 'w-9 h-5'
        : size === 'sm'
        ? 'w-12 h-6.5'
        : size === 'lg'
        ? 'w-16 h-8.5'
        : 'w-14 h-7.5';
    return (
      <div
        className={`rounded-full bg-slate-200/70 dark:bg-slate-800/70 animate-pulse ${skeletonClass} ${className}`}
      />
    );
  }

  // ── VARIANT 1: SEGMENTED 3-WAY PILL (Light / System / Dark) ──
  if (variant === 'segmented') {
    const options: Array<{ id: ThemePreference; labelVi: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }> = [
      { id: 'light', labelVi: 'Sáng', labelEn: 'Light', icon: Sun },
      { id: 'system', labelVi: 'Hệ thống', labelEn: 'Auto', icon: Laptop },
      { id: 'dark', labelVi: 'Tối', labelEn: 'Dark', icon: Moon },
    ];

    return (
      <div className={`relative inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-inner select-none ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = currentPreference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => handleApplyTheme(opt.id, e)}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer z-10 ${
                isSelected
                  ? 'text-indigo-600 dark:text-indigo-400 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="segmentedThemePill"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-xs z-[-1] border border-slate-200/60 dark:border-slate-700/60"
                />
              )}
              <Icon className={`w-3.5 h-3.5 ${isSelected ? (opt.id === 'light' ? 'text-amber-500' : opt.id === 'dark' ? 'text-indigo-400' : 'text-blue-500') : 'text-slate-400'}`} />
              <span>{locale === 'vi' ? opt.labelVi : opt.labelEn}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── VARIANT 2: COMPACT LUXURY ICON BUTTON ──
  if (variant === 'icon') {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleQuickToggle}
        aria-label={isDark ? (locale === 'vi' ? 'Bật chế độ sáng' : 'Switch to light mode') : (locale === 'vi' ? 'Bật chế độ tối' : 'Switch to dark mode')}
        title={isDark ? (locale === 'vi' ? 'Chế độ sáng' : 'Light mode') : (locale === 'vi' ? 'Chế độ tối' : 'Dark mode')}
        className={`relative w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-3xs overflow-hidden ${
          isDark
            ? 'bg-slate-900/90 border-indigo-500/30 text-amber-300 hover:border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
            : 'bg-white border-slate-200 text-amber-500 hover:border-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
        } ${className}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="dark-icon"
              initial={{ rotate: -90, scale: 0.2, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Moon className="w-4 h-4 fill-amber-300/30 stroke-[2.2]" />
            </motion.div>
          ) : (
            <motion.div
              key="light-icon"
              initial={{ rotate: 90, scale: 0.2, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Sun className="w-4 h-4 fill-amber-400/40 stroke-[2.2]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // ── VARIANT 3: FLAGSHIP CELESTIAL DYNAMIC TOGGLE (Default) ──
  // Sizing configurations
  const config = {
    xs: {
      track: 'w-10 h-5.5 p-0.5',
      knob: 'w-4.5 h-4.5',
      travelPx: 18,
      iconSize: 10,
    },
    sm: {
      track: 'w-13 h-7 p-0.5',
      knob: 'w-6 h-6',
      travelPx: 24,
      iconSize: 12,
    },
    md: {
      track: 'w-15 h-8 p-0.5',
      knob: 'w-7 h-7',
      travelPx: 28,
      iconSize: 14,
    },
    lg: {
      track: 'w-18 h-9.5 p-0.5',
      knob: 'w-8.5 h-8.5',
      travelPx: 34,
      iconSize: 16,
    },
  }[size];

  return (
    <div className={`relative inline-flex items-center gap-2 select-none ${className}`} ref={menuRef}>
      <motion.button
        type="button"
        role="switch"
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        aria-checked={isDark}
        aria-label={isDark ? (locale === 'vi' ? 'Chuyển sang giao diện sáng' : 'Switch to light mode') : (locale === 'vi' ? 'Chuyển sang giao diện tối' : 'Switch to dark mode')}
        title={isDark ? (locale === 'vi' ? 'Chế độ sáng (Nhấn giữ/chuột phải để chọn Hệ thống)' : 'Light mode (Hold for options)') : (locale === 'vi' ? 'Chế độ tối (Nhấn giữ/chuột phải để chọn Hệ thống)' : 'Dark mode (Hold for options)')}
        onClick={handleQuickToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className={`
          group relative inline-flex shrink-0 cursor-pointer items-center rounded-full
          transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2
          focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 overflow-hidden
          ${config.track}
          ${
            isDark
              ? 'bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-900 border border-indigo-500/40 shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),0_0_12px_rgba(99,102,241,0.25)] hover:border-indigo-400'
              : 'bg-gradient-to-r from-sky-200/80 via-amber-100/90 to-sky-100/90 border border-amber-300/70 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.06),0_2px_8px_rgba(245,158,11,0.18)] hover:border-amber-400'
          }
        `}
      >
        {/* ── Background Atmospheric Scenery ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Night Sky: 3 Twinkling Constellation Stars */}
          <div
            className={`absolute inset-0 flex items-center justify-between px-2 transition-opacity duration-300 ${
              isDark ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Star 1 */}
            <span className="text-[7px] text-cyan-300 animate-pulse font-mono select-none" style={{ animationDuration: '2s' }}>
              ✦
            </span>
            {/* Star 2 */}
            <span className="text-[6px] text-amber-200 animate-pulse font-mono select-none ml-1 -mt-1" style={{ animationDuration: '3s', animationDelay: '0.4s' }}>
              ★
            </span>
            {/* Star 3 */}
            <span className="text-[8px] text-indigo-300 animate-pulse font-mono select-none mr-2" style={{ animationDuration: '2.5s', animationDelay: '0.8s' }}>
              ✦
            </span>
          </div>

          {/* Day Sky: Soft Floating Clouds */}
          <div
            className={`absolute inset-0 flex items-center justify-end pr-2 transition-opacity duration-300 ${
              isDark ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-0.5 opacity-60">
              <span className="w-2.5 h-1.5 rounded-full bg-white/90 shadow-2xs" />
              <span className="w-3.5 h-2 rounded-full bg-white/95 -ml-1 shadow-2xs" />
              <span className="w-2 h-1.5 rounded-full bg-white/80 -ml-1 shadow-2xs" />
            </div>
          </div>
        </div>

        {/* ── Sliding Celestial Orb (Sun / Moon) with Spring Physics ── */}
        <motion.span
          animate={{ x: isDark ? config.travelPx : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.8 }}
          className={`
            pointer-events-none relative flex items-center justify-center rounded-full z-10
            ${config.knob}
            ${
              isDark
                ? 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-amber-200 shadow-[0_0_12px_rgba(99,102,241,0.6),0_1px_3px_rgba(0,0,0,0.5)] border border-indigo-300/50'
                : 'bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 text-amber-800 shadow-[0_0_12px_rgba(245,158,11,0.65),0_1px_3px_rgba(0,0,0,0.15)] border border-amber-200'
            }
          `}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon-orb"
                initial={{ rotate: -120, scale: 0.3, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 120, scale: 0.3, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                className="flex items-center justify-center"
              >
                <Moon size={config.iconSize} className="fill-amber-200/50 stroke-[2.4] text-amber-200" />
              </motion.div>
            ) : (
              <motion.div
                key="sun-orb"
                initial={{ rotate: 120, scale: 0.3, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -120, scale: 0.3, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                className="flex items-center justify-center"
              >
                <Sun size={config.iconSize} className="stroke-[2.4] fill-amber-300/40 text-amber-700" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.span>
      </motion.button>

      {/* Optional Mode Dropdown Trigger Pill */}
      {showModeMenu && (
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={locale === 'vi' ? 'Tùy chọn chế độ theme' : 'Theme mode options'}
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* ── 3-Way Floating Glass Popover (Light / Dark / System) ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 text-xs"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {locale === 'vi' ? 'Chế độ giao diện' : 'Theme Preference'}
            </div>

            {[
              { id: 'light', labelVi: 'Giao diện Sáng', labelEn: 'Light Mode', icon: Sun, color: 'text-amber-500' },
              { id: 'dark', labelVi: 'Giao diện Tối', labelEn: 'Dark Mode', icon: Moon, color: 'text-indigo-400' },
              { id: 'system', labelVi: 'Theo hệ thống', labelEn: 'System Auto', icon: Laptop, color: 'text-blue-500' },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = currentPreference === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    handleApplyTheme(item.id as ThemePreference, e);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{locale === 'vi' ? item.labelVi : item.labelEn}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Label */}
      {showLabel && (
        <span
          onClick={handleQuickToggle}
          className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {isDark ? (locale === 'vi' ? 'Chế độ tối' : 'Dark mode') : (locale === 'vi' ? 'Chế độ sáng' : 'Light mode')}
        </span>
      )}
    </div>
  );
}
