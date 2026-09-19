export type GradientTuple = readonly [string, string, ...string[]];

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

export const darkColors: ThemeColors = {
  // Ultra-modern obsidian & slate backgrounds (matching Upgen Webapp design tokens)
  background: '#0c0e14',
  surface: '#121520',
  surfaceHover: '#181c2b',
  surfaceSubtle: '#151926',
  card: '#121520',
  cardSecondary: '#181c2b',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderHover: 'rgba(255, 255, 255, 0.16)',

  // Typography
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textPlaceholder: '#475569',

  // Primary Brand & Accent (Modern Electric Blue & Cyan like Upgen Webapp)
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryLight: '#60a5fa',
  primarySubtle: 'rgba(59, 130, 246, 0.15)',
  primaryText: '#93c5fd',
  accentCyan: '#06b6d4',

  // Statuses
  todo: '#64748b',
  inprogress: '#38bdf8',
  review: '#fbbf24',
  completed: '#10b981',

  // Priorities
  priorityLow: '#64748b',
  priorityMedium: '#38bdf8',
  priorityHigh: '#f59e0b',
  priorityUrgent: '#ef4444',

  // Semantic
  danger: '#ef4444',
  dangerSubtle: 'rgba(239, 68, 68, 0.15)',
  success: '#10b981',
  successSubtle: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  info: '#0ea5e9',
  infoSubtle: 'rgba(14, 165, 233, 0.15)',

  // Tab & Header
  tabBar: '#0c0e14',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabBarActive: '#38bdf8',
  tabBarInactive: '#64748b',

  // Gradients for Modern Cards & Brand Identity
  gradientPrimary: ['#2563eb', '#06b6d4'],
  gradientBrand: ['#2563eb', '#06b6d4'],
  gradientAi: ['#7c3aed', '#2563eb', '#06b6d4'],
  gradientCard: ['#181c2b', '#121520'],
  gradientStat: ['rgba(37, 99, 235, 0.14)', 'rgba(6, 182, 212, 0.04)'],
  gradientSuccess: ['#059669', '#10b981'],
  gradientDanger: ['#dc2626', '#ef4444'],
  gradientWarning: ['#d97706', '#f59e0b'],
};

export const lightColors: ThemeColors = {
  // Backgrounds
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

  // Typography
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textPlaceholder: '#94a3b8',

  // Primary brand (Electric Blue)
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#3b82f6',
  primarySubtle: 'rgba(37, 99, 235, 0.09)',
  primaryText: '#2563eb',
  accentCyan: '#0891b2',

  // Statuses
  todo: '#64748b',
  inprogress: '#2563eb',
  review: '#d97706',
  completed: '#059669',

  // Priorities
  priorityLow: '#64748b',
  priorityMedium: '#2563eb',
  priorityHigh: '#d97706',
  priorityUrgent: '#dc2626',

  // Semantic
  danger: '#dc2626',
  dangerSubtle: 'rgba(220, 38, 38, 0.1)',
  success: '#059669',
  successSubtle: 'rgba(5, 150, 105, 0.1)',
  warning: '#d97706',
  warningSubtle: 'rgba(217, 119, 6, 0.1)',
  info: '#0284c7',
  infoSubtle: 'rgba(2, 132, 199, 0.1)',

  // Tab & Header
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
  tabBarActive: '#2563eb',
  tabBarInactive: '#94a3b8',

  // Gradients for Modern Cards
  gradientPrimary: ['#2563eb', '#06b6d4'],
  gradientBrand: ['#2563eb', '#06b6d4'],
  gradientAi: ['#7c3aed', '#2563eb', '#06b6d4'],
  gradientCard: ['#ffffff', '#f8fafc'],
  gradientStat: ['rgba(37, 99, 235, 0.08)', 'rgba(6, 182, 212, 0.02)'],
  gradientSuccess: ['#059669', '#10b981'],
  gradientDanger: ['#dc2626', '#ef4444'],
  gradientWarning: ['#d97706', '#f59e0b'],
};
