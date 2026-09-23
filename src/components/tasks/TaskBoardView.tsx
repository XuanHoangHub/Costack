"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CustomFieldSummary from './CustomFieldSummary';
import type { CustomFieldDefinition } from '@/types';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  TouchSensor, 
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { Plus, Calendar, MessageSquare, Check, Pin, Paperclip, ChevronDown, Play, Pause, Clock, GripVertical, User as UserIcon, Hourglass, Copy, Flag, Repeat, MoreHorizontal, Trash2, Edit2, X, AlignLeft, Tag, CircleDot, ChevronsLeft, ChevronsRight, ChevronRight, UserCircle2, Building2 } from 'lucide-react';
import { Task, User, TaskStatus, Priority, Workspace } from '../../types';
import { getTaskTeamIds, useWorkspaceTeams } from '@/lib/teamStore';
import SignedImage from '../SignedImage';
import { useTranslation } from '../../contexts/TranslationContext';
import { getStoredStatuses, getStoredPriorities, OptionConfig, getLocalizedOptionLabel, getColorOption, saveStatuses, savePriorities, COLOR_PALETTE, DEFAULT_STATUSES, DEFAULT_PRIORITIES } from '../../utils/fieldConfig';
import { useUiStore } from '../../store/uiStore';
import { Select } from '../ui/Select';
import { fireTaskCompleteConfetti } from '@/lib/confetti';
import { playSuccessSound, playToggleSound } from '@/lib/soundEffects';

// Simple Portal wrapper
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.35',
      },
    },
  }),
  duration: 180,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

import { useDroppable } from '@dnd-kit/core';

function KanbanColumn({ id, children, isOver, isCollapsed }: { id: string; children: React.ReactNode; isOver?: boolean; isCollapsed?: boolean }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={isCollapsed ? "w-full h-full flex flex-col items-center justify-between" : `w-full space-y-2 min-h-[36px] max-h-[calc(100vh-250px)] transition-all duration-200 rounded-xl p-0.5 overflow-y-auto custom-scrollbar ${
        isOver 
          ? 'bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/60 ring-dashed shadow-[inset_0_0_24px_rgba(99,102,241,0.15)] dark:shadow-[inset_0_0_24px_rgba(99,102,241,0.25)]' 
          : 'bg-transparent'
      }`}
    >
      {children}
    </div>
  );
}

