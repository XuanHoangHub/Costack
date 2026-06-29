"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus, Priority, User, SubTask, Workspace, Space } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, SpacePillSelect } from './TaskSelects';
import SignedImage from '../SignedImage';
import {
  X, Trash2, Bot, CheckSquare, Plus, Edit2, Send, Paperclip, Upload,
  MessageSquare, History, Clock, Pin, Tag, Sparkles, FileText, Check,
  Calendar, User as UserIcon, Flag, CircleDot, ArrowRight, Folder, ChevronDown, RefreshCw, SlidersHorizontal, Phone, Search, Filter, Activity
} from 'lucide-react';

// ── Priority theme mapping ──
const PRIORITY_THEMES: Record<Priority, { gradient: string; accent: string; badge: string; glow: string }> = {
  urgent: {
    gradient: 'from-rose-500/10 via-rose-400/5 to-transparent',
    accent: 'text-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 border-rose-200/60 dark:border-rose-800/40 dark:text-rose-400 dark:bg-rose-500/10',
    glow: 'shadow-rose-500/5',
  },
  high: {
    gradient: 'from-orange-500/10 via-orange-400/5 to-transparent',
    accent: 'text-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 border-orange-200/60 dark:border-rose-800/40 dark:text-orange-400 dark:bg-orange-500/10',
    glow: 'shadow-orange-500/5',
  },
  medium: {
    gradient: 'from-amber-500/8 via-amber-400/4 to-transparent',
    accent: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-200/60 dark:border-rose-800/40 dark:text-amber-400 dark:bg-amber-500/10',
    glow: 'shadow-amber-500/5',
  },
  low: {
    gradient: 'from-slate-500/6 via-slate-400/3 to-transparent',
    accent: 'text-slate-400',
    badge: 'bg-slate-500/10 text-slate-500 border-slate-200/60 dark:border-slate-700/40 dark:text-slate-400 dark:bg-slate-500/10',
    glow: 'shadow-slate-500/5',
  },
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; bg: string }> = {
  todo: { label: 'To Do', dot: 'bg-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  inprogress: { label: 'In Progress', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  review: { label: 'Review', dot: 'bg-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  completed: { label: 'Done', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
};

interface TaskDetailsPanelProps {
  task: Task;
  members: User[];
  workspaces: Workspace[];
  spaces?: Space[];
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onAttachmentUpload: (task: Task, e: React.ChangeEvent<HTMLInputElement> | File) => void;
  onAttachmentDelete: (task: Task, att: any) => void;
  onAiSubtasks: (task: Task) => void;
  aiGenerating: boolean;
  onAiSummary: (task: Task) => void;
  isSummarizing: boolean;
  aiSummary: string;
  allTasks?: Task[];
  allDocs?: any[];
  onOpenFieldsPanel?: () => void;
}

export default function TaskDetailsPanel({
   task, members, workspaces = [], spaces = [], onClose, onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast,
   onAttachmentUpload, onAttachmentDelete, onAiSubtasks, aiGenerating,
   onAiSummary, isSummarizing, aiSummary, allTasks = [], allDocs = [], onOpenFieldsPanel
 }: TaskDetailsPanelProps) {
  const { t } = useTranslation();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskValue, setEditingSubtaskValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [showLinkTaskDropdown, setShowLinkTaskDropdown] = useState(false);
  const [showLinkDocDropdown, setShowLinkDocDropdown] = useState(false);
  const [relationshipSearchQuery, setRelationshipSearchQuery] = useState('');

  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (isTimerActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive]);

  const formatTimerTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stopTimerAndLog = () => {
    setIsTimerActive(false);
    const exactLogged = parseFloat((elapsedSeconds / 3600).toFixed(2));
    if (exactLogged > 0) {
      const nextLogged = parseFloat(((task.hoursLogged || 0) + exactLogged).toFixed(2));
      onUpdateTask({ ...task, hoursLogged: nextLogged });
      onAddSyncLog(`Logged ${exactLogged} hours of work via stopwatch`);
      if (triggerToast) triggerToast('success', 'Time Logged ⏱', `Added ${exactLogged}h to task.`);
    }
    setElapsedSeconds(0);
  };

  React.useEffect(() => {
    setTitleValue(task.title);
    setDescValue(task.description);
  }, [task.id, task.title, task.description]);

  const saveTitle = () => {
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdateTask({ ...task, title: titleValue.trim() });
      onAddSyncLog(`Renamed: "${titleValue.trim()}"`);
    }
    setEditingTitle(false);
  };

  const saveDesc = () => {
    if (descValue !== task.description) {
      onUpdateTask({ ...task, description: descValue });
      onAddSyncLog(`Updated description for "${task.title}"`);
    }
  };

  const toggleSubtask = (subId: string) => {
    const updated = task.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
    const progress = Math.round((updated.filter(s => s.completed).length / updated.length) * 100);
    onUpdateTask({ ...task, subtasks: updated, progress });
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false };
    const updated = [...task.subtasks, newSub];
    const progress = Math.round((updated.filter(s => s.completed).length / updated.length) * 100);
    onUpdateTask({ ...task, subtasks: updated, progress });
    setNewSubtaskTitle('');
    onAddSyncLog(`Added subtask to "${task.title}"`);
  };

  const deleteSubtask = (subId: string) => {
    const updated = task.subtasks.filter(s => s.id !== subId);
    const progress = updated.length > 0 ? Math.round((updated.filter(s => s.completed).length / updated.length) * 100) : 0;
    onUpdateTask({ ...task, subtasks: updated, progress });
  };

  const editSubtask = (subId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updated = task.subtasks.map(s => s.id === subId ? { ...s, title: newTitle.trim() } : s);
    onUpdateTask({ ...task, subtasks: updated });
    setEditingSubtaskId(null);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const comment = {
      id: `c-${Date.now()}`, senderName: 'You',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=You',
      content: commentText, timestamp: new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    onUpdateTask({ ...task, comments: [...(task.comments || []), comment], commentsCount: (task.commentsCount || 0) + 1 });
    setCommentText('');
    if (triggerToast) triggerToast('comment', 'Comment', `Sent comment for "${task.title}"`);
    onAddSyncLog(`Commented on "${task.title}"`);
  };

  const assignee = members.find(m => m.id === task.assigneeId);
  const theme = PRIORITY_THEMES[task.priority];
  const statusMeta = STATUS_META[task.status];

  let spaceName = 'Marketing';
  let listName = 'Email Launch';
  if (spaces && spaces.length > 0) {
    for (const space of spaces) {
      if (space.id === task.spaceId) {
        spaceName = space.name;
      }
      const list = space.lists?.find((l: any) => l.id === task.listId);
      if (list) {
        listName = list.name;
        spaceName = space.name;
      }
    }
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (['pdf'].includes(ext || '')) return { color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' };
    if (['doc', 'docx'].includes(ext || '')) return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' };
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (['zip', 'rar', '7z'].includes(ext || '')) return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' };
    return { color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-805' };
  };

  const getActivityColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('tạo') || a.includes('thêm') || a.includes('create') || a.includes('add')) return { dot: 'bg-emerald-505', line: 'border-emerald-200 dark:border-emerald-800' };
    if (a.includes('xóa') || a.includes('delete') || a.includes('remove')) return { dot: 'bg-rose-505', line: 'border-rose-200 dark:border-rose-800' };
    return { dot: 'bg-indigo-505', line: 'border-indigo-200 dark:border-indigo-800' };
  };

  // Combine Activities and Comments chronologically
  const timelineItems = useMemo(() => {
    const items: any[] = [];
    
    // Add activities
    (task.activities || []).forEach((a, index) => {
      items.push({
        id: a.id || `act-${index}`,
        type: 'activity',
        userName: a.userName,
        content: a.action,
        timestamp: a.timestamp,
        dateObj: new Date(a.timestamp)
      });
    });

    // Add comments
    (task.comments || []).forEach((c, index) => {
      items.push({
        id: c.id || `com-${index}`,
        type: 'comment',
        userName: c.senderName,
        avatar: c.senderAvatar,
        content: c.content,
        timestamp: c.timestamp,
        dateObj: new Date(c.timestamp)
      });
    });

    // Sort items chronologically (earliest first)
    items.sort((a, b) => {
      const timeA = isNaN(a.dateObj.getTime()) ? 0 : a.dateObj.getTime();
      const timeB = isNaN(b.dateObj.getTime()) ? 0 : b.dateObj.getTime();
      return timeA - timeB;
    });

    return items;
  }, [task.activities, task.comments]);

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/45 backdrop-blur-[3px]" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.96, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.96, opacity: 0 }} 
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-5xl h-[85vh] md:h-[90vh] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl"
        >

          {/* ── LEFT PANEL: Details & Attributes ── */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar">
            
            {/* Header / Breadcrumbs */}
            <div className={`bg-gradient-to-r ${theme.gradient} shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between`}>
              <div className="flex items-center gap-1.5 text-[10.5px] font-black text-slate-500 dark:text-slate-400 select-none">
                <span className="flex items-center gap-1">📁 {spaceName}</span>
                <span className="text-slate-350 dark:text-slate-700">/</span>
                <span className="flex items-center gap-1">📋 {listName}</span>
                <span className="text-amber-400 hover:text-amber-500 cursor-pointer ml-1 select-none">⭐️</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onUpdateTask({ ...task, isPinned: !task.isPinned })}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm' : 'text-slate-400 hover:text-slate-605 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Pin className={`w-3.5 h-3.5 ${task.isPinned ? 'fill-amber-400' : ''}`} />
                </button>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { onDeleteTask(task.id); onClose(); }}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-rose-600 text-white cursor-pointer hover:bg-rose-700 transition-colors shadow-sm">Delete</button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-605 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-7">
              {/* AI prompt box */}
              <div className="p-[1px] rounded-xl bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-500 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-[11px] text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none">
                  <Bot className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>Ask Brain? for a presentation, document or prototype</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => onAiSummary(task)} className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer">
                      {isSummarizing ? 'Summarizing...' : 'Summarize task'}
                    </button>
                  </div>
                </div>
              </div>

              {/* AI summary content */}
              {aiSummary && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-indigo-650 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 animate-bounce" /> AI Executive Summary
                  </div>
                  <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-bold">{aiSummary}</p>
                </div>
              )}

              {/* Title Section */}
              <div>
                {editingTitle ? (
                  <input autoFocus value={titleValue} onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    onBlur={saveTitle}
                    className="w-full text-[22px] font-extrabold text-slate-900 dark:text-slate-50 bg-transparent border-b-2 border-indigo-500 outline-none py-1 leading-tight" />
                ) : (
                  <h2 onClick={() => setEditingTitle(true)}
                    className="text-[22px] font-extrabold text-slate-900 dark:text-slate-50 cursor-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group flex items-start gap-2 leading-tight">
                    <span className={`${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{task.title}</span>
                    <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity mt-1.5 shrink-0 animate-fadeIn" />
                  </h2>
                )}
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 px-1 border-b border-slate-100 dark:border-slate-850">
                {/* Status */}
                <div className="flex items-center gap-4">
                  <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-505 flex items-center gap-1 shrink-0">
                    <CircleDot className="w-3.5 h-3.5" /> Status
                  </span>
                  <StatusPillSelect value={task.status} onChange={s => { onUpdateTask({ ...task, status: s }); onAddSyncLog(`Status → ${s}`); }} />
                </div>

                {/* Assignees Multiple */}
                <div className="flex items-center gap-4">
                  <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-505 flex items-center gap-1 shrink-0">
                    <UserIcon className="w-3.5 h-3.5" /> Assignees
                  </span>
                  <div className="relative">
                    <button 
                      onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 hover:border-slate-300 transition-all text-xs font-bold text-slate-700 dark:text-slate-205 cursor-pointer max-w-[160px] truncate"
                    >
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])).slice(0, 3).map(id => {
                          const m = members.find(u => u.id === id);
                          if (!m) return null;
                          return (
                            <img key={id} src={m.avatar} className="w-4 h-4 rounded-full border border-white dark:border-slate-950 object-cover shrink-0" alt={m.name} />
                          );
                        })}
                      </div>
                      <span className="truncate">
                        {(task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])).length === 0 ? 'No Assignee' : `${(task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])).length} Assignees`}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {showAssigneesDropdown && (
                      <div className="absolute left-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1 border-b border-slate-100 dark:border-slate-800 mb-1">Select Assignees</div>
                        {members.map(m => {
                          const checked = (task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])).includes(m.id);
                          return (
                            <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const ids = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
                                  let nextIds: string[];
                                  if (checked) {
                                    nextIds = ids.filter(id => id !== m.id);
                                  } else {
                                    nextIds = [...ids, m.id];
                                  }
                                  onUpdateTask({
                                    ...task,
                                    assigneeIds: nextIds,
                                    assigneeId: nextIds[0] || undefined
                                  });
                                }}
                                className="rounded text-indigo-600 cursor-pointer accent-indigo-650 w-3.5 h-3.5"
                              />
                              <img src={m.avatar} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" alt={m.name} />
                              <span className="truncate">{m.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-4">
                  <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-550 flex items-center gap-1 shrink-0">
                    <Calendar className="w-3.5 h-3.5" /> Due Date
                  </span>
                  <PremiumDatePicker dateValue={task.dueDate?.split('T')[0] || ''} timeValue={task.dueDate?.split('T')[1] || ''}
                    onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} />
                </div>

                {/* Priority */}
                <div className="flex items-center gap-4">
                  <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-550 flex items-center gap-1 shrink-0">
                    <Flag className="w-3.5 h-3.5" /> Priority
                  </span>
                  <PriorityPillSelect value={task.priority} onChange={p => { onUpdateTask({ ...task, priority: p }); onAddSyncLog(`Priority → ${p}`); }} />
                </div>
              </div>

              {/* Collapsible Fields Accordion */}
              <div className="border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
                <button 
                  type="button" 
                  onClick={() => setFieldsExpanded(!fieldsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-900/20 text-xs font-black text-slate-700 dark:text-slate-205 border-b border-slate-100 dark:border-slate-800/80 cursor-pointer tracking-wider uppercase"
                >
                  <div className="flex items-center gap-2">
                    <span>{fieldsExpanded ? '▼' : '▶'}</span>
                    <span>Custom Fields</span>
                  </div>
                  <span className="text-[10px] text-slate-400 normal-case font-bold">
                    {Object.keys(task.custom_fields || {}).length + 4} fields
                  </span>
                </button>

                {fieldsExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Predefined Custom Fields */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">Objective</label>
                        <input 
                          type="text" 
                          value={String(task.custom_fields?.Objective || '')} 
                          onChange={e => {
                            const updated = { ...(task.custom_fields || {}), Objective: e.target.value };
                            onUpdateTask({ ...task, custom_fields: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">Owner</label>
                        <input 
                          type="text" 
                          value={String(task.custom_fields?.Owner || '')} 
                          onChange={e => {
                            const updated = { ...(task.custom_fields || {}), Owner: e.target.value };
                            onUpdateTask({ ...task, custom_fields: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">Cost</label>
                        <input 
                          type="text" 
                          value={String(task.custom_fields?.Cost || '')} 
                          onChange={e => {
                            const updated = { ...(task.custom_fields || {}), Cost: e.target.value };
                            onUpdateTask({ ...task, custom_fields: updated });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-pink-500 animate-spin-slow" /> Recurrence
                        </label>
                        <div className="flex items-center gap-2">
                          <select 
                            value={task.recurrence?.frequency || 'none'}
                            onChange={e => {
                              const freq = e.target.value as any;
                              onUpdateTask({ ...task, recurrence: { frequency: freq, interval: task.recurrence?.interval || 1 } });
                            }}
                            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 outline-none text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                          >
                            <option value="none">None</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                          {task.recurrence?.frequency && task.recurrence.frequency !== 'none' && (
                            <input 
                              type="number"
                              min={1}
                              value={task.recurrence.interval}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 1;
                                onUpdateTask({ ...task, recurrence: { ...task.recurrence!, interval: val } });
                              }}
                              className="w-12 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1 text-center outline-none font-bold text-slate-700 dark:text-slate-300"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">📁 Space</label>
                        <SpacePillSelect
                          value={task.workspaceId || 'w2'}
                          workspaces={workspaces}
                          onChange={wsId => { if (wsId) onUpdateTask({ ...task, workspaceId: wsId }); }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">📅 Start Date</label>
                        <PremiumDatePicker dateValue={task.startDate?.split('T')[0] || ''} timeValue={task.startDate?.split('T')[1] || ''}
                          onChange={v => onUpdateTask({ ...task, startDate: v || '' })} />
                      </div>
                    </div>

                    {/* Dynamic custom fields */}
                    {Object.keys(task.custom_fields || {}).filter(k => !['Objective', 'Owner', 'Cost'].includes(k)).length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Other Custom Fields</label>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(task.custom_fields || {})
                            .filter(([k]) => !['Objective', 'Owner', 'Cost'].includes(k))
                            .map(([key, val]) => (
                              <div key={key} className="space-y-1 relative group">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize">{key}</label>
                                  <button 
                                    onClick={() => {
                                      const { [key]: _, ...rest } = task.custom_fields || {};
                                      onUpdateTask({ ...task, custom_fields: rest });
                                    }}
                                    className="text-[9px] text-rose-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                                <input 
                                  type="text" 
                                  value={String(val || '')} 
                                  onChange={e => {
                                    const updated = { ...(task.custom_fields || {}), [key]: e.target.value };
                                    onUpdateTask({ ...task, custom_fields: updated });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          if (onOpenFieldsPanel) {
                            onOpenFieldsPanel();
                          } else {
                            const name = prompt('Enter custom field name:');
                            if (!name) return;
                            const val = prompt(`Enter value for field "${name}":`) || '';
                            const updated = { ...(task.custom_fields || {}), [name]: val };
                            onUpdateTask({ ...task, custom_fields: updated });
                          }
                        }}
                        className="text-[9.5px] font-black text-indigo-500 hover:underline cursor-pointer tracking-wider uppercase flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add new custom field
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Time tracking and estimation */}
              <div className="p-4 border border-slate-205 dark:border-slate-800 rounded-2xl bg-indigo-50/10 dark:bg-slate-900/10 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5 select-none">
                  <Clock className="w-3.5 h-3.5" /> Time Tracking & Estimation
                </label>
                <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Logged: {task.hoursLogged ?? 0}h / Estimate:</span>
                    <input 
                      type="number"
                      min={0}
                      placeholder="Hours..."
                      value={task.hoursEstimate || ''}
                      onChange={e => {
                        const estimate = parseFloat(e.target.value) || 0;
                        onUpdateTask({ ...task, hoursEstimate: estimate });
                      }}
                      className="w-16 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg px-2.5 py-1 outline-none text-slate-700 dark:text-slate-200 font-bold"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">h</span>
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto border-l pl-4 border-slate-200 dark:border-slate-800">
                    {isTimerActive ? (
                      <>
                        <span className="text-xs font-mono font-bold text-rose-500 animate-pulse">{formatTimerTime(elapsedSeconds)}</span>
                        <button 
                          type="button" 
                          onClick={stopTimerAndLog}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-1"
                        >
                          <span className="w-2 h-2 rounded bg-white shrink-0 animate-ping" /> Stop
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setIsTimerActive(true)}
                        className="px-2.5 py-1 bg-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1"
                      >
                        <span>▶</span> Start Timer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Description
                </label>
                <div className="relative group">
                  <textarea value={descValue} onChange={e => setDescValue(e.target.value)} onBlur={saveDesc}
                    placeholder="Add description, or write with AI..."
                    className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 text-[13px] text-slate-700 dark:text-slate-200 resize-none outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400/10 transition-all leading-relaxed placeholder-slate-350" />
                </div>
              </div>

              {/* Main Actions Pill Buttons Row */}
              <div className="flex flex-wrap gap-2 py-2 border-t border-slate-100 dark:border-slate-850/60">
                <button 
                  onClick={onOpenFieldsPanel} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-750 dark:text-slate-205 transition-all cursor-pointer select-none"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-550" />
                  <span>Add fields</span>
                </button>
                <button 
                  onClick={() => {
                    const title = prompt("Enter subtask title:");
                    if (title?.trim()) {
                      const newSub = { id: `sub-${Date.now()}`, title: title.trim(), completed: false };
                      onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                    }
                  }} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-750 dark:text-slate-205 transition-all cursor-pointer select-none"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Add subtask</span>
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('relationships-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-750 dark:text-slate-205 transition-all cursor-pointer select-none"
                >
                  <Tag className="w-3.5 h-3.5 text-sky-505" />
                  <span>Relate items</span>
                </button>
                <button 
                  onClick={() => {
                    const fileInput = document.getElementById('task-file-upload');
                    fileInput?.click();
                  }} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-750 dark:text-slate-205 transition-all cursor-pointer select-none"
                >
                  <Paperclip className="w-3.5 h-3.5 text-amber-500" />
                  <span>Attach file</span>
                </button>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-550" />
                    </div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Subtasks</label>
                    <span className="text-[10px] font-bold text-slate-400">
                      {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                    </span>
                  </div>
                  <button onClick={() => onAiSubtasks(task)} disabled={aiGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer disabled:opacity-50 border border-indigo-100/60 dark:border-indigo-900/30">
                    <Bot className={`w-3 h-3 ${aiGenerating ? 'animate-spin' : ''}`} />
                    <span>{aiGenerating ? 'Generating...' : 'AI Suggest'}</span>
                  </button>
                </div>

                {task.subtasks.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[11px] font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                      {task.progress}%
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  {task.subtasks.map(sub => (
                    <motion.div key={sub.id} className="flex items-center gap-2.5 group py-1.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <button onClick={() => toggleSubtask(sub.id)}
                        className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${sub.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
                        {sub.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                      {editingSubtaskId === sub.id ? (
                        <input autoFocus value={editingSubtaskValue}
                          onChange={e => setEditingSubtaskValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') editSubtask(sub.id, editingSubtaskValue); if (e.key === 'Escape') setEditingSubtaskId(null); }}
                          onBlur={() => editSubtask(sub.id, editingSubtaskValue)}
                          className="flex-1 text-[12px] font-medium bg-transparent border-b-2 border-indigo-400 outline-none py-0.5 text-slate-800 dark:text-slate-200" />
                      ) : (
                        <span onDoubleClick={() => { setEditingSubtaskId(sub.id); setEditingSubtaskValue(sub.title); }}
                          className={`flex-1 text-[12px] cursor-text transition-all ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 font-bold'}`}>
                          {sub.title}
                        </span>
                      )}
                      <button onClick={() => deleteSubtask(sub.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 px-3">
                  <div className="w-[18px] h-[18px] rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                    <Plus className="w-2.5 h-2.5 text-slate-450" />
                  </div>
                  <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                    placeholder="Add new subtask..."
                    className="flex-1 text-[12px] font-bold text-slate-750 dark:text-slate-205 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1.5 placeholder-slate-400 transition-colors" />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Attachments</label>
                  </div>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>Upload file</span>
                    <input id="task-file-upload" type="file" onChange={e => onAttachmentUpload(task, e)} className="hidden" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {(task.attachments || []).map(att => {
                    const iconStyle = getFileIcon(att.name);
                    return (
                      <div key={att.id} className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-3 py-2.5 rounded-xl hover:border-slate-250 dark:hover:border-slate-700 transition-colors group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${iconStyle.bg} flex items-center justify-center shrink-0`}>
                            <FileText className={`w-4 h-4 ${iconStyle.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{att.name}</div>
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">{(att.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <button onClick={() => onAttachmentDelete(task, att)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {(task.attachments || []).length === 0 && (
                    <div className="col-span-2 text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <span className="text-[11px] text-slate-400 font-bold italic">No attachments yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Relationships & References Section */}
              <div id="relationships-section" className="space-y-4 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-955/20 flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Relationships & References</label>
                </div>

                {/* Linked Tasks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">Linked Tasks</span>
                    <div className="relative">
                      <button 
                        onClick={() => { setShowLinkTaskDropdown(!showLinkTaskDropdown); setShowLinkDocDropdown(false); }}
                        className="px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-800 text-[10px] text-slate-500 hover:border-sky-500 hover:text-sky-500 cursor-pointer font-bold transition-colors"
                      >
                        + Add link
                      </button>
                      {showLinkTaskDropdown && (
                        <div className="absolute right-0 mt-1 z-35 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                          <input 
                            type="text" 
                            placeholder="Search tasks..." 
                            value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800" 
                          />
                          {allTasks
                            .filter(t => t.id !== task.id && !task.relationships?.tasks?.includes(t.id))
                            .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                            .map(t => (
                              <button 
                                key={t.id}
                                onClick={() => {
                                  const list = [...(task.relationships?.tasks || []), t.id];
                                  onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                                  setShowLinkTaskDropdown(false);
                                  setRelationshipSearchQuery('');
                                  onAddSyncLog(`Linked task: "${t.title}"`);
                                }}
                                className="w-full text-left p-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer"
                              >
                                {t.title}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {(task.relationships?.tasks || []).map(taskId => {
                      const t = allTasks.find(item => item.id === taskId);
                      if (!t) return null;
                      const tStatusMeta = STATUS_META[t.status];
                      return (
                        <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-250 dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                              {tStatusMeta?.label || t.status}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                          </div>
                          <button 
                            onClick={() => {
                              const list = (task.relationships?.tasks || []).filter(id => id !== taskId);
                              onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                            }}
                            className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {(task.relationships?.tasks || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 font-bold italic py-1 pl-1">No linked tasks</p>
                    )}
                  </div>
                </div>

                {/* Linked Docs */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">Linked Documents</span>
                    <div className="relative">
                      <button 
                        onClick={() => { setShowLinkDocDropdown(!showLinkDocDropdown); setShowLinkTaskDropdown(false); }}
                        className="px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-850 text-[10px] text-slate-500 hover:border-sky-500 hover:text-sky-500 cursor-pointer font-bold transition-colors"
                      >
                        + Add link
                      </button>
                      {showLinkDocDropdown && (
                        <div className="absolute right-0 mt-1 z-35 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                          <input 
                            type="text" 
                            placeholder="Search docs..." 
                            value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800" 
                          />
                          {allDocs
                            .filter(d => !task.relationships?.docs?.includes(d.id))
                            .filter(d => d.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                            .map(d => (
                              <button 
                                key={d.id}
                                onClick={() => {
                                  const list = [...(task.relationships?.docs || []), d.id];
                                  onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                                  setShowLinkDocDropdown(false);
                                  setRelationshipSearchQuery('');
                                  onAddSyncLog(`Linked document: "${d.title}"`);
                                }}
                                className="w-full text-left p-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer"
                              >
                                {d.title}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {(task.relationships?.docs || []).map(docId => {
                      const d = allDocs.find(item => item.id === docId);
                      return (
                        <div key={docId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-250 dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-5.5 h-5.5 rounded bg-sky-50 dark:bg-sky-955/20 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5 text-sky-500" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-250 truncate">{d ? d.title : docId}</span>
                          </div>
                          <button 
                            onClick={() => {
                              const list = (task.relationships?.docs || []).filter(id => id !== docId);
                              onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                            }}
                            className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {(task.relationships?.docs || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 font-bold italic py-1 pl-1">No linked documents</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: Combined Activity & Comments Feed ── */}
          <div className="w-full md:w-[40%] border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col h-full min-w-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
              <span className="text-[12.5px] font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" />
                Activity Log
              </span>
              <div className="flex items-center gap-2.5 text-slate-400">
                <Phone className="w-3.5 h-3.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
                <Search className="w-3.5 h-3.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
                <Filter className="w-3.5 h-3.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
              </div>
            </div>

            {/* Combined Chronological Feed */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
              {timelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center mb-2.5">
                    <MessageSquare className="w-5 h-5 text-slate-300" />
                  </div>
                  <span className="text-[12px] font-bold text-slate-400">No activity or comments yet</span>
                  <span className="text-[10px] text-slate-450 mt-1">Changes and comments appear here</span>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-850" />
                  <div className="space-y-4">
                    {timelineItems.map((item, idx) => {
                      if (item.type === 'activity') {
                        const actColor = getActivityColor(item.content);
                        return (
                          <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-start gap-3 relative">
                            <div className={`w-[22px] h-[22px] rounded-full ${actColor.dot} flex items-center justify-center shrink-0 z-10 ring-4 ring-white dark:ring-slate-950`}>
                              <History className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="text-[11.5px] text-slate-655 dark:text-slate-300">
                                <span className="font-bold text-slate-900 dark:text-white">{item.userName}</span>
                                <span className="ml-1 text-slate-500 dark:text-slate-400">{item.content}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-400 mt-0.5 font-medium">{item.timestamp}</div>
                            </div>
                          </motion.div>
                        );
                      } else {
                        return (
                          <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-start gap-3 relative">
                            <div className="relative shrink-0 z-10 ring-4 ring-white dark:ring-slate-950">
                              <SignedImage filePath={item.avatar} className="w-5.5 h-5.5 rounded-full border border-slate-200 dark:border-slate-750 object-cover shadow-xs" alt={item.userName} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(item.userName)}`} />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-1.5 mb-1 text-[11.5px]">
                                <span className="font-bold text-slate-900 dark:text-white">{item.userName}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{item.timestamp}</span>
                              </div>
                              <div className="p-3 rounded-2xl rounded-tl-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-bold shadow-2xs">
                                {item.content}
                              </div>
                            </div>
                          </motion.div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom comment box */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-400/10 transition-all">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                  placeholder="Write a comment..."
                  className="flex-1 text-[12px] font-bold outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-405" />
                <button onClick={addComment} disabled={!commentText.trim()}
                  className="p-2 rounded-xl bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
