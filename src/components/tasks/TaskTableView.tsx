"use client";

import React, { useState } from 'react';
import { ArrowUpDown, Pin, MessageSquare, Paperclip, Plus, Check, X, Circle, CheckCircle2, Trophy, Flag, Timer, Pencil, ShieldAlert, ArrowLeft, ArrowRight, Zap, EyeOff, Copy, Trash2, Bot, Sparkles, SlidersHorizontal, Play, Clock } from 'lucide-react';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
import { Task, User, Workspace, TaskStatus } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker } from './TaskSelects';
import SignedImage from '../SignedImage';

const SortHeader = ({ col, label, className = '', sortCol, sortDir, onToggleSort }: { col: string; label: string; className?: string; sortCol: string; sortDir: 'asc' | 'desc'; onToggleSort: (col: string) => void }) => (
  <th onClick={() => onToggleSort(col)}
    className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors select-none border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 ${className}`}>
    <div className="flex items-center gap-1">
      <span>{label}</span>
      {sortCol === col && <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />}
    </div>
  </th>
);

interface TaskTableViewProps {
  filteredTasks: Task[];
  members: User[];
  workspaces?: Workspace[];
  selectedTaskIds: string[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTask: (task: Task | null) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & { workspaceId?: string; spaceId?: string; listId?: string }) => void;
  onAddSyncLog?: (log: string) => void;
  triggerToast?: (type: 'success' | 'info' | 'comment', title: string, desc: string) => void;
  visibleFields: string[];
  customFields: any[];
  onOpenFieldsPanel?: () => void;
  onStartFocus?: (task: Task) => void;
  setVisibleFields?: React.Dispatch<React.SetStateAction<string[]>>;
  setCustomFields?: React.Dispatch<React.SetStateAction<any[]>>;
  openDialog?: (config: any) => void;
  activeTimerTaskId?: string | null;
  onStartGlobalTimer?: (id: string) => void;
  onStopGlobalTimer?: () => void;
}

export default function TaskTableView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddTask, onAddSyncLog,
  visibleFields, customFields = [], onOpenFieldsPanel, onStartFocus,
  setVisibleFields, setCustomFields, openDialog, triggerToast,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer
}: TaskTableViewProps) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');

  const submitInlineEdit = (task: Task) => {
    if (inlineEditTitle.trim() && inlineEditTitle.trim() !== task.title) {
      onUpdateTask({ ...task, title: inlineEditTitle.trim() });
      if (onAddSyncLog) onAddSyncLog(`Renamed task: "${inlineEditTitle.trim()}"`);
    }
    setInlineEditTaskId(null);
  };
  const [activeMenu, setActiveMenu] = useState<{
    fieldId: string;
    fieldName: string;
    fieldType: string;
    x: number;
    y: number;
  } | null>(null);
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<TaskStatus>('todo');
  const [draftPriority, setDraftPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState<string>('');
  const [draftDueDate, setDraftDueDate] = useState<string>('');
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftCustomFields, setDraftCustomFields] = useState<Record<string, string>>({});

  const resetDrafts = () => {
    setDraftTitle('');
    setDraftStatus('todo');
    setDraftPriority('medium');
    setDraftAssigneeIds([]);
    setDraftStartDate('');
    setDraftDueDate('');
    setDraftTags([]);
    setDraftCustomFields({});
  };

  const activeFields = visibleFields || ['title', 'status', 'priority', 'assignee', 'space', 'startDate', 'dueDate', 'progress', 'tags'];

  const toggleSort = (col: string) => {
    if (sortCol === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortedTasks = React.useMemo(() => {
    if (!sortCol) return filteredTasks;
    const sorted = [...filteredTasks];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortCol === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortCol === 'priority') {
        const w: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return ((w[a.priority] || 0) - (w[b.priority] || 0)) * dir;
      }
      if (sortCol === 'startDate') return (a.startDate || '').localeCompare(b.startDate || '') * dir;
      if (sortCol === 'dueDate') return (a.dueDate || '').localeCompare(b.dueDate || '') * dir;
      if (sortCol === 'progress') return (a.progress - b.progress) * dir;
      const isCustomField = customFields?.some(cf => cf.name === sortCol);
      if (isCustomField) {
        const valA = String(a.custom_fields?.[sortCol] || '');
        const valB = String(b.custom_fields?.[sortCol] || '');
        return valA.localeCompare(valB) * dir;
      }
      return 0;
    });
    return sorted;
  }, [filteredTasks, sortCol, sortDir]);

  const allSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id));
  const visibleCustomFields = customFields.filter(cf => activeFields.includes(cf.name));
  const columnCount = 2
    + (activeFields.includes('status') ? 1 : 0)
    + (activeFields.includes('priority') ? 1 : 0)
    + (activeFields.includes('assignee') ? 1 : 0)
    + (activeFields.includes('space') ? 1 : 0)
    + (activeFields.includes('startDate') ? 1 : 0)
    + (activeFields.includes('dueDate') ? 1 : 0)
    + (activeFields.includes('progress') ? 1 : 0)
    + (activeFields.includes('tags') ? 1 : 0)
    + visibleCustomFields.length
    + 1;

  const handleInlineCreate = () => {
    const title = draftTitle.trim();
    if (!title || !onAddTask) return;

    onAddTask?.({
      title,
      description: '',
      priority: draftPriority,
      status: draftStatus,
      assigneeIds: draftAssigneeIds,
      assigneeId: draftAssigneeIds[0] || undefined,
      startDate: draftStartDate || undefined,
      dueDate: draftDueDate || undefined,
      tags: draftTags,
      custom_fields: draftCustomFields,
      subtasks: [],
      isPinned: false
    });

    resetDrafts();
    setIsCreatingInline(false);
  };

  const getDaysText = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.split('T')[0]); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, cls: 'text-rose-600' };
    if (diff === 0) return { text: 'Today', cls: 'text-amber-600 font-black' };
    if (diff <= 3) return { text: `${diff}d left`, cls: 'text-amber-600' };
    return { text: `${diff}d`, cls: 'text-slate-500' };
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
            <th className="w-10 px-4 py-3 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 text-center">
              <input type="checkbox" checked={allSelected}
                onChange={e => { if (e.target.checked) setSelectedTaskIds(sortedTasks.map(t => t.id)); else setSelectedTaskIds([]); }}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600" />
            </th>
            {/* Task Name is always visible and first */}
            <SortHeader col="title" label="Task" className="min-w-[250px]" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />
            
            {activeFields.includes('status') && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">Status</th>}
            {activeFields.includes('priority') && <SortHeader col="priority" label="Priority" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />}
            {activeFields.includes('assignee') && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">Assignee</th>}
            {activeFields.includes('space') && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">Space</th>}
            {activeFields.includes('startDate') && <SortHeader col="startDate" label="Start Date" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />}
            {activeFields.includes('dueDate') && <SortHeader col="dueDate" label="Due Date" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />}
            {activeFields.includes('progress') && <SortHeader col="progress" label="Progress" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />}
            {activeFields.includes('tags') && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">Tags</th>}

            {/* Custom fields headers */}
            {visibleCustomFields.map(cf => (
              <th 
                key={cf.id} 
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveMenu({
                    fieldId: cf.id,
                    fieldName: cf.name,
                    fieldType: cf.type,
                    x: rect.left,
                    y: rect.bottom + window.scrollY
                  });
                }}
                className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>{cf.name}</span>
                  {sortCol === cf.name && <ArrowUpDown className="w-3 h-3 rotate-180" />}
                </div>
              </th>
            ))}

            {/* Plus button at the end to add field */}
            <th className="w-12 px-2 py-3 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFieldsPanel?.();
                }}
                className="p-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-750 shadow-3xs flex items-center justify-center w-6 h-6 mx-auto"
                title="Add Field"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task, index) => {
            const assignee = members.find(m => m.id === task.assigneeId);
            const isSelected = selectedTaskIds.includes(task.id);
            const daysInfo = getDaysText(task.dueDate);

            return (
              <tr key={task.id} onClick={() => setSelectedTask(task)}
                className={`cursor-pointer transition-all group/row ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/30 dark:bg-slate-900/20'} hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10`}>
                
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60 text-center w-12" onClick={e => e.stopPropagation()}>
                  <div className="relative flex items-center justify-center min-h-[20px] w-6 mx-auto">
                    <span className={`text-[11px] font-bold text-slate-400 dark:text-slate-500 transition-all ${
                      isSelected ? 'hidden' : 'block group-hover/row:hidden'
                    }`}>
                      {index + 1}
                    </span>
                    <input type="checkbox" checked={isSelected}
                      onChange={e => setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id))}
                      className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 transition-all ${
                        isSelected ? 'block' : 'hidden group-hover/row:block'
                      }`} />
                  </div>
                </td>
                
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}

                    {/* Table Row Timer Action */}
                    {activeTimerTaskId === task.id ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (onStopGlobalTimer) onStopGlobalTimer();
                        }}
                        className="p-0.5 rounded bg-rose-50 dark:bg-rose-955/35 text-rose-600 dark:text-rose-400 cursor-pointer transition-all hover:bg-rose-100 border border-rose-200/30"
                        title="Stop Timer"
                      >
                        <Clock className="w-3 h-3 text-rose-500 animate-spin" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (onStartGlobalTimer) onStartGlobalTimer(task.id);
                        }}
                        className="p-0.5 rounded opacity-0 group-hover/row:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        title="Start Timer"
                      >
                        <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                      </button>
                    )}
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
                        className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-b border-indigo-500 outline-none py-0.5 w-full max-w-[280px]" 
                      />
                    ) : (
                      <span 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setInlineEditTaskId(task.id);
                          setInlineEditTitle(task.title);
                        }}
                        className={`text-[13px] font-semibold truncate max-w-[280px] cursor-pointer hover:text-indigo-650 hover:underline transition-colors ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}
                        title="Double click to rename task"
                      >
                        {task.title}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {(task.comments?.length || 0) > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>}
                      {(task.attachments?.length || 0) > 0 && <Paperclip className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                </td>

                {activeFields.includes('status') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60" onClick={e => e.stopPropagation()}>
                    <StatusPillSelect value={task.status} onChange={newS => {
                      onUpdateTask({ ...task, status: newS });
                      onAddSyncLog?.(`Status "${task.title}" → ${newS}`);
                    }} />
                  </td>
                )}

                {activeFields.includes('priority') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60" onClick={e => e.stopPropagation()}>
                    <PriorityPillSelect value={task.priority} onChange={newP => {
                      onUpdateTask({ ...task, priority: newP || 'medium' });
                      onAddSyncLog?.(`Priority "${task.title}" → ${newP || 'medium'}`);
                    }} />
                  </td>
                )}

                {activeFields.includes('assignee') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60" onClick={e => e.stopPropagation()}>
                    <AssigneePillSelect
                      value={task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])}
                      members={members}
                      onChange={newIds => {
                        const nextIds = newIds || [];
                        onUpdateTask({ ...task, assigneeIds: nextIds, assigneeId: nextIds[0] || undefined });
                        onAddSyncLog?.(`Assignees "${task.title}" → ${nextIds.length > 0 ? nextIds.map(id => members.find(m => m.id === id)?.name || id).join(', ') : 'Unassigned'}`);
                      }}
                    />
                  </td>
                )}

                {activeFields.includes('space') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                    {(() => {
                      const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                      return ws ? (
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          {ws.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-350">—</span>
                      );
                    })()}
                  </td>
                )}

                {activeFields.includes('startDate') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60" onClick={e => e.stopPropagation()}>
                    <PremiumDatePicker
                      dateValue={task.startDate || ''}
                      onChange={newD => {
                        onUpdateTask({ ...task, startDate: newD });
                        onAddSyncLog?.(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                      }}
                      label="—"
                      align="left"
                      className="text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"
                    />
                  </td>
                )}

                {activeFields.includes('dueDate') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60" onClick={e => e.stopPropagation()}>
                    <PremiumDatePicker
                      dateValue={task.dueDate || ''}
                      onChange={newD => {
                        onUpdateTask({ ...task, dueDate: newD });
                        onAddSyncLog?.(`Due Date "${task.title}" → ${newD || 'Cleared'}`);
                      }}
                      label="—"
                      align="left"
                      className={daysInfo ? `text-[11px] font-bold px-2 py-1 rounded-lg border-0 cursor-pointer select-none transition-all ${daysInfo.cls}` : "text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"}
                    />
                  </td>
                )}

                {activeFields.includes('progress') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                    {task.subtasks && task.subtasks.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-550">{task.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-350">—</span>
                    )}
                  </td>
                )}

                {activeFields.includes('tags') && (
                  <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                    <div className="flex flex-wrap gap-1">
                      {task.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">#{tag}</span>
                      ))}
                      {(!task.tags || task.tags.length === 0) && <span className="text-[11px] text-slate-350">—</span>}
                    </div>
                  </td>
                )}

                {/* Custom fields data cells */}
                {visibleCustomFields.map(cf => {
                  const val = task.custom_fields?.[cf.name] || '';
                  return (
                    <td key={cf.id} className="px-4 py-3 text-left border-r border-b border-slate-150 dark:border-slate-800/60" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={String(val)} 
                        onChange={e => {
                          const updated = { ...(task.custom_fields || {}), [cf.name]: e.target.value };
                          onUpdateTask({ ...task, custom_fields: updated });
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none max-w-[120px] focus:border-indigo-500 transition-colors font-semibold"
                      />
                    </td>
                  );
                })}

                {/* Empty alignment cell for trailing + header */}
                <td className="w-12 px-2 py-3 text-center border-r border-b border-slate-150 dark:border-slate-800/60" />
              </tr>
            );
          })}
          {isCreatingInline ? (
            <tr className="border-t border-slate-200/70 dark:border-slate-800/60 bg-white dark:bg-slate-900">
              <td className="px-4 py-3 text-center border-r border-b border-slate-150 dark:border-slate-800/60">
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </td>
              <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                <input
                  type="text"
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineCreate();
                    else if (e.key === 'Escape') { setIsCreatingInline(false); resetDrafts(); }
                  }}
                  placeholder="New task title..."
                  className="w-full px-2.5 py-1.5 text-[13px] font-semibold border border-indigo-200 dark:border-indigo-900/40 rounded-xl bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105 outline-none focus:border-indigo-500 transition-colors"
                />
              </td>

              {activeFields.includes('status') && (
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <StatusPillSelect value={draftStatus} onChange={setDraftStatus} />
                </td>
              )}

              {activeFields.includes('priority') && (
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <PriorityPillSelect value={draftPriority} onChange={newP => setDraftPriority(newP || 'medium')} />
                </td>
              )}

              {activeFields.includes('assignee') && (
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <AssigneePillSelect
                    value={draftAssigneeIds}
                    members={members}
                    onChange={(val) => setDraftAssigneeIds(val || [])}
                  />
                </td>
              )}

              {activeFields.includes('space') && (
                <td className="px-4 py-3 text-[11px] font-bold text-slate-550 dark:text-slate-400 border-r border-b border-slate-150 dark:border-slate-800/60">
                  {workspaces.length > 0 ? (workspaces.find(w => w.id === 'w2')?.name || workspaces[0].name) : 'Personal Workspace'}
                </td>
              )}

              {activeFields.includes('startDate') && (
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <PremiumDatePicker
                    dateValue={draftStartDate}
                    onChange={newD => setDraftStartDate(newD || '')}
                    label="—"
                    align="left"
                    className="text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"
                  />
                </td>
              )}

              {activeFields.includes('dueDate') && (
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <PremiumDatePicker
                    dateValue={draftDueDate}
                    onChange={newD => setDraftDueDate(newD || '')}
                    label="—"
                    align="left"
                    className="text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"
                  />
                </td>
              )}

              {activeFields.includes('progress') && (
                <td className="px-4 py-3 text-[11px] text-slate-350 border-r border-b border-slate-150 dark:border-slate-800/60">—</td>
              )}

              {activeFields.includes('tags') && (
                <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <input
                    type="text"
                    placeholder="Tags..."
                    value={draftTags.join(', ')}
                    onChange={e => setDraftTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    className="px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none max-w-[100px] focus:border-indigo-500 transition-colors font-semibold"
                  />
                </td>
              )}

              {visibleCustomFields.map(cf => (
                <td key={cf.id} className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                  <input 
                    type="text" 
                    placeholder={`Enter ${cf.name}...`}
                    value={draftCustomFields[cf.name] || ''} 
                    onChange={e => setDraftCustomFields(prev => ({ ...prev, [cf.name]: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none max-w-[120px] focus:border-indigo-500 transition-colors font-semibold"
                  />
                </td>
              ))}

              <td className="px-4 py-3 text-center border-r border-b border-slate-150 dark:border-slate-800/60">
                <div className="flex items-center gap-1 justify-center">
                  <button
                    type="button"
                    onClick={handleInlineCreate}
                    className="p-1.5 rounded-lg bg-indigo-650 text-white hover:bg-indigo-700 cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingInline(false); resetDrafts(); }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            <tr className="border-t border-slate-200/70 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
              <td className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60" />
              <td colSpan={columnCount - 1} className="px-4 py-3 border-r border-b border-slate-150 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {sortedTasks.length === 0 && !isCreatingInline && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">
          No tasks match the active filters


      {activeMenu && (
        <Portal>
          <div className="fixed inset-0 z-[190] cursor-default" onClick={() => setActiveMenu(null)} />
          <div 
            className="fixed z-[200] w-[220px] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 font-sans text-xs select-none animate-fadeIn"
            style={{ top: activeMenu.y, left: activeMenu.x }}
          >
            <button
              onClick={() => {
                toggleSort(activeMenu.fieldName);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort</span>
            </button>

            <button
              onClick={() => {
                toggleSort(activeMenu.fieldName);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort entire column</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            <button
              onClick={() => {
                const oldName = activeMenu.fieldName;
                if (openDialog && setCustomFields && setVisibleFields) {
                  openDialog?.({
                    title: `Edit field "${oldName}"`,
                    type: 'prompt',
                    defaultValue: oldName,
                    placeholder: 'Enter new field name...',
                    confirmText: 'Rename',
                    onConfirm: (newName: string) => {
                      if (!newName?.trim() || newName.trim() === oldName) return;
                      const cleanNewName = newName.trim();
                      setCustomFields?.(prev => prev.map(cf => cf.id === activeMenu.fieldId ? { ...cf, name: cleanNewName } : cf));
                      setVisibleFields?.(prev => prev.map(f => f === oldName ? cleanNewName : f));
                      filteredTasks.forEach(t => {
                        const { [oldName]: oldVal, ...rest } = t.custom_fields || {};
                        onUpdateTask({
                          ...t,
                          custom_fields: { ...rest, [cleanNewName]: oldVal || '' }
                        });
                      });
                      if (onAddSyncLog) onAddSyncLog?.(`Renamed custom field "${oldName}" → "${cleanNewName}"`);
                    }
                  });
                }
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>Edit field</span>
            </button>

            <button
              onClick={() => {
                if (triggerToast) triggerToast?.('info', 'Enterprise Feature', 'Privacy and permissions are only available for Enterprise Workspaces.');
                else alert('Privacy and permissions are only available for Enterprise Workspaces.');
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>Privacy and permissions</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            <button
              onClick={() => {
                if (setCustomFields && customFields) {
                  const targetCF = customFields.find(cf => cf.id === activeMenu.fieldId);
                  if (targetCF) {
                    setCustomFields?.(prev => [targetCF, ...prev.filter(cf => cf.id !== activeMenu.fieldId)]);
                  }
                }
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Move to start</span>
            </button>

            <button
              onClick={() => {
                if (setCustomFields && customFields) {
                  const targetCF = customFields.find(cf => cf.id === activeMenu.fieldId);
                  if (targetCF) {
                    setCustomFields?.(prev => [...prev.filter(cf => cf.id !== activeMenu.fieldId), targetCF]);
                  }
                }
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>Move to end</span>
            </button>

            <button
              onClick={() => {
                if (triggerToast) triggerToast?.('success', 'Automation Created', `Created smart auto-calculations for "${activeMenu.fieldName}".`);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Automate</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            <button
              onClick={() => {
                if (setVisibleFields) {
                  setVisibleFields?.(prev => prev.filter(f => f !== activeMenu.fieldName));
                  if (onAddSyncLog) onAddSyncLog?.(`Hid custom field column "${activeMenu.fieldName}"`);
                }
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide column</span>
            </button>

            <button
              onClick={() => {
                if (setCustomFields && customFields && setVisibleFields) {
                  const dupName = `${activeMenu.fieldName} Copy`;
                  const dupField = {
                    id: `cf-${Date.now()}`,
                    name: dupName,
                    type: activeMenu.fieldType
                  };
                  setCustomFields?.(prev => [...prev, dupField]);
                  setVisibleFields?.(prev => [...prev, dupName]);
                  
                  filteredTasks.forEach(t => {
                    onUpdateTask({
                      ...t,
                      custom_fields: {
                        ...(t.custom_fields || {}),
                        [dupName]: t.custom_fields?.[activeMenu.fieldName] || ''
                      }
                    });
                  });
                  if (onAddSyncLog) onAddSyncLog?.(`Duplicated custom field "${activeMenu.fieldName}" → "${dupName}"`);
                }
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={() => {
                const oldName = activeMenu.fieldName;
                if (openDialog && setCustomFields && setVisibleFields) {
                  openDialog?.({
                    title: `Delete custom field "${oldName}"`,
                    description: 'Are you sure you want to delete this custom field? This will delete all associated data for all tasks.',
                    type: 'confirm',
                    isDestructive: true,
                    confirmText: 'Delete Field',
                    onConfirm: () => {
                      setCustomFields?.(prev => prev.filter(cf => cf.id !== activeMenu.fieldId));
                      setVisibleFields?.(prev => prev.filter(f => f !== oldName));
                      filteredTasks.forEach(t => {
                        const { [oldName]: _, ...rest } = t.custom_fields || {};
                        onUpdateTask({
                          ...t,
                          custom_fields: rest
                        });
                      });
                      if (onAddSyncLog) onAddSyncLog?.(`Deleted custom field "${oldName}"`);
                    }
                  });
                }
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete field</span>
            </button>

            <div className="p-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => {
                  const fieldName = activeMenu.fieldName;
                  if (triggerToast) triggerToast?.('info', 'AI Filling', `AI is auto-populating mock data for "${fieldName}"...`);
                  
                  const nameLower = fieldName.toLowerCase();
                  const mockAIPool = 
                    nameLower.includes('objective') || nameLower.includes('tiêu')
                      ? ["Optimize database", "Develop frontend components", "Write unit tests", "Draft documentation", "Market launch preparation"]
                    : nameLower.includes('cost') || nameLower.includes('phí')
                      ? ["$150", "$2,000", "$0", "$950", "$1,450"]
                    : nameLower.includes('owner') || nameLower.includes('người')
                      ? members.map(m => m.name)
                    : nameLower.includes('rating') || nameLower.includes('giá')
                      ? ["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐⭐"]
                    : nameLower.includes('checkbox') || nameLower.includes('check')
                      ? ["true", "false", "true", "true"]
                    : ["Auto draft completed", "Pending PM review", "Ready for deployment", "Needs refinement"];
                  
                  if (mockAIPool.length > 0) {
                    filteredTasks.forEach((t, i) => {
                      const mockVal = mockAIPool[i % mockAIPool.length];
                      onUpdateTask({
                        ...t,
                        custom_fields: {
                          ...(t.custom_fields || {}),
                          [fieldName]: mockVal
                        }
                      });
                    });
                    if (triggerToast) triggerToast?.('success', 'AI Fill Success', `Auto-populated "${fieldName}" using AI analysis.`);
                  }
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-indigo-200 dark:border-indigo-900 rounded-xl text-[11px] font-black text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20 hover:border-indigo-300 transition-all cursor-pointer shadow-3xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Fill with AI</span>
              </button>
            </div>
          </div>
        </Portal>
      )}
        </div>
      )}
    </div>
  );
}
