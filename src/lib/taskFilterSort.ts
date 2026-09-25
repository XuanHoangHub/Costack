import type { Priority, Task, TaskStatus, User } from '@/types';
import type { CustomFieldDefinition } from '@/types';
import { matchesCustomFieldFilter, compareCustomFieldValues } from './customFields';
import { matchesSpaceFocus, type SpaceFocus, taskDueTime } from './spaceInsights';

export type TaskSortField =
  | 'manual'
  | 'priority'
  | 'dueDate'
  | 'startDate'
  | 'createdAt'
  | 'title'
  | 'status'
  | 'assignee'
  | string;

export type TaskSortDirection = 'asc' | 'desc';

export interface TaskSortConfig {
  field: TaskSortField;
  direction: TaskSortDirection;
  secondaryField?: TaskSortField;
  secondaryDirection?: TaskSortDirection;
}

export type TaskDatePreset =
  | 'all'
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'this_week'
  | 'next_week'
  | 'no_date'
  | 'has_date'
  | 'custom';

export interface TaskQuickFilterState {
  statuses: TaskStatus[];
  priorities: Priority[];
  assigneeIds: string[]; // Supports 'mine', 'unassigned', or user IDs
  datePreset: TaskDatePreset;
  customStartDate?: string;
  customEndDate?: string;
  tags: string[];
}

export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'before'
  | 'after'
  | 'in'
  | 'notIn';

export interface TaskAdvancedCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
}

export type TaskFilterConjunction = 'AND' | 'OR';

export interface TaskFilterPreset {
  id: string;
  name: string;
  icon?: string;
  quick: Partial<TaskQuickFilterState>;
  conditions?: TaskAdvancedCondition[];
  conjunction?: TaskFilterConjunction;
  isBuiltIn?: boolean;
}

export interface TaskFilterState {
  query: string;
  quick: TaskQuickFilterState;
  conditions: TaskAdvancedCondition[];
  conjunction: TaskFilterConjunction;
  spaceFocus: SpaceFocus;
  showClosedTasks: boolean;
}

export interface FilterChip {
  id: string;
  type: 'query' | 'status' | 'priority' | 'assignee' | 'date' | 'tag' | 'condition' | 'focus';
  label: string;
  valueDescription: string;
  onRemove: () => void;
}

export function defaultQuickFilterState(): TaskQuickFilterState {
  return {
    statuses: [],
    priorities: [],
    assigneeIds: [],
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    tags: [],
  };
}

export function defaultFilterState(): TaskFilterState {
  return {
    query: '',
    quick: defaultQuickFilterState(),
    conditions: [],
    conjunction: 'AND',
    spaceFocus: 'all',
    showClosedTasks: true,
  };
}

export function defaultSortConfig(): TaskSortConfig {
  return {
    field: 'manual',
    direction: 'asc',
  };
}

