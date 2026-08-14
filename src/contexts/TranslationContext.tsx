"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { en, vi, Translations } from '../locales';

type TranslationContextValue = {
 t: (key: string, ...args: unknown[]) => string;
 locale: string;
 setLocale: (locale: string) => void;
};

const TranslationContext = createContext<TranslationContextValue>({
 t: (key: string) => key,
 locale: 'en',
 setLocale: () => {},
});

export function useTranslation() {
 return useContext(TranslationContext);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apexa_locale') || localStorage.getItem('apexa_locale');
      if (saved) return saved;
      localStorage.setItem('apexa_locale', 'en');
      localStorage.setItem('apexa_locale', 'en');
    }
    return 'en';
  });

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexa_locale', newLocale);
      localStorage.setItem('apexa_locale', newLocale);
      window.dispatchEvent(new Event('apexa-locale-changed'));
    }
  }, []);

 const t = useCallback((key: string, ...args: unknown[]) => {
 const dict = locale === 'vi' ? vi : en;
 let value = (dict as any)[key];
 if (value === undefined) {
 value = (en as any)[key]; // fallback to en
 }
 if (typeof value === 'function') {
 value = value(...args);
 }
 if (value === undefined) {
 return key;
 }
 return String(value);
 }, [locale]);

 return (
 <TranslationContext.Provider value={{ t, locale, setLocale }}>
 {children}
 </TranslationContext.Provider>
 );
}

export { en, vi };
export type { Translations };

