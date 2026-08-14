"use client";

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot, DragStart } from '@hello-pangea/dnd';
import { 
  ChevronDown, Plus, Paperclip, X, MessageSquare, Check, Pin, Edit2, Tag, 
  MoreHorizontal, Play, Clock, AlertTriangle, Hourglass, Trash2, 
  CheckCircle2, ListChecks, Repeat2
} from 'lucide-react';
import { Task, TaskStatus, Priority, User, Workspace } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker } from './TaskSelects';
import SignedImage from '../SignedImage';
import { getStoredStatuses, getStoredPriorities, OptionConfig } from '../../utils/fieldConfig';

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
}

const TaskListView = React.memo(function TaskListView({
  filteredTasks, tasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast, filterTag, setFilterTag, isSmartSort, isUrgentNearDueTask,
  isMultiSelectMode, onAddTask, setViewType, statuses,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer, onReorderTasks
}: TaskListViewProps) {
  const { t } = useTranslation();
  
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
      { id: 'todo', label: 'TO DO', dot: 'bg-slate-400', bg: 'bg-slate-50/80 dark:bg-slate-800/40', color: 'slate-500' },
      { id: 'inprogress', label: 'IN PROGRESS', dot: 'bg-amber-500', bg: 'bg-amber-50/80 dark:bg-amber-955/20', color: 'amber-500' },
      { id: 'review', label: 'UNDER REVIEW', dot: 'bg-cyan-500', bg: 'bg-cyan-50/80 dark:bg-cyan-955/20', color: 'cyan-500' },
      { id: 'completed', label: 'COMPLETED', dot: 'bg-emerald-500', bg: 'bg-emerald-50/80 dark:bg-emerald-955/20', color: 'emerald-500' }
    ];
    baseList.forEach(s => {
      const c = (s.color || 'slate-500').replace('bg-', '').replace('-500', '').replace('-600', '');
      meta[s.id] = {
        label: s.label,
        dot: s.dot || `bg-${c}-500`,
        bg: s.bg || `bg-${c}-50/80 dark:bg-${c}-955/20`,
        text: `text-${c}-700 dark:text-${c}-400`,
        border: `border-${c}-200 dark:border-${c}-800`
      };
    });
    return meta;
  }, [statusConfigs]);

  const dynamicStatusBorders = useMemo(() => {
    const borders: Record<string, string> = {};
    const baseList = statusConfigs.length > 0 ? statusConfigs : [
      { id: 'todo', color: 'slate-500' },
      { id: 'inprogress', color: 'amber-500' },
      { id: 'review', color: 'cyan-500' },
      { id: 'completed', color: 'emerald-500' }
    ];
    baseList.forEach(s => {
      const c = (s.color || 'slate-500').replace('bg-', '').replace('-500', '').replace('-600', '');
      borders[s.id] = `border-l-${c}-500`;
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

  const handleInlineAdd = (statusId: string) => {
    if (!inlineAddingTitle.trim()) return;
    onAddTask({
      title: inlineAddingTitle.trim(), description: '', priority: 'medium' as Priority, status: statusId as TaskStatus,
      startDate: '', dueDate: '', tags: [], isPinned: false, subtasks: []
    });
    
    const standardLabel = dynamicStatusMeta[statusId]?.label;
    const label = standardLabel || statusId.toUpperCase();
    onAddSyncLog(`Quick added: "${inlineAddingTitle.trim()}" to ${label}`);
    if (triggerToast) triggerToast('success', 'Quick Add', `Added "${inlineAddingTitle.trim()}"`);
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
    if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, cls: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-bold' };
    if (diff === 0) return { text: 'Today', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 font-black shadow-3xs' };
    if (diff === 1) return { text: 'Tomorrow', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20' };
    return { text: `${diff}d`, cls: 'text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50' };
  };

  const currentStatuses = statuses || [
    { id: 'todo', label: 'TO DO', color: '#94a3b8', type: 'todo' as TaskStatus },
    { id: 'inprogress', label: 'IN PROGRESS', color: '#f59e0b', type: 'inprogress' as TaskStatus },
    { id: 'review', label: 'REVIEW', color: '#06b6d4', type: 'review' as TaskStatus },
    { id: 'completed', label: 'DONE', color: '#10b981', type: 'completed' as TaskStatus }
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
      if (triggerToast) {
        triggerToast('success', 'Task Updated', `Moved task to ${newStatus}`);
      }
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
    if (triggerToast) triggerToast('success', 'Bulk Action', `Completed ${selectedTaskIds.length} tasks`);
    setSelectedTaskIds([]);
  };

  const handleBulkSetStatus = (st: TaskStatus) => {
    selectedTaskIds.forEach(id => {
      const t = tasks.find(item => item.id === id);
      if (t) onUpdateTask({ ...t, status: st });
    });
    if (triggerToast) triggerToast('success', 'Bulk Action', `Updated status for ${selectedTaskIds.length} tasks`);
    setSelectedTaskIds([]);
  };

  const handleBulkSetPriority = (p: Priority) => {
    selectedTaskIds.forEach(id => {
      const t = tasks.find(item => item.id === id);
      if (t) onUpdateTask({ ...t, priority: p });
    });
    if (triggerToast) triggerToast('success', 'Bulk Action', `Updated priority for ${selectedTaskIds.length} tasks`);
    setSelectedTaskIds([]);
  };

  const handleBulkDelete = () => {
    if (!onDeleteTask) return;
    if (confirm(`Are you sure you want to delete ${selectedTaskIds.length} selected tasks?`)) {
      selectedTaskIds.forEach(id => onDeleteTask(id));
      if (triggerToast) triggerToast('info', 'Bulk Delete', `Deleted ${selectedTaskIds.length} tasks`);
      setSelectedTaskIds([]);
    }
  };

  const isCompact = density === 'compact';

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative pb-16 space-y-4">
        
        {/* ── Sticky Column Header Row ── */}
        <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#090b10]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xs text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
          
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 shrink-0">
            <input 
              type="checkbox" 
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 transition-all"
              title={isAllSelected ? "Deselect all" : "Select all tasks"}
            />
          </div>

          {/* Column Titles */}
          <div className="flex-1 flex items-center gap-1.5 min-w-0 font-extrabold text-slate-600 dark:text-slate-300">
            <span>Công việc ({filteredTasks.length})</span>
          </div>

          <div className="hidden xl:block w-20 shrink-0 text-slate-400">
            <span>Không gian</span>
          </div>

          <div className="hidden lg:block w-24 shrink-0 text-slate-400">
            <span>Thẻ Tag</span>
          </div>

          <div className="w-24 shrink-0 text-center text-slate-400">
            <span>Thực hiện</span>
          </div>

          <div className="hidden lg:block w-20 shrink-0 text-right text-slate-400">
            <span>Bắt đầu</span>
          </div>

          <div className="w-20 shrink-0 text-right text-slate-400">
            <span>Hạn chót</span>
          </div>

          <div className="w-24 shrink-0 text-center text-slate-400">
            <span>Ưu tiên</span>
          </div>

          {/* Density switcher */}
          <div className="shrink-0 flex items-center bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-300/40 dark:border-slate-700/40">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold transition-all cursor-pointer ${!isCompact ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Chế độ vừa phải"
            >
              Thoải mái
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold transition-all cursor-pointer ${isCompact ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Chế độ thu gọn mật độ cao"
            >
              Thu gọn
            </button>
          </div>
        </div>

        {/* ── Status Groups ── */}
        <div className="space-y-4">
          {currentStatuses.map(statusItem => {
            const standardMeta = dynamicStatusMeta[statusItem.id];
            const meta = standardMeta ? { ...standardMeta, label: statusItem.label } : {
              label: statusItem.label.toUpperCase(),
              dot: '',
              bg: 'bg-slate-50/50 dark:bg-slate-800/20',
              text: 'text-slate-700 dark:text-slate-350',
              border: 'border-slate-200 dark:border-slate-700',
              colorStyle: { backgroundColor: statusItem.color }
            };
            const groupTasks = filteredTasks.filter(t => t.status === statusItem.id || t.status === statusItem.type);
            const isExpanded = expandedGroups[statusItem.id];

            // Completion statistics for group
            const completedCount = groupTasks.filter(t => t.status === 'completed').length;
            const progressPercent = groupTasks.length > 0 ? Math.round((completedCount / groupTasks.length) * 100) : 0;

            // Determine header background based on status
            const headerBgGradient = 
              statusItem.id === 'todo' ? 'bg-gradient-to-r from-slate-100/90 via-slate-50/60 to-transparent dark:from-slate-900/80 dark:via-slate-900/40 dark:to-transparent border-slate-200/60 dark:border-slate-800/60' :
              statusItem.id === 'inprogress' ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent border-amber-200/50 dark:border-amber-900/40' :
              statusItem.id === 'review' ? 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent dark:from-cyan-500/10 dark:via-cyan-500/5 dark:to-transparent border-cyan-200/50 dark:border-cyan-900/40' :
              statusItem.id === 'completed' ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent border-emerald-200/50 dark:border-emerald-900/40' :
              'bg-gradient-to-r from-slate-100/90 to-transparent dark:from-slate-900/80 dark:to-transparent border-slate-200/60 dark:border-slate-800/60';

            return (
              <div key={statusItem.id} className="rounded-2xl border border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/20 p-1.5 transition-all">
                
                {/* ── Group Header ── */}
                <div className={`w-full flex items-center justify-between px-3.5 py-2.5 ${headerBgGradient} border rounded-xl cursor-pointer select-none transition-all group mb-2 shadow-2xs`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => toggleGroup(statusItem.id)}>
                    <span className={`p-1 rounded-lg bg-slate-200/40 dark:bg-slate-800/60 group-hover:bg-slate-300/60 dark:group-hover:bg-slate-700/60 transition-all ${isExpanded ? '' : '-rotate-90'}`}>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
                    </span>

                    {statusItem.color && !standardMeta ? (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.15)]" style={{ backgroundColor: statusItem.color }} />
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.15)] ${meta.dot}`} />
                    )}

                    <span className={`text-[11px] font-black uppercase tracking-widest ${meta.text}`}>{meta.label}</span>

                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-350 bg-white/80 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 shadow-3xs leading-none">
                      {groupTasks.length}
                    </span>

                    {/* Mini Group Progress Indicator */}
                    {groupTasks.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2 ml-4">
                        <div className="w-20 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
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
                  </div>

                  {/* Header right controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineAddingStatus(statusItem.id);
                        if (!isExpanded) toggleGroup(statusItem.id);
                      }}
                      className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white/80 dark:bg-indigo-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-1 rounded-lg transition-all shadow-3xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm nhanh</span>
                    </button>
                  </div>
                </div>

                {/* ── Group Tasks Container ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <StrictModeDroppable droppableId={statusItem.id} type="task">
                        {(provided: DroppableProvided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[8px] space-y-1">
                            
                            {/* Empty Group state */}
                            {groupTasks.length === 0 && (
                              <div className="p-4 border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 rounded-xl text-center flex flex-col items-center justify-center my-1 bg-slate-50/30 dark:bg-slate-900/10">
                                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                                  Chưa có công việc nào trong mục {meta.label}
                                </span>
                                <button
                                  onClick={() => setInlineAddingStatus(statusItem.id)}
                                  className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> + Tạo công việc mới
                                </button>
                              </div>
                            )}

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
                                        onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
                                        {...(dragProvided.dragHandleProps as any)}
                                        whileHover={{ x: 2, boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}
                                        className={`flex items-center gap-3 px-3.5 ${isCompact ? 'py-1.5' : 'py-2.5'} border-l-[4px] border border-slate-200/40 dark:border-slate-800/40 rounded-xl ${dynamicStatusBorders[task.status] || STATUS_LEFT_BORDER[task.status]} cursor-grab active:cursor-grabbing transition-all group/row hover:bg-slate-50/80 dark:hover:bg-slate-850/40 hover:border-slate-300 dark:hover:border-slate-700 ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-955/20 border-indigo-300 dark:border-indigo-800' : 'bg-white dark:bg-[#0b0e14]'} ${dragSnapshot.isDragging ? 'shadow-2xl bg-white dark:bg-slate-900 z-50 opacity-95 ring-2 ring-indigo-500/40' : ''}`}
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
                                            className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all shrink-0 ${
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
                                          className={`w-4 h-4 rounded-md border border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 transition-all accent-indigo-600 ${
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
                                              : 'border-slate-300 dark:border-slate-600 bg-transparent hover:border-emerald-500'
                                          }`}
                                          title={task.status === 'completed' ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                                        >
                                          <Check className={`w-2.5 h-2.5 text-white dark:text-slate-100 transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                                        </motion.button>

                                        {/* Status select dropdown */}
                                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                          <StatusPillSelect value={task.status} onChange={newS => {
                                            onUpdateTask({ ...task, status: newS });
                                            onAddSyncLog(`Status "${task.title}" → ${newS}`);
                                          }} />
                                        </div>

                                        {/* Title & Metadata badges */}
                                        <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
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
                                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
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

                                                {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                                                {task.recurrence?.frequency && task.recurrence.frequency !== 'none' && (
                                                  <span className="flex shrink-0 items-center gap-1 rounded-md border border-indigo-200/60 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-650 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300" title={`Repeats every ${task.recurrence.interval} ${task.recurrence.frequency}`}>
                                                    <Repeat2 className="h-2.5 w-2.5" />
                                                    <span>{task.recurrence.frequency}</span>
                                                  </span>
                                                )}
                                                 
                                                {/* Dependency Badges */}
                                                {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                                                  <span className="bg-amber-50 dark:bg-amber-955/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0">
                                                    <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                                                    <span>Đang chờ</span>
                                                  </span>
                                                )}
                                                {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                                                  <span className="bg-rose-50 dark:bg-rose-955/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    <span>Đang chặn</span>
                                                  </span>
                                                )}

                                                {/* Timer indicator */}
                                                {activeTimerTaskId === task.id && (
                                                  <span className="flex items-center gap-1 text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-955/30 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800/60 animate-pulse shrink-0">
                                                    <Clock className="w-3 h-3 animate-spin text-rose-500" /> Đang bấm giờ
                                                  </span>
                                                )}
                                              </div>

                                              {/* Hover Action Shortcuts Toolbar */}
                                              <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 transition-all ml-2 shrink-0">
                                                {/* Timer toggle */}
                                                {activeTimerTaskId === task.id ? (
                                                  <button 
                                                    onClick={e => { e.stopPropagation(); onStopGlobalTimer?.(); }}
                                                    className="p-1 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 hover:bg-rose-200 transition-all cursor-pointer"
                                                    title="Dừng bấm giờ"
                                                  >
                                                    <Clock className="w-3.5 h-3.5 text-rose-500 animate-spin" />
                                                  </button>
                                                ) : (
                                                  <button 
                                                    onClick={e => { e.stopPropagation(); onStartGlobalTimer?.(task.id); }}
                                                    className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                                                    title="Bắt đầu bấm giờ"
                                                  >
                                                    <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                                                  </button>
                                                )}

                                                {/* Quick Subtask */}
                                                <button 
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    const subTitle = prompt("Nhập tên việc phụ:");
                                                    if (subTitle?.trim()) {
                                                      const newSub = { id: `sub-${Date.now()}`, title: subTitle.trim(), completed: false };
                                                      onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                                                      if (triggerToast) triggerToast('success', 'Việc phụ', `Đã thêm subtask vào "${task.title}"`);
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
                                                    const newTag = prompt("Nhập tên thẻ tag:");
                                                    if (newTag?.trim()) {
                                                      const currentTags = task.tags || [];
                                                      if (!currentTags.includes(newTag.trim())) {
                                                        onUpdateTask({ ...task, tags: [...currentTags, newTag.trim()] });
                                                      }
                                                    }
                                                  }}
                                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-955/40 transition-all cursor-pointer"
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
                                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-955/40 transition-all cursor-pointer"
                                                  title="Đổi tên"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Delete */}
                                                {onDeleteTask && (
                                                  <button
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      if (confirm(`Xóa công việc "${task.title}"?`)) {
                                                        onDeleteTask(task.id);
                                                      }
                                                    }}
                                                    className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/40 transition-all cursor-pointer"
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
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md select-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 dark:border-indigo-900/40">
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
                                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                                filterTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-955/40'
                                              }`}
                                            >
                                              #{tag}
                                            </span>
                                          ))}
                                        </div>

                                        {/* Assignees */}
                                        <div className="w-24 shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
                                          <AssigneePillSelect 
                                            value={task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])} 
                                            members={members} 
                                            onChange={newIds => {
                                              const nextIds = newIds || [];
                                              onUpdateTask({ ...task, assigneeIds: nextIds, assigneeId: nextIds[0] || undefined });
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
                                        <div className="w-20 shrink-0 text-right" onClick={e => e.stopPropagation()}>
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
                                            className={daysInfo ? `text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none transition-all ${daysInfo.cls}` : "text-[10px] text-slate-400 dark:text-slate-500 cursor-pointer border-0 bg-transparent hover:text-slate-700 dark:hover:text-slate-200"} 
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
                                        <div className="w-24 shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
                                          <PriorityPillSelect value={task.priority} onChange={newP => {
                                            onUpdateTask({ ...task, priority: newP || 'medium' });
                                            onAddSyncLog(`Priority "${task.title}" → ${newP || 'medium'}`);
                                          }} />
                                        </div>

                                        {/* Far Right Settings */}
                                        <div className="shrink-0 relative w-6 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                          <button 
                                            onClick={() => setSelectedTask(task)}
                                            className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
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
                          <div className="flex items-center gap-2.5 p-2 bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-indigo-50/90 dark:from-indigo-955/50 dark:via-purple-955/30 dark:to-indigo-955/50 border border-indigo-300 dark:border-indigo-800 rounded-2xl shadow-md transition-all">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
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
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[11px] font-black cursor-pointer shadow-xs active:scale-95 transition-all"
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
                            className="flex items-center gap-2 text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all py-1.5 px-3 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-955/20 group w-full"
                          >
                            <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 text-slate-500 group-hover:text-white flex items-center justify-center transition-all duration-200">
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

        {/* ── Floating Bulk Action Bar ── */}
        <AnimatePresence>
          {selectedTaskIds.length > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl p-3 shadow-2xl flex items-center gap-3 flex-wrap max-w-full"
            >
              <div className="flex items-center gap-2 px-2 py-1 bg-indigo-600/40 border border-indigo-500/50 rounded-xl text-[11px] font-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Đã chọn {selectedTaskIds.length}</span>
              </div>

              <div className="h-4 w-[1px] bg-slate-700" />

              {/* Bulk Mark Complete */}
              <button
                onClick={handleBulkComplete}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Hoàn thành tất cả</span>
              </button>

              {/* Bulk Status */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">Trạng thái:</span>
                <select
                  onChange={(e) => { if (e.target.value) handleBulkSetStatus(e.target.value as TaskStatus); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-[11px] font-bold text-slate-200 outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>-- Chọn --</option>
                  <option value="todo">TO DO</option>
                  <option value="inprogress">IN PROGRESS</option>
                  <option value="review">UNDER REVIEW</option>
                  <option value="completed">COMPLETED</option>
                </select>
              </div>

              {/* Bulk Priority */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">Ưu tiên:</span>
                <select
                  onChange={(e) => { if (e.target.value) handleBulkSetPriority(e.target.value as Priority); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-[11px] font-bold text-slate-200 outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>-- Chọn --</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Bulk Delete */}
              {onDeleteTask && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              )}

              {/* Deselect All */}
              <button
                onClick={() => setSelectedTaskIds([])}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer ml-auto"
                title="Bỏ chọn tất cả"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DragDropContext>
  );
});

export default TaskListView;
export { TaskListView };
