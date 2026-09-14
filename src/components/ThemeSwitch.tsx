"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';

interface ThemeSwitchProps {
  isDarkMode?: boolean;
  onToggle?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function ThemeSwitch({
  isDarkMode: propIsDark,
  onToggle: propOnToggle,
  size = 'md',
  showLabel = false,
  className = '',
}: ThemeSwitchProps) {
  const { localize: l } = useTranslation();
  const storeIsDark = useUiStore((s) => s.isDarkMode);
  const storeSetIsDark = useUiStore((s) => s.setIsDarkMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = propIsDark !== undefined ? propIsDark : storeIsDark;

  const handleToggle = () => {
    if (propOnToggle) {
      propOnToggle();
    } else {
      storeSetIsDark(!isDark);
    }
  };

  // Prevent SSR flash
  if (!mounted) {
    const skeletonClass =
      size === 'sm'
        ? 'w-11 h-6'
        : size === 'lg'
        ? 'w-15 h-8'
        : 'w-13 h-7';
    return (
      <div
        className={`rounded-full bg-slate-200/70 dark:bg-slate-800/70 animate-pulse ${skeletonClass} ${className}`}
      />
    );
  }

  // Size configurations
  const config = {
    sm: {
      track: 'w-11 h-6 p-0.5',
      knob: 'w-5 h-5',
      travelPx: 20,
      iconSize: 11,
      ambientIconSize: 10,
    },
    md: {
      track: 'w-13 h-7 p-0.5',
      knob: 'w-6 h-6',
      travelPx: 24,
      iconSize: 13,
      ambientIconSize: 11,
    },
    lg: {
      track: 'w-15 h-8 p-0.5',
      knob: 'w-7 h-7',
      travelPx: 28,
      iconSize: 14,
      ambientIconSize: 12,
    },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <motion.button
        type="button"
        role="switch"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.04 }}
        aria-checked={isDark}
        aria-label={isDark ? l('Chuyển sang giao diện sáng', 'Switch to light mode') : l('Chuyển sang giao diện tối', 'Switch to dark mode')}
        title={isDark ? l('Chuyển sang giao diện sáng', 'Switch to light mode') : l('Chuyển sang giao diện tối', 'Switch to dark mode')}
        onClick={handleToggle}
        className={`
          group relative inline-flex shrink-0 cursor-pointer items-center rounded-full
          transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2
          focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2
          ${config.track}
          ${
            isDark
              ? 'bg-slate-950 border border-indigo-500/35 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7),0_0_10px_rgba(99,102,241,0.2)] hover:border-indigo-400/60'
              : 'bg-slate-200/90 hover:bg-slate-200 border border-slate-300/80 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] hover:border-amber-400/50'
          }
        `}
      >
        {/* Ambient Track Icons */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          {/* Sun icon on left */}
          <Sun
            size={config.ambientIconSize}
            className={`transition-all duration-300 ${
              isDark
                ? 'opacity-40 text-amber-400/60 scale-75'
                : 'opacity-0 scale-50'
            }`}
          />
          {/* Moon icon on right */}
          <div className="flex items-center gap-0.5 ml-auto">
            <Moon
              size={config.ambientIconSize}
              className={`transition-all duration-300 ${
                isDark
                  ? 'opacity-0 scale-50'
                  : 'opacity-40 text-slate-400 scale-75'
              }`}
            />
          </div>
        </div>

        {/* Sliding Thumb Knob with Spring Physics & Morphing Icon */}
        <motion.span
          animate={{ x: isDark ? config.travelPx : 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 28 }}
          className={`
            pointer-events-none relative flex items-center justify-center rounded-full
            ${config.knob}
            ${
              isDark
                ? 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-amber-200 shadow-[0_2px_10px_rgba(99,102,241,0.5),0_1px_2px_rgba(0,0,0,0.3)] border border-indigo-300/40'
                : 'bg-white text-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.25),0_1px_2px_rgba(0,0,0,0.08)] border border-amber-200/60'
            }
          `}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="dark-icon"
                initial={{ rotate: -120, scale: 0.2, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 120, scale: 0.2, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                className="flex items-center justify-center"
              >
                <Moon size={config.iconSize} className="fill-amber-200/40 stroke-[2.2]" />
              </motion.div>
            ) : (
              <motion.div
                key="light-icon"
                initial={{ rotate: 120, scale: 0.2, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -120, scale: 0.2, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                className="flex items-center justify-center"
              >
                <Sun size={config.iconSize} className="stroke-[2.4] fill-amber-400/30" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.span>
      </motion.button>

      {showLabel && (
        <span
          onClick={handleToggle}
          className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {isDark ? l('Chế độ tối', 'Dark mode') : l('Chế độ sáng', 'Light mode')}
        </span>
      )}
    </div>
  );
}
