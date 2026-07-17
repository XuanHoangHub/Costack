"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { ChevronLeft, ChevronRight, Calendar, Check, Pin } from 'lucide-react';
import { Task, TaskStatus, User } from '../../types';
import SignedImage from '../SignedImage';

const STATUS_COLORS: Record<TaskStatus, { bar: string; barBg: string; text: string; dot: string }> = {
  todo: { bar: 'bg-gradient-to-r from-slate-400 to-slate-500', barBg: 'bg-slate-100/50 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  inprogress: { bar: 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm shadow-amber-500/20', barBg: 'bg-amber-50/50 dark:bg-amber-955/20', text: 'text-amber-700 dark:text-amber-450', dot: 'bg-amber-500' },
  review: { bar: 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm shadow-cyan-500/20', barBg: 'bg-cyan-50/50 dark:bg-cyan-955/20', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  completed: { bar: 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm shadow-emerald-500/20', barBg: 'bg-emerald-50/50 dark:bg-emerald-955/20', text: 'text-emerald-700 dark:text-emerald-450', dot: 'bg-emerald-500' },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'TO DO',
  inprogress: 'IN PROGRESS',
  review: 'REVIEW',
  completed: 'DONE',
};

interface TaskGanttViewProps {
  filteredTasks: Task[];
  members: User[];
  selectedTaskIds: string[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: string, title: string, message: string) => void;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(str: string): Date {
  const d = new Date(str.split('T')[0]);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MONTHS_VI = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ZoomLevel = 'day' | 'week' | 'month';

export default function TaskGanttView({
   filteredTasks, members, selectedTaskIds, setSelectedTaskIds,
   setSelectedTask, onUpdateTask, onAddSyncLog
  }: TaskGanttViewProps) {
  const { t } = useTranslation();
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
  const [viewOffset, setViewOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: string;
    origEnd: string;
  } | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { cellWidth, visibleDays, viewStart } = useMemo(() => {
    let cw: number, vd: number;
    if (zoomLevel === 'day') { cw = 40; vd = 42; }
    else if (zoomLevel === 'week') { cw = 20; vd = 90; }
    else { cw = 8; vd = 180; }

    const start = addDays(today, viewOffset - Math.floor(vd * 0.3));
    return { cellWidth: cw, visibleDays: vd, viewStart: start };
  }, [zoomLevel, viewOffset, today]);

  const dateColumns = useMemo(() => {
    const cols: Date[] = [];
    for (let i = 0; i < visibleDays; i++) {
      cols.push(addDays(viewStart, i));
    }
    return cols;
  }, [viewStart, visibleDays]);

  const monthHeaders = useMemo(() => {
    const headers: { label: string; span: number; startIdx: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;
    let spanCount = 0;
    let startIdx = 0;

    dateColumns.forEach((date, idx) => {
      const m = date.getMonth();
      const y = date.getFullYear();
      if (m !== currentMonth || y !== currentYear) {
        if (currentMonth !== -1) {
          headers.push({ label: `${MONTHS_VI[currentMonth]} ${currentYear}`, span: spanCount, startIdx });
        }
        currentMonth = m;
        currentYear = y;
        spanCount = 1;
        startIdx = idx;
      } else {
        spanCount++;
      }
    });
    if (currentMonth !== -1) {
      headers.push({ label: `${MONTHS_VI[currentMonth]} ${currentYear}`, span: spanCount, startIdx });
    }
    return headers;
  }, [dateColumns]);

  const getBarPosition = useCallback((task: Task) => {
    const startStr = task.startDate || task.createdAt;
    const endStr = task.dueDate;

    if (!startStr && !endStr) return null;

    const taskStart = startStr ? parseDate(startStr) : addDays(parseDate(endStr!), -3);
    const taskEnd = endStr ? parseDate(endStr) : addDays(taskStart, 3);

    const startOffset = diffDays(viewStart, taskStart);
    const duration = Math.max(1, diffDays(taskStart, taskEnd) + 1);

    const left = startOffset * cellWidth;
    const width = duration * cellWidth;

    return { left, width, taskStart: formatDate(taskStart), taskEnd: formatDate(taskEnd) };
  }, [viewStart, cellWidth]);

  const navigate = (direction: 'left' | 'right') => {
    const step = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30;
    setViewOffset(prev => direction === 'left' ? prev - step : prev + step);
  };

  const goToToday = () => setViewOffset(0);

  const [dragDaysDelta, setDragDaysDelta] = useState(0);

  // Use useEffect for ref updates to avoid "Cannot access refs during render"
  useEffect(() => {
    filteredTasksRef.current = filteredTasks;
  }, [filteredTasks]);

  useEffect(() => {
    onUpdateTaskRef.current = onUpdateTask;
  }, [onUpdateTask]);

  useEffect(() => {
    onAddSyncLogRef.current = onAddSyncLog;
  }, [onAddSyncLog]);

  useEffect(() => {
    cellWidthRef.current = cellWidth;
  }, [cellWidth]);

  // Refs to avoid re-triggering the drag useEffect on every render
  const filteredTasksRef = useRef<Task[]>([]);
  const onUpdateTaskRef = useRef<(task: Task) => void>(() => {});
  const onAddSyncLogRef = useRef<(log: string) => void>(() => {});
  const cellWidthRef = useRef(cellWidth);

  const handleBarMouseDown = (e: React.MouseEvent, task: Task, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    const startStr = task.startDate || task.createdAt || formatDate(today);
    const endStr = task.dueDate || formatDate(addDays(parseDate(startStr), 3));
    setDragDaysDelta(0);
    setDragState({ taskId: task.id, type, startX: e.clientX, origStart: startStr, origEnd: endStr });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const daysDelta = Math.round(dx / cellWidthRef.current);
      setDragDaysDelta(daysDelta);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const daysDelta = Math.round(dx / cellWidthRef.current);

      if (daysDelta !== 0) {
        const task = filteredTasksRef.current.find(t => t.id === dragState.taskId);
        if (task) {
          const origStart = parseDate(dragState.origStart);
          const origEnd = parseDate(dragState.origEnd);

          let newStart: Date, newEnd: Date;

          if (dragState.type === 'move') {
            newStart = addDays(origStart, daysDelta);
            newEnd = addDays(origEnd, daysDelta);
          } else if (dragState.type === 'resize-start') {
            newStart = addDays(origStart, daysDelta);
            newEnd = origEnd;
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newStart = origStart;
            newEnd = addDays(origEnd, daysDelta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }

          onUpdateTaskRef.current({ ...task, startDate: formatDate(newStart), dueDate: formatDate(newEnd) });
          onAddSyncLogRef.current(`Updated schedule of "${task.title}"`);
        }
      }

      setDragDaysDelta(0);
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      todo: [], inprogress: [], review: [], completed: []
    };
    filteredTasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const todayOffset = diffDays(viewStart, today);
  const todayLeft = todayOffset * cellWidth;

  const ROW_HEIGHT = 44;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden select-none">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors border border-slate-200/40 dark:border-slate-800/40 mr-1 bg-white dark:bg-slate-900 shadow-3xs"
            title={isLeftPanelCollapsed ? "Show Task List" : "Hide Task List"}
          >
            {isLeftPanelCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <button onClick={() => navigate('left')} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToToday}
            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors border border-indigo-100 dark:border-indigo-900/30">
            <Calendar className="w-3 h-3 inline mr-1" />
            Today
          </button>
          <button onClick={() => navigate('right')} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {(['day', 'week', 'month'] as ZoomLevel[]).map(level => (
            <button key={level} onClick={() => setZoomLevel(level)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${zoomLevel === level
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}>
              {level === 'day' ? 'Day' : level === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Gantt Area ── */}
      <div className="flex overflow-hidden" style={{ maxHeight: 'calc(100vh - 380px)' }}>

        {/* ── Left: Task list panel ── */}
        <div className={`border-r border-slate-200/60 dark:border-slate-800/60 overflow-y-auto bg-white dark:bg-slate-900/40 transition-all duration-300 ${isLeftPanelCollapsed ? 'w-0 min-w-0 border-r-0' : 'w-[280px] min-w-[280px]'}`}>
          {/* Header */}
          <div className="h-[60px] flex items-end px-3 pb-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {t('tasksLabel', filteredTasks.length)}
            </span>
          </div>

          {/* Task rows */}
          {(['todo', 'inprogress', 'review', 'completed'] as TaskStatus[]).map(status => {
            const tasks = groupedTasks[status];
            if (tasks.length === 0) return null;
            const sc = STATUS_COLORS[status];

            return (
              <div key={status}>
                {/* Status group header */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-200/40 dark:border-slate-800/40" style={{ height: ROW_HEIGHT * 0.7 }}>
                  <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <span className={`text-[9.5px] font-black uppercase tracking-wider ${sc.text}`}>{STATUS_LABELS[status]}</span>
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-200/20 leading-none">{tasks.length}</span>
                </div>

                {tasks.map(task => {
                  const assignee = members.find(m => m.id === task.assigneeId);
                  return (
                    <div key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`flex items-center gap-2 px-3 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 ${selectedTaskIds.includes(task.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : ''
                        }`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <input type="checkbox" checked={selectedTaskIds.includes(task.id)}
                        onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                        onClick={e => e.stopPropagation()}
                        className="w-3 h-3 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600 shrink-0" />
                      {task.isPinned && <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-400 shrink-0" />}
                      <span className={`text-[11px] font-semibold truncate flex-1 ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {task.title}
                      </span>
                      {assignee && (
                        <SignedImage filePath={assignee.avatar}
                          className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                          alt={assignee.name}
                          fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-[11px] text-slate-400 dark:text-slate-500">
              No tasks
            </div>
          )}
        </div>

        {/* ── Right: Timeline chart ── */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto relative">

          {/* Date headers */}
          <div className="sticky top-0 z-20 bg-white dark:bg-slate-900/95 border-b border-slate-100 dark:border-slate-800/60" style={{ width: visibleDays * cellWidth }}>
            {/* Month row */}
            <div className="flex h-[30px]">
              {monthHeaders.map((mh, i) => (
                <div key={i} className="flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 uppercase tracking-wider"
                  style={{ width: mh.span * cellWidth }}>
                  {mh.label}
                </div>
              ))}
            </div>
            {/* Day row */}
            <div className="flex h-[30px]">
              {dateColumns.map((date, i) => {
                const isToday = formatDate(date) === formatDate(today);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div key={i}
                    className={`flex flex-col items-center justify-center text-[8px] font-bold border-r border-slate-100/60 dark:border-slate-800/30 shrink-0 ${isToday ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600' : isWeekend ? 'bg-slate-50/50 dark:bg-slate-800/20 text-slate-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    style={{ width: cellWidth }}
                  >
                    {zoomLevel === 'day' && (
                      <>
                        <span className="leading-none">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</span>
                        <span className={`leading-none font-black ${isToday ? 'text-indigo-600' : ''}`}>{date.getDate()}</span>
                      </>
                    )}
                    {zoomLevel === 'week' && (
                      <span className="leading-none">{date.getDate()}</span>
                    )}
                    {zoomLevel === 'month' && (
                      date.getDate() % 5 === 1 ? <span className="leading-none">{date.getDate()}</span> : null
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task bars area */}
          <div className="relative" style={{ width: visibleDays * cellWidth }}>

            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {dateColumns.map((date, i) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div key={i}
                    className={`shrink-0 border-r border-slate-100/40 dark:border-slate-800/20 ${isWeekend ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}
                    style={{ width: cellWidth, height: '100%' }}
                  />
                );
              })}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset < visibleDays && (
              <div className="absolute top-0 bottom-0 z-10 pointer-events-none"
                style={{ left: todayLeft + cellWidth / 2, width: 2 }}>
                <div className="w-full h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-950 shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
              </div>
            )}

            {/* Bars for each task group */}
            {(['todo', 'inprogress', 'review', 'completed'] as TaskStatus[]).map(status => {
              const tasks = groupedTasks[status];
              if (tasks.length === 0) return null;
              const sc = STATUS_COLORS[status];

              return (
                <React.Fragment key={status}>
                  {/* Group header spacer */}
                  <div className="border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-800/10"
                    style={{ height: ROW_HEIGHT * 0.7 }} />

                  {/* Task bars */}
                  {tasks.map(task => {
                    const pos = getBarPosition(task);
                    const isDragging = dragState?.taskId === task.id;

                    // Apply visual drag offset
                    let barLeft = pos ? pos.left : 0;
                    let barWidth = pos ? pos.width : 0;
                    if (pos && isDragging && dragDaysDelta !== 0) {
                      const pxDelta = dragDaysDelta * cellWidth;
                      if (dragState.type === 'move') {
                        barLeft = pos.left + pxDelta;
                      } else if (dragState.type === 'resize-start') {
                        barLeft = pos.left + pxDelta;
                        barWidth = pos.width - pxDelta;
                      } else {
                        barWidth = pos.width + pxDelta;
                      }
                    }

                    return (
                      <div key={task.id}
                        className="relative border-b border-slate-50 dark:border-slate-800/30"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {pos && (
                          <div
                            className={`absolute top-[8px] rounded-lg ${sc.bar} shadow-sm cursor-grab active:cursor-grabbing group transition-shadow hover:shadow-md ${isDragging ? 'opacity-90 shadow-lg ring-2 ring-white/30' : ''}`}
                            style={{
                              left: barLeft,
                              width: Math.max(cellWidth, barWidth),
                              height: ROW_HEIGHT - 16,
                            }}
                            onMouseDown={e => handleBarMouseDown(e, task, 'move')}
                          >
                            {/* Progress fill */}
                            {task.progress > 0 && (
                              <div className="absolute inset-0 rounded-lg bg-white/25 dark:bg-black/15 overflow-hidden">
                                <div className="h-full rounded-lg bg-white/20 dark:bg-white/10 transition-all"
                                  style={{ width: `${task.progress}%` }} />
                              </div>
                            )}

                            {/* Bar label */}
                            <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
                              <span className="text-[9px] font-bold text-white truncate drop-shadow-sm">
                                {task.title}
                              </span>
                            </div>

                            {/* Resize handles */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg hover:bg-white/30"
                              onMouseDown={e => handleBarMouseDown(e, task, 'resize-start')} />
                            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-r-lg hover:bg-white/30"
                              onMouseDown={e => handleBarMouseDown(e, task, 'resize-end')} />

                            {/* Completed check */}
                            {task.status === 'completed' && (
                              <div className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <Check className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* No dates indicator */}
                        {!pos && (
                          <div className="absolute top-[8px] left-4 flex items-center gap-1 px-2 rounded-md bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600"
                            style={{ height: ROW_HEIGHT - 16 }}>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">No date</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Bottom spacer */}
            <div className="h-20" />
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center gap-4">
          {(['todo', 'inprogress', 'review', 'completed'] as TaskStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-3 h-2 rounded-sm ${STATUS_COLORS[s].bar}`} />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
          Drag bar to move schedule · Drag edges to resize duration
        </span>
      </div>
    </div>
  );
}