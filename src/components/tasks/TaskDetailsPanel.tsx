"use client";

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Task, TaskStatus, Priority, User, SubTask, Workspace, Space, TaskAttachment, Document } from '../../types';
import { PriorityPillSelect, StatusPillSelect, PremiumDatePicker, SpacePillSelect } from './TaskSelects';
import SignedImage from '../SignedImage';
import { useTaskStore } from '../../store/taskStore';
import {
  GripVertical,
  X,
  Trash2,
  Bot,
  CheckSquare,
  Plus,
  Edit2,
  Send,
  Paperclip,
  Upload,
  MessageSquare,
  History,
  Clock,
  Pin,
  Tag,
  Sparkles,
  FileText,
  Check,
  Calendar,
  User as UserIcon,
  Flag,
  CircleDot,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  Phone,
  Search,
  Filter,
  Activity,
  Play,
  Square,
  Timer,
  List,
  Users,
  MoreHorizontal,
  Star,
  Link as LinkIcon,
  ChevronRight, ChevronsLeft, ChevronsRight,
  Hourglass, AlertTriangle
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
    badge: 'bg-slate-500/10 text-slate-505 border-slate-200/60 dark:border-slate-700/40 dark:text-slate-400 dark:bg-slate-500/10',
    glow: 'shadow-slate-500/5',
  },
};

