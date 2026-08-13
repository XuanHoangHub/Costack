const THEME_SWITCH_CLASS = 'theme-switching';
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

/** Apply the theme and run a smooth synchronized transition across all layout elements. */
export function applyAppTheme(isDark: boolean, persist = true) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.add(THEME_SWITCH_CLASS);
  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.style.colorScheme = isDark ? 'dark' : 'light';

  if (persist && typeof window !== 'undefined') {
    localStorage.setItem('avaxa_dark_mode', String(isDark));
  }

  if (cleanupTimer !== null) clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => {
    root.classList.remove(THEME_SWITCH_CLASS);
    cleanupTimer = null;
  }, 250);
}

