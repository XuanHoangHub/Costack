"use client";

export interface OptionConfig {
  id: string;
  label: string;
  color: string; // e.g. 'indigo', 'emerald', 'red'
  dot?: string;  // dot color class
  bg?: string;   // bg styling
  icon?: string; // icon string (for priority/status/custom)
}

export interface ColorOption {
  id: string;
  name: string;
  nameVi: string;
  hex: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
  badge: string;
  statusPill: string;
  priorityPill: string;
}

export const COLOR_PALETTE: ColorOption[] = [
  {
    id: 'slate',
    name: 'Slate',
    nameVi: 'Xám',
    hex: '#64748b',
    dot: 'bg-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    statusPill: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    priorityPill: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
  },
  {
    id: 'red',
    name: 'Red',
    nameVi: 'Đỏ',
    hex: '#ef4444',
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-900',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
    statusPill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
    priorityPill: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
  },
  {
    id: 'rose',
    name: 'Rose',
    nameVi: 'Hồng đỏ',
    hex: '#f43f5e',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    statusPill: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    priorityPill: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50'
  },
  {
    id: 'orange',
    name: 'Orange',
    nameVi: 'Cam',
    hex: '#f97316',
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-900',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900',
    statusPill: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900',
    priorityPill: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50'
  },
  {
    id: 'amber',
    name: 'Amber',
    nameVi: 'Hổ phách',
    hex: '#f59e0b',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    statusPill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900',
    priorityPill: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50'
  },
  {
    id: 'yellow',
    name: 'Yellow',
    nameVi: 'Vàng',
    hex: '#eab308',
    dot: 'bg-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-900',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900',
    statusPill: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900',
    priorityPill: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50'
  },
  {
    id: 'emerald',
    name: 'Emerald',
    nameVi: 'Lục bảo',
    hex: '#10b981',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-900',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    statusPill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900',
    priorityPill: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
  },
  {
    id: 'teal',
    name: 'Teal',
    nameVi: 'Xanh mòng két',
    hex: '#14b8a6',
    dot: 'bg-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-900',
    badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900',
    statusPill: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900',
    priorityPill: 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-900/50'
  },
  {
    id: 'cyan',
    name: 'Cyan',
    nameVi: 'Xanh lơ',
    hex: '#06b6d4',
    dot: 'bg-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-900',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900',
    statusPill: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-955/20 dark:text-cyan-400 dark:border-cyan-900',
    priorityPill: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-900/50'
  },
  {
    id: 'blue',
    name: 'Blue',
    nameVi: 'Xanh dương',
    hex: '#3b82f6',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    statusPill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    priorityPill: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50'
  },
  {
    id: 'indigo',
    name: 'Indigo',
    nameVi: 'Chàm',
    hex: '#6366f1',
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-900',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
    statusPill: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
    priorityPill: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/50'
  },
  {
    id: 'violet',
    name: 'Violet',
    nameVi: 'Tím violet',
    hex: '#8b5cf6',
    dot: 'bg-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-900',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900',
    statusPill: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900',
    priorityPill: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900/50'
  },
  {
    id: 'purple',
    name: 'Purple',
    nameVi: 'Tím',
    hex: '#a855f7',
    dot: 'bg-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
    statusPill: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
    priorityPill: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/50'
  },
  {
    id: 'pink',
    name: 'Pink',
    nameVi: 'Hồng',
    hex: '#ec4899',
    dot: 'bg-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-900',
    badge: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900',
    statusPill: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900',
    priorityPill: 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-900/50'
  }
];

export function getColorOption(colorName?: string): ColorOption {
  if (!colorName) return COLOR_PALETTE[0];
  const cleaned = colorName.toLowerCase().replace('bg-', '').replace('text-', '').replace('-500', '').replace('-600', '').trim();
  const match = COLOR_PALETTE.find(c => c.id === cleaned || c.hex.toLowerCase() === cleaned);
  return match || COLOR_PALETTE[0];
}

