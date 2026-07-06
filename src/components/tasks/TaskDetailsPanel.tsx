"use client";

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus, Priority, User, SubTask, Workspace, Space, TaskAttachment, Document } from '../../types';
import { PriorityPillSelect, StatusPillSelect, PremiumDatePicker, SpacePillSelect } from './TaskSelects';
import SignedImage from '../SignedImage';
import {
  X, Trash2, Bot, CheckSquare, Plus, Edit2, Send, Paperclip, Upload,
  MessageSquare, History, Clock, Pin, Tag, Sparkles, FileText, Check,
  Calendar, User as UserIcon, Flag, CircleDot, ChevronDown, RefreshCw,
  SlidersHorizontal, Phone, Search, Filter, Activity, Play, Square, Timer
} from 'lucide-react';

// ── Priority accent mapping ──
const PRIORITY_THEMES: Record<Priority, { gradient: string; accent: string; badge: string; glow: string }> = {
  urgent: {
    gradient: 'from-rose-500/8 via-rose-400/4 to-transparent',
    accent: 'text-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 border-rose-200/60 dark:border-rose-800/40 dark:text-rose-400 dark:bg-rose-500/10',
    glow: 'shadow-rose-500/5',
  },
  high: {
    gradient: 'from-orange-500/8 via-orange-400/4 to-transparent',
    accent: 'text-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 border-orange-200/60 dark:border-orange-800/40 dark:text-orange-400 dark:bg-orange-500/10',
    glow: 'shadow-orange-500/5',
  },
  medium: {
    gradient: 'from-amber-500/6 via-amber-400/3 to-transparent',
    accent: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-200/60 dark:border-amber-800/40 dark:text-amber-400 dark:bg-amber-500/10',
    glow: 'shadow-amber-500/5',
  },
  low: {
    gradient: 'from-slate-500/4 via-slate-400/2 to-transparent',
    accent: 'text-slate-400',
    badge: 'bg-slate-500/10 text-slate-500 border-slate-200/60 dark:border-slate-700/40 dark:text-slate-400 dark:bg-slate-500/10',
    glow: 'shadow-slate-500/5',
  },
};

