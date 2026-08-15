export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'apexa_theme_mode';
export const LEGACY_THEME_STORAGE_KEY = 'apexa_dark_mode';

const THEME_SWITCH_CLASS = 'theme-switching';
const THEME_TRANSITION_MS = 180;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;

    // Seamlessly migrate installs that only stored a resolved boolean.
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === 'true') return 'dark';
    if (legacy === 'false') return 'light';
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return 'system';
}

export function resolveTheme(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Apply a resolved theme immediately, with a short transition only for user-triggered changes. */
export function applyAppTheme(isDark: boolean, persist = true, animate = true) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const changed = root.classList.contains('dark') !== isDark;

  if (changed && animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add(THEME_SWITCH_CLASS);
  }

  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.dataset.themeMode = getStoredThemePreference();
  root.style.colorScheme = isDark ? 'dark' : 'light';

  if (persist) {
    try {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, String(isDark));
    } catch {
      // Applying the theme must never fail just because storage is unavailable.
    }
  }

  if (cleanupTimer !== null) clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => {
    root.classList.remove(THEME_SWITCH_CLASS);
    cleanupTimer = null;
  }, THEME_TRANSITION_MS);
}

export function applyThemePreference(preference: ThemePreference, persist = true, animate = true) {
  if (persist && typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
      if (preference === 'system') {
        localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      }
    } catch {
      // Keep the in-memory theme working even when persistence is blocked.
    }
  }

  const isDark = resolveTheme(preference);
  applyAppTheme(isDark, persist && preference !== 'system', animate);
  return isDark;
}
