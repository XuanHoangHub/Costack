import { Task } from '@/types';

export const DEFAULT_TRASH_RETENTION_DAYS = 30;

export const TRASH_RETENTION_OPTIONS = [
  { value: 7, labelVi: '7 ngày', labelEn: '7 days' },
  { value: 14, labelVi: '14 ngày', labelEn: '14 days' },
  { value: 30, labelVi: '30 ngày (Khuyến nghị)', labelEn: '30 days (Recommended)' },
  { value: 60, labelVi: '60 ngày', labelEn: '60 days' },
  { value: 90, labelVi: '90 ngày', labelEn: '90 days' },
] as const;

export const TRASH_RETENTION_STORAGE_KEY = 'costack_trash_retention_days';

/**
 * Get user configured trash retention days from localStorage, falling back to 30 days.
 */
export function getTrashRetentionDays(): number {
  if (typeof window === 'undefined') return DEFAULT_TRASH_RETENTION_DAYS;
  try {
    const saved = localStorage.getItem(TRASH_RETENTION_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_TRASH_RETENTION_DAYS;
}

/**
 * Save trash retention days preference to localStorage and notify listeners.
 */
export function setTrashRetentionDays(days: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRASH_RETENTION_STORAGE_KEY, String(days));
    window.dispatchEvent(new CustomEvent('costack:trash-retention-change', { detail: { days } }));
  } catch {
    // ignore
  }
}

export interface TaskTrashDaysInfo {
  ageInDays: number;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

/**
 * Calculate age, remaining days, and expiration state for a deleted task.
 */
export function getTaskTrashDaysInfo(
  deletedAt?: string,
  retentionDays: number = DEFAULT_TRASH_RETENTION_DAYS,
  nowMs: number = Date.now()
): TaskTrashDaysInfo {
  if (!deletedAt) {
    return {
      ageInDays: 0,
      daysRemaining: retentionDays,
      isExpired: false,
      isExpiringSoon: false,
    };
  }

  const deletedTime = new Date(deletedAt).getTime();
  if (isNaN(deletedTime)) {
    return {
      ageInDays: 0,
      daysRemaining: retentionDays,
      isExpired: false,
      isExpiringSoon: false,
    };
  }

  const ageInMs = Math.max(0, nowMs - deletedTime);
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, retentionDays - ageInDays);
  const isExpired = ageInDays >= retentionDays;
  const isExpiringSoon = !isExpired && daysRemaining <= 3;

  return {
    ageInDays,
    daysRemaining,
    isExpired,
    isExpiringSoon,
  };
}

/**
 * Find all tasks that have exceeded their retention period.
 */
export function getExpiredDeletedTasks(
  tasks: Task[],
  retentionDays: number = DEFAULT_TRASH_RETENTION_DAYS,
  nowMs: number = Date.now()
): Task[] {
  return tasks.filter((t) => {
    if (!t.deletedAt) return false;
    const { isExpired } = getTaskTrashDaysInfo(t.deletedAt, retentionDays, nowMs);
    return isExpired;
  });
}
