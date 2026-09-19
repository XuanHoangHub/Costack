"use client";

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot, DragStart } from '@hello-pangea/dnd';
import { 
  ChevronDown, Plus, Paperclip, X, MessageSquare, Check, Pin, Edit2, Tag, 
  MoreHorizontal, Play, Clock, AlertTriangle, Hourglass, Trash2, 
  CheckCircle2, ListChecks, Copy, ChevronsUpDown, Sparkles, Layers, Users, Calendar, Flag, Repeat, GripVertical, FolderInput, CircleDot,
  Share2, Link2, Lock
} from 'lucide-react';
import { Task, TaskStatus, Priority, User, Workspace, Space } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, DropdownFieldSelect } from './TaskSelects';
import { getTaskTeamIds } from '@/lib/teamStore';
import { Select } from '../ui/Select';
import { getStoredStatuses, getStoredPriorities, OptionConfig, getLocalizedOptionLabel, getColorOption } from '../../utils/fieldConfig';
import { fireTaskCompleteConfetti } from '@/lib/confetti';
import { playSuccessSound, playToggleSound } from '@/lib/soundEffects';

const DraggableCast = Draggable as typeof Draggable;

function StrictModeDroppable({ children, ...props }: { children: (provided: DroppableProvided, snapshot?: any) => React.ReactNode; droppableId: string; type: string }) {
  const [enabled, setEnabled] = useState(false);
  React.useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => { cancelAnimationFrame(animation); setEnabled(false); };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
}

const STATUS_LEFT_BORDER: Record<TaskStatus, string> = {
  todo: 'border-l-slate-400 dark:border-l-slate-600',
  inprogress: 'border-l-amber-500',
  review: 'border-l-cyan-500',
  completed: 'border-l-emerald-500',
};

interface TaskListViewProps {
  filteredTasks: Task[];
  tasks: Task[];
  members: User[];
  workspaces?: Workspace[];
  spaces?: Space[];
  selectedTaskIds: string[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: string, title: string, message: string) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  isSmartSort: boolean;
  isUrgentNearDueTask: (task: Task) => boolean;
  isMultiSelectMode: boolean;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => void;
  setViewType: (view: 'list' | 'board' | 'table' | 'gantt') => void;
  statuses?: { id: string; label: string; color: string; type: TaskStatus }[];
  activeTimerTaskId?: string | null;
  onStartGlobalTimer?: (id: string) => void;
  onStopGlobalTimer?: () => void;
  onReorderTasks?: (orderedIds: string[]) => void;
  openPromptModal?: (config: any) => void;
  openDialog?: (config: any) => void;
  wrapText?: boolean;
  showEmptyStatuses?: boolean;
}

