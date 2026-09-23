export type GradientTuple = readonly [string, string, ...string[]];

export type AccentPreset = 'indigo' | 'ocean' | 'forest' | 'sunset';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceSubtle: string;
  card: string;
  cardSecondary: string;
  cardBorder: string;
  border: string;
  borderSubtle: string;
  borderHover: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;

  primary: string;
  primaryHover: string;
  primaryLight: string;
  primarySubtle: string;
  primaryText: string;
  accentCyan: string;

  todo: string;
  inprogress: string;
  review: string;
  completed: string;

  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityUrgent: string;

  danger: string;
  dangerSubtle: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  info: string;
  infoSubtle: string;

  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  gradientPrimary: GradientTuple;
  gradientBrand: GradientTuple;
  gradientAi: GradientTuple;
  gradientCard: GradientTuple;
  gradientStat: GradientTuple;
  gradientSuccess: GradientTuple;
  gradientDanger: GradientTuple;
  gradientWarning: GradientTuple;
}

const ACCENT_MAP: Record<AccentPreset, {
  dark: { primary: string; hover: string; light: string; subtle: string; text: string; cyan: string; gradient: GradientTuple };
  light: { primary: string; hover: string; light: string; subtle: string; text: string; cyan: string; gradient: GradientTuple };
}> = {
  indigo: {
    dark: {
      primary: '#3b82f6',
      hover: '#2563eb',
      light: '#60a5fa',
      subtle: 'rgba(59, 130, 246, 0.16)',
      text: '#93c5fd',
      cyan: '#06b6d4',
      gradient: ['#2563eb', '#06b6d4'],
    },
    light: {
      primary: '#2563eb',
      hover: '#1d4ed8',
      light: '#3b82f6',
      subtle: 'rgba(37, 99, 235, 0.12)',
      text: '#1e40af',
      cyan: '#0891b2',
      gradient: ['#2563eb', '#06b6d4'],
    },
  },
  ocean: {
    dark: {
      primary: '#0284c7',
      hover: '#0369a1',
      light: '#38bdf8',
      subtle: 'rgba(14, 165, 233, 0.18)',
      text: '#7dd3fc',
      cyan: '#0ea5e9',
      gradient: ['#0284c7', '#38bdf8'],
    },
    light: {
      primary: '#0284c7',
      hover: '#0369a1',
      light: '#0ea5e9',
      subtle: 'rgba(14, 165, 233, 0.12)',
      text: '#075985',
      cyan: '#0284c7',
      gradient: ['#0284c7', '#38bdf8'],
    },
  },
  forest: {
    dark: {
      primary: '#10b981',
      hover: '#059669',
      light: '#34d399',
      subtle: 'rgba(16, 185, 129, 0.18)',
      text: '#6ee7b7',
      cyan: '#059669',
      gradient: ['#059669', '#34d399'],
    },
    light: {
      primary: '#059669',
      hover: '#047857',
      light: '#10b981',
      subtle: 'rgba(16, 185, 129, 0.12)',
      text: '#065f46',
      cyan: '#047857',
      gradient: ['#059669', '#34d399'],
    },
  },
  sunset: {
    dark: {
      primary: '#f43f5e',
      hover: '#e11d48',
      light: '#fb7185',
      subtle: 'rgba(244, 63, 94, 0.18)',
      text: '#fda4af',
      cyan: '#fb923c',
      gradient: ['#e11d48', '#fb923c'],
    },
    light: {
      primary: '#e11d48',
      hover: '#be123c',
      light: '#f43f5e',
      subtle: 'rgba(244, 63, 94, 0.12)',
      text: '#9f1239',
      cyan: '#ea580c',
      gradient: ['#e11d48', '#fb923c'],
    },
  },
};

