"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DragStart, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { Plus, Calendar, MessageSquare, Check, Pin, Paperclip, ChevronDown } from 'lucide-react';
import { Task, User, TaskStatus, Priority, Workspace } from '../../types';
import SignedImage from '../SignedImage';

const DraggableCast = Draggable as typeof Draggable;

function StrictModeDroppable({ children, ...props }: { children: (provided: DroppableProvided, snapshot?: any) => React.ReactNode; droppableId: string; type: string }) {
  const [enabled, setEnabled] = useState(false);
  React.useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => { cancelAnimationFrame(animation); };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
}

const STATUS_META: Record<TaskStatus, { label: string; dot: string; headerBg: string; headerText: string; headerBorder: string; badgeBg: string; badgeText: string }> = {
  todo: { 
    label: 'TO DO', 
    dot: 'bg-slate-400', 
    headerBg: 'bg-transparent', 
    headerText: 'text-slate-500', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-slate-105 dark:bg-slate-800/80', 
    badgeText: 'text-slate-600 dark:text-slate-300 font-extrabold' 
  },
  inprogress: { 
    label: 'IN PROGRESS', 
    dot: 'bg-amber-500', 
    headerBg: 'bg-transparent', 
    headerText: 'text-amber-600', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-amber-100/70 dark:bg-amber-950/40', 
    badgeText: 'text-amber-755 dark:text-amber-400 font-extrabold' 
  },
  review: { 
    label: 'REVIEW', 
    dot: 'bg-cyan-500', 
    headerBg: 'bg-transparent', 
    headerText: 'text-cyan-600', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-cyan-100/70 dark:bg-cyan-950/40', 
    badgeText: 'text-cyan-755 dark:text-cyan-400 font-extrabold' 
  },
  completed: { 
    label: 'COMPLETE', 
    dot: 'bg-emerald-500', 
    headerBg: 'bg-transparent', 
    headerText: 'text-emerald-600', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/40', 
    badgeText: 'text-emerald-700 dark:text-emerald-450 font-extrabold' 
  },
};

const PRIORITY_META: Record<Priority, { label: string; dot: string; bg: string; text: string; badgeBg: string; badgeText: string }> = {
  urgent: { 
    label: 'URGENT', 
    dot: 'bg-rose-500', 
    bg: 'bg-rose-50/50 dark:bg-rose-950/20', 
    text: 'text-rose-600', 
    badgeBg: 'bg-rose-100/70 dark:bg-rose-950/40', 
    badgeText: 'text-rose-700 dark:text-rose-400 font-extrabold' 
  },
  high: { 
    label: 'HIGH', 
    dot: 'bg-orange-500', 
    bg: 'bg-orange-50/50 dark:bg-orange-950/20', 
    text: 'text-orange-600', 
    badgeBg: 'bg-orange-100/70 dark:bg-orange-950/40', 
    badgeText: 'text-orange-700 dark:text-orange-400 font-extrabold' 
  },
  medium: { 
    label: 'MEDIUM', 
    dot: 'bg-yellow-500', 
    bg: 'bg-yellow-55/30 dark:bg-yellow-950/10', 
    text: 'text-yellow-755', 
    badgeBg: 'bg-yellow-55/60 dark:bg-yellow-950/20', 
    badgeText: 'text-yellow-700 dark:text-yellow-450 font-extrabold' 
  },
  low: { 
    label: 'LOW', 
    dot: 'bg-slate-400', 
    bg: 'bg-slate-55/50 dark:bg-slate-800/30', 
    text: 'text-slate-500', 
    badgeBg: 'bg-slate-105 dark:bg-slate-800', 
    badgeText: 'text-slate-600 dark:text-slate-350 font-extrabold' 
  },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'border-l-red-500', 
  high: 'border-l-orange-500', 
  medium: 'border-l-yellow-400', 
  low: 'border-l-slate-300',
};

