"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';

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
      travel: 'translate-x-5',
      iconSize: 11,
      ambientIconSize: 10,
    },
    md: {
      track: 'w-13 h-7 p-0.5',
      knob: 'w-6 h-6',
      travel: 'translate-x-6',
      iconSize: 13,
      ambientIconSize: 11,
    },
    lg: {
      track: 'w-15 h-8 p-0.5',
      knob: 'w-7 h-7',
      travel: 'translate-x-7',
      iconSize: 14,
      ambientIconSize: 12,
    },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        title={isDark ? 'Chuyển sang giao diện sáng (Light Mode)' : 'Chuyển sang giao diện tối (Dark Mode)'}
        onClick={handleToggle}
        className={`
          group relative inline-flex shrink-0 cursor-pointer items-center rounded-full
          transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2
          focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2
          ${config.track}
          ${
            isDark
              ? 'bg-slate-900/90 border border-slate-700/80 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.6),0_1px_2px_rgba(0,0,0,0.4)] hover:border-indigo-500/40'
              : 'bg-slate-200/85 hover:bg-slate-250 border border-slate-300/80 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-400/80'
          }
        `}
      >
        {/* Ambient Track Icons */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          {/* Sun icon on left */}
          <Sun
            size={config.ambientIconSize}
            className={`transition-all duration-150 ${
              isDark
                ? 'opacity-35 text-slate-500 scale-75'
                : 'opacity-0 scale-50'
            }`}
          />
          {/* Moon icon on right */}
          <div className="flex items-center gap-0.5 ml-auto">
            <Moon
              size={config.ambientIconSize}
              className={`transition-all duration-150 ${
                isDark
                  ? 'opacity-0 scale-50'
                  : 'opacity-35 text-slate-400 scale-75'
              }`}
            />
          </div>
        </div>

        {/* Sliding Thumb Knob with Isolated CSS Transform */}
        <span
          className={`
            pointer-events-none relative flex items-center justify-center rounded-full
            transition-all duration-200 ease-out
            ${config.knob}
            ${
              isDark
                ? `${config.travel} bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-600 text-amber-200 shadow-[0_2px_8px_rgba(99,102,241,0.4),0_1px_2px_rgba(0,0,0,0.2)] border border-indigo-400/40`
                : 'translate-x-0 bg-white text-amber-500 shadow-[0_2px_6px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] border border-slate-200/80'
            }
          `}
        >
          {isDark ? (
            <motion.div
              key="dark-icon"
              initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Moon size={config.iconSize} className="fill-amber-200/30 stroke-[2.2]" />
            </motion.div>
          ) : (
            <motion.div
              key="light-icon"
              initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Sun size={config.iconSize} className="stroke-[2.4] fill-amber-400/20" />
            </motion.div>
          )}
        </span>
      </button>

      {showLabel && (
        <span
          onClick={handleToggle}
          className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {isDark ? 'Chế độ tối' : 'Chế độ sáng'}
        </span>
      )}
    </div>
  );
}
