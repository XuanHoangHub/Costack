'use client';

import { useLayoutEffect } from 'react';
import { applyThemePreference, getStoredThemePreference, resolveTheme } from '@/lib/theme';
import { useUiStore } from '@/store/uiStore';

/** Keeps persisted, React and operating-system theme state in lockstep. */
export function useThemeSync() {
  const themePreference = useUiStore((state) => state.themePreference);

  useLayoutEffect(() => {
    const storedPreference = getStoredThemePreference();
    if (storedPreference !== useUiStore.getState().themePreference) {
      useUiStore.setState({ themePreference: storedPreference });
    }

    const syncResolvedTheme = (animate = false) => {
      const isDark = applyThemePreference(storedPreference, false, animate);
      if (useUiStore.getState().isDarkMode !== isDark) {
        useUiStore.setState({ isDarkMode: isDark });
      }
    };

    syncResolvedTheme(false);
    if (storedPreference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const isDark = resolveTheme('system');
      applyThemePreference('system', false, true);
      useUiStore.setState({ isDarkMode: isDark });
    };

    media.addEventListener('change', handleSystemThemeChange);
    return () => media.removeEventListener('change', handleSystemThemeChange);
  }, [themePreference]);
}