const getTagColor = (tag: string) => {
  const t = tag.toLowerCase();
  if (t === 'design') return { bg: 'bg-pink-50 dark:bg-pink-950/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200/50 dark:border-pink-900/30' };
  if (t === 'frontend') return { bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200/50 dark:border-sky-900/30' };
  if (t === 'backend') return { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200/50 dark:border-violet-900/30' };
  if (t === 'bug') return { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200/50 dark:border-rose-900/30' };
  if (t === 'marketing') return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
  if (t === 'research') return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/50 dark:border-amber-900/30' };
  return { bg: 'bg-slate-50 dark:bg-slate-900/60', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-200/50 dark:border-slate-800/40' };
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
  triggerToast?: (type: 'success' | 'error' | 'info' | 'warning' | 'comment', title: string, message: string) => void;
  onAttachmentUpload: (task: Task, e: React.ChangeEvent<HTMLInputElement> | File) => void;
  onAttachmentDelete: (task: Task, att: TaskAttachment) => void;
  onAiSubtasks: (task: Task) => void;
  aiGenerating: boolean;
  onAiSummary: (task: Task) => void;
  isSummarizing: boolean;
  aiSummary: string;
  allTasks?: Task[];
  allDocs?: Document[];
  onOpenFieldsPanel?: () => void;
}

export default function TaskDetailsPanel({
   task, members, workspaces = [], spaces = [], onClose, onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast,
   onAttachmentUpload, onAttachmentDelete, onAiSubtasks, aiGenerating,
   onAiSummary, isSummarizing, aiSummary, allTasks = [], allDocs = [], onOpenFieldsPanel
 }: TaskDetailsPanelProps) {
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
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

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
    // Sync form state with task prop changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const theme = PRIORITY_THEMES[task.priority];

  let spaceName = 'Marketing';
  let listName = 'Email Launch';
  if (spaces && spaces.length > 0) {
    for (const space of spaces) {
      if (space.id === task.spaceId) {
        spaceName = space.name;
      }
      const list = space.lists?.find((l: { id: string; name: string; folderId?: string }) => l.id === task.listId);
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
    return { color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900' };
  };

  const getActivityColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('tạo') || a.includes('thêm') || a.includes('create') || a.includes('add')) return { dot: 'bg-emerald-500', line: 'border-emerald-200 dark:border-emerald-800' };
    if (a.includes('xóa') || a.includes('delete') || a.includes('remove')) return { dot: 'bg-rose-500', line: 'border-rose-200 dark:border-rose-800' };
    return { dot: 'bg-indigo-500', line: 'border-indigo-200 dark:border-indigo-800' };
  };

  // Combine Activities and Comments chronologically
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'activity' | 'comment';
      userName: string;
      avatar?: string;
      content: string;
      timestamp: string;
      dateObj: Date;
    }> = [];
    
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

    items.sort((a, b) => {
      const timeA = isNaN(a.dateObj.getTime()) ? 0 : a.dateObj.getTime();
      const timeB = isNaN(b.dateObj.getTime()) ? 0 : b.dateObj.getTime();
      return timeA - timeB;
    });

    return items;
  }, [task.activities, task.comments]);

  // ── Computed helpers ──
  const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 10 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.96, opacity: 0, y: 10 }} 
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl"
        >

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── LEFT PANEL: Details & Properties ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar">
            
            {/* ── Header Bar ── */}
            <div className={`shrink-0 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r ${theme.gradient}`}>
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 select-none">
                <span className="flex items-center gap-1">📁 {spaceName}</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="flex items-center gap-1">📋 {listName}</span>
                {task.isPinned && <span className="ml-1 text-amber-500 text-xs">★</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onUpdateTask({ ...task, isPinned: !task.isPinned })}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Pin className={`w-3.5 h-3.5 ${task.isPinned ? 'fill-amber-400' : ''}`} />
                </button>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { onDeleteTask(task.id); onClose(); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white cursor-pointer hover:bg-rose-700 transition-colors">Delete</button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ml-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Content Body ── */}
            <div className="p-6 md:px-7 space-y-6">

              {/* AI Assistant Bar */}
              <div className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/25 via-purple-500/15 to-pink-500/25">
                <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm rounded-[11px] text-[11px] text-slate-500 dark:text-slate-400 select-none">
                  <Bot className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
                  <span className="font-medium">Ask Brain for summaries, prototypes, or subtask planning.</span>
                  <div className="ml-auto">
                    <button onClick={() => onAiSummary(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer font-semibold text-[10.5px] tracking-wide shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSummarizing ? 'Analyzing...' : 'Summarize'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Summary Display */}
              {aiSummary && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/10 border-l-[3px] border-l-indigo-500 border border-indigo-100/40 dark:border-indigo-900/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> AI Executive Summary
                  </div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-350 leading-relaxed font-medium">{aiSummary}</p>
                </motion.div>
              )}

              {/* ── Title ── */}
              <div>
                {editingTitle ? (
                  <input autoFocus value={titleValue} onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    onBlur={saveTitle}
                    className="w-full text-xl font-bold text-slate-900 dark:text-slate-50 bg-transparent border-b-2 border-indigo-500 outline-none py-1 leading-tight" />
                ) : (
                  <h2 onClick={() => setEditingTitle(true)}
                    className="text-xl font-bold text-slate-900 dark:text-slate-100 cursor-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group flex items-start gap-2 leading-tight">
                    <span className={`${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{task.title}</span>
                    <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity mt-1.5 shrink-0" />
                  </h2>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── Properties Grid (Notion/Linear style) ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              <div className="border-y border-slate-100 dark:border-slate-800/60 py-4 space-y-3">

                {/* Status */}
                <div className="flex items-center min-h-[34px]">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
                    <CircleDot className="w-3.5 h-3.5" /> Status
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusPillSelect value={task.status} onChange={s => { onUpdateTask({ ...task, status: s }); onAddSyncLog(`Status → ${s}`); }} />
                    <button type="button"
                      onClick={() => {
                        const next = task.status === 'completed' ? 'todo' : 'completed';
                        onUpdateTask({ ...task, status: next as TaskStatus });
                        onAddSyncLog(`Status → ${next}`);
                      }}
                      className={`p-1 rounded-md border cursor-pointer transition-all ${task.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 dark:bg-slate-900 dark:border-slate-800'}`}
                      title={task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}>
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex items-center min-h-[34px]">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
                    <UserIcon className="w-3.5 h-3.5" /> Assignees
                  </span>
                  <div className="relative">
                    <button 
                      onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {assigneeIds.slice(0, 3).map(id => {
                          const m = members.find(u => u.id === id);
                          if (!m) return null;
                          return <SignedImage key={id} filePath={m.avatar} className="w-4.5 h-4.5 rounded-full border border-white dark:border-slate-950 object-cover shrink-0" alt={m.name} />;
                        })}
                      </div>
                      <span className="truncate max-w-[120px]">
                        {assigneeIds.length === 0 ? 'No Assignee' : `${assigneeIds.length} Assignee${assigneeIds.length > 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    <AnimatePresence>
                      {showAssigneesDropdown && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">Select Assignees</div>
                          {members.map(m => {
                            const checked = assigneeIds.includes(m.id);
                            return (
                              <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                                <input type="checkbox" checked={checked}
                                  onChange={() => {
                                    const ids = assigneeIds;
                                    const nextIds = checked ? ids.filter(id => id !== m.id) : [...ids, m.id];
                                    onUpdateTask({ ...task, assigneeIds: nextIds, assigneeId: nextIds[0] || undefined });
                                  }}
                                  className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer" />
                                <SignedImage filePath={m.avatar} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" alt={m.name} />
                                <span className="truncate">{m.name}</span>
                              </label>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center min-h-[34px]">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
                    <Flag className="w-3.5 h-3.5" /> Priority
                  </span>
                  <PriorityPillSelect value={task.priority} onChange={p => { onUpdateTask({ ...task, priority: p || 'medium' }); onAddSyncLog(`Priority → ${p || 'medium'}`); }} />
                </div>

                {/* Due Date */}
                <div className="flex items-center min-h-[34px]">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
                    <Calendar className="w-3.5 h-3.5" /> Dates
                  </span>
                  <div className="flex items-center gap-1.5">
                    <PremiumDatePicker dateValue={task.startDate?.split('T')[0] || ''} timeValue={task.startDate?.split('T')[1] || ''}
                      onChange={v => onUpdateTask({ ...task, startDate: v || '' })} label="Start" align="left"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 transition-all ${task.startDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className="text-slate-300 dark:text-slate-700 text-xs select-none">→</span>
                    <PremiumDatePicker dateValue={task.dueDate?.split('T')[0] || ''} timeValue={task.dueDate?.split('T')[1] || ''}
                      onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} label="Due" align="left"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 transition-all ${task.dueDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  </div>
                </div>

                {/* Time Tracking */}
                <div className="flex items-center min-h-[34px]">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
                    <Clock className="w-3.5 h-3.5" /> Track time
                  </span>
                  <div className="flex items-center gap-2">
                    {isTimerActive ? (
                      <>
                        <span className="text-[11px] font-mono font-bold text-rose-500 animate-pulse tabular-nums">{formatTimerTime(elapsedSeconds)}</span>
                        <button type="button" onClick={stopTimerAndLog}
                          className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-bold cursor-pointer hover:bg-rose-100 transition-colors border border-rose-200/60 dark:border-rose-800/30">
                          <Square className="w-2.5 h-2.5 fill-current" /> Stop
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setIsTimerActive(true)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 p-1 px-2 rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50">
                        <Play className="w-3 h-3 fill-slate-400 text-slate-400 shrink-0" /> Start
                      </button>
                    )}
                    {(task.hoursLogged || 0) > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">{task.hoursLogged}h logged</span>
                    )}
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="flex items-center min-h-[34px]">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
                    <Timer className="w-3.5 h-3.5" /> Estimate
                  </span>
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} step={0.5} placeholder="—"
                      value={task.hoursEstimate || ''}
                      onChange={e => onUpdateTask({ ...task, hoursEstimate: parseFloat(e.target.value) || undefined })}
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-transparent border border-slate-200/60 dark:border-slate-800 rounded-lg outline-none px-2 py-1 w-16 placeholder-slate-350 focus:border-indigo-400 transition-colors" />
                    {task.hoursEstimate ? <span className="text-[10px] text-slate-400 font-medium">hrs</span> : null}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-start min-h-[34px] pt-1">
                  <span className="w-28 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none mt-0.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap relative">
                    {(task.tags || []).map(tag => {
                      const color = getTagColor(tag);
                      return (
                        <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${color.bg} ${color.text} ${color.border} select-none`}>
                          {tag}
                          <button onClick={() => {
                            const list = (task.tags || []).filter(t => t !== tag);
                            onUpdateTask({ ...task, tags: list });
                          }} className="hover:text-rose-500 cursor-pointer text-[9px] ml-0.5">✕</button>
                        </span>
                      );
                    })}
                    <div className="relative">
                      <button onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                        className="w-5 h-5 rounded-md border border-dashed border-slate-250 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900">
                        <Plus className="w-3 h-3 text-slate-400" />
                      </button>
                      <AnimatePresence>
                        {showTagsDropdown && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                            className="absolute left-0 mt-1.5 z-30 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-36 space-y-0.5">
                            {['Design', 'Frontend', 'Backend', 'Bug', 'Marketing', 'Research', 'Copywriting'].map(preset => (
                              <button key={preset}
                                onClick={() => {
                                  const current = task.tags || [];
                                  if (!current.includes(preset)) onUpdateTask({ ...task, tags: [...current, preset] });
                                  setShowTagsDropdown(false);
                                }}
                                className="w-full text-left px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${getTagColor(preset).bg} border ${getTagColor(preset).border}`} />
                                {preset}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {(!task.tags || task.tags.length === 0) && (
                      <button onClick={() => setShowTagsDropdown(true)}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">Empty</button>
                    )}
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── Custom Fields Accordion ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setFieldsExpanded(!fieldsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/30 text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/80 cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${fieldsExpanded ? '' : '-rotate-90'}`} />
                    <span>Custom Fields</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{Object.keys(task.custom_fields || {}).length + 4} fields</span>
                </button>

                {fieldsExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Objective</label>
                        <input type="text" value={String(task.custom_fields?.Objective || '')} 
                          onChange={e => { const updated = { ...(task.custom_fields || {}), Objective: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Owner</label>
                        <input type="text" value={String(task.custom_fields?.Owner || '')} 
                          onChange={e => { const updated = { ...(task.custom_fields || {}), Owner: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cost</label>
                        <input type="text" value={String(task.custom_fields?.Cost || '')} 
                          onChange={e => { const updated = { ...(task.custom_fields || {}), Cost: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-pink-500" /> Recurrence
                        </label>
                        <div className="flex items-center gap-2">
                          <select value={task.recurrence?.frequency || 'none'}
                            onChange={e => {
                              const freq = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly';
                              onUpdateTask({ ...task, recurrence: { frequency: freq, interval: task.recurrence?.interval || 1 } });
                            }}
                            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 outline-none text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                            <option value="none">None</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                          {task.recurrence?.frequency && task.recurrence.frequency !== 'none' && (
                            <input type="number" min={1} value={task.recurrence.interval}
                              onChange={e => { const val = parseInt(e.target.value) || 1; onUpdateTask({ ...task, recurrence: { ...task.recurrence!, interval: val } }); }}
                              className="w-12 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1 text-center outline-none font-medium text-slate-700 dark:text-slate-300" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">📁 Space</label>
                        <SpacePillSelect value={task.workspaceId || 'w2'} workspaces={workspaces}
                          onChange={wsId => { if (wsId) onUpdateTask({ ...task, workspaceId: wsId }); }} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">📅 Start Date</label>
                        <PremiumDatePicker dateValue={task.startDate?.split('T')[0] || ''} timeValue={task.startDate?.split('T')[1] || ''}
                          onChange={v => onUpdateTask({ ...task, startDate: v || '' })} />
                      </div>
                    </div>

                    {/* Dynamic custom fields */}
                    {Object.keys(task.custom_fields || {}).filter(k => !['Objective', 'Owner', 'Cost'].includes(k)).length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Other Custom Fields</label>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(task.custom_fields || {})
                            .filter(([k]) => !['Objective', 'Owner', 'Cost'].includes(k))
                            .map(([key, val]) => (
                              <div key={key} className="space-y-1 relative group">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize">{key}</label>
                                  <button onClick={() => { const { [key]: _, ...rest } = task.custom_fields || {}; onUpdateTask({ ...task, custom_fields: rest }); }}
                                    className="text-[9px] text-rose-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Delete</button>
                                </div>
                                <input type="text" value={String(val || '')} 
                                  onChange={e => { const updated = { ...(task.custom_fields || {}), [key]: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                                  className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <button type="button" onClick={() => {
                        if (onOpenFieldsPanel) { onOpenFieldsPanel(); }
                        else { const name = prompt('Enter custom field name:'); if (!name) return; const val = prompt(`Enter value for field "${name}":`) || ''; const updated = { ...(task.custom_fields || {}), [name]: val }; onUpdateTask({ ...task, custom_fields: updated }); }
                      }}
                        className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add new custom field
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Description ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Description
                </label>
                <textarea value={descValue} onChange={e => setDescValue(e.target.value)} onBlur={saveDesc}
                  placeholder="Add description, or write with AI..."
                  className="w-full min-h-[90px] p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-[12.5px] text-slate-700 dark:text-slate-200 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all leading-relaxed placeholder-slate-350 font-medium" />
              </div>

              {/* ── Quick Actions Row ── */}
              <div className="flex flex-wrap gap-2 py-2 border-t border-slate-100 dark:border-slate-800/60">
                <button onClick={onOpenFieldsPanel} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" /> Add fields
                </button>
                <button onClick={() => { const title = prompt("Enter subtask title:"); if (title?.trim()) { const newSub = { id: `sub-${Date.now()}`, title: title.trim(), completed: false }; onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] }); } }} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none">
                  <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add subtask
                </button>
                <button onClick={() => { const el = document.getElementById('relationships-section'); el?.scrollIntoView({ behavior: 'smooth' }); }} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none">
                  <Tag className="w-3.5 h-3.5 text-sky-500" /> Relate items
                </button>
                <button onClick={() => { const fileInput = document.getElementById('task-file-upload'); fileInput?.click(); }} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none">
                  <Paperclip className="w-3.5 h-3.5 text-amber-500" /> Attach file
                </button>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── Subtasks Section ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Subtasks</label>
                    <span className="text-[10px] font-medium text-slate-400">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                  </div>
                  <button onClick={() => onAiSubtasks(task)} disabled={aiGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer disabled:opacity-50 border border-indigo-100/60 dark:border-indigo-900/30 transition-colors">
                    <Bot className={`w-3 h-3 ${aiGenerating ? 'animate-spin' : ''}`} />
                    <span>{aiGenerating ? 'Generating...' : 'AI Suggest'}</span>
                  </button>
                </div>

                {task.subtasks.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                        initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{task.progress}%</span>
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
                          className={`flex-1 text-[12px] cursor-text transition-all ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                          {sub.title}
                        </span>
                      )}
                      <button onClick={() => deleteSubtask(sub.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 px-3">
                  <div className="w-[18px] h-[18px] rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                    <Plus className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                  <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                    placeholder="Add new subtask..."
                    className="flex-1 text-[12px] font-medium text-slate-700 dark:text-slate-200 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1.5 placeholder-slate-400 transition-colors" />
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── Attachments ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                      <Paperclip className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Attachments</label>
                  </div>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                    <Upload className="w-3 h-3" /> Upload file
                    <input id="task-file-upload" type="file" onChange={e => onAttachmentUpload(task, e)} className="hidden" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(task.attachments || []).map(att => {
                    const iconStyle = getFileIcon(att.name);
                    return (
                      <div key={att.id} className="flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-3 py-2.5 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 transition-colors group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${iconStyle.bg} flex items-center justify-center shrink-0`}>
                            <FileText className={`w-4 h-4 ${iconStyle.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{att.name}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{(att.size / 1024).toFixed(1)} KB</div>
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
                    <div className="col-span-2 text-center py-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-400 font-medium italic">No attachments yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── Relationships & References ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              <div id="relationships-section" className="space-y-4 p-4 bg-slate-50/40 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/20 flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Relationships & References</label>
                </div>

                {/* Linked Tasks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linked Tasks</span>
                    <div className="relative">
                      <button onClick={() => { setShowLinkTaskDropdown(!showLinkTaskDropdown); setShowLinkDocDropdown(false); }}
                        className="px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-800 text-[10px] text-slate-500 hover:border-sky-500 hover:text-sky-500 cursor-pointer font-medium transition-colors">
                        + Add link
                      </button>
                      {showLinkTaskDropdown && (
                        <div className="absolute right-0 mt-1 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                          <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800" />
                          {allTasks
                            .filter(t => t.id !== task.id && !task.relationships?.tasks?.includes(t.id))
                            .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                            .map(t => (
                              <button key={t.id}
                                onClick={() => {
                                  const list = [...(task.relationships?.tasks || []), t.id];
                                  onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                                  setShowLinkTaskDropdown(false); setRelationshipSearchQuery('');
                                  onAddSyncLog(`Linked task: "${t.title}"`);
                                }}
                                className="w-full text-left p-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded truncate font-medium text-slate-700 dark:text-slate-300 block cursor-pointer">
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
                        <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                              {tStatusMeta?.label || t.status}
                            </span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                          </div>
                          <button onClick={() => {
                            const list = (task.relationships?.tasks || []).filter(id => id !== taskId);
                            onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                          }} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                        </div>
                      );
                    })}
                    {(task.relationships?.tasks || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 font-medium italic py-1 pl-1">No linked tasks</p>
                    )}
                  </div>
                </div>

                {/* Linked Docs */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linked Documents</span>
                    <div className="relative">
                      <button onClick={() => { setShowLinkDocDropdown(!showLinkDocDropdown); setShowLinkTaskDropdown(false); }}
                        className="px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-800 text-[10px] text-slate-500 hover:border-sky-500 hover:text-sky-500 cursor-pointer font-medium transition-colors">
                        + Add link
                      </button>
                      {showLinkDocDropdown && (
                        <div className="absolute right-0 mt-1 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                          <input type="text" placeholder="Search docs..." value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800" />
                          {allDocs
                            .filter(d => !task.relationships?.docs?.includes(d.id))
                            .filter(d => d.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                            .map(d => (
                              <button key={d.id}
                                onClick={() => {
                                  const list = [...(task.relationships?.docs || []), d.id];
                                  onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                                  setShowLinkDocDropdown(false); setRelationshipSearchQuery('');
                                  onAddSyncLog(`Linked document: "${d.title}"`);
                                }}
                                className="w-full text-left p-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded truncate font-medium text-slate-700 dark:text-slate-300 block cursor-pointer">
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
                        <div key={docId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-5.5 h-5.5 rounded bg-sky-50 dark:bg-sky-950/20 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5 text-sky-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{d ? d.title : docId}</span>
                          </div>
                          <button onClick={() => {
                            const list = (task.relationships?.docs || []).filter(id => id !== docId);
                            onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                          }} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                        </div>
                      );
                    })}
                    {(task.relationships?.docs || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 font-medium italic py-1 pl-1">No linked documents</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── RIGHT PANEL: Activity Log & Chat Feed ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex flex-col h-full min-w-0">
            
            {/* Right Header */}
            <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" />
                Activity Log
              </span>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors" />
                <Search className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors" />
                <Filter className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Timeline Feed */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
              {timelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center select-none">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center mb-2.5">
                    <MessageSquare className="w-5 h-5 text-slate-300" />
                  </div>
                  <span className="text-[12px] font-medium text-slate-400">No activity or comments yet</span>
                  <span className="text-[10px] text-slate-350 mt-1">Changes and comments appear here</span>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-4">
                    {timelineItems.map((item, idx) => {
                      if (item.type === 'activity') {
                        const actColor = getActivityColor(item.content);
                        return (
                          <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="flex items-start gap-3 relative">
                            <div className={`w-[22px] h-[22px] rounded-full ${actColor.dot} flex items-center justify-center shrink-0 z-10 ring-4 ring-slate-50 dark:ring-slate-950`}>
                              <History className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="text-[11.5px] text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{item.userName}</span>
                                <span className="ml-1 text-slate-500 dark:text-slate-400">{item.content}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-400 mt-0.5">{item.timestamp}</div>
                            </div>
                          </motion.div>
                        );
                      } else {
                        return (
                          <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="flex items-start gap-3 relative">
                            <div className="relative shrink-0 z-10 ring-4 ring-slate-50 dark:ring-slate-950">
                              <SignedImage filePath={item.avatar} className="w-5.5 h-5.5 rounded-full border border-slate-200 dark:border-slate-800 object-cover" alt={item.userName} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(item.userName)}`} />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-1.5 mb-1 text-[11.5px]">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{item.userName}</span>
                                <span className="text-[9px] text-slate-400">{item.timestamp}</span>
                              </div>
                              <div className="p-3 rounded-xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium shadow-xs">
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

            {/* Comment Input */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50/80 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-400/10 transition-all">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                  placeholder="Write a comment..."
                  className="flex-1 text-[12px] font-medium outline-none bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-400" />
                <button onClick={addComment} disabled={!commentText.trim()}
                  className="p-2 rounded-lg bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
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
