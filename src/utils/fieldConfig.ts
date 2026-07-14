"use client";

export interface OptionConfig {
  id: string;
  label: string;
  color: string; // e.g. 'indigo-500', 'rose-500'
  dot?: string;  // dot color class
  bg?: string;   // bg styling
  icon?: string; // icon string (for priority)
}

export const DEFAULT_STATUSES: OptionConfig[] = [
  { id: 'todo', label: 'TO DO', color: 'slate-500', dot: 'bg-slate-400', bg: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { id: 'inprogress', label: 'IN PROGRESS', color: 'amber-500', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900' },
  { id: 'review', label: 'UNDER REVIEW', color: 'cyan-500', dot: 'bg-cyan-500', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-955/20 dark:text-cyan-400 dark:border-cyan-900' },
  { id: 'completed', label: 'COMPLETED', color: 'emerald-500', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900' }
];

export const DEFAULT_PRIORITIES: OptionConfig[] = [
  { id: 'urgent', label: 'Urgent', color: 'red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-955/30 dark:border-red-900/50', icon: '🔴' },
  { id: 'high', label: 'High', color: 'orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-955/30 dark:border-orange-900/50', icon: '🟠' },
  { id: 'medium', label: 'Normal', color: 'yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-955/30 dark:border-yellow-900/50', icon: '🟡' },
  { id: 'low', label: 'Low', color: 'slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: '⚪' }
];

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
  columnNames: 'avaxa_field_column_names',
  statuses: 'avaxa_field_statuses',
  priorities: 'avaxa_field_priorities',
  customFields: 'avaxa_field_custom_configs'
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

export function getStoredCustomFieldsConfig(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customFields);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveCustomFieldsConfig(configs: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.customFields, JSON.stringify(configs));
  } catch (e) {
    console.error(e);
  }
}

export function getTailwindColorConfig(colorName: string, type: 'status' | 'priority') {
  const c = colorName.toLowerCase();
  
  if (type === 'status') {
    return {
      dot: `bg-${c}-500`,
      bg: `bg-${c}-50 text-${c}-750 border-${c}-200/60 dark:bg-${c}-955/20 dark:text-${c}-400 dark:border-${c}-900/50`
    };
  } else {
    // priority
    return {
      bg: `bg-${c}-50 border-${c}-200 dark:bg-${c}-955/30 dark:border-${c}-900/50`,
      color: `text-${c}-600 dark:text-${c}-400`
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
    const raw = localStorage.getItem('avaxa_date_format');
    return (raw as DateFormatOption) || 'MMM DD, YYYY';
  } catch (e) {
    return 'MMM DD, YYYY';
  }
}

export function saveDateFormat(format: DateFormatOption) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('avaxa_date_format', format);
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

