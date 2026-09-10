'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, ExternalLink, Plus, Search, Sparkles, Trash2, Undo2 } from 'lucide-react';
import type { Task, User } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import { isUserAssignedToTask } from '@/lib/taskAssignees';
import {
  carryPlanForward, conflictingBlockIds, emptyDayPlan, exportDayCalendar, firstFreeSlot,
  hasOpenDependencies, localDayKey, minutesToTime, parseDayPlans, plannerStorageKey,
  rankPlannerTasks, shiftDay, timeToMinutes, validDayKey,
  type DayPlan, type DayPlans, type PlanBlock,
} from '@/lib/dayPlanner';

interface DayPlannerProps {
  tasks: Task[];
  members: User[];
  currentUser: User;
  workspaceId: string;
  onOpenTask: (taskId: string) => void;
}

const fieldClass = 'min-h-10 w-full rounded-xl border border-[var(--cu-border)] bg-[var(--cu-surface)] px-3 py-2 text-sm text-[var(--cu-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--cu-border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--cu-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40';

export default function DayPlanner(props: DayPlannerProps) {
  // A different owner/workspace must never render or save the previous scope's plan.
  const storageKey = plannerStorageKey(props.currentUser.id, props.workspaceId);
  return <PlannerWorkspace key={storageKey} {...props} storageKey={storageKey} />;
}