export const BUILT_IN_FILTER_PRESETS: TaskFilterPreset[] = [
  {
    id: 'preset-urgent-overdue',
    name: 'Khẩn cấp & Quá hạn',
    icon: '🔥',
    quick: {
      priorities: ['urgent', 'high'],
      datePreset: 'overdue',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-due-this-week',
    name: 'Đến hạn tuần này',
    icon: '📅',
    quick: {
      datePreset: 'this_week',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-mine-active',
    name: 'Của tôi đang làm',
    icon: '👤',
    quick: {
      assigneeIds: ['mine'],
      statuses: ['todo', 'inprogress'],
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-in-review',
    name: 'Đang chờ duyệt',
    icon: '👀',
    quick: {
      statuses: ['review'],
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-unassigned',
    name: 'Chưa phân công',
    icon: '❓',
    quick: {
      assigneeIds: ['unassigned'],
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-completed',
    name: 'Đã hoàn thành',
    icon: '✅',
    quick: {
      statuses: ['completed'],
    },
    isBuiltIn: true,
  },
];

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 1,
  inprogress: 2,
  review: 3,
  completed: 4,
};

export const STATUS_META: Record<TaskStatus, { labelVi: string; labelEn: string; color: string; bg: string }> = {
  todo: { labelVi: 'Cần làm', labelEn: 'To Do', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  inprogress: { labelVi: 'Đang làm', labelEn: 'In Progress', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  review: { labelVi: 'Chờ duyệt', labelEn: 'In Review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  completed: { labelVi: 'Hoàn thành', labelEn: 'Done', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
};

export const PRIORITY_META: Record<Priority, { labelVi: string; labelEn: string; color: string; bg: string }> = {
  urgent: { labelVi: 'Khẩn cấp', labelEn: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  high: { labelVi: 'Cao', labelEn: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
  medium: { labelVi: 'Trung bình', labelEn: 'Medium', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' },
  low: { labelVi: 'Thấp', labelEn: 'Low', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
};

/**
 * Checks if a task matches the specified date preset.
 */
export function matchesDatePreset(
  dueDateStr: string | undefined,
  preset: TaskDatePreset,
  customStart?: string,
  customEnd?: string,
  now = new Date()
): boolean {
  if (preset === 'all') return true;
  if (preset === 'no_date') return !dueDateStr;
  if (preset === 'has_date') return Boolean(dueDateStr);
  if (!dueDateStr) return false;

  const due = taskDueTime(dueDateStr);
  if (!Number.isFinite(due)) return false;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const startOfDayAfterTomorrow = startOfToday + 2 * 86400000;

  if (preset === 'overdue') {
    return due < startOfToday;
  }
  if (preset === 'today') {
    return due >= startOfToday && due < startOfTomorrow;
  }
  if (preset === 'tomorrow') {
    return due >= startOfTomorrow && due < startOfDayAfterTomorrow;
  }
  if (preset === 'this_week') {
    // Current calendar week (Monday to Sunday) or next 7 days
    const currentDay = now.getDay(); // 0 is Sunday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday).getTime();
    const endOfWeek = startOfWeek + 7 * 86400000;
    return due >= startOfWeek && due < endOfWeek;
  }
  if (preset === 'next_week') {
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfNextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday + 7).getTime();
    const endOfNextWeek = startOfNextWeek + 7 * 86400000;
    return due >= startOfNextWeek && due < endOfNextWeek;
  }
  if (preset === 'custom') {
    const s = customStart ? taskDueTime(customStart) : Number.NEGATIVE_INFINITY;
    const e = customEnd ? taskDueTime(customEnd) + 86399999 : Number.POSITIVE_INFINITY;
    return due >= s && due <= e;
  }

  return true;
}

/**
 * Evaluates whether a task satisfies an advanced condition.
 */
export function evaluateAdvancedCondition(
  task: Task,
  condition: TaskAdvancedCondition,
  members: User[] = [],
  customFields: CustomFieldDefinition[] = []
): boolean {
  const { field, operator, value } = condition;
  if (!field) return true;

  // Custom field check
  if (field.startsWith('custom:')) {
    const cfName = field.slice(7);
    const val = task.custom_fields?.[cfName];
    return matchesCustomFieldFilter(val, operator, String(value ?? ''));
  }

  // Standard field check
  let targetVal: string = '';
  if (field === 'title') targetVal = task.title || '';
  else if (field === 'description') targetVal = task.description || '';
  else if (field === 'status') targetVal = task.status || '';
  else if (field === 'priority') targetVal = task.priority || '';
  else if (field === 'assignee') {
    const assigneeName = members.find((m) => m.id === task.assigneeId)?.name || '';
    targetVal = task.assigneeId || '';
    if (operator === 'contains') {
      return (
        targetVal.toLowerCase().includes(String(value || '').toLowerCase()) ||
        assigneeName.toLowerCase().includes(String(value || '').toLowerCase())
      );
    }
  } else if (field === 'dueDate') targetVal = task.dueDate || '';
  else if (field === 'startDate') targetVal = task.startDate || '';
  else if (field === 'createdAt') targetVal = task.createdAt || '';
  else if (field === 'tags') {
    const tagsList = task.tags || [];
    if (operator === 'isEmpty') return tagsList.length === 0;
    if (operator === 'isNotEmpty') return tagsList.length > 0;
    const q = String(value || '').toLowerCase();
    if (operator === 'contains' || operator === 'is') {
      return tagsList.some((t) => t.toLowerCase().includes(q));
    }
    if (operator === 'notContains' || operator === 'isNot') {
      return !tagsList.some((t) => t.toLowerCase().includes(q));
    }
    return true;
  }

  const queryStr = String(value ?? '').toLowerCase().trim();
  const targetLower = targetVal.toLowerCase().trim();

  switch (operator) {
    case 'is':
      return targetLower === queryStr;
    case 'isNot':
      return targetLower !== queryStr;
    case 'contains':
      return targetLower.includes(queryStr);
    case 'notContains':
      return !targetLower.includes(queryStr);
    case 'isEmpty':
      return !targetVal || targetVal.trim() === '';
    case 'isNotEmpty':
      return Boolean(targetVal && targetVal.trim() !== '');
    case 'before': {
      if (!targetVal || !value) return false;
      return taskDueTime(targetVal) < taskDueTime(value);
    }
    case 'after': {
      if (!targetVal || !value) return false;
      return taskDueTime(targetVal) > taskDueTime(value);
    }
    case 'gt': {
      const numTarget = Number(targetVal);
      const numQuery = Number(value);
      return Number.isFinite(numTarget) && Number.isFinite(numQuery) && numTarget > numQuery;
    }
    case 'lt': {
      const numTarget = Number(targetVal);
      const numQuery = Number(value);
      return Number.isFinite(numTarget) && Number.isFinite(numQuery) && numTarget < numQuery;
    }
    case 'gte': {
      const numTarget = Number(targetVal);
      const numQuery = Number(value);
      return Number.isFinite(numTarget) && Number.isFinite(numQuery) && numTarget >= numQuery;
    }
    case 'lte': {
      const numTarget = Number(targetVal);
      const numQuery = Number(value);
      return Number.isFinite(numTarget) && Number.isFinite(numQuery) && numTarget <= numQuery;
    }
    case 'in': {
      const arr = Array.isArray(value) ? value : queryStr.split(',').map((s) => s.trim());
      return arr.includes(targetVal);
    }
    case 'notIn': {
      const arr = Array.isArray(value) ? value : queryStr.split(',').map((s) => s.trim());
      return !arr.includes(targetVal);
    }
    default:
      return true;
  }
}

/**
 * Counts total active filter rules across all dimensions.
 */
export function countActiveFilters(state: TaskFilterState): number {
  let count = 0;
  if (state.query && state.query.trim()) count += 1;
  if (state.quick.statuses.length > 0) count += state.quick.statuses.length;
  if (state.quick.priorities.length > 0) count += state.quick.priorities.length;
  if (state.quick.assigneeIds.length > 0) count += state.quick.assigneeIds.length;
  if (state.quick.datePreset !== 'all') count += 1;
  if (state.quick.tags.length > 0) count += state.quick.tags.length;
  if (state.conditions.length > 0) count += state.conditions.length;
  if (state.spaceFocus !== 'all') count += 1;
  if (!state.showClosedTasks) count += 1;
  return count;
}

/**
 * Single-pass high performance filter and sort function for task collections.
 */
export function filterAndSortTasks(
  tasks: Task[],
  filterState: TaskFilterState,
  sortConfig: TaskSortConfig,
  context: {
    members?: User[];
    customFields?: CustomFieldDefinition[];
    currentUserId?: string;
    taskOrder?: string[];
  } = {}
): Task[] {
  const { members = [], customFields = [], currentUserId, taskOrder = [] } = context;
  const { query, quick, conditions, conjunction, spaceFocus, showClosedTasks } = filterState;

  // 1. Prepare search tokens for multi-term query
  const trimmedQuery = query.trim().toLowerCase();
  const searchTokens = trimmedQuery ? trimmedQuery.split(/\s+/).filter(Boolean) : [];

  // Member names lookup map for speed
  const memberNameMap = new Map<string, string>();
  for (const m of members) {
    memberNameMap.set(m.id, (m.name || m.email || '').toLowerCase());
  }

  // 2. Filter tasks
  const filtered = tasks.filter((task) => {
    // Focus filter
    if (spaceFocus && spaceFocus !== 'all') {
      if (!matchesSpaceFocus(task, spaceFocus, currentUserId)) return false;
    }

    // Closed tasks toggle
    if (!showClosedTasks && task.status === 'completed') {
      return false;
    }

    // Quick status filter (OR within selected statuses)
    if (quick.statuses.length > 0 && !quick.statuses.includes(task.status)) {
      return false;
    }

    // Quick priority filter (OR within selected priorities)
    if (quick.priorities.length > 0) {
      if (!task.priority || !quick.priorities.includes(task.priority)) {
        return false;
      }
    }

    // Quick assignee filter
    if (quick.assigneeIds.length > 0) {
      const taskAssignees = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
      const matchesAssignee = quick.assigneeIds.some((targetId) => {
        if (targetId === 'unassigned') {
          return taskAssignees.length === 0;
        }
        if (targetId === 'mine') {
          return currentUserId ? taskAssignees.includes(currentUserId) : false;
        }
        return taskAssignees.includes(targetId);
      });
      if (!matchesAssignee) return false;
    }

    // Quick date preset filter
    if (quick.datePreset !== 'all') {
      if (!matchesDatePreset(task.dueDate, quick.datePreset, quick.customStartDate, quick.customEndDate)) {
        return false;
      }
    }

    // Quick tags filter (AND or OR: user expects tasks having any of the selected tags)
    if (quick.tags.length > 0) {
      const taskTags = task.tags || [];
      const hasAnyTag = quick.tags.some((t) => taskTags.includes(t));
      if (!hasAnyTag) return false;
    }

    // Search query filter (Every token must be present in haystack)
    if (searchTokens.length > 0) {
      const assigneeNames = (task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [])
        .map((id) => memberNameMap.get(id) || '')
        .join(' ');
      const cfValues = customFields
        .map((f) => String(task.custom_fields?.[f.name] ?? ''))
        .filter(Boolean)
        .join(' ');
      const haystack = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')} ${assigneeNames} ${cfValues}`.toLowerCase();

      const allTokensMatch = searchTokens.every((token) => haystack.includes(token));
      if (!allTokensMatch) return false;
    }

    // Advanced conditions
    if (conditions.length > 0) {
      const results = conditions.map((cond) => evaluateAdvancedCondition(task, cond, members, customFields));
      if (conjunction === 'AND') {
        if (!results.every(Boolean)) return false;
      } else {
        if (!results.some(Boolean)) return false;
      }
    }

    return true;
  });

  // 3. Sort tasks
  const { field, direction, secondaryField, secondaryDirection } = sortConfig;
  if (field === 'manual') {
    const orderMap = new Map(taskOrder.map((id, idx) => [id, idx]));
    return [...filtered].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : typeof a.position === 'number' ? a.position : 99999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : typeof b.position === 'number' ? b.position : 99999;
      return idxA - idxB;
    });
  }

  const compareTasksByField = (a: Task, b: Task, sortField: TaskSortField, dir: TaskSortDirection): number => {
    let diff = 0;

    if (sortField === 'priority') {
      const aW = a.priority ? PRIORITY_ORDER[a.priority] || 0 : 0;
      const bW = b.priority ? PRIORITY_ORDER[b.priority] || 0 : 0;
      // Default natural order: Urgent (4) -> Low (1).
      // When dir is 'desc', high priorities come first!
      diff = bW - aW;
      if (dir === 'asc') diff = -diff;
    } else if (sortField === 'dueDate') {
      const dueA = taskDueTime(a.dueDate);
      const dueB = taskDueTime(b.dueDate);
      if (!Number.isFinite(dueA) && !Number.isFinite(dueB)) diff = 0;
      else if (!Number.isFinite(dueA)) diff = 1; // Put tasks without due date at bottom
      else if (!Number.isFinite(dueB)) diff = -1;
      else {
        diff = dueA - dueB;
        if (dir === 'desc') diff = -diff;
      }
    } else if (sortField === 'startDate') {
      const startA = taskDueTime(a.startDate);
      const startB = taskDueTime(b.startDate);
      if (!Number.isFinite(startA) && !Number.isFinite(startB)) diff = 0;
      else if (!Number.isFinite(startA)) diff = 1;
      else if (!Number.isFinite(startB)) diff = -1;
      else {
        diff = startA - startB;
        if (dir === 'desc') diff = -diff;
      }
    } else if (sortField === 'createdAt') {
      const tA = taskDueTime(a.createdAt);
      const tB = taskDueTime(b.createdAt);
      // Default natural creation order: newest first (tB - tA) when desc
      diff = tB - tA;
      if (dir === 'asc') diff = -diff;
    } else if (sortField === 'title') {
      diff = (a.title || '').localeCompare(b.title || '', 'vi', { sensitivity: 'base', numeric: true });
      if (dir === 'desc') diff = -diff;
    } else if (sortField === 'status') {
      const sA = STATUS_ORDER[a.status] || 0;
      const sB = STATUS_ORDER[b.status] || 0;
      diff = sA - sB;
      if (dir === 'desc') diff = -diff;
    } else if (sortField === 'assignee') {
      const nameA = memberNameMap.get(a.assigneeId || '') || '';
      const nameB = memberNameMap.get(b.assigneeId || '') || '';
      if (!nameA && !nameB) diff = 0;
      else if (!nameA) diff = 1;
      else if (!nameB) diff = -1;
      else {
        diff = nameA.localeCompare(nameB, 'vi');
        if (dir === 'desc') diff = -diff;
      }
    } else if (sortField.startsWith('custom:')) {
      const cfName = sortField.slice(7);
      const cfDef = customFields.find((f) => f.name === cfName);
      if (cfDef) {
        diff = compareCustomFieldValues(cfDef, a.custom_fields?.[cfName], b.custom_fields?.[cfName]);
        if (dir === 'desc') diff = -diff;
      }
    }

    return diff;
  };

  return [...filtered].sort((a, b) => {
    const primaryDiff = compareTasksByField(a, b, field, direction);
    if (primaryDiff !== 0) return primaryDiff;

    if (secondaryField && secondaryField !== field) {
      return compareTasksByField(a, b, secondaryField, secondaryDirection || 'asc');
    }

    // Default tie breaker: due date then creation date
    const tieDiff = taskDueTime(a.dueDate) - taskDueTime(b.dueDate);
    if (Number.isFinite(tieDiff) && tieDiff !== 0) return tieDiff;
    return taskDueTime(b.createdAt) - taskDueTime(a.createdAt);
  });
}
