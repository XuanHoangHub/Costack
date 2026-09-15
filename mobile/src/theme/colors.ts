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
  gradientCard: GradientTuple;
  gradientStat: GradientTuple;
  gradientSuccess: GradientTuple;
  gradientDanger: GradientTuple;
  gradientWarning: GradientTuple;
}

export const darkColors: ThemeColors = {
  // Ultra-modern obsidian & slate backgrounds
  background: '#08090d',
  surface: '#111420',
  surfaceHover: '#181c2d',
  surfaceSubtle: '#141724',
  card: '#121522',
  cardSecondary: '#161a29',
  cardBorder: 'rgba(255, 255, 255, 0.09)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderHover: 'rgba(255, 255, 255, 0.16)',

  // Typography
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textPlaceholder: '#475569',

  // Primary Brand & Gradients (Indigo / Purple high-tech)
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primaryLight: '#818cf8',
  primarySubtle: 'rgba(99, 102, 241, 0.15)',
  primaryText: '#a5b4fc',

  // Statuses
  todo: '#64748b',
  inprogress: '#38bdf8',
  review: '#fbbf24',
  completed: '#10b981',

  // Priorities
  priorityLow: '#64748b',
  priorityMedium: '#38bdf8',
  priorityHigh: '#f59e0b',
  priorityUrgent: '#f43f5e',

  // Semantic
  danger: '#f43f5e',
  dangerSubtle: 'rgba(244, 63, 94, 0.15)',
  success: '#10b981',
  successSubtle: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  info: '#0ea5e9',
  infoSubtle: 'rgba(14, 165, 233, 0.15)',

  // Tab & Header
  tabBar: '#0b0d14',
  tabBarBorder: 'rgba(255, 255, 255, 0.07)',
  tabBarActive: '#818cf8',
  tabBarInactive: '#64748b',

  // Gradients for Modern Cards
  gradientPrimary: ['#6366f1', '#8b5cf6'],
  gradientCard: ['#171a2b', '#0f121d'],
  gradientStat: ['rgba(99, 102, 241, 0.12)', 'rgba(139, 92, 246, 0.04)'],
  gradientSuccess: ['#059669', '#10b981'],
  gradientDanger: ['#e11d48', '#f43f5e'],
  gradientWarning: ['#d97706', '#f59e0b'],
};

export const lightColors: ThemeColors = {
  // Backgrounds
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  surfaceSubtle: '#f8fafc',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  cardBorder: '#e2e8f0',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  borderHover: '#cbd5e1',

  // Typography
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textPlaceholder: '#94a3b8',

  // Primary brand
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  primaryLight: '#6366f1',
  primarySubtle: 'rgba(79, 70, 229, 0.1)',
  primaryText: '#4f46e5',

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
  tabBarActive: '#4f46e5',
  tabBarInactive: '#94a3b8',

  // Gradients for Modern Cards
  gradientPrimary: ['#4f46e5', '#7c3aed'],
  gradientCard: ['#ffffff', '#f8fafc'],
  gradientStat: ['rgba(79, 70, 229, 0.08)', 'rgba(124, 58, 237, 0.02)'],
  gradientSuccess: ['#059669', '#10b981'],
  gradientDanger: ['#dc2626', '#ef4444'],
  gradientWarning: ['#d97706', '#f59e0b'],
};
