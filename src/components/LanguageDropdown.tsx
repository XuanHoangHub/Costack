"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Globe, Laptop } from 'lucide-react';
import { useTranslation, LocaleMode } from '@/contexts/TranslationContext';

// 🇻🇳 Official 100% Accurate Vietnam Flag (Constitutional 2:3 ratio & crisp star geometry)
export const VietnamFlag = ({ className = "w-5 h-3.5" }: { className?: string }) => (
  <div className={`relative shrink-0 overflow-hidden rounded-[4px] ring-1 ring-black/10 dark:ring-white/20 shadow-2xs ${className}`}>
    <svg 
      viewBox="0 0 900 600" 
      className="w-full h-full object-cover block"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <rect width="900" height="600" fill="#DA251D" />
      <path 
        d="M450,120 L490.41,244.38 L621.19,244.38 L515.39,321.25 L555.8,445.62 L450,368.75 L344.2,445.62 L384.61,321.25 L278.81,244.38 L409.59,244.38 Z" 
        fill="#FFFF00" 
      />
    </svg>
  </div>
);

// 🇺🇸 Official 100% Accurate US Flag (13 stripes & 50 stars in 9 alternating rows)
export const USFlag = ({ className = "w-5 h-3.5" }: { className?: string }) => (
  <div className={`relative shrink-0 overflow-hidden rounded-[4px] ring-1 ring-black/10 dark:ring-white/20 shadow-2xs ${className}`}>
    <svg 
      viewBox="0 0 7410 3900" 
      className="w-full h-full object-cover block"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <rect width="7410" height="3900" fill="#B22234" />
      <path d="M0,300H7410M0,900H7410M0,1500H7410M0,2100H7410M0,2700H7410M0,3300H7410" stroke="#FFFFFF" strokeWidth="300" />
      <rect width="2964" height="2100" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        <defs>
          <polygon id="us-star-svg" points="0,-120 37,-37 120,-37 51,13 76,97 0,47 -76,97 -51,13 -120,-37 -37,-37" />
        </defs>
        {/* Row 1 (6 stars) */}
        <use href="#us-star-svg" x="247" y="210" />
        <use href="#us-star-svg" x="741" y="210" />
        <use href="#us-star-svg" x="1235" y="210" />
        <use href="#us-star-svg" x="1729" y="210" />
        <use href="#us-star-svg" x="2223" y="210" />
        <use href="#us-star-svg" x="2717" y="210" />
        {/* Row 2 (5 stars) */}
        <use href="#us-star-svg" x="494" y="420" />
        <use href="#us-star-svg" x="988" y="420" />
        <use href="#us-star-svg" x="1482" y="420" />
        <use href="#us-star-svg" x="1976" y="420" />
        <use href="#us-star-svg" x="2470" y="420" />
        {/* Row 3 (6 stars) */}
        <use href="#us-star-svg" x="247" y="630" />
        <use href="#us-star-svg" x="741" y="630" />
        <use href="#us-star-svg" x="1235" y="630" />
        <use href="#us-star-svg" x="1729" y="630" />
        <use href="#us-star-svg" x="2223" y="630" />
        <use href="#us-star-svg" x="2717" y="630" />
        {/* Row 4 (5 stars) */}
        <use href="#us-star-svg" x="494" y="840" />
        <use href="#us-star-svg" x="988" y="840" />
        <use href="#us-star-svg" x="1482" y="840" />
        <use href="#us-star-svg" x="1976" y="840" />
        <use href="#us-star-svg" x="2470" y="840" />
        {/* Row 5 (6 stars) */}
        <use href="#us-star-svg" x="247" y="1050" />
        <use href="#us-star-svg" x="741" y="1050" />
        <use href="#us-star-svg" x="1235" y="1050" />
        <use href="#us-star-svg" x="1729" y="1050" />
        <use href="#us-star-svg" x="2223" y="1050" />
        <use href="#us-star-svg" x="2717" y="1050" />
        {/* Row 6 (5 stars) */}
        <use href="#us-star-svg" x="494" y="1260" />
        <use href="#us-star-svg" x="988" y="1260" />
        <use href="#us-star-svg" x="1482" y="1260" />
        <use href="#us-star-svg" x="1976" y="1260" />
        <use href="#us-star-svg" x="2470" y="1260" />
        {/* Row 7 (6 stars) */}
        <use href="#us-star-svg" x="247" y="1470" />
        <use href="#us-star-svg" x="741" y="1470" />
        <use href="#us-star-svg" x="1235" y="1470" />
        <use href="#us-star-svg" x="1729" y="1470" />
        <use href="#us-star-svg" x="2223" y="1470" />
        <use href="#us-star-svg" x="2717" y="1470" />
        {/* Row 8 (5 stars) */}
        <use href="#us-star-svg" x="494" y="1680" />
        <use href="#us-star-svg" x="988" y="1680" />
        <use href="#us-star-svg" x="1482" y="1680" />
        <use href="#us-star-svg" x="1976" y="1680" />
        <use href="#us-star-svg" x="2470" y="1680" />
        {/* Row 9 (6 stars) */}
        <use href="#us-star-svg" x="247" y="1890" />
        <use href="#us-star-svg" x="741" y="1890" />
        <use href="#us-star-svg" x="1235" y="1890" />
        <use href="#us-star-svg" x="1729" y="1890" />
        <use href="#us-star-svg" x="2223" y="1890" />
        <use href="#us-star-svg" x="2717" y="1890" />
      </g>
    </svg>
  </div>
);

