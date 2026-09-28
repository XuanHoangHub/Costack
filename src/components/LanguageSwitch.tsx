"use client";

import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '@/contexts/TranslationContext';
import { VietnamFlag, USFlag } from '@/components/LanguageDropdown';

export interface LanguageSwitchProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'capsule' | 'toggle';
  className?: string;
}

export default function LanguageSwitch({
  size = 'sm',
  variant = 'capsule',
  className = '',
}: LanguageSwitchProps) {
  const { setLocale, locale, isVietnamese } = useTranslation();

  const handleSelect = (target: 'vi' | 'en', e: React.MouseEvent) => {
    if (locale === target) return;
    setLocale(target, e);
  };

  const handleToggle = (e: React.MouseEvent) => {
    setLocale(isVietnamese ? 'en' : 'vi', e);
  };

  // Compact single-button toggle variant
  if (variant === 'toggle') {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleToggle}
        aria-label={isVietnamese ? 'Chuyển sang Tiếng Anh' : 'Switch to Vietnamese'}
        title={isVietnamese ? 'Chuyển sang Tiếng Anh (EN)' : 'Chuyển sang Tiếng Việt (VI)'}
        className={`
          group relative inline-flex items-center gap-1.5 rounded-full select-none cursor-pointer
          bg-white/80 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.12]
          border border-slate-200/90 dark:border-white/10 backdrop-blur-md
          shadow-3xs hover:shadow-[0_2px_10px_rgba(59,130,246,0.15)]
          transition-all duration-200
          ${size === 'xs' ? 'h-6 px-2 text-[10px]' : size === 'sm' ? 'h-7.5 px-2.5 text-xs' : 'h-8.5 px-3 text-xs'}
          ${className}
        `}
      >
        <motion.div
          key={locale}
          initial={{ rotate: -15, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="flex items-center gap-1.5 shrink-0"
        >
          {isVietnamese ? (
            <VietnamFlag className="w-4 h-2.8 rounded-[2px] shadow-2xs" />
          ) : (
            <USFlag className="w-4 h-2.8 rounded-[2px] shadow-2xs" />
          )}
          <span className="font-black tracking-tight text-slate-800 dark:text-slate-100 font-sans">
            {isVietnamese ? 'VI' : 'EN'}
          </span>
        </motion.div>
      </motion.button>
    );
  }

  // Modern 2-way segmented capsule (Default)
  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`
        relative inline-flex items-center p-0.5 rounded-full select-none
        bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10
        backdrop-blur-md shadow-3xs
        ${size === 'xs' ? 'h-6 text-[10px]' : size === 'sm' ? 'h-7.5 text-[11px]' : size === 'lg' ? 'h-9 text-xs' : 'h-8 text-xs'}
        ${className}
      `}
    >
      {/* Vietnamese Option */}
      <button
        type="button"
        onClick={(e) => handleSelect('vi', e)}
        aria-pressed={isVietnamese}
        title="Tiếng Việt (VI)"
        className={`
          relative z-10 flex items-center gap-1.5 h-full rounded-full font-bold transition-all duration-150 cursor-pointer
          ${size === 'xs' ? 'px-2' : size === 'sm' ? 'px-2.5' : 'px-3'}
          ${
            isVietnamese
              ? 'text-blue-600 dark:text-white font-black'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }
        `}
      >
        {isVietnamese && (
          <motion.div
            layoutId="language-switch-pill"
            className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/15 -z-10"
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        )}
        <VietnamFlag className="w-3.5 h-2.5 rounded-[2px] shadow-2xs shrink-0" />
        <span className="leading-none tracking-tight">VI</span>
      </button>

      {/* English Option */}
      <button
        type="button"
        onClick={(e) => handleSelect('en', e)}
        aria-pressed={!isVietnamese}
        title="English (EN)"
        className={`
          relative z-10 flex items-center gap-1.5 h-full rounded-full font-bold transition-all duration-150 cursor-pointer
          ${size === 'xs' ? 'px-2' : size === 'sm' ? 'px-2.5' : 'px-3'}
          ${
            !isVietnamese
              ? 'text-blue-600 dark:text-white font-black'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }
        `}
      >
        {!isVietnamese && (
          <motion.div
            layoutId="language-switch-pill"
            className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/15 -z-10"
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        )}
        <USFlag className="w-3.5 h-2.5 rounded-[2px] shadow-2xs shrink-0" />
        <span className="leading-none tracking-tight">EN</span>
      </button>
    </div>
  );
}
