export type MiniAppCategory =
  | 'all'
  | 'productivity'
  | 'business'
  | 'collaboration'
  | 'utilities'
  | 'custom';

export type MiniAppOpenMode = 'embedded' | 'new_tab';

export interface MiniAppItem {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  icon: string; // Emoji hoặc tên icon
  iconName?: string; // Tên SVG vector icon (ví dụ: calendar-clock, palette, database...)
  category: MiniAppCategory;
  color: string;
  gradient?: string;
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'purple';
  isSystem: boolean;
  isPinned?: boolean;
  isEnabled?: boolean;
  url?: string; // Dành cho custom web embed
  openMode?: MiniAppOpenMode;
  tags?: string[];
  author?: string;
  version?: string;
  rating?: number;
  featured?: boolean;
}

export interface CustomMiniAppInput {
  name: string;
  description: string;
  icon: string;
  iconName?: string;
  category: MiniAppCategory;
  color: string;
  url: string;
  openMode: MiniAppOpenMode;
  tags?: string[];
}
