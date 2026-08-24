import { Task } from '@/types';

export const getTaskAssigneeIds = (task: Partial<Task> | any): string[] => {
  if (!task) return [];
  const fromCustom = task?.custom_fields?.assigneeIds;
  if (Array.isArray(fromCustom)) return fromCustom.filter(Boolean);
  if (Array.isArray(task?.assigneeIds)) return task.assigneeIds.filter(Boolean);
  if (Array.isArray(task?.assignee_ids)) return task.assignee_ids.filter(Boolean);
  return task?.assigneeId ? [task.assigneeId] : [];
};

export const isUserAssignedToTask = (
  task: Partial<Task> | any,
  user?: { id?: string; email?: string } | null,
  members: Array<{ id: string; email?: string }> = []
): boolean => {
  if (!task || !user) return false;
  const currentUserId = user.id;
  const currentUserEmail = user.email?.toLowerCase().trim();
  const currentMember = members.find(
    (m) =>
      (currentUserId && m.id === currentUserId) ||
      (currentUserEmail && m.email?.toLowerCase().trim() === currentUserEmail)
  );
  const memberId = currentMember?.id;

  const assigneeIds = getTaskAssigneeIds(task);
  const directAssigneeId = task.assigneeId;

  if (currentUserId && (directAssigneeId === currentUserId || assigneeIds.includes(currentUserId))) {
    return true;
  }
  if (memberId && (directAssigneeId === memberId || assigneeIds.includes(memberId))) {
    return true;
  }
  return false;
};
