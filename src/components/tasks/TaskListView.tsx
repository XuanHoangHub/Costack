"use client";

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot, DragStart } from '@hello-pangea/dnd';
import { 
  ChevronDown, Plus, Paperclip, X, MessageSquare, Check, Pin, Edit2, Tag, 
  MoreHorizontal, Play, Clock, AlertTriangle, Hourglass, Trash2, 
  CheckCircle2, ListChecks, Copy, ChevronsUpDown, Sparkles, Layers, Users, Calendar, Flag, Repeat, GripVertical
} from 'lucide-react';
import { Task, TaskStatus, Priority, User, Workspace } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker } from './TaskSelects';
import { Select } from '../ui/Select';
import { getStoredStatuses, getStoredPriorities, OptionConfig, getLocalizedOptionLabel, getColorOption } from '../../utils/fieldConfig';

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
}

const TaskListView = React.memo(function TaskListView({
  filteredTasks, tasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast, filterTag, setFilterTag, isSmartSort, isUrgentNearDueTask,
  isMultiSelectMode, onAddTask, setViewType, statuses,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer, onReorderTasks,
  openPromptModal, openDialog
}: TaskListViewProps) {
  const { t, locale } = useTranslation();
  const isVietnamese = locale === 'vi';
  
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
  const [bulkStatusValue, setBulkStatusValue] = useState<TaskStatus | undefined>(undefined);
  const [bulkPriorityValue, setBulkPriorityValue] = useState<Priority | undefined>(undefined);
  
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

  const handleInlineAdd = (statusId: string) => {
    if (!inlineAddingTitle.trim()) return;
    onAddTask({
      title: inlineAddingTitle.trim(), description: '', priority: 'medium' as Priority, status: statusId as TaskStatus,
      startDate: '', dueDate: '', tags: [], isPinned: false, subtasks: []
    });
    
    const standardLabel = dynamicStatusMeta[statusId]?.label;
    const label = standardLabel || statusId.toUpperCase();
    onAddSyncLog(`Quick added: "${inlineAddingTitle.trim()}" to ${label}`);
    if (triggerToast) triggerToast('success', 'Tạo nhanh công việc', `Đã thêm "${inlineAddingTitle.trim()}"`);
    setInlineAddingTitle('');
    setInlineAddingStatus(null);
  };

  const submitInlineEdit = (task: Task) => {
    if (inlineEditTitle.trim() && inlineEditTitle !== task.title) {
      onUpdateTask({ ...task, title: inlineEditTitle.trim() });
      onAddSyncLog(`Renamed: "${inlineEditTitle.trim()}"`);
    }
    setInlineEditTaskId(null);
  };

  const getDaysText = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.split('T')[0]); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Quá hạn ${Math.abs(diff)} ngày`, cls: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-bold' };
    if (diff === 0) return { text: 'Hôm nay', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 font-black shadow-3xs' };
    if (diff === 1) return { text: 'Ngày mai', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 font-bold' };
    return { text: `${diff} ngày`, cls: 'text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 font-medium' };
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
    const { draggableId, destination } = result;
    const taskId = draggableId.replace('task_list_item_', '');
    const newStatus = destination.droppableId;

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (taskToUpdate && taskToUpdate.status !== newStatus) {
      const updatedTask = { ...taskToUpdate, status: newStatus as TaskStatus };
      onUpdateTask(updatedTask);
      onAddSyncLog(`Moved task "${taskToUpdate.title}" to status ${newStatus}`);
    } else if (taskToUpdate && result.source.droppableId === destination.droppableId) {
      const groupIds = filteredTasks.filter(task => task.status === newStatus).map(task => task.id);
      const sourceIndex = groupIds.indexOf(taskId);
      if (sourceIndex >= 0) {
        const nextGroupIds = [...groupIds];
        nextGroupIds.splice(sourceIndex, 1);
        nextGroupIds.splice(destination.index, 0, taskId);
        const groupSet = new Set(nextGroupIds);
        let groupIndex = 0;
        const orderedIds = filteredTasks.map(task => groupSet.has(task.id) ? nextGroupIds[groupIndex++] : task.id);
        onReorderTasks?.(orderedIds);
      }
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

  const handleBulkComplete = () => {
    selectedTaskIds.forEach(id => {
      const t = tasks.find(item => item.id === id);
      if (t) onUpdateTask({ ...t, status: 'completed' });
    });
    if (triggerToast) triggerToast('success', 'Thao tác hàng loạt', `Đã hoàn thành ${selectedTaskIds.length} công việc`);
    setSelectedTaskIds([]);
  };

  const handleBulkSetStatus = (st: TaskStatus) => {
    selectedTaskIds.forEach(id => {
      const t = tasks.find(item => item.id === id);
      if (t) onUpdateTask({ ...t, status: st });
    });
    if (triggerToast) triggerToast('success', 'Thao tác hàng loạt', `Đã cập nhật trạng thái cho ${selectedTaskIds.length} công việc`);
    setSelectedTaskIds([]);
  };

  const handleBulkSetPriority = (p: Priority) => {
    selectedTaskIds.forEach(id => {
      const t = tasks.find(item => item.id === id);
      if (t) onUpdateTask({ ...t, priority: p });
    });
    if (triggerToast) triggerToast('success', 'Thao tác hàng loạt', `Đã cập nhật độ ưu tiên cho ${selectedTaskIds.length} công việc`);
    setSelectedTaskIds([]);
  };

  const handleBulkDelete = () => {
    if (!onDeleteTask || selectedTaskIds.length === 0) return;
    if (openDialog) {
      openDialog({
        title: 'Xóa công việc hàng loạt',
        description: `Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn? Tất cả các công việc này sẽ bị xóa vĩnh viễn khỏi hệ thống.`,
        itemType: 'task',
        confirmText: `Xóa ${selectedTaskIds.length} việc`,
        onConfirm: () => {
          selectedTaskIds.forEach(id => onDeleteTask(id));
          if (triggerToast) triggerToast('info', 'Xóa hàng loạt', `Đã xóa ${selectedTaskIds.length} công việc`);
          setSelectedTaskIds([]);
        }
      });
    } else if (confirm(`Bạn có chắc muốn xóa ${selectedTaskIds.length} công việc đã chọn?`)) {
      selectedTaskIds.forEach(id => onDeleteTask(id));
      if (triggerToast) triggerToast('info', 'Xóa hàng loạt', `Đã xóa ${selectedTaskIds.length} công việc`);
      setSelectedTaskIds([]);
    }
  };

  const isCompact = density === 'compact';
  const totalCompleted = useMemo(() => filteredTasks.filter(t => t.status === 'completed').length, [filteredTasks]);
  const overallPercent = filteredTasks.length > 0 ? Math.round((totalCompleted / filteredTasks.length) * 100) : 0;

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="apexa-space-list relative pb-20 space-y-3 font-sans">
        
        {/* ── Sticky Column Header Bar ── */}
        <div className="apexa-list-columns sticky top-0 z-20 bg-white/95 dark:bg-[#07080c]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-white/[0.06] px-4 sm:px-6 py-2 flex items-center gap-2 sm:gap-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none transition-all">
          
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 shrink-0">
            <input 
              type="checkbox" 
              ref={el => { if (el) el.indeterminate = selectedTaskIds.length > 0 && !isAllSelected; }}
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded-md cursor-pointer accent-indigo-600 transition-all"
              title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả công việc"}
            />
          </div>

          {/* Toggle All Groups Button */}
          <button
            type="button"
            onClick={toggleAllGroups}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
            title="Đóng / Mở tất cả các nhóm"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Column Titles */}
          <div className="flex-1 flex items-center gap-2 min-w-0 font-extrabold text-slate-700 dark:text-slate-200">
            <ListChecks className="w-3.5 h-3.5 text-indigo-500" />
            <span>Công việc</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
              {filteredTasks.length}
            </span>

            {/* Overall Progress pill */}
            {filteredTasks.length > 0 && (
              <div className="hidden md:flex items-center gap-2 ml-3 px-2.5 py-0.5 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold lowercase">
                <span className="font-bold">{totalCompleted}/{filteredTasks.length} xong</span>
                <div className="w-12 h-1 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500" style={{ width: `${overallPercent}%` }} />
                </div>
                <span>{overallPercent}%</span>
              </div>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1 w-20 shrink-0 text-slate-400">
            <Layers className="w-3 h-3" />
            <span>Không gian</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 w-24 shrink-0 text-slate-400">
            <Tag className="w-3 h-3" />
            <span>Thẻ Tag</span>
          </div>

          <div className="hidden md:flex items-center justify-center gap-1 w-24 shrink-0 text-center text-slate-400">
            <Users className="w-3 h-3" />
            <span>Thực hiện</span>
          </div>

          <div className="hidden lg:flex items-center justify-end gap-1 w-20 shrink-0 text-right text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>Bắt đầu</span>
          </div>

          <div className="hidden sm:flex items-center justify-end gap-1 w-20 shrink-0 text-right text-slate-400">
            <Clock className="w-3 h-3" />
            <span>Hạn chót</span>
          </div>

          <div className="hidden md:flex items-center justify-center gap-1 w-24 shrink-0 text-center text-slate-400">
            <Flag className="w-3 h-3" />
            <span>Ưu tiên</span>
          </div>

          {/* Density switcher */}
          <div className="hidden sm:flex shrink-0 items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${!isCompact ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Chế độ vừa phải"
            >
              Thoải mái
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${isCompact ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Chế độ thu gọn mật độ cao"
            >
              Thu gọn
            </button>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineAddingStatus(statusItem.id);
                        if (!isExpanded) toggleGroup(statusItem.id);
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] px-2 py-1 rounded-md transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm việc</span>
                    </button>
                  </div>
                </div>

                {/* ── Group Tasks Container ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <StrictModeDroppable droppableId={statusItem.id} type="task">
                        {(provided: DroppableProvided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[4px] space-y-1">
                            {buildGroupTree(groupTasks).map(({ task, depth }, index) => {
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
                                        {...(dragProvided.dragHandleProps as any)}
                                        whileHover={{ y: -1, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
                                        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 ${isCompact ? 'py-1.5' : 'py-2'} border-l-[3px] border border-slate-200/50 dark:border-white/[0.04] rounded-lg ${dynamicStatusBorders[task.status] || STATUS_LEFT_BORDER[task.status]} cursor-grab active:cursor-grabbing transition-all group/row hover:bg-slate-50/80 dark:hover:bg-slate-850/50 ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-white/80 dark:bg-white/[0.02]'} ${dragSnapshot.isDragging ? 'shadow-2xl bg-white dark:bg-slate-900 z-50 opacity-95 ring-2 ring-indigo-500/40' : ''}`}
                                      >

                                        {/* Subtask Tree indentation */}
                                        {depth > 0 && (
                                          <div className="flex items-center shrink-0" style={{ paddingLeft: `${(depth - 1) * 18}px` }}>
                                            <div className="relative h-6 w-4 flex items-center justify-center shrink-0">
                                              <div className="absolute top-[11px] left-[2px] w-3 h-[1.5px] bg-slate-300 dark:bg-slate-700 rounded-full" />
                                              <div className="absolute top-0 bottom-0 left-[2px] w-[1.5px] bg-slate-300 dark:bg-slate-700" />
                                            </div>
                                          </div>
                                        )}

                                        {/* Subtask Dropdown expand arrow */}
                                        {filteredTasks.some(c => c.parentId === task.id) ? (
                                          <button 
                                            type="button"
                                            onClick={e => { e.stopPropagation(); toggleSubtaskExpand(task.id); }}
                                            className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all shrink-0 ${
                                              expandedSubtaskTaskIds.includes(task.id) ? 'opacity-100' : 'opacity-60 group-hover/row:opacity-100'
                                            }`}
                                          >
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSubtaskTaskIds.includes(task.id) ? '' : '-rotate-90'}`} />
                                          </button>
                                        ) : depth > 0 ? (
                                          <div className="w-4 h-4 shrink-0" />
                                        ) : null}

                                        {/* Checkbox */}
                                        <input 
                                          type="checkbox" 
                                          checked={isSelected}
                                          onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                                          onClick={e => e.stopPropagation()}
                                          className={`w-4 h-4 rounded-md cursor-pointer shrink-0 transition-opacity ${
                                            isSelected ? 'opacity-100' : 'opacity-40 group-hover/row:opacity-100'
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
                                            if (typeof window !== 'undefined') {
                                              (window as any).playSystemSound?.('toggle');
                                            }
                                          }}
                                          className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                            task.status === 'completed'
                                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                                              : 'border-slate-300 dark:border-slate-600 bg-transparent hover:border-emerald-500 hover:bg-emerald-50/20'
                                          }`}
                                          title={task.status === 'completed' ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                                        >
                                          <Check className={`w-2.5 h-2.5 text-white transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                                        </motion.button>

                                        {/* Status select dropdown */}
                                        <div className="task-list-status shrink-0" onClick={e => e.stopPropagation()}>
                                          <StatusPillSelect value={task.status} onChange={newS => {
                                            onUpdateTask({ ...task, status: newS });
                                            onAddSyncLog(`Status "${task.title}" → ${newS}`);
                                          }} />
                                        </div>

                                        {/* Title & Metadata badges */}
                                        <div className="task-list-title flex-1 min-w-[240px]" onClick={e => e.stopPropagation()}>
                                          {inlineEditTaskId === task.id ? (
                                            <input 
                                              autoFocus 
                                              value={inlineEditTitle}
                                              onChange={e => setInlineEditTitle(e.target.value)}
                                              onKeyDown={e => { if (e.key === 'Enter') submitInlineEdit(task); if (e.key === 'Escape') setInlineEditTaskId(null); }}
                                              onBlur={() => submitInlineEdit(task)}
                                              className="w-full text-[13px] font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b-2 border-indigo-500 outline-none py-0.5" 
                                            />
                                          ) : (
                                            <div className="flex items-center justify-between min-w-0 gap-2" onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}>
                                              <div className="flex flex-1 items-center gap-2 min-w-0 flex-wrap">
                                                <span 
                                                  onClick={() => {
                                                    setInlineEditTaskId(task.id);
                                                    setInlineEditTitle(task.title);
                                                  }}
                                                  className={`text-[13px] font-semibold truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                                                    task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-100'
                                                  }`}
                                                  title="Nhấp để đổi tên nhanh"
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
                                                  <span title={isVietnamese ? 'Lặp lại định kỳ' : 'Recurring'} className="inline-flex items-center text-indigo-500 shrink-0">
                                                    <Repeat className="w-3 h-3 text-indigo-500" />
                                                  </span>
                                                )}
                                                 
                                                {/* Dependency Badges */}
                                                {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                                                  <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0">
                                                    <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                                                    <span>Đang chờ</span>
                                                  </span>
                                                )}
                                                {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                                                  <span className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    <span>Đang chặn</span>
                                                  </span>
                                                )}


                                              </div>

                                              {/* Hover Action Shortcuts Toolbar */}
                                              <div className="hidden lg:flex opacity-0 group-hover/row:opacity-100 items-center gap-1 transition-all ml-2 shrink-0 bg-white/90 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-3xs backdrop-blur-md">

                                                {/* Quick Subtask */}
                                                <button 
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    if (openPromptModal) {
                                                      openPromptModal({
                                                        type: 'subtask',
                                                        title: 'Thêm việc phụ (Subtask)',
                                                        subtitle: `Công việc: ${task.title}`,
                                                        placeholder: 'Nhập tên việc phụ...',
                                                        confirmText: 'Thêm việc phụ',
                                                        onConfirm: (subTitle: string) => {
                                                          if (subTitle?.trim()) {
                                                            const newSub = { id: `sub-${Date.now()}`, title: subTitle.trim(), completed: false };
                                                            onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                                                            if (triggerToast) triggerToast('success', 'Việc phụ', `Đã thêm subtask vào "${task.title}"`);
                                                          }
                                                        }
                                                      });
                                                    } else {
                                                      const subTitle = prompt("Nhập tên việc phụ:");
                                                      if (subTitle?.trim()) {
                                                        const newSub = { id: `sub-${Date.now()}`, title: subTitle.trim(), completed: false };
                                                        onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                                                        if (triggerToast) triggerToast('success', 'Việc phụ', `Đã thêm subtask vào "${task.title}"`);
                                                      }
                                                    }
                                                  }}
                                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer"
                                                  title="Thêm subtask"
                                                >
                                                  <Plus className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Quick Tag */}
                                                <button 
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    if (openPromptModal) {
                                                      openPromptModal({
                                                        type: 'tag',
                                                        title: 'Thêm thẻ tag',
                                                        subtitle: `Gắn nhãn cho: ${task.title}`,
                                                        placeholder: 'Nhập tên thẻ tag...',
                                                        confirmText: 'Thêm thẻ',
                                                        onConfirm: (newTag: string) => {
                                                          if (newTag?.trim()) {
                                                            const currentTags = task.tags || [];
                                                            if (!currentTags.includes(newTag.trim())) {
                                                              onUpdateTask({ ...task, tags: [...currentTags, newTag.trim()] });
                                                            }
                                                          }
                                                        }
                                                      });
                                                    } else {
                                                      const newTag = prompt("Nhập tên thẻ tag:");
                                                      if (newTag?.trim()) {
                                                        const currentTags = task.tags || [];
                                                        if (!currentTags.includes(newTag.trim())) {
                                                          onUpdateTask({ ...task, tags: [...currentTags, newTag.trim()] });
                                                        }
                                                      }
                                                    }
                                                  }}
                                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer"
                                                  title="Thêm Tag"
                                                >
                                                  <Tag className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Rename */}
                                                <button 
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    setInlineEditTaskId(task.id);
                                                    setInlineEditTitle(task.title);
                                                  }}
                                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer"
                                                  title="Đổi tên"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Duplicate */}
                                                <button 
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    onAddTask({
                                                      ...task,
                                                      title: `${task.title} (Bản sao)`,
                                                      subtasks: (task.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
                                                      tags: task.tags ? [...task.tags] : []
                                                    });
                                                    if (triggerToast) triggerToast('success', 'Đã nhân bản', `Đã nhân bản công việc "${task.title}"`);
                                                    if (onAddSyncLog) onAddSyncLog(`Duplicated task "${task.title}"`);
                                                  }}
                                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all cursor-pointer"
                                                  title="Nhân bản công việc"
                                                >
                                                  <Copy className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Delete */}
                                                {onDeleteTask && (
                                                  <button
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      if (openDialog) {
                                                        openDialog({
                                                          title: 'Xóa công việc',
                                                          description: `Bạn có chắc chắn muốn xóa công việc "${task.title}"?`,
                                                          itemName: task.title,
                                                          itemType: 'task',
                                                          confirmText: 'Xóa công việc',
                                                          onConfirm: () => {
                                                            onDeleteTask(task.id);
                                                            if (triggerToast) triggerToast('info', 'Đã xóa', `Đã xóa công việc "${task.title}"`);
                                                          }
                                                        });
                                                      } else if (confirm(`Xóa công việc "${task.title}"?`)) {
                                                        onDeleteTask(task.id);
                                                      }
                                                    }}
                                                    className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                                    title="Xóa công việc"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Space label */}
                                        {(() => {
                                          const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                                          return (
                                            <div className="hidden xl:block w-20 shrink-0">
                                              {ws ? (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg select-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 dark:border-indigo-900/40">
                                                  {ws.name}
                                                </span>
                                              ) : null}
                                            </div>
                                          );
                                        })()}

                                        {/* Tags */}
                                        <div className="hidden lg:flex items-center gap-1 w-24 shrink-0 overflow-hidden">
                                          {task.tags?.slice(0, 2).map(tag => (
                                            <span 
                                              key={tag} 
                                              onClick={e => { e.stopPropagation(); setFilterTag(filterTag === tag ? 'all' : tag); }}
                                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md cursor-pointer transition-colors ${
                                                filterTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                                              }`}
                                            >
                                              #{tag}
                                            </span>
                                          ))}
                                        </div>

                                        {/* Assignees */}
                                        <div className="hidden md:flex w-24 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                          <AssigneePillSelect 
                                            value={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])} 
                                            members={members} 
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

                                        {/* Start Date */}
                                        <div className="hidden lg:block w-20 shrink-0 text-right" onClick={e => e.stopPropagation()}>
                                          <PremiumDatePicker 
                                            startDateValue={task.startDate || ''} 
                                            onStartDateChange={newD => {
                                              onUpdateTask({ ...task, startDate: newD || '' });
                                              onAddSyncLog(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                                            }} 
                                            dateValue={task.dueDate || ''}
                                            onChange={newD => {
                                              onUpdateTask({ ...task, dueDate: newD || '' });
                                              onAddSyncLog(`Due Date "${task.title}" → ${newD || 'Cleared'}`);
                                            }} 
                                            label="Bắt đầu" 
                                            align="right" 
                                            className="text-[10px] text-slate-400 dark:text-slate-500 cursor-pointer border-0 bg-transparent hover:text-slate-700 dark:hover:text-slate-200"
                                          />
                                        </div>

                                        {/* Due Date */}
                                        <div className="hidden sm:block w-20 shrink-0 text-right" onClick={e => e.stopPropagation()}>
                                          <PremiumDatePicker 
                                            startDateValue={task.startDate || ''} 
                                            onStartDateChange={newD => {
                                              onUpdateTask({ ...task, startDate: newD || '' });
                                              onAddSyncLog(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                                            }} 
                                            dateValue={task.dueDate || ''}
                                            onChange={newD => {
                                              onUpdateTask({ ...task, dueDate: newD || '' });
                                              onAddSyncLog(`Due Date "${task.title}" → ${newD || 'Cleared'}`);
                                            }} 
                                            label="Hạn chót" 
                                            align="right" 
                                            className={daysInfo ? `text-[10px] px-1.5 py-0.5 rounded-lg cursor-pointer select-none transition-all ${daysInfo.cls}` : "text-[10px] text-slate-400 dark:text-slate-500 cursor-pointer border-0 bg-transparent hover:text-slate-700 dark:hover:text-slate-200"} 
                                          />
                                        </div>

                                        {/* Subtasks / Comments count metadata */}
                                        {subtasksInfo && (
                                          <div className="hidden md:flex items-center gap-1 shrink-0 text-[9px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md" title={`Hoàn thành ${subtasksInfo.done}/${subtasksInfo.total} subtasks (${subtasksInfo.percent}%)`}>
                                            <ListChecks className="w-3 h-3 text-indigo-500" />
                                            <span>{subtasksInfo.done}/{subtasksInfo.total}</span>
                                          </div>
                                        )}

                                        {/* Priority */}
                                        <div className="hidden md:flex w-24 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                                          <PriorityPillSelect value={task.priority} onChange={newP => {
                                            onUpdateTask({ ...task, priority: newP || 'medium' });
                                            onAddSyncLog(`Priority "${task.title}" → ${newP || 'medium'}`);
                                          }} />
                                        </div>

                                        {/* Far Right Settings */}
                                        <div className="shrink-0 relative w-6 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                          <button 
                                            onClick={() => setSelectedTask(task)}
                                            className="opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
                                            title="Tùy chọn công việc"
                                          >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </motion.div>
                                    </div>
                                  )}
                                </DraggableCast>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </StrictModeDroppable>

                      {/* Inline Add Task Form */}
                      <div className="px-2 py-2">
                        {inlineAddingStatus === statusItem.id ? (
                          <div className="flex items-center gap-2.5 p-2 bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-blue-500/10 dark:from-blue-950/40 dark:via-sky-950/20 dark:to-blue-950/40 border border-blue-500/30 dark:border-sky-500/30 rounded-2xl shadow-md transition-all">
                            <div className="w-6 h-6 rounded-lg bg-blue-600 dark:bg-sky-500 text-white dark:text-zinc-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                              <Plus className="w-4 h-4" />
                            </div>
                            <input 
                              autoFocus 
                              value={inlineAddingTitle}
                              onChange={e => setInlineAddingTitle(e.target.value)}
                              onKeyDown={e => { 
                                if (e.key === 'Enter') handleInlineAdd(statusItem.id); 
                                if (e.key === 'Escape') { setInlineAddingStatus(null); setInlineAddingTitle(''); } 
                              }}
                              placeholder={t('inlineAddTitlePlaceholder') || 'Tên công việc mới... (Nhấn Enter ↵ để tạo, Esc để hủy)'}
                              className="flex-1 text-[13px] font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none py-1 placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                onClick={() => handleInlineAdd(statusItem.id)} 
                                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-zinc-950 text-[11px] font-black cursor-pointer shadow-xs active:scale-95 transition-all"
                              >
                                {t('inlineAdd') || 'Tạo mới'}
                              </button>
                              <button 
                                onClick={() => { setInlineAddingStatus(null); setInlineAddingTitle(''); }} 
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setInlineAddingStatus(statusItem.id)}
                            className="flex items-center gap-2 text-[11.5px] font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-sky-400 cursor-pointer transition-all py-2 px-3.5 rounded-xl border border-dashed border-slate-200/80 dark:border-white/[0.08] hover:border-blue-400/50 dark:hover:border-sky-500/40 hover:bg-blue-50/30 dark:hover:bg-sky-500/5 group w-full"
                          >
                            <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-zinc-800 group-hover:bg-blue-600 dark:group-hover:bg-sky-500 text-slate-500 group-hover:text-white dark:group-hover:text-zinc-950 flex items-center justify-center transition-all duration-200 shadow-3xs">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                            <span>{t('addNewTaskInline') || 'Thêm công việc mới vào ' + meta.label}</span>
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
      </div>
    </DragDropContext>
  );
});

export default TaskListView;
export { TaskListView };