function KanbanCard({ 
  task, 
  index, 
  members, 
  workspaces = [], 
  localCardSize, 
  localCardCover, 
  selectedTaskIds, 
  setSelectedTaskIds, 
  setSelectedTask, 
  activeTimerTaskId, 
  onStartGlobalTimer, 
  onStopGlobalTimer, 
  onUpdateTask, 
  onAddSyncLog, 
  triggerToast, 
  filterTag, 
  setFilterTag, 
  dynamicPriorityColors, 
  PRIORITY_COLORS, 
  dynamicPriorityMeta, 
  inlineEditTaskId, 
  setInlineEditTaskId, 
  inlineEditTitle, 
  setInlineEditTitle, 
  submitInlineEdit, 
  isDraggingRef,
  onAddTask,
  customFields = []
}: any) {
  const { locale } = useTranslation();
  const isVietnamese = locale === 'vi';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    transition: {
      duration: 160,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    }
  });

  const isCardDragging = isDragging;
  const style: React.CSSProperties = {
    transform: !isCardDragging && transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isCardDragging ? 'none' : transition,
    opacity: isCardDragging ? 0.35 : 1,
    zIndex: isCardDragging ? 0 : undefined,
    willChange: transform ? 'transform' : undefined,
  };

  const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
  const assignees = members.filter((m: any) => assigneeIds.includes(m.id === 'user' ? 'user' : m.id) || assigneeIds.includes(m.id));
  const daysInfo = getDaysText(task.dueDate);
  const imageAttachment = localCardCover ? task.attachments?.find((a: any) => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name)) : null;
  
  const paddingCls = localCardSize === 'small' ? 'p-2' : localCardSize === 'large' ? 'p-4.5' : 'p-3.5';
  const titleCls = localCardSize === 'small' ? 'text-xs font-semibold' : localCardSize === 'large' ? 'text-sm font-bold' : 'text-[12.5px] font-bold';
  const descCls = localCardSize === 'small' ? 'hidden' : 'text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed';

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s: any) => s.completed).length;
  const hasSubtasks = subtasks.length > 0;
  const subtaskPercent = hasSubtasks ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="outline-none"
    >
      <div 
        onClick={() => { if (!isDraggingRef.current) setSelectedTask(task); }}
        {...attributes}
        {...listeners}
        className={`group relative bg-white dark:bg-[#15161c] rounded-2xl border card-bevel-edge ${
          isCardDragging 
            ? 'opacity-25 border-2 border-dashed border-indigo-500/80 bg-indigo-500/10 shadow-none pointer-events-none scale-[0.98]' 
            : 'border-slate-200/85 dark:border-white/[0.08] hover:border-indigo-400/70 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_14px_32px_-6px_rgba(0,0,0,0.6)] hover:-translate-y-1 active:scale-[0.985] active:shadow-2xs'
        } cursor-grab active:cursor-grabbing transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedTaskIds.includes(task.id) ? 'ring-2 ring-indigo-500 border-indigo-500 dark:ring-indigo-400' : ''} overflow-hidden select-none will-change-transform`}
      >
        {imageAttachment && (
          <div className="w-full relative overflow-hidden bg-slate-50 dark:bg-slate-950" style={{ height: localCardSize === 'small' ? '65px' : localCardSize === 'large' ? '120px' : '90px' }}>
            <SignedImage filePath={imageAttachment.filePath} className="w-full h-full object-cover" alt={task.title} fallback={`https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300`} />
          </div>
        )}

        <div className="p-3.5">
          {/* Card Title Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {inlineEditTaskId === task.id ? (
                <input 
                  autoFocus 
                  value={inlineEditTitle}
                  onChange={e => setInlineEditTitle(e.target.value)}
                  onKeyDown={e => { 
                    if (e.key === 'Enter') submitInlineEdit(task); 
                    if (e.key === 'Escape') setInlineEditTaskId(null); 
                  }}
                  onBlur={() => submitInlineEdit(task)}
                  onClick={e => e.stopPropagation()}
                  onDoubleClick={e => e.stopPropagation()}
                  onFocus={e => e.target.select()}
                  className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-2 py-0.5 outline-none focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500/40 shadow-3xs w-full leading-snug" 
                />
              ) : (
                <h4 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setInlineEditTaskId(task.id);
                    setInlineEditTitle(task.title);
                  }}
                  className={`text-[13px] font-semibold leading-snug cursor-pointer transition-colors ${
                    task.status === 'completed' 
                      ? 'line-through text-slate-400 dark:text-zinc-500' 
                      : 'text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                  title={task.title}
                >
                  {task.title}
                </h4>
              )}
            </div>

            {/* Quick checkbox or pin if pinned */}
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                  onUpdateTask({ ...task, status: newStatus as TaskStatus });
                  onAddSyncLog?.(`Đổi trạng thái "${task.title}" sang: ${newStatus}`);
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
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-115 active:scale-90 ${
                  task.status === 'completed'
                    ? '!opacity-100 border-emerald-500 bg-emerald-500 text-white shadow-xs'
                    : 'opacity-30 group-hover:opacity-100 border-slate-300 dark:border-zinc-600 bg-transparent hover:border-emerald-500 hover:bg-emerald-50/20'
                }`}
                title={task.status === 'completed' ? (locale === 'vi' ? 'Đánh dấu chưa hoàn thành' : 'Mark incomplete') : (locale === 'vi' ? 'Đánh dấu hoàn thành' : 'Mark complete')}
              >
                <Check className={`w-2.5 h-2.5 text-white transition-transform duration-150 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
              </button>
              {task.isPinned && (
                <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
              )}
            </div>
          </div>

          {/* Description Indicator (Image 1: ≡ icon) */}
          {task.description && (
            <div className="flex items-center text-zinc-400 dark:text-zinc-500 mt-1.5" title={task.description}>
              <AlignLeft className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Tags if any */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {task.tags.slice(0, 3).map((tag: any) => (
                <span 
                  key={tag} 
                  onClick={e => { e.stopPropagation(); setFilterTag(filterTag === tag ? 'all' : tag); }}
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    filterTag === tag 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-zinc-100 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Custom Field Summary & Subtasks */}
          <CustomFieldSummary fields={customFields} task={task} members={members} />
          {hasSubtasks && (
            <div className="mt-2.5 select-none">
              <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-400 font-medium mb-1">
                <span>{locale === 'vi' ? 'Tiến độ' : 'Subtasks'}</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300">{completedSubtasks}/{subtasks.length}</span>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${subtaskPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Card Bottom Meta Bar */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100/90 dark:border-zinc-800/60 text-slate-400 dark:text-zinc-400 select-none">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Assignee Avatar */}
              {assignees.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden">
                  {assignees.map((member: any) => (
                    <div
                      key={member.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        useUiStore.getState().setViewingMemberProfileId(member.id);
                      }}
                      className="relative cursor-pointer hover:scale-110 transition-transform z-10"
                      title={member.name}
                    >
                      {member.avatar ? (
                        <SignedImage filePath={member.avatar} className="w-5 h-5 rounded-full object-cover border border-white dark:border-zinc-800 shadow-3xs" alt={member.name} />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[9px] border border-white dark:border-zinc-800 shadow-3xs">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Priority Flag Badge - ONLY rendered if priority exists and is not none */}
              {task.priority && (task.priority as string) !== 'none' && (
                <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md select-none border ${
                  task.priority === 'urgent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400' :
                  task.priority === 'high' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                  task.priority === 'medium' || (task.priority as string) === 'normal' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                  'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400'
                }`}>
                  <Flag className={`w-2.5 h-2.5 shrink-0 ${
                    task.priority === 'urgent' ? 'fill-rose-500 text-rose-500' :
                    task.priority === 'high' ? 'fill-amber-500 text-amber-500' :
                    task.priority === 'medium' || (task.priority as string) === 'normal' ? 'fill-blue-500 text-blue-500' :
                    'fill-slate-400 text-slate-400'
                  }`} />
                  <span>{
                    task.priority === 'urgent' ? (locale === 'vi' ? 'Khẩn cấp' : 'Urgent') : 
                    task.priority === 'high' ? (locale === 'vi' ? 'Cao' : 'High') : 
                    (task.priority === 'medium' || (task.priority as string) === 'normal') ? (locale === 'vi' ? 'Bình thường' : 'Normal') : 
                    (locale === 'vi' ? 'Thấp' : 'Low')
                  }</span>
                </span>
              )}

              {/* Team Icon / Pill if assigned */}
              {getTaskTeamIds(task).length > 0 && (
                <div className="flex items-center text-indigo-400 text-[10px] font-bold" title="Đội ngũ">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Extra chips: comments / attachments / due date */}
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 dark:text-zinc-500">
              {task.attachments && task.attachments.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" />
                  <span>{task.attachments.length}</span>
                </span>
              )}
              {task.commentsCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" />
                  <span>{task.commentsCount}</span>
                </span>
              )}
              {daysInfo && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border ${daysInfo.cls}`}>
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{daysInfo.text}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoizedKanbanCard = React.memo(KanbanCard);

const STATUS_META: Record<TaskStatus, { label: string; dot: string; headerBg: string; headerText: string; headerBorder: string; badgeBg: string; badgeText: string }> = {
  todo: { 
    label: 'TO DO', 
    dot: 'bg-slate-400', 
    headerBg: 'bg-transparent', 
    headerText: 'text-slate-500', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-slate-105 dark:bg-slate-800/80', 
    badgeText: 'text-slate-655 dark:text-slate-300 font-extrabold' 
  },
  inprogress: { 
    label: 'IN PROGRESS', 
    dot: 'bg-amber-505', 
    headerBg: 'bg-transparent', 
    headerText: 'text-amber-600', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-amber-100/70 dark:bg-amber-950/40', 
    badgeText: 'text-amber-755 dark:text-amber-400 font-extrabold' 
  },
  review: { 
    label: 'REVIEW', 
    dot: 'bg-cyan-505', 
    headerBg: 'bg-transparent', 
    headerText: 'text-cyan-600', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-cyan-100/70 dark:bg-cyan-950/40', 
    badgeText: 'text-cyan-755 dark:text-cyan-400 font-extrabold' 
  },
  completed: { 
    label: 'COMPLETE', 
    dot: 'bg-emerald-505', 
    headerBg: 'bg-transparent', 
    headerText: 'text-emerald-600', 
    headerBorder: 'border-transparent', 
    badgeBg: 'bg-emerald-100 dark:bg-emerald-955/40', 
    badgeText: 'text-emerald-700 dark:text-emerald-450 font-extrabold' 
  },
};

const PRIORITY_META: Record<Priority, { label: string; dot: string; bg: string; text: string; badgeBg: string; badgeText: string }> = {
  urgent: { 
    label: 'URGENT', 
    dot: 'bg-rose-505', 
    bg: 'bg-rose-50/50 dark:bg-rose-950/20', 
    text: 'text-rose-600', 
    badgeBg: 'bg-rose-100/70 dark:bg-rose-955/40', 
    badgeText: 'text-rose-700 dark:text-rose-400 font-extrabold' 
  },
  high: { 
    label: 'HIGH', 
    dot: 'bg-orange-505', 
    bg: 'bg-orange-50/50 dark:bg-orange-950/20', 
    text: 'text-orange-600', 
    badgeBg: 'bg-orange-100/70 dark:bg-orange-955/40', 
    badgeText: 'text-orange-700 dark:text-orange-400 font-extrabold' 
  },
  medium: { 
    label: 'MEDIUM', 
    dot: 'bg-yellow-505', 
    bg: 'bg-yellow-55/30 dark:bg-yellow-950/10', 
    text: 'text-yellow-755', 
    badgeBg: 'bg-yellow-55/60 dark:bg-yellow-950/20', 
    badgeText: 'text-yellow-700 dark:text-yellow-450 font-extrabold' 
  },
  low: { 
    label: 'LOW', 
    dot: 'bg-slate-400', 
    bg: 'bg-slate-100/60 dark:bg-slate-800/40', 
    text: 'text-slate-500 dark:text-slate-400', 
    badgeBg: 'bg-slate-100 dark:bg-slate-800', 
    badgeText: 'text-slate-700 dark:text-slate-300 font-extrabold' 
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
  if (diff < 0) return { text: `Overdue`, cls: 'text-rose-650 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)] font-black' };
  if (diff === 0) return { text: 'Today', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 font-black' };
  if (diff <= 3) return { text: `${diff}d`, cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 font-black' };
  return { text: `${diff}d`, cls: 'text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50' };
};

interface NormalizedState {
  tasks: Record<string, Task>;
  columns: Record<string, { id: string; title: string; taskIds: string[] }>;
  columnOrder: string[];
}

interface TaskBoardViewProps {
  customFields?: CustomFieldDefinition[];
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
  onStartFocus?: (task: Task) => void;
  activeTimerTaskId?: string | null;
  onStartGlobalTimer?: (id: string) => void;
  onStopGlobalTimer?: () => void;
  hideHeaderControls?: boolean;
  showEmptyStatuses?: boolean;
}

export default function TaskBoardView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddSyncLog, triggerToast, boardGroupBy, setBoardGroupBy,
  boardSwimlaneBy, setBoardSwimlaneBy, filterTag, setFilterTag,
  isSmartSort, isUrgentNearDueTask, isMultiSelectMode, activeDragId, activeOverDropId,
  cardSize = 'medium', setCardSize, cardCover = true, setCardCover, onAddTask, onStartFocus,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer, hideHeaderControls = false, customFields = [],
  showEmptyStatuses = true
}: TaskBoardViewProps) {

  const { t, locale } = useTranslation();
  const [statusConfigs, setStatusConfigs] = useState<OptionConfig[]>([]);
  const [priorityConfigs, setPriorityConfigs] = useState<OptionConfig[]>([]);

  const reloadMeta = () => {
    setStatusConfigs(getStoredStatuses());
    setPriorityConfigs(getStoredPriorities());
  };

  useEffect(() => {
    reloadMeta();
    window.addEventListener('apexa-field-config-changed', reloadMeta);
    return () => window.removeEventListener('apexa-field-config-changed', reloadMeta);
  }, []);

  const dynamicStatusMeta = useMemo(() => {
    const meta: Record<string, any> = {};
    const baseList = statusConfigs.length > 0 ? statusConfigs : [
      { id: 'todo', label: 'TO DO', color: 'slate' },
      { id: 'inprogress', label: 'IN PROGRESS', color: 'amber' },
      { id: 'review', label: 'REVIEW', color: 'cyan' },
      { id: 'completed', label: 'COMPLETE', color: 'emerald' }
    ];
    baseList.forEach(s => {
      const colorMeta = getColorOption(s.color);
      meta[s.id] = {
        label: getLocalizedOptionLabel(s.id, s.label, locale),
        dot: colorMeta.dot,
        hex: colorMeta.hex,
        headerBg: 'bg-transparent',
        headerText: colorMeta.text,
        headerBorder: 'border-transparent',
        badgeBg: colorMeta.bg,
        badgeText: `${colorMeta.text} font-extrabold`
      };
    });
    return meta;
  }, [locale, statusConfigs]);

  const dynamicPriorityMeta = useMemo(() => {
    const meta: Record<string, any> = {};
    const baseList = priorityConfigs.length > 0 ? priorityConfigs : [
      { id: 'urgent', label: 'URGENT', color: 'red' },
      { id: 'high', label: 'HIGH', color: 'orange' },
      { id: 'medium', label: 'MEDIUM', color: 'amber' },
      { id: 'low', label: 'LOW', color: 'slate' }
    ];
    baseList.forEach(p => {
      const colorMeta = getColorOption(p.color);
      meta[p.id] = {
        label: getLocalizedOptionLabel(p.id, p.label, locale).toUpperCase(),
        dot: colorMeta.dot,
        hex: colorMeta.hex,
        bg: colorMeta.bg,
        text: colorMeta.text,
        badgeBg: colorMeta.bg,
        badgeText: `${colorMeta.text} font-extrabold`
      };
    });
    return meta;
  }, [locale, priorityConfigs]);

  const dynamicPriorityColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const baseList = priorityConfigs.length > 0 ? priorityConfigs : [
      { id: 'urgent', color: 'red' },
      { id: 'high', color: 'orange' },
      { id: 'medium', color: 'amber' },
      { id: 'low', color: 'slate' }
    ];
    baseList.forEach(p => {
      const colorMeta = getColorOption(p.color);
      colors[p.id] = colorMeta.border;
    });
    return colors;
  }, [priorityConfigs]);

  const [isReady, setIsReady] = useState(false);
  const [localActiveDragId, setLocalActiveDragId] = useState<string | null>(null);
  const [localActiveOverDropId, setLocalActiveOverDropId] = useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<string[]>([]);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('apexa_kanban_collapsed_cols');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return {};
  });

  const toggleColumnCollapse = useCallback((colId: string) => {
    setCollapsedColumns(prev => {
      const next = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem('apexa_kanban_collapsed_cols', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);
  const [inlineAddCell, setInlineAddCell] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const isDraggingRef = useRef(false);

  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');

  // Column management states
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('indigo');
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const newColumnInputRef = useRef<HTMLInputElement | null>(null);
  const editColumnInputRef = useRef<HTMLInputElement | null>(null);

  // Close column dropdown menu when clicking outside
  useEffect(() => {
    if (!columnMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.apexa-column-menu-container')) {
        setColumnMenuOpen(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [columnMenuOpen]);

  const [localCardSize, setLocalCardSize] = useState<'small' | 'medium' | 'large'>(cardSize);
  const [localCardCover, setLocalCardCover] = useState<boolean>(cardCover);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => { setLocalCardSize(cardSize); }, [cardSize]);
  useEffect(() => { setLocalCardCover(cardCover); }, [cardCover]);

  const toggleCardSize = (size: 'small' | 'medium' | 'large') => {
    setLocalCardSize(size);
    if (setCardSize) setCardSize(size);
  };

  const toggleCardCover = (val: boolean) => {
    setLocalCardCover(val);
    if (setCardCover) setCardCover(val);
  };

  useEffect(() => {
    if (localActiveDragId) {
      isDraggingRef.current = true;
    } else {
      const timer = setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localActiveDragId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const collisionDetectionStrategy = useCallback((args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    return closestCorners(args);
  }, []);

  const findColumnOfTask = (taskId: string) => {
    if (!boardState) return null;
    for (const colId of Object.keys(boardState.columns)) {
      if (boardState.columns[colId].taskIds.includes(taskId)) {
        return colId;
      }
    }
    return null;
  };

  const handleDragStart = (event: any) => {
    const activeId = event.active.id.toString();
    setLocalActiveDragId(activeId);
    if (boardState?.tasks[activeId]) {
      setActiveDragTask(boardState.tasks[activeId]);
    }
  };

  const columns: string[] = useMemo(() => {
    let base: string[];
    if (boardGroupBy === 'status') {
      base = statusConfigs.length > 0 ? statusConfigs.map(s => s.id) : ['todo', 'inprogress', 'review', 'completed'];
    } else if (boardGroupBy === 'priority') {
      base = priorityConfigs.length > 0 ? priorityConfigs.map(p => p.id) : ['urgent', 'high', 'medium', 'low'];
    } else {
      base = [...members.map(m => m.id), 'unassigned'];
    }
    if (showEmptyStatuses === false) {
      base = base.filter(col => {
        if (boardGroupBy === 'status') return filteredTasks.some(t => t.status === col);
        if (boardGroupBy === 'priority') return filteredTasks.some(t => t.priority === col);
        if (boardGroupBy === 'assignee') return filteredTasks.some(t => (t.assigneeId || 'unassigned') === col || (t.assigneeIds && t.assigneeIds.includes(col)));
        return true;
      });
    }
    return base;
  }, [boardGroupBy, members, statusConfigs, priorityConfigs, showEmptyStatuses, filteredTasks]);

  const swimlaneRows: string[] = useMemo(() => {
    if (boardSwimlaneBy === 'none') return [];
    if (boardSwimlaneBy === 'status') {
      return statusConfigs.length > 0 ? statusConfigs.map(s => s.id) : ['todo', 'inprogress', 'review', 'completed'];
    }
    if (boardSwimlaneBy === 'priority') {
      return priorityConfigs.length > 0 ? priorityConfigs.map(p => p.id) : ['urgent', 'high', 'medium', 'low'];
    }
    return [...members.map(m => m.id), 'unassigned'];
  }, [boardSwimlaneBy, members, statusConfigs, priorityConfigs]);

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

  const getColumnMeta = useCallback((colKey: string): BoardColumnMeta => {
    if (boardGroupBy === 'status') {
      const meta = dynamicStatusMeta[colKey];
      return meta 
        ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } 
        : { label: colKey.toUpperCase(), badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-300' };
    }
    if (boardGroupBy === 'priority') {
      const meta = dynamicPriorityMeta[colKey];
      return meta ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } : { label: colKey.toUpperCase(), badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-500 dark:text-slate-400' };
    }
    if (colKey === 'unassigned') {
      return { label: locale === 'vi' ? 'Chưa phân công' : 'Unassigned', badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-500 dark:text-slate-400 font-extrabold' };
    }
    const user = members.find(m => m.id === colKey);
    return { 
      label: user ? user.name : 'Unknown', 
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/20', 
      badgeText: 'text-indigo-600 dark:text-indigo-400 font-extrabold',
      avatar: user?.avatar
    };
  }, [boardGroupBy, dynamicStatusMeta, dynamicPriorityMeta, locale, members]);

  const getSwimlaneMeta = (rowKey: string): BoardColumnMeta => {
    if (boardSwimlaneBy === 'status') {
      const meta = dynamicStatusMeta[rowKey];
      return meta 
        ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } 
        : { label: rowKey.toUpperCase(), badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-300' };
    }
    if (boardSwimlaneBy === 'priority') {
      const meta = dynamicPriorityMeta[rowKey];
      return meta ? { label: meta.label, badgeBg: meta.badgeBg, badgeText: meta.badgeText } : { label: rowKey.toUpperCase(), badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-500 dark:text-slate-400' };
    }
    if (rowKey === 'unassigned') {
      return { label: locale === 'vi' ? 'Chưa phân công' : 'Unassigned', badgeBg: 'bg-slate-105 dark:bg-slate-850', badgeText: 'text-slate-500 dark:text-slate-400 font-extrabold' };
    }
    const user = members.find(m => m.id === rowKey);
    return { 
      label: user ? user.name : 'Unknown', 
      badgeBg: 'bg-indigo-55/65 dark:bg-indigo-950/20', 
      badgeText: 'text-indigo-650 dark:text-indigo-400 font-extrabold',
      avatar: user?.avatar
    };
  };

  // ── Normalized State Setup & Synchronizer ──
  const [boardState, setBoardState] = useState<NormalizedState | null>(null);

  useEffect(() => {
    if (isDraggingRef.current) return;
    const tasksObj: Record<string, Task> = {};
    filteredTasks.forEach(t => {
      tasksObj[t.id] = t;
    });

    const cols: Record<string, { id: string; title: string; taskIds: string[] }> = {};

    if (boardSwimlaneBy === 'none') {
      columns.forEach(colId => {
        const meta = getColumnMeta(colId);
        cols[colId] = {
          id: colId,
          title: meta.label,
          taskIds: []
        };
      });

      filteredTasks.forEach(t => {
        let colId = 'unassigned';
        if (boardGroupBy === 'status') {
          colId = t.status;
        } else if (boardGroupBy === 'priority') {
          colId = t.priority || 'low';
        } else if (boardGroupBy === 'assignee') {
          colId = t.assigneeId || 'unassigned';
        }

        if (cols[colId]) {
          cols[colId].taskIds.push(t.id);
        }
      });
    } else {
      swimlaneRows.forEach(row => {
        columns.forEach(col => {
          const cellId = `${row}__${col}`;
          cols[cellId] = {
            id: cellId,
            title: `${row} - ${col}`,
            taskIds: []
          };
        });
      });

      filteredTasks.forEach(t => {
        let colId = 'unassigned';
        if (boardGroupBy === 'status') {
          colId = t.status;
        } else if (boardGroupBy === 'priority') {
          colId = t.priority || 'low';
        } else if (boardGroupBy === 'assignee') {
          colId = t.assigneeId || 'unassigned';
        }

        let rowId = 'unassigned';
        if (boardSwimlaneBy === 'status') {
          rowId = t.status;
        } else if (boardSwimlaneBy === 'priority') {
          rowId = t.priority || 'low';
        } else if (boardSwimlaneBy === 'assignee') {
          rowId = t.assigneeId || 'unassigned';
        }

        const cellId = `${rowId}__${colId}`;
        if (cols[cellId]) {
          cols[cellId].taskIds.push(t.id);
        }
      });
    }

    setBoardState({
      tasks: tasksObj,
      columns: cols,
      columnOrder: columns
    });
  }, [filteredTasks, boardGroupBy, boardSwimlaneBy, columns, swimlaneRows, getColumnMeta]);

  const submitInlineEdit = (task: Task) => {
    if (inlineEditTitle.trim() && inlineEditTitle.trim() !== task.title) {
      onUpdateTask({ ...task, title: inlineEditTitle.trim() });
      if (onAddSyncLog) onAddSyncLog(`Renamed task: "${inlineEditTitle.trim()}"`);
    }
    setInlineEditTaskId(null);
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
      onAddSyncLog(locale === 'vi' ? `Thêm nhanh công việc: "${inlineTitle.trim()}"` : `Quick added task: "${inlineTitle.trim()}"`);
      if (triggerToast) triggerToast('success', locale === 'vi' ? 'Thêm công việc' : 'Add Task', `Đã thêm "${inlineTitle.trim()}"`);
    }
    setInlineTitle('');
    setInlineAddCell(null);
  };

  const handleOpenAddColumn = useCallback(() => {
    if (boardGroupBy === 'assignee') {
      setBoardGroupBy('status');
    }
    setIsAddingColumn(true);
    setTimeout(() => {
      if (boardScrollRef.current) {
        boardScrollRef.current.scrollTo({
          left: boardScrollRef.current.scrollWidth,
          behavior: 'smooth'
        });
      }
      newColumnInputRef.current?.focus();
    }, 120);
  }, [boardGroupBy, setBoardGroupBy]);

  useEffect(() => {
    const onOpenAdd = () => handleOpenAddColumn();
    window.addEventListener('apexa-open-add-board', onOpenAdd);
    return () => window.removeEventListener('apexa-open-add-board', onOpenAdd);
  }, [handleOpenAddColumn]);

  const handleCreateColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) return;

    const colorOpt = getColorOption(newColumnColor);
    const baseSlug = title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `board_${Date.now()}`;

    if (boardGroupBy === 'priority') {
      const list = priorityConfigs.length > 0 ? priorityConfigs : DEFAULT_PRIORITIES;
      const uniqueId = list.some(p => p.id === baseSlug) ? `${baseSlug}_${Date.now()}` : baseSlug;
      const newPriority: OptionConfig = {
        id: uniqueId,
        label: title,
        color: newColumnColor,
        bg: colorOpt.priorityPill,
        icon: 'Flag'
      };
      const updated = [...list, newPriority];
      savePriorities(updated);
      setPriorityConfigs(updated);
    } else {
      const list = statusConfigs.length > 0 ? statusConfigs : DEFAULT_STATUSES;
      const uniqueId = list.some(s => s.id === baseSlug) ? `${baseSlug}_${Date.now()}` : baseSlug;
      const newStatus: OptionConfig = {
        id: uniqueId,
        label: title,
        color: newColumnColor,
        dot: colorOpt.dot,
        bg: colorOpt.statusPill
      };
      const updated = [...list, newStatus];
      saveStatuses(updated);
      setStatusConfigs(updated);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('apexa-field-config-changed'));
    }

    setIsAddingColumn(false);
    setNewColumnTitle('');
    setNewColumnColor('indigo');

    if (triggerToast) {
      triggerToast('success', locale === 'vi' ? 'Thành công' : 'Success', locale === 'vi' ? `Đã thêm bảng "${title}"` : `Added column "${title}"`);
    }
    if (onAddSyncLog) {
      onAddSyncLog(locale === 'vi' ? `Tạo bảng mới: "${title}"` : `Created column: "${title}"`);
    }
  };

  const handleSaveRenameColumn = (colId: string) => {
    const title = editingColumnTitle.trim();
    if (!title) {
      setEditingColumnId(null);
      return;
    }

    if (boardGroupBy === 'priority') {
      const list = priorityConfigs.length > 0 ? priorityConfigs : DEFAULT_PRIORITIES;
      const updated = list.map(p => p.id === colId ? { ...p, label: title } : p);
      savePriorities(updated);
      setPriorityConfigs(updated);
    } else {
      const list = statusConfigs.length > 0 ? statusConfigs : DEFAULT_STATUSES;
      const updated = list.map(s => s.id === colId ? { ...s, label: title } : s);
      saveStatuses(updated);
      setStatusConfigs(updated);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('apexa-field-config-changed'));
    }

    setEditingColumnId(null);
    setEditingColumnTitle('');
    if (triggerToast) {
      triggerToast('success', locale === 'vi' ? 'Thành công' : 'Success', locale === 'vi' ? `Đã đổi tên bảng thành "${title}"` : `Renamed column to "${title}"`);
    }
  };

  const handleChangeColumnColor = (colId: string, colorId: string) => {
    const colorOpt = getColorOption(colorId);

    if (boardGroupBy === 'priority') {
      const list = priorityConfigs.length > 0 ? priorityConfigs : DEFAULT_PRIORITIES;
      const updated = list.map(p => p.id === colId ? { ...p, color: colorId, bg: colorOpt.priorityPill } : p);
      savePriorities(updated);
      setPriorityConfigs(updated);
    } else {
      const list = statusConfigs.length > 0 ? statusConfigs : DEFAULT_STATUSES;
      const updated = list.map(s => s.id === colId ? { ...s, color: colorId, dot: colorOpt.dot, bg: colorOpt.statusPill } : s);
      saveStatuses(updated);
      setStatusConfigs(updated);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('apexa-field-config-changed'));
    }
    setColumnMenuOpen(null);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (colId === 'todo' || colId === 'completed') {
      if (triggerToast) {
        triggerToast('warning', locale === 'vi' ? 'Không thể xóa' : 'Cannot delete', locale === 'vi' ? 'Bảng mặc định không thể xóa.' : 'Default column cannot be deleted.');
      }
      return;
    }

    const colMeta = getColumnMeta(colId);
    const confirmMsg = locale === 'vi'
      ? `Bạn có chắc muốn xóa bảng "${colMeta.label}"? Các công việc trong bảng sẽ được chuyển về "Cần làm".`
      : `Are you sure you want to delete column "${colMeta.label}"? Tasks in this column will be moved to "To Do".`;

    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
      return;
    }

    // Move tasks in this column to 'todo'
    const tasksInCol = filteredTasks.filter(t => (boardGroupBy === 'status' ? t.status === colId : t.priority === colId));
    for (const t of tasksInCol) {
      if (boardGroupBy === 'status') {
        onUpdateTask({ ...t, status: 'todo' });
        try {
          await supabase.from('tasks').update({ status: 'todo' }).eq('id', t.id);
        } catch (e) {
          console.error('Failed to move task to todo:', e);
        }
      } else if (boardGroupBy === 'priority') {
        onUpdateTask({ ...t, priority: 'medium' });
        try {
          await supabase.from('tasks').update({ priority: 'medium' }).eq('id', t.id);
        } catch (e) {
          console.error('Failed to move task to medium priority:', e);
        }
      }
    }

    if (boardGroupBy === 'priority') {
      const list = priorityConfigs.length > 0 ? priorityConfigs : DEFAULT_PRIORITIES;
      const updated = list.filter(p => p.id !== colId);
      savePriorities(updated);
      setPriorityConfigs(updated);
    } else {
      const list = statusConfigs.length > 0 ? statusConfigs : DEFAULT_STATUSES;
      const updated = list.filter(s => s.id !== colId);
      saveStatuses(updated);
      setStatusConfigs(updated);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('apexa-field-config-changed'));
    }

    setColumnMenuOpen(null);

    if (triggerToast) {
      triggerToast('success', locale === 'vi' ? 'Đã xóa bảng' : 'Column deleted', locale === 'vi' ? `Đã xóa bảng "${colMeta.label}"` : `Deleted column "${colMeta.label}"`);
    }
    if (onAddSyncLog) {
      onAddSyncLog(locale === 'vi' ? `Xóa bảng: "${colMeta.label}"` : `Deleted column: "${colMeta.label}"`);
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over || !boardState) {
      if (localActiveOverDropId !== null) setLocalActiveOverDropId(null);
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) return;

    // Find the columns/cells
    const activeCol = findColumnOfTask(activeId);
    let overCol = findColumnOfTask(overId);

    if (!overCol && boardState.columns[overId]) {
      overCol = overId;
    }

    if (overCol) {
      if (localActiveOverDropId !== overCol) {
        setLocalActiveOverDropId(overCol);
      }
    } else if (localActiveOverDropId !== null) {
      setLocalActiveOverDropId(null);
    }

    if (!activeCol || !overCol || activeCol === overCol) return;

    // Move task to new column in state optimistically
    setBoardState(prev => {
      if (!prev) return prev;
      const startCol = prev.columns[activeCol];
      const endCol = prev.columns[overCol];
      if (!startCol || !endCol) return prev;

      let overIndex = endCol.taskIds.indexOf(overId);
      if (overIndex === -1) {
        overIndex = endCol.taskIds.length;
      }

      if (endCol.taskIds.includes(activeId)) {
        const currentIdx = endCol.taskIds.indexOf(activeId);
        if (currentIdx === overIndex) return prev;
      }

      const newStartIds = startCol.taskIds.filter(id => id !== activeId);
      const newEndIds = endCol.taskIds.filter(id => id !== activeId);
      newEndIds.splice(overIndex, 0, activeId);

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [activeCol]: { ...startCol, taskIds: newStartIds },
          [overCol]: { ...endCol, taskIds: newEndIds }
        }
      };
    });
  };

  const handleDragEnd = async (event: any) => {
    setLocalActiveDragId(null);
    setLocalActiveOverDropId(null);
    setTimeout(() => {
      setActiveDragTask(null);
    }, 250);

    const { active, over } = event;

    if (!over || !boardState) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const activeCol = findColumnOfTask(activeId);
    let overCol = findColumnOfTask(overId);

    if (!overCol && boardState.columns[overId]) {
      overCol = overId;
    }

    if (!activeCol || !overCol) return;

    const startCol = boardState.columns[activeCol];
    const endCol = boardState.columns[overCol];

    const nextBoardState = { ...boardState };

    // Case A: Dragged within the same column
    if (activeCol === overCol) {
      const activeIndex = startCol.taskIds.indexOf(activeId);
      const overIndex = startCol.taskIds.indexOf(overId);

      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        const newTaskIds = [...startCol.taskIds];
        newTaskIds.splice(activeIndex, 1);
        newTaskIds.splice(overIndex, 0, activeId);

        nextBoardState.columns[activeCol] = {
          ...startCol,
          taskIds: newTaskIds
        };
        setBoardState(nextBoardState);
      }
    } 
    // Case B: Dragged across columns
    else {
      let overIndex = endCol.taskIds.indexOf(overId);
      if (overIndex === -1) {
        overIndex = endCol.taskIds.length;
      }

      const newStartIds = startCol.taskIds.filter(id => id !== activeId);
      const newEndIds = endCol.taskIds.filter(id => id !== activeId);
      newEndIds.splice(overIndex, 0, activeId);

      nextBoardState.columns[activeCol] = {
        ...startCol,
        taskIds: newStartIds
      };
      nextBoardState.columns[overCol] = {
        ...endCol,
        taskIds: newEndIds
      };
      setBoardState(nextBoardState);
    }

    // Determine target column and swimlane
    let targetColumn = overCol;
    let targetSwimlane = '';

    if (overCol.includes('__')) {
      const parts = overCol.split('__');
      targetSwimlane = parts[0];
      targetColumn = parts[1];
    }

    const taskToUpdate = filteredTasks.find(t => t.id === activeId);
    if (!taskToUpdate) return;

    const position = nextBoardState.columns[overCol].taskIds.indexOf(activeId);

    // Save previous state for rollback in case of DB update failure
    const prevBoardState = { ...boardState };

    const updatedFields: Partial<Task> = {
      position
    };

    if (boardGroupBy === 'status') {
      updatedFields.status = targetColumn as TaskStatus;
    } else if (boardGroupBy === 'priority') {
      updatedFields.priority = targetColumn as Priority;
    } else if (boardGroupBy === 'assignee') {
      updatedFields.assigneeId = targetColumn === 'unassigned' ? undefined : targetColumn;
    }

    if (boardSwimlaneBy !== 'none' && targetSwimlane) {
      if (boardSwimlaneBy === 'status') {
        updatedFields.status = targetSwimlane as TaskStatus;
      } else if (boardSwimlaneBy === 'priority') {
        updatedFields.priority = targetSwimlane as Priority;
      } else if (boardSwimlaneBy === 'assignee') {
        updatedFields.assigneeId = targetSwimlane === 'unassigned' ? undefined : targetSwimlane;
      }
    }

    const updatedTask = { ...taskToUpdate, ...updatedFields };

    try {
      const payload: any = {
        status: updatedTask.status,
        priority: updatedTask.priority || null,
        assigneeId: updatedTask.assigneeId || null,
        position
      };

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', activeId);

      if (error) {
        console.error('Supabase Board Drag Update Error:', error);
        setBoardState(prevBoardState);
        if (triggerToast) {
          triggerToast('error', locale === 'vi' ? 'Lỗi cập nhật' : 'Sync Error', locale === 'vi' ? 'Không thể lưu vị trí công việc mới: ' + error.message : 'Could not save new task position: ' + error.message);
        }
      } else {
        onUpdateTask(updatedTask);
        const changeDesc = Object.entries(updatedFields)
          .map(([k, v]) => `${k} sang "${v}"`)
          .join(', ');
        onAddSyncLog(`Di chuyển công việc "${taskToUpdate.title}": ${changeDesc}`);
      }
    } catch (err: any) {
      console.error('Exception during drag sync:', err);
      setBoardState(prevBoardState);
      if (triggerToast) {
        triggerToast('error', locale === 'vi' ? 'Lỗi kết nối' : 'Connection Error', locale === 'vi' ? 'Không thể kết nối đến máy chủ.' : 'Could not connect to server.');
      }
    }
  };

  const renderCard = (task: Task, index: number) => {
    return (
      <MemoizedKanbanCard
        customFields={customFields}
        key={task.id}
        task={task}
        index={index}
        members={members}
        workspaces={workspaces}
        localCardSize={localCardSize}
        localCardCover={localCardCover}
        selectedTaskIds={selectedTaskIds}
        setSelectedTaskIds={setSelectedTaskIds}
        setSelectedTask={setSelectedTask}
        activeTimerTaskId={activeTimerTaskId}
        onStartGlobalTimer={onStartGlobalTimer}
        onStopGlobalTimer={onStopGlobalTimer}
        onUpdateTask={onUpdateTask}
        onAddSyncLog={onAddSyncLog}
        triggerToast={triggerToast}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        dynamicPriorityColors={dynamicPriorityColors}
        PRIORITY_COLORS={PRIORITY_COLORS}
        dynamicPriorityMeta={dynamicPriorityMeta}
        inlineEditTaskId={inlineEditTaskId}
        setInlineEditTaskId={setInlineEditTaskId}
        inlineEditTitle={inlineEditTitle}
        setInlineEditTitle={setInlineEditTitle}
        submitInlineEdit={submitInlineEdit}
        isDraggingRef={isDraggingRef}
        onAddTask={onAddTask}
      />
    );
  };

  const renderOverlayCard = (task: Task) => {
    const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
    const assignees = members.filter(m => assigneeIds.includes(m.id === 'user' ? 'user' : m.id) || assigneeIds.includes(m.id));
    const daysInfo = getDaysText(task.dueDate);
    const imageAttachment = localCardCover ? task.attachments?.find(a => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name)) : null;
    
    const paddingCls = localCardSize === 'small' ? 'p-2' : localCardSize === 'large' ? 'p-4.5' : 'p-3.5';
    const titleCls = localCardSize === 'small' ? 'text-xs font-semibold' : localCardSize === 'large' ? 'text-sm font-bold' : 'text-[12.5px] font-bold';
    const descCls = localCardSize === 'small' ? 'hidden' : 'text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed';

    return (
      <div 
        className={`rounded-2xl border-l-[3.5px] ${task.priority && (task.priority as string) !== 'none' ? (dynamicPriorityColors[task.priority] || PRIORITY_COLORS[task.priority]) : 'border-l-slate-300 dark:border-l-slate-700'} border-y border-r border-indigo-400 dark:border-indigo-400/90 bg-white/98 dark:bg-[#12141a]/98 cursor-grabbing shadow-[0_28px_64px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_80px_-10px_rgba(0,0,0,0.85)] scale-[1.04] rotate-[2.2deg] ring-4 ring-indigo-500/25 dark:ring-indigo-400/30 card-bevel-edge overflow-hidden will-change-transform backdrop-blur-md`}
      >
        {imageAttachment && (
          <div className="w-full relative overflow-hidden bg-slate-50 dark:bg-slate-955" style={{ height: localCardSize === 'small' ? '65px' : localCardSize === 'large' ? '120px' : '90px' }}>
            <SignedImage filePath={imageAttachment.filePath} className="w-full h-full object-cover" alt={task.title} fallback={`https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300`} />
          </div>
        )}

        <div className={paddingCls}>
          {localCardSize === 'small' ? (
            <div className="flex items-center gap-2">
              <div className="text-slate-400 dark:text-slate-500 p-1 rounded shrink-0">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <h4 className={`${titleCls} leading-snug truncate flex-1 ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                {task.title}
              </h4>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="text-slate-400 dark:text-slate-500 p-1 rounded shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <input type="checkbox" checked={selectedTaskIds.includes(task.id)} readOnly className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600" />
                  {task.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                </div>
                {task.priority && (task.priority as string) !== 'none' && (
                  <div className="flex items-center gap-1">
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-md select-none border ${
                      task.priority === 'urgent' ? 'bg-rose-50 border-rose-200/80 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400' :
                      task.priority === 'high' ? 'bg-orange-50 border-orange-200/80 text-orange-600 dark:bg-orange-950/30 dark:border-orange-900/40 dark:text-orange-400' :
                      task.priority === 'medium' || (task.priority as string) === 'normal' ? 'bg-blue-50 border-blue-200/80 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400' :
                      'bg-slate-50 border-slate-200/80 text-slate-600 dark:bg-slate-800/40 dark:border-slate-700/50 dark:text-slate-400'
                    }`}>
                      {dynamicPriorityMeta[task.priority]?.label || (task.priority === 'medium' || (task.priority as string) === 'normal' ? (locale === 'vi' ? 'Bình thường' : 'Normal') : task.priority)}
                    </span>
                  </div>
                )}
              </div>

              <h4 className={`${titleCls} leading-snug ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                {task.title}
              </h4>

              {task.description && (
                <p className={descCls}>{task.description}</p>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                  {task.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[8.5px] font-extrabold px-2 py-0.5 rounded-lg border bg-indigo-50/20 dark:bg-indigo-955/25 border-indigo-100/10 dark:border-indigo-900/10 text-indigo-650 dark:text-indigo-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-2.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold select-none">
                <div className="flex items-center gap-1.5">
                  {assignees.length > 0 ? (
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {assignees.map(member => (
                        <div key={member.id} className="relative">
                          {member.avatar ? (
                            <SignedImage filePath={member.avatar} className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-900 shadow-3xs" alt={member.name} />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[9px] border border-white dark:border-slate-900">
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center dark:bg-slate-800/40 dark:border-slate-800/80"><UserIcon className="w-3 h-3" /></div>
                  )}
                  {task.commentsCount > 0 && (
                    <span className="flex items-center gap-0.5 ml-1">
                      <MessageSquare className="w-3 h-3 text-slate-350" />
                      {task.commentsCount}
                    </span>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Paperclip className="w-3 h-3 text-slate-355" />
                      {task.attachments.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {daysInfo && (
                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[8.5px] font-black border border-transparent ${daysInfo.cls}`}>
                      <Calendar className="w-2.5 h-2.5" />
                      {daysInfo.text}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Skeleton Loader for SSR / Next.js Hydration safety
  if (!isReady || !boardState) {
    return (
      <div className="flex flex-col h-full w-full select-none animate-pulse">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-3 mb-4 h-12" />
        <div className="flex gap-3 sm:gap-3.5 overflow-x-auto pb-4 custom-scrollbar">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="w-[265px] sm:w-[275px] min-w-[265px] sm:min-w-[275px] flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/25 p-3 rounded-xl border border-slate-200/50 dark:border-slate-805/50 flex flex-col gap-3">
              <div className="flex justify-between items-center h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg w-1/2" />
              <div className="space-y-3 mt-2">
                {[1, 2].map(cIdx => (
                  <div key={cIdx} className="h-28 bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/30 rounded-xl p-3 space-y-3" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="apexa-space-board flex flex-col h-full w-full flex-1 min-h-0">
        
        {/* Kanban Board Controls Bar (Sleek & Integrated - Hidden when unified with top filterbar) */}
        {!hideHeaderControls && (
          <div className="apexa-board-controls flex flex-wrap items-center justify-between gap-2.5 px-0.5 py-1 mb-3 text-xs select-none">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Group By Selector */}
              <div className="flex items-center gap-1 bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 rounded-xl px-2.5 shadow-3xs h-8 transition-colors">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold">
                  {locale === 'vi' ? 'Nhóm:' : 'Group:'}
                </span>
                <Select
                  value={boardGroupBy}
                  onChange={(v) => {
                    setBoardGroupBy(v);
                    if (boardSwimlaneBy === v) {
                      setBoardSwimlaneBy('none');
                    }
                  }}
                  size="sm"
                  variant="inline"
                  ariaLabel={locale === 'vi' ? 'Nhóm theo' : 'Group by'}
                  options={[
                    { value: 'status', label: locale === 'vi' ? 'Trạng thái' : 'Status' },
                    { value: 'priority', label: locale === 'vi' ? 'Mức ưu tiên' : 'Priority' },
                    { value: 'assignee', label: locale === 'vi' ? 'Người phụ trách' : 'Assignee' },
                  ]}
                />
              </div>

              {/* Swimlane Selector */}
              <div className="flex items-center gap-1 bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 rounded-xl px-2.5 shadow-3xs h-8 transition-colors">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold">
                  {locale === 'vi' ? 'Làn bơi:' : 'Swimlane:'}
                </span>
                <Select
                  value={boardSwimlaneBy}
                  onChange={(v) => setBoardSwimlaneBy(v)}
                  size="sm"
                  variant="inline"
                  ariaLabel={locale === 'vi' ? 'Làn công việc' : 'Swimlane'}
                  options={[
                    { value: 'none', label: locale === 'vi' ? 'Không' : 'None' },
                    ...(boardGroupBy !== 'status' ? [{ value: 'status' as const, label: locale === 'vi' ? 'Trạng thái' : 'Status' }] : []),
                    ...(boardGroupBy !== 'priority' ? [{ value: 'priority' as const, label: locale === 'vi' ? 'Mức ưu tiên' : 'Priority' }] : []),
                    ...(boardGroupBy !== 'assignee' ? [{ value: 'assignee' as const, label: locale === 'vi' ? 'Người phụ trách' : 'Assignee' }] : []),
                  ]}
                />
              </div>
            </div>

            {/* Right Controls: Card Size, Covers, Add Column */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Card Size Selector */}
              <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/[0.07] rounded-xl p-0.5 shadow-3xs">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleCardSize(size)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                      localCardSize === size
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/70 dark:border-white/[0.08]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title={locale === 'vi' ? `Kích cỡ thẻ: ${{ small: 'Nhỏ', medium: 'Vừa', large: 'Lớn' }[size]}` : `Card size: ${{ small: 'Small', medium: 'Medium', large: 'Large' }[size]}`}
                  >
                    {{ small: locale === 'vi' ? 'Nhỏ' : 'Small', medium: locale === 'vi' ? 'Vừa' : 'Medium', large: locale === 'vi' ? 'Lớn' : 'Large' }[size]}
                  </button>
                ))}
              </div>

              {/* Show Covers Toggle Button */}
              <button
                type="button"
                onClick={() => toggleCardCover(!localCardCover)}
                className={`h-7.5 px-2.5 border rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-[11px] font-bold shadow-3xs ${
                  localCardCover
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-700/80 text-indigo-600 dark:text-sky-300'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={locale === 'vi' ? 'Bật/tắt hiển thị ảnh đính kèm làm bìa' : 'Toggle cover images'}
              >
                <Paperclip className="w-3 h-3" />
                <span>{locale === 'vi' ? 'Ảnh bìa' : 'Covers'}</span>
              </button>

              {/* Add Column Button */}
              <button
                type="button"
                onClick={handleOpenAddColumn}
                className="h-7.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11.5px] flex items-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer active:scale-95 transition-all"
                title={locale === 'vi' ? 'Thêm bảng / cột trạng thái mới' : 'Add new column'}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{locale === 'vi' ? 'Thêm bảng' : 'Add Board'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Board Main Area */}
        {boardSwimlaneBy === 'none' ? (
          <div 
            ref={boardScrollRef}
            className="flex gap-3 sm:gap-3.5 overflow-x-auto pb-6 custom-scrollbar custom-touch-scroll select-none px-1 flex-1 min-h-0 h-full items-start"
          >
            {columns.map(col => {
              const colMeta = getColumnMeta(col);
              const colTasks = boardState.columns[col]?.taskIds.map(id => boardState.tasks[id]).filter(Boolean) || [];
              const isOverColumn = localActiveOverDropId === col;
              const isColCollapsed = !!collapsedColumns[col];

              if (isColCollapsed) {
                return (
                  <div
                    key={col}
                    role="group"
                    onClick={() => toggleColumnCollapse(col)}
                    aria-label={`${colMeta.label}: ${colTasks.length} ${locale === 'vi' ? 'công việc' : 'tasks'} (Thu gọn)`}
                    className={`apexa-board-column-collapsed w-11 min-w-[44px] max-w-[44px] h-[260px] flex-shrink-0 bg-slate-100/80 dark:bg-[#121316] hover:bg-slate-200/70 dark:hover:bg-[#18191f] py-3.5 px-1 rounded-xl flex flex-col items-center justify-between transition-all duration-150 border border-slate-200/80 dark:border-white/[0.08] cursor-pointer group/collapsed shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 ${
                      isOverColumn ? 'ring-2 ring-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/40 border-indigo-400/60' : ''
                    }`}
                    title={locale === 'vi' ? `Nhấp để mở rộng cột ${colMeta.label}` : `Click to expand column ${colMeta.label}`}
                  >
                    <KanbanColumn id={col} isOver={isOverColumn} isCollapsed={true}>
                      <div className="flex flex-col items-center gap-3 w-full h-full py-1">
                        {/* Expand Icon Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleColumnCollapse(col);
                          }}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors shadow-3xs"
                          title={locale === 'vi' ? 'Mở rộng cột' : 'Expand column'}
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Dotted circle icon (Image 2) */}
                        <div className="flex items-center justify-center w-6 h-6 text-zinc-400 dark:text-zinc-500">
                          <CircleDot className="w-4 h-4" />
                        </div>

                        {/* Task Count badge */}
                        <span className="font-black text-[11px] px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 min-w-[20px] text-center shadow-3xs">
                          {colTasks.length}
                        </span>

                        {/* Vertical Status Label (Image 2) */}
                        <div className="flex-1 flex items-center justify-center my-3">
                          <span 
                            className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover/collapsed:text-zinc-100 transition-colors select-none"
                            style={{
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                            }}
                          >
                            {colMeta.label}
                          </span>
                        </div>

                        {/* Quick add */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleColumnCollapse(col);
                            setInlineAddCell(col);
                            setInlineTitle('');
                          }}
                          className="w-7 h-7 rounded-lg bg-white/60 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                          title={locale === 'vi' ? 'Thêm công việc' : 'Add task'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </KanbanColumn>
                  </div>
                );
              }
                         
              return (
                <div 
                  key={col} 
                  role="group"
                  aria-label={`${colMeta.label}: ${colTasks.length} ${locale === 'vi' ? 'công việc' : 'tasks'}`}
                  style={{ '--column-accent': boardGroupBy === 'status' ? ({ todo: '#8190a8', inprogress: '#e9a23b', review: '#7c6ce7', completed: '#26a885' }[col] || '#8190a8') : boardGroupBy === 'priority' ? ({ urgent: '#dc668b', high: '#e9a23b', medium: '#5871e9', low: '#26a885' }[col] || '#8190a8') : '#5871e9' } as React.CSSProperties}
                  className={`apexa-board-column w-[275px] sm:w-[285px] min-w-[275px] sm:min-w-[285px] flex-shrink-0 bg-slate-100/70 dark:bg-[#06070a]/90 backdrop-blur-2xl p-3 rounded-2xl flex flex-col gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:border-slate-300 dark:hover:border-white/15 h-fit max-h-[calc(100vh-190px)] ${
                    isOverColumn ? 'ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400/80 scale-[1.005]' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex flex-col gap-1.5 px-0.5 py-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      {editingColumnId === col ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={editColumnInputRef}
                            type="text"
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveRenameColumn(col);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingColumnId(null);
                                setEditingColumnTitle('');
                              }
                            }}
                            onBlur={() => {
                              if (editingColumnTitle.trim() && editingColumnTitle.trim() !== colMeta.label) {
                                handleSaveRenameColumn(col);
                              } else {
                                setEditingColumnId(null);
                                setEditingColumnTitle('');
                              }
                            }}
                            className="px-2 py-0.5 text-xs font-black bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg text-slate-800 dark:text-slate-100 outline-none w-full shadow-xs focus:ring-1.5 focus:ring-indigo-500/30"
                            autoFocus
                          />
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSaveRenameColumn(col)}
                            className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors shrink-0"
                            title={locale === 'vi' ? 'Lưu' : 'Save'}
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setEditingColumnId(null); setEditingColumnTitle(''); }}
                            className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors shrink-0"
                            title={locale === 'vi' ? 'Hủy' : 'Cancel'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer select-none group/colheader"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (boardGroupBy === 'status' || boardGroupBy === 'priority') {
                              setEditingColumnId(col);
                              setEditingColumnTitle(colMeta.label);
                              setTimeout(() => {
                                editColumnInputRef.current?.focus();
                                editColumnInputRef.current?.select();
                              }, 80);
                            }
                          }}
                          title={boardGroupBy === 'status' || boardGroupBy === 'priority' ? (locale === 'vi' ? 'Nhấp đúp để đổi tên' : 'Double click to rename') : undefined}
                        >
                          {colMeta.avatar && (
                            <SignedImage filePath={colMeta.avatar} className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-3xs" alt={colMeta.label} />
                          )}
                          <span className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black tracking-wider uppercase flex items-center gap-1.5 border shadow-3xs transition-transform group-hover/colheader:scale-[1.02] ${colMeta.badgeBg} ${colMeta.badgeText}`}>
                            <CircleDot className="w-3 h-3 shrink-0" />
                            {col === 'completed' && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3px]" />}
                            {colMeta.label}
                          </span>
                          <span className={`font-black text-[11px] px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800/90 border border-slate-200/60 dark:border-white/[0.1] min-w-[24px] text-center shadow-3xs ${
                            col === 'completed' ? 'text-emerald-600 bg-emerald-100/70 dark:bg-emerald-950/50 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-200'
                          }`}>
                            {colTasks.length}
                          </span>
                          {/* WIP Limit warning badge if tasks > 6 (only for active work, not completed) */}
                          {col !== 'completed' && colTasks.length > 6 && (
                            <span className="text-[8.5px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/50 animate-pulse">
                              Giới hạn WIP
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {/* Collapse Column Button (Image 2) */}
                        <button
                          onClick={() => toggleColumnCollapse(col)}
                          className="w-6 h-6 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-3xs"
                          title={locale === 'vi' ? 'Thu gọn cột' : 'Collapse column'}
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => { setInlineAddCell(col); setInlineTitle(''); }}
                          className="w-6 h-6 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/[0.08] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-400 flex items-center justify-center transition-all cursor-pointer shadow-3xs"
                          title={locale === 'vi' ? 'Thêm công việc' : 'Add task'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {(boardGroupBy === 'status' || boardGroupBy === 'priority') && (
                          <div className="relative apexa-column-menu-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setColumnMenuOpen(columnMenuOpen === col ? null : col);
                              }}
                              className="w-6 h-6 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-3xs"
                              title={locale === 'vi' ? 'Tùy chọn bảng' : 'Board options'}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {columnMenuOpen === col && (
                              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => {
                                    toggleColumnCollapse(col);
                                    setColumnMenuOpen(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <ChevronsLeft className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{locale === 'vi' ? 'Thu gọn cột' : 'Collapse column'}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingColumnId(col);
                                    setEditingColumnTitle(colMeta.label);
                                    setColumnMenuOpen(null);
                                    setTimeout(() => editColumnInputRef.current?.focus(), 80);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{locale === 'vi' ? 'Đổi tên bảng' : 'Rename board'}</span>
                                </button>

                                <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                                    {locale === 'vi' ? 'Màu sắc' : 'Color'}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {COLOR_PALETTE.slice(0, 10).map(cp => (
                                      <button
                                        key={cp.id}
                                        type="button"
                                        onClick={() => handleChangeColumnColor(col, cp.id)}
                                        className={`w-4 h-4 rounded-full ${cp.dot} hover:scale-125 transition-transform cursor-pointer`}
                                        title={locale === 'vi' ? cp.nameVi : cp.name}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                                  {col === 'todo' || col === 'completed' ? (
                                    <div className="px-3 py-1 text-[10px] text-slate-400 italic">
                                      {locale === 'vi' ? 'Bảng mặc định' : 'Default column'}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteColumn(col)}
                                      className="w-full px-3 py-1.5 text-left text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      <span>{locale === 'vi' ? 'Xóa bảng' : 'Delete board'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column Percentage Progress Bar */}
                    <div className="w-full h-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          col === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((colTasks.length / Math.max(1, filteredTasks.length)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Column Droppable Area with drop highlights */}
                  <KanbanColumn id={col} isOver={isOverColumn}>
                    <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map((task, index) => renderCard(task, index))}
                    </SortableContext>

                    {/* Inline Add Task Form */}
                    <AnimatePresence>
                      {inlineAddCell === col && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="p-3 bg-white dark:bg-[#15161c] rounded-2xl border-2 border-indigo-500 shadow-xl space-y-3 select-text backdrop-blur-md card-bevel-edge ring-2 ring-indigo-500/20"
                        >
                          <input
                            type="text"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineAddSubmit(col);
                              else if (e.key === 'Escape') { setInlineAddCell(null); setInlineTitle(''); }
                            }}
                            placeholder={locale === 'vi' ? 'Tên công việc mới... (Nhấn Enter ↵)' : 'New task title... (Press Enter ↵)'}
                            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400"
                            autoFocus
                          />
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500">Esc để hủy</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setInlineAddCell(null); setInlineTitle(''); }} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors tactile-press">{locale === 'vi' ? 'Hủy' : 'Cancel'}</button>
                              <button onClick={() => handleInlineAddSubmit(col)} className="px-3 py-1 rounded-lg bg-[#0071E3] hover:bg-blue-600 text-white font-bold shadow-xs cursor-pointer transition-all tactile-press">{locale === 'vi' ? 'Lưu' : 'Save'}</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {inlineAddCell !== col && (
                      <button
                        type="button"
                        onClick={() => { setInlineAddCell(col); setInlineTitle(''); }}
                        className="space-board-empty w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-300 hover:bg-white/80 dark:hover:bg-white/[0.04] border border-dashed border-slate-300/80 dark:border-white/[0.1] rounded-xl transition-all cursor-pointer group shadow-3xs hover:shadow-xs tactile-press"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" />
                        <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                          {locale === 'vi' ? 'Thêm công việc' : 'Add task'}
                        </span>
                      </button>
                    )}
                  </KanbanColumn>
                </div>
              );
            })}
            
            {/* Add Column Card */}
            <div className="w-[265px] sm:w-[275px] min-w-[265px] sm:min-w-[275px] flex-shrink-0">
              {isAddingColumn ? (
                <div className="bg-white dark:bg-[#0a0b10] p-3.5 rounded-xl flex flex-col gap-3 border border-indigo-500/80 dark:border-indigo-500 shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorOption(newColumnColor).hex }} />
                      {locale === 'vi' ? 'Thêm bảng mới' : 'Add New Column'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {locale === 'vi' ? 'Tên bảng / cột' : 'Column Name'}
                      </label>
                      <input
                        ref={newColumnInputRef}
                        type="text"
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateColumn();
                          else if (e.key === 'Escape') {
                            setIsAddingColumn(false);
                            setNewColumnTitle('');
                          }
                        }}
                        placeholder={locale === 'vi' ? 'Ví dụ: Đang kiểm thử, Tạm hoãn...' : 'e.g. In QA, Blocked...'}
                        className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>

                    {/* Color Swatches */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {locale === 'vi' ? 'Màu sắc đại diện' : 'Color theme'}
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                        {COLOR_PALETTE.slice(0, 10).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNewColumnColor(c.id)}
                            className={`w-6 h-6 rounded-lg transition-transform cursor-pointer relative flex items-center justify-center ${c.dot} ${
                              newColumnColor === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-xs' : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            title={locale === 'vi' ? c.nameVi : c.name}
                          >
                            {newColumnColor === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumnTitle('');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        {locale === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateColumn}
                        disabled={!newColumnTitle.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0071E3] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        {locale === 'vi' ? 'Thêm bảng' : 'Add Column'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenAddColumn}
                  className="w-full min-h-[120px] flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300/80 dark:border-white/[0.1] hover:border-blue-400 dark:hover:border-blue-500/60 bg-slate-100/50 dark:bg-[#06070a]/50 hover:bg-white dark:hover:bg-[#0a0b10] text-slate-500 dark:text-slate-400 hover:text-[#0071E3] dark:hover:text-sky-300 transition-all duration-150 cursor-pointer group shadow-3xs hover:shadow-md"
                >
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#0a0b10] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:border-blue-300 dark:group-hover:border-blue-500/50 transition-all duration-150">
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-[#0071E3] dark:group-hover:text-sky-300 transition-colors" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold tracking-tight block">
                      {locale === 'vi' ? '+ Thêm bảng mới' : '+ Add new column'}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        ) : (
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
                    <div key={col} className="w-[265px] sm:w-[275px] min-w-[265px] sm:min-w-[275px] flex-shrink-0 px-2 py-1 flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-405">
                      {editingColumnId === col ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={editColumnInputRef}
                            type="text"
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveRenameColumn(col);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingColumnId(null);
                                setEditingColumnTitle('');
                              }
                            }}
                            onBlur={() => {
                              if (editingColumnTitle.trim() && editingColumnTitle.trim() !== colMeta.label) {
                                handleSaveRenameColumn(col);
                              } else {
                                setEditingColumnId(null);
                                setEditingColumnTitle('');
                              }
                            }}
                            className="px-2 py-0.5 text-xs font-black bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg text-slate-800 dark:text-slate-100 outline-none w-full shadow-xs focus:ring-1.5 focus:ring-indigo-500/30"
                            autoFocus
                          />
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSaveRenameColumn(col)}
                            className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors shrink-0"
                            title={locale === 'vi' ? 'Lưu' : 'Save'}
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setEditingColumnId(null); setEditingColumnTitle(''); }}
                            className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors shrink-0"
                            title={locale === 'vi' ? 'Hủy' : 'Cancel'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer select-none group/colheader"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (boardGroupBy === 'status' || boardGroupBy === 'priority') {
                              setEditingColumnId(col);
                              setEditingColumnTitle(colMeta.label);
                              setTimeout(() => {
                                editColumnInputRef.current?.focus();
                                editColumnInputRef.current?.select();
                              }, 80);
                            }
                          }}
                          title={boardGroupBy === 'status' || boardGroupBy === 'priority' ? (locale === 'vi' ? 'Nhấp đúp để đổi tên' : 'Double click to rename') : undefined}
                        >
                          {colMeta.avatar && (
                            <SignedImage filePath={colMeta.avatar} className="w-4.5 h-4.5 rounded-full object-cover border border-slate-200 dark:border-slate-700" alt={colMeta.label} />
                          )}
                          <span className={`px-2 py-0.5 rounded-[4px] text-[10px] tracking-wider uppercase flex items-center gap-1.5 transition-transform group-hover/colheader:scale-[1.02] ${colMeta.badgeBg} ${colMeta.badgeText}`}>
                            {col === 'completed' && <Check className="w-3 h-3 text-emerald-650 stroke-[3px]" />}
                            {colMeta.label}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-extrabold">{colTasksCount}</span>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => { setInlineAddCell(col); setInlineTitle(''); }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button 
                  onClick={handleOpenAddColumn}
                  className="min-w-[140px] px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.1] hover:border-indigo-400 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                  title={locale === 'vi' ? 'Thêm bảng mới' : 'Add new column'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{locale === 'vi' ? 'Thêm bảng' : 'Add Board'}</span>
                </button>
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
                          <SignedImage filePath={swimlaneMeta.avatar} className="w-4 h-4 rounded-full object-cover" alt={swimlaneMeta.label} />
                        )}
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] tracking-wider uppercase font-black ${swimlaneMeta.badgeBg} ${swimlaneMeta.badgeText}`}>
                          {swimlaneMeta.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-505">
                          ({rowTasksCount} {rowTasksCount === 1 ? 'task' : 'tasks'})
                        </span>
                      </div>

                      {/* Row Cells */}
                      {!isCollapsed && (
                        <div className="flex gap-4">
                          {columns.map(col => {
                            const cellId = `${row}__${col}`;
                            const cellTasks = boardState.columns[cellId]?.taskIds.map(id => boardState.tasks[id]).filter(Boolean) || [];
                            const isOverCell = localActiveOverDropId === cellId;

                            return (
                              <div 
                                key={col} 
                                className={`w-[265px] sm:w-[275px] min-w-[265px] sm:min-w-[275px] flex-shrink-0 bg-slate-50/70 dark:bg-[#06070a]/60 p-3 rounded-xl flex flex-col gap-2 transition-[background-color,border-color,box-shadow,ring] duration-150 border border-slate-200/80 dark:border-white/[0.08] h-fit min-h-[60px] ${
                                  isOverCell ? 'ring-2 ring-indigo-400/50 bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                                }`}
                              >
                                <KanbanColumn id={cellId} isOver={isOverCell}>
                                  <SortableContext items={cellTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                    {cellTasks.map((task, index) => renderCard(task, index))}
                                  </SortableContext>

                                  {/* Inline Add Task Form */}
                                   <AnimatePresence>
                                     {inlineAddCell === cellId && (
                                       <motion.div 
                                         initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                         animate={{ opacity: 1, scale: 1, y: 0 }}
                                         exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                         transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                         className="p-3 bg-white dark:bg-[#15161c] rounded-xl border border-indigo-500 shadow-md ring-2 ring-indigo-500/20 space-y-2 select-text card-bevel-edge"
                                       >
                                         <input
                                           type="text"
                                           value={inlineTitle}
                                           onChange={(e) => setInlineTitle(e.target.value)}
                                           onKeyDown={(e) => {
                                             if (e.key === 'Enter') handleInlineAddSubmit(col, row);
                                             else if (e.key === 'Escape') { setInlineAddCell(null); setInlineTitle(''); }
                                           }}
                                           placeholder={locale === 'vi' ? 'Tên công việc...' : 'Task name...'}
                                           className="w-full text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                                           autoFocus
                                         />
                                         <div className="flex justify-end gap-1.5 text-[9px] font-bold">
                                           <button onClick={() => { setInlineAddCell(null); setInlineTitle(''); }} className="px-2 py-0.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer tactile-press">{locale === 'vi' ? 'Hủy' : 'Cancel'}</button>
                                           <button onClick={() => handleInlineAddSubmit(col, row)} className="px-2.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer tactile-press shadow-xs">{locale === 'vi' ? 'Lưu' : 'Save'}</button>
                                         </div>
                                       </motion.div>
                                     )}
                                   </AnimatePresence>

                                   {inlineAddCell !== cellId && (
                                     <button 
                                       type="button"
                                       onClick={() => { setInlineAddCell(cellId); setInlineTitle(''); }}
                                       className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-indigo-950/30 hover:border-indigo-400/60 dark:hover:border-indigo-500/40 border border-dashed border-slate-300/80 dark:border-white/[0.08] rounded-xl transition-all cursor-pointer text-center group shadow-3xs hover:shadow-xs tactile-press"
                                     >
                                       <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" />
                                       <span>{locale === 'vi' ? 'Thêm công việc' : 'Add Task'}</span>
                                     </button>
                                   )}
                                </KanbanColumn>
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

      <Portal>
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeDragTask ? (
            <div className="w-[315px] sm:w-[335px] 2xl:w-[350px] pointer-events-none">
              {renderOverlayCard(activeDragTask)}
            </div>
          ) : null}
        </DragOverlay>
      </Portal>
    </DndContext>
  );
}
