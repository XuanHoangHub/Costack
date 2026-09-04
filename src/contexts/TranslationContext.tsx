"use client";

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { en, vi, Translations } from '../locales';

export type LocaleType = 'vi' | 'en';
export type LocaleMode = 'vi' | 'en' | 'system';

export interface TranslationContextValue {
  t: (key: string, ...args: unknown[]) => string;
  locale: LocaleType;
  localeMode: LocaleMode;
  setLocale: (locale: string) => void;
  isVietnamese: boolean;
  isEnglish: boolean;
  localize: (vietnamese: string, english: string) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string | number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, maximumFractionDigits?: number) => string;
}

const getSystemLocale = (): LocaleType => {
  if (typeof navigator !== 'undefined') {
    const legacyNavigator = navigator as Navigator & { userLanguage?: string };
    const languages = [...(navigator.languages || []), navigator.language, legacyNavigator.userLanguage]
      .filter((language): language is string => Boolean(language));
    if (languages.some((language) => language.toLowerCase().startsWith('vi'))) return 'vi';
  }
  return 'en';
};

const normalizeLocaleMode = (value: string | null): LocaleMode =>
  value === 'system' ? 'system' : value === 'en' ? 'en' : 'vi';

const getEffectiveLocale = (mode: LocaleMode): LocaleType => mode === 'system' ? getSystemLocale() : mode;

const applyDocumentLocale = (effectiveLocale: LocaleType, mode: LocaleMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = effectiveLocale === 'vi' ? 'vi-VN' : 'en-US';
  root.dir = 'ltr';
  root.dataset.locale = effectiveLocale;
  root.dataset.localeMode = mode;
};

const defaultContext: TranslationContextValue = {
  t: (key: string) => key,
  locale: 'vi',
  localeMode: 'vi',
  setLocale: () => {},
  isVietnamese: true,
  isEnglish: false,
  localize: (vietnamese) => vietnamese,
  formatDate: (d) => String(d),
  formatRelativeTime: () => '',
  formatCurrency: (n) => String(n),
  formatNumber: (n) => String(n),
  formatPercent: (n) => `${n}%`,
};

const TranslationContext = createContext<TranslationContextValue>(defaultContext);

