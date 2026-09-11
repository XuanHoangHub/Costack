import type { Space, Task } from '@/types';

type TaskLocation = Pick<Task, 'workspaceId' | 'spaceId' | 'listId'>;

/** An explicitly empty list means space-level work, not the current list. */
export function resolveTaskLocation(
  requested: TaskLocation,
  spaces: Space[],
  context: TaskLocation,
): TaskLocation {
  const workspaceId = requested.workspaceId || context.workspaceId;
  const candidates = spaces.filter(space => space.workspaceId === workspaceId);
  const space = candidates.find(space => space.id === requested.spaceId)
    || candidates.find(space => space.id === context.spaceId)
    || candidates[0];
  const hasExplicitList = Object.prototype.hasOwnProperty.call(requested, 'listId');
  const listId = hasExplicitList ? requested.listId : context.listId;
  const list = space?.lists.find(list => list.id === listId);
  return {
    workspaceId,
    spaceId: space?.id,
    listId: list?.id || (hasExplicitList ? undefined : space?.lists.find(list => !list.isArchived)?.id),
  };
}

/** Keep completion metadata consistent across forms, boards and bulk actions. */
export function normalizeTaskCompletion(task: Task, previous?: Task, now = new Date().toISOString()): Task {
  if (task.status === 'completed') {
    return { ...task, progress: 100, completedAt: task.completedAt || now };
  }
  const reopening = previous?.status === 'completed';
  const progress = reopening && task.progress === 100
    ? (task.subtasks.length ? Math.round(task.subtasks.filter(subtask => subtask.completed).length / task.subtasks.length * 100) : 0)
    : task.progress;
  return { ...task, progress: Math.max(0, Math.min(100, progress || 0)), completedAt: undefined };
}

/** Restore only fields changed by the bulk action, preserving subsequent edits. */
export function restoreBulkTaskFields(current: Task, previous: Task, fields: (keyof Task)[]): Task {
  const restored = { ...current };
  for (const field of fields) Object.assign(restored, { [field]: previous[field] });
  return restored;
}
