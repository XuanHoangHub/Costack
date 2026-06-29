"use client";

import React, { useState } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus, Priority, User, SubTask, Workspace, Space } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, SpacePillSelect } from './TaskSelects';
import SignedImage from '../SignedImage';
import {
  X, Trash2, Bot, CheckSquare, Plus, Edit2, Send, Paperclip, Upload,
  MessageSquare, History, Clock, Pin, Tag, Sparkles, FileText, Check,
  Calendar, User as UserIcon, Flag, CircleDot, ArrowRight, Folder, ChevronDown, RefreshCw
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
}

export default function TaskDetailsPanel({
   task, members, workspaces = [], spaces = [], onClose, onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast,
   onAttachmentUpload, onAttachmentDelete, onAiSubtasks, aiGenerating,
   onAiSummary, isSummarizing, aiSummary, allTasks = [], allDocs = []
 }: TaskDetailsPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');
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
    const loggedHours = parseFloat((elapsedSeconds / 3650).toFixed(2)); // about 3600 secs, but let's use exact 3600
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

  const tabs = [
    { key: 'details' as const, label: 'Details', icon: FileText },
    { key: 'comments' as const, label: `Comments`, count: task.comments?.length || 0, icon: MessageSquare },
    { key: 'activity' as const, label: 'Activity', icon: History },
  ];

  const createdDate = task.createdAt ? (() => {
    try {
      const d = new Date(task.createdAt);
      return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  })() : '';

  // ── File type icon helper ──
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (['pdf'].includes(ext || '')) return { color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' };
    if (['doc', 'docx'].includes(ext || '')) return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' };
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (['zip', 'rar', '7z'].includes(ext || '')) return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' };
    return { color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
  };

  // Activity timeline color helper
  const getActivityColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('tạo') || a.includes('thêm') || a.includes('create') || a.includes('add')) return { dot: 'bg-emerald-500', line: 'border-emerald-200 dark:border-emerald-800' };
    if (a.includes('xóa') || a.includes('delete') || a.includes('remove')) return { dot: 'bg-rose-500', line: 'border-rose-200 dark:border-rose-800' };
    return { dot: 'bg-indigo-500', line: 'border-indigo-200 dark:border-indigo-800' };
  };

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>

        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[4px]" />

        {/* Panel */}
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className={`relative w-full max-w-[580px] h-full bg-white dark:bg-slate-950 border-l border-slate-200/60 dark:border-slate-800/60 flex flex-col overflow-hidden`}
          style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.04)' }}>

          {/* ═══════════════════════════════════════ */}
          {/*  PRIORITY GRADIENT HEADER BAR          */}
          {/* ═══════════════════════════════════════ */}
          <div className={`bg-gradient-to-r ${theme.gradient} shrink-0`}>
            {/* Top bar: breadcrumb + actions */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-black text-slate-500 dark:text-slate-400 select-none">
                <span className="flex items-center gap-1">📁 {spaceName}</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="flex items-center gap-1">📋 {listName}</span>
                <span className="text-amber-400 hover:text-amber-500 cursor-pointer ml-1 select-none">⭐️</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onUpdateTask({ ...task, isPinned: !task.isPinned })}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
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
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-rose-600 text-white cursor-pointer hover:bg-rose-700 transition-colors shadow-sm">Delete</button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation — underline style */}
            <div className="flex items-center gap-1 px-6 relative">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`relative px-3 py-2.5 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${activeTab === tab.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {'count' in tab && tab.count! > 0 && (
                      <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {tab.count}
                      </span>
                    )}
                    {activeTab === tab.key && (
                      <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-indigo-600 dark:bg-indigo-400" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

          {/* ═══════════════════════════════════════ */}
          {/*  BODY                                  */}
          {/* ═══════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">

            {/* ── DETAILS TAB ── */}
            {activeTab === 'details' && (
              <div className="p-6 space-y-7">
                {/* ─── Metadata Summary Bar ─── */}
                <div className="flex items-center gap-3 text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/65 px-3 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800/80 w-fit select-none">
                  <span className="flex items-center gap-1">🆔 <span className="font-mono text-slate-550 dark:text-slate-300">{task.id}</span></span>
                  <span className="w-px h-3 bg-slate-205 dark:bg-slate-800" />
                  <span className="flex items-center gap-1">👤 <span className="text-slate-550 dark:text-slate-300">{task.assigneeIds?.length || (task.assigneeId ? 1 : 0)}</span></span>
                  <span className="w-px h-3 bg-slate-205 dark:bg-slate-800" />
                  <span className="flex items-center gap-1">📎 <span className="text-slate-550 dark:text-slate-300">{task.attachments?.length || 0}</span></span>
                </div>

                {/* ─── Title Hero ─── */}
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
                      <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity mt-1.5 shrink-0" />
                    </h2>
                  )}
                </div>

                {/* ─── ClickUp Main Properties (Image 4) ─── */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 px-1 border-b border-slate-100 dark:border-slate-850">
                  {/* Status */}
                  <div className="flex items-center gap-4">
                    <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-505 flex items-center gap-1 shrink-0">
                      <CircleDot className="w-3.5 h-3.5" /> Status
                    </span>
                    <StatusPillSelect value={task.status} onChange={s => { onUpdateTask({ ...task, status: s }); onAddSyncLog(`Status → ${s}`); }} />
                  </div>
                  
                  {/* Assignee */}
                  <div className="flex items-center gap-4 relative">
                    <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-505 flex items-center gap-1 shrink-0">
                      <UserIcon className="w-3.5 h-3.5" /> Assignee
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(task.assigneeIds || [task.assigneeId].filter(Boolean)).map((id, index) => {
                          const m = members.find(u => u.id === id);
                          if (!m) return null;
                          return (
                            <img
                              key={id}
                              src={m.avatar}
                              alt={m.name}
                              title={m.name}
                              className="w-5.5 h-5.5 rounded-full border border-white dark:border-slate-950 object-cover shrink-0"
                            />
                          );
                        })}
                        {(task.assigneeIds || [task.assigneeId].filter(Boolean)).length === 0 && (
                          <div className="w-5.5 h-5.5 rounded-full border border-dashed border-slate-350 dark:border-slate-700 text-[10px] text-slate-455 flex items-center justify-center font-bold">?</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                        className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] text-slate-500 cursor-pointer"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      
                      {showAssigneesDropdown && (
                        <div className="absolute left-24 top-7 z-[99] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg w-48 max-h-48 overflow-y-auto space-y-1">
                          {members.map(m => {
                            const checked = task.assigneeIds?.includes(m.id) || task.assigneeId === m.id;
                            return (
                              <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-355">
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
                                    onAddSyncLog(`Updated assignees for "${task.title}"`);
                                  }}
                                  className="rounded text-indigo-650 cursor-pointer"
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

                  {/* Dates */}
                  <div className="flex items-center gap-4">
                    <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-505 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5" /> Due Date
                    </span>
                    <PremiumDatePicker dateValue={task.dueDate?.split('T')[0] || ''} timeValue={task.dueDate?.split('T')[1] || ''}
                      onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} />
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-4">
                    <span className="w-20 text-[11px] font-bold text-slate-400 dark:text-slate-505 flex items-center gap-1 shrink-0">
                      <Flag className="w-3.5 h-3.5" /> Priority
                    </span>
                    <PriorityPillSelect value={task.priority} onChange={p => { onUpdateTask({ ...task, priority: p }); onAddSyncLog(`Priority → ${p}`); }} />
                  </div>
                </div>

                {/* ─── Collapsible Fields Accordion (Image 4) ─── */}
                <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
                  <button 
                    type="button" 
                    onClick={() => setFieldsExpanded(!fieldsExpanded)}
                    className="w-full flex items-center justify-between py-2 text-xs font-black text-slate-700 dark:text-slate-350 hover:text-indigo-600 transition-colors select-none cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <span>{fieldsExpanded ? '▼' : '▶'}</span>
                      <span>Custom Fields</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {Object.keys(task.custom_fields || {}).length + 4} fields
                    </span>
                  </button>

                  {fieldsExpanded && (
                    <div className="mt-3 pl-2 space-y-4 bg-slate-50/50 dark:bg-slate-900/35 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                      {/* Predefined Custom Fields styled in ClickUp Table row */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Objective field (renders peach badge) */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">🎯 Objective</label>
                          <input 
                            type="text" 
                            value={String(task.custom_fields?.Objective || '')} 
                            onChange={e => {
                              const updated = { ...task.custom_fields, Objective: e.target.value };
                              onUpdateTask({ ...task, custom_fields: updated });
                            }}
                            placeholder="e.g. Conversion" 
                            className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-450 bg-amber-50/65 dark:bg-amber-955/20 outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Owner field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">👤 Owner</label>
                          <input 
                            type="text" 
                            value={String(task.custom_fields?.Owner || '')} 
                            onChange={e => {
                              const updated = { ...task.custom_fields, Owner: e.target.value };
                              onUpdateTask({ ...task, custom_fields: updated });
                            }}
                            placeholder="e.g. Philippe" 
                            className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400"
                          />
                        </div>

                        {/* Cost field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">💵 Cost</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1 text-xs text-slate-400 font-bold">$</span>
                            <input 
                              type="text" 
                              value={String(task.custom_fields?.Cost || '')} 
                              onChange={e => {
                                const updated = { ...task.custom_fields, Cost: e.target.value };
                                onUpdateTask({ ...task, custom_fields: updated });
                              }}
                              placeholder="13,955.07" 
                              className="w-full pl-6 pr-2.5 py-1 text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400"
                            />
                          </div>
                        </div>

                        {/* Recurrence Repeat field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-505 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-pink-500 animate-spin-slow" /> Recurrence
                          </label>
                          <div className="flex items-center gap-2">
                            <select 
                              value={task.recurrence?.frequency || 'none'}
                              onChange={e => {
                                const freq = e.target.value as any;
                                onUpdateTask({ ...task, recurrence: { frequency: freq, interval: task.recurrence?.interval || 1 } });
                                onAddSyncLog(`Changed recurrence frequency: ${freq}`);
                              }}
                              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 outline-none text-slate-700 dark:text-slate-350 font-bold cursor-pointer"
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
                                className="w-12 text-xs bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg px-1.5 py-1 text-center outline-none font-bold text-slate-700 dark:text-slate-300"
                              />
                            )}
                          </div>
                        </div>

                        {/* Space property */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-505 flex items-center gap-1">📁 Space</label>
                          <div>
                            <SpacePillSelect
                              value={task.workspaceId || 'w2'}
                              workspaces={workspaces}
                              onChange={wsId => {
                                if (wsId) {
                                  onUpdateTask({ ...task, workspaceId: wsId });
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-505 flex items-center gap-1">📅 Start Date</label>
                          <PremiumDatePicker dateValue={task.startDate?.split('T')[0] || ''} timeValue={task.startDate?.split('T')[1] || ''}
                            onChange={v => onUpdateTask({ ...task, startDate: v || '' })} />
                        </div>

                        {/* Time tracking with Live timer */}
                        <div className="col-span-2 space-y-1.5 pt-2 border-t border-slate-200/40 dark:border-slate-800/45">
                          <label className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Time Tracking & Estimation
                          </label>
                          <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                            {/* Logged/Estimate status */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Logged: {task.hoursLogged ?? 0}h / Estimate:</span>
                              <input 
                                type="number"
                                min={0}
                                placeholder="Estimate (h)..."
                                value={task.hoursEstimate || ''}
                                onChange={e => {
                                  const estimate = parseFloat(e.target.value) || 0;
                                  onUpdateTask({ ...task, hoursEstimate: estimate });
                                }}
                                className="w-20 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 outline-none text-slate-700 dark:text-slate-300 font-bold"
                              />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">h</span>
                            </div>

                            {/* Live stopwatch control */}
                            <div className="flex items-center gap-2.5 ml-auto border-l pl-4 border-slate-200 dark:border-slate-800">
                              {isTimerActive ? (
                                <>
                                  <span className="text-xs font-mono font-bold text-rose-500 animate-pulse">{formatTimerTime(elapsedSeconds)}</span>
                                  <button 
                                    type="button" 
                                    onClick={stopTimerAndLog}
                                    className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-1"
                                  >
                                    <span className="w-2 h-2 rounded bg-white shrink-0 animate-ping" /> Stop
                                  </button>
                                </>
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => setIsTimerActive(true)}
                                  className="px-2.5 py-1 bg-indigo-650 text-white rounded text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1"
                                >
                                  <span>▶</span> Start Timer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Fields Table */}
                      {Object.entries(task.custom_fields || {}).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Other Custom Fields</label>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(task.custom_fields || {}).map(([key, val]) => {
                              if (['Objective', 'Cost', 'Owner'].includes(key)) return null;
                              return (
                                <div key={key} className="space-y-1 relative group">
                                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    {key}
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const { [key]: _, ...rest } = task.custom_fields || {};
                                        onUpdateTask({ ...task, custom_fields: rest });
                                      }}
                                      className="text-rose-500 opacity-0 group-hover:opacity-100 hover:underline text-[8px] cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </span>
                                  <input 
                                    type="text" 
                                    value={String(val || '')} 
                                    onChange={e => {
                                      const updated = { ...task.custom_fields, [key]: e.target.value };
                                      onUpdateTask({ ...task, custom_fields: updated });
                                    }}
                                    className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-pink-400"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Add dynamic field button */}
                      <div className="pt-2 text-left">
                        <button 
                          type="button" 
                          onClick={() => {
                            const name = prompt('Enter custom field name:');
                            if (!name) return;
                            const val = prompt(`Enter value for field "${name}":`) || '';
                            const updated = { ...task.custom_fields, [name]: val };
                            onUpdateTask({ ...task, custom_fields: updated });
                            onAddSyncLog(`Added custom field "${name}"`);
                          }}
                          className="text-[9.5px] font-black text-pink-500 hover:underline cursor-pointer tracking-wider uppercase"
                        >
                          + Add new custom field
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── Section Divider ─── */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

                {/* ─── Description ─── */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Description
                  </label>
                  <div className="relative group">
                    <textarea value={descValue} onChange={e => setDescValue(e.target.value)} onBlur={saveDesc}
                      placeholder="Add a detailed description for this task..."
                      className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 text-[13px] text-slate-700 dark:text-slate-200 resize-none outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400/10 transition-all leading-relaxed placeholder-slate-350" />
                    <span className="absolute bottom-2 right-3 text-[9px] text-slate-300 font-mono opacity-0 group-focus-within:opacity-100 transition-opacity">
                      {descValue.length} characters
                    </span>
                  </div>
                </div>

                {/* ─── Section Divider ─── */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

                {/* ─── Relationships Section (Image 3 Style) ─── */}
                <div className="space-y-4 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/80 dark:border-slate-800/85">
                  <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-955/20 flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-sky-500" />
                      </div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">
                        Relationships & References
                      </label>
                    </div>
                  </div>

                  {/* Tasks Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">Linked Tasks</span>
                      
                      {/* Search Task Dropdown Toggle */}
                      <div className="relative inline-block">
                        <button 
                          type="button"
                          onClick={() => {
                            setShowLinkTaskDropdown(!showLinkTaskDropdown);
                            setShowLinkDocDropdown(false);
                          }}
                          className="px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-750 text-[10px] text-slate-500 hover:border-sky-500 hover:text-sky-500 cursor-pointer font-bold transition-colors"
                        >
                          + Add link
                        </button>
                        
                        {showLinkTaskDropdown && (
                          <div className="absolute right-0 mt-1 z-[99] p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1 text-left">
                            <input 
                              type="text" 
                              placeholder="Search tasks..." 
                              value={relationshipSearchQuery}
                              onChange={e => setRelationshipSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs rounded mb-1 outline-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:border-indigo-500 transition-colors" 
                            />
                            {allTasks
                              .filter(t => t.id !== task.id && !task.relationships?.tasks?.includes(t.id))
                              .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                              .map(t => (
                                <button 
                                  key={t.id}
                                  type="button"
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
                        const tAssignees = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
                        
                        return (
                          <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3 py-2 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Status Pill */}
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                {tStatusMeta?.label || t.status}
                              </span>
                              
                              {/* Title */}
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Assignees stacked */}
                              <div className="flex -space-x-1 overflow-hidden">
                                {tAssignees.map(id => {
                                  const m = members.find(u => u.id === id);
                                  if (!m) return null;
                                  return (
                                    <img
                                      key={id}
                                      src={m.avatar}
                                      alt={m.name}
                                      title={m.name}
                                      className="w-4.5 h-4.5 rounded-full border border-white dark:border-slate-955 object-cover"
                                    />
                                  );
                                })}
                              </div>

                              {/* Priority flag */}
                              <span className={`text-xs ${PRIORITY_THEMES[t.priority]?.accent || 'text-slate-400'}`}>
                                🚩
                              </span>

                              {/* Unlink Action */}
                              <button 
                                type="button" 
                                onClick={() => {
                                  const list = (task.relationships?.tasks || []).filter(id => id !== taskId);
                                  onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                                }}
                                className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(task.relationships?.tasks || []).length === 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold italic py-1 pl-1">No linked tasks</p>
                      )}
                    </div>
                  </div>

                  {/* Docs Section */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">Linked Documents</span>
                      
                      {/* Search Doc Dropdown Toggle */}
                      <div className="relative inline-block">
                        <button 
                          type="button"
                          onClick={() => {
                            setShowLinkDocDropdown(!showLinkDocDropdown);
                            setShowLinkTaskDropdown(false);
                          }}
                          className="px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-750 text-[10px] text-slate-500 hover:border-sky-500 hover:text-sky-500 cursor-pointer font-bold transition-colors"
                        >
                          + Add link
                        </button>
                        
                        {showLinkDocDropdown && (
                          <div className="absolute right-0 mt-1 z-[99] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1 text-left">
                            <input 
                              type="text" 
                              placeholder="Search docs..." 
                              value={relationshipSearchQuery}
                              onChange={e => setRelationshipSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs rounded mb-1 outline-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:border-indigo-500 transition-colors" 
                            />
                            {allDocs
                              .filter(d => !task.relationships?.docs?.includes(d.id))
                              .filter(d => d.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                              .map(d => (
                                <button 
                                  key={d.id}
                                  type="button"
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
                          <div key={docId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3 py-2 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Blue Document Icon */}
                              <div className="w-5.5 h-5.5 rounded bg-sky-50 dark:bg-sky-955/20 flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-sky-500" />
                              </div>
                              
                              {/* Title */}
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-250 truncate">{d ? d.title : docId}</span>
                            </div>
                            
                            {/* Unlink Action */}
                            <button 
                              type="button" 
                              onClick={() => {
                                const list = (task.relationships?.docs || []).filter(id => id !== docId);
                                onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                              }}
                              className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {(task.relationships?.docs || []).length === 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold italic py-1 pl-1">No linked documents</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── Section Divider ─── */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

                {/* ─── Subtasks ─── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Subtasks
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">
                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                      </span>
                    </div>
                    <button onClick={() => onAiSubtasks(task)} disabled={aiGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 text-indigo-600 dark:text-indigo-400 hover:from-indigo-100 hover:to-violet-100 dark:hover:from-indigo-950/50 dark:hover:to-violet-950/50 cursor-pointer transition-all disabled:opacity-50 border border-indigo-100/60 dark:border-indigo-900/30">
                      <Bot className={`w-3 h-3 ${aiGenerating ? 'animate-spin' : ''}`} />
                      <span>{aiGenerating ? 'Generating...' : 'AI Suggest'}</span>
                    </button>
                  </div>

                  {/* Progress bar — gradient */}
                  {task.subtasks.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span className={`text-[11px] font-black tabular-nums ${task.progress === 100 ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {task.progress}%
                      </span>
                    </div>
                  )}

                  {/* Subtask list */}
                  <div className="space-y-1">
                    {task.subtasks.map(sub => (
                      <motion.div key={sub.id} layout
                        className="flex items-center gap-2.5 group py-1.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <button onClick={() => toggleSubtask(sub.id)}
                          className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${sub.completed
                            ? 'bg-indigo-500 border-indigo-500 text-white scale-100'
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                          }`}>
                          {sub.completed && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>
                        {editingSubtaskId === sub.id ? (
                          <input autoFocus value={editingSubtaskValue}
                            onChange={e => setEditingSubtaskValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') editSubtask(sub.id, editingSubtaskValue); if (e.key === 'Escape') setEditingSubtaskId(null); }}
                            onBlur={() => editSubtask(sub.id, editingSubtaskValue)}
                            className="flex-1 text-[12px] font-medium bg-transparent border-b-2 border-indigo-400 outline-none py-0.5 text-slate-800 dark:text-slate-200" />
                        ) : (
                          <span onDoubleClick={() => { setEditingSubtaskId(sub.id); setEditingSubtaskValue(sub.title); }}
                            className={`flex-1 text-[12px] cursor-text transition-all duration-200 ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
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

                  {/* Add subtask */}
                  <div className="flex items-center gap-2.5 px-3">
                    <div className="w-[18px] h-[18px] rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                      <Plus className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                    <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                      placeholder="Add new subtask..."
                      className="flex-1 text-[12px] font-medium text-slate-700 dark:text-slate-200 bg-transparent border-b border-transparent focus:border-indigo-400 dark:focus:border-indigo-500 outline-none py-1.5 placeholder-slate-400 transition-colors" />
                  </div>
                </div>

                {/* ─── Section Divider ─── */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

                {/* ─── Attachments ─── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">
                      Attachments
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">({task.attachments?.length || 0})</span>
                  </div>

                  {task.attachments && task.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {task.attachments.map(att => {
                        const fileStyle = getFileIcon(att.name);
                        return (
                          <div key={att.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${fileStyle.bg} border border-slate-100 dark:border-slate-800/60 group hover:shadow-sm transition-all`}>
                            <div className={`w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shrink-0`}>
                              <FileText className={`w-4 h-4 ${fileStyle.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate block">{att.name}</span>
                              <span className="text-[9px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</span>
                            </div>
                            <button onClick={() => onAttachmentDelete(task, att)}
                              className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-all cursor-pointer group">
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-[11px] font-semibold text-slate-505 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Drag and drop or click to upload</span>
                    <input type="file" className="hidden" onChange={e => onAttachmentUpload(task, e)} />
                  </label>
                </div>

                {/* ─── Section Divider ─── */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

                {/* ─── AI Summary — Glassmorphism ─── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">AI Summary</label>
                    </div>
                    <button onClick={() => onAiSummary(task)} disabled={isSummarizing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 text-indigo-600 dark:text-indigo-400 hover:from-indigo-100 hover:to-violet-100 cursor-pointer transition-all disabled:opacity-50 border border-indigo-100/60 dark:border-indigo-900/30">
                      <Bot className={`w-3 h-3 ${isSummarizing ? 'animate-spin' : ''}`} />
                      <span>{isSummarizing ? 'Analyzing...' : 'Create Summary'}</span>
                    </button>
                  </div>
                  {aiSummary && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/60 via-violet-50/40 to-purple-50/30 dark:from-indigo-950/20 dark:via-violet-950/15 dark:to-purple-950/10 border border-indigo-100/60 dark:border-indigo-900/20 text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap backdrop-blur-sm">
                      <div className="flex items-center gap-1.5 mb-2 text-[9px] font-black uppercase tracking-widest text-indigo-500">
                        <Sparkles className="w-3 h-3" /> AI Analysis Result
                      </div>
                      {aiSummary}
                    </div>
                  )}
                </div>

                {/* ─── Section Divider ─── */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

                {/* ─── Tags — Colorful Pills ─── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                      <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Tags</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {task.tags?.map((tag, i) => {
                      const tagColors = [
                        'from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40',
                        'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40',
                        'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40',
                        'from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40',
                        'from-cyan-500/10 to-blue-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-800/40',
                      ];
                      return (
                        <span key={tag}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r border transition-transform hover:scale-105 cursor-default ${tagColors[i % tagColors.length]}`}>
                          #{tag}
                        </span>
                      );
                    })}
                    {(!task.tags || task.tags.length === 0) && (
                      <span className="text-[11px] text-slate-400 italic">No tags</span>
                    )}
                  </div>
                </div>

                {/* Bottom spacer */}
                <div className="h-4" />
              </div>
            )}

            {/* ── COMMENTS TAB — Chat Style ── */}
            {activeTab === 'comments' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                  {(task.comments || []).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6 text-slate-300" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-400">No comments yet</span>
                      <span className="text-[11px] text-slate-450 mt-1">Be the first to comment</span>
                    </div>
                  )}
                  {(task.comments || []).map(c => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 group">
                      <div className="relative shrink-0 mt-0.5">
                        <SignedImage filePath={c.senderAvatar} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 object-cover shadow-sm" alt={c.senderName} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(c.senderName)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{c.senderName}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{c.timestamp}</span>
                        </div>
                        <div className="p-3 rounded-xl rounded-tl-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {c.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input value={commentText} onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                        placeholder="Write a comment..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[12px] font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all placeholder-slate-400" />
                    </div>
                    <button onClick={addComment} disabled={!commentText.trim()}
                      className="p-2.5 rounded-xl bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVITY TAB — Timeline ── */}
            {activeTab === 'activity' && (
              <div className="p-6">
                {(task.activities || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="text-[13px] font-bold text-slate-400">No activity yet</span>
                    <span className="text-[11px] text-slate-450 mt-1">Changes will be recorded here</span>
                  </div>
                )}
                {(task.activities || []).length > 0 && (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent dark:from-indigo-800 dark:via-slate-800" />
                    <div className="space-y-4">
                      {(task.activities || []).map((a, idx) => {
                        const actColor = getActivityColor(a.action);
                        return (
                          <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-start gap-3 relative">
                            <div className={`w-[22px] h-[22px] rounded-full ${actColor.dot} flex items-center justify-center shrink-0 z-10 ring-4 ring-white dark:ring-slate-950`}>
                              <History className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="text-[12px]">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{a.userName}</span>
                                <span className="text-slate-500 dark:text-slate-400 ml-1">{a.action}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{a.timestamp}</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
