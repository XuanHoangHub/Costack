"use client";

import React, { useState, useRef } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DragStart, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { ChevronDown, Plus, GripVertical, Paperclip, X, MessageSquare, Check, Pin, Edit2, Tag, MoreHorizontal, Play, Pause, Clock, AlertTriangle, Hourglass } from 'lucide-react';
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

const STATUS_META: Record<TaskStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
  todo: { label: 'TO DO', dot: 'bg-slate-400', bg: 'bg-slate-50/80 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
  inprogress: { label: 'IN PROGRESS', dot: 'bg-amber-500', bg: 'bg-amber-50/80 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  review: { label: 'UNDER REVIEW', dot: 'bg-cyan-500', bg: 'bg-cyan-50/80 dark:bg-cyan-950/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  completed: { label: 'COMPLETED', dot: 'bg-emerald-500', bg: 'bg-emerald-50/80 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
};

const PRIORITY_LEFT_BORDER: Record<Priority, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-400',
  low: 'border-l-slate-300 dark:border-l-slate-600',
};

const STATUS_LEFT_BORDER: Record<TaskStatus, string> = {
  todo: 'border-l-slate-300 dark:border-l-slate-600',
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
}

const TaskListView = React.memo(function TaskListView({
   filteredTasks, tasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
   onUpdateTask, onAddSyncLog, triggerToast, filterTag, setFilterTag, isSmartSort, isUrgentNearDueTask,
   isMultiSelectMode, onAddTask, setViewType, statuses,
   activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer
 }: TaskListViewProps) {
  const { t } = useTranslation();
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
    window.addEventListener('avaxa-field-config-changed', reloadMeta);
    return () => window.removeEventListener('avaxa-field-config-changed', reloadMeta);
  }, []);

  const dynamicStatusMeta = React.useMemo(() => {
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

  const dynamicStatusBorders = React.useMemo(() => {
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

  // Helper to build recursive tree inside each group
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

  const getProgress = (t: Task) => {
    const children = filteredTasks.filter(c => c.parentId === t.id);
    if (children.length > 0) {
      const completed = children.filter(c => c.status === 'completed').length;
      return Math.round((completed / children.length) * 100);
    }
    return t.progress || 0;
  };

  const hasSubtasksOrChildren = (t: Task) => {
    const hasChildren = filteredTasks.some(c => c.parentId === t.id);
    const hasChecklist = t.subtasks && t.subtasks.length > 0;
    return hasChildren || hasChecklist;
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
    if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, cls: 'text-rose-650 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_10px_rgba(239,68,68,0.12)]' };
    if (diff === 0) return { text: 'Today', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 font-black' };
    if (diff === 1) return { text: 'Tomorrow', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20' };
    return { text: `${diff}d`, cls: 'text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50' };
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
    }
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-1">
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

        // Determine header gradient background mapping based on status type
        const headerBgGradient = 
          statusItem.id === 'todo' ? 'bg-gradient-to-r from-slate-100/80 to-transparent dark:from-slate-900/60 dark:to-transparent' :
          statusItem.id === 'inprogress' ? 'bg-gradient-to-r from-amber-500/10 to-transparent dark:from-amber-500/5 dark:to-transparent' :
          statusItem.id === 'review' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent dark:from-cyan-500/5 dark:to-transparent' :
          statusItem.id === 'completed' ? 'bg-gradient-to-r from-emerald-500/10 to-transparent dark:from-emerald-500/5 dark:to-transparent' :
          'bg-gradient-to-r from-slate-100/80 to-transparent dark:from-slate-900/60 dark:to-transparent';

        return (
          <div key={statusItem.id} className="rounded-xl mb-4">
            {/* Group Header */}
            <button onClick={() => toggleGroup(statusItem.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 ${headerBgGradient} hover:from-slate-200/40 dark:hover:from-slate-800/50 border border-slate-200/30 dark:border-slate-800/30 rounded-xl cursor-pointer select-none transition-all group mb-2.5 shadow-3xs`}>
              <span className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </span>
              {statusItem.color && !standardMeta ? (
                <span className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: statusItem.color }} />
              ) : (
                <span className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)] ${meta.dot}`} />
              )}
              <span className={`text-[10.5px] font-black uppercase tracking-widest ${meta.text}`}>{meta.label}</span>
              <span className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/20 leading-none">{groupTasks.length}</span>
            </button>

            {/* Tasks */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <StrictModeDroppable droppableId={statusItem.id} type="task">
                    {(provided: DroppableProvided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[4px]">
                        {buildGroupTree(groupTasks).map(({ task, depth }, index) => {
                          const assignee = members.find(m => m.id === task.assigneeId);
                          const daysInfo = getDaysText(task.dueDate);
                          const isSelected = selectedTaskIds.includes(task.id);

                          return (
                            <DraggableCast key={task.id} draggableId={`task_list_item_${task.id}`} index={index}>
                              {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                                    style={{ ...dragProvided.draggableProps?.style, transition: dragSnapshot.isDragging ? 'none' : dragProvided.draggableProps?.style?.transition }}>
                                    <motion.div onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
                                      {...(dragProvided.dragHandleProps as any)}
                                      whileHover={{ x: 2, borderRightColor: 'rgba(99, 102, 241, 0.1)', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}
                                      className={`flex items-center gap-3 px-4 py-2.5 border-l-[3.5px] border border-slate-200/30 dark:border-slate-800/30 rounded-xl ${dynamicStatusBorders[task.status] || STATUS_LEFT_BORDER[task.status]} cursor-grab active:cursor-grabbing transition-all group/row hover:bg-slate-50/50 dark:hover:bg-slate-850/20 hover:shadow-xs ${isSelected ? 'bg-indigo-50/20 dark:bg-indigo-955/15' : 'bg-white dark:bg-slate-900/50'} ${dragSnapshot.isDragging ? 'shadow-lg bg-white dark:bg-slate-900 z-50 opacity-95 cursor-grabbing' : 'mb-1.5'}`}>

                                     {/* Render visual indentation and connector lines */}
                                     {depth > 0 && (
                                       <div className="flex items-center shrink-0" style={{ paddingLeft: `${(depth - 1) * 20}px` }}>
                                         <div className="relative h-6 w-5 flex items-center justify-center shrink-0">
                                           {/* Horizontal connector line */}
                                           <div className="absolute top-[11px] left-[4px] w-3 h-[1.5px] bg-slate-200 dark:bg-slate-700/60 rounded" />
                                           {/* Vertical connector line */}
                                           <div className="absolute top-0 bottom-0 left-[4px] w-[1.5px] bg-slate-200 dark:bg-slate-700/60" />
                                         </div>
                                       </div>
                                     )}

                                     {/* Subtask Dropdown expand arrow */}
                                     {filteredTasks.some(c => c.parentId === task.id) ? (
                                       <button 
                                         type="button"
                                         onClick={e => { e.stopPropagation(); toggleSubtaskExpand(task.id); }}
                                         className={`p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-805 text-slate-400 hover:text-slate-655 transition-all shrink-0 ${
                                           expandedSubtaskTaskIds.includes(task.id) ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
                                         }`}
                                       >
                                         <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSubtaskTaskIds.includes(task.id) ? '' : '-rotate-90'}`} />
                                       </button>
                                     ) : depth > 0 ? (
                                       <div className="w-[18px] h-[18px] shrink-0" />
                                     ) : null}

                                     {/* Checkbox */}
                                     <input type="checkbox" checked={isSelected}
                                       onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                                       onClick={e => e.stopPropagation()}
                                       className={`w-4 h-4 rounded-md border border-slate-200 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 transition-all accent-indigo-600 ${
                                         isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
                                       }`} />

                                     {/* Status select dropdown */}
                                     <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                       <StatusPillSelect value={task.status} onChange={newS => {
                                         onUpdateTask({ ...task, status: newS });
                                         onAddSyncLog(`Status "${task.title}" → ${newS}`);
                                       }} />
                                     </div>

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
                                           ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                                           : 'border-slate-300 dark:border-slate-600 bg-transparent text-transparent hover:border-emerald-500 hover:text-emerald-500'
                                       }`}
                                     >
                                       <Check className={`w-2.5 h-2.5 text-white dark:text-slate-100 transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                                     </motion.button>

                                     {/* Title */}
                                     <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                       {inlineEditTaskId === task.id ? (
                                          <input autoFocus value={inlineEditTitle}
                                            onChange={e => setInlineEditTitle(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') submitInlineEdit(task); if (e.key === 'Escape') setInlineEditTaskId(null); }}
                                            onBlur={() => submitInlineEdit(task)}
                                            className="w-full text-[13px] font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-b-2 border-indigo-500 outline-none py-0.5" />
                                       ) : (
                                          <div className="flex items-center justify-between min-w-0" onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}>
                                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                              <span 
                                                onClick={() => {
                                                  setInlineEditTaskId(task.id);
                                                  setInlineEditTitle(task.title);
                                                }}
                                                className={`text-[13px] font-semibold truncate cursor-pointer hover:text-indigo-650 hover:underline transition-colors ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-505' : 'text-slate-800 dark:text-slate-100'}`}
                                                title="Click to rename task"
                                              >
                                                {task.title}
                                              </span>
                                              {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                                              
                                              {/* Dependency Badges */}
                                              {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                                                <span className="bg-amber-55/80 dark:bg-amber-955/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-650 dark:text-amber-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0" title="Waiting on another task to complete">
                                                  <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                                                  <span>Waiting On</span>
                                                </span>
                                              )}
                                              {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                                                <span className="bg-rose-50/80 dark:bg-rose-955/20 border border-rose-200/50 dark:border-rose-900/30 text-rose-650 dark:text-rose-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0" title="Blocking another task from starting">
                                                  <AlertTriangle className="w-2.5 h-2.5" />
                                                  <span>Blocking</span>
                                                </span>
                                              )}

                                              {activeTimerTaskId === task.id && (
                                                <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-55 dark:bg-rose-955/20 px-1.5 py-0.5 rounded border border-rose-200/40 dark:border-rose-900/30 animate-pulse select-none shrink-0 ml-1">
                                                  <Clock className="w-2.5 h-2.5" /> Ticking
                                                </span>
                                              )}
                                            </div>

                                           {/* Hover Option Buttons */}
                                           <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1.5 transition-all ml-3 shrink-0">
                                             {/* Time Tracking */}
                                             {activeTimerTaskId === task.id ? (
                                               <button 
                                                 onClick={e => {
                                                   e.stopPropagation();
                                                   if (onStopGlobalTimer) onStopGlobalTimer();
                                                 }}
                                                 className="p-1 border border-rose-200 dark:border-rose-905/50 rounded bg-rose-50 dark:bg-rose-955/30 shadow-3xs text-rose-605 dark:text-rose-455 hover:bg-rose-100 transition-all cursor-pointer"
                                                 title="Stop Timer"
                                               >
                                                 <Clock className="w-3 h-3 text-rose-500 animate-spin" />
                                               </button>
                                             ) : (
                                               <button 
                                                 onClick={e => {
                                                   e.stopPropagation();
                                                   if (onStartGlobalTimer) onStartGlobalTimer(task.id);
                                                 }}
                                                 className="p-1 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-905 shadow-3xs text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                                                 title="Start Timer"
                                               >
                                                 <Play className="w-3 h-3 text-emerald-505 fill-emerald-505" />
                                               </button>
                                             )}

                                             {/* Add Subtask */}
                                             <button 
                                               onClick={e => {
                                                 e.stopPropagation();
                                                 const subTitle = prompt("Enter subtask title:");
                                                 if (subTitle?.trim()) {
                                                   const newSub = { id: `sub-${Date.now()}`, title: subTitle.trim(), completed: false };
                                                   onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                                                   if (triggerToast) triggerToast('success', 'Subtask Added', `Added subtask to "${task.title}"`);
                                                 }
                                               }}
                                               className="p-1 border border-slate-255 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-3xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                                               title="Add Subtask"
                                             >
                                               <Plus className="w-3 h-3" />
                                             </button>

                                             {/* Add Tag */}
                                             <button 
                                               onClick={e => {
                                                 e.stopPropagation();
                                                 const newTag = prompt("Enter tag name:");
                                                 if (newTag?.trim()) {
                                                   const currentTags = task.tags || [];
                                                   if (!currentTags.includes(newTag.trim())) {
                                                     onUpdateTask({ ...task, tags: [...currentTags, newTag.trim()] });
                                                   }
                                                 }
                                               }}
                                               className="p-1 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-3xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                                               title="Add Tag"
                                             >
                                               <Tag className="w-3 h-3" />
                                             </button>

                                             {/* Rename */}
                                             <button 
                                               onClick={e => {
                                                 e.stopPropagation();
                                                 setInlineEditTaskId(task.id);
                                                 setInlineEditTitle(task.title);
                                               }}
                                               className="p-1 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-3xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-855 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                                               title="Rename Task"
                                             >
                                               <Edit2 className="w-3 h-3" />
                                             </button>
                                           </div>
                                         </div>
                                       )}
                                     </div>

                                     {/* Space label */}
                                     {(() => {
                                       const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                                       return ws ? (
                                         <span className="hidden sm:inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded select-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400">
                                           {ws.name}
                                         </span>
                                       ) : null;
                                     })()}

                                     {/* Tags */}
                                     <div className="hidden lg:flex items-center gap-1 shrink-0">
                                       {task.tags?.slice(0, 2).map(tag => (
                                         <span key={tag} onClick={e => { e.stopPropagation(); setFilterTag(filterTag === tag ? 'all' : tag); }}
                                           className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${filterTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-105 dark:bg-slate-800 text-slate-550 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-955/30'}`}>
                                           #{tag}
                                         </span>
                                       ))}
                                     </div>
                                     {/* Assignee select dropdown */}
                                     <div className="shrink-0" onClick={e => e.stopPropagation()}>
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

                                     {/* Start Date picker */}
                                     <div className="shrink-0 hidden lg:block" onClick={e => e.stopPropagation()}>
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
                                         label="Start" 
                                         align="right" 
                                         className="text-[10px] text-slate-300 dark:text-slate-600 cursor-pointer border-0 bg-transparent"
                                       />
                                     </div>
 
                                     {/* Due Date picker */}
                                     <div className="shrink-0 text-right" onClick={e => e.stopPropagation()}>
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
                                         label="Due" 
                                         align="right" 
                                         className={daysInfo ? `text-[10px] font-bold px-1.5 py-0.5 rounded border-0 cursor-pointer select-none transition-all ${daysInfo.cls}` : "text-[10px] text-slate-350 dark:text-slate-600 cursor-pointer border-0 bg-transparent"} 
                                       />
                                     </div>

                                     {/* Meta icons */}
                                     <div className="hidden md:flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-slate-500">
                                       {hasSubtasksOrChildren(task) && (
                                         <span className="text-[9px] font-bold flex items-center gap-0.5">
                                           <Check className="w-3 h-3" />
                                           {task.subtasks && task.subtasks.length > 0 ? (
                                             `${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}`
                                           ) : (
                                             `${filteredTasks.filter(c => c.parentId === task.id && c.status === 'completed').length}/${filteredTasks.filter(c => c.parentId === task.id).length}`
                                           )}
                                         </span>
                                       )}
                                       {(task.comments?.length || 0) > 0 && (
                                         <span className="text-[9px] font-bold flex items-center gap-0.5">
                                           <MessageSquare className="w-3 h-3" />
                                           {task.comments?.length}
                                         </span>
                                       )}
                                       {(task.attachments?.length || 0) > 0 && (
                                         <Paperclip className="w-3 h-3" />
                                       )}
                                     </div>

                                     {/* Priority inline */}
                                     <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                       <PriorityPillSelect value={task.priority} onChange={newP => {
                                         onUpdateTask({ ...task, priority: newP || 'medium' });
                                         onAddSyncLog(`Priority "${task.title}" → ${newP || 'medium'}`);
                                       }} />
                                     </div>

                                     {/* Far Right Settings */}
                                     <div className="shrink-0 relative w-6 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                       <button 
                                         onClick={() => setSelectedTask(task)}
                                         className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-202 transition-all cursor-pointer"
                                         title="Task Options"
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

                   {/* Inline Add */}
                   <div className="px-4 py-1.5">
                     {inlineAddingStatus === statusItem.id ? (
                       <div className="flex items-center gap-2">
<input autoFocus value={inlineAddingTitle}
                            onChange={e => setInlineAddingTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleInlineAdd(statusItem.id); if (e.key === 'Escape') { setInlineAddingStatus(null); setInlineAddingTitle(''); } }}
                            placeholder={t('inlineAddTitlePlaceholder')}
                            className="flex-1 text-[12px] font-medium text-slate-800 dark:text-slate-100 bg-transparent border-b border-indigo-400 outline-none py-1 placeholder-slate-400" />
<button onClick={() => handleInlineAdd(statusItem.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">{t('inlineAdd')}</button>
                        <button onClick={() => { setInlineAddingStatus(null); setInlineAddingTitle(''); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">{t('inlineCancel')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setInlineAddingStatus(statusItem.id)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors py-1 group">
                        <Plus className="w-3.5 h-3.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        <span>{t('addNewTaskInline')}</span>
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
    </DragDropContext>
   );
});

export default TaskListView;
export { TaskListView };