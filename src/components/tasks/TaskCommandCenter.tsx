"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Columns3,
  Filter,
  Flag,
  GanttChartSquare,
  LayoutList,
  Plus,
  Search,
  Table2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Priority, Space, Task, TaskAttachment, TaskStatus, User, Workspace } from '../../types';
import { useTranslation } from '../../contexts/TranslationContext';
import { generateSubtasksWithAi } from '@/lib/aiClient';
import TaskBoardView from './TaskBoardView';
import TaskDetailsPanel from './TaskDetailsPanel';
import TaskGanttView from './TaskGanttView';
import TaskListView from './TaskListView';
import TaskModal from './TaskModal';
import TaskTableView from './TaskTableView';

type TaskView = 'list' | 'board' | 'table' | 'gantt';
type ScopeFilter = 'all' | 'mine' | 'overdue';
type SortMode = 'priority' | 'dueDate' | 'recent';

type TaskCreatePayload = Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'> & {
  progress?: number;
  workspaceId?: string;
  spaceId?: string;
  listId?: string;
};

interface TaskCommandCenterProps {
  tasks: Task[];
  members: User[];
  workspaces: Workspace[];
  spaces?: Space[];
  activeWorkspaceId: string;
  activeSpaceId?: string | null;
  activeListId?: string | null;
  currentUserId?: string;
  onAddTask: (task: TaskCreatePayload) => void | Promise<void>;
  onUpdateTask: (task: Task) => void | Promise<void>;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message', title: string, message: string, options?: { taskId?: string; workspaceId?: string; persistInInbox?: boolean }) => void;
  initialSelectedTaskId?: string | null;
  onClearInitialSelectedTaskId?: () => void;
  onUpdateTaskOrder?: (workspaceId: string, orderedIds: string[]) => void;
  globalActiveTaskId?: string | null;
  globalActiveElapsed?: number;
  globalIsPaused?: boolean;
  onStartGlobalTimer?: (id: string) => void;
  onStopGlobalTimer?: () => void;
  onTogglePauseGlobalTimer?: () => void;
}

const VIEW_OPTIONS: Array<{ id: TaskView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'list', label: 'Danh sách', icon: LayoutList },
  { id: 'table', label: 'Bảng', icon: Table2 },
  { id: 'board', label: 'Kanban', icon: Columns3 },
  { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Cần làm',
  inprogress: 'Đang làm',
  review: 'Chờ duyệt',
  completed: 'Hoàn thành',
};

const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const getStoredView = (): TaskView => {
  if (typeof window === 'undefined') return 'list';
  const stored = window.localStorage.getItem('apexa_task_center_view');
  return VIEW_OPTIONS.some((item) => item.id === stored) ? stored as TaskView : 'list';
};

const toDateValue = (date?: string) => {
  if (!date) return Number.POSITIVE_INFINITY;
  const value = new Date(date).getTime();
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
};

