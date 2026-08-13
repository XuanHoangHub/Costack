"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { 
  ChevronLeft, ChevronRight, Calendar, Check, Pin, Flame, Zap, 
  Layers, Filter, Plus, ArrowRight, Clock, User as UserIcon, Link2, 
  CircleAlert, Sparkles, Diamond
} from 'lucide-react';
import { Task, TaskStatus, User, Priority } from '../../types';
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

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'URGENT',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
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

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_VI = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'];

type ZoomLevel = 'day' | 'week' | 'month' | 'year';
type GroupByMode = 'status' | 'priority' | 'assignee';

export default function TaskGanttView({
  filteredTasks,
  members,
  selectedTaskIds,
  setSelectedTaskIds,
  setSelectedTask,
  onUpdateTask,
  onAddSyncLog,
  triggerToast
}: TaskGanttViewProps) {
  const { t, locale } = useTranslation();
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
  const [groupBy, setGroupBy] = useState<GroupByMode>('status');
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [autoCascading, setAutoCascading] = useState(true);
  const [viewOffset, setViewOffset] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Dragging state for Gantt bars
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: string;
    origEnd: string;
  } | null>(null);

  const [dragDaysDelta, setDragDaysDelta] = useState(0);

  // Dependency linking state
  const [connectingSourceTaskId, setConnectingSourceTaskId] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthsList = locale === 'vi' ? MONTHS_VI : MONTHS_EN;

  const { cellWidth, visibleDays, viewStart } = useMemo(() => {
    let cw: number, vd: number;
    if (zoomLevel === 'day') { cw = 44; vd = 42; }
    else if (zoomLevel === 'week') { cw = 22; vd = 90; }
    else if (zoomLevel === 'month') { cw = 10; vd = 180; }
    else { cw = 3; vd = 365; }

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
          headers.push({ label: `${monthsList[currentMonth]} ${currentYear}`, span: spanCount, startIdx });
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
      headers.push({ label: `${monthsList[currentMonth]} ${currentYear}`, span: spanCount, startIdx });
    }
    return headers;
  }, [dateColumns, monthsList]);

  // Bar Position calculation
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

    return { left, width, taskStart: formatDate(taskStart), taskEnd: formatDate(taskEnd), durationDays: duration };
  }, [viewStart, cellWidth]);

  // Critical Path calculation
  const criticalPathTaskIds = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();

    const taskMap = new Map<string, Task>();
    filteredTasks.forEach(t => taskMap.set(t.id, t));

    // Find longest duration dependency chain
    const memo = new Map<string, number>();

    const getChainLength = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      const t = taskMap.get(id);
      if (!t) return 0;

      const pos = getBarPosition(t);
      const dur = pos ? pos.durationDays : 1;

      let maxChild = 0;
      const childIds = t.relationships?.blocks || [];
      childIds.forEach(cid => {
        maxChild = Math.max(maxChild, getChainLength(cid));
      });

      const total = dur + maxChild;
      memo.set(id, total);
      return total;
    };

    let maxLength = 0;
    filteredTasks.forEach(t => {
      maxLength = Math.max(maxLength, getChainLength(t.id));
    });

    const criticalSet = new Set<string>();
    filteredTasks.forEach(t => {
      if (getChainLength(t.id) === maxLength && maxLength > 0) {
        criticalSet.add(t.id);
      }
    });

    return criticalSet;
  }, [showCriticalPath, filteredTasks, getBarPosition]);

  const navigate = (direction: 'left' | 'right') => {
    const step = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30;
    setViewOffset(prev => direction === 'left' ? prev - step : prev + step);
  };

  const goToToday = () => setViewOffset(0);

  // Dragging logic refs
  const filteredTasksRef = useRef<Task[]>([]);
  const onUpdateTaskRef = useRef<(task: Task) => void>(() => {});
  const onAddSyncLogRef = useRef<(log: string) => void>(() => {});
  const cellWidthRef = useRef(cellWidth);

  useEffect(() => {
    filteredTasksRef.current = filteredTasks;
    onUpdateTaskRef.current = onUpdateTask;
    onAddSyncLogRef.current = onAddSyncLog;
    cellWidthRef.current = cellWidth;
  }, [filteredTasks, onUpdateTask, onAddSyncLog, cellWidth]);

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

          const updatedTask = { ...task, startDate: formatDate(newStart), dueDate: formatDate(newEnd) };
          onUpdateTaskRef.current(updatedTask);
          onAddSyncLogRef.current(`Updated Gantt timeline for "${task.title}"`);
          triggerToast?.('success', 'Gantt Schedule Updated 📅', `Rescheduled "${task.title}" to ${formatDate(newStart)} ➔ ${formatDate(newEnd)}`);

          // Auto-cascading dependencies
          if (autoCascading && task.relationships?.blocks) {
            task.relationships.blocks.forEach(childId => {
              const childTask = filteredTasksRef.current.find(c => c.id === childId);
              if (childTask) {
                const childStart = childTask.startDate ? parseDate(childTask.startDate) : newStart;
                const childEnd = childTask.dueDate ? parseDate(childTask.dueDate) : newEnd;
                const childDur = Math.max(1, diffDays(childStart, childEnd));

                if (childStart <= newEnd) {
                  const shiftedChildStart = addDays(newEnd, 1);
                  const shiftedChildEnd = addDays(shiftedChildStart, childDur);
                  onUpdateTaskRef.current({
                    ...childTask,
                    startDate: formatDate(shiftedChildStart),
                    dueDate: formatDate(shiftedChildEnd)
                  });
                }
              }
            });
          }
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
  }, [dragState, autoCascading, triggerToast]);

  // Handle Dependency Linking
  const handleLinkDependency = (targetTaskId: string) => {
    if (!connectingSourceTaskId || connectingSourceTaskId === targetTaskId) {
      setConnectingSourceTaskId(null);
      return;
    }

    const sourceTask = filteredTasks.find(t => t.id === connectingSourceTaskId);
    const targetTask = filteredTasks.find(t => t.id === targetTaskId);

    if (sourceTask && targetTask) {
      const sourceBlocks = Array.from(new Set([...(sourceTask.relationships?.blocks || []), targetTaskId]));
      const targetBlockedBy = Array.from(new Set([...(targetTask.relationships?.blockedBy || []), connectingSourceTaskId]));

      onUpdateTask({
        ...sourceTask,
        relationships: { ...(sourceTask.relationships || {}), blocks: sourceBlocks }
      });

      onUpdateTask({
        ...targetTask,
        relationships: { ...(targetTask.relationships || {}), blockedBy: targetBlockedBy }
      });

      triggerToast?.('success', 'Dependency Created 🔗', `Linked "${sourceTask.title}" ➔ "${targetTask.title}"`);
      onAddSyncLog(`Linked dependency: "${sourceTask.title}" blocks "${targetTask.title}"`);
    }

    setConnectingSourceTaskId(null);
  };

  // Task grouping calculation
  const groupedTasks = useMemo(() => {
    if (groupBy === 'status') {
      const groups: Record<string, { title: string; tasks: Task[]; color: string }> = {
        todo: { title: STATUS_LABELS.todo, tasks: [], color: STATUS_COLORS.todo.dot },
        inprogress: { title: STATUS_LABELS.inprogress, tasks: [], color: STATUS_COLORS.inprogress.dot },
        review: { title: STATUS_LABELS.review, tasks: [], color: STATUS_COLORS.review.dot },
        completed: { title: STATUS_LABELS.completed, tasks: [], color: STATUS_COLORS.completed.dot },
      };
      filteredTasks.forEach(t => {
        if (groups[t.status]) groups[t.status].tasks.push(t);
      });
      return groups;
    } else if (groupBy === 'priority') {
      const groups: Record<string, { title: string; tasks: Task[]; color: string }> = {
        urgent: { title: 'URGENT PRIORITY', tasks: [], color: 'bg-rose-500' },
        high: { title: 'HIGH PRIORITY', tasks: [], color: 'bg-amber-500' },
        medium: { title: 'MEDIUM PRIORITY', tasks: [], color: 'bg-indigo-500' },
        low: { title: 'LOW PRIORITY', tasks: [], color: 'bg-slate-400' },
      };
      filteredTasks.forEach(t => {
        if (groups[t.priority]) groups[t.priority].tasks.push(t);
      });
      return groups;
    } else {
      const groups: Record<string, { title: string; tasks: Task[]; color: string }> = {};
      members.forEach(m => {
        groups[m.id] = { title: m.name.toUpperCase(), tasks: [], color: 'bg-violet-500' };
      });
      groups['unassigned'] = { title: 'UNASSIGNED', tasks: [], color: 'bg-slate-400' };
      filteredTasks.forEach(t => {
        if (t.assigneeId && groups[t.assigneeId]) {
          groups[t.assigneeId].tasks.push(t);
        } else {
          groups['unassigned'].tasks.push(t);
        }
      });
      return groups;
    }
  }, [filteredTasks, groupBy, members]);

  // Index map of tasks for row height vertical positioning
  const taskRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let rowIndex = 0;
    Object.values(groupedTasks).forEach(group => {
      if (group.tasks.length === 0) return;
      rowIndex++; // Header row
      group.tasks.forEach(task => {
        map.set(task.id, rowIndex);
        rowIndex++;
      });
    });
    return map;
  }, [groupedTasks]);

  const todayOffset = diffDays(viewStart, today);
  const todayLeft = todayOffset * cellWidth;
  const ROW_HEIGHT = 44;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#07080c] text-slate-800 dark:text-slate-100 select-none overflow-hidden font-sans border-0 rounded-none">

      {/* ── Control Bar Top Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#07080c]/80 backdrop-blur-md shrink-0 gap-3">
        
        {/* Navigation & Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer border border-slate-200/80 dark:border-slate-800 transition-all bg-white dark:bg-slate-900 shadow-xs"
            title={isLeftPanelCollapsed ? "Show Task List Sidebar" : "Hide Task List Sidebar"}
          >
            {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button onClick={() => navigate('left')} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={goToToday}
              className="px-3 py-1 rounded-lg text-xs font-black bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Hôm nay' : 'Today'}</span>
            </button>
            <button onClick={() => navigate('right')} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Group By Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-500 ml-1.5" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
              className="bg-transparent border-none outline-none font-bold text-xs cursor-pointer pr-1"
            >
              <option value="status">Group by Status</option>
              <option value="priority">Group by Priority</option>
              <option value="assignee">Group by Assignee</option>
            </select>
          </div>
        </div>

        {/* Feature Switches & Zoom Scale */}
        <div className="flex items-center gap-3">
          
          {/* Critical Path Switch */}
          <button
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
              showCriticalPath
                ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Critical Path</span>
          </button>

          {/* Auto Cascading Switch */}
          <button
            onClick={() => setAutoCascading(!autoCascading)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
              autoCascading
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200/80 dark:border-slate-800 opacity-60'
            }`}
            title="Auto-reschedule dependent tasks when predecessors shift"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto-Schedule</span>
          </button>

          {/* Time Zoom Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800">
            {(['day', 'week', 'month', 'year'] as ZoomLevel[]).map(level => (
              <button 
                key={level} 
                onClick={() => setZoomLevel(level)}
                className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer transition-all uppercase ${
                  zoomLevel === level
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Main Gantt Split Container ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Left: Task Tree Sidebar Table ── */}
        <div className={`border-r border-slate-200/80 dark:border-slate-800/80 overflow-y-auto bg-white dark:bg-slate-950 transition-all duration-300 shrink-0 ${
          isLeftPanelCollapsed ? 'w-0 min-w-0 border-r-0' : 'w-[300px] md:w-[340px]'
        }`}>
          {/* Header */}
          <div className="h-[60px] flex items-end justify-between px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tasks ({filteredTasks.length})
            </span>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase">Duration</span>
          </div>

          {/* Task Tree Rows */}
          {Object.entries(groupedTasks).map(([groupId, group]) => {
            if (group.tasks.length === 0) return null;

            return (
              <div key={groupId}>
                {/* Group Header */}
                <div 
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/60" 
                  style={{ height: ROW_HEIGHT * 0.7 }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${group.color}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {group.title}
                    </span>
                  </div>
                  <span className="text-[9.5px] font-black text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {group.tasks.length}
                  </span>
                </div>

                {/* Individual Task Row */}
                {group.tasks.map(task => {
                  const assignee = members.find(m => m.id === task.assigneeId);
                  const isSelected = selectedTaskIds.includes(task.id);
                  const isCritical = criticalPathTaskIds.has(task.id);
                  const pos = getBarPosition(task);

                  return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`flex items-center justify-between px-3 border-b border-slate-100 dark:border-slate-800/40 cursor-pointer transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                      }`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={e => {
                            e.stopPropagation();
                            setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id));
                          }}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer"
                        />

                        {isCritical && (
                          <span title="Critical Path Task">
                            <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          </span>
                        )}

                        <span className={`text-xs font-semibold truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {pos && (
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {pos.durationDays}d
                          </span>
                        )}
                        {assignee && (
                          <SignedImage 
                            filePath={assignee.avatar}
                            className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-800"
                            alt={assignee.name} 
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── Right: SVG Gantt Timeline Grid Canvas ── */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto relative">

          {/* Date Headers Sticky Row */}
          <div className="sticky top-0 z-20 bg-white dark:bg-[#07080c] border-b border-slate-200/80 dark:border-slate-800/80" style={{ width: visibleDays * cellWidth }}>
            {/* Month row */}
            <div className="flex h-[30px]">
              {monthHeaders.map((mh, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-center text-[10.5px] font-black text-slate-500 dark:text-slate-400 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 uppercase tracking-wider"
                  style={{ width: mh.span * cellWidth }}
                >
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
                  <div 
                    key={i}
                    className={`flex flex-col items-center justify-center text-[9px] font-bold border-r border-slate-100 dark:border-slate-800/40 shrink-0 ${
                      isToday ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-black' : isWeekend ? 'bg-slate-50/60 dark:bg-slate-900/40 text-slate-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                    style={{ width: cellWidth }}
                  >
                    {zoomLevel === 'day' && (
                      <>
                        <span className="leading-none">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</span>
                        <span className={`leading-none font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400 text-xs' : ''}`}>{date.getDate()}</span>
                      </>
                    )}
                    {zoomLevel === 'week' && (
                      <span className="leading-none">{date.getDate()}</span>
                    )}
                    {zoomLevel === 'month' && (
                      date.getDate() % 5 === 1 ? <span className="leading-none">{date.getDate()}</span> : null
                    )}
                    {zoomLevel === 'year' && (
                      date.getDate() === 1 ? <span className="leading-none">{monthsList[date.getMonth()]}</span> : null
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Grid & Task Bars Area */}
          <div className="relative" style={{ width: visibleDays * cellWidth }}>

            {/* Grid Column lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {dateColumns.map((date, i) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div 
                    key={i}
                    className={`shrink-0 border-r border-slate-100/60 dark:border-slate-800/30 ${isWeekend ? 'bg-slate-50/40 dark:bg-slate-900/20' : ''}`}
                    style={{ width: cellWidth, height: '100%' }}
                  />
                );
              })}
            </div>

            {/* Red Today Line */}
            {todayOffset >= 0 && todayOffset < visibleDays && (
              <div 
                className="absolute top-0 bottom-0 z-10 pointer-events-none"
                style={{ left: todayLeft + cellWidth / 2, width: 2 }}
              >
                <div className="w-full h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-slate-950 shadow-md" />
              </div>
            )}

            {/* SVG Cascading Dependency Arrow Connector Lines */}
            <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full overflow-visible">
              <defs>
                <marker id="gantt-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
                </marker>
                <marker id="gantt-arrow-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                </marker>
              </defs>

              {filteredTasks.map(task => {
                const childIds = task.relationships?.blocks || [];
                const parentPos = getBarPosition(task);
                const parentRowIdx = taskRowIndexMap.get(task.id);

                if (!parentPos || parentRowIdx === undefined) return null;

                const startX = parentPos.left + parentPos.width;
                const startY = parentRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + 30; // offset header height

                return childIds.map(childId => {
                  const childTask = filteredTasks.find(c => c.id === childId);
                  if (!childTask) return null;
                  const childPos = getBarPosition(childTask);
                  const childRowIdx = taskRowIndexMap.get(childId);

                  if (!childPos || childRowIdx === undefined) return null;

                  const endX = childPos.left;
                  const endY = childRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + 30;

                  const isCriticalLine = criticalPathTaskIds.has(task.id) && criticalPathTaskIds.has(childId);
                  const strokeColor = isCriticalLine ? '#f43f5e' : '#818cf8';
                  const markerId = isCriticalLine ? 'url(#gantt-arrow-critical)' : 'url(#gantt-arrow)';

                  // Curved S-path
                  const midX = startX + Math.max(16, (endX - startX) / 2);
                  const pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

                  return (
                    <path
                      key={`${task.id}-${childId}`}
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isCriticalLine ? "2.5" : "1.8"}
                      strokeDasharray={isCriticalLine ? "none" : "3,3"}
                      markerEnd={markerId}
                    />
                  );
                });
              })}
            </svg>

            {/* Task Bars Content Render */}
            {Object.entries(groupedTasks).map(([groupId, group]) => {
              if (group.tasks.length === 0) return null;

              return (
                <React.Fragment key={groupId}>
                  {/* Group Spacer Header Row */}
                  <div 
                    className="border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-900/20"
                    style={{ height: ROW_HEIGHT * 0.7 }} 
                  />

                  {/* Task Bar Rows */}
                  {group.tasks.map(task => {
                    const pos = getBarPosition(task);
                    const isDragging = dragState?.taskId === task.id;
                    const isCritical = criticalPathTaskIds.has(task.id);
                    const isConnectingSource = connectingSourceTaskId === task.id;

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
                      <div 
                        key={task.id}
                        className="relative border-b border-slate-100 dark:border-slate-800/40"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => handleLinkDependency(task.id)}
                      >
                        {pos && (
                          <div
                            className={`absolute top-[8px] rounded-xl cursor-grab active:cursor-grabbing group transition-all flex items-center shadow-sm hover:shadow-md ${
                              isCritical
                                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 shadow-rose-500/25 ring-2 ring-rose-400/40'
                                : STATUS_COLORS[task.status].bar
                            } ${isDragging ? 'opacity-90 shadow-lg ring-2 ring-white' : ''} ${
                              isConnectingSource ? 'ring-4 ring-indigo-500 animate-pulse' : ''
                            }`}
                            style={{
                              left: barLeft,
                              width: Math.max(cellWidth, barWidth),
                              height: ROW_HEIGHT - 16,
                            }}
                            onMouseDown={e => handleBarMouseDown(e, task, 'move')}
                          >
                            {/* Progress fill */}
                            {task.progress > 0 && (
                              <div className="absolute inset-0 rounded-xl bg-white/20 dark:bg-black/15 overflow-hidden">
                                <div 
                                  className="h-full rounded-xl bg-white/30 dark:bg-white/20 transition-all"
                                  style={{ width: `${task.progress}%` }} 
                                />
                              </div>
                            )}

                            {/* Bar text label */}
                            <div className="absolute inset-0 flex items-center px-3 overflow-hidden">
                              <span className="text-xs font-black text-white truncate drop-shadow-sm">
                                {task.title}
                              </span>
                            </div>

                            {/* Connector Handles for Dependency Link creation */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConnectingSourceTaskId(isConnectingSource ? null : task.id);
                              }}
                              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 opacity-0 group-hover:opacity-100 transition-all cursor-crosshair shadow-md flex items-center justify-center text-indigo-600"
                              title="Link dependency"
                            >
                              <Link2 className="w-2.5 h-2.5" />
                            </button>

                            {/* Left/Right Resize Handles */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl hover:bg-white/40"
                              onMouseDown={e => handleBarMouseDown(e, task, 'resize-start')} 
                            />
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-r-xl hover:bg-white/40"
                              onMouseDown={e => handleBarMouseDown(e, task, 'resize-end')} 
                            />
                          </div>
                        )}

                        {/* Unscheduled Task placeholder */}
                        {!pos && (
                          <div 
                            className="absolute top-[8px] left-4 flex items-center gap-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700"
                            style={{ height: ROW_HEIGHT - 16 }}
                          >
                            <span className="text-xs font-bold text-slate-400 italic">Unscheduled Task</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer Legend & Guidelines ── */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs font-bold text-slate-500 shrink-0 gap-3">
        <div className="flex items-center gap-4">
          {Object.entries(STATUS_LABELS).map(([s, label]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-3 h-2.5 rounded-md ${STATUS_COLORS[s as TaskStatus].bar}`} />
              <span className="text-[10px] font-black uppercase">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-4">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Critical Path</span>
          </div>
        </div>

        <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
          💡 Drag task bar to shift dates · Drag edges to extend duration · Click handle icon to link dependencies
        </span>
      </div>

    </div>
  );
}