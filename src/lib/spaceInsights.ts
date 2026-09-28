import type { Task } from '../types';

export type SpaceFocus = 'all' | 'active' | 'mine' | 'overdue' | 'today' | 'upcoming' | 'unassigned' | 'completed' | 'priority';

// Date-only deadlines last through the local calendar day, not UTC midnight.
export function taskDueTime(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

export function matchesSpaceFocus(task: Task, focus: SpaceFocus, userId?: string, now = new Date()): boolean {
  if (focus === 'all') return true;
  if (focus === 'active') return task.status !== 'completed' && (task.status as string) !== 'canceled';
  if (focus === 'completed') return task.status === 'completed';
  if (focus === 'mine') return Boolean(userId && (task.assigneeId === userId || task.assigneeIds?.includes(userId)));
  if (task.status === 'completed') return false;
  if (focus === 'unassigned') return !task.assigneeId && !task.assigneeIds?.length;
  if (focus === 'priority') return task.priority === 'urgent' || task.priority === 'high';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).getTime();
  const due = taskDueTime(task.dueDate);
  if (focus === 'overdue') return due < start;
  if (focus === 'today') return due >= start && due < tomorrow;
  return due >= start && due < weekEnd;
}

export function rankSpaceTasks(tasks: Task[], now = new Date()): Task[] {
  const priority = { urgent: 4, high: 3, medium: 2, low: 1 };
  return tasks.filter(task => task.status !== 'completed').sort((a, b) => {
    const overdue = Number(matchesSpaceFocus(b, 'overdue', undefined, now)) - Number(matchesSpaceFocus(a, 'overdue', undefined, now));
    if (overdue) return overdue;
    const dateDiff = taskDueTime(a.dueDate) - taskDueTime(b.dueDate);
    if (!Number.isNaN(dateDiff) && dateDiff !== 0) return dateDiff;
    const bW = b.priority ? (priority[b.priority] || 0) : 0;
    const aW = a.priority ? (priority[a.priority] || 0) : 0;
    return bW - aW;
  });
}

export function safeBookmarkUrl(value: string): string | null {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return ['https:', 'http:'].includes(url.protocol) && url.hostname ? url.href : null;
  } catch { return null; }
}
