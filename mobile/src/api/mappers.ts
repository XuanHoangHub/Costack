import { DocumentItem, Priority, Task, TaskStatus } from '../types';

/** Keeps mobile's view model aligned with the columns written by the web app. */
export const mapTaskRow = (row: any): Task => ({
  id: row.id,
  title: row.title || 'Không tên',
  description: row.description || '',
  priority: (row.priority || 'medium') as Priority,
  status: (row.status || 'todo') as TaskStatus,
  dueDate: row.dueDate ?? row.due_date ?? undefined,
  startDate: row.startDate ?? row.start_date ?? undefined,
  assigneeId: row.assigneeId ?? row.assignee_id ?? undefined,
  assigneeIds: row.assigneeIds ?? row.assignee_ids ?? (row.assigneeId ? [row.assigneeId] : []),
  subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
  progress: Number(row.progress) || 0,
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  completedAt: row.completedAt ?? row.completed_at ?? undefined,
  deletedAt: row.deleted_at ?? undefined,
  hoursEstimate: row.hours_estimate ?? row.hoursEstimate ?? undefined,
  hoursLogged: row.hours_logged ?? row.hoursLogged ?? undefined,
  commentsCount: row.commentsCount ?? row.comments_count ?? (Array.isArray(row.comments) ? row.comments.length : 0),
  comments: Array.isArray(row.comments) ? row.comments : [],
  tags: Array.isArray(row.tags) ? row.tags : [],
  isPinned: Boolean(row.isPinned ?? row.is_pinned),
  workspaceId: row.workspace_id ?? row.workspaceId,
  spaceId: row.space_id ?? row.spaceId,
  listId: row.list_id ?? row.listId,
});

const plainText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!content || typeof content !== 'object') return '';
  const walk = (node: any): string => [node.text, ...(Array.isArray(node.content) ? node.content.map(walk) : [])]
    .filter(Boolean)
    .join(' ');
  return walk(content).replace(/\s+/g, ' ').trim();
};

export const toDocumentContent = (text: string) => ({
  type: 'doc',
  content: text.trim()
    ? [{ type: 'paragraph', content: [{ type: 'text', text: text.trim() }] }]
    : [],
});

export const mapDocumentRow = (row: any): DocumentItem => ({
  id: row.id,
  title: row.title || 'Untitled',
  content: plainText(row.content),
  category: row.category || 'General',
  emoji: row.icon || row.emoji || '📄',
  updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? new Date().toISOString(),
  updatedBy: row.updated_by ?? row.updatedBy,
  workspaceId: row.workspace_id ?? row.workspaceId,
  spaceId: row.space_id ?? row.spaceId,
  isFavorite: Boolean(row.is_favorite ?? row.isFavorite),
});