export function useTranslation() {
  return useContext(TranslationContext);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('vi');
  const [localeMode, setLocaleMode] = useState<LocaleMode>('vi');

  // Synchronize locale from localStorage on mount
  useEffect(() => {
    try {
      const validMode = normalizeLocaleMode(localStorage.getItem('apexa_locale_mode') || localStorage.getItem('apexa_locale'));
      setLocaleMode(validMode);

      const effectiveLocale = getEffectiveLocale(validMode);
      setLocaleState(effectiveLocale);
      applyDocumentLocale(effectiveLocale, validMode);
    } catch {
      // Ignore storage error
    }

    const handleExternalChange = () => {
      try {
        const validMode = normalizeLocaleMode(localStorage.getItem('apexa_locale_mode') || localStorage.getItem('apexa_locale'));
        setLocaleMode(validMode);

        const effectiveLocale = getEffectiveLocale(validMode);
        setLocaleState(effectiveLocale);
        applyDocumentLocale(effectiveLocale, validMode);
      } catch {
        // Ignore
      }
    };

    window.addEventListener('storage', handleExternalChange);
    window.addEventListener('apexa-locale-changed', handleExternalChange);
    window.addEventListener('languagechange', handleExternalChange);
    return () => {
      window.removeEventListener('storage', handleExternalChange);
      window.removeEventListener('apexa-locale-changed', handleExternalChange);
      window.removeEventListener('languagechange', handleExternalChange);
    };
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    const validMode = normalizeLocaleMode(newLocale);
    const effectiveLocale = getEffectiveLocale(validMode);

    setLocaleMode(validMode);
    setLocaleState(effectiveLocale);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('apexa_locale_mode', validMode);
        localStorage.setItem('apexa_locale', effectiveLocale);
        applyDocumentLocale(effectiveLocale, validMode);
        window.dispatchEvent(new CustomEvent('apexa-locale-changed', { detail: { locale: effectiveLocale, mode: validMode } }));
      } catch {
        // Ignore storage error
      }
    }
  }, []);

  const t = useCallback((key: string, ...args: unknown[]): string => {
    if (!key) return '';
    const dict = locale === 'en' ? en : vi;
    const fallbackDict = locale === 'en' ? vi : en;

    let raw = (dict as any)[key];
    if (raw === undefined) {
      raw = (fallbackDict as any)[key];
    }
    if (raw === undefined) {
      return key;
    }

    // Function type translation
    if (typeof raw === 'function') {
      return String(raw(...args));
    }

    let text = String(raw);

    // If first argument is an object/dictionary of named replacements e.g. { count: 5, name: 'Alice' }
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      const params = args[0] as Record<string, unknown>;
      for (const [pKey, pVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal ?? ''));
      }
      return text;
    }

    // If positional arguments e.g. {0}, {1} or {count}
    if (args.length > 0) {
      args.forEach((arg, index) => {
        text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg ?? ''));
      });
      // Also fallback replace first argument into {count}, {title}, {name}, {value} if present
      if (text.includes('{count}')) text = text.replace(/\{count\}/g, String(args[0] ?? ''));
      if (text.includes('{title}')) text = text.replace(/\{title\}/g, String(args[0] ?? ''));
      if (text.includes('{name}')) text = text.replace(/\{name\}/g, String(args[0] ?? ''));
      if (text.includes('{value}')) text = text.replace(/\{value\}/g, String(args[0] ?? ''));
      if (text.includes('{total}')) text = text.replace(/\{total\}/g, String(args[0] ?? ''));
    }

    return text;
  }, [locale]);

  const localize = useCallback((vietnamese: string, english: string) => locale === 'vi' ? vietnamese : english, [locale]);

  const formatDate = useCallback((dateInput: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
      if (!d || isNaN(d.getTime())) return '';
      const defaultOptions: Intl.DateTimeFormatOptions = options || {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      };
      return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', defaultOptions).format(d);
    } catch {
      return '';
    }
  }, [locale]);

  const formatRelativeTime = useCallback((dateInput: Date | string | number): string => {
    try {
      const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
      if (!d || isNaN(d.getTime())) return '';
      const deltaSeconds = Math.round((d.getTime() - Date.now()) / 1000);
      const absoluteSeconds = Math.abs(deltaSeconds);
      if (absoluteSeconds < 45) return locale === 'vi' ? 'Vừa xong' : 'Just now';

      const formatter = new Intl.RelativeTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { numeric: 'auto' });
      if (absoluteSeconds < 3_600) return formatter.format(Math.round(deltaSeconds / 60), 'minute');
      if (absoluteSeconds < 86_400) return formatter.format(Math.round(deltaSeconds / 3_600), 'hour');
      if (absoluteSeconds < 2_592_000) return formatter.format(Math.round(deltaSeconds / 86_400), 'day');
      return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit', month: locale === 'vi' ? '2-digit' : 'short', year: 'numeric',
      }).format(d);
    } catch {
      return '';
    }
  }, [locale]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', options).format(value);
  }, [locale]);

  const formatPercent = useCallback((value: number, maximumFractionDigits = 1): string => {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'percent', maximumFractionDigits,
    }).format(value);
  }, [locale]);

  // Locale changes presentation, never the monetary unit represented by the data.
  const formatCurrency = useCallback((amount: number, currency: string = 'VND'): string => {
    try {
      return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        maximumFractionDigits: currency.toUpperCase() === 'VND' ? 0 : 2
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }, [locale]);

  const contextValue = useMemo<TranslationContextValue>(() => ({
    t,
    locale,
    localeMode,
    setLocale,
    isVietnamese: locale === 'vi',
    isEnglish: locale === 'en',
    localize,
    formatDate,
    formatRelativeTime,
    formatCurrency,
    formatNumber,
    formatPercent,
  }), [t, locale, localeMode, setLocale, localize, formatDate, formatRelativeTime, formatCurrency, formatNumber, formatPercent]);

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export { en, vi };
export type { Translations };