export interface LanguageOption {
  code: 'vi' | 'en';
  label: string;
  nativeLabel: string;
  FlagIcon: React.ComponentType<{ className?: string }>;
  shortCode: string;
  subText: string;
  descriptionVi: string;
  descriptionEn: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    code: 'vi',
    label: 'Tiếng Việt',
    nativeLabel: 'Tiếng Việt (Việt Nam)',
    FlagIcon: VietnamFlag,
    shortCode: 'VI',
    subText: 'Việt Nam',
    descriptionVi: 'Giao diện tiếng Việt chuẩn hóa và tối ưu toàn diện',
    descriptionEn: 'Standardized Vietnamese interface tailored for workflow',
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English (United States)',
    FlagIcon: USFlag,
    shortCode: 'EN',
    subText: 'United States',
    descriptionVi: 'Giao diện tiếng Anh quốc tế chuyên nghiệp',
    descriptionEn: 'International English interface for global teams',
  },
];

export interface LanguageDropdownProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dropdown' | 'cards' | 'segmented';
  className?: string;
  showLabel?: boolean;
}

export default function LanguageDropdown({
  size = 'md',
  variant = 'dropdown',
  className = '',
  showLabel = false,
}: LanguageDropdownProps) {
  const { locale, localeMode, setLocale, t, isVietnamese } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (mode: 'vi' | 'en' | 'system') => {
    setLocale(mode);
    setIsOpen(false);
  };

  // 1. Render Cards Variant (Ideal for Settings Panel)
  if (variant === 'cards') {
    return (
      <div className={`space-y-3 w-full ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LANGUAGES.map((lang) => {
            const isSelected = localeMode === lang.code;
            const Flag = lang.FlagIcon;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`
                  group relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer
                  ${
                    isSelected
                      ? 'border-blue-500/60 dark:border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-850/50'
                  }
                `}
              >
                <div className="mt-0.5 shrink-0">
                  <Flag className="w-8 h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-extrabold block ${isSelected ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>
                    {lang.label}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isVietnamese ? lang.descriptionVi : lang.descriptionEn}
                  </p>
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-600 shrink-0 mt-0.5 transition-colors" />
                )}
              </button>
            );
          })}
        </div>

        {/* System Option Card in Settings */}
        <button
          type="button"
          onClick={() => handleSelect('system')}
          className={`
            w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer
            ${
              localeMode === 'system'
                ? 'border-blue-500/60 dark:border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-850/50'
            }
          `}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-xs font-bold block ${localeMode === 'system' ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>
                {isVietnamese ? 'Theo ngôn ngữ hệ thống' : 'System language'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isVietnamese ? 'Tự động phát hiện và áp dụng theo thiết bị' : 'Automatically match device language'}
              </span>
            </div>
          </div>
          {localeMode === 'system' ? (
            <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 transition-colors" />
          )}
        </button>
      </div>
    );
  }

  // 2. Render Segmented Control Variant
  if (variant === 'segmented') {
    return (
      <div className={`relative inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}>
        {LANGUAGES.map((lang) => {
          const isSelected = localeMode === lang.code;
          const Flag = lang.FlagIcon;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer z-10
                ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              {isSelected && (
                <motion.div
                  layoutId="segmented-lang-active"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-slate-900 shadow-xs border border-slate-200/50 dark:border-slate-700/50 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
              <Flag className="w-4 h-3" />
              <span>{lang.shortCode}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 3. Standard Dropdown Variant (Default & Header / Landing)
  return (
    <div ref={dropdownRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${t('language') || 'Ngôn ngữ'}: ${currentLang.label}`}
        title={t('languageDesc') || `Ngôn ngữ: ${currentLang.label}`}
        className={`
          group relative flex items-center gap-2 rounded-full border transition-all duration-200 cursor-pointer
          ${
            isOpen
              ? 'bg-blue-50 dark:bg-slate-800 border-blue-500/50 dark:border-blue-400/50 ring-2 ring-blue-500/15 shadow-xs'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-3xs'
          }
          text-slate-700 dark:text-slate-200
          ${size === 'sm' ? 'h-7.5 px-2.5 text-[11px]' : size === 'lg' ? 'h-9.5 px-3.5 text-xs' : 'h-8.5 px-3 text-xs'}
        `}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <currentLang.FlagIcon className="w-5 h-3.5" />
          <span className="font-sans font-extrabold text-[12px] tracking-tight text-slate-800 dark:text-slate-100">
            {showLabel ? currentLang.label : currentLang.shortCode}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover (100% Solid Opaque Background) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="absolute right-0 mt-2 w-[276px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] p-2 z-50 overflow-hidden"
          >
            {/* Header section (Clean, no Apexa badge) */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Globe className="w-3 h-3" />
              </div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVietnamese ? 'Ngôn ngữ' : 'Language'}
              </span>
            </div>

            {/* Language Options List */}
            <div className="space-y-1">
              {LANGUAGES.map((lang) => {
                const isSelected = localeMode === lang.code;
                const Flag = lang.FlagIcon;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`
                      w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer group relative
                      ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-500/35 dark:border-blue-400/35 ring-1 ring-blue-500/10 dark:ring-blue-400/15 shadow-2xs'
                          : 'border border-transparent hover:border-slate-200 dark:hover:border-slate-750 bg-transparent hover:bg-slate-100/90 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Flag className="w-6.5 h-4.5" />
                      <div className="truncate">
                        <span className={`block text-[13px] leading-tight font-extrabold ${isSelected ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white'}`}>
                          {lang.label}
                        </span>
                        <span className={`block text-[11px] truncate mt-0.5 font-medium ${isSelected ? 'text-blue-600 dark:text-blue-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                          {lang.nativeLabel}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.35)] ring-2 ring-white dark:ring-slate-900"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Thin Divider */}
            <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

            {/* System Language Option */}
            <button
              type="button"
              onClick={() => handleSelect('system')}
              className={`
                w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer group relative
                ${
                  localeMode === 'system'
                    ? 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-500/35 dark:border-blue-400/35 ring-1 ring-blue-500/10 dark:ring-blue-400/15 shadow-2xs'
                    : 'border border-transparent hover:border-slate-200 dark:hover:border-slate-750 bg-transparent hover:bg-slate-100/90 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6.5 h-4.5 rounded-[4px] bg-slate-100 dark:bg-slate-800 ring-1 ring-black/10 dark:ring-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className={`block text-[13px] leading-tight font-extrabold ${localeMode === 'system' ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white'}`}>
                    {isVietnamese ? 'Theo ngôn ngữ hệ thống' : 'System language'}
                  </span>
                  <span className={`block text-[11px] truncate mt-0.5 font-medium ${localeMode === 'system' ? 'text-blue-600 dark:text-blue-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                    {isVietnamese ? 'Khớp với cài đặt trình duyệt' : 'Match browser settings'}
                  </span>
                </div>
              </div>

              {localeMode === 'system' && (
                <motion.div 
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.35)] ring-2 ring-white dark:ring-slate-900"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </motion.div>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