const getDaysText = (dueDate?: string) => {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate.split('T')[0]); due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `Quá hạn`, cls: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' };
  if (diff === 0) return { text: 'Hôm nay', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' };
  if (diff <= 3) return { text: `${diff}d`, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' };
  return { text: `${diff}d`, cls: 'text-slate-500 bg-slate-55 dark:bg-slate-800' };
};


interface TaskBoardViewProps {
  filteredTasks: Task[];
  members: User[];
  workspaces?: Workspace[];
  selectedTaskIds: string[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  boardGroupBy: 'status' | 'priority' | 'assignee';
  setBoardGroupBy: React.Dispatch<React.SetStateAction<'status' | 'priority' | 'assignee'>>;
  boardSwimlaneBy: 'none' | 'status' | 'priority' | 'assignee';
  setBoardSwimlaneBy: React.Dispatch<React.SetStateAction<'none' | 'status' | 'priority' | 'assignee'>>;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  isSmartSort: boolean;
  isUrgentNearDueTask: (task: Task) => boolean;
  isMultiSelectMode: boolean;
  activeDragId: string | null;
  activeOverDropId: string | null;
  cardSize?: 'small' | 'medium' | 'large';
  setCardSize?: React.Dispatch<React.SetStateAction<'small' | 'medium' | 'large'>>;
  cardCover?: boolean;
  setCardCover?: React.Dispatch<React.SetStateAction<boolean>>;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => void;
}

export default function TaskBoardView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddSyncLog, triggerToast, boardGroupBy, setBoardGroupBy,
  boardSwimlaneBy, setBoardSwimlaneBy, filterTag, setFilterTag,
  isSmartSort, isUrgentNearDueTask, isMultiSelectMode, activeDragId, activeOverDropId,
  cardSize = 'medium', setCardSize, cardCover = true, setCardCover, onAddTask
}: TaskBoardViewProps) {

  const [localActiveDragId, setLocalActiveDragId] = React.useState<string | null>(null);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<string[]>([]);
  const [inlineAddCell, setInlineAddCell] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const isDraggingRef = React.useRef(false);

  const [localCardSize, setLocalCardSize] = useState<'small' | 'medium' | 'large'>(cardSize);
  const [localCardCover, setLocalCardCover] = useState<boolean>(cardCover);

  React.useEffect(() => { setLocalCardSize(cardSize); }, [cardSize]);
  React.useEffect(() => { setLocalCardCover(cardCover); }, [cardCover]);

  const toggleCardSize = (size: 'small' | 'medium' | 'large') => {
    setLocalCardSize(size);
    if (setCardSize) setCardSize(size);
  };

  const toggleCardCover = (val: boolean) => {
    setLocalCardCover(val);
    if (setCardCover) setCardCover(val);
  };

  React.useEffect(() => {
    if (localActiveDragId) {
      isDraggingRef.current = true;
    } else {
      const timer = setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localActiveDragId]);

  const handleDragStart = (start: DragStart) => {
    setLocalActiveDragId(start.draggableId);
  };

  const columns: string[] = React.useMemo(() => {
    if (boardGroupBy === 'status') {
      return ['todo', 'inprogress', 'review', 'completed'];
    }
    if (boardGroupBy === 'priority') {
      return ['urgent', 'high', 'medium', 'low'];
    }
    return [...members.map(m => m.id), 'unassigned'];
  }, [boardGroupBy, members]);

  const swimlaneRows: string[] = React.useMemo(() => {
    if (boardSwimlaneBy === 'none') return [];
    if (boardSwimlaneBy === 'status') {
      return ['todo', 'inprogress', 'review', 'completed'];
    }
    if (boardSwimlaneBy === 'priority') {
      return ['urgent', 'high', 'medium', 'low'];
    }
    return [...members.map(m => m.id), 'unassigned'];
  }, [boardSwimlaneBy, members]);

  const toggleSwimlaneCollapse = (rowKey: string) => {
    setCollapsedSwimlanes(prev => 
      prev.includes(rowKey) ? prev.filter(k => k !== rowKey) : [...prev, rowKey]
    );
  };

  interface BoardColumnMeta {
    label: string;
    badgeBg: string;
    badgeText: string;
    avatar?: string;
  }

  const getColumnMeta = (colKey: string): BoardColumnMeta => {
    if (boardGroupBy === 'status') {
      const meta = STATUS_META[colKey as TaskStatus];
      return meta 
        ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } 
        : { label: colKey.toUpperCase(), badgeBg: 'bg-slate-105 dark:bg-slate-800', badgeText: 'text-slate-600 dark:text-slate-350' };
    }
    if (boardGroupBy === 'priority') {
      const meta = PRIORITY_META[colKey as Priority];
      return meta ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } : { label: colKey.toUpperCase(), badgeBg: 'bg-slate-105', badgeText: 'text-slate-500' };
    }
    if (colKey === 'unassigned') {
      return { label: 'Unassigned', badgeBg: 'bg-slate-105 dark:bg-slate-800', badgeText: 'text-slate-500 dark:text-slate-400 font-extrabold' };
    }
    const user = members.find(m => m.id === colKey);
    return { 
      label: user ? user.name : 'Unknown', 
      badgeBg: 'bg-indigo-55/65 dark:bg-indigo-950/20', 
      badgeText: 'text-indigo-650 dark:text-indigo-400 font-extrabold',
      avatar: user?.avatar
    };
  };

  const getSwimlaneMeta = (rowKey: string): BoardColumnMeta => {
    if (boardSwimlaneBy === 'status') {
      const meta = STATUS_META[rowKey as TaskStatus];
      return meta 
        ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } 
        : { label: rowKey.toUpperCase(), badgeBg: 'bg-slate-105 dark:bg-slate-800', badgeText: 'text-slate-600 dark:text-slate-350' };
    }
    if (boardSwimlaneBy === 'priority') {
      const meta = PRIORITY_META[rowKey as Priority];
      return meta ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } : { label: rowKey.toUpperCase(), badgeBg: 'bg-slate-105', badgeText: 'text-slate-500' };
    }
    if (rowKey === 'unassigned') {
      return { label: 'Unassigned', badgeBg: 'bg-slate-105 dark:bg-slate-850', badgeText: 'text-slate-500 dark:text-slate-400 font-extrabold' };
    }
    const user = members.find(m => m.id === rowKey);
    return { 
      label: user ? user.name : 'Unknown', 
      badgeBg: 'bg-indigo-55/65 dark:bg-indigo-950/20', 
      badgeText: 'text-indigo-650 dark:text-indigo-400 font-extrabold',
      avatar: user?.avatar
    };
  };

  const getFilteredCellTasks = (colKey: string, rowKey?: string) => {
    return filteredTasks.filter(t => {
      let matchesCol = false;
      if (boardGroupBy === 'status') {
        matchesCol = t.status === colKey;
      } else if (boardGroupBy === 'priority') {
        matchesCol = t.priority === colKey;
      } else if (boardGroupBy === 'assignee') {
        matchesCol = (t.assigneeId || 'unassigned') === colKey;
      }

      if (!matchesCol) return false;

      if (boardSwimlaneBy !== 'none' && rowKey) {
        if (boardSwimlaneBy === 'status') {
          return t.status === rowKey;
        } else if (boardSwimlaneBy === 'priority') {
          return t.priority === rowKey;
        } else if (boardSwimlaneBy === 'assignee') {
          return (t.assigneeId || 'unassigned') === rowKey;
        }
      }

      return true;
    });
  };

  const handleInlineAddSubmit = (colKey: string, rowKey?: string) => {
    if (!inlineTitle.trim()) return;
    if (onAddTask) {
      let targetStatus: TaskStatus = 'todo';
      let targetPriority: Priority = 'medium';
      let targetAssigneeId: string | undefined = undefined;

      if (boardGroupBy === 'status') {
        targetStatus = colKey as TaskStatus;
      } else if (boardGroupBy === 'priority') {
        targetPriority = colKey as Priority;
      } else if (boardGroupBy === 'assignee') {
        targetAssigneeId = colKey === 'unassigned' ? undefined : colKey;
      }

      if (boardSwimlaneBy !== 'none' && rowKey) {
        if (boardSwimlaneBy === 'status') {
          targetStatus = rowKey as TaskStatus;
        } else if (boardSwimlaneBy === 'priority') {
          targetPriority = rowKey as Priority;
        } else if (boardSwimlaneBy === 'assignee') {
          targetAssigneeId = rowKey === 'unassigned' ? undefined : rowKey;
        }
      }

      onAddTask({
        title: inlineTitle.trim(),
        description: '',
        priority: targetPriority,
        status: targetStatus,
        assigneeId: targetAssigneeId,
        startDate: '',
        dueDate: '',
        tags: [],
        isPinned: false,
        subtasks: []
      });
      onAddSyncLog(`Thêm nhanh công việc: "${inlineTitle.trim()}"`);
      if (triggerToast) triggerToast('success', 'Thêm công việc', `Đã thêm "${inlineTitle.trim()}"`);
    }
    setInlineTitle('');
    setInlineAddCell(null);
  };

  const handleDragEnd = (result: DropResult) => {
    setLocalActiveDragId(null);
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const taskId = draggableId.replace('kanban_card_', '');
    const droppableId = destination.droppableId;

    const taskToUpdate = filteredTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    let targetColumn = droppableId;
    let targetSwimlane = '';

    if (droppableId.includes('__')) {
      const parts = droppableId.split('__');
      targetSwimlane = parts[0];
      targetColumn = parts[1];
    }

    const updatedFields: Partial<Task> = {};

    if (boardGroupBy === 'status') {
      if (taskToUpdate.status !== targetColumn) {
        updatedFields.status = targetColumn as TaskStatus;
      }
    } else if (boardGroupBy === 'priority') {
      if (taskToUpdate.priority !== targetColumn) {
        updatedFields.priority = targetColumn as Priority;
      }
    } else if (boardGroupBy === 'assignee') {
      const newAssigneeId = targetColumn === 'unassigned' ? undefined : targetColumn;
      if (taskToUpdate.assigneeId !== newAssigneeId) {
        updatedFields.assigneeId = newAssigneeId;
      }
    }

    if (boardSwimlaneBy !== 'none' && targetSwimlane) {
      if (boardSwimlaneBy === 'status') {
        if (taskToUpdate.status !== targetSwimlane) {
          updatedFields.status = targetSwimlane as TaskStatus;
        }
      } else if (boardSwimlaneBy === 'priority') {
        if (taskToUpdate.priority !== targetSwimlane) {
          updatedFields.priority = targetSwimlane as Priority;
        }
      } else if (boardSwimlaneBy === 'assignee') {
        const newAssigneeId = targetSwimlane === 'unassigned' ? undefined : targetSwimlane;
        if (taskToUpdate.assigneeId !== newAssigneeId) {
          updatedFields.assigneeId = newAssigneeId;
        }
      }
    }

    if (Object.keys(updatedFields).length > 0) {
      const updatedTask = { ...taskToUpdate, ...updatedFields };
      onUpdateTask(updatedTask);
      
      const changeDesc = Object.entries(updatedFields)
        .map(([k, v]) => `${k} sang "${v}"`)
        .join(', ');
      onAddSyncLog(`Di chuyển công việc "${taskToUpdate.title}": ${changeDesc}`);
      if (triggerToast) {
        triggerToast('success', 'Bảng Kanban', `Đã cập nhật: ${changeDesc}`);
      }
    }
  };

  const renderCard = (task: Task, index: number) => {
    const assignee = members.find(m => m.id === task.assigneeId);
    const daysInfo = getDaysText(task.dueDate);
    const isDragging = activeDragId === task.id;
    const imageAttachment = localCardCover ? task.attachments?.find(a => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name)) : null;
    
    const paddingCls = localCardSize === 'small' ? 'p-2' : localCardSize === 'large' ? 'p-4.5' : 'p-3.5';
    const titleCls = localCardSize === 'small' ? 'text-xs font-semibold' : localCardSize === 'large' ? 'text-sm font-bold' : 'text-[12.5px] font-bold';
    const descCls = localCardSize === 'small' ? 'hidden' : 'text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed';

    return (
      <DraggableCast key={task.id} draggableId={`kanban_card_${task.id}`} index={index}>
        {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => {
          const isTransitionEnabled = !dragSnapshot.isDragging && !dragSnapshot.isDropAnimating;
          const cardStyle = {
            ...dragProvided.draggableProps.style,
            transform: (dragSnapshot.isDragging || dragSnapshot.isDropAnimating)
              ? dragProvided.draggableProps.style?.transform
              : 'none',
            transition: dragSnapshot.isDragging ? 'none' : dragProvided.draggableProps.style?.transition
          };
          
          return (
            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
              style={cardStyle}>
              <div onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
                className={`rounded-2xl border-l-[3.5px] ${PRIORITY_COLORS[task.priority]} border-y border-r border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 cursor-pointer shadow-[0_2px_8px_rgba(15,23,42,0.01)] ${
                  isTransitionEnabled 
                    ? 'transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(109,85,254,0.06)] hover:border-indigo-300/60 dark:hover:border-indigo-900/60' 
                    : ''
                } ${
                  dragSnapshot.isDragging ? 'shadow-xl scale-[1.02] z-50 ring-2 ring-indigo-500/10' : ''
                } ${selectedTaskIds.includes(task.id) ? 'ring-2 ring-indigo-400/30' : ''} overflow-hidden`}>
              
              {imageAttachment && (
                <div className="w-full relative overflow-hidden bg-slate-50 dark:bg-slate-955" style={{ height: localCardSize === 'small' ? '65px' : localCardSize === 'large' ? '120px' : '90px' }}>
                  <SignedImage filePath={imageAttachment.filePath} className="w-full h-full object-cover" alt={task.title} fallback={`https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300`} />
                </div>
              )}

              <div className={paddingCls}>
                {localCardSize !== 'small' && (() => {
                  const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                  return (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedTaskIds.includes(task.id)}
                          onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-slate-350 text-indigo-650 focus:ring-indigo-500/20 cursor-pointer shrink-0 accent-indigo-600" />
                        {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {ws && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg select-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/10 dark:border-indigo-900/10">
                            {ws.name}
                          </span>
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg select-none border ${
                          task.priority === 'urgent' ? 'bg-rose-50/70 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400' :
                          task.priority === 'high' ? 'bg-orange-50/70 border-orange-100 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400' :
                          task.priority === 'medium' ? 'bg-yellow-50/70 border-yellow-100 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-yellow-400' :
                          'bg-slate-50 border-slate-200 text-slate-550 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <h4 className={`${titleCls} leading-snug ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-850 dark:text-slate-100'}`}>
                  {task.title}
                </h4>

                {task.description && (
                  <p className={descCls}>{task.description}</p>
                )}

                {localCardSize !== 'small' && task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                    {task.tags.slice(0, 3).map(tag => (
                      <span key={tag} onClick={e => { e.stopPropagation(); setFilterTag(filterTag === tag ? 'all' : tag); }}
                        className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          filterTag === tag 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-indigo-50/20 dark:bg-indigo-950/25 border-indigo-100/10 dark:border-indigo-900/10 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'
                        }`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {localCardSize === 'large' && task.subtasks && task.subtasks.length > 0 && (
                  <div className="mt-2.5 mb-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-450 mb-1">
                      <span><Check className="w-3 h-3 inline mr-0.5 text-emerald-650" />{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                )}

                {localCardSize !== 'small' && (
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      {daysInfo && (
                        <span className={`font-bold px-1.5 py-0.5 rounded-lg text-[9px] flex items-center gap-0.5 border ${daysInfo.cls}`}>
                          <Calendar className="w-2.5 h-2.5" />{daysInfo.text}
                        </span>
                      )}
                      {(task.comments?.length || 0) > 0 && (
                        <span className="flex items-center gap-0.5 font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>
                      )}
                      {(task.attachments?.length || 0) > 0 && <Paperclip className="w-2.5 h-2.5" />}
                    </div>
                    <div className="shrink-0">
                      {assignee ? (
                        <SignedImage filePath={assignee.avatar} className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-3xs" alt={assignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-105 dark:bg-slate-800 border border-dashed border-slate-250 dark:border-slate-600 flex items-center justify-center text-[9px] text-slate-400 hover:border-slate-400 cursor-pointer transition-colors">+</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </DraggableCast>
    );
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full w-full">
        
        {/* Kanban Board Controls Panel */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-3 mb-4 text-xs font-bold text-slate-655 dark:text-slate-350 select-none shadow-3xs">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Group By selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-3xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Group:</span>
              <select
                value={boardGroupBy}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setBoardGroupBy(val);
                  if (boardSwimlaneBy === val) {
                    setBoardSwimlaneBy('none');
                  }
                }}
                className="bg-transparent font-bold outline-none cursor-pointer pr-1 text-slate-700 dark:text-slate-300 border-none"
              >
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="assignee">Assignee</option>
              </select>
            </div>

            {/* Swimlane selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-3xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Swimlane:</span>
              <select
                value={boardSwimlaneBy}
                onChange={(e) => setBoardSwimlaneBy(e.target.value as any)}
                className="bg-transparent font-bold outline-none cursor-pointer pr-1 text-slate-700 dark:text-slate-300 border-none"
              >
                <option value="none">None</option>
                {boardGroupBy !== 'status' && <option value="status">Status</option>}
                {boardGroupBy !== 'priority' && <option value="priority">Priority</option>}
                {boardGroupBy !== 'assignee' && <option value="assignee">Assignee</option>}
              </select>
            </div>
          </div>

          {/* Card size & covers selectors */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-0.5 shadow-3xs">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => toggleCardSize(size)}
                  className={`px-2 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    localCardSize === size 
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 font-extrabold shadow-3xs' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <button
              onClick={() => toggleCardCover(!localCardCover)}
              className={`px-3 py-1.5 border rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer bg-white dark:bg-slate-900 ${
                localCardCover 
                  ? 'border-indigo-200 text-indigo-600 dark:border-indigo-905 dark:text-indigo-400 font-black' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-455 hover:bg-slate-50'
              }`}
            >
              <span>Show Covers</span>
            </button>
          </div>
        </div>

        {/* Board Main Area */}
        {boardSwimlaneBy === 'none' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar select-none">
            {columns.map(col => {
              const colMeta = getColumnMeta(col);
              const colTasks = getFilteredCellTasks(col);
              const isOverColumn = activeOverDropId === col;
              
              return (
                <div 
                  key={col} 
                  className={`min-w-[290px] w-[290px] flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/25 backdrop-blur-xs p-4 rounded-2xl flex flex-col gap-3 transition-all border border-slate-200/50 dark:border-slate-805/50 shadow-[0_4px_20px_rgba(15,23,42,0.015)] hover:border-slate-300 dark:hover:border-slate-700/50 ${
                    isOverColumn ? 'ring-2 ring-indigo-500/20 bg-indigo-50/15 dark:bg-indigo-950/10 border-indigo-400/30' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-0.5 py-0.5 text-xs">
                    <div className="flex items-center gap-2">
                      {colMeta.avatar && (
                        <img src={colMeta.avatar} className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-3xs" alt="" />
                      )}
                      <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 border border-transparent ${colMeta.badgeBg} ${colMeta.badgeText}`}>
                        {col === 'completed' && <Check className="w-3 h-3 text-emerald-650 stroke-[3px]" />}
                        {colMeta.label}
                      </span>
                      <span className={`font-black text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 min-w-[20px] text-center ${
                        col === 'completed' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 dark:text-slate-550'
                      }`}>
                        {colTasks.length}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => { setInlineAddCell(col); setInlineTitle(''); }}
                      className="w-6 h-6 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Column Droppable Area */}
                  <StrictModeDroppable droppableId={col} type="task">
                    {(provided: DroppableProvided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className="flex-1 space-y-2 min-h-[150px]">
                        {colTasks.map((task, index) => renderCard(task, index))}
                        {provided.placeholder}

                        {/* Inline Add Task Form */}
                        {inlineAddCell === col ? (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-500 shadow-xs space-y-2 select-text">
                            <input
                              type="text"
                              value={inlineTitle}
                              onChange={(e) => setInlineTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineAddSubmit(col);
                                else if (e.key === 'Escape') { setInlineAddCell(null); setInlineTitle(''); }
                              }}
                              placeholder="Task name..."
                              className="w-full text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5 text-[9px] font-bold">
                              <button onClick={() => { setInlineAddCell(null); setInlineTitle(''); }} className="px-2 py-0.5 rounded text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
                              <button onClick={() => handleInlineAddSubmit(col)} className="px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Lưu</button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setInlineAddCell(col); setInlineTitle(''); }}
                            className="w-full flex items-center justify-start gap-1.5 px-3 py-2 text-xs font-bold text-slate-455 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer text-left"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                            <span>Add Task</span>
                          </button>
                        )}

                        {colTasks.length === 0 && !inlineAddCell && (
                          <div className="text-center py-6 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            No tasks
                          </div>
                        )}
                      </div>
                    )}
                  </StrictModeDroppable>
                </div>
              );
            })}
            
            {/* Add group placeholder */}
            <div className="min-w-[200px] w-[200px] flex-shrink-0 flex items-start pt-2 px-1">
              <button 
                onClick={() => {
                  if (triggerToast) {
                    triggerToast('info', 'Add Group', 'Tạo trạng thái mới chưa được hỗ trợ. Nhóm được cố định theo các trường của hệ thống.');
                  } else {
                    alert('Tạo trạng thái mới chưa được hỗ trợ. Nhóm được cố định theo các trường của hệ thống.');
                  }
                }}
                className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-455 hover:text-slate-700 dark:hover:text-slate-250 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add group</span>
              </button>
            </div>
          </div>
        ) : (
          /* Aligned Column Swimlane Layout */
          <div className="overflow-x-auto pb-4 custom-scrollbar select-none">
            <div className="min-w-max space-y-5">
              
              {/* Aligned Column Header Sticky Row */}
              <div className="flex gap-4 px-1">
                {columns.map(col => {
                  const colMeta = getColumnMeta(col);
                  const colTasksCount = filteredTasks.filter(t => {
                    if (boardGroupBy === 'status') return t.status === col;
                    if (boardGroupBy === 'priority') return t.priority === col;
                    if (boardGroupBy === 'assignee') return (t.assigneeId || 'unassigned') === col;
                    return false;
                  }).length;

                  return (
                    <div key={col} className="min-w-[280px] w-[280px] flex-shrink-0 px-2.5 py-1.5 flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-405">
                      <div className="flex items-center gap-2">
                        {colMeta.avatar && (
                          <img src={colMeta.avatar} className="w-4.5 h-4.5 rounded-full object-cover border border-slate-200 dark:border-slate-700" alt="" />
                        )}
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] tracking-wider uppercase flex items-center gap-1.5 ${colMeta.badgeBg} ${colMeta.badgeText}`}>
                          {col === 'completed' && <Check className="w-3 h-3 text-emerald-650 stroke-[3px]" />}
                          {colMeta.label}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-extrabold">{colTasksCount}</span>
                      </div>
                      
                      <button 
                        onClick={() => { setInlineAddCell(col); setInlineTitle(''); }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Swimlane Rows */}
              <div className="space-y-4">
                {swimlaneRows.map(row => {
                  const swimlaneMeta = getSwimlaneMeta(row);
                  const isCollapsed = collapsedSwimlanes.includes(row);
                  const rowTasksCount = filteredTasks.filter(t => {
                    if (boardSwimlaneBy === 'status') return t.status === row;
                    if (boardSwimlaneBy === 'priority') return t.priority === row;
                    if (boardSwimlaneBy === 'assignee') return (t.assigneeId || 'unassigned') === row;
                    return false;
                  }).length;

                  return (
                    <div key={row} className="space-y-2">
                      {/* Collapsible Row Header */}
                      <div 
                        onClick={() => toggleSwimlaneCollapse(row)}
                        className="flex items-center gap-2 py-2 px-3 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl cursor-pointer hover:bg-slate-150/80 dark:hover:bg-slate-800/60 transition-all select-none sticky left-0 z-10 border border-slate-200/10 dark:border-slate-800/10 shadow-3xs backdrop-blur-xs"
                        style={{ width: 'fit-content' }}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                        {swimlaneMeta.avatar && (
                          <img src={swimlaneMeta.avatar} className="w-4 h-4 rounded-full object-cover" alt="" />
                        )}
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] tracking-wider uppercase font-black ${swimlaneMeta.badgeBg} ${swimlaneMeta.badgeText}`}>
                          {swimlaneMeta.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          ({rowTasksCount} {rowTasksCount === 1 ? 'task' : 'tasks'})
                        </span>
                      </div>

                      {/* Row Cells */}
                      {!isCollapsed && (
                        <div className="flex gap-4">
                          {columns.map(col => {
                            const cellTasks = getFilteredCellTasks(col, row);
                            const cellId = `${row}__${col}`;
                            const isOverCell = activeOverDropId === cellId;

                            return (
                              <div 
                                key={col} 
                                className={`min-w-[280px] w-[280px] flex-shrink-0 bg-slate-55 dark:bg-slate-900/10 p-3 rounded-2xl flex flex-col gap-2.5 transition-all border border-slate-205 dark:border-slate-855/40 min-h-[140px] ${
                                  isOverCell ? 'ring-2 ring-indigo-400/50 bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                                }`}
                              >
                                <StrictModeDroppable droppableId={cellId} type="task">
                                  {(provided: DroppableProvided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps}
                                      className="flex-1 space-y-2">
                                      {cellTasks.map((task, index) => renderCard(task, index))}
                                      {provided.placeholder}

                                      {/* Inline Add Task Form */}
                                      {inlineAddCell === cellId ? (
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-500 shadow-xs space-y-2 select-text">
                                          <input
                                            type="text"
                                            value={inlineTitle}
                                            onChange={(e) => setInlineTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleInlineAddSubmit(col, row);
                                              else if (e.key === 'Escape') { setInlineAddCell(null); setInlineTitle(''); }
                                            }}
                                            placeholder="Task name..."
                                            className="w-full text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                                            autoFocus
                                          />
                                          <div className="flex justify-end gap-1.5 text-[9px] font-bold">
                                            <button onClick={() => { setInlineAddCell(null); setInlineTitle(''); }} className="px-2 py-0.5 rounded text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
                                            <button onClick={() => handleInlineAddSubmit(col, row)} className="px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Lưu</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => { setInlineAddCell(cellId); setInlineTitle(''); }}
                                          className="w-full flex items-center justify-start gap-1.5 px-3 py-2 text-xs font-bold text-slate-455 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer text-left"
                                        >
                                          <Plus className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Add Task</span>
                                        </button>
                                      )}

                                      {cellTasks.length === 0 && inlineAddCell !== cellId && (
                                        <div className="text-center py-4 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium italic border border-dashed border-slate-200/60 dark:border-slate-800/50 rounded-xl">
                                          No tasks
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </StrictModeDroppable>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