const getTagColor = (tag: string) => {
  const t = tag.toLowerCase();
  if (t === 'design') return { bg: 'bg-pink-50 dark:bg-pink-955/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200/50 dark:border-pink-900/30' };
  if (t === 'frontend') return { bg: 'bg-sky-50 dark:bg-sky-955/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200/50 dark:border-sky-900/30' };
  if (t === 'backend') return { bg: 'bg-violet-50 dark:bg-violet-955/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200/50 dark:border-violet-900/30' };
  if (t === 'bug') return { bg: 'bg-rose-50 dark:bg-rose-955/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200/50 dark:border-rose-900/30' };
  if (t === 'marketing') return { bg: 'bg-emerald-50 dark:bg-emerald-955/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
  if (t === 'research') return { bg: 'bg-amber-50 dark:bg-amber-955/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/50 dark:border-amber-900/30' };
  return { bg: 'bg-slate-50 dark:bg-slate-900/60', text: 'text-slate-505 dark:text-slate-400', border: 'border-slate-200/50 dark:border-slate-800/40' };
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; bg: string }> = {
  todo: { label: 'To Do', dot: 'bg-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  inprogress: { label: 'In Progress', dot: 'bg-amber-505', bg: 'bg-amber-50 dark:bg-amber-955/30' },
  review: { label: 'Review', dot: 'bg-cyan-505', bg: 'bg-cyan-50 dark:bg-cyan-955/30' },
  completed: { label: 'Done', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-955/30' },
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
  globalActiveTaskId?: string | null;
  globalActiveElapsed?: number;
  globalIsPaused?: boolean;
  onStartGlobalTimer?: (id: string) => void;
  onStopGlobalTimer?: () => void;
  onTogglePauseGlobalTimer?: () => void;
  visibleFields?: string[];
  onToggleFieldVisibility?: (fieldKey: string) => void;
}

export default function TaskDetailsPanel({
   task, members, workspaces = [], spaces = [], onClose, onUpdateTask, onDeleteTask, onAddSyncLog, triggerToast,
   onAttachmentUpload, onAttachmentDelete, onAiSubtasks, aiGenerating,
   onAiSummary, isSummarizing, aiSummary, allTasks = [], allDocs = [], onOpenFieldsPanel,
   globalActiveTaskId = null, globalActiveElapsed = 0, globalIsPaused = false,
   onStartGlobalTimer, onStopGlobalTimer, onTogglePauseGlobalTimer,
   visibleFields, onToggleFieldVisibility
 }: TaskDetailsPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskValue, setEditingSubtaskValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalLayout, setModalLayout] = useState<'modal' | 'fullscreen' | 'sidebar'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('apexa_task_modal_layout') as any) || 'modal';
    }
    return 'modal';
  });
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('apexa_task_modal_sidebar_expanded') === 'true';
    }
    return false;
  });

  const toggleSidebarExpand = () => {
    const nextVal = !isSidebarExpanded;
    setIsSidebarExpanded(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexa_task_modal_sidebar_expanded', String(nextVal));
    }
  };
  const [isStarred, setIsStarred] = useState(task.isPinned || false);

  // Redesign state variables
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratingResponse, setAiGeneratingResponse] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'comments' | 'system'>('all');
  const [logTimeValue, setLogTimeValue] = useState('');
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);

  // Inline Custom Fields State
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  const handleLayoutChange = (newLayout: 'modal' | 'fullscreen' | 'sidebar') => {
    setModalLayout(newLayout);
    localStorage.setItem('apexa_task_modal_layout', newLayout);
  };

  // Layout styles mapping
  const overlayClass = 
    modalLayout === 'modal' ? 'fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-955/40 dark:bg-black/60 backdrop-blur-sm transition-all duration-305' :
    modalLayout === 'fullscreen' ? 'fixed inset-0 z-[100] flex items-stretch justify-stretch p-0 bg-black/30 transition-all duration-305' :
    'fixed inset-0 z-[100] flex items-stretch justify-end p-0 bg-black/15 backdrop-blur-none pointer-events-none transition-all duration-305';

  const panelClass =
    modalLayout === 'modal' ? 'relative w-full sm:w-[92vw] max-w-[1240px] h-full sm:h-[90vh] bg-white dark:bg-slate-900 border-none sm:border border-slate-200/80 dark:border-slate-800 rounded-none sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl pointer-events-auto' :
    modalLayout === 'fullscreen' ? 'relative w-full h-full bg-white dark:bg-slate-900 flex flex-col overflow-hidden shadow-2xl pointer-events-auto' :
    `relative w-full ${isSidebarExpanded ? 'max-w-[1050px] md:max-w-[75vw]' : 'max-w-[640px]'} h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200/60 dark:border-slate-800 rounded-none sm:rounded-l-3xl flex flex-col overflow-hidden shadow-2xl pointer-events-auto`;

  const panelAnimation: any =
    modalLayout === 'modal' ? {
      initial: { scale: 0.96, opacity: 0, y: 10 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.96, opacity: 0, y: 10 },
      transition: { type: 'spring', damping: 28, stiffness: 300 }
    } : modalLayout === 'fullscreen' ? {
      initial: { scale: 1, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1, opacity: 0 },
      transition: { duration: 0.18, ease: 'easeOut' }
    } : {
      initial: { x: '100%', opacity: 1 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 1 },
      transition: { type: 'tween', duration: 0.28, ease: 'easeOut' }
    };
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [showLinkTaskDropdown, setShowLinkTaskDropdown] = useState(false);
  const [showLinkDocDropdown, setShowLinkDocDropdown] = useState(false);
  const [showBlockedByDropdown, setShowBlockedByDropdown] = useState(false);
  const [showBlocksDropdown, setShowBlocksDropdown] = useState(false);
  const [relationshipSearchQuery, setRelationshipSearchQuery] = useState('');
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const isGlobalTrackingThisTask = task.id === globalActiveTaskId;
  const currentTimerActive = isGlobalTrackingThisTask ? true : isTimerActive;
  const currentElapsedSeconds = isGlobalTrackingThisTask ? globalActiveElapsed : elapsedSeconds;
  const currentTimerPaused = isGlobalTrackingThisTask ? globalIsPaused : false;

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

  const handleStopTimer = () => {
    if (isGlobalTrackingThisTask) {
      if (onStopGlobalTimer) onStopGlobalTimer();
    } else {
      stopTimerAndLog();
    }
  };

  const handleStartTimer = () => {
    if (onStartGlobalTimer) {
      onStartGlobalTimer(task.id);
    } else {
      setIsTimerActive(true);
    }
  };

  // Drag and Drop Subtasks Handler
  const handleSubtasksDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(task.subtasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onUpdateTask({ ...task, subtasks: items });
    onAddSyncLog(`Reordered subtasks for "${task.title}"`);
  };

  // Redesign Helper methods
  const handleAiQuery = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiPrompt;
    if (!promptToSend.trim()) return;
    setAiGeneratingResponse(true);
    setAiResponseText('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Về công việc này:\n- Tiêu đề: ${task.title}\n- Mô tả: ${task.description || 'Không có'}\n- Trạng thái: ${task.status}\n- Độ ưu tiên: ${task.priority}\n\nYêu cầu trợ giúp: ${promptToSend}`,
          history: []
        })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setAiResponseText(data.text);
      } else {
        setAiResponseText(data.error || 'Không thể lấy phản hồi từ AI.');
      }
    } catch (err: any) {
      console.error(err);
      setAiResponseText('Đã xảy ra lỗi khi kết nối với AI.');
    } finally {
      setAiGeneratingResponse(false);
    }
  };

  const handleSuggestTags = async () => {
    try {
      const res = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description })
      });
      const data = await res.json();
      if (data.success && data.tags) {
        const mergedTags = Array.from(new Set([...(task.tags || []), ...data.tags]));
        onUpdateTask({ ...task, tags: mergedTags });
        if (triggerToast) triggerToast('success', 'Tags Suggested 🏷', `Added suggested tags: ${data.tags.join(', ')}`);
        onAddSyncLog(`AI suggested tags: ${data.tags.join(', ')}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    // Sync form state with task prop changes
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

  const addDependency = (type: 'blockedBy' | 'blocks', targetTaskId: string) => {
    const currentRels = task.relationships || {};
    const targetTask = allTasks.find(t => t.id === targetTaskId);
    const targetRels = targetTask?.relationships || {};

    if (type === 'blockedBy') {
      const updatedBlockedBy = Array.from(new Set([...(currentRels.blockedBy || []), targetTaskId]));
      onUpdateTask({
        ...task,
        relationships: {
          ...currentRels,
          blockedBy: updatedBlockedBy
        }
      });

      if (targetTask) {
        const updatedBlocks = Array.from(new Set([...(targetRels.blocks || []), task.id]));
        onUpdateTask({
          ...targetTask,
          relationships: {
            ...targetRels,
            blocks: updatedBlocks
          }
        });
      }
      onAddSyncLog(`Added dependency: "${task.title}" is now blocked by "${targetTask?.title || targetTaskId}"`);
    } else {
      const updatedBlocks = Array.from(new Set([...(currentRels.blocks || []), targetTaskId]));
      onUpdateTask({
        ...task,
        relationships: {
          ...currentRels,
          blocks: updatedBlocks
        }
      });

      if (targetTask) {
        const updatedBlockedBy = Array.from(new Set([...(targetRels.blockedBy || []), task.id]));
        onUpdateTask({
          ...targetTask,
          relationships: {
            ...targetRels,
            blockedBy: updatedBlockedBy
          }
        });
      }
      onAddSyncLog(`Added dependency: "${task.title}" now blocks "${targetTask?.title || targetTaskId}"`);
    }
  };

  const removeDependency = (type: 'blockedBy' | 'blocks', targetTaskId: string) => {
    const currentRels = task.relationships || {};
    const targetTask = allTasks.find(t => t.id === targetTaskId);
    const targetRels = targetTask?.relationships || {};

    if (type === 'blockedBy') {
      const updatedBlockedBy = (currentRels.blockedBy || []).filter(id => id !== targetTaskId);
      onUpdateTask({
        ...task,
        relationships: {
          ...currentRels,
          blockedBy: updatedBlockedBy
        }
      });

      if (targetTask) {
        const updatedBlocks = (targetRels.blocks || []).filter(id => id !== task.id);
        onUpdateTask({
          ...targetTask,
          relationships: {
            ...targetRels,
            blocks: updatedBlocks
          }
        });
      }
      onAddSyncLog(`Removed dependency: "${task.title}" is no longer blocked by "${targetTask?.title || targetTaskId}"`);
    } else {
      const updatedBlocks = (currentRels.blocks || []).filter(id => id !== targetTaskId);
      onUpdateTask({
        ...task,
        relationships: {
          ...currentRels,
          blocks: updatedBlocks
        }
      });

      if (targetTask) {
        const updatedBlockedBy = (targetRels.blockedBy || []).filter(id => id !== task.id);
        onUpdateTask({
          ...targetTask,
          relationships: {
            ...targetRels,
            blockedBy: updatedBlockedBy
          }
        });
      }
      onAddSyncLog(`Removed dependency: "${task.title}" no longer blocks "${targetTask?.title || targetTaskId}"`);
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

  const convertChecklistItemToSubtask = (subId: string, title: string) => {
    const updatedSubtasks = task.subtasks.filter(s => s.id !== subId);
    const completed = updatedSubtasks.filter(s => s.completed).length;
    const progress = updatedSubtasks.length > 0 ? Math.round((completed / updatedSubtasks.length) * 100) : 0;
    
    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks,
      progress: Math.min(100, progress)
    });

    const newTaskId = `task-${Date.now()}`;
    const newTask = {
      id: newTaskId,
      title: title,
      description: '',
      status: 'todo',
      priority: 'medium',
      parentId: task.id,
      workspaceId: task.workspaceId,
      spaceId: task.spaceId,
      listId: task.listId,
      assigneeIds: [],
      tags: [],
      subtasks: [],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'current-user'
    };

    useTaskStore.getState().addTask(newTask as any);
    if (triggerToast) {
      triggerToast('success', 'Converted Checklist Item', `Checklist item converted to a subtask.`);
    }
    onAddSyncLog(`Converted checklist item "${title}" into a child task.`);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const comment = {
      id: `c-${Date.now()}`, senderName: 'You',
      senderAvatar: '',
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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-955/25' };
    if (['pdf'].includes(ext || '')) return { color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-955/25' };
    if (['doc', 'docx'].includes(ext || '')) return { color: 'text-blue-505', bg: 'bg-blue-50 dark:bg-blue-955/25' };
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-955/25' };
    if (['zip', 'rar', '7z'].includes(ext || '')) return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-955/25' };
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

  const filteredTimelineItems = useMemo(() => {
    if (timelineFilter === 'comments') {
      return timelineItems.filter(item => item.type === 'comment');
    }
    if (timelineFilter === 'system') {
      return timelineItems.filter(item => item.type === 'activity');
    }
    return timelineItems;
  }, [timelineItems, timelineFilter]);

  const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
  const isTwoColumn = modalLayout === 'modal' || modalLayout === 'fullscreen';

  // ── Sub-component renders to reduce duplication ──
  const renderPropertiesTable = () => {
    const isShown = (fieldKey: string) => !visibleFields || visibleFields.includes(fieldKey);

    return (
      <div className="space-y-4">
        {/* Status */}
        {isShown('status') && (
          <div className="flex items-center min-h-[34px] group/row relative pr-6">
            <span className="w-24 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
              <CircleDot className="w-3.5 h-3.5" /> Status
            </span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <StatusPillSelect value={task.status} onChange={s => { onUpdateTask({ ...task, status: s }); onAddSyncLog(`Status → ${s}`); }} />
              <button type="button"
                onClick={() => {
                  const next = task.status === 'completed' ? 'todo' : 'completed';
                  onUpdateTask({ ...task, status: next as TaskStatus });
                  onAddSyncLog(`Status → ${next}`);
                }}
                className={`p-1 rounded-md border cursor-pointer transition-all ${task.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-955/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 dark:bg-slate-900 dark:border-slate-800'}`}
                title={task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}>
                <Check className="w-3 h-3" />
              </button>
            </div>
            {onToggleFieldVisibility && (
              <button 
                type="button" 
                onClick={() => onToggleFieldVisibility('status')}
                className="absolute right-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-405 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer"
                title="Hide field"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Assignees */}
        {isShown('assignee') && (
          <div className="flex items-center min-h-[34px] group/row relative pr-6">
            <span className="w-24 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
              <UserIcon className="w-3.5 h-3.5" /> Assignees
            </span>
            <div className="relative flex-1 min-w-0">
              <button 
                onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <div className="flex -space-x-1.5 overflow-hidden">
                  {assigneeIds.slice(0, 3).map(id => {
                    const m = members.find(u => u.id === id);
                    if (!m) return null;
                    return <SignedImage key={id} filePath={m.avatar} className="w-4.5 h-4.5 rounded-full border border-white dark:border-slate-955 object-cover shrink-0" alt={m.name} />;
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
                    className="absolute left-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-0.5 animate-in fade-in slide-in-from-top-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">Select Assignees</div>
                    {members.map(m => {
                      const checked = assigneeIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              const ids = assigneeIds;
                              const nextIds = checked ? ids.filter(id => id !== m.id) : [...ids, m.id];
                              onUpdateTask({ ...task, assigneeIds: nextIds, assigneeId: nextIds[0] || undefined });
                            }}
                            className="rounded accent-indigo-650 w-3.5 h-3.5 cursor-pointer" />
                          <SignedImage filePath={m.avatar} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" alt={m.name} />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {onToggleFieldVisibility && (
              <button 
                type="button" 
                onClick={() => onToggleFieldVisibility('assignee')}
                className="absolute right-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-405 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer"
                title="Hide field"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Priority */}
        {isShown('priority') && (
          <div className="flex items-center min-h-[34px] group/row relative pr-6">
            <span className="w-24 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
              <Flag className="w-3.5 h-3.5" /> Priority
            </span>
            <div className="flex-1 min-w-0">
              <PriorityPillSelect value={task.priority} onChange={p => { onUpdateTask({ ...task, priority: p || 'medium' }); onAddSyncLog(`Priority → ${p || 'medium'}`); }} />
            </div>
            {onToggleFieldVisibility && (
              <button 
                type="button" 
                onClick={() => onToggleFieldVisibility('priority')}
                className="absolute right-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-405 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer"
                title="Hide field"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Due Date */}
        {isShown('dueDate') && (
          <div className="flex items-center min-h-[34px] group/row relative pr-6">
            <span className="w-24 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
              <Calendar className="w-3.5 h-3.5" /> Dates
            </span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <PremiumDatePicker 
                startDateValue={task.startDate || ''}
                onStartDateChange={v => onUpdateTask({ ...task, startDate: v || '' })}
                dateValue={task.dueDate || ''}
                onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} 
                label="Start" 
                align="left"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 transition-all ${task.startDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} 
              />
              <span className="text-slate-300 dark:text-slate-700 text-xs select-none">→</span>
              <PremiumDatePicker 
                startDateValue={task.startDate || ''}
                onStartDateChange={v => onUpdateTask({ ...task, startDate: v || '' })}
                dateValue={task.dueDate || ''}
                onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} 
                label="Due" 
                align="left"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 transition-all ${task.dueDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} 
              />
            </div>
            {onToggleFieldVisibility && (
              <button 
                type="button" 
                onClick={() => onToggleFieldVisibility('dueDate')}
                className="absolute right-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-405 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer"
                title="Hide field"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Time Tracking */}
        <div className="flex flex-col justify-center min-h-[34px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
              <Clock className="w-3.5 h-3.5" /> Track time
            </span>
            <div className="flex items-center gap-2">
              {currentTimerActive ? (
                <>
                  <span className={`text-[11px] font-mono font-bold text-rose-500 tabular-nums ${currentTimerPaused ? '' : 'animate-pulse'}`}>
                    {formatTimerTime(currentElapsedSeconds)}
                  </span>
                  {isGlobalTrackingThisTask && (
                    <button
                      type="button"
                      onClick={onTogglePauseGlobalTimer}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50/50 dark:bg-indigo-955/20 text-indigo-655 dark:text-indigo-400 rounded-md text-[10px] font-bold cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-200/30"
                    >
                      {currentTimerPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                  <button type="button" onClick={handleStopTimer}
                    className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-455 rounded-md text-[10px] font-bold cursor-pointer hover:bg-rose-100 transition-colors border border-rose-200/60 dark:border-rose-800/30">
                    <Square className="w-2.5 h-2.5 fill-current" /> Stop
                  </button>
                </>
              ) : (
                <button type="button" onClick={handleStartTimer}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-505 dark:text-slate-400 hover:text-slate-700 p-1 px-2 rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50">
                  <Play className="w-3 h-3 fill-slate-400 text-slate-400 shrink-0" /> Start
                </button>
              )}
              
              {/* Manual Logger */}
              <div className="relative">
                {showLogTimeModal ? (
                  <div className="absolute right-0 bottom-full mb-2.5 z-40 flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 shadow-md">
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.1}
                      placeholder="hrs" 
                      value={logTimeValue}
                      onChange={e => setLogTimeValue(e.target.value)}
                      className="w-12 text-xs text-center border border-slate-200 dark:border-slate-700 rounded bg-transparent outline-none py-0.5 font-medium text-slate-750 dark:text-slate-205"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const hrs = parseFloat(logTimeValue);
                        if (hrs > 0) {
                          const nextLogged = parseFloat(((task.hoursLogged || 0) + hrs).toFixed(2));
                          onUpdateTask({ ...task, hoursLogged: nextLogged });
                          onAddSyncLog(`Logged ${hrs} hours manually`);
                          if (triggerToast) triggerToast('success', 'Time Logged ⏱', `Added ${hrs}h manually.`);
                        }
                        setLogTimeValue('');
                        setShowLogTimeModal(false);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-650 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Log
                    </button>
                    <button type="button" onClick={() => setShowLogTimeModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setShowLogTimeModal(true)}
                    className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer ml-1"
                  >
                    + Log
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>{(task.hoursLogged || 0)}h logged</span>
            {task.hoursEstimate ? <span>{task.hoursEstimate}h estimate</span> : null}
          </div>
          {task.hoursEstimate && (task.hoursLogged || 0) > 0 ? (
            <div className="flex items-center gap-1.5 w-full mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300" 
                  style={{ width: `${Math.min(100, ((task.hoursLogged || 0) / task.hoursEstimate) * 100)}%` }} 
                />
              </div>
              <span className="text-[9px] text-slate-400 font-bold tabular-nums">
                {Math.round(((task.hoursLogged || 0) / task.hoursEstimate) * 100)}%
              </span>
            </div>
          ) : null}
        </div>

        {/* Time Estimate */}
        {isShown('progress') && (
          <div className="flex items-center min-h-[34px] group/row relative pr-6">
            <span className="w-24 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none">
              <Timer className="w-3.5 h-3.5" /> Estimate
            </span>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input type="number" min={0} step={0.5} placeholder="—"
                value={task.hoursEstimate || ''}
                onChange={e => onUpdateTask({ ...task, hoursEstimate: parseFloat(e.target.value) || undefined })}
                className="text-xs font-medium text-slate-700 dark:text-slate-305 bg-transparent border border-slate-200/60 dark:border-slate-800 rounded-lg outline-none px-2 py-1 w-16 placeholder-slate-350 focus:border-indigo-400 transition-colors" />
              {task.hoursEstimate ? <span className="text-[10px] text-slate-400 font-medium">hrs</span> : null}
            </div>
            {onToggleFieldVisibility && (
              <button 
                type="button" 
                onClick={() => onToggleFieldVisibility('progress')}
                className="absolute right-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-450 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer"
                title="Hide field"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {isShown('tags') && (
          <div className="flex items-start min-h-[34px] pt-1 group/row relative pr-6">
            <span className="w-24 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2 shrink-0 select-none mt-0.5">
              <Tag className="w-3.5 h-3.5" /> Tags
            </span>
            <div className="flex items-center gap-1.5 flex-wrap relative flex-1 min-w-0">
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
                  className="w-5 h-5 rounded-md border border-dashed border-slate-250 hover:border-slate-455 dark:border-slate-700 dark:hover:border-slate-600 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-55 dark:hover:bg-slate-900">
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
                          className="w-full text-left px-2 py-1 text-[11px] font-medium text-slate-605 dark:text-slate-305 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
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
                  className="text-xs font-medium text-slate-405 hover:text-slate-600 transition-colors cursor-pointer">Empty</button>
              )}
            </div>
            {onToggleFieldVisibility && (
              <button 
                type="button" 
                onClick={() => onToggleFieldVisibility('tags')}
                className="absolute right-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-405 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer"
                title="Hide field"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCustomFieldsAccordion = () => {
    const isShown = (fieldKey: string) => !visibleFields || visibleFields.includes(fieldKey);

    return (
      <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 shadow-3xs relative z-10">
        <button type="button" onClick={() => setFieldsExpanded(!fieldsExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/30 text-xs font-bold text-slate-700 dark:text-slate-202 border-b border-slate-100 dark:border-slate-800/80 cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${fieldsExpanded ? '' : '-rotate-90'}`} />
            <span>Custom Fields</span>
          </div>
          <span className="text-[10px] text-slate-405 font-medium">{Object.keys(task.custom_fields || {}).length + 4} fields</span>
        </button>

        {fieldsExpanded && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Objective */}
              {isShown('Objective') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Objective</label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Objective')}
                        className="text-[9px] text-slate-405 dark:text-slate-505 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title="Hide field"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <input type="text" value={String(task.custom_fields?.Objective || '')} 
                    onChange={e => { const updated = { ...(task.custom_fields || {}), Objective: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                    className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105 outline-none focus:border-indigo-500 transition-colors" />
                </div>
              )}

              {/* Owner */}
              {isShown('Owner') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Owner</label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Owner')}
                        className="text-[9px] text-slate-405 dark:text-slate-505 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title="Hide field"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <input type="text" value={String(task.custom_fields?.Owner || '')} 
                    onChange={e => { const updated = { ...(task.custom_fields || {}), Owner: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                    className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105 outline-none focus:border-indigo-500 transition-colors" />
                </div>
              )}

              {/* Cost */}
              {isShown('Cost') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cost</label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Cost')}
                        className="text-[9px] text-slate-405 dark:text-slate-550 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title="Hide field"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <input type="text" value={String(task.custom_fields?.Cost || '')} 
                    onChange={e => { const updated = { ...(task.custom_fields || {}), Cost: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                    className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105 outline-none focus:border-indigo-500 transition-colors" />
                </div>
              )}

              {/* Recurrence */}
              {isShown('Recurrence') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-pink-500 animate-spin-slow" /> Recurrence
                    </label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Recurrence')}
                        className="text-[9px] text-slate-405 dark:text-slate-550 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title="Hide field"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={task.recurrence?.frequency || 'none'}
                      onChange={e => {
                        const freq = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly';
                        onUpdateTask({ ...task, recurrence: { frequency: freq, interval: task.recurrence?.interval || 1 } });
                      }}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 outline-none text-slate-700 dark:text-slate-305 font-medium cursor-pointer">
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    {task.recurrence?.frequency && task.recurrence.frequency !== 'none' && (
                      <input type="number" min={1} value={task.recurrence.interval}
                        onChange={e => { const val = parseInt(e.target.value) || 1; onUpdateTask({ ...task, recurrence: { ...task.recurrence!, interval: val } }); }}
                        className="w-12 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1 text-center outline-none font-medium text-slate-700 dark:text-slate-305" />
                    )}
                  </div>
                </div>
              )}

              {/* Space */}
              {isShown('space') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">📁 Space</label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('space')}
                        className="text-[9px] text-slate-405 dark:text-slate-550 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title="Hide field"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <SpacePillSelect value={task.workspaceId} workspaces={workspaces}
                    onChange={wsId => onUpdateTask({ ...task, workspaceId: wsId || undefined })} />
                </div>
              )}

              {/* Start Date */}
              {(isShown('startDate') || isShown('dueDate')) && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">📅 Start Date</label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility(isShown('startDate') ? 'startDate' : 'dueDate')}
                        className="text-[9px] text-slate-405 dark:text-slate-550 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title="Hide field"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <PremiumDatePicker 
                    startDateValue={task.startDate || ''}
                    onStartDateChange={v => onUpdateTask({ ...task, startDate: v || '' })}
                    dateValue={task.dueDate || ''}
                    onChange={v => onUpdateTask({ ...task, dueDate: v || '' })}
                    label="Start"
                  />
                </div>
              )}
            </div>

            {/* Dynamic custom fields */}
            {Object.keys(task.custom_fields || {}).filter(k => !['Objective', 'Owner', 'Cost'].includes(k)).filter(k => isShown(k)).length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Other Custom Fields</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(task.custom_fields || {})
                    .filter(([k]) => !['Objective', 'Owner', 'Cost'].includes(k))
                    .filter(([k]) => isShown(k))
                    .map(([key, val]) => (
                      <div key={key} className="space-y-1 relative group/field">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-medium text-slate-555 dark:text-slate-400 capitalize">{key}</label>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover/field:opacity-100 transition-opacity">
                            {onToggleFieldVisibility && (
                              <button 
                                type="button"
                                onClick={() => onToggleFieldVisibility(key)}
                                className="text-[9px] text-slate-405 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                title="Hide field"
                              >
                                Hide
                              </button>
                            )}
                            <button onClick={() => { const { [key]: _, ...rest } = task.custom_fields || {}; onUpdateTask({ ...task, custom_fields: rest }); }}
                              className="text-[9px] text-rose-500 hover:underline cursor-pointer">Delete</button>
                          </div>
                        </div>
                        <input type="text" value={String(val || '')} 
                          onChange={e => { const updated = { ...(task.custom_fields || {}), [key]: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-105 outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Inline Add Custom Field Creator */}
            {showAddCustomField ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-2 mt-2 shadow-2xs">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-550">New Custom Field</div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Field Name" 
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-850 rounded bg-white dark:bg-slate-900 text-slate-755 dark:text-slate-200 outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Field Value" 
                    value={newFieldValue}
                    onChange={e => setNewFieldValue(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-855 rounded bg-white dark:bg-slate-900 text-slate-755 dark:text-slate-200 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddCustomField(false);
                      setNewFieldName('');
                      setNewFieldValue('');
                    }} 
                    className="px-2 py-1 rounded text-[10px] text-slate-455 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!newFieldName.trim()) return;
                      const updated = { ...(task.custom_fields || {}), [newFieldName.trim()]: newFieldValue.trim() };
                      onUpdateTask({ ...task, custom_fields: updated });
                      if (triggerToast) triggerToast('success', 'Field Added', `Added custom field "${newFieldName.trim()}"`);
                      onAddSyncLog(`Added custom field "${newFieldName.trim()}"`);
                      setNewFieldName('');
                      setNewFieldValue('');
                      setShowAddCustomField(false);
                    }} 
                    className="px-2.5 py-1 rounded bg-indigo-650 text-white text-[10px] font-black cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <button type="button" onClick={() => setShowAddCustomField(true)}
                  className="text-[10px] font-bold text-indigo-550 hover:underline cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add new custom field
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTimelineFeed = () => {
    return (
      <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-left select-none relative z-10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-[11px] font-bold text-slate-850 dark:text-slate-105 flex items-center gap-1.5 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-indigo-500" />
            Activity Log & Comments
          </span>
          {/* Filters */}
          <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-900/60 p-0.5 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200/50 dark:border-slate-800/60">
            {(['all', 'comments', 'system'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setTimelineFilter(f)}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer capitalize ${
                  timelineFilter === f 
                    ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-3xs' 
                    : 'hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {f === 'system' ? 'logs' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scroll Box */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1 py-1">
          {filteredTimelineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center select-none italic text-slate-400 text-xs">
              No activity or comments matching filter
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-4">
                {filteredTimelineItems.map((item, idx) => {
                  if (item.type === 'activity') {
                    const actColor = getActivityColor(item.content);
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3.5 relative">
                        <div className={`w-[26px] h-[26px] rounded-full ${actColor.dot} flex items-center justify-center shrink-0 z-10 ring-4 ring-white dark:ring-slate-900`}>
                          <History className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5 text-left">
                          <div className="text-[12px] text-slate-650 dark:text-slate-305">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100">{item.userName}</span>
                            <span className="ml-1 text-slate-555 dark:text-slate-400">{item.content}</span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">{item.timestamp}</div>
                        </div>
                      </motion.div>
                    );
                  } else {
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3.5 relative">
                        <div className="relative shrink-0 z-10 ring-4 ring-white dark:ring-slate-900">
                          <SignedImage filePath={item.avatar} className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800 object-cover" alt={item.userName} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5 text-left">
                          <div className="flex items-center gap-2 mb-1 text-[11.5px]">
                            <span className="font-extrabold text-slate-850 dark:text-slate-100">{item.userName}</span>
                            <span className="text-[9.5px] text-slate-400 font-medium">{item.timestamp}</span>
                          </div>
                          <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 text-[12px] text-slate-655 dark:text-slate-300 leading-relaxed font-semibold shadow-3xs">
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
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-400/10 transition-all">
          <input value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
            placeholder="Write a comment..."
            className="flex-1 text-[12.5px] font-medium outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400" />
          <button onClick={addComment} disabled={!commentText.trim()}
            className="p-1.5 rounded-lg bg-indigo-650 text-white cursor-pointer hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderAiAssistantPanel = () => {
    return (
      <div className="p-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/25 via-purple-500/15 to-pink-500/25 relative z-10 shadow-3xs">
        <div className="px-4 py-3 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm rounded-[15px] space-y-3 shadow-3xs select-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Bot className="w-4.5 h-4.5 text-indigo-505 animate-pulse shrink-0" />
            <span className="font-extrabold bg-gradient-to-r from-indigo-600 to-violet-655 dark:from-indigo-400 dark:to-violet-405 bg-clip-text text-transparent">Apexa AI Task Assistant</span>
            <div className="ml-auto">
              <button 
                type="button" 
                onClick={() => onAiSummary(task)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer font-bold text-[10px] shadow-3xs"
              >
                <Sparkles className="w-3 h-3 text-indigo-205" />
                <span>{isSummarizing ? 'Analyzing...' : 'Executive Summary'}</span>
              </button>
            </div>
          </div>

          {/* Interactive prompt input */}
          <div className="flex items-center gap-2 bg-slate-55 dark:bg-slate-955/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-400/10 transition-all">
            <input 
              type="text" 
              placeholder="Ask AI to improve details, generate checklist, suggest labels..." 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAiQuery(); }}
              className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-755 dark:text-slate-200 placeholder-slate-400"
            />
            <button 
              type="button"
              onClick={() => handleAiQuery()}
              disabled={aiGeneratingResponse || !aiPrompt.trim()}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-40 transition-colors shrink-0 shadow-sm"
            >
              {aiGeneratingResponse ? 'Asking...' : 'Ask'}
            </button>
          </div>

          {/* AI Shortcut Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button 
              type="button" 
              onClick={() => onAiSubtasks(task)}
              disabled={aiGenerating}
              className="px-2 py-1 rounded-md text-[9px] font-bold bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 text-slate-555 dark:text-slate-300 hover:border-indigo-455 hover:text-indigo-505 transition-colors cursor-pointer"
            >
              ✨ suggest checklist
            </button>
            <button 
              type="button" 
              onClick={handleSuggestTags}
              className="px-2 py-1 rounded-md text-[9px] font-bold bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 text-slate-555 dark:text-slate-300 hover:border-indigo-455 hover:text-indigo-505 transition-colors cursor-pointer"
            >
              🏷 suggest tags
            </button>
            <button 
              type="button" 
              onClick={() => handleAiQuery("Cải thiện mô tả công việc này để rõ ràng và chi tiết hơn")}
              className="px-2 py-1 rounded-md text-[9px] font-bold bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-750 text-slate-555 dark:text-slate-300 hover:border-indigo-455 hover:text-indigo-505 transition-colors cursor-pointer"
            >
              📝 improve description
            </button>
          </div>

          {/* AI Response Display */}
          {(aiSummary || aiResponseText) && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-955/10 border-l-[3px] border-l-indigo-500 border border-indigo-150/40 dark:border-indigo-900/20 space-y-1.5 text-left shadow-3xs">
              <div className="flex items-center justify-between text-indigo-650 dark:text-indigo-400 font-extrabold text-[9px] uppercase tracking-wider">
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 animate-pulse" /> AI Assistant Output</span>
                {aiResponseText && (
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResponseText);
                      if (triggerToast) triggerToast('success', 'Copied', 'AI response copied to clipboard.');
                    }}
                    className="text-[8px] hover:underline"
                  >
                    Copy
                  </button>
                )}
              </div>
              <p className="text-[12px] text-slate-655 dark:text-slate-300 leading-relaxed font-semibold">
                {aiResponseText || aiSummary}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className={overlayClass} 
        onClick={onClose}
      >
        <motion.div 
          {...panelAnimation}
          onClick={e => e.stopPropagation()}
          className={`${panelClass} overflow-hidden`}
        >
          {/* Ambient Glowing Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
            <div className="liquid-blob blob-1 animate-liquid-1 opacity-[0.05] dark:opacity-[0.11]" />
            <div className="liquid-blob blob-2 animate-liquid-2 opacity-[0.03] dark:opacity-[0.07]" />
            <div className="liquid-blob blob-3 animate-orbit-1 opacity-[0.03] dark:opacity-[0.07]" />
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── LEFT PANEL: Details & Properties ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
            
            {/* ── Header Bar ── */}
            <div className="shrink-0 px-5 py-3 border-b border-slate-100 dark:border-slate-805/80 flex items-center justify-between bg-slate-55 dark:bg-slate-900/30 select-none">
              
              {/* Left: Path Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-455">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] shrink-0">📁</span>
                  <span className="truncate max-w-[80px] md:max-w-[120px]">{spaceName}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <div className="flex items-center gap-1 text-slate-755 dark:text-slate-305">
                  <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-extrabold truncate max-w-[120px] md:max-w-[200px]">{listName}</span>
                </div>
              </div>

              {/* Right: Actions Row */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-505 hidden sm:inline-block font-semibold pr-1 select-none">
                  Created {new Date(task.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </span>

                {/* Share Button */}
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    if (triggerToast) triggerToast('success', 'Link Copied', 'Task link copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-3xs mr-1"
                >
                  <Users className="w-3.5 h-3.5 text-slate-455 dark:text-slate-400" />
                  <span>Share</span>
                </button>

                {/* More Options Menu */}
                <div className="relative flex items-center">
                  <button 
                    onClick={() => setConfirmDelete(!confirmDelete)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {confirmDelete && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setConfirmDelete(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1 text-left">
                        <button
                          onClick={() => {
                            onDeleteTask(task.id);
                            onClose();
                          }}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Task</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                {/* Star Pin Button */}
                <button 
                  onClick={() => {
                    const pinned = !task.isPinned;
                    onUpdateTask({ ...task, isPinned: pinned });
                    setIsStarred(pinned);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                    task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-955/25 hover:bg-amber-100 dark:hover:bg-amber-950/40' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                  title={task.isPinned ? "Unpin task" : "Pin task"}
                >
                  <Star className={`w-3.5 h-3.5 ${task.isPinned ? 'fill-amber-400' : ''}`} />
                </button>

                {/* Layout Switched Dropdown Button */}
                <div className="relative flex items-center">
                  <button 
                    onClick={() => setLayoutMenuOpen(!layoutMenuOpen)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 ${layoutMenuOpen ? 'bg-indigo-50 dark:bg-indigo-955/20 text-indigo-550' : ''}`}
                    title="Switch layout"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>

                  <AnimatePresence>
                    {layoutMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setLayoutMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 z-[200] w-[310px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-4 text-left font-sans select-none"
                        >
                          <h4 className="text-[11px] font-black text-slate-405 uppercase tracking-wider mb-2.5">Switch layout</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Option 1: Modal */}
                            <button
                              type="button"
                              onClick={() => {
                                handleLayoutChange('modal');
                                setLayoutMenuOpen(false);
                              }}
                              className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                modalLayout === 'modal' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-450' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-505'
                              }`}
                            >
                              <div className="w-12 h-8 rounded border border-current flex items-center justify-center mb-1.5 bg-white dark:bg-slate-955/40">
                                <div className="w-8 h-5 rounded-xs border border-current bg-current/10" />
                              </div>
                              <span className="text-[10px] font-bold">Modal</span>
                            </button>

                            {/* Option 2: Full screen */}
                            <button
                              type="button"
                              onClick={() => {
                                handleLayoutChange('fullscreen');
                                setLayoutMenuOpen(false);
                              }}
                              className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                modalLayout === 'fullscreen' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-450' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-505'
                              }`}
                            >
                              <div className="w-12 h-8 rounded border border-current flex items-stretch justify-stretch p-0.5 mb-1.5 bg-white dark:bg-slate-955/40">
                                <div className="flex-1 rounded-xs border border-current bg-current/10" />
                              </div>
                              <span className="text-[10px] font-bold">Full screen</span>
                            </button>

                            {/* Option 3: Sidebar */}
                            <button
                              type="button"
                              onClick={() => {
                                handleLayoutChange('sidebar');
                                setLayoutMenuOpen(false);
                              }}
                              className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                modalLayout === 'sidebar' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-450' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-505'
                              }`}
                            >
                              <div className="w-12 h-8 rounded border border-current flex items-stretch justify-end p-0.5 mb-1.5 bg-white dark:bg-slate-955/40">
                                <div className="w-4 rounded-xs border border-current bg-current/10" />
                              </div>
                              <span className="text-[10px] font-bold">Sidebar</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {modalLayout === 'sidebar' && (
                  <button 
                    onClick={toggleSidebarExpand}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-105 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
                    title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                  >
                    {isSidebarExpanded ? (
                      <ChevronsRight className="w-4 h-4" />
                    ) : (
                      <ChevronsLeft className="w-4 h-4" />
                    )}
                  </button>
                )}

                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-105 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Content Body Render ── */}
            {isTwoColumn ? (
              // ── Two Column Layout (Linear style) ──
              <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-y-auto lg:overflow-hidden">
                
                {/* Left: Main details (Scrollable) */}
                <div className="flex-1 lg:overflow-y-auto custom-scrollbar p-5 md:p-6 lg:px-7 space-y-6">
                  
                  {/* Blocked Warning Banner */}
                  {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-955/20 border border-amber-250/55 dark:border-amber-900/30 rounded-2xl text-left select-none shadow-3xs relative z-10">
                      <Hourglass className="w-4.5 h-4.5 text-amber-550 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <div className="text-xs font-black text-amber-800 dark:text-amber-305">This task is waiting on other tasks</div>
                        <div className="text-[11.5px] font-semibold text-amber-705 dark:text-amber-400/80 leading-relaxed">
                          Before starting, you must complete: {' '}
                          {task.relationships.blockedBy.map((id, index) => {
                            const t = allTasks.find(item => item.id === id);
                            return (
                              <span key={id} className="font-extrabold text-amber-800 dark:text-amber-300">
                                {index > 0 ? ', ' : ''}
                                "{t?.title || id}"
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Assistant panel */}
                  {renderAiAssistantPanel()}

                  {/* Title */}
                  <div className="text-left flex items-start gap-3">
                    {/* Complete toggle circle button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                        onUpdateTask({ ...task, status: newStatus as TaskStatus });
                        onAddSyncLog(`Toggled completion of task "${task.title}" to: ${newStatus}`);
                        if (typeof window !== 'undefined') {
                          (window as any).playSystemSound?.('toggle');
                        }
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-110 mt-1 ${
                        task.status === 'completed'
                          ? 'border-emerald-500 bg-emerald-500 text-white animate-pulse-once'
                          : 'border-slate-300 dark:border-slate-655 bg-transparent text-transparent hover:border-emerald-500 hover:text-emerald-505'
                      }`}
                    >
                      <Check className="w-4 h-4 text-white dark:text-slate-100" strokeWidth={3} />
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingTitle ? (
                        <input autoFocus value={titleValue} onChange={e => setTitleValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                          onBlur={saveTitle}
                          className="w-full text-2xl font-black text-slate-900 dark:text-slate-50 bg-transparent border-b-2 border-indigo-500 outline-none py-1 leading-tight" />
                      ) : (
                        <h2 onClick={() => setEditingTitle(true)}
                          className="text-2xl font-black text-slate-900 dark:text-slate-100 cursor-text hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors group flex items-start gap-2 leading-tight">
                          <span className={`${task.status === 'completed' ? 'line-through text-slate-405 dark:text-slate-500' : ''}`}>{task.title}</span>
                          <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 text-slate-405 transition-opacity mt-2 shrink-0" />
                        </h2>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="flex flex-wrap gap-2 py-1.5 border-y border-slate-150 dark:border-slate-800/60">
                    <button onClick={onOpenFieldsPanel} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-300 transition-all cursor-pointer select-none">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-505" /> Add fields
                    </button>
                    <button onClick={() => { const title = prompt("Enter subtask title:"); if (title?.trim()) { const newSub = { id: `sub-${Date.now()}`, title: title.trim(), completed: false }; onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] }); } }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-300 transition-all cursor-pointer select-none">
                      <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add subtask
                    </button>
                    <button onClick={() => { const el = document.getElementById('relationships-section'); el?.scrollIntoView({ behavior: 'smooth' }); }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-300 transition-all cursor-pointer select-none">
                      <Tag className="w-3.5 h-3.5 text-sky-505" /> Relate items
                    </button>
                    <button onClick={() => { const fileInput = document.getElementById('task-file-upload'); fileInput?.click(); }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-300 transition-all cursor-pointer select-none">
                      <Paperclip className="w-3.5 h-3.5 text-amber-500" /> Attach file
                    </button>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
                      <FileText className="w-3.5 h-3.5" /> Description
                    </label>
                    <textarea value={descValue} onChange={e => setDescValue(e.target.value)} onBlur={saveDesc}
                      placeholder="Add description, or write with AI..."
                      className="w-full min-h-[120px] p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-[12.5px] text-slate-700 dark:text-slate-200 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all leading-relaxed placeholder-slate-350 font-medium" />
                  </div>

                  {/* Subtasks */}
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 select-none">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-955/25 flex items-center justify-center">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Subtasks</label>
                        <span className="text-[10px] font-bold text-slate-400">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                      </div>
                      <button onClick={() => onAiSubtasks(task)} disabled={aiGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer disabled:opacity-50 border border-indigo-100/60 dark:border-indigo-900/30 transition-colors">
                        <Bot className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                        <span>{aiGenerating ? 'Generating...' : 'AI Suggest'}</span>
                      </button>
                    </div>

                    {task.subtasks.length > 0 && (
                      <div className="flex items-center gap-2.5 px-1 select-none">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                            initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                        </div>
                        <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{task.progress}%</span>
                      </div>
                    )}

                    {/* Draggable Subtask List */}
                    <DragDropContext onDragEnd={handleSubtasksDragEnd}>
                      <Droppable droppableId="subtasks-list-left">
                        {(provided) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className="space-y-1.5"
                          >
                            {task.subtasks.map((sub, index) => (
                              <Draggable key={sub.id} draggableId={sub.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="flex items-center gap-2 group py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl hover:border-slate-350 dark:hover:border-slate-700 transition-all shadow-3xs"
                                  >
                                    <div {...provided.dragHandleProps} className="px-0.5">
                                      <GripVertical className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600 shrink-0 cursor-grab active:cursor-grabbing" />
                                    </div>
                                    
                                    <button onClick={() => toggleSubtask(sub.id)}
                                      className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${sub.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-655 hover:border-indigo-400'}`}>
                                      {sub.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </button>
                                    
                                    {editingSubtaskId === sub.id ? (
                                      <input autoFocus value={editingSubtaskValue}
                                        onChange={e => setEditingSubtaskValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') editSubtask(sub.id, editingSubtaskValue); if (e.key === 'Escape') setEditingSubtaskId(null); }}
                                        onBlur={() => editSubtask(sub.id, editingSubtaskValue)}
                                        className="flex-1 text-[12.5px] font-semibold bg-transparent border-b-2 border-indigo-405 outline-none py-0.5 text-slate-855 dark:text-slate-200" />
                                    ) : (
                                      <span onDoubleClick={() => { setEditingSubtaskId(sub.id); setEditingSubtaskValue(sub.title); }}
                                        className={`flex-1 text-[12.5px] cursor-text text-left transition-all ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 font-bold'}`}>
                                        {sub.title}
                                      </span>
                                    )}

                                    <div className="w-4.5 h-4.5 rounded-full bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[8px] font-black select-none shrink-0 border border-slate-200/50 dark:border-slate-700/50" title="Assignee">
                                      {members.find(m => m.id === task.assigneeId)?.name.substring(0, 1) || 'A'}
                                    </div>

                                    <span className="text-[8px] bg-slate-105 dark:bg-slate-805 text-slate-455 px-1 py-0.5 rounded flex items-center gap-0.5 select-none shrink-0 font-bold">
                                      <Calendar className="w-2.5 h-2.5" />
                                      <span>Today</span>
                                    </span>

                                    <button 
                                      onClick={() => convertChecklistItemToSubtask(sub.id, sub.title)}
                                      className="px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-55 dark:bg-indigo-955/40 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                      title="Convert checklist item to a subtask"
                                    >
                                      Convert
                                    </button>

                                    <button onClick={() => deleteSubtask(sub.id)}
                                      className="p-1 text-slate-355 hover:text-rose-500 hover:bg-rose-55 dark:hover:bg-rose-955/20 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <div className="flex items-center gap-2.5 px-3">
                      <div className="w-[18px] h-[18px] rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                        <Plus className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                      <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                        placeholder="Add new subtask..."
                        className="flex-1 text-[12.5px] font-medium text-slate-700 dark:text-slate-200 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-1.5 placeholder-slate-400 transition-colors" />
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between select-none">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-955/25 flex items-center justify-center">
                          <Paperclip className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Attachments</label>
                      </div>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-404 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer shadow-3xs">
                        <Upload className="w-3 h-3" /> Upload file
                        <input id="task-file-upload" type="file" onChange={e => onAttachmentUpload(task, e)} className="hidden" />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {(task.attachments || []).map(att => {
                        const iconStyle = getFileIcon(att.name);
                        return (
                          <div key={att.id} className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 px-3 py-2.5 rounded-xl hover:border-slate-250 dark:hover:border-slate-700 transition-colors group shadow-3xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg ${iconStyle.bg} flex items-center justify-center shrink-0`}>
                                <FileText className={`w-4 h-4 ${iconStyle.color}`} />
                              </div>
                              <div className="min-w-0 text-left">
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-205 truncate max-w-[110px]">{att.name}</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">{(att.size / 1024).toFixed(1)} KB</div>
                              </div>
                            </div>
                            <button onClick={() => onAttachmentDelete(task, att)}
                              className="p-1 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-450 hover:text-rose-505 cursor-pointer transition-colors">
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

                  {/* Relationships & References */}
                  <div id="relationships-section" className="space-y-4 p-4 bg-slate-50/30 dark:bg-slate-900/20 rounded-2xl border border-slate-150 dark:border-slate-800/60 text-left select-none shadow-3xs">
                    <div className="flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-955/25 flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-sky-505" />
                      </div>
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Relationships & References</label>
                    </div>

                    {/* Linked Tasks */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-455 dark:text-slate-505 uppercase tracking-wider">Linked Tasks</span>
                        <div className="relative">
                          <button onClick={() => { setShowLinkTaskDropdown(!showLinkTaskDropdown); setShowLinkDocDropdown(false); }}
                            className="px-2 py-0.5 rounded border border-dashed border-slate-355 dark:border-slate-800 text-[10px] text-slate-505 hover:border-sky-500 hover:text-sky-505 cursor-pointer font-bold transition-colors">
                            + Add link
                          </button>
                          {showLinkTaskDropdown && (
                            <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                              <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                                onChange={e => setRelationshipSearchQuery(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-855 dark:text-slate-200 bg-white dark:bg-slate-800" />
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
                                    className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
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
                            <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-3xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                  {tStatusMeta?.label || t.status}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                              </div>
                              <button onClick={() => {
                                const list = (task.relationships?.tasks || []).filter(id => id !== taskId);
                                onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                              }} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                            </div>
                          );
                        })}
                        {(task.relationships?.tasks || []).length === 0 && (
                          <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No linked tasks</p>
                        )}
                      </div>
                    </div>

                    {/* Linked Docs */}
                    <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-455 dark:text-slate-505 uppercase tracking-wider">Linked Documents</span>
                        <div className="relative">
                          <button onClick={() => { setShowLinkDocDropdown(!showLinkDocDropdown); setShowLinkTaskDropdown(false); }}
                            className="px-2 py-0.5 rounded border border-dashed border-slate-350 dark:border-slate-800 text-[10px] text-slate-505 hover:border-sky-505 hover:text-sky-505 cursor-pointer font-bold transition-colors">
                            + Add link
                          </button>
                          {showLinkDocDropdown && (
                            <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                              <input type="text" placeholder="Search docs..." value={relationshipSearchQuery}
                                onChange={e => setRelationshipSearchQuery(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-850 dark:text-slate-205 bg-white dark:bg-slate-800" />
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
                                    className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
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
                            <div key={docId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-3xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-5.5 h-5.5 rounded bg-sky-50 dark:bg-sky-955/25 flex items-center justify-center shrink-0">
                                  <FileText className="w-3.5 h-3.5 text-sky-505" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{d ? d.title : docId}</span>
                              </div>
                              <button onClick={() => {
                                const list = (task.relationships?.docs || []).filter(id => id !== docId);
                                onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                              }} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                            </div>
                          );
                        })}
                        {(task.relationships?.docs || []).length === 0 && (
                          <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No linked documents</p>
                        )}
                      </div>
                    </div>

                    {/* Dependencies: Blocked By */}
                    <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-slate-455 dark:text-slate-550 uppercase tracking-wider">Blocked By (Waiting On)</span>
                          <span className="text-[8px] bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-bold">Dependency</span>
                        </div>
                        <div className="relative">
                          <button onClick={() => { setShowBlockedByDropdown(!showBlockedByDropdown); setShowBlocksDropdown(false); setShowLinkTaskDropdown(false); setShowLinkDocDropdown(false); }}
                            className="px-2 py-0.5 rounded border border-dashed border-slate-355 dark:border-slate-800 text-[10px] text-slate-550 hover:border-amber-500 hover:text-amber-505 cursor-pointer font-bold transition-colors">
                            + Add task
                          </button>
                          {showBlockedByDropdown && (
                            <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                              <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                                onChange={e => setRelationshipSearchQuery(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-855 dark:text-slate-200 bg-white dark:bg-slate-800" />
                              {allTasks
                                .filter(t => t.id !== task.id && !task.relationships?.blockedBy?.includes(t.id) && !task.relationships?.blocks?.includes(t.id))
                                .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                                .map(t => (
                                  <button key={t.id}
                                    onClick={() => {
                                      addDependency('blockedBy', t.id);
                                      setShowBlockedByDropdown(false); setRelationshipSearchQuery('');
                                    }}
                                    className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
                                    {t.title}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {(task.relationships?.blockedBy || []).map(taskId => {
                          const t = allTasks.find(item => item.id === taskId);
                          if (!t) return null;
                          const tStatusMeta = STATUS_META[t.status];
                          return (
                            <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-amber-200/50 dark:border-amber-900/30 px-3 py-2 rounded-xl hover:border-amber-305 dark:hover:border-amber-800/80 transition-colors shadow-3xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                  {tStatusMeta?.label || t.status}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                              </div>
                              <button onClick={() => removeDependency('blockedBy', taskId)} className="text-slate-400 hover:text-rose-505 text-xs p-1 cursor-pointer">✕</button>
                            </div>
                          );
                        })}
                        {(task.relationships?.blockedBy || []).length === 0 && (
                          <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No waiting-on dependencies</p>
                        )}
                      </div>
                    </div>

                    {/* Dependencies: Blocks */}
                    <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-slate-455 dark:text-slate-550 uppercase tracking-wider">Blocks (Blocking)</span>
                          <span className="text-[8px] bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 px-1 py-0.5 rounded font-bold">Blocking</span>
                        </div>
                        <div className="relative">
                          <button onClick={() => { setShowBlocksDropdown(!showBlocksDropdown); setShowBlockedByDropdown(false); setShowLinkTaskDropdown(false); setShowLinkDocDropdown(false); }}
                            className="px-2 py-0.5 rounded border border-dashed border-slate-355 dark:border-slate-800 text-[10px] text-slate-550 hover:border-rose-500 hover:text-rose-505 cursor-pointer font-bold transition-colors">
                            + Add task
                          </button>
                          {showBlocksDropdown && (
                            <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                              <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                                onChange={e => setRelationshipSearchQuery(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-855 dark:text-slate-200 bg-white dark:bg-slate-800" />
                              {allTasks
                                .filter(t => t.id !== task.id && !task.relationships?.blocks?.includes(t.id) && !task.relationships?.blockedBy?.includes(t.id))
                                .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                                .map(t => (
                                  <button key={t.id}
                                    onClick={() => {
                                      addDependency('blocks', t.id);
                                      setShowBlocksDropdown(false); setRelationshipSearchQuery('');
                                    }}
                                    className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
                                    {t.title}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {(task.relationships?.blocks || []).map(taskId => {
                          const t = allTasks.find(item => item.id === taskId);
                          if (!t) return null;
                          const tStatusMeta = STATUS_META[t.status];
                          return (
                            <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-rose-200/50 dark:border-rose-900/30 px-3 py-2 rounded-xl hover:border-rose-305 dark:hover:border-rose-800/80 transition-colors shadow-3xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                  {tStatusMeta?.label || t.status}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                              </div>
                              <button onClick={() => removeDependency('blocks', taskId)} className="text-slate-400 hover:text-rose-505 text-xs p-1 cursor-pointer">✕</button>
                            </div>
                          );
                        })}
                        {(task.relationships?.blocks || []).length === 0 && (
                          <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No blocking dependencies</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chronological Timeline feed */}
                  {renderTimelineFeed()}
                </div>

                {/* Right: Sidebar properties panel (Scrollable) */}
                <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 lg:overflow-y-auto p-5 space-y-5 text-left relative z-10">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-455 dark:text-slate-505 mb-1 select-none">Task Properties</h3>
                  {renderPropertiesTable()}
                  <div className="pt-2">
                    {renderCustomFieldsAccordion()}
                  </div>
                </div>

              </div>
            ) : (
              // ── Single Column Scroll (Sidebar narrow layout) ──
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-left relative z-10">
                
                {/* Blocked Warning Banner */}
                {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/50 dark:bg-amber-955/20 border border-amber-250/55 dark:border-amber-900/30 rounded-2xl text-left select-none shadow-3xs relative z-10">
                    <Hourglass className="w-4.5 h-4.5 text-amber-550 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <div className="text-xs font-black text-amber-800 dark:text-amber-305">This task is waiting on other tasks</div>
                      <div className="text-[11.5px] font-semibold text-amber-705 dark:text-amber-400/80 leading-relaxed">
                        Before starting, you must complete: {' '}
                        {task.relationships.blockedBy.map((id, index) => {
                          const t = allTasks.find(item => item.id === id);
                          return (
                            <span key={id} className="font-extrabold text-amber-800 dark:text-amber-300">
                              {index > 0 ? ', ' : ''}
                              "{t?.title || id}"
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Assistant panel */}
                {renderAiAssistantPanel()}

                {/* Title */}
                <div>
                  {editingTitle ? (
                    <input autoFocus value={titleValue} onChange={e => setTitleValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                      onBlur={saveTitle}
                      className="w-full text-xl font-bold text-slate-900 dark:text-slate-50 bg-transparent border-b-2 border-indigo-500 outline-none py-1 leading-tight" />
                  ) : (
                    <h2 onClick={() => setEditingTitle(true)}
                      className="text-xl font-bold text-slate-900 dark:text-slate-100 cursor-text hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors group flex items-start gap-2 leading-tight">
                      <span className={`${task.status === 'completed' ? 'line-through text-slate-405 dark:text-slate-505' : ''}`}>{task.title}</span>
                      <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity mt-1.5 shrink-0" />
                    </h2>
                  )}
                </div>

                {/* Properties Table Grid */}
                <div className="border-y border-slate-100 dark:border-slate-800/60 py-4">
                  {renderPropertiesTable()}
                </div>

                {/* Custom Fields Accordion */}
                {renderCustomFieldsAccordion()}

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-405 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Description
                  </label>
                  <textarea value={descValue} onChange={e => setDescValue(e.target.value)} onBlur={saveDesc}
                    placeholder="Add description, or write with AI..."
                    className="w-full min-h-[95px] p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-805 text-[12.5px] text-slate-700 dark:text-slate-200 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all leading-relaxed placeholder-slate-350 font-medium" />
                </div>

                {/* Actions Button row */}
                <div className="flex flex-wrap gap-2 py-2 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={onOpenFieldsPanel} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" /> Add fields
                  </button>
                  <button onClick={() => { const title = prompt("Enter subtask title:"); if (title?.trim()) { const newSub = { id: `sub-${Date.now()}`, title: title.trim(), completed: false }; onUpdateTask({ ...task, subtasks: [...(task.subtasks || []), newSub] }); } }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-305 transition-all cursor-pointer select-none">
                    <Plus className="w-3.5 h-3.5 text-emerald-505" /> Add subtask
                  </button>
                  <button onClick={() => { const el = document.getElementById('relationships-section'); el?.scrollIntoView({ behavior: 'smooth' }); }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer select-none">
                    <Tag className="w-3.5 h-3.5 text-sky-505" /> Relate items
                  </button>
                  <button onClick={() => { const fileInput = document.getElementById('task-file-upload'); fileInput?.click(); }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-305 transition-all cursor-pointer select-none">
                    <Paperclip className="w-3.5 h-3.5 text-amber-500" /> Attach file
                  </button>
                </div>

                {/* Checklist subtasks with Drag & Drop */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-955/25 flex items-center justify-center">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-505" />
                      </div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-205">Subtasks</label>
                      <span className="text-[10px] font-medium text-slate-405">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                    </div>
                  </div>

                  <DragDropContext onDragEnd={handleSubtasksDragEnd}>
                    <Droppable droppableId="subtasks-list-single">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className="space-y-1"
                        >
                          {task.subtasks.map((sub, index) => (
                            <Draggable key={sub.id} draggableId={sub.id} index={index}>
                              {(provided) => (
                                <motion.div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="flex items-center gap-2 group py-1.5 px-2 rounded-xl hover:bg-slate-55 dark:hover:bg-slate-900/50 transition-colors shadow-3xs bg-white dark:bg-slate-900"
                                >
                                  <div {...provided.dragHandleProps} className="px-0.5">
                                    <GripVertical className="w-3 h-3 text-slate-350 dark:text-slate-600 shrink-0 cursor-grab active:cursor-grabbing" />
                                  </div>
                                  
                                  <button onClick={() => toggleSubtask(sub.id)}
                                    className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${sub.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-355 dark:border-slate-600 hover:border-indigo-400'}`}>
                                    {sub.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                  </button>
                                  
                                  {editingSubtaskId === sub.id ? (
                                    <input autoFocus value={editingSubtaskValue}
                                      onChange={e => setEditingSubtaskValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') editSubtask(sub.id, editingSubtaskValue); if (e.key === 'Escape') setEditingSubtaskId(null); }}
                                      onBlur={() => editSubtask(sub.id, editingSubtaskValue)}
                                      className="flex-1 text-[12.5px] font-medium bg-transparent border-b-2 border-indigo-400 outline-none py-0.5 text-slate-850 dark:text-slate-205" />
                                  ) : (
                                    <span onDoubleClick={() => { setEditingSubtaskId(sub.id); setEditingSubtaskValue(sub.title); }}
                                      className={`flex-1 text-[12.5px] cursor-text text-left transition-all ${sub.completed ? 'line-through text-slate-405 dark:text-slate-500' : 'text-slate-700 dark:text-slate-250 font-bold'}`}>
                                      {sub.title}
                                    </span>
                                  )}

                                  <button onClick={() => deleteSubtask(sub.id)}
                                    className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0">
                                    <X className="w-3 h-3" />
                                  </button>
                                </motion.div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  <div className="flex items-center gap-2.5 px-3">
                    <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                      placeholder="Add subtask..."
                      className="flex-1 text-[12px] font-medium text-slate-755 dark:text-slate-200 bg-transparent border-b border-transparent focus:border-indigo-405 outline-none py-1 placeholder-slate-450" />
                  </div>
                </div>

                {/* Relationships & References (Single Column) */}
                <div id="relationships-section-single" className="space-y-4 p-4 bg-slate-50/30 dark:bg-slate-900/20 rounded-2xl border border-slate-150 dark:border-slate-800/60 text-left select-none shadow-3xs">
                  <div className="flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-955/25 flex items-center justify-center">
                      <Tag className="w-3.5 h-3.5 text-sky-505" />
                    </div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Relationships & References</label>
                  </div>

                  {/* Linked Tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-455 dark:text-slate-555 uppercase tracking-wider">Linked Tasks</span>
                      <div className="relative">
                        <button onClick={() => { setShowLinkTaskDropdown(!showLinkTaskDropdown); setShowLinkDocDropdown(false); setShowBlockedByDropdown(false); setShowBlocksDropdown(false); }}
                          className="px-2 py-0.5 rounded border border-dashed border-slate-355 dark:border-slate-800 text-[10px] text-slate-505 hover:border-sky-500 hover:text-sky-505 cursor-pointer font-bold transition-colors">
                          + Add link
                        </button>
                        {showLinkTaskDropdown && (
                          <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                            <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                              onChange={e => setRelationshipSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-855 dark:text-slate-200 bg-white dark:bg-slate-805" />
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
                                  className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
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
                          <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-305 dark:hover:border-slate-700 transition-colors shadow-3xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                {tStatusMeta?.label || t.status}
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                            </div>
                            <button onClick={() => {
                              const list = (task.relationships?.tasks || []).filter(id => id !== taskId);
                              onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                            }} className="text-slate-400 hover:text-rose-505 text-xs p-1 cursor-pointer">✕</button>
                          </div>
                        );
                      })}
                      {(task.relationships?.tasks || []).length === 0 && (
                        <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No linked tasks</p>
                      )}
                    </div>
                  </div>

                  {/* Linked Docs */}
                  <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-455 dark:text-slate-555 uppercase tracking-wider">Linked Documents</span>
                      <div className="relative">
                        <button onClick={() => { setShowLinkDocDropdown(!showLinkDocDropdown); setShowLinkTaskDropdown(false); setShowBlockedByDropdown(false); setShowBlocksDropdown(false); }}
                          className="px-2 py-0.5 rounded border border-dashed border-slate-350 dark:border-slate-800 text-[10px] text-slate-505 hover:border-sky-505 hover:text-sky-505 cursor-pointer font-bold transition-colors">
                          + Add link
                        </button>
                        {showLinkDocDropdown && (
                          <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                            <input type="text" placeholder="Search docs..." value={relationshipSearchQuery}
                              onChange={e => setRelationshipSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-850 dark:text-slate-205 bg-white dark:bg-slate-805" />
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
                                  className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
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
                          <div key={docId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2 rounded-xl hover:border-slate-305 dark:hover:border-slate-705 transition-colors shadow-3xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-5.5 h-5.5 rounded bg-sky-50 dark:bg-sky-955/25 flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-sky-505" />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{d ? d.title : docId}</span>
                            </div>
                            <button onClick={() => {
                              const list = (task.relationships?.docs || []).filter(id => id !== docId);
                              onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                            }} className="text-slate-400 hover:text-rose-505 text-xs p-1 cursor-pointer">✕</button>
                          </div>
                        );
                      })}
                      {(task.relationships?.docs || []).length === 0 && (
                        <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No linked documents</p>
                      )}
                    </div>
                  </div>

                  {/* Dependencies: Blocked By */}
                  <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-slate-455 dark:text-slate-550 uppercase tracking-wider">Blocked By (Waiting On)</span>
                        <span className="text-[8px] bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-bold">Dependency</span>
                      </div>
                      <div className="relative">
                        <button onClick={() => { setShowBlockedByDropdown(!showBlockedByDropdown); setShowBlocksDropdown(false); setShowLinkTaskDropdown(false); setShowLinkDocDropdown(false); }}
                          className="px-2 py-0.5 rounded border border-dashed border-slate-355 dark:border-slate-800 text-[10px] text-slate-555 hover:border-amber-550 hover:text-amber-505 cursor-pointer font-bold transition-colors">
                          + Add task
                        </button>
                        {showBlockedByDropdown && (
                          <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                            <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                              onChange={e => setRelationshipSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-855 dark:text-slate-200 bg-white dark:bg-slate-805" />
                            {allTasks
                              .filter(t => t.id !== task.id && !task.relationships?.blockedBy?.includes(t.id) && !task.relationships?.blocks?.includes(t.id))
                              .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                              .map(t => (
                                <button key={t.id}
                                  onClick={() => {
                                    addDependency('blockedBy', t.id);
                                    setShowBlockedByDropdown(false); setRelationshipSearchQuery('');
                                  }}
                                  className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
                                  {t.title}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {(task.relationships?.blockedBy || []).map(taskId => {
                        const t = allTasks.find(item => item.id === taskId);
                        if (!t) return null;
                        const tStatusMeta = STATUS_META[t.status];
                        return (
                          <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-amber-200/50 dark:border-amber-900/30 px-3 py-2 rounded-xl hover:border-amber-305 dark:hover:border-amber-800/80 transition-colors shadow-3xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                {tStatusMeta?.label || t.status}
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                            </div>
                            <button onClick={() => removeDependency('blockedBy', taskId)} className="text-slate-400 hover:text-rose-505 text-xs p-1 cursor-pointer">✕</button>
                          </div>
                        );
                      })}
                      {(task.relationships?.blockedBy || []).length === 0 && (
                        <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No waiting-on dependencies</p>
                      )}
                    </div>
                  </div>

                  {/* Dependencies: Blocks */}
                  <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-slate-455 dark:text-slate-550 uppercase tracking-wider">Blocks (Blocking)</span>
                        <span className="text-[8px] bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 px-1 py-0.5 rounded font-bold">Blocking</span>
                      </div>
                      <div className="relative">
                        <button onClick={() => { setShowBlocksDropdown(!showBlocksDropdown); setShowBlockedByDropdown(false); setShowLinkTaskDropdown(false); setShowLinkDocDropdown(false); }}
                          className="px-2 py-0.5 rounded border border-dashed border-slate-355 dark:border-slate-800 text-[10px] text-slate-555 hover:border-rose-550 hover:text-rose-505 cursor-pointer font-bold transition-colors">
                          + Add task
                        </button>
                        {showBlocksDropdown && (
                          <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-48 overflow-y-auto space-y-1">
                            <input type="text" placeholder="Search tasks..." value={relationshipSearchQuery}
                              onChange={e => setRelationshipSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-750 text-xs rounded mb-1 outline-none text-slate-855 dark:text-slate-200 bg-white dark:bg-slate-805" />
                            {allTasks
                              .filter(t => t.id !== task.id && !task.relationships?.blocks?.includes(t.id) && !task.relationships?.blockedBy?.includes(t.id))
                              .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                              .map(t => (
                                <button key={t.id}
                                  onClick={() => {
                                    addDependency('blocks', t.id);
                                    setShowBlocksDropdown(false); setRelationshipSearchQuery('');
                                  }}
                                  className="w-full text-left p-1 text-xs hover:bg-slate-105 dark:hover:bg-slate-800 rounded truncate font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
                                  {t.title}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {(task.relationships?.blocks || []).map(taskId => {
                        const t = allTasks.find(item => item.id === taskId);
                        if (!t) return null;
                        const tStatusMeta = STATUS_META[t.status];
                        return (
                          <div key={taskId} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-rose-200/50 dark:border-rose-900/30 px-3 py-2 rounded-xl hover:border-rose-305 dark:hover:border-rose-800/80 transition-colors shadow-3xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 text-slate-500'}`}>
                                {tStatusMeta?.label || t.status}
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                            </div>
                            <button onClick={() => removeDependency('blocks', taskId)} className="text-slate-400 hover:text-rose-505 text-xs p-1 cursor-pointer">✕</button>
                          </div>
                        );
                      })}
                      {(task.relationships?.blocks || []).length === 0 && (
                        <p className="text-[10px] text-slate-405 font-medium italic py-1 pl-1">No blocking dependencies</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Comments block */}
                {renderTimelineFeed()}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
