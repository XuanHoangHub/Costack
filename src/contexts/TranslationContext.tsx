"use client";

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { en, vi, Translations } from '../locales';

type TranslationContextValue = {
 t: (key: string, ...args: unknown[]) => string;
 locale: string;
 setLocale: (locale: string) => void;
};

const TranslationContext = createContext<TranslationContextValue>({
 t: (key: string) => key,
 locale: 'vi',
 setLocale: () => {},
});

export function useTranslation() {
 return useContext(TranslationContext);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<string>('vi');

  useEffect(() => {
    localStorage.setItem('apexa_locale', 'vi');
    document.documentElement.lang = 'vi';
  }, []);

  const setLocale = useCallback((_newLocale: string) => {
    setLocaleState('vi');
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexa_locale', 'vi');
      window.dispatchEvent(new Event('apexa-locale-changed'));
    }
  }, []);

 const t = useCallback((key: string, ...args: unknown[]) => {
 let value = (vi as any)[key];
 if (typeof value === 'function') {
 value = value(...args);
 }
 if (value === undefined) {
 return key;
 }
 return String(value);
 }, []);

 return (
 <TranslationContext.Provider value={{ t, locale, setLocale }}>
 {children}
 </TranslationContext.Provider>
 );
}

export { en, vi };
export type { Translations };

