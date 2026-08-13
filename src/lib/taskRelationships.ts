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

export const getNextRecurringDate = (dateValue: string | undefined, recurrence: NonNullable<Task['recurrence']>) => {
  const base = dateValue ? new Date(dateValue) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const next = new Date(safeBase);
  const interval = Math.max(1, recurrence.interval || 1);
  if (recurrence.frequency === 'daily') next.setUTCDate(next.getUTCDate() + interval);
  if (recurrence.frequency === 'weekly') next.setUTCDate(next.getUTCDate() + (7 * interval));
  if (recurrence.frequency === 'monthly') {
    const preferredDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + interval);
    const daysInTargetMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(preferredDay, daysInTargetMonth));
  }
  return next.toISOString().slice(0, 10);
};
