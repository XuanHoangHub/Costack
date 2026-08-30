"use client";

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { VietnamFlag, USFlag } from '@/components/LanguageDropdown';

interface LanguageSwitchProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function LanguageSwitch({
  size = 'sm',
  className = '',
}: LanguageSwitchProps) {
  const { setLocale, isVietnamese } = useTranslation();

  const toggleLanguage = () => {
    setLocale(isVietnamese ? 'en' : 'vi');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={isVietnamese ? 'Chuyển sang Tiếng Anh' : 'Switch to Vietnamese'}
      title={isVietnamese ? 'Chuyển sang Tiếng Anh (EN)' : 'Chuyển sang Tiếng Việt (VI)'}
      className={`
        group relative inline-flex items-center gap-1.5 rounded-full select-none cursor-pointer
        bg-white/90 dark:bg-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.14]
        border border-slate-200/90 dark:border-white/12 backdrop-blur-md
        shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-sm
        active:scale-95 transition-all duration-200
        ${size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7.5 px-2.5 text-xs'}
        ${className}
      `}
    >
      {/* Current Flag & Label */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isVietnamese ? (
          <VietnamFlag className="w-4 h-2.8 rounded-[2.5px] shadow-2xs group-hover:scale-105 transition-transform" />
        ) : (
          <USFlag className="w-4 h-2.8 rounded-[2.5px] shadow-2xs group-hover:scale-105 transition-transform" />
        )}
        <span className="font-black tracking-tight text-slate-800 dark:text-slate-100 font-display">
          {isVietnamese ? 'VI' : 'EN'}
        </span>
      </div>
    </button>
  );
}