function PlannerWorkspace({ tasks, members, currentUser, onOpenTask, storageKey }: DayPlannerProps & { storageKey: string }) {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const label = (vietnamese: string, english: string) => vi ? vietnamese : english;
  const [date, setDate] = useState(() => localDayKey());
  const [plans, setPlans] = useState<DayPlans>({});
  const plansRef = useRef<DayPlans>({});
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<'load' | 'save' | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(true);
  const [undo, setUndo] = useState<{ date: string; block: PlanBlock } | null>(null);

  useEffect(() => {
    try {
      const saved = parseDayPlans(localStorage.getItem(storageKey));
      plansRef.current = saved;
      setPlans(saved);
      setReady(true);
    } catch { setStorageError('load'); }
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      try {
        const saved = parseDayPlans(event.newValue);
        plansRef.current = saved;
        setPlans(saved);
        setUndo(null);
        setReady(true);
        setStorageError(null);
      } catch { setStorageError('load'); setReady(false); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  function save(next: DayPlans) {
    plansRef.current = next;
    setPlans(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(null);
    } catch { setStorageError('save'); }
  }

  const plan = plans[date] || emptyDayPlan();
  const byId = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const ranked = useMemo(() => rankPlannerTasks(tasks, date), [tasks, date]);
  const candidates = ranked.filter(task => !plan.blocks.some(block => block.taskId === task.id)
    && (!mine || isUserAssignedToTask(task, currentUser, members))
    && task.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const sortedBlocks = [...plan.blocks].sort((a, b) => a.start - b.start);
  const conflicts = conflictingBlockIds(plan.blocks);
  const scheduledMinutes = plan.blocks.reduce((total, block) => total + block.duration, 0);
  const completed = plan.blocks.filter(block => byId.get(block.taskId)?.status === 'completed');
  const doneMinutes = completed.reduce((total, block) => total + block.duration, 0);
  const nextDate = shiftDay(date, 1);

  function updatePlan(update: (current: DayPlan) => DayPlan) {
    if (!ready) return;
    save({ ...plansRef.current, [date]: update(plansRef.current[date] || emptyDayPlan()) });
  }

  function changeDate(next: string) {
    if (validDayKey(next)) { setDate(next); setMessage(''); setUndo(null); }
  }

  function addTask(task: Task) {
    const current = plansRef.current[date] || emptyDayPlan();
    if (current.blocks.some(block => block.taskId === task.id)) return;
    const estimated = Number.isFinite(task.hoursEstimate) && task.hoursEstimate! > 0 ? task.hoursEstimate! * 60 : 30;
    const duration = Math.max(5, Math.min(480, Math.round(estimated)));
    const start = firstFreeSlot(current.blocks, duration);
    if (start === null) { setMessage(label('Không còn khung giờ đủ dài trong ngày.', 'No time slot is long enough for this task.')); return; }
    updatePlan(value => ({ ...value, blocks: [...value.blocks, { id: crypto.randomUUID(), taskId: task.id, start, duration }] }));
    setMessage(label('Đã thêm vào lịch. Bạn có thể chỉnh giờ và thời lượng.', 'Added to your plan. You can edit the start time and duration.'));
  }

  function suggestPlan() {
    const current = plansRef.current[date] || emptyDayPlan();
    const blocks = [...current.blocks];
    let remaining = current.capacity - blocks.reduce((sum, block) => sum + block.duration, 0);
    let count = 0;
    for (const task of candidates) {
      if (count === 3) break;
      if (hasOpenDependencies(task, tasks)) continue;
      const estimated = Number.isFinite(task.hoursEstimate) && task.hoursEstimate! > 0 ? task.hoursEstimate! * 60 : 30;
      const duration = Math.max(5, Math.min(480, Math.round(estimated)));
      if (duration > remaining) continue;
      const start = firstFreeSlot(blocks, duration);
      if (start === null) continue;
      blocks.push({ id: crypto.randomUUID(), taskId: task.id, start, duration });
      remaining -= duration;
      count++;
    }
    if (count) updatePlan(value => ({ ...value, blocks }));
    setMessage(count
      ? label(`Đã xếp ${count} việc ưu tiên vào giờ trống.`, `Scheduled ${count} priority tasks in free slots.`)
      : label('Chưa có việc phù hợp với thời gian còn lại. Thử đổi bộ lọc hoặc tăng thời gian dự kiến.', 'No tasks fit the remaining time. Try changing the filter or daily capacity.'));
  }

  function carryForward() {
    const source = plansRef.current[date] || emptyDayPlan();
    const target = plansRef.current[nextDate] || emptyDayPlan();
    const result = carryPlanForward(source, target, tasks);
    if (result.moved) save({ ...plansRef.current, [date]: result.source, [nextDate]: result.target });
    setUndo(null);
    setMessage(label(`Đã chuyển ${result.moved} việc sang ${nextDate}. Việc trùng lịch ngày đích hoặc không đủ chỗ vẫn ở ngày này.`,
      `Moved ${result.moved} tasks to ${nextDate}. Tasks already planned there or without enough room stay on this day.`));
  }

  function downloadCalendar() {
    const content = exportDayCalendar(date, plan.blocks, tasks);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `apexa-plan-${date}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(label('Đã xuất lịch. Nhập tệp .ics vào ứng dụng lịch của bạn.', 'Calendar exported. Import the .ics file into your calendar app.'));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 text-[var(--cu-text-primary)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">{label('Tập trung vào điều quan trọng', 'Make room for what matters')}</p>
          <h1 className="flex items-center gap-3 text-2xl font-bold"><CalendarDays className="text-indigo-500" />{label('Kế hoạch ngày', 'Daily planner')}</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--cu-text-muted)]">{label('Biến danh sách việc thành lịch làm việc vừa sức. Sắp xếp, tập trung và theo dõi tiến độ.', 'Turn your task list into a realistic schedule. Plan, focus, and track your progress.')}</p>
          <p className="mt-2 text-xs text-[var(--cu-text-muted)]">{label('Lưu trên trình duyệt này · riêng theo tài khoản và không gian làm việc · giờ địa phương', 'Saved in this browser · separate for each account and workspace · local time')}</p>
        </div>
        <button type="button" className={buttonClass} onClick={downloadCalendar} disabled={!ready || !plan.blocks.some(block => byId.has(block.taskId)) || conflicts.size > 0}><Download size={16} />{label('Xuất lịch .ics', 'Export .ics')}</button>
      </header>

      {storageError && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {storageError === 'load'
          ? label('Không đọc được kế hoạch đã lưu. Hãy kiểm tra quyền lưu trữ của trình duyệt rồi tải lại trang; dữ liệu cũ vẫn được giữ nguyên.', 'Your saved plan could not be read. Check browser storage permissions and reload; existing data has been preserved.')
          : label('Chưa lưu được thay đổi. Hãy giữ trang này mở và thử lưu lại.', 'Changes could not be saved. Keep this page open and try saving again.')}
        {storageError === 'save' && <button type="button" className={`${buttonClass} ml-3`} onClick={() => save(plansRef.current)}>{label('Thử lưu lại', 'Retry save')}</button>}
      </div>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClass} aria-label={label('Ngày trước', 'Previous day')} onClick={() => changeDate(shiftDay(date, -1))}><ChevronLeft size={16} /></button>
          <input type="date" aria-label={label('Ngày lập kế hoạch', 'Plan date')} value={date} onChange={event => changeDate(event.target.value)} className={`${fieldClass} !w-auto max-w-full`} />
          <button type="button" className={buttonClass} aria-label={label('Ngày tiếp theo', 'Next day')} onClick={() => changeDate(nextDate)}><ChevronRight size={16} /></button>
          <button type="button" className={buttonClass} onClick={() => changeDate(localDayKey())}>{label('Hôm nay', 'Today')}</button>
        </div>
        <label className="flex items-center gap-2 text-sm">{label('Thời gian dự kiến', 'Daily capacity')}
          <select className={`${fieldClass} !w-auto`} value={plan.capacity} disabled={!ready} onChange={event => updatePlan(value => ({ ...value, capacity: Number(event.target.value) }))}>
            {[120, 240, 360, 480, 600, ...(![120, 240, 360, 480, 600].includes(plan.capacity) ? [plan.capacity] : [])].map(minutes => <option key={minutes} value={minutes}>{minutes / 60} {label('giờ', 'hours')}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [label('Đã lên lịch', 'Scheduled'), `${plan.blocks.length} ${label('việc', 'tasks')}`, `${scheduledMinutes} / ${plan.capacity} ${label('phút', 'minutes')}`],
          [label('Đã hoàn thành', 'Completed'), `${completed.length} / ${plan.blocks.length}`, `${doneMinutes} ${label('phút theo kế hoạch', 'planned minutes')}`],
          [label('Thời gian còn lại', 'Available time'), `${Math.max(0, plan.capacity - scheduledMinutes)} ${label('phút', 'min')}`, label('Dành khoảng trống cho nghỉ ngơi và việc phát sinh', 'Leave room for breaks and unexpected work')],
        ].map(([title, value, hint]) => <div key={title} className="rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-5"><p className="text-sm text-[var(--cu-text-muted)]">{title}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-2 text-xs text-[var(--cu-text-muted)]">{hint}</p></div>)}
      </div>

      {(conflicts.size > 0 || scheduledMinutes > plan.capacity) && <div role="alert" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {conflicts.size > 0 && <p>{label(`${conflicts.size} khung giờ đang trùng nhau. Chỉnh giờ trước khi xuất lịch.`, `${conflicts.size} time blocks overlap. Adjust them before exporting.`)}</p>}
        {scheduledMinutes > plan.capacity && <p>{label(`Lịch vượt ${scheduledMinutes - plan.capacity} phút so với thời gian dự kiến. Hãy giảm thời lượng hoặc chuyển bớt việc.`, `Your plan exceeds daily capacity by ${scheduledMinutes - plan.capacity} minutes. Shorten or move some tasks.`)}</p>}
      </div>}
      <div role="status" aria-live="polite" className="text-sm text-indigo-600 dark:text-indigo-300">{message}</div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section className="min-w-0 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold"><Clock3 size={18} />{label('Lịch làm việc', 'Your schedule')}</h2>
            <button type="button" className={buttonClass} onClick={carryForward} disabled={!ready || !plan.blocks.some(block => byId.has(block.taskId) && byId.get(block.taskId)?.status !== 'completed')}><ArrowRight size={15} />{label('Chuyển việc chưa xong', 'Move unfinished tasks')}</button>
          </div>
          <p className="mb-4 text-xs text-[var(--cu-text-muted)]">{label('Chuyển việc sang ngày kế tiếp, giữ nguyên hạn chót. Tiến độ lấy từ trạng thái công việc.', 'Move tasks to the next day while keeping their deadlines. Progress follows task status.')}</p>
          {!ready ? <p className="py-10 text-center text-sm text-[var(--cu-text-muted)]">{label('Đang chờ kế hoạch được tải…', 'Waiting for your saved plan…')}</p>
            : !sortedBlocks.length ? <div className="rounded-xl border border-dashed border-[var(--cu-border)] px-6 py-12 text-center"><CalendarDays className="mx-auto mb-3 text-indigo-400" size={30} /><h3 className="font-semibold">{label('Một ngày mới, một kế hoạch rõ ràng', 'A fresh day, a clear plan')}</h3><p className="mt-2 text-sm text-[var(--cu-text-muted)]">{label('Chọn công việc ở danh sách bên cạnh hoặc dùng “Xếp 3 việc ưu tiên”.', 'Choose a task from the list or use “Schedule 3 priorities”.')}</p></div>
              : <div className="space-y-3">{sortedBlocks.map(block => <PlannerBlock key={`${date}:${block.id}:${block.start}:${block.duration}`} block={block} task={byId.get(block.taskId)} vi={vi} conflict={conflicts.has(block.id)} blocked={!!byId.get(block.taskId) && hasOpenDependencies(byId.get(block.taskId)!, tasks)} onOpenTask={onOpenTask}
                onChange={(start, duration) => updatePlan(value => ({ ...value, blocks: value.blocks.map(item => item.id === block.id ? { ...item, start, duration } : item) }))}
                onRemove={() => { setUndo({ date, block }); updatePlan(value => ({ ...value, blocks: value.blocks.filter(item => item.id !== block.id) })); setMessage(label('Đã bỏ khung giờ khỏi kế hoạch.', 'Time block removed from your plan.')); }} />)}</div>}
          {undo?.date === date && <button type="button" className={`${buttonClass} mt-3`} onClick={() => { updatePlan(value => value.blocks.some(block => block.taskId === undo.block.taskId) ? value : { ...value, blocks: [...value.blocks, undo.block] }); setUndo(null); setMessage(label('Đã khôi phục khung giờ.', 'Time block restored.')); }}><Undo2 size={15} />{label('Hoàn tác bỏ lịch', 'Undo removal')}</button>}
          <label className="mt-6 block text-sm font-semibold" htmlFor="planner-note">{label('Ghi chú & tổng kết ngày', 'Notes & daily review')}</label>
          <textarea id="planner-note" rows={4} maxLength={2000} disabled={!ready} className={`${fieldClass} mt-2 resize-y`} value={plan.note} onChange={event => updatePlan(value => ({ ...value, note: event.target.value }))} placeholder={label('Điều quan trọng nhất hôm nay là gì? Bạn đã học được gì?', 'What matters most today? What did you learn?')} />
          <p className="mt-1 text-right text-xs text-[var(--cu-text-muted)]">{plan.note.length}/2000</p>
        </section>

        <section className="min-w-0 rounded-2xl border border-[var(--cu-border)] bg-[var(--cu-surface)] p-4 sm:p-5">
          <h2 className="font-semibold">{label('Chọn việc để tập trung', 'Choose your focus')}</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--cu-text-muted)]">{label('Ưu tiên việc sẵn sàng làm, đến hạn và mức độ quan trọng. Gợi ý dùng thời gian ước tính, mặc định 30 phút.', 'Ready tasks, deadlines, then priority. Suggestions use task estimates, defaulting to 30 minutes.')}</p>
          <div className="relative mt-4"><Search className="absolute left-3 top-3 text-[var(--cu-text-muted)]" size={16} /><input type="search" aria-label={label('Tìm công việc để lên lịch', 'Search tasks to schedule')} className={`${fieldClass} pl-9`} placeholder={label('Tìm công việc…', 'Search tasks…')} value={search} onChange={event => setSearch(event.target.value)} /></div>
          <label className="my-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={event => setMine(event.target.checked)} className="h-4 w-4 accent-indigo-600" />{label('Chỉ công việc của tôi', 'Only my tasks')}</label>
          <button type="button" onClick={suggestPlan} disabled={!ready || !candidates.length} className={`${buttonClass} w-full border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700`}><Sparkles size={16} />{label('Xếp 3 việc ưu tiên', 'Schedule 3 priorities')}</button>
          <p className="my-3 text-xs text-[var(--cu-text-muted)]">{candidates.length} {label('việc chưa lên lịch', 'unscheduled tasks')}</p>
          <div className="max-h-[640px] space-y-3 overflow-y-auto">
            {!candidates.length && <p className="rounded-xl bg-[var(--cu-surface-2)] p-5 text-sm text-[var(--cu-text-muted)]">{label('Không có công việc phù hợp. Thử bỏ bộ lọc hoặc tạo công việc trong Không gian.', 'No matching tasks. Try clearing filters or create a task in Spaces.')}</p>}
            {candidates.slice(0, 50).map(task => <div key={task.id} className="rounded-xl border border-[var(--cu-border)] p-3">
              <button type="button" className="text-left text-sm font-medium hover:text-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => onOpenTask(task.id)}>{task.title}</button>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--cu-text-muted)]">
                <span>{({ urgent: label('Khẩn cấp', 'Urgent'), high: label('Cao', 'High'), medium: label('Trung bình', 'Medium'), low: label('Thấp', 'Low') })[task.priority]}</span>
                {task.dueDate && <span>· {label('Hạn', 'Due')}: {task.dueDate.slice(0, 10)}</span>}
                {hasOpenDependencies(task, tasks) && <span className="text-amber-600 dark:text-amber-400">{label('Đang chờ việc phụ thuộc', 'Waiting on dependencies')}</span>}
              </div>
              <button type="button" className={`${buttonClass} mt-3 w-full`} onClick={() => addTask(task)} disabled={!ready}><Plus size={14} />{label('Thêm vào lịch', 'Add to plan')}</button>
            </div>)}
            {candidates.length > 50 && <p className="text-xs text-[var(--cu-text-muted)]">{label('Đang hiển thị 50 việc đầu. Dùng tìm kiếm để thu hẹp danh sách.', 'Showing the first 50 tasks. Search to narrow the list.')}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function PlannerBlock({ block, task, vi, conflict, blocked, onOpenTask, onChange, onRemove }: {
  block: PlanBlock; task?: Task; vi: boolean; conflict: boolean; blocked: boolean;
  onOpenTask: (id: string) => void; onChange: (start: number, duration: number) => void; onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(minutesToTime(block.start));
  const [duration, setDuration] = useState(String(block.duration));
  const [error, setError] = useState('');
  const label = (v: string, e: string) => vi ? v : e;
  const done = task?.status === 'completed';
  return <article className={`rounded-xl border p-4 ${conflict ? 'border-amber-400 bg-amber-50/20' : 'border-[var(--cu-border)]'} ${done ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-semibold tabular-nums text-indigo-500">{minutesToTime(block.start)} – {minutesToTime(block.start + block.duration)} <span className="ml-2 text-[var(--cu-text-muted)]">{block.duration} {label('phút', 'min')}</span></p>
        {task ? <button type="button" className={`flex items-center gap-2 text-left text-sm font-semibold hover:text-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 ${done ? 'text-emerald-600' : ''}`} onClick={() => onOpenTask(task.id)}>{done && <CheckCircle2 size={16} className="shrink-0" />}<span className="break-words">{task.title}</span><ExternalLink size={13} className="shrink-0" /></button>
          : <p className="text-sm text-[var(--cu-text-muted)]">{label('Công việc không còn khả dụng', 'Task no longer available')}</p>}
        {done && <p className="mt-1 text-xs text-emerald-600">{label('Đã hoàn thành', 'Completed')}</p>}
        {blocked && !done && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{label('Cần xử lý công việc phụ thuộc trước', 'Resolve dependencies first')}</p>}
        {conflict && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{label('Trùng giờ với công việc khác', 'Overlaps another time block')}</p>}
      </div>
      <button type="button" className={buttonClass} onClick={onRemove} aria-label={`${label('Bỏ khỏi lịch', 'Remove from plan')}: ${task?.title || block.id}`}><Trash2 size={15} /></button>
    </div>
    {editing ? <form className="mt-3 space-y-3" onSubmit={event => {
      event.preventDefault();
      const start = timeToMinutes(time), minutes = Number(duration);
      if (start === null || !Number.isInteger(minutes) || minutes < 5 || minutes > 480 || start + minutes > 1440) {
        setError(label('Chọn 5–480 phút và giờ kết thúc không quá 24:00.', 'Use 5–480 minutes and finish no later than 24:00.')); return;
      }
      onChange(start, minutes); setEditing(false); setError('');
    }}>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs">{label('Giờ bắt đầu', 'Start time')}<input type="time" required className={fieldClass} value={time} onChange={event => setTime(event.target.value)} /></label>
        <label className="space-y-1 text-xs">{label('Thời lượng (phút)', 'Duration (min)')}<input type="number" required min={5} max={480} step={1} className={fieldClass} value={duration} onChange={event => setDuration(event.target.value)} /></label>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2"><button type="submit" className={buttonClass}>{label('Lưu giờ', 'Save time')}</button><button type="button" className={buttonClass} onClick={() => { setEditing(false); setTime(minutesToTime(block.start)); setDuration(String(block.duration)); setError(''); }}>{label('Hủy', 'Cancel')}</button></div>
    </form> : <button type="button" className="mt-3 rounded text-xs font-medium text-indigo-500 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => setEditing(true)}>{label('Chỉnh giờ & thời lượng', 'Edit time & duration')}</button>}
  </article>;
}
