import type { Task } from '@/types';

export type TaskRelationships = NonNullable<Task['relationships']>;

const RELATIONSHIPS_META_KEY = '_apexaRelationships';

const cleanIds = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0)));
  return ids.length ? ids : undefined;
};

export const normalizeTaskRelationships = (value: unknown): TaskRelationships | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const normalized: TaskRelationships = {
    tasks: cleanIds(source.tasks),
    docs: cleanIds(source.docs),
    blockedBy: cleanIds(source.blockedBy),
    blocks: cleanIds(source.blocks),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

export const extractTaskRelationships = (task: any): TaskRelationships | undefined =>
  normalizeTaskRelationships(task?.relationships) ||
  normalizeTaskRelationships(task?.custom_fields?.[RELATIONSHIPS_META_KEY]);

/**
 * Relationships are stored inside the existing JSON custom_fields column so
 * older Supabase schemas keep working without an unsafe runtime migration.
 */
export const embedTaskRelationships = (
  customFields: Record<string, unknown> | undefined,
  relationships: Task['relationships'],
) => {
  const next = { ...(customFields || {}) };
  const normalized = normalizeTaskRelationships(relationships);
  if (normalized) next[RELATIONSHIPS_META_KEY] = normalized;
  else delete next[RELATIONSHIPS_META_KEY];
  return next;
};

export const getIncompleteBlockers = (task: Task, allTasks: Task[]) => {
  const blockerIds = new Set(task.relationships?.blockedBy || []);
  return allTasks.filter(candidate => blockerIds.has(candidate.id) && candidate.status !== 'completed');
};

export const wouldCreateDependencyCycle = (
  blockedTaskId: string,
  blockerTaskId: string,
  allTasks: Task[],
) => {
  if (blockedTaskId === blockerTaskId) return true;
  const byId = new Map(allTasks.map(task => [task.id, task]));
  const visited = new Set<string>();
  const stack = [blockerTaskId];

  while (stack.length) {
    const currentId = stack.pop()!;
    if (currentId === blockedTaskId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const current = byId.get(currentId);
    for (const dependencyId of current?.relationships?.blockedBy || []) stack.push(dependencyId);
  }
  return false;
};

export const getNextRecurringDate = (
  dateValue: string | undefined,
  recurrence: NonNullable<Task['recurrence']>,
  referenceDate?: Date
): string => {
  const interval = Math.max(1, recurrence.interval || 1);
  const now = referenceDate || new Date();

  // Normalize today's date in local calendar time (midnight)
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const todayLocal = new Date(todayYear, todayMonth, todayDay);

  let targetYear = todayYear;
  let targetMonth = todayMonth;
  let targetDay = todayDay;
  let timeSuffix = '';

  if (dateValue && typeof dateValue === 'string' && dateValue.trim()) {
    const trimmed = dateValue.trim();
    const [dPart, tPart] = trimmed.split('T');
    if (tPart) timeSuffix = `T${tPart}`;

    const dateParts = dPart.split('-');
    if (dateParts.length === 3) {
      const y = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10) - 1;
      const d = parseInt(dateParts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        targetYear = y;
        targetMonth = m;
        targetDay = d;
      }
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        targetYear = parsed.getFullYear();
        targetMonth = parsed.getMonth();
        targetDay = parsed.getDate();
      }
    }
  }

  let next = new Date(targetYear, targetMonth, targetDay);

  if (recurrence.frequency === 'daily') {
    // If target date is today or in the past, advance strictly from today + interval
    // so completing today's task always lands on tomorrow (or today + interval), NEVER today!
    if (next.getTime() <= todayLocal.getTime()) {
      next = new Date(todayYear, todayMonth, todayDay + interval);
    } else {
      next.setDate(next.getDate() + interval);
    }
  } else if (recurrence.frequency === 'weekly') {
    const step = 7 * interval;
    if (next.getTime() <= todayLocal.getTime()) {
      next = new Date(todayYear, todayMonth, todayDay + step);
    } else {
      next.setDate(next.getDate() + step);
    }
    // Ensure it strictly advances past today
    while (next.getTime() <= todayLocal.getTime()) {
      next.setDate(next.getDate() + step);
    }
  } else if (recurrence.frequency === 'monthly') {
    const preferredDay = targetDay;
    if (next.getTime() <= todayLocal.getTime()) {
      next = new Date(todayYear, todayMonth, 1);
    } else {
      next.setDate(1);
    }
    next.setMonth(next.getMonth() + interval);
    const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(preferredDay, maxDays));

    // Ensure strictly after today
    while (next.getTime() <= todayLocal.getTime()) {
      next.setDate(1);
      next.setMonth(next.getMonth() + interval);
      const mDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(preferredDay, mDays));
    }
  }

  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}${timeSuffix}`;
};

