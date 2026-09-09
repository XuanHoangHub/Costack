export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'apexa_theme_mode';
export const LEGACY_THEME_STORAGE_KEY = 'apexa_dark_mode';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';

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

  return 'light';
}

export function resolveTheme(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Apply a resolved theme instantaneously across ALL elements simultaneously.
 * Uses synchronous CSS transition suppression to eliminate any staggered or lagging visual transitions.
 */
export function applyAppTheme(isDark: boolean, persist = true, _animate = false) {
  if (typeof document === 'undefined') return;

  // Temporarily disable CSS transitions so all DOM elements switch colors simultaneously in 0ms
  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.dataset.themeMode = getStoredThemePreference();
  root.style.colorScheme = isDark ? 'dark' : 'light';

  // Force synchronous style reflow so the entire DOM tree updates at the exact same frame
  (() => window.getComputedStyle(document.body))();

  // Restore normal interactive transitions on the next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (css.parentNode) {
        css.parentNode.removeChild(css);
      }
    });
  });

  if (persist) {
    try {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, String(isDark));
    } catch {
      // Applying the theme must never fail just because storage is unavailable.
    }
  }
}

export function applyThemePreference(preference: ThemePreference, persist = true, _animate = false) {
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
  applyAppTheme(isDark, persist && preference !== 'system', _animate);
  return isDark;
}
