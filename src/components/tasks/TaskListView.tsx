"use client";

import React, { useState, useRef } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DragStart, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { ChevronDown, Plus, GripVertical, Paperclip, MessageSquare, Check, Pin, Edit2, Tag, MoreHorizontal } from 'lucide-react';
import { Task, TaskStatus, Priority, User, Workspace } from '../../types';
import { PriorityPillSelect } from './TaskSelects';
import SignedImage from '../SignedImage';

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
}

export default function TaskListView({
   filteredTasks, tasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
   onUpdateTask, onAddSyncLog, triggerToast, filterTag, setFilterTag, isSmartSort, isUrgentNearDueTask,
   isMultiSelectMode, onAddTask, setViewType, statuses
 }: TaskListViewProps) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    todo: true, inprogress: true, review: true, completed: true
  });
  const [inlineAddingStatus, setInlineAddingStatus] = useState<string | null>(null);
  const [inlineAddingTitle, setInlineAddingTitle] = useState('');
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

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
    
    const standardLabel = STATUS_META[statusId as TaskStatus]?.label;
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
    if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, cls: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' };
    if (diff === 0) return { text: 'Today', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 font-black' };
    if (diff === 1) return { text: 'Tomorrow', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' };
    return { text: `${diff}d`, cls: 'text-slate-500 bg-slate-50 dark:bg-slate-800' };
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
        const standardMeta = STATUS_META[statusItem.id as TaskStatus];
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

        return (
          <div key={statusItem.id} className="rounded-xl overflow-hidden">
            {/* Group Header */}
            <button onClick={() => toggleGroup(statusItem.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 ${meta.bg} border ${meta.border} rounded-xl cursor-pointer select-none transition-all hover:shadow-sm group`}>
              <span className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </span>
              {statusItem.color && !standardMeta ? (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusItem.color }} />
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              )}
              <span className={`text-[11px] font-black uppercase tracking-wider ${meta.text}`}>{meta.label}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-white/60 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-md">{groupTasks.length}</span>
            </button>

            {/* Tasks */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <StrictModeDroppable droppableId={statusItem.id} type="task">
{(provided: DroppableProvided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[4px]">
                          {groupTasks.map((task, index) => {
                            const assignee = members.find(m => m.id === task.assigneeId);
                            const daysInfo = getDaysText(task.dueDate);
                            const isSelected = selectedTaskIds.includes(task.id);

                            return (
                              <DraggableCast key={task.id} draggableId={`task_list_item_${task.id}`} index={index}>
                                {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                                    style={{ ...dragProvided.draggableProps?.style, transition: dragSnapshot.isDragging ? 'none' : dragProvided.draggableProps?.style?.transition }}>
                                    <div onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
                                      className={`flex items-center gap-3 px-4 py-2.5 border-l-[3px] border-b border-b-slate-100 dark:border-b-slate-800/60 ${PRIORITY_LEFT_BORDER[task.priority]} cursor-pointer transition-all group/row hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'bg-white dark:bg-slate-900/60'} ${dragSnapshot.isDragging ? 'shadow-lg bg-white dark:bg-slate-900 rounded-lg z-50 opacity-95' : ''}`}>

                                     {/* Drag handle */}
                                     <div {...dragProvided.dragHandleProps} onClick={e => e.stopPropagation()}
                                       className="p-0.5 text-slate-300 dark:text-slate-600 hover:text-indigo-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                       <GripVertical className="w-3.5 h-3.5" />
                                     </div>

                                     {/* Checkbox */}
                                     <input type="checkbox" checked={isSelected}
                                       onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                                       onClick={e => e.stopPropagation()}
                                       className="w-4 h-4 rounded-sm border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 accent-indigo-600" />

                                     {/* Status dot (clickable to toggle completion) */}
                                     <button onClick={e => { e.stopPropagation(); const newStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed'; onUpdateTask({ ...task, status: newStatus }); }}
                                       className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all cursor-pointer ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : `border-slate-300 dark:border-slate-600 hover:border-emerald-400`}`}>
                                       {task.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                                     </button>

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
                                           <div className="flex items-center gap-1.5 min-w-0">
                                             <span className={`text-[13px] font-semibold truncate cursor-pointer hover:text-indigo-600 transition-colors ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                                               {task.title}
                                             </span>
                                             {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                                           </div>

                                           {/* Hover Option Buttons (Image 3, 4) */}
                                           <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1.5 transition-all ml-3 shrink-0">
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
                                               className="p-1 border border-slate-250 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-3xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
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
                                           className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${filterTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'}`}>
                                           #{tag}
                                         </span>
                                       ))}
                                     </div>

                                     {/* Assignee */}
                                     <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                       {assignee ? (
                                         <SignedImage filePath={assignee.avatar} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt={assignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
                                       ) : (
                                         <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">+</div>
                                       )}
                                     </div>

                                     {/* Due Date */}
                                     <div className="shrink-0 w-16 text-right" onClick={e => e.stopPropagation()}>
                                       {daysInfo ? (
                                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${daysInfo.cls}`}>{daysInfo.text}</span>
                                       ) : (
                                         <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                                       )}
                                     </div>

                                     {/* Meta icons */}
                                     <div className="hidden md:flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-slate-500">
                                       {(task.subtasks?.length || 0) > 0 && (
                                         <span className="text-[9px] font-bold flex items-center gap-0.5">
                                           <Check className="w-3 h-3" />
                                           {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
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
                                         onUpdateTask({ ...task, priority: newP });
                                         onAddSyncLog(`Priority "${task.title}" → ${newP}`);
                                       }} />
                                     </div>

                                     {/* Far Right Settings (Image 5) */}
                                     <div className="shrink-0 relative w-6 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                       <button 
                                         onClick={() => setSelectedTask(task)}
                                         className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
                                         title="Task Options"
                                       >
                                         <MoreHorizontal className="w-3.5 h-3.5" />
                                       </button>
                                     </div>
                                   </div>
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
}