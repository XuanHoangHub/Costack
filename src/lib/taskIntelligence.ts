import type { Task } from '@/types';

export type TaskIntelligence = {
  generatedAt: string;
  counts: {
    total: number;
    open: number;
    completed: number;
    overdue: number;
    dueToday: number;
    dueTomorrow: number;
    urgent: number;
    blocked: number;
    unassigned: number;
  };
  overdue: Task[];
  dueToday: Task[];
  dueTomorrow: Task[];
  urgent: Task[];
  blocked: Task[];
  focusTasks: Task[];
};

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseTaskDueDate = (value?: string) => {
  if (!value) return null;
  const dateOnly = value.match(dateOnlyPattern);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59, 999)
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfLocalDay = (date: Date) => {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() + 1);
  result.setMilliseconds(-1);
  return result;
};

const priorityScore = (task: Task) => (task.priority ? ({ urgent: 4, high: 3, medium: 2, low: 1 }[task.priority] || 0) : 0);

const sortByAttention = (left: Task, right: Task) => {
  const leftDue = parseTaskDueDate(left.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightDue = parseTaskDueDate(right.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return leftDue - rightDue || priorityScore(right) - priorityScore(left) || left.title.localeCompare(right.title);
};

export function analyzeTasks(tasks: Task[], now = new Date()): TaskIntelligence {
  const openTasks = tasks.filter(task => task.status !== 'completed');
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = endOfLocalDay(tomorrowStart);

  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const dueTomorrow: Task[] = [];

  openTasks.forEach(task => {
    const due = parseTaskDueDate(task.dueDate);
    if (!due) return;
    if (due < todayStart) overdue.push(task);
    else if (due <= todayEnd) dueToday.push(task);
    else if (due >= tomorrowStart && due <= tomorrowEnd) dueTomorrow.push(task);
  });

  const urgent = openTasks.filter(task => task.priority === 'urgent' || task.priority === 'high');
  const blocked = openTasks.filter(task => (task.relationships?.blockedBy?.length || 0) > 0);
  const unassigned = openTasks.filter(task => !task.assigneeId && !(task.assigneeIds?.length));
  const focusTasks = Array.from(new Map(
    [...overdue, ...dueToday, ...urgent, ...dueTomorrow].sort(sortByAttention).map(task => [task.id, task])
  ).values()).slice(0, 8);

  return {
    generatedAt: now.toISOString(),
    counts: {
      total: tasks.length,
      open: openTasks.length,
      completed: tasks.length - openTasks.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueTomorrow: dueTomorrow.length,
      urgent: urgent.length,
      blocked: blocked.length,
      unassigned: unassigned.length,
    },
    overdue: overdue.sort(sortByAttention),
    dueToday: dueToday.sort(sortByAttention),
    dueTomorrow: dueTomorrow.sort(sortByAttention),
    urgent: urgent.sort(sortByAttention),
    blocked: blocked.sort(sortByAttention),
    focusTasks,
  };
}

export function createLocalBriefing(intelligence: TaskIntelligence, locale: 'vi' | 'en' = 'vi') {
  const { counts, focusTasks } = intelligence;
  const focus = focusTasks.slice(0, 3).map(task => `“${task.title}”`).join(', ');
  if (locale === 'en') {
    return {
      headline: counts.overdue > 0 ? 'Daily AI briefing: action required' : 'Your daily AI task briefing',
      summary: `${counts.overdue} overdue, ${counts.dueToday} due today, ${counts.dueTomorrow} due tomorrow, and ${counts.urgent} high-priority tasks.${focus ? ` Focus first on ${focus}.` : ''}`,
    };
  }
  return {
    headline: counts.overdue > 0 ? 'Bản tin AI hôm nay: cần xử lý' : 'Bản tin công việc AI hôm nay',
    summary: `${counts.overdue} việc quá hạn, ${counts.dueToday} việc đến hạn hôm nay, ${counts.dueTomorrow} việc đến hạn ngày mai và ${counts.urgent} việc ưu tiên cao.${focus ? ` Nên tập trung trước vào ${focus}.` : ''}`,
  };
}

export function serializeTaskIntelligence(intelligence: TaskIntelligence) {
  const compactTask = (task: Task) => ({
    id: task.id,
    title: task.title.slice(0, 200),
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    progress: task.progress,
    assigneeId: task.assigneeId,
    assigneeIds: task.assigneeIds,
    blockedBy: task.relationships?.blockedBy || [],
  });
  return {
    generatedAt: intelligence.generatedAt,
    counts: intelligence.counts,
    overdue: intelligence.overdue.slice(0, 20).map(compactTask),
    dueToday: intelligence.dueToday.slice(0, 20).map(compactTask),
    dueTomorrow: intelligence.dueTomorrow.slice(0, 20).map(compactTask),
    urgent: intelligence.urgent.slice(0, 20).map(compactTask),
    blocked: intelligence.blocked.slice(0, 20).map(compactTask),
    focusTasks: intelligence.focusTasks.map(compactTask),
  };
}