export default function TaskCommandCenter({
  tasks,
  members,
  workspaces,
  spaces = [],
  activeWorkspaceId,
  activeSpaceId = null,
  activeListId = null,
  currentUserId,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddSyncLog,
  triggerToast,
  initialSelectedTaskId,
  onClearInitialSelectedTaskId,
  onUpdateTaskOrder,
  globalActiveTaskId = null,
  globalActiveElapsed = 0,
  globalIsPaused = false,
  onStartGlobalTimer,
  onStopGlobalTimer,
  onTogglePauseGlobalTimer,
}: TaskCommandCenterProps) {
  const { localize: l, isVietnamese } = useTranslation();
  const [view, setView] = useState<TaskView>(getStoredView);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [priority, setPriority] = useState<'all' | Priority>('all');
  const [assigneeId, setAssigneeId] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId || null);
  const [filterTag, setFilterTag] = useState('all');
  const [boardGroupBy, setBoardGroupBy] = useState<'status' | 'priority' | 'assignee'>('status');
  const [boardSwimlaneBy, setBoardSwimlaneBy] = useState<'none' | 'status' | 'priority' | 'assignee'>('none');
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [cardCover, setCardCover] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [visibleFields, setVisibleFields] = useState([
    'title', 'status', 'priority', 'assignee', 'startDate', 'dueDate',
  ]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const overdue = tasks.filter((task) => task.status !== 'completed' && toDateValue(task.dueDate) < todayStart).length;
    const dueSoon = tasks.filter((task) => {
      const due = toDateValue(task.dueDate);
      return task.status !== 'completed' && due >= todayStart && due <= todayStart + 3 * 86_400_000;
    }).length;
    const blocked = tasks.filter((task) => (task.relationships?.blockedBy?.length || 0) > 0).length;
    return {
      total: tasks.length,
      active: tasks.length - completed,
      completed,
      overdue,
      dueSoon,
      blocked,
      completion: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks, todayStart]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return tasks
      .filter((task) => {
        const assigneeIds = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
        const haystack = [task.title, task.description, ...(task.tags || [])].join(' ').toLocaleLowerCase('vi');
        if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
        if (scope === 'mine' && (!currentUserId || !assigneeIds.includes(currentUserId))) return false;
        if (scope === 'overdue' && !(task.status !== 'completed' && toDateValue(task.dueDate) < todayStart)) return false;
        if (status !== 'all' && task.status !== status) return false;
        if (priority !== 'all' && task.priority !== priority) return false;
        if (assigneeId !== 'all' && !assigneeIds.includes(assigneeId)) return false;
        if (filterTag !== 'all' && !(task.tags || []).includes(filterTag)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'priority') {
          const aW = a.priority ? PRIORITY_WEIGHT[a.priority] : 99;
          const bW = b.priority ? PRIORITY_WEIGHT[b.priority] : 99;
          return aW - bW || toDateValue(a.dueDate) - toDateValue(b.dueDate);
        }
        if (sortMode === 'dueDate') return toDateValue(a.dueDate) - toDateValue(b.dueDate);
        return toDateValue(b.createdAt) - toDateValue(a.createdAt);
      });
  }, [assigneeId, currentUserId, filterTag, priority, query, scope, sortMode, status, tasks, todayStart]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [selectedTaskId, tasks],
  );

  const activeFilterCount = [scope !== 'all', status !== 'all', priority !== 'all', assigneeId !== 'all'].filter(Boolean).length;

  const viewToast = useCallback((type: string, title: string, message: string) => {
    const supportedType = type === 'success' || type === 'comment' ? type : 'info';
    triggerToast?.(supportedType, title, message);
  }, [triggerToast]);

  const changeView = useCallback((next: TaskView) => {
    setView(next);
    window.localStorage.setItem('apexa_task_center_view', next);
  }, []);

  const resetFilters = () => {
    setScope('all');
    setStatus('all');
    setPriority('all');
    setAssigneeId('all');
    setFilterTag('all');
  };

  useEffect(() => {
    if (!initialSelectedTaskId) return;
    setSelectedTaskId(initialSelectedTaskId);
    onClearInitialSelectedTaskId?.();
  }, [initialSelectedTaskId, onClearInitialSelectedTaskId]);

  useEffect(() => {
    const validIds = new Set(tasks.map((task) => task.id));
    setSelectedTaskIds((current) => current.filter((id) => validIds.has(id)));
    if (selectedTaskId && !validIds.has(selectedTaskId)) setSelectedTaskId(null);
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === 'n' && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setIsCreateOpen(true);
      }
      if (!isTyping && ['1', '2', '3', '4'].includes(event.key)) {
        const next = VIEW_OPTIONS[Number(event.key) - 1]?.id;
        if (next) changeView(next);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeView]);

  const setSelectedTask = useCallback((task: Task | null) => {
    setSelectedTaskId(task?.id || null);
    if (task) setAiSummary(task.aiSummary || '');
  }, []);

  const isUrgentNearDueTask = useCallback((task: Task) => {
    const due = toDateValue(task.dueDate);
    return task.status !== 'completed' && (task.priority === 'urgent' || due <= todayStart + 2 * 86_400_000);
  }, [todayStart]);

  const completeSelected = () => {
    selectedTaskIds.forEach((id) => {
      const task = tasks.find((item) => item.id === id);
      if (task && task.status !== 'completed') onUpdateTask({ ...task, status: 'completed', progress: 100, completedAt: new Date().toISOString() });
    });
    triggerToast?.('success', l('Đã cập nhật', 'Updated'), l(`${selectedTaskIds.length} công việc đã được hoàn thành.`, `${selectedTaskIds.length} tasks marked as completed.`));
    setSelectedTaskIds([]);
  };

  const changeStatusSelected = (newStatus: TaskStatus) => {
    selectedTaskIds.forEach((id) => {
      const task = tasks.find((item) => item.id === id);
      if (task) {
        onUpdateTask({
          ...task,
          status: newStatus,
          progress: newStatus === 'completed' ? 100 : task.progress,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
        });
      }
    });
    triggerToast?.('success', l('Thao tác hàng loạt', 'Batch action'), l(`Đã đổi trạng thái ${selectedTaskIds.length} công việc`, `Updated status for ${selectedTaskIds.length} tasks`));
    setSelectedTaskIds([]);
  };

  const changePrioritySelected = (newPriority: Task['priority']) => {
    selectedTaskIds.forEach((id) => {
      const task = tasks.find((item) => item.id === id);
      if (task) {
        onUpdateTask({ ...task, priority: newPriority });
      }
    });
    triggerToast?.('success', l('Thao tác hàng loạt', 'Batch action'), l(`Đã đổi độ ưu tiên ${selectedTaskIds.length} công việc`, `Updated priority for ${selectedTaskIds.length} tasks`));
    setSelectedTaskIds([]);
  };

  const assignSelected = (assigneeId: string) => {
    selectedTaskIds.forEach((id) => {
      const task = tasks.find((item) => item.id === id);
      if (task) {
        onUpdateTask({ ...task, assigneeId, assigneeIds: [assigneeId] });
      }
    });
    triggerToast?.('success', l('Thao tác hàng loạt', 'Batch action'), l(`Đã gán người phụ trách cho ${selectedTaskIds.length} công việc`, `Assigned member to ${selectedTaskIds.length} tasks`));
    setSelectedTaskIds([]);
  };

  const deleteSelected = () => {
    if (window.confirm(l(`Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn? Tất cả các công việc này sẽ bị xóa khỏi hệ thống.`, `Are you sure you want to delete ${selectedTaskIds.length} selected tasks? This action cannot be undone.`))) {
      selectedTaskIds.forEach((id) => onDeleteTask(id));
      triggerToast?.('info', l('Thao tác hàng loạt', 'Batch action'), l(`Đã xóa ${selectedTaskIds.length} công việc`, `Deleted ${selectedTaskIds.length} tasks`));
      setSelectedTaskIds([]);
    }
  };

  const handleAttachmentUpload = (task: Task, eventOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = eventOrFile instanceof File ? eventOrFile : eventOrFile.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: TaskAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        filePath: String(reader.result || ''),
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };
      onUpdateTask({ ...task, attachments: [...(task.attachments || []), attachment] });
      triggerToast?.('success', 'Đã đính kèm', file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleAiSubtasks = async (task: Task) => {
    setAiGenerating(true);
    try {
      const generatedList = await generateSubtasksWithAi(task.title, task.description);
      const generated = (generatedList || []).map((title, index) => ({
        id: `ai-subtask-${Date.now()}-${index}`,
        title,
        completed: false,
      }));
      onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), ...generated] });
      triggerToast?.('success', l('AI đã lập kế hoạch', 'AI Planned Checklist'), l(`Đã thêm ${generated.length} bước thực thi vào công việc.`, `Added ${generated.length} checklist steps to task.`));
    } catch (err) {
      console.error('Failed to generate subtasks with AI:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiSummary = (task: Task) => {
    setIsSummarizing(true);
    window.setTimeout(() => {
      const assignees = (task.assigneeIds || [task.assigneeId]).filter(Boolean).length;
      const summary = `${task.title} đang ở trạng thái ${STATUS_LABELS[task.status].toLowerCase()}, ưu tiên ${task.priority}. ${task.dueDate ? `Hạn hoàn thành ${new Date(task.dueDate).toLocaleDateString('vi-VN')}.` : 'Chưa có hạn hoàn thành.'} ${assignees ? `Có ${assignees} người phụ trách.` : 'Chưa phân công người phụ trách.'}`;
      setAiSummary(summary);
      onUpdateTask({ ...task, aiSummary: summary });
      setIsSummarizing(false);
    }, 450);
  };

  const renderView = () => {
    const commonSelection = { selectedTaskIds, setSelectedTaskIds, setSelectedTask };
    if (view === 'table') {
      return (
        <TaskTableView
          filteredTasks={filteredTasks}
          members={members}
          workspaces={workspaces}
          {...commonSelection}
          onUpdateTask={onUpdateTask}
          onAddTask={onAddTask as any}
          onAddSyncLog={onAddSyncLog}
          triggerToast={viewToast as any}
          visibleFields={visibleFields}
          customFields={customFields}
          setVisibleFields={setVisibleFields}
          setCustomFields={setCustomFields}
          activeTimerTaskId={globalActiveTaskId}
          onStartGlobalTimer={onStartGlobalTimer}
          onStopGlobalTimer={onStopGlobalTimer}
        />
      );
    }
    if (view === 'board') {
      return (
        <TaskBoardView
          filteredTasks={filteredTasks}
          members={members}
          workspaces={workspaces}
          {...commonSelection}
          onUpdateTask={onUpdateTask}
          onAddSyncLog={onAddSyncLog}
          triggerToast={viewToast as any}
          boardGroupBy={boardGroupBy}
          setBoardGroupBy={setBoardGroupBy}
          boardSwimlaneBy={boardSwimlaneBy}
          setBoardSwimlaneBy={setBoardSwimlaneBy}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          isSmartSort={sortMode === 'priority'}
          isUrgentNearDueTask={isUrgentNearDueTask}
          isMultiSelectMode={selectedTaskIds.length > 0}
          activeDragId={null}
          activeOverDropId={null}
          cardSize={cardSize}
          setCardSize={setCardSize}
          cardCover={cardCover}
          setCardCover={setCardCover}
          onAddTask={onAddTask as any}
          activeTimerTaskId={globalActiveTaskId}
          onStartGlobalTimer={onStartGlobalTimer}
          onStopGlobalTimer={onStopGlobalTimer}
        />
      );
    }
    if (view === 'gantt') {
      return (
        <TaskGanttView
          filteredTasks={filteredTasks}
          members={members}
          {...commonSelection}
          onUpdateTask={onUpdateTask}
          onAddTask={onAddTask as any}
          onAddSyncLog={onAddSyncLog}
          triggerToast={viewToast}
        />
      );
    }
    return (
      <TaskListView
        filteredTasks={filteredTasks}
        tasks={tasks}
        members={members}
        workspaces={workspaces}
        {...commonSelection}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSyncLog={onAddSyncLog}
        triggerToast={viewToast}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        isSmartSort={sortMode === 'priority'}
        isUrgentNearDueTask={isUrgentNearDueTask}
        isMultiSelectMode={selectedTaskIds.length > 0}
        onAddTask={onAddTask as any}
        setViewType={changeView}
        activeTimerTaskId={globalActiveTaskId}
        onStartGlobalTimer={onStartGlobalTimer}
        onStopGlobalTimer={onStopGlobalTimer}
        onReorderTasks={(ids) => onUpdateTaskOrder?.(activeWorkspaceId, ids)}
      />
    );
  };

  return (
    <section className="task-center flex h-full min-h-0 flex-col overflow-hidden bg-[#f6f7fb] text-slate-950 dark:bg-[#0b0d12] dark:text-white">
      <header className="task-center-header shrink-0 border-b border-slate-200/80 bg-white/95 px-3 pt-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#111318]/95 sm:px-5 sm:pt-4">
        <div className="mx-auto flex w-full max-w-[1960px] flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-white shadow-[0_5px_14px_rgba(79,70,229,.28)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                Task workspace
              </div>
              <h1 className="mt-1 truncate text-xl font-black tracking-[-0.035em] sm:text-2xl">Công việc</h1>
              <p className="mt-0.5 hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">Lập kế hoạch, phối hợp và theo dõi tiến độ trong một luồng duy nhất.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="task-primary-button inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-3.5 text-xs font-extrabold text-white shadow-[0_8px_22px_rgba(79,70,229,.28)] transition hover:-translate-y-0.5 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span>Tạo công việc</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-[1.2fr_repeat(3,minmax(140px,.65fr))]">
            <div className="col-span-2 flex min-h-[68px] items-center justify-between overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-3.5 dark:border-indigo-500/15 dark:from-indigo-500/10 dark:via-white/[0.025] dark:to-violet-500/10 sm:col-span-1 lg:col-span-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-500">Tiến độ tổng</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-2xl font-black tracking-tight">{stats.completion}%</span>
                  <span className="pb-1 text-[10px] font-bold text-slate-500">{stats.completed}/{stats.total} xong</span>
                </div>
              </div>
              <div className="relative grid h-11 w-11 place-items-center rounded-full" style={{ background: `conic-gradient(#4f46e5 ${stats.completion * 3.6}deg, rgba(148,163,184,.18) 0deg)` }}>
                <span className="absolute inset-[5px] rounded-full bg-white dark:bg-[#171922]" />
                <CheckCircle2 className="relative h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            {[
              { label: 'Đang thực hiện', value: stats.active, icon: CircleDot, tone: 'text-blue-600 bg-blue-500/10' },
              { label: 'Sắp đến hạn', value: stats.dueSoon, icon: CalendarClock, tone: 'text-amber-600 bg-amber-500/10' },
              { label: 'Quá hạn / bị chặn', value: `${stats.overdue} / ${stats.blocked}`, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-500/10' },
            ].map((item) => (
              <div key={item.label} className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3.5 dark:border-white/[0.08] dark:bg-white/[0.035]">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.tone}`}><item.icon className="h-4 w-4" /></span>
                <div className="min-w-0"><p className="text-lg font-black leading-none">{item.value}</p><p className="mt-1 truncate text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{item.label}</p></div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5 dark:border-white/[0.06] lg:flex-row lg:items-center lg:justify-between">
            <div className="task-view-dock flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/[0.055]">
              {VIEW_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeView(item.id)}
                  className={`relative flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${view === item.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white'}`}
                >
                  {view === item.id && <motion.span layoutId="task-active-view" className="absolute inset-0 rounded-lg border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.1] dark:bg-white/[0.08]" />}
                  <item.icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:max-w-[760px] lg:justify-end">
              <label className="group relative min-w-0 flex-1 lg:max-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm công việc, tag..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-[11px] font-semibold outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:focus:border-indigo-500/40 dark:focus:bg-white/[0.055]"
                />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200"><X className="h-3 w-3" /></button>}
              </label>

              <div className="relative">
                <button type="button" onClick={() => { setFilterOpen((value) => !value); setSortOpen(false); }} className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition ${activeFilterCount ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300'}`}>
                  <Filter className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Bộ lọc</span>{activeFilterCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[8px] text-white">{activeFilterCount}</span>}
                </button>
                <AnimatePresence>
                  {filterOpen && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: .98 }} className="absolute right-0 z-50 mt-2 w-[min(88vw,340px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-white/[0.1] dark:bg-[#181a21]">
                      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black">Lọc công việc</p><p className="mt-0.5 text-[10px] text-slate-400">Chỉ hiển thị những gì cần tập trung</p></div><button type="button" onClick={resetFilters} className="text-[10px] font-bold text-indigo-600">Đặt lại</button></div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <FilterSelect label="Phạm vi" value={scope} onChange={(value) => setScope(value as ScopeFilter)} options={[['all', 'Tất cả'], ['mine', 'Của tôi'], ['overdue', 'Quá hạn']]} />
                        <FilterSelect label="Trạng thái" value={status} onChange={(value) => setStatus(value as 'all' | TaskStatus)} options={[['all', 'Tất cả'], ...Object.entries(STATUS_LABELS)]} />
                        <FilterSelect label="Ưu tiên" value={priority} onChange={(value) => setPriority(value as 'all' | Priority)} options={[['all', 'Tất cả'], ['urgent', 'Khẩn cấp'], ['high', 'Cao'], ['medium', 'Trung bình'], ['low', 'Thấp']]} />
                        <FilterSelect label="Người phụ trách" value={assigneeId} onChange={setAssigneeId} options={[['all', 'Tất cả'], ...members.map((member) => [member.id, member.name])]} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button type="button" onClick={() => { setSortOpen((value) => !value); setFilterOpen(false); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300">
                  <ArrowDownUp className="h-3.5 w-3.5" /><span className="hidden md:inline">Sắp xếp</span><ChevronDown className="h-3 w-3" />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/[0.1] dark:bg-[#181a21]">
                      {([['priority', 'Ưu tiên thông minh'], ['dueDate', 'Hạn gần nhất'], ['recent', 'Mới tạo gần đây']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => { setSortMode(id); setSortOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-bold ${sortMode === id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]'}`}>{label}{sortMode === id && <Check className="h-3.5 w-3.5" />}</button>)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {(query || activeFilterCount > 0) && (
            <div className="flex items-center justify-between pb-2 text-[10px] font-semibold text-slate-500">
              <span><strong className="text-slate-900 dark:text-white">{filteredTasks.length}</strong> / {tasks.length} công việc phù hợp</span>
              <button type="button" onClick={() => { setQuery(''); resetFilters(); }} className="font-bold text-indigo-600 hover:text-indigo-500">Xóa điều kiện</button>
            </div>
          )}
        </div>
      </header>

      <div className="task-center-content custom-scrollbar min-h-0 flex-1 overflow-auto p-2.5 sm:p-4">
        <div className="mx-auto h-full min-h-[320px] w-full max-w-[1960px]">{renderView()}</div>
      </div>

      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 30, x: '-50%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#151824]/95 backdrop-blur-md border border-slate-200/90 dark:border-white/12 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.6)] max-w-[95vw] overflow-x-auto scrollbar-none select-none text-xs"
          >
            {/* Count */}
            <div className="flex items-center gap-1.5 pl-0.5 pr-1.5 shrink-0">
              <span className="w-5 h-5 rounded-md bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[10.5px] font-black flex items-center justify-center shadow-xs">
                {selectedTaskIds.length}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {l('đã chọn', 'selected')}
              </span>
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />

            {/* Complete */}
            <button
              type="button"
              onClick={completeSelected}
              className="px-2.5 py-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95 shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{l("Hoàn thành", "Complete")}</span>
            </button>

            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />

            {/* Status */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) changeStatusSelected(e.target.value as TaskStatus);
                  e.target.value = '';
                }}
                defaultValue=""
                className="h-7 appearance-none rounded-lg bg-transparent border border-slate-200/80 dark:border-white/10 pl-2.5 pr-7 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] focus:outline-none cursor-pointer transition-colors"
              >
                <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">
                  {l("Trạng thái", "Status")}
                </option>
                <option value="todo" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{l("Cần làm", "To Do")}</option>
                <option value="inprogress" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{l("Đang làm", "In Progress")}</option>
                <option value="review" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{l("Chờ duyệt", "In Review")}</option>
                <option value="completed" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{l("Hoàn thành", "Done")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Priority */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) changePrioritySelected(e.target.value as Task['priority']);
                  e.target.value = '';
                }}
                defaultValue=""
                className="h-7 appearance-none rounded-lg bg-transparent border border-slate-200/80 dark:border-white/10 pl-2.5 pr-7 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] focus:outline-none cursor-pointer transition-colors"
              >
                <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">
                  {l("Ưu tiên", "Priority")}
                </option>
                <option value="urgent" className="bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400">{l("Khẩn cấp", "Urgent")}</option>
                <option value="high" className="bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400">{l("Cao", "High")}</option>
                <option value="medium" className="bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400">{l("Bình thường", "Normal")}</option>
                <option value="low" className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300">{l("Thấp", "Low")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Assign */}
            {members.length > 0 && (
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) assignSelected(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="h-7 appearance-none rounded-lg bg-transparent border border-slate-200/80 dark:border-white/10 pl-2.5 pr-7 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-400">
                    {l("Người phụ trách", "Assignee")}
                  </option>
                  {members.map(m => (
                    <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
            )}

            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />

            {/* Delete */}
            <button
              type="button"
              onClick={deleteSelected}
              title={l("Xóa công việc đã chọn", "Delete selected tasks")}
              className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{l("Xóa", "Delete")}</span>
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={() => setSelectedTaskIds([])}
              aria-label={l("Bỏ chọn", "Deselect")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer transition-colors active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <TaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={async (payload) => {
          await onAddTask({ ...payload, workspaceId: activeWorkspaceId });
          onAddSyncLog(`Created task: "${payload.title}"`);
          triggerToast?.('success', 'Đã tạo công việc', payload.title);
        }}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        activeListId={activeListId}
        members={members}
        customFields={customFields}
        activeWorkspaceId={activeWorkspaceId}
        allTasks={tasks}
        triggerToast={triggerToast}
      />

      {selectedTask && (
        <TaskDetailsPanel
          task={selectedTask}
          members={members}
          workspaces={workspaces}
          spaces={spaces}
          onClose={() => setSelectedTaskId(null)}
          onSelectTask={(t) => setSelectedTaskId(t.id)}
          onUpdateTask={onUpdateTask}
          onCreateTask={onAddTask as any}
          onDeleteTask={(id) => { onDeleteTask(id); setSelectedTaskId(null); }}
          onAddSyncLog={onAddSyncLog}
          triggerToast={viewToast as any}
          onAttachmentUpload={handleAttachmentUpload}
          onAttachmentDelete={(task, attachment) => onUpdateTask({ ...task, attachments: (task.attachments || []).filter((item: any) => item.id !== attachment.id) })}
          onAiSubtasks={handleAiSubtasks}
          aiGenerating={aiGenerating}
          onAiSummary={handleAiSummary}
          isSummarizing={isSummarizing}
          aiSummary={aiSummary}
          allTasks={tasks}
          globalActiveTaskId={globalActiveTaskId}
          globalActiveElapsed={globalActiveElapsed}
          globalIsPaused={globalIsPaused}
          onStartGlobalTimer={onStartGlobalTimer}
          onStopGlobalTimer={onStopGlobalTimer}
          onTogglePauseGlobalTimer={onTogglePauseGlobalTimer}
          visibleFields={visibleFields}
          onToggleFieldVisibility={(field) => setVisibleFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field])}
        />
      )}
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string] | string[]> }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200">
          {options.map(([id, optionLabel]) => <option key={id} value={id}>{optionLabel}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}