const TaskListView = React.memo(function TaskListView({
  filteredTasks, tasks, members, workspaces = [], spaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast, filterTag, setFilterTag, isSmartSort, isUrgentNearDueTask,
  isMultiSelectMode, onAddTask, setViewType, statuses,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer, onReorderTasks,
  openPromptModal, openDialog,
  wrapText = false, showEmptyStatuses = false
}: TaskListViewProps) {
  const { t, locale } = useTranslation();
  const isVietnamese = locale === 'vi';
  
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [moveTargetSpaceId, setMoveTargetSpaceId] = useState<string>('');
  const [moveTargetListId, setMoveTargetListId] = useState<string>('');

  const handleOpenMoveTask = (task: Task) => {
    setMovingTask(task);
    const initialSpaceId = task.spaceId || spaces[0]?.id || '';
    setMoveTargetSpaceId(initialSpaceId);
    const sp = spaces.find(s => s.id === initialSpaceId);
    setMoveTargetListId(task.listId || sp?.lists?.[0]?.id || '');
  };

  // View density mode: 'comfortable' | 'compact'
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    todo: true, inprogress: true, review: true, completed: true
  });

  const [statusConfigs, setStatusConfigs] = useState<OptionConfig[]>([]);
  const [priorityConfigs, setPriorityConfigs] = useState<OptionConfig[]>([]);

  const reloadMeta = () => {
    setStatusConfigs(getStoredStatuses());
    setPriorityConfigs(getStoredPriorities());
  };

  React.useEffect(() => {
    reloadMeta();
    window.addEventListener('apexa-field-config-changed', reloadMeta);
    return () => window.removeEventListener('apexa-field-config-changed', reloadMeta);
  }, []);

  const dynamicStatusMeta = useMemo(() => {
    const meta: Record<string, any> = {};
    const baseList = statusConfigs.length > 0 ? statusConfigs : [
      { id: 'todo', label: 'TO DO', color: 'slate' },
      { id: 'inprogress', label: 'IN PROGRESS', color: 'amber' },
      { id: 'review', label: 'UNDER REVIEW', color: 'cyan' },
      { id: 'completed', label: 'COMPLETED', color: 'emerald' }
    ];
    baseList.forEach(s => {
      const colorMeta = getColorOption(s.color);
      meta[s.id] = {
        label: getLocalizedOptionLabel(s.id, s.label, locale),
        dot: colorMeta.dot,
        bg: colorMeta.bg,
        text: colorMeta.text,
        border: colorMeta.border,
        hex: colorMeta.hex
      };
    });
    return meta;
  }, [locale, statusConfigs]);

  const dynamicStatusBorders = useMemo(() => {
    const borders: Record<string, string> = {};
    const baseList = statusConfigs.length > 0 ? statusConfigs : [
      { id: 'todo', color: 'slate' },
      { id: 'inprogress', color: 'amber' },
      { id: 'review', color: 'cyan' },
      { id: 'completed', color: 'emerald' }
    ];
    baseList.forEach(s => {
      const colorMeta = getColorOption(s.color);
      borders[s.id] = colorMeta.border;
    });
    return borders;
  }, [statusConfigs]);

  const [inlineAddingStatus, setInlineAddingStatus] = useState<string | null>(null);
  const [inlineAddingTitle, setInlineAddingTitle] = useState('');
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [expandedSubtaskTaskIds, setExpandedSubtaskTaskIds] = useState<string[]>([]);
  
  const toggleSubtaskExpand = (taskId: string) => {
    setExpandedSubtaskTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };
  const isDraggingRef = useRef(false);

  // Recursive tree inside each group
  const buildGroupTree = (
    groupNodes: Task[],
    parentId: string | undefined = undefined,
    depth = 0
  ): { task: Task; depth: number }[] => {
    const levelNodes = groupNodes.filter(n => 
      parentId === undefined 
        ? (!n.parentId || !groupNodes.some(parent => parent.id === n.parentId)) 
        : n.parentId === parentId
    );
    
    let result: { task: Task; depth: number }[] = [];
    levelNodes.forEach(node => {
      result.push({ task: node, depth });
      const hasChildren = groupNodes.some(n => n.parentId === node.id);
      const isExpanded = expandedSubtaskTaskIds.includes(node.id);
      
      if (hasChildren && isExpanded) {
        const children = buildGroupTree(groupNodes, node.id, depth + 1);
        result = result.concat(children);
      }
    });
    return result;
  };

  const getSubtasksCount = (t: Task) => {
    if (t.subtasks && t.subtasks.length > 0) {
      const doneCount = t.subtasks.filter(s => s.completed).length;
      return { done: doneCount, total: t.subtasks.length, percent: Math.round((doneCount / t.subtasks.length) * 100) };
    }
    const children = filteredTasks.filter(c => c.parentId === t.id);
    if (children.length > 0) {
      const doneCount = children.filter(c => c.status === 'completed').length;
      return { done: doneCount, total: children.length, percent: Math.round((doneCount / children.length) * 100) };
    }
    return null;
  };

  React.useEffect(() => {
    if (activeDragId) {
      isDraggingRef.current = true;
    } else {
      const timer = setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeDragId]);

  const handleDragStart = (start: DragStart) => {
    setActiveDragId(start.draggableId);
  };

  const toggleGroup = (statusId: string) => {
    setExpandedGroups(prev => ({ ...prev, [statusId]: !prev[statusId] }));
  };

  const toggleAllGroups = () => {
    const anyExpanded = Object.values(expandedGroups).some(v => v);
    const newObj: Record<string, boolean> = {};
    currentStatuses.forEach(s => {
      newObj[s.id] = !anyExpanded;
    });
    setExpandedGroups(newObj);
  };

  const handleInlineAdd = (statusId: string, keepOpen = false) => {
    const trimmed = inlineAddingTitle.trim();
    if (!trimmed) {
      setInlineAddingStatus(null);
      return;
    }
    onAddTask({
      title: trimmed, description: '', priority: 'medium' as Priority, status: statusId as TaskStatus,
      startDate: '', dueDate: '', tags: [], isPinned: false, subtasks: []
    });
    
    const standardLabel = dynamicStatusMeta[statusId]?.label;
    const label = standardLabel || statusId.toUpperCase();
    onAddSyncLog(`Quick added: "${trimmed}" to ${label}`);
    if (triggerToast) triggerToast('success', isVietnamese ? 'Tạo nhanh công việc' : 'Quick task added', `"${trimmed}"`);
    setInlineAddingTitle('');
    if (!keepOpen) {
      setInlineAddingStatus(null);
    }
  };

  const submitInlineEdit = (task: Task) => {
    if (inlineEditTitle.trim() && inlineEditTitle !== task.title) {
      onUpdateTask({ ...task, title: inlineEditTitle.trim() });
      onAddSyncLog(`Renamed: "${inlineEditTitle.trim()}"`);
    }
    setInlineEditTaskId(null);
  };

  const formatCompactDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [dPart, tPart] = dateStr.split('T');
    const parts = dPart.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const currentYear = new Date().getFullYear().toString();
    const dateFormatted = y === currentYear ? `${d}/${m}` : `${d}/${m}/${y.slice(2)}`;
    if (tPart) {
      const timeShort = tPart.slice(0, 5);
      return `${dateFormatted} ${timeShort}`;
    }
    return dateFormatted;
  };

  const getDaysText = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.split('T')[0]); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Quá hạn ${Math.abs(diff)} ngày`, diff, cls: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/90 dark:border-rose-800/60 font-bold' };
    if (diff === 0) return { text: 'Hôm nay', diff, cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 font-black' };
    if (diff === 1) return { text: 'Ngày mai', diff, cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 font-bold' };
    return { text: `${diff} ngày`, diff, cls: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium' };
  };

  const currentStatuses = statuses || [
    { id: 'todo', label: 'CẦN LÀM', color: '#94a3b8', type: 'todo' as TaskStatus },
    { id: 'inprogress', label: 'ĐANG THỰC HIỆN', color: '#f59e0b', type: 'inprogress' as TaskStatus },
    { id: 'review', label: 'CHỜ DUYỆT', color: '#06b6d4', type: 'review' as TaskStatus },
    { id: 'completed', label: 'HOÀN THÀNH', color: '#10b981', type: 'completed' as TaskStatus }
  ];

  const handleDragEnd = (result: DropResult) => {
    setActiveDragId(null);
    if (!result.destination) return;
    const { draggableId, destination, source } = result;
    const taskId = draggableId.replace('task_list_item_', '');
    const newStatus = destination.droppableId;
    const sourceStatus = source.droppableId;

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    if (sourceStatus === newStatus) {
      // Reordering within the same status column
      const groupTasks = filteredTasks.filter(task => task.status === newStatus);
      const groupIds = groupTasks.map(task => task.id);
      const sourceIndex = groupIds.indexOf(taskId);
      if (sourceIndex >= 0) {
        const nextGroupIds = [...groupIds];
        nextGroupIds.splice(sourceIndex, 1);
        nextGroupIds.splice(destination.index, 0, taskId);

        // Update position on each affected task
        nextGroupIds.forEach((id, idx) => {
          const item = tasks.find(t => t.id === id);
          if (item && item.position !== idx) {
            onUpdateTask({ ...item, position: idx });
          }
        });

        const groupSet = new Set(nextGroupIds);
        let groupIndex = 0;
        const orderedIds = filteredTasks.map(task => groupSet.has(task.id) ? nextGroupIds[groupIndex++] : task.id);
        onReorderTasks?.(orderedIds);
      }
    } else {
      // Moving across status columns
      const targetGroupTasks = filteredTasks.filter(task => task.status === newStatus && task.id !== taskId);
      const targetGroupIds = targetGroupTasks.map(task => task.id);
      targetGroupIds.splice(destination.index, 0, taskId);

      // Update the moved task with new status and position
      const updatedTask: Task = { ...taskToUpdate, status: newStatus as TaskStatus, position: destination.index };
      onUpdateTask(updatedTask);
      onAddSyncLog(`Moved task "${taskToUpdate.title}" to status ${newStatus}`);

      // Update positions for other tasks in target group
      targetGroupIds.forEach((id, idx) => {
        if (id === taskId) return;
        const item = tasks.find(t => t.id === id);
        if (item && item.position !== idx) {
          onUpdateTask({ ...item, position: idx });
        }
      });

      const targetGroupSet = new Set(targetGroupIds);
      let targetIndex = 0;
      const orderedIds = filteredTasks
        .filter(t => t.id !== taskId)
        .map(task => targetGroupSet.has(task.id) ? targetGroupIds[targetIndex++] : task.id);
      onReorderTasks?.(orderedIds);
    }
  };

  // Bulk Actions
  const isAllSelected = filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length;
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const isCompact = density === 'compact';
  const totalCompleted = useMemo(() => filteredTasks.filter(t => t.status === 'completed').length, [filteredTasks]);
  const overallPercent = filteredTasks.length > 0 ? Math.round((totalCompleted / filteredTasks.length) * 100) : 0;

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="apexa-space-list relative pb-20 space-y-3 font-sans">
        
        {/* ── Top Utility Toolbar ── */}
        <div className="apexa-list-utility-bar px-3.5 sm:px-6 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAllGroups}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/[0.08] transition-all cursor-pointer select-none"
              title={isVietnamese ? "Đóng / Mở tất cả các nhóm trạng thái" : "Toggle all groups"}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{isVietnamese ? 'Thu gọn / Mở rộng nhóm' : 'Toggle groups'}</span>
            </button>

            {filterTag && filterTag !== 'all' && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs">
                <span>#{filterTag}</span>
                <button 
                  type="button" 
                  onClick={() => setFilterTag('all')} 
                  className="p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800 rounded text-blue-500 hover:text-blue-700 cursor-pointer"
                  title={isVietnamese ? "Bỏ lọc thẻ" : "Clear filter"}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Density Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] select-none">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  !isCompact 
                    ? 'bg-white dark:bg-white/[0.1] text-blue-600 dark:text-sky-300 shadow-xs border border-transparent dark:border-white/10' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={isVietnamese ? "Chế độ vừa phải" : "Comfortable density"}
              >
                {isVietnamese ? 'Thoải mái' : 'Comfortable'}
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  isCompact 
                    ? 'bg-white dark:bg-white/[0.1] text-blue-600 dark:text-sky-300 shadow-xs border border-transparent dark:border-white/10' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={isVietnamese ? "Chế độ thu gọn mật độ cao" : "Compact density"}
              >
                {isVietnamese ? 'Thu gọn' : 'Compact'}
              </button>
            </div>

            {/* Quick Add Task Button */}
            <button
              type="button"
              onClick={() => {
                const firstStatus = currentStatuses[0]?.id || 'todo';
                setInlineAddingStatus(firstStatus);
                setExpandedGroups(prev => ({ ...prev, [firstStatus]: true }));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 select-none"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isVietnamese ? 'Thêm công việc' : 'Add task'}</span>
            </button>
          </div>
        </div>

        {/* ── Sticky Column Header Bar ── */}
        <div className="apexa-list-columns sticky top-0 z-20 bg-white/95 dark:bg-[#090a0f]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] px-3.5 sm:px-6 py-2 select-none transition-all">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            
            {/* Select all checkbox & indentation spacer: w-14 shrink-0 */}
            <div className="w-14 shrink-0 flex items-center justify-start pl-1">
              <input 
                type="checkbox" 
                ref={el => { if (el) el.indeterminate = selectedTaskIds.length > 0 && !isAllSelected; }}
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded cursor-pointer accent-blue-600 transition-all"
                title={isAllSelected ? (isVietnamese ? "Bỏ chọn tất cả" : "Deselect all") : (isVietnamese ? "Chọn tất cả công việc" : "Select all tasks")}
              />
            </div>

            {/* Column Title: Công việc */}
            <div className="flex-1 flex items-center gap-2 min-w-[200px] font-extrabold text-slate-700 dark:text-slate-200">
              <ListChecks className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>{isVietnamese ? 'Công việc' : 'Task'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold tabular-nums">
                {filteredTasks.length}
              </span>

              {/* Overall Progress pill */}
              {filteredTasks.length > 0 && (
                <div className="hidden md:flex items-center gap-2 ml-2 px-2.5 py-0.5 rounded-full bg-blue-50/90 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-[9.5px] font-bold">
                  <span>{totalCompleted}/{filteredTasks.length} {isVietnamese ? 'xong' : 'done'}</span>
                  <div className="w-12 h-1 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 dark:bg-sky-400 rounded-full transition-all duration-500" style={{ width: `${overallPercent}%` }} />
                  </div>
                  <span className="tabular-nums">{overallPercent}%</span>
                </div>
              )}
            </div>

            {/* Column: Trạng thái (Status) */}
            <div className="hidden sm:flex items-center justify-center gap-1 w-28 shrink-0 text-slate-400">
              <CircleDot className="w-3 h-3" />
              <span>{isVietnamese ? 'Trạng thái' : 'Status'}</span>
            </div>

            {/* Column: Không gian (Space) */}
            <div className="hidden xl:flex items-center gap-1 w-24 shrink-0 text-slate-400">
              <Layers className="w-3 h-3" />
              <span>{isVietnamese ? 'Không gian' : 'Space'}</span>
            </div>

            {/* Column: Thẻ Tag */}
            <div className="hidden lg:flex items-center gap-1 w-24 shrink-0 text-slate-400">
              <Tag className="w-3 h-3" />
              <span>{isVietnamese ? 'Thẻ Tag' : 'Tags'}</span>
            </div>

            {/* Column: Thực hiện (Assignee) */}
            <div className="hidden md:flex items-center justify-center gap-1 w-32 shrink-0 text-center text-slate-400">
              <Users className="w-3 h-3" />
              <span>{isVietnamese ? 'Thực hiện' : 'Assignee'}</span>
            </div>

            {/* Column: Bắt đầu (Start Date) */}
            <div className="hidden lg:flex items-center justify-center gap-1 w-24 shrink-0 text-center text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>{isVietnamese ? 'Bắt đầu' : 'Start'}</span>
            </div>

            {/* Column: Hạn chót (Due Date) */}
            <div className="hidden sm:flex items-center justify-center gap-1 w-28 shrink-0 text-center text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{isVietnamese ? 'Hạn chót' : 'Due'}</span>
            </div>

            {/* Column: Ưu tiên (Priority) */}
            <div className="hidden md:flex items-center justify-center gap-1 w-24 shrink-0 text-center text-slate-400">
              <Flag className="w-3 h-3" />
              <span>{isVietnamese ? 'Ưu tiên' : 'Priority'}</span>
            </div>

            {/* Column: Kênh (Platform / Channel - Hình 4) */}
            <div className="hidden sm:flex items-center justify-center gap-1 w-28 shrink-0 text-center text-slate-400">
              <Share2 className="w-3 h-3" />
              <span>{isVietnamese ? 'Kênh' : 'Channel'}</span>
            </div>

            {/* Row Actions spacer: exactly matches w-8 */}
            <div className="w-8 shrink-0" />
          </div>
        </div>

        {/* ── Status Groups ── */}
        <div className="space-y-3">
          {currentStatuses.map(statusItem => {
            const standardMeta = dynamicStatusMeta[statusItem.id];
            const localizedStatusLabel = getLocalizedOptionLabel(statusItem.id, statusItem.label, locale);
            const meta = standardMeta ? { ...standardMeta, label: localizedStatusLabel } : {
              label: localizedStatusLabel.toUpperCase(),
              dot: '',
              bg: 'bg-slate-50/50 dark:bg-slate-800/20',
              text: 'text-slate-700 dark:text-slate-200',
              border: 'border-slate-200 dark:border-slate-700',
              colorStyle: { backgroundColor: statusItem.color }
            };
            const groupTasks = filteredTasks.filter(t => t.status === statusItem.id || t.status === statusItem.type);
            const isFirstStatus = currentStatuses[0]?.id === statusItem.id;
            if (!showEmptyStatuses && groupTasks.length === 0 && (filteredTasks.length > 0 || !isFirstStatus)) return null;
            const isExpanded = expandedGroups[statusItem.id];

            // Completion statistics for group
            const completedCount = groupTasks.filter(t => t.status === 'completed').length;
            const progressPercent = groupTasks.length > 0 ? Math.round((completedCount / groupTasks.length) * 100) : 0;

            return (
              <div key={statusItem.id} data-status={statusItem.id} className="apexa-list-group px-3.5 sm:px-6 py-2 transition-all">
                
                {/* ── Group Header ── */}
                <div className="w-full flex items-center justify-between py-1.5 cursor-pointer select-none transition-all group mb-1.5">
                  <button type="button" className="flex items-center gap-2.5 flex-1 min-w-0 text-left" aria-expanded={isExpanded} onClick={() => toggleGroup(statusItem.id)}>
                    <span className={`p-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all ${isExpanded ? '' : '-rotate-90'}`}>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                    </span>

                    {statusItem.color && !standardMeta ? (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusItem.color }} />
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                    )}

                    <span className={`text-[11px] font-black uppercase tracking-wider ${meta.text}`}>{meta.label}</span>

                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full leading-none">
                      {groupTasks.length}
                    </span>

                    {/* Mini Group Progress Indicator */}
                    {groupTasks.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2 ml-3">
                        <div className="w-16 h-1 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              statusItem.id === 'completed' ? 'bg-emerald-500' :
                              statusItem.id === 'review' ? 'bg-cyan-500' :
                              statusItem.id === 'inprogress' ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                          {progressPercent}%
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Header right controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineAddingStatus(statusItem.id);
                        if (!isExpanded) toggleGroup(statusItem.id);
                      }}
                      className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] px-2 py-1 rounded-md transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>{isVietnamese ? 'Thêm việc' : 'Add task'}</span>
                    </button>
                  </div>
                </div>

                {/* ── Group Tasks Container ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <StrictModeDroppable droppableId={statusItem.id} type="task">
                        {(provided: DroppableProvided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[36px] space-y-1">
                            {groupTasks.length === 0 ? (
                              <div 
                                onClick={() => {
                                  setInlineAddingStatus(statusItem.id);
                                  if (!isExpanded) toggleGroup(statusItem.id);
                                }}
                                className="flex items-center justify-center gap-2 py-3 px-4 my-1 border border-dashed border-slate-200/80 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-400/50 dark:hover:border-sky-500/40 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all cursor-pointer select-none group/empty"
                              >
                                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover/empty:text-blue-600 dark:group-hover/empty:text-sky-400 transition-colors" />
                                <span>{isVietnamese ? `Chưa có việc trong "${meta.label}". Kéo thả vào đây hoặc bấm để thêm mới` : `No tasks in "${meta.label}". Drop here or click to add`}</span>
                              </div>
                            ) : (
                              buildGroupTree(groupTasks).map(({ task, depth }, index) => {
                                const daysInfo = getDaysText(task.dueDate);
                                const isSelected = selectedTaskIds.includes(task.id);
                                const subtasksInfo = getSubtasksCount(task);

                                return (
                                  <DraggableCast key={task.id} draggableId={`task_list_item_${task.id}`} index={index}>
                                    {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                                      <div 
                                        ref={dragProvided.innerRef} 
                                        {...dragProvided.draggableProps}
                                        style={{ 
                                          ...dragProvided.draggableProps?.style, 
                                          transition: dragSnapshot.isDragging ? 'none' : dragProvided.draggableProps?.style?.transition 
                                        }}
                                      >
                                        <motion.div
                                          data-task-row
                                          onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
                                          whileHover={{ y: -0.5 }}
                                          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 ${isCompact ? 'min-h-[34px] py-1' : 'min-h-[42px] py-1.5'} border-l-[3px] border-b border-b-slate-100/80 dark:border-b-white/[0.04] border-t-transparent border-r-transparent rounded-lg ${dynamicStatusBorders[task.status] || STATUS_LEFT_BORDER[task.status]} cursor-pointer transition-all group/row hover:bg-slate-50/90 dark:hover:bg-white/[0.03] ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/25 border-l-blue-600 dark:border-l-sky-400' : 'bg-white/80 dark:bg-white/[0.02]'} ${dragSnapshot.isDragging ? 'shadow-2xl bg-white dark:bg-slate-900 z-50 opacity-95 ring-2 ring-blue-500/40' : ''}`}
                                        >

                                          {/* Left Controls: w-14 shrink-0 */}
                                          <div className="w-14 shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            {/* Drag Handle */}
                                            <div
                                              {...(dragProvided.dragHandleProps as any)}
                                              className="opacity-0 group-hover/row:opacity-100 transition-opacity -ml-1 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
                                              title={isVietnamese ? 'Kéo để đổi vị trí' : 'Drag to reorder'}
                                            >
                                              <GripVertical className="w-3.5 h-3.5" />
                                            </div>

                                            {/* Subtask Tree indentation */}
                                            {depth > 0 && (
                                              <div className="flex items-center shrink-0" style={{ paddingLeft: `${(depth - 1) * 16}px` }}>
                                                <div className="relative h-6 w-3 flex items-center justify-center shrink-0">
                                                  <div className="absolute top-[11px] left-[2px] w-2.5 h-[1.5px] bg-slate-300 dark:bg-slate-700 rounded-full" />
                                                  <div className="absolute top-0 bottom-0 left-[2px] w-[1.5px] bg-slate-300 dark:bg-slate-700" />
                                                </div>
                                              </div>
                                            )}

                                            {/* Subtask Dropdown expand arrow */}
                                            {filteredTasks.some(c => c.parentId === task.id) ? (
                                              <button 
                                                type="button"
                                                onClick={e => { e.stopPropagation(); toggleSubtaskExpand(task.id); }}
                                                className={`p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all shrink-0 ${
                                                  expandedSubtaskTaskIds.includes(task.id) ? 'opacity-100' : 'opacity-60 group-hover/row:opacity-100'
                                                }`}
                                              >
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSubtaskTaskIds.includes(task.id) ? '' : '-rotate-90'}`} />
                                              </button>
                                            ) : depth > 0 ? (
                                              <div className="w-3.5 h-3.5 shrink-0" />
                                            ) : null}

                                            {/* Checkbox */}
                                            <input 
                                              type="checkbox" 
                                              checked={isSelected}
                                              onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                                              className={`w-4 h-4 rounded cursor-pointer shrink-0 accent-blue-600 transition-opacity ${
                                                isSelected ? 'opacity-100' : 'opacity-30 group-hover/row:opacity-100'
                                              }`} 
                                            />

                                            {/* Complete toggle circle button */}
                                            <motion.button
                                              type="button"
                                              whileHover={{ scale: 1.15 }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                                                onUpdateTask({ ...task, status: newStatus as TaskStatus });
                                                onAddSyncLog(`Toggled completion of task "${task.title}" to: ${newStatus}`);
                                                if (newStatus === 'completed') {
                                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                  const origin = {
                                                    x: (rect.left + rect.width / 2) / window.innerWidth,
                                                    y: (rect.top + rect.height / 2) / window.innerHeight,
                                                  };
                                                  fireTaskCompleteConfetti(origin);
                                                  playSuccessSound();
                                                } else {
                                                  playToggleSound();
                                                }
                                              }}
                                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                                task.status === 'completed'
                                                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                                                  : 'border-slate-300 dark:border-slate-600 bg-transparent hover:border-emerald-500 hover:bg-emerald-50/20'
                                              }`}
                                              title={task.status === 'completed' ? (isVietnamese ? 'Đánh dấu chưa hoàn thành' : 'Mark incomplete') : (isVietnamese ? 'Đánh dấu hoàn thành' : 'Mark complete')}
                                            >
                                              <Check className={`w-2.5 h-2.5 text-white transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                                            </motion.button>
                                          </div>

                                          {/* Title & Metadata badges */}
                                          <div className="task-list-title flex-1 min-w-[200px]" onClick={e => e.stopPropagation()}>
                                            {inlineEditTaskId === task.id ? (
                                              <input 
                                                autoFocus 
                                                value={inlineEditTitle}
                                                onChange={e => setInlineEditTitle(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') submitInlineEdit(task); if (e.key === 'Escape') setInlineEditTaskId(null); }}
                                                onBlur={() => submitInlineEdit(task)}
                                                className="w-full text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-2 py-0.5 outline-none focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500/40 shadow-3xs" 
                                              />
                                            ) : (
                                              <div className="flex items-center justify-between min-w-0 gap-2" onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}>
                                                <div className="flex flex-1 items-center gap-2 min-w-0 flex-wrap">
                                                  <span 
                                                    onClick={() => {
                                                      setInlineEditTaskId(task.id);
                                                      setInlineEditTitle(task.title);
                                                    }}
                                                    className={`text-xs font-semibold cursor-pointer hover:text-blue-600 dark:hover:text-sky-400 transition-colors ${
                                                      wrapText ? 'whitespace-normal break-words' : 'truncate'
                                                    } ${
                                                      task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-100'
                                                    }`}
                                                    title={isVietnamese ? "Nhấp để đổi tên nhanh" : "Click to rename"}
                                                  >
                                                    {task.title}
                                                  </span>

                                                  {task.isPinned && (
                                                    <span title={isVietnamese ? 'Đã ghim' : 'Pinned'} className="inline-flex items-center text-amber-500 shrink-0">
                                                      <Pin className="w-3 h-3 text-amber-500 fill-amber-400" />
                                                    </span>
                                                  )}
                                                  {task.isMilestone && (
                                                    <span title={isVietnamese ? 'Cột mốc quan trọng' : 'Project Milestone'} className="inline-flex items-center text-purple-500 shrink-0">
                                                      <Flag className="w-3 h-3 fill-purple-400 text-purple-500" />
                                                    </span>
                                                  )}
                                                  {task.recurrence && task.recurrence.frequency !== 'none' && (
                                                    <span title={isVietnamese ? 'Lặp lại định kỳ' : 'Recurring'} className="inline-flex items-center text-blue-500 shrink-0">
                                                      <Repeat className="w-3 h-3 text-blue-500" />
                                                    </span>
                                                  )}
                                                  
                                                  {/* Dependency Badges */}
                                                  {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                                                    <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0">
                                                      <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                                                      <span>{isVietnamese ? 'Đang chờ' : 'Waiting'}</span>
                                                    </span>
                                                  )}
                                                  {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                                                    <span className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0">
                                                      <AlertTriangle className="w-2.5 h-2.5" />
                                                      <span>{isVietnamese ? 'Đang chặn' : 'Blocking'}</span>
                                                    </span>
                                                  )}

                                                  {/* Subtasks inline badge */}
                                                  {subtasksInfo && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0" title={`Hoàn thành ${subtasksInfo.done}/${subtasksInfo.total} subtasks (${subtasksInfo.percent}%)`}>
                                                      <ListChecks className="w-3 h-3 text-blue-500" />
                                                      <span>{subtasksInfo.done}/{subtasksInfo.total}</span>
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Hover Action Shortcuts Toolbar */}
                                                <div className="hidden lg:flex opacity-0 group-hover/row:opacity-100 items-center gap-0.5 transition-all ml-2 shrink-0 bg-white/95 dark:bg-slate-800/95 p-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] shadow-xs backdrop-blur-md">
                                                  {/* Quick Subtask */}
                                                  <button 
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      if (openPromptModal) {
                                                        openPromptModal({
                                                          type: 'subtask',
                                                          title: isVietnamese ? 'Thêm việc phụ (Subtask)' : 'Add subtask',
                                                          subtitle: `${task.title}`,
                                                          placeholder: isVietnamese ? 'Nhập tên việc phụ...' : 'Enter subtask name...',
                                                          confirmText: isVietnamese ? 'Thêm việc phụ' : 'Add subtask',
                                                          onConfirm: (subTitle: string) => {
                                                            if (subTitle?.trim()) {
                                                              const newSub = { id: `sub-${Date.now()}`, title: subTitle.trim(), completed: false };
                                                              onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                                                              if (triggerToast) triggerToast('success', isVietnamese ? 'Việc phụ' : 'Subtask', `"${subTitle.trim()}"`);
                                                            }
                                                          }
                                                        });
                                                      }
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                                    title={isVietnamese ? "Thêm subtask" : "Add subtask"}
                                                  >
                                                    <Plus className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Quick Tag */}
                                                  <button 
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      if (openPromptModal) {
                                                        openPromptModal({
                                                          type: 'tag',
                                                          title: isVietnamese ? 'Thêm thẻ tag' : 'Add tag',
                                                          subtitle: `${task.title}`,
                                                          placeholder: isVietnamese ? 'Nhập tên thẻ tag...' : 'Enter tag...',
                                                          confirmText: isVietnamese ? 'Thêm thẻ' : 'Add tag',
                                                          onConfirm: (newTag: string) => {
                                                            if (newTag?.trim()) {
                                                              const currentTags = task.tags || [];
                                                              if (!currentTags.includes(newTag.trim())) {
                                                                onUpdateTask({ ...task, tags: [...currentTags, newTag.trim()] });
                                                              }
                                                            }
                                                          }
                                                        });
                                                      }
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                                    title={isVietnamese ? "Thêm Tag" : "Add Tag"}
                                                  >
                                                    <Tag className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Quick Link / Relations (Hình 4) */}
                                                  <button 
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      setSelectedTask(task);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                                    title={isVietnamese ? "Liên kết & Phụ thuộc" : "Relations & dependencies"}
                                                  >
                                                    <Link2 className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Rename */}
                                                  <button 
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      setInlineEditTaskId(task.id);
                                                      setInlineEditTitle(task.title);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                                    title={isVietnamese ? "Đổi tên" : "Rename"}
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Duplicate */}
                                                  <button 
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      onAddTask({
                                                        ...task,
                                                        title: `${task.title} (Bản sao)`,
                                                        subtasks: (task.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
                                                        tags: task.tags ? [...task.tags] : []
                                                      });
                                                      if (triggerToast) triggerToast('success', isVietnamese ? 'Đã nhân bản' : 'Duplicated', `"${task.title}"`);
                                                      if (onAddSyncLog) onAddSyncLog(`Duplicated task "${task.title}"`);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all cursor-pointer"
                                                    title={isVietnamese ? "Nhân bản công việc" : "Duplicate task"}
                                                  >
                                                    <Copy className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Move Task */}
                                                  <button 
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      handleOpenMoveTask(task);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                                    title={isVietnamese ? "Di chuyển công việc" : "Move task"}
                                                  >
                                                    <FolderInput className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Delete */}
                                                  {onDeleteTask && (
                                                    <button
                                                      type="button"
                                                      onClick={e => {
                                                        e.stopPropagation();
                                                        if (openDialog) {
                                                          openDialog({
                                                            title: isVietnamese ? 'Xóa công việc' : 'Delete task',
                                                            description: isVietnamese ? `Bạn có chắc chắn muốn xóa công việc "${task.title}"?` : `Delete task "${task.title}"?`,
                                                            itemName: task.title,
                                                            itemType: 'task',
                                                            confirmText: isVietnamese ? 'Xóa công việc' : 'Delete',
                                                            onConfirm: () => {
                                                              onDeleteTask(task.id);
                                                              if (triggerToast) triggerToast('info', isVietnamese ? 'Đã xóa' : 'Deleted', `"${task.title}"`);
                                                            }
                                                          });
                                                        } else if (confirm(`Xóa công việc "${task.title}"?`)) {
                                                          onDeleteTask(task.id);
                                                        }
                                                      }}
                                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                                      title={isVietnamese ? "Xóa công việc" : "Delete task"}
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* Status Column */}
                                          <div className="hidden sm:flex w-28 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                            <StatusPillSelect value={task.status} onChange={newS => {
                                              onUpdateTask({ ...task, status: newS });
                                              onAddSyncLog(`Status "${task.title}" → ${newS}`);
                                            }} />
                                          </div>

                                           {/* Space Column */}
                                          <div className="hidden xl:flex w-24 shrink-0 items-center">
                                            {(() => {
                                              const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                                              return ws ? (
                                                <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md select-none bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40 truncate max-w-full">
                                                  {ws.name}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                                              );
                                            })()}
                                          </div>

                                          {/* Tags Column */}
                                          <div className="hidden lg:flex items-center gap-1 w-24 shrink-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                                            {task.tags && task.tags.length > 0 ? (
                                              task.tags.slice(0, 2).map(tag => (
                                                <span 
                                                  key={tag} 
                                                  onClick={e => { e.stopPropagation(); setFilterTag(filterTag === tag ? 'all' : tag); }}
                                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md cursor-pointer transition-colors truncate max-w-[48px] ${
                                                    filterTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                                  }`}
                                                  title={`#${tag}`}
                                                >
                                                  #{tag}
                                                </span>
                                              ))
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  if (openPromptModal) {
                                                    openPromptModal({
                                                      type: 'tag',
                                                      title: isVietnamese ? 'Thêm thẻ tag' : 'Add tag',
                                                      subtitle: `${task.title}`,
                                                      placeholder: isVietnamese ? 'Nhập tên thẻ tag...' : 'Enter tag...',
                                                      confirmText: isVietnamese ? 'Thêm thẻ' : 'Add tag',
                                                      onConfirm: (newTag: string) => {
                                                        if (newTag?.trim()) {
                                                          const currentTags = task.tags || [];
                                                          if (!currentTags.includes(newTag.trim())) {
                                                            onUpdateTask({ ...task, tags: [...currentTags, newTag.trim()] });
                                                          }
                                                        }
                                                      }
                                                    });
                                                  }
                                                }}
                                                className="opacity-0 group-hover/row:opacity-100 text-[10px] text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-sky-400 flex items-center gap-0.5 transition-opacity cursor-pointer"
                                                title={isVietnamese ? 'Thêm thẻ tag' : 'Add tag'}
                                              >
                                                <Tag className="w-2.5 h-2.5" />
                                                <span>+Tag</span>
                                              </button>
                                            )}
                                          </div>

                                          {/* Assignees Column */}
                                          <div className="hidden md:flex w-32 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                            <AssigneePillSelect 
                                              value={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])} 
                                              members={members} 
                                              teamIds={getTaskTeamIds(task)}
                                              onTeamChange={newTeams => {
                                                const nextTeams = newTeams || [];
                                                onUpdateTask({
                                                  ...task,
                                                  teamIds: nextTeams,
                                                  teamId: nextTeams[0] || undefined,
                                                  custom_fields: {
                                                    ...(task.custom_fields || {}),
                                                    teamIds: nextTeams
                                                  }
                                                });
                                              }}
                                              workspaceId={task.workspaceId}
                                              onChange={newIds => {
                                                const nextIds = newIds || [];
                                                onUpdateTask({ 
                                                  ...task, 
                                                  assigneeIds: nextIds, 
                                                  assigneeId: nextIds[0] || undefined,
                                                  custom_fields: {
                                                    ...(task.custom_fields || {}),
                                                    assigneeIds: nextIds
                                                  }
                                                });
                                                const label = nextIds.length > 0
                                                  ? nextIds.map(id => members.find(m => m.id === id)?.name || id).join(', ')
                                                  : 'Unassigned';
                                                onAddSyncLog(`Assignees "${task.title}" → ${label}`);
                                              }} 
                                              compact={true} 
                                            />
                                          </div>

                                          {/* Start Date Column */}
                                          <div className="hidden lg:flex w-24 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                            <PremiumDatePicker 
                                              startDateValue={task.startDate || ''} 
                                              onStartDateChange={newD => {
                                                onUpdateTask({ ...task, startDate: newD || '' });
                                                onAddSyncLog(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                                              }} 
                                              dateValue={task.startDate || ''}
                                              onChange={newD => {
                                                onUpdateTask({ ...task, startDate: newD || '' });
                                                onAddSyncLog(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                                              }} 
                                              displayLabel={task.startDate ? formatCompactDate(task.startDate) : undefined}
                                              label={isVietnamese ? "Bắt đầu" : "Start"} 
                                              align="center" 
                                              className={
                                                task.startDate
                                                  ? "text-[10px] font-semibold px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 cursor-pointer transition-colors border border-slate-200/60 dark:border-slate-700/60 truncate max-w-full"
                                                  : "text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent"
                                              }
                                            />
                                          </div>

                                          {/* Due Date Column */}
                                          <div className="hidden sm:flex w-28 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                            <PremiumDatePicker 
                                              startDateValue={task.startDate || ''} 
                                              onStartDateChange={newD => {
                                                onUpdateTask({ ...task, startDate: newD || '' });
                                              }} 
                                              dateValue={task.dueDate || ''}
                                              onChange={newD => {
                                                onUpdateTask({ ...task, dueDate: newD || '' });
                                                onAddSyncLog(`Due Date "${task.title}" → ${newD || 'Cleared'}`);
                                              }} 
                                              displayLabel={task.dueDate ? formatCompactDate(task.dueDate) : undefined}
                                              label={isVietnamese ? "Hạn chót" : "Due"} 
                                              align="center" 
                                              className={
                                                task.dueDate
                                                  ? (daysInfo
                                                      ? `text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer select-none transition-all truncate max-w-full ${daysInfo.cls}`
                                                      : 'text-[10px] font-semibold px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer transition-colors truncate max-w-full')
                                                  : 'text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent'
                                              } 
                                            />
                                          </div>

                                          {/* Priority Column */}
                                          <div className="hidden md:flex w-24 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                            <PriorityPillSelect value={task.priority} onChange={newP => {
                                              onUpdateTask({ ...task, priority: newP });
                                              onAddSyncLog(`Priority "${task.title}" → ${newP || 'none'}`);
                                            }} />
                                          </div>

                                          {/* Kênh Column (Hình 4: solid brand color badge with chevron) */}
                                          <div className="hidden sm:flex w-28 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                            <DropdownFieldSelect
                                              value={(task.custom_fields?.['Kênh'] || task.custom_fields?.['Platform'] || '') as string}
                                              options={['Facebook', 'YouTube', 'TikTok', 'Instagram', 'Threads', 'Zalo', 'Website', 'Twitter', 'LinkedIn']}
                                              onChange={(val) => {
                                                const updated = { ...(task.custom_fields || {}), 'Kênh': val };
                                                onUpdateTask({ ...task, custom_fields: updated });
                                                onAddSyncLog?.(`Kênh "${task.title}" → ${val || 'None'}`);
                                              }}
                                              placeholder="—"
                                            />
                                          </div>

                                          {/* Far Right Settings */}
                                          <div className="w-8 shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                            <button 
                                              type="button" 
                                              onClick={() => setSelectedTask(task)}
                                              className="opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
                                              title={isVietnamese ? "Tùy chọn công việc" : "Task options"}
                                            >
                                              <MoreHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </motion.div>
                                      </div>
                                    )}
                                  </DraggableCast>
                                );
                              })
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </StrictModeDroppable>

                      {/* Inline Add Task Form */}
                      <div className="px-2 py-1.5">
                        {inlineAddingStatus === statusItem.id ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-400/40 dark:border-blue-500/30 rounded-xl shadow-xs transition-all animate-in fade-in duration-150">
                            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <input 
                              autoFocus 
                              value={inlineAddingTitle}
                              onChange={e => setInlineAddingTitle(e.target.value)}
                              onKeyDown={e => { 
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleInlineAdd(statusItem.id, true);
                                }
                                if (e.key === 'Escape') { 
                                  setInlineAddingStatus(null); 
                                  setInlineAddingTitle(''); 
                                } 
                              }}
                              placeholder={t('inlineAddTitlePlaceholder') || (isVietnamese ? 'Tên công việc mới... (Nhấn ↵ Enter để tạo liên tục, Esc để đóng)' : 'New task name... (Press ↵ Enter to add rapidly, Esc to close)')}
                              className="flex-1 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none py-1 placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 font-medium">↵ Enter</span>
                              <button 
                                type="button"
                                onClick={() => handleInlineAdd(statusItem.id, false)} 
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer shadow-xs active:scale-95 transition-all"
                              >
                                {t('inlineAdd') || (isVietnamese ? 'Tạo mới' : 'Add')}
                              </button>
                              <button 
                                type="button"
                                onClick={() => { setInlineAddingStatus(null); setInlineAddingTitle(''); }} 
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title={isVietnamese ? "Hủy (Esc)" : "Cancel (Esc)"}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => {
                              setInlineAddingStatus(statusItem.id);
                              if (!isExpanded) toggleGroup(statusItem.id);
                            }}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 cursor-pointer transition-all py-1.5 px-3 rounded-xl border border-dashed border-slate-200/80 dark:border-white/[0.08] hover:border-blue-400/50 dark:hover:border-sky-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 group w-full select-none"
                          >
                            <div className="w-4.5 h-4.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-150">
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span>{isVietnamese ? `+ Thêm công việc vào ${meta.label}` : `+ Add task to ${meta.label}`}</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        {/* Quick Move Task Modal */}
        {movingTask && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-5 max-w-md w-full space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <FolderInput className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isVietnamese ? 'Di chuyển công việc' : 'Move Task'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                      {movingTask.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMovingTask(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isVietnamese ? 'Chọn không gian làm việc đích' : 'Select target space'}
                  </label>
                  <select
                    value={moveTargetSpaceId}
                    onChange={(e) => {
                      const nextSpaceId = e.target.value;
                      setMoveTargetSpaceId(nextSpaceId);
                      const targetSp = spaces.find(s => s.id === nextSpaceId);
                      setMoveTargetListId(targetSp?.lists?.[0]?.id || '');
                    }}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {spaces && spaces.length > 0 ? (
                      spaces.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    ) : (
                      <option value="">{isVietnamese ? 'Không có không gian' : 'No spaces'}</option>
                    )}
                  </select>
                </div>

                {(() => {
                  const targetSp = spaces?.find(s => s.id === moveTargetSpaceId);
                  if (!targetSp || !targetSp.lists || targetSp.lists.length === 0) return null;
                  return (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isVietnamese ? 'Chọn danh sách đích' : 'Select target list'}
                      </label>
                      <select
                        value={moveTargetListId}
                        onChange={(e) => setMoveTargetListId(e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{isVietnamese ? '-- Không chọn danh sách (Toàn không gian) --' : '-- No list (Entire space) --'}</option>
                        {targetSp.lists.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMovingTask(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetSp = spaces.find(s => s.id === moveTargetSpaceId);
                    onUpdateTask({
                      ...movingTask,
                      spaceId: moveTargetSpaceId,
                      workspaceId: (targetSp as any)?.workspaceId || movingTask.workspaceId,
                      listId: moveTargetListId || undefined,
                    });
                    if (onAddSyncLog) onAddSyncLog(`Moved task "${movingTask.title}" to ${targetSp?.name || 'new space'}`);
                    if (triggerToast) triggerToast('success', isVietnamese ? 'Đã di chuyển công việc' : 'Task moved', `${movingTask.title} → ${targetSp?.name || ''}`);
                    setMovingTask(null);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {isVietnamese ? 'Xác nhận di chuyển' : 'Confirm move'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
});

export default TaskListView;
export { TaskListView };
