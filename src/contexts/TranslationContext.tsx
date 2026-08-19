"use client";

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { en, vi, Translations } from '../locales';

export type LocaleType = 'vi' | 'en';

export interface TranslationContextValue {
  t: (key: string, ...args: unknown[]) => string;
  locale: LocaleType;
  setLocale: (locale: string) => void;
  isVietnamese: boolean;
  isEnglish: boolean;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string | number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

const defaultContext: TranslationContextValue = {
  t: (key: string) => key,
  locale: 'vi',
  setLocale: () => {},
  isVietnamese: true,
  isEnglish: false,
  formatDate: (d) => String(d),
  formatRelativeTime: () => '',
  formatCurrency: (n) => String(n),
};

const TranslationContext = createContext<TranslationContextValue>(defaultContext);

export function useTranslation() {
  return useContext(TranslationContext);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('vi');

  // Synchronize locale from localStorage on mount
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('apexa_locale') || 'vi') as LocaleType;
      const valid: LocaleType = saved === 'en' ? 'en' : 'vi';
      setLocaleState(valid);
      document.documentElement.lang = valid;
    } catch {
      // Ignore storage error
    }

    const handleExternalChange = () => {
      try {
        const saved = (localStorage.getItem('apexa_locale') || 'vi') as LocaleType;
        const valid: LocaleType = saved === 'en' ? 'en' : 'vi';
        setLocaleState(valid);
        document.documentElement.lang = valid;
      } catch {
        // Ignore
      }
    };

    window.addEventListener('storage', handleExternalChange);
    window.addEventListener('apexa-locale-changed', handleExternalChange);
    return () => {
      window.removeEventListener('storage', handleExternalChange);
      window.removeEventListener('apexa-locale-changed', handleExternalChange);
    };
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    const validLocale: LocaleType = newLocale === 'en' ? 'en' : 'vi';
    setLocaleState(validLocale);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('apexa_locale', validLocale);
        document.documentElement.lang = validLocale;
        window.dispatchEvent(new Event('apexa-locale-changed'));
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
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (locale === 'vi') {
        if (diffSec < 45) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 30) return `${diffDays} ngày trước`;
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
        if (diffSec < 45) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      return '';
    }
  }, [locale]);

  const formatCurrency = useCallback((amount: number, currency: string = locale === 'vi' ? 'VND' : 'USD'): string => {
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
    setLocale,
    isVietnamese: locale === 'vi',
    isEnglish: locale === 'en',
    formatDate,
    formatRelativeTime,
    formatCurrency,
  }), [t, locale, setLocale, formatDate, formatRelativeTime, formatCurrency]);

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export { en, vi };
export type { Translations };