export const getThemeColors = (isDarkMode: boolean, accent: AccentPreset = 'indigo'): ThemeColors => {
  const pal = ACCENT_MAP[accent] || ACCENT_MAP.indigo;
  const acc = isDarkMode ? pal.dark : pal.light;

  if (isDarkMode) {
    return {
      background: '#090b11',
      surface: '#111420',
      surfaceHover: '#161b2b',
      surfaceSubtle: '#131726',
      card: '#111420',
      cardSecondary: '#161b2b',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderSubtle: 'rgba(255, 255, 255, 0.04)',
      borderHover: 'rgba(255, 255, 255, 0.18)',

      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      textPlaceholder: '#475569',

      primary: acc.primary,
      primaryHover: acc.hover,
      primaryLight: acc.light,
      primarySubtle: acc.subtle,
      primaryText: acc.text,
      accentCyan: acc.cyan,

      todo: '#64748b',
      inprogress: acc.light,
      review: '#fbbf24',
      completed: '#10b981',

      priorityLow: '#64748b',
      priorityMedium: '#38bdf8',
      priorityHigh: '#f59e0b',
      priorityUrgent: '#ef4444',

      danger: '#ef4444',
      dangerSubtle: 'rgba(239, 68, 68, 0.16)',
      success: '#10b981',
      successSubtle: 'rgba(16, 185, 129, 0.16)',
      warning: '#f59e0b',
      warningSubtle: 'rgba(245, 158, 11, 0.16)',
      info: '#0ea5e9',
      infoSubtle: 'rgba(14, 165, 233, 0.16)',

      tabBar: '#090b11',
      tabBarBorder: 'rgba(255, 255, 255, 0.08)',
      tabBarActive: acc.light,
      tabBarInactive: '#64748b',

      gradientPrimary: acc.gradient,
      gradientBrand: acc.gradient,
      gradientAi: ['#7c3aed', acc.primary, acc.cyan],
      gradientCard: ['#161b2b', '#111420'],
      gradientStat: [`${acc.primary}24`, 'rgba(6, 182, 212, 0.04)'],
      gradientSuccess: ['#059669', '#10b981'],
      gradientDanger: ['#dc2626', '#ef4444'],
      gradientWarning: ['#d97706', '#f59e0b'],
    };
  }

  return {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    surfaceSubtle: '#f8fafc',
    card: '#ffffff',
    cardSecondary: '#f8fafc',
    cardBorder: '#e2e8f0',
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    borderHover: '#cbd5e1',

    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textPlaceholder: '#94a3b8',

    primary: acc.primary,
    primaryHover: acc.hover,
    primaryLight: acc.light,
    primarySubtle: acc.subtle,
    primaryText: acc.text,
    accentCyan: acc.cyan,

    todo: '#64748b',
    inprogress: acc.primary,
    review: '#d97706',
    completed: '#059669',

    priorityLow: '#64748b',
    priorityMedium: '#2563eb',
    priorityHigh: '#d97706',
    priorityUrgent: '#dc2626',

    danger: '#dc2626',
    dangerSubtle: 'rgba(220, 38, 38, 0.1)',
    success: '#059669',
    successSubtle: 'rgba(5, 150, 105, 0.1)',
    warning: '#d97706',
    warningSubtle: 'rgba(217, 119, 6, 0.1)',
    info: '#0284c7',
    infoSubtle: 'rgba(2, 132, 199, 0.1)',

    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    tabBarActive: acc.primary,
    tabBarInactive: '#94a3b8',

    gradientPrimary: acc.gradient,
    gradientBrand: acc.gradient,
    gradientAi: ['#7c3aed', acc.primary, acc.cyan],
    gradientCard: ['#ffffff', '#f8fafc'],
    gradientStat: [`${acc.primary}15`, 'rgba(6, 182, 212, 0.02)'],
    gradientSuccess: ['#059669', '#10b981'],
    gradientDanger: ['#dc2626', '#ef4444'],
    gradientWarning: ['#d97706', '#f59e0b'],
  };
};

export const darkColors: ThemeColors = getThemeColors(true, 'indigo');
export const lightColors: ThemeColors = getThemeColors(false, 'indigo');