export const DEFAULT_STATUSES: OptionConfig[] = [
  { id: 'todo', label: 'To Do', color: 'slate', dot: 'bg-slate-500', bg: 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { id: 'inprogress', label: 'In Progress', color: 'amber', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900' },
  { id: 'review', label: 'In Review', color: 'purple', dot: 'bg-purple-500', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-955/20 dark:text-purple-400 dark:border-purple-900' },
  { id: 'completed', label: 'Done', color: 'emerald', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' }
];

export const DEFAULT_PRIORITIES: OptionConfig[] = [
  { id: 'urgent', label: 'Urgent', color: 'red', bg: 'bg-red-50 border-red-200 dark:bg-red-955/30 dark:border-red-900/50', icon: 'Flag' },
  { id: 'high', label: 'High', color: 'orange', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-955/30 dark:border-orange-900/50', icon: 'Flag' },
  { id: 'medium', label: 'Normal', color: 'blue', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-955/30 dark:border-blue-900/50', icon: 'Flag' },
  { id: 'low', label: 'Low', color: 'slate', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: 'Flag' }
];

const VI_STANDARD_OPTION_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  inprogress: 'Đang thực hiện',
  review: 'Chờ duyệt',
  completed: 'Hoàn thành',
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const EN_STANDARD_OPTION_LABELS: Record<string, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  review: 'Review',
  completed: 'Done',
  urgent: 'Urgent',
  high: 'High',
  medium: 'Normal',
  low: 'Low',
};

const STANDARD_LABEL_ALIASES: Record<string, string[]> = {
  todo: ['to do', 'todo', 'cần làm', 'chưa làm'],
  inprogress: ['in progress', 'inprogress', 'đang thực hiện', 'đang làm'],
  review: ['review', 'under review', 'chờ duyệt', 'đang duyệt'],
  completed: ['done', 'complete', 'completed', 'hoàn thành', 'đã xong'],
  urgent: ['urgent', 'khẩn cấp'],
  high: ['high', 'cao'],
  medium: ['medium', 'normal', 'trung bình'],
  low: ['low', 'thấp'],
};

export function getLocalizedOptionLabel(id: string, label: string, locale: string) {
  const normalizedLabel = (label || '').trim().toLowerCase();
  const isStandard = VI_STANDARD_OPTION_LABELS[id] !== undefined || (STANDARD_LABEL_ALIASES[id] && STANDARD_LABEL_ALIASES[id].includes(normalizedLabel));
  if (isStandard) {
    return locale === 'vi'
      ? (VI_STANDARD_OPTION_LABELS[id] || label)
      : (EN_STANDARD_OPTION_LABELS[id] || label);
  }
  return label;
}

export const DEFAULT_COLUMN_NAMES: Record<string, string> = {
  title: 'Task',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  space: 'Space',
  startDate: 'Start Date',
  dueDate: 'Due Date',
  progress: 'Progress',
  tags: 'Tags'
};

const STORAGE_KEYS = {
  columnNames: 'apexa_field_column_names',
  statuses: 'apexa_field_statuses',
  priorities: 'apexa_field_priorities',
  customFields: 'apexa_field_custom_configs'
};

export function getStoredColumnNames(): Record<string, string> {
  if (typeof window === 'undefined') return DEFAULT_COLUMN_NAMES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.columnNames);
    return raw ? { ...DEFAULT_COLUMN_NAMES, ...JSON.parse(raw) } : DEFAULT_COLUMN_NAMES;
  } catch (e) {
    return DEFAULT_COLUMN_NAMES;
  }
}

export function saveColumnNames(names: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.columnNames, JSON.stringify(names));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredStatuses(): OptionConfig[] {
  if (typeof window === 'undefined') return DEFAULT_STATUSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.statuses);
    return raw ? JSON.parse(raw) : DEFAULT_STATUSES;
  } catch (e) {
    return DEFAULT_STATUSES;
  }
}

export function saveStatuses(statuses: OptionConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.statuses, JSON.stringify(statuses));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredPriorities(): OptionConfig[] {
  if (typeof window === 'undefined') return DEFAULT_PRIORITIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.priorities);
    return raw ? JSON.parse(raw) : DEFAULT_PRIORITIES;
  } catch (e) {
    return DEFAULT_PRIORITIES;
  }
}

export function savePriorities(priorities: OptionConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.priorities, JSON.stringify(priorities));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredCustomFieldsConfig(): Record<string, OptionConfig[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customFields);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveCustomFieldsConfig(configs: Record<string, OptionConfig[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.customFields, JSON.stringify(configs));
  } catch (e) {
    console.error(e);
  }
}

export function getTailwindColorConfig(colorName: string, type: 'status' | 'priority' | 'badge' = 'badge') {
  const opt = getColorOption(colorName);
  
  if (type === 'status') {
    return {
      dot: opt.dot,
      bg: opt.statusPill,
      color: opt.id
    };
  } else if (type === 'priority') {
    return {
      bg: opt.priorityPill,
      color: opt.text,
      dot: opt.dot
    };
  } else {
    return {
      badge: opt.badge,
      dot: opt.dot,
      bg: opt.bg,
      text: opt.text,
      border: opt.border,
      hex: opt.hex
    };
  }
}

export type DateFormatOption = 'MMM DD, YYYY' | 'DD MMM YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MMM DD';

export const DATE_FORMAT_PRESETS: { id: DateFormatOption; label: string; sample: string }[] = [
  { id: 'MMM DD, YYYY', label: 'Month DD, YYYY', sample: 'Jul 17, 2026' },
  { id: 'DD MMM YYYY', label: 'DD Month YYYY', sample: '17 Jul 2026' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY', sample: '17/07/2026' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD', sample: '2026-07-17' },
  { id: 'MMM DD', label: 'Month DD (Short)', sample: 'Jul 17' }
];

export function getStoredDateFormat(): DateFormatOption {
  if (typeof window === 'undefined') return 'MMM DD, YYYY';
  try {
    const raw = localStorage.getItem('apexa_date_format');
    return (raw as DateFormatOption) || 'MMM DD, YYYY';
  } catch (e) {
    return 'MMM DD, YYYY';
  }
}

export function saveDateFormat(format: DateFormatOption) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('apexa_date_format', format);
  } catch (e) {
    console.error(e);
  }
}

export function formatCustomDate(dateValue: string, format: DateFormatOption): string {
  if (!dateValue) return '';
  const parts = dateValue.split('T');
  const datePart = parts[0];
  const timePart = parts[1] ? parts[1].slice(0, 5) : '';
  const dateParts = datePart.split('-');
  if (dateParts.length !== 3) return dateValue;
  
  const yyyy = dateParts[0];
  const mmIndex = parseInt(dateParts[1]) - 1;
  const mmNumber = dateParts[1];
  const dd = dateParts[2];
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[mmIndex] || '';
  
  let formatted = '';
  switch (format) {
    case 'DD MMM YYYY':
      formatted = `${parseInt(dd)} ${monthName} ${yyyy}`;
      break;
    case 'DD/MM/YYYY':
      formatted = `${dd}/${mmNumber}/${yyyy}`;
      break;
    case 'YYYY-MM-DD':
      formatted = `${yyyy}-${mmNumber}-${dd}`;
      break;
    case 'MMM DD':
      formatted = `${monthName} ${parseInt(dd)}`;
      break;
    case 'MMM DD, YYYY':
    default:
      formatted = `${monthName} ${parseInt(dd)}, ${yyyy}`;
      break;
  }
  
  return timePart ? `${formatted}, ${timePart}` : formatted;
}
