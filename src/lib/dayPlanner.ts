import type { Task } from '@/types';

export interface PlanBlock {
  id: string;
  taskId: string;
  start: number;
  duration: number;
}

export interface DayPlan {
  blocks: PlanBlock[];
  note: string;
  capacity: number;
}

export type DayPlans = Record<string, DayPlan>;
export const emptyDayPlan = (): DayPlan => ({ blocks: [], note: '', capacity: 360 });
export const localDayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function validDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDayKey(date) === value;
}

export function shiftDay(value: string, offset: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDayKey(date);
}

export const plannerStorageKey = (owner: string, workspace: string) =>
  `apexa_day_planner:v1:${JSON.stringify([owner, workspace])}`;

export function parseDayPlans(raw: string | null): DayPlans {
  if (!raw) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid planner data');
  const plans: DayPlans = {};
  for (const [date, candidate] of Object.entries(value)) {
    if (!validDayKey(date) || !candidate || typeof candidate !== 'object') continue;
    const plan = candidate as Partial<DayPlan>;
    const ids = new Set<string>();
    const taskIds = new Set<string>();
    const blocks = (Array.isArray(plan.blocks) ? plan.blocks : []).filter((block): block is PlanBlock => {
      if (!block || typeof block.id !== 'string' || !block.id || typeof block.taskId !== 'string' || !block.taskId
        || !Number.isInteger(block.start) || block.start < 0
        || !Number.isInteger(block.duration) || block.duration < 5 || block.duration > 480
        || block.start + block.duration > 1440 || ids.has(block.id) || taskIds.has(block.taskId)) return false;
      ids.add(block.id);
      taskIds.add(block.taskId);
      return true;
    });
    plans[date] = {
      blocks,
      note: typeof plan.note === 'string' ? plan.note.slice(0, 2000) : '',
      capacity: Number.isInteger(plan.capacity) && plan.capacity! >= 30 && plan.capacity! <= 1440 ? plan.capacity! : 360,
    };
  }
  return plans;
}

export const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function timeToMinutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function conflictingBlockIds(blocks: PlanBlock[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.start < b.start + b.duration && b.start < a.start + a.duration) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

export function firstFreeSlot(blocks: PlanBlock[], duration: number, from = 9 * 60): number | null {
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) return null;
  let start = from;
  for (const block of [...blocks].sort((a, b) => a.start - b.start)) {
    if (start + duration <= block.start) break;
    if (start < block.start + block.duration) start = block.start + block.duration;
  }
  return start + duration <= 1440 ? start : null;
}

export function hasOpenDependencies(task: Task, allTasks: Task[]): boolean {
  const byId = new Map(allTasks.map(item => [item.id, item]));
  return (task.relationships?.blockedBy || []).some(id => byId.get(id)?.status !== 'completed');
}

export function rankPlannerTasks(tasks: Task[], date: string): Task[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const blocked = new Map(tasks.map(task => [task.id,
    (task.relationships?.blockedBy || []).some(id => byId.get(id)?.status !== 'completed')]));
  const dayEnd = new Date(`${date}T23:59:59.999`).getTime();
  const dueTime = (task: Task) => {
    if (!task.dueDate) return Infinity;
    const parsed = new Date(task.dueDate.length === 10 ? `${task.dueDate}T23:59:59.999` : task.dueDate).getTime();
    return Number.isNaN(parsed) ? Infinity : parsed;
  };
  const priority = { urgent: 4, high: 3, medium: 2, low: 1 };
  return tasks.filter(task => task.status !== 'completed').sort((a, b) =>
    Number(blocked.get(a.id)) - Number(blocked.get(b.id))
    || Number(dueTime(b) <= dayEnd) - Number(dueTime(a) <= dayEnd)
    || priority[b.priority] - priority[a.priority]
    || dueTime(a) - dueTime(b)
    || a.title.localeCompare(b.title));
}

/** Move only available, unfinished work. Existing destination entries remain untouched. */
export function carryPlanForward(source: DayPlan, target: DayPlan, tasks: Task[]) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const blocks = [...target.blocks];
  const moved = new Set<string>();
  for (const block of [...source.blocks].sort((a, b) => a.start - b.start)) {
    const task = byId.get(block.taskId);
    if (!task || task.status === 'completed' || blocks.some(item => item.taskId === block.taskId)) continue;
    const start = firstFreeSlot(blocks, block.duration);
    if (start === null) continue;
    blocks.push({ ...block, start });
    moved.add(block.id);
  }
  return {
    source: { ...source, blocks: source.blocks.filter(block => !moved.has(block.id)) },
    target: { ...target, blocks },
    moved: moved.size,
  };
}

const escapeCalendarText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// RFC 5545 lines are folded at 75 UTF-8 octets, including continuation whitespace.
function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder();
  let result = '', length = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (length + size > 75) { result += '\r\n '; length = 1; }
    result += char;
    length += size;
  }
  return result;
}

export function exportDayCalendar(date: string, blocks: PlanBlock[], tasks: Task[], now = new Date()): string {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apexa//Day Planner//EN', 'CALSCALE:GREGORIAN'];
  for (const block of [...blocks].sort((a, b) => a.start - b.start)) {
    const task = byId.get(block.taskId);
    if (!task) continue;
    const start = new Date(`${date}T00:00:00`);
    start.setMinutes(block.start);
    const end = new Date(`${date}T00:00:00`);
    end.setMinutes(block.start + block.duration);
    lines.push('BEGIN:VEVENT', `UID:${encodeURIComponent(block.id)}-${date}@apexa`, `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`, `SUMMARY:${escapeCalendarText(task.title)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
