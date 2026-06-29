"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Calendar, MessageSquare, Check, Pin, Paperclip } from 'lucide-react';
import { Task, User, TaskStatus, Priority, Workspace } from '../../types';
import SignedImage from '../SignedImage';

const DraggableCast = Draggable as any;

function StrictModeDroppable({ children, ...props }: any) {
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

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'border-l-red-500', 
  high: 'border-l-orange-500', 
  medium: 'border-l-yellow-400', 
  low: 'border-l-slate-300',
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
  triggerToast?: (type: any, title: string, message: string) => void;
  boardGroupBy: 'status' | 'priority';
  setBoardGroupBy: React.Dispatch<React.SetStateAction<'status' | 'priority'>>;
  boardSwimlaneBy: 'none' | 'priority' | 'assignee';
  setBoardSwimlaneBy: React.Dispatch<React.SetStateAction<'none' | 'priority' | 'assignee'>>;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  isSmartSort: boolean;
  isUrgentNearDueTask: (task: Task) => boolean;
  isMultiSelectMode: boolean;
  activeDragId: string | null;
  activeOverDropId: string | null;
  cardSize?: 'small' | 'medium' | 'large';
  cardCover?: boolean;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => void;
}

export default function TaskBoardView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddSyncLog, triggerToast, boardGroupBy, setBoardGroupBy,
  boardSwimlaneBy, setBoardSwimlaneBy, filterTag, setFilterTag,
  isSmartSort, isUrgentNearDueTask, isMultiSelectMode, activeDragId, activeOverDropId,
  cardSize = 'medium', cardCover = true, onAddTask
}: TaskBoardViewProps) {

  const [localActiveDragId, setLocalActiveDragId] = React.useState<string | null>(null);
  const isDraggingRef = React.useRef(false);

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

  const handleDragStart = (start: any) => {
    setLocalActiveDragId(start.draggableId);
  };

  const columns: TaskStatus[] = ['todo', 'inprogress', 'review', 'completed'];
  const [inlineAddStatus, setInlineAddStatus] = useState<TaskStatus | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');

  const handleInlineAddSubmit = (status: TaskStatus) => {
    if (!inlineTitle.trim()) return;
    if (onAddTask) {
      onAddTask({
        title: inlineTitle.trim(),
        description: '',
        priority: 'medium',
        status: status,
        assigneeId: undefined,
        startDate: '',
        dueDate: '',
        tags: [],
        isPinned: false,
        subtasks: []
      });
      onAddSyncLog(`Thêm nhanh bảng: "${inlineTitle.trim()}"`);
      if (triggerToast) triggerToast('success', 'Thêm công việc', `Đã thêm "${inlineTitle.trim()}"`);
    }
    setInlineTitle('');
    setInlineAddStatus(null);
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

  const handleDragEnd = (result: any) => {
    setLocalActiveDragId(null);
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const taskId = draggableId.replace('kanban_card_', '');
    const newStatus = destination.droppableId;

    const taskToUpdate = filteredTasks.find(t => t.id === taskId);
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
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar select-none">
      {columns.map(status => {
        const meta = STATUS_META[status];
        const columnTasks = filteredTasks.filter(t => t.status === status);
        const isOverColumn = activeOverDropId === status;

        return (
          <div 
            key={status} 
            className={`min-w-[280px] w-[280px] flex-shrink-0 bg-slate-55 dark:bg-slate-900/20 p-3 rounded-2xl flex flex-col gap-2.5 transition-all border border-slate-200/40 dark:border-slate-800/40 ${
              isOverColumn ? 'ring-2 ring-indigo-400/50 bg-indigo-50/20 dark:bg-indigo-950/10' : ''
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 py-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] tracking-wider flex items-center gap-1.5 ${meta.badgeBg} ${meta.badgeText}`}>
                  {status === 'completed' && <Check className="w-3 h-3 text-emerald-600 stroke-[3px]" />}
                  {meta.label}
                </span>
                <span className={`font-bold text-[11px] ${status === 'completed' ? 'text-emerald-600' : 'text-slate-400 dark:text-slate-500'}`}>
                  {columnTasks.length}
                </span>
              </div>
              
              <button 
                onClick={() => { setInlineAddStatus(status); setInlineTitle(''); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column Body */}
            <StrictModeDroppable droppableId={status} type="task">
              {(provided: any) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className="flex-1 space-y-2 min-h-[150px]">
                  {columnTasks.map((task, index) => {
                    const assignee = members.find(m => m.id === task.assigneeId);
                    const daysInfo = getDaysText(task.dueDate);
                    const isDragging = activeDragId === task.id;
                    const imageAttachment = cardCover ? task.attachments?.find(a => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name)) : null;
                    
                    // Dynamic styling properties
                    const paddingCls = cardSize === 'small' ? 'p-2' : cardSize === 'large' ? 'p-4.5' : 'p-3.5';
                    const titleCls = cardSize === 'small' ? 'text-xs font-semibold' : cardSize === 'large' ? 'text-sm font-bold' : 'text-[12.5px] font-bold';
                    const descCls = cardSize === 'small' ? 'hidden' : 'text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed';

                    return (
                      <DraggableCast key={task.id} draggableId={`kanban_card_${task.id}`} index={index}>
                        {(dragProvided: any, dragSnapshot: any) => (
                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
                            style={{ ...dragProvided.draggableProps.style, transition: dragSnapshot.isDragging ? 'none' : dragProvided.draggableProps.style?.transition }}>
                            <div onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
                              className={`rounded-xl border-l-[3px] ${PRIORITY_COLORS[task.priority]} border-y border-r border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 cursor-pointer shadow-xs transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 ${
                                dragSnapshot.isDragging ? 'shadow-lg scale-[1.02] z-50' : ''
                              } ${selectedTaskIds.includes(task.id) ? 'ring-2 ring-indigo-400/30' : ''} overflow-hidden`}>
                              
                              {/* Cover image */}
                              {imageAttachment && (
                                <div className="w-full relative overflow-hidden bg-slate-50 dark:bg-slate-955" style={{ height: cardSize === 'small' ? '65px' : cardSize === 'large' ? '120px' : '90px' }}>
                                  <SignedImage filePath={imageAttachment.filePath} className="w-full h-full object-cover" alt={task.title} fallback={`https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300`} />
                                </div>
                              )}

                              <div className={paddingCls}>
                                {/* Header: Checkbox & Pinned status & Priority & Space */}
                                {cardSize !== 'small' && (() => {
                                  const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                                  return (
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedTaskIds.includes(task.id)}
                                          onChange={e => { e.stopPropagation(); setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id)); }}
                                          onClick={e => e.stopPropagation()}
                                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer shrink-0 accent-indigo-600" />
                                        {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                        {ws && (
                                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded select-none bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                            {ws.name}
                                          </span>
                                        )}
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded select-none ${
                                          task.priority === 'urgent' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-455' :
                                          task.priority === 'high' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-455' :
                                          task.priority === 'medium' ? 'bg-yellow-55/60 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-455' :
                                          'bg-slate-105 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                          {task.priority}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Title */}
                                <h4 className={`${titleCls} leading-snug ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                  {task.title}
                                </h4>

                                {/* Description */}
                                {task.description && (
                                  <p className={descCls}>{task.description}</p>
                                )}

                                {/* Tags */}
                                {cardSize !== 'small' && task.tags && task.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                                    {task.tags.slice(0, 3).map(tag => (
                                      <span key={tag} onClick={e => { e.stopPropagation(); setFilterTag(filterTag === tag ? 'all' : tag); }}
                                        className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                          filterTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                        }`}>
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Subtasks */}
                                {cardSize === 'large' && task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mt-2.5 mb-1">
                                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-450 mb-1">
                                      <span><Check className="w-3 h-3 inline mr-0.5 text-emerald-650" />{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                                      <span>{task.progress}%</span>
                                    </div>
                                    <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                                    </div>
                                  </div>
                                )}

                                {/* Footer details */}
                                {cardSize !== 'small' && (
                                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                      {daysInfo && (
                                        <span className={`font-bold px-1.5 py-0.5 rounded ${daysInfo.cls}`}>
                                          <Calendar className="w-2.5 h-2.5 inline mr-0.5" />{daysInfo.text}
                                        </span>
                                      )}
                                      {(task.comments?.length || 0) > 0 && (
                                        <span className="flex items-center gap-0.5 font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>
                                      )}
                                      {(task.attachments?.length || 0) > 0 && <Paperclip className="w-2.5 h-2.5" />}
                                    </div>
                                    <div className="shrink-0">
                                      {assignee ? (
                                        <SignedImage filePath={assignee.avatar} className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt={assignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-slate-105 dark:bg-slate-800 border border-dashed border-slate-250 dark:border-slate-600 flex items-center justify-center text-[9px] text-slate-400">+</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </DraggableCast>
                    );
                  })}
                  {provided.placeholder}

                  {/* Inline Add Task Form */}
                  {inlineAddStatus === status ? (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-500 shadow-xs space-y-2 select-text">
                      <input
                        type="text"
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineAddSubmit(status);
                          else if (e.key === 'Escape') { setInlineAddStatus(null); setInlineTitle(''); }
                        }}
                        placeholder="Task name..."
                        className="w-full text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5 text-[9px] font-bold">
                        <button onClick={() => { setInlineAddStatus(null); setInlineTitle(''); }} className="px-2 py-0.5 rounded text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
                        <button onClick={() => handleInlineAddSubmit(status)} className="px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Lưu</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setInlineAddStatus(status); setInlineTitle(''); }}
                      className="w-full flex items-center justify-start gap-1.5 px-3 py-2 text-xs font-bold text-slate-455 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer text-left"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                      <span>Add Task</span>
                    </button>
                  )}

                  {/* Empty state when no tasks */}
                  {columnTasks.length === 0 && !inlineAddStatus && (
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

      {/* + Add group Column */}
      <div className="min-w-[200px] w-[200px] flex-shrink-0 flex items-start pt-2 px-1">
        <button 
          onClick={() => {
            if (triggerToast) {
              triggerToast('info', 'Add Group', 'Tạo trạng thái mới chưa được hỗ trợ. Nhóm được cố định theo các trạng thái của hệ thống.');
            } else {
              alert('Tạo trạng thái mới chưa được hỗ trợ. Nhóm được cố định theo các trạng thái của hệ thống.');
            }
          }}
          className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-455 hover:text-slate-700 dark:hover:text-slate-250 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add group</span>
        </button>
      </div>
    </div>
    </DragDropContext>
  );
}
