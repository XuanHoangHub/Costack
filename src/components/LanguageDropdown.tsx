"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Globe, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

// 🇻🇳 Official 100% Accurate Vietnam Flag (Constitutional 2:3 ratio & star geometry)
export const VietnamFlag = ({ className = "w-5 h-3.5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 900 600" 
    className={`${className} shrink-0 overflow-hidden rounded-[3px] border border-black/10 dark:border-white/15 shadow-3xs`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="900" height="600" fill="#DA251D" />
    <path 
      d="M450,120 L490.41,244.38 L621.19,244.38 L515.39,321.25 L555.8,445.62 L450,368.75 L344.2,445.62 L384.61,321.25 L278.81,244.38 L409.59,244.38 Z" 
      fill="#FFFF00" 
    />
  </svg>
);

// 🇺🇸 Official 100% Accurate US Flag (13 stripes & 50 stars in 9 alternating rows)
export const USFlag = ({ className = "w-5 h-3.5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 7410 3900" 
    className={`${className} shrink-0 overflow-hidden rounded-[3px] border border-black/10 dark:border-white/15 shadow-3xs`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="7410" height="3900" fill="#B22234" />
    <path d="M0,300H7410M0,900H7410M0,1500H7410M0,2100H7410M0,2700H7410M0,3300H7410" stroke="#FFFFFF" strokeWidth="300" />
    <rect width="2964" height="2100" fill="#3C3B6E" />
    <g fill="#FFFFFF">
      <defs>
        <polygon id="us-star" points="0,-120 37,-37 120,-37 51,13 76,97 0,47 -76,97 -51,13 -120,-37 -37,-37" />
      </defs>
      {/* Row 1 (6 stars) */}
      <use href="#us-star" x="247" y="210" />
      <use href="#us-star" x="741" y="210" />
      <use href="#us-star" x="1235" y="210" />
      <use href="#us-star" x="1729" y="210" />
      <use href="#us-star" x="2223" y="210" />
      <use href="#us-star" x="2717" y="210" />
      {/* Row 2 (5 stars) */}
      <use href="#us-star" x="494" y="420" />
      <use href="#us-star" x="988" y="420" />
      <use href="#us-star" x="1482" y="420" />
      <use href="#us-star" x="1976" y="420" />
      <use href="#us-star" x="2470" y="420" />
      {/* Row 3 (6 stars) */}
      <use href="#us-star" x="247" y="630" />
      <use href="#us-star" x="741" y="630" />
      <use href="#us-star" x="1235" y="630" />
      <use href="#us-star" x="1729" y="630" />
      <use href="#us-star" x="2223" y="630" />
      <use href="#us-star" x="2717" y="630" />
      {/* Row 4 (5 stars) */}
      <use href="#us-star" x="494" y="840" />
      <use href="#us-star" x="988" y="840" />
      <use href="#us-star" x="1482" y="840" />
      <use href="#us-star" x="1976" y="840" />
      <use href="#us-star" x="2470" y="840" />
      {/* Row 5 (6 stars) */}
      <use href="#us-star" x="247" y="1050" />
      <use href="#us-star" x="741" y="1050" />
      <use href="#us-star" x="1235" y="1050" />
      <use href="#us-star" x="1729" y="1050" />
      <use href="#us-star" x="2223" y="1050" />
      <use href="#us-star" x="2717" y="1050" />
      {/* Row 6 (5 stars) */}
      <use href="#us-star" x="494" y="1260" />
      <use href="#us-star" x="988" y="1260" />
      <use href="#us-star" x="1482" y="1260" />
      <use href="#us-star" x="1976" y="1260" />
      <use href="#us-star" x="2470" y="1260" />
      {/* Row 7 (6 stars) */}
      <use href="#us-star" x="247" y="1470" />
      <use href="#us-star" x="741" y="1470" />
      <use href="#us-star" x="1235" y="1470" />
      <use href="#us-star" x="1729" y="1470" />
      <use href="#us-star" x="2223" y="1470" />
      <use href="#us-star" x="2717" y="1470" />
      {/* Row 8 (5 stars) */}
      <use href="#us-star" x="494" y="1680" />
      <use href="#us-star" x="988" y="1680" />
      <use href="#us-star" x="1482" y="1680" />
      <use href="#us-star" x="1976" y="1680" />
      <use href="#us-star" x="2470" y="1680" />
      {/* Row 9 (6 stars) */}
      <use href="#us-star" x="247" y="1890" />
      <use href="#us-star" x="741" y="1890" />
      <use href="#us-star" x="1235" y="1890" />
      <use href="#us-star" x="1729" y="1890" />
      <use href="#us-star" x="2223" y="1890" />
      <use href="#us-star" x="2717" y="1890" />
    </g>
  </svg>
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
  const { locale, setLocale, t, isVietnamese } = useTranslation();
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

  const handleSelect = (code: 'vi' | 'en') => {
    setLocale(code);
    setIsOpen(false);
  };

  // Render Cards Variant (Ideal for Settings Panel)
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 w-full ${className}`}>
        {LANGUAGES.map((lang) => {
          const isSelected = lang.code === locale;
          const Flag = lang.FlagIcon;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`
                relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
                }
              `}
            >
              <div className="mt-0.5 shrink-0">
                <Flag className="w-7 h-5 object-cover rounded-md shadow-2xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100'}`}>
                    {lang.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {lang.shortCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isVietnamese ? lang.descriptionVi : lang.descriptionEn}
                </p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Render Segmented Control Variant
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 ${className}`}>
        {LANGUAGES.map((lang) => {
          const isSelected = lang.code === locale;
          const Flag = lang.FlagIcon;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              <Flag className="w-4 h-3 object-cover" />
              <span>{lang.shortCode}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Standard Dropdown Variant
  return (
    <div ref={dropdownRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={t('languageDesc') || `Ngôn ngữ: ${currentLang.label}`}
        className={`
          group relative flex items-center gap-2 rounded-full border transition-all duration-200 cursor-pointer
          bg-white/90 dark:bg-slate-800/70 
          border-slate-200/90 dark:border-slate-700/80 
          hover:bg-slate-100/90 dark:hover:bg-slate-800 
          hover:border-slate-300 dark:hover:border-slate-600
          text-slate-700 dark:text-slate-200 shadow-3xs
          ${size === 'sm' ? 'h-7 px-2.5 text-[11px]' : size === 'lg' ? 'h-9 px-3.5 text-xs' : 'h-8 px-3 text-xs'}
        `}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <currentLang.FlagIcon className="w-5 h-3.5 object-cover" />
          <span className="font-sans font-extrabold text-[12px] tracking-tight text-slate-800 dark:text-slate-100">
            {showLabel ? currentLang.label : currentLang.shortCode}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-1.5 z-50 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {t('language') || 'Ngôn ngữ / Language'}
                </span>
              </div>
              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
                Apexa
              </span>
            </div>

            <div className="space-y-1">
              {LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLang.code;
                const Flag = lang.FlagIcon;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group
                      ${
                        isSelected
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800/60 shadow-3xs'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Flag className="w-6 h-4.5 object-cover" />
                      <div className="truncate">
                        <span className="block text-xs leading-tight font-black">{lang.label}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-semibold">
                          {lang.nativeLabel}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
