export type ProfileTab = 'overview' | 'tasks' | 'security' | 'preferences';

export interface BannerPreset {
  id: string;
  nameVi: string;
  nameEn: string;
  gradient: string;
  previewClass: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'cosmic',
    nameVi: 'Vũ trụ tím & Xanh',
    nameEn: 'Cosmic Violet',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)',
    previewClass: 'from-indigo-600 via-purple-600 to-cyan-500',
  },
  {
    id: 'aurora',
    nameVi: 'Cực quang xanh ngọc',
    nameEn: 'Aurora Emerald',
    gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%)',
    previewClass: 'from-emerald-600 via-teal-600 to-sky-600',
  },
  {
    id: 'sunset',
    nameVi: 'Hoàng hôn san hô',
    nameEn: 'Coral Sunset',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #ea580c 50%, #f59e0b 100%)',
    previewClass: 'from-rose-500 via-orange-600 to-amber-500',
  },
  {
    id: 'cyberpunk',
    nameVi: 'Cyberpunk đêm',
    nameEn: 'Midnight Cyber',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #312e81 40%, #ec4899 100%)',
    previewClass: 'from-slate-900 via-indigo-900 to-pink-500',
  },
  {
    id: 'royal',
    nameVi: 'Hoàng gia xanh đậm',
    nameEn: 'Royal Indigo',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 60%, #38bdf8 100%)',
    previewClass: 'from-indigo-950 via-blue-600 to-sky-400',
  },
  {
    id: 'monochrome',
    nameVi: 'Kim loại tối giản',
    nameEn: 'Minimal Slate',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #64748b 100%)',
    previewClass: 'from-slate-800 via-slate-700 to-slate-500',
  },
];

export interface StatusPreset {
  emoji: string;
  textVi: string;
  textEn: string;
}

export const STATUS_PRESETS: StatusPreset[] = [
  { emoji: '💬', textVi: 'Đang tập trung làm việc', textEn: 'Focusing on deep work' },
  { emoji: '⚡', textVi: 'Đang sprint dự án gấp', textEn: 'On a project sprint' },
  { emoji: '☕', textVi: 'Đang nghỉ giải lao / Ăn trưa', textEn: 'Coffee break / Lunch' },
  { emoji: '📞', textVi: 'Đang trong cuộc họp', textEn: 'In a meeting' },
  { emoji: '🏖️', textVi: 'Đang nghỉ phép', textEn: 'On vacation / Off duty' },
  { emoji: '🚗', textVi: 'Đang di chuyển / Đi đường', textEn: 'Commuting / Traveling' },
  { emoji: '🤒', textVi: 'Đang không khỏe', textEn: 'Feeling unwell / Sick leave' },
  { emoji: '🎧', textVi: 'Đang nghe nhạc & Code', textEn: 'Listening to music & coding' },
];

export interface GamificationBadge {
  id: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progressText?: string;
}

export interface ProfileMeta {
  location: string;
  jobTitle: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
}
