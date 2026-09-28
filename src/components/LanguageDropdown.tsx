"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Globe, Laptop, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

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
  shortcut: string;
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
    shortcut: '1',
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
    shortcut: '2',
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
  const { locale, localeMode, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  const handleSelect = useCallback((mode: 'vi' | 'en' | 'system', event?: React.MouseEvent | MouseEvent) => {
    setLocale(mode, event);
    setIsOpen(false);
  }, [setLocale]);

  // Keyboard navigation and instant hotkeys
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      // Hotkey 1: Tiếng Việt
      if (event.key === '1') {
        event.preventDefault();
        handleSelect('vi');
        return;
      }

      // Hotkey 2: English
      if (event.key === '2') {
        event.preventDefault();
        handleSelect('en');
        return;
      }

      // Hotkey A / 3: System
      if (event.key.toLowerCase() === 'a' || event.key === '3') {
        event.preventDefault();
        handleSelect('system');
        return;
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
  }, [isOpen, handleSelect]);

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = LANGUAGES.length;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = index >= lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowUp') nextIndex = index <= 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;
    if (nextIndex !== null) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  };

  // 1. Render Cards Variant (Ideal for Settings Panel)
  if (variant === 'cards') {
    return (
      <div className={`space-y-3 w-full ${className}`} role="radiogroup" aria-label={t('selectLanguage')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LANGUAGES.map((lang) => {
            const isSelected = localeMode === lang.code;
            const Flag = lang.FlagIcon;
            return (
              <motion.button
                key={lang.code}
                type="button"
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.985 }}
                onClick={(e) => handleSelect(lang.code, e)}
                role="radio"
                aria-checked={isSelected}
                className={`
                  group relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer backdrop-blur-sm
                  ${
                    isSelected
                      ? 'border-blue-500/70 dark:border-blue-400/70 bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-indigo-50/60 dark:from-blue-950/50 dark:via-blue-950/20 dark:to-indigo-950/30 ring-2 ring-blue-500/25 shadow-[0_4px_20px_rgba(59,130,246,0.12)]'
                      : 'border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50/80 dark:hover:bg-white/[0.06] shadow-3xs'
                  }
                `}
              >
                <div className="mt-0.5 shrink-0 transition-transform group-hover:scale-105">
                  <Flag className="w-8 h-5.5 rounded-sm shadow-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black block tracking-tight ${isSelected ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>
                      {lang.code === 'vi' ? t('languageVietnamese') : t('languageEnglish')}
                    </span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isSelected 
                        ? 'bg-blue-600 text-white dark:bg-blue-500' 
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                    }`}>
                      {lang.shortCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {lang.code === 'vi' ? t('languageVietnameseDesc') : t('languageEnglishDesc')}
                  </p>
                </div>
                {isSelected ? (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 ring-2 ring-white dark:ring-slate-900"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </motion.div>
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full border border-slate-300 dark:border-white/20 group-hover:border-slate-400 dark:group-hover:border-white/40 shrink-0 mt-0.5 transition-colors" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* System Option Card in Settings */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.01, y: -0.5 }}
          whileTap={{ scale: 0.985 }}
          onClick={(e) => handleSelect('system', e)}
          role="radio"
          aria-checked={localeMode === 'system'}
          className={`
            w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer backdrop-blur-sm
            ${
              localeMode === 'system'
                ? 'border-blue-500/70 dark:border-blue-400/70 bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-indigo-50/60 dark:from-blue-950/50 dark:via-blue-950/20 dark:to-indigo-950/30 ring-2 ring-blue-500/25 shadow-[0_4px_20px_rgba(59,130,246,0.12)]'
                : 'border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50/80 dark:hover:bg-white/[0.06] shadow-3xs'
            }
          `}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/60 dark:border-white/10">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-xs font-black block tracking-tight ${localeMode === 'system' ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>
                {t('systemLanguage')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('systemLanguageDesc')}
              </span>
            </div>
          </div>
          {localeMode === 'system' ? (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </motion.div>
          ) : (
            <div className="w-5.5 h-5.5 rounded-full border border-slate-300 dark:border-white/20 shrink-0 transition-colors" />
          )}
        </motion.button>
      </div>
    );
  }

  // 2. Render Segmented Control Variant
  if (variant === 'segmented') {
    return (
      <div 
        className={`relative inline-flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 shadow-3xs backdrop-blur-md ${className}`} 
        role="group" 
        aria-label={t('selectLanguage')}
      >
        {LANGUAGES.map((lang) => {
          const isSelected = localeMode === lang.code;
          const Flag = lang.FlagIcon;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={(e) => handleSelect(lang.code, e)}
              aria-pressed={isSelected}
              aria-label={lang.code === 'vi' ? t('languageVietnameseDesc') : t('languageEnglishDesc')}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer z-10 select-none
                ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              {isSelected && (
                <motion.div
                  layoutId="segmented-lang-active"
                  className="absolute inset-0 rounded-xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/70 dark:border-white/10 -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
              <Flag className="w-4 h-2.8 rounded-[2px]" />
              <span className="tracking-tight">{lang.shortCode}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 3. Standard Dropdown Variant (Default & Header / Landing)
  return (
    <div ref={dropdownRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button with spring micro-interaction & luxurious glassmorphism */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.025 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
            const selectedIndex = localeMode === 'system' ? LANGUAGES.length : Math.max(0, LANGUAGES.findIndex((language) => language.code === localeMode));
            requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${t('currentLanguage')}: ${localeMode === 'system' ? t('systemLanguage') : currentLang.label}`}
        title={t('languageDesc')}
        className={`
          group relative flex items-center gap-2 rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-md
          ${
            isOpen
              ? 'bg-blue-50/95 dark:bg-blue-950/40 border-blue-500/60 dark:border-blue-400/60 ring-2 ring-blue-500/20 shadow-[0_2px_12px_rgba(59,130,246,0.18)]'
              : 'bg-white/80 dark:bg-white/[0.04] border-slate-200/90 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:shadow-[0_2px_10px_rgba(59,130,246,0.12)] shadow-3xs'
          }
          text-slate-700 dark:text-zinc-200
          ${size === 'sm' ? 'h-7.5 px-2 text-[11px]' : size === 'lg' ? 'h-9.5 px-3.5 text-xs' : 'h-8.5 px-2.5 text-xs'}
        `}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <currentLang.FlagIcon className="w-4.5 h-3 rounded-[3px] shadow-2xs group-hover:scale-105 transition-transform shrink-0" />
          <span className="font-sans font-black text-[11.5px] tracking-tight text-slate-800 dark:text-zinc-100">
            {localeMode === 'system' ? (showLabel ? t('systemLanguage') : 'AUTO') : showLabel ? currentLang.label : currentLang.shortCode}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
          className="flex items-center"
        >
          <ChevronDown
            className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors shrink-0 ${
              isOpen ? 'text-blue-600 dark:text-blue-400' : ''
            }`}
          />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu Popover (Solid Luxury Glassmorphism Surface) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 420 }}
            role="menu"
            aria-label={t('selectLanguage')}
            className="absolute right-0 mt-2 w-[285px] rounded-2xl bg-white/95 dark:bg-[#0c0e18]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_24px_60px_-10px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] p-2 z-50 overflow-hidden"
          >
            {/* Header section with Globe icon & Hotkey Hint */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-white/10 mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Globe className="w-3 h-3" />
                </div>
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('selectLanguage')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                <span>[1]</span>
                <span>[2]</span>
              </div>
            </div>
            <p className="sr-only">{t('languageMenuHint')}</p>

            {/* Language Options List */}
            <div className="space-y-1">
              {LANGUAGES.map((lang, index) => {
                const isSelected = localeMode === lang.code;
                const Flag = lang.FlagIcon;
                return (
                  <button
                    key={lang.code}
                    ref={(element) => { optionRefs.current[index] = element; }}
                    type="button"
                    onClick={(e) => handleSelect(lang.code, e)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    role="menuitemradio"
                    aria-checked={isSelected}
                    className={`
                      w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer group relative select-none
                      ${
                        isSelected
                          ? 'bg-blue-50/95 dark:bg-blue-950/50 border border-blue-500/40 dark:border-blue-400/40 ring-1 ring-blue-500/15 dark:ring-blue-400/20 shadow-2xs'
                          : 'border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 bg-transparent hover:bg-slate-100/90 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 transition-transform group-hover:scale-105">
                        <Flag className="w-6.5 h-4.5 rounded-[3px] shadow-sm" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`block text-[13px] leading-tight font-black ${isSelected ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white'}`}>
                            {lang.code === 'vi' ? t('languageVietnamese') : t('languageEnglish')}
                          </span>
                          <span className={`text-[9.5px] font-mono font-bold px-1 py-0.2 rounded ${
                            isSelected 
                              ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300' 
                              : 'bg-slate-100 dark:bg-white/10 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                          }`}>
                            [{lang.shortcut}]
                          </span>
                        </div>
                        <span className={`block text-[11px] truncate mt-0.5 font-medium ${isSelected ? 'text-blue-600 dark:text-blue-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                          {lang.nativeLabel}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.4)] ring-2 ring-white dark:ring-slate-900"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Thin Gradient Divider */}
            <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />

            {/* System Language Option */}
            <button
              type="button"
              ref={(element) => { optionRefs.current[LANGUAGES.length] = element; }}
              onClick={(e) => handleSelect('system', e)}
              onKeyDown={(event) => handleOptionKeyDown(event, LANGUAGES.length)}
              role="menuitemradio"
              aria-checked={localeMode === 'system'}
              className={`
                w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer group relative select-none
                ${
                  localeMode === 'system'
                    ? 'bg-blue-50/95 dark:bg-blue-950/50 border border-blue-500/40 dark:border-blue-400/40 ring-1 ring-blue-500/15 dark:ring-blue-400/20 shadow-2xs'
                    : 'border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 bg-transparent hover:bg-slate-100/90 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6.5 h-4.5 rounded-[3px] bg-slate-100 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className={`block text-[13px] leading-tight font-black ${localeMode === 'system' ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white'}`}>
                      {t('systemLanguage')}
                    </span>
                    <span className={`text-[9.5px] font-mono font-bold px-1 py-0.2 rounded ${
                      localeMode === 'system'
                        ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300' 
                        : 'bg-slate-100 dark:bg-white/10 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}>
                      [A]
                    </span>
                  </div>
                  <span className={`block text-[11px] truncate mt-0.5 font-medium ${localeMode === 'system' ? 'text-blue-600 dark:text-blue-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                    {t('systemLanguageDesc')}
                  </span>
                </div>
              </div>

              {localeMode === 'system' ? (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.4)] ring-2 ring-white dark:ring-slate-900"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </motion.div>
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-amber-400 transition-colors" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
