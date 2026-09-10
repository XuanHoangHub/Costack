"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Task, TaskStatus, Priority, User, SubTask, Workspace, Space, TaskAttachment, Document } from '../../types';
import { DropdownFieldSelect, LabelsFieldSelect, PriorityPillSelect, StatusPillSelect, PremiumDatePicker, SpacePillSelect, AssigneePillSelect } from './TaskSelects';
import { Select } from '../ui/Select';
import NotionDocEditor from './NotionDocEditor';
import SignedImage from '../SignedImage';
import { supabase } from '../../lib/supabaseClient';
import { useUiStore } from '../../store/uiStore';
import { wouldCreateDependencyCycle } from '../../lib/taskRelationships';
import { callAiApi } from '@/lib/aiClient';
import { useTranslation } from '../../contexts/TranslationContext';
import { saveTaskReminder, ReminderOption } from '@/lib/notificationManager';
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
  Hourglass, AlertTriangle, Folder, Download, Copy,
  FileDown, FileCode, Share2, Link2, Shield,
  PanelRightClose, PanelRightOpen,
  AppWindow, Maximize2, PanelRight, Layout
} from 'lucide-react';
import ShareSettingsModal from '../ShareSettingsModal';

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
  if (t === 'design') return { bg: 'bg-pink-50 dark:bg-pink-950/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200/50 dark:border-pink-900/30' };
  if (t === 'frontend') return { bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200/50 dark:border-sky-900/30' };
  if (t === 'backend') return { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200/50 dark:border-violet-900/30' };
  if (t === 'bug') return { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200/50 dark:border-rose-900/30' };
  if (t === 'marketing') return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
  if (t === 'research') return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/50 dark:border-amber-900/30' };
  return { bg: 'bg-slate-50 dark:bg-slate-900/60', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-200/50 dark:border-slate-800/40' };
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; bg: string }> = {
  todo: { label: 'Cần làm', dot: 'bg-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  inprogress: { label: 'Đang thực hiện', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  review: { label: 'Chờ duyệt', dot: 'bg-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  completed: { label: 'Hoàn thành', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
};

interface TaskDetailsPanelProps {
  task: Task;
  members: User[];
  workspaces: Workspace[];
  spaces?: Space[];
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onCreateTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & Partial<Pick<Task, 'commentsCount' | 'progress'>>) => void;
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
  currentUser?: any;
}

export default function TaskDetailsPanel({
   task, members, workspaces = [], spaces = [], onClose, onUpdateTask, onCreateTask, onDeleteTask, onAddSyncLog, triggerToast,
   onAttachmentUpload, onAttachmentDelete, onAiSubtasks, aiGenerating,
   onAiSummary, isSummarizing, aiSummary, allTasks = [], allDocs = [], onOpenFieldsPanel,
   globalActiveTaskId = null, globalActiveElapsed = 0, globalIsPaused = false,
   onStartGlobalTimer, onStopGlobalTimer, onTogglePauseGlobalTimer,
   visibleFields, onToggleFieldVisibility, currentUser
 }: TaskDetailsPanelProps) {
  const { t, isVietnamese } = useTranslation();
  const [detailTab, setDetailTab] = useState<'overview' | 'subtasks' | 'files' | 'activity'>('overview');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskValue, setEditingSubtaskValue] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalLayout, setModalLayout] = useState<'modal' | 'fullscreen' | 'sidebar'>(() => {
    if (typeof window !== 'undefined') {
      const savedLayout = localStorage.getItem('apexa_task_modal_layout');
      if (savedLayout === 'modal' || savedLayout === 'fullscreen' || savedLayout === 'sidebar') {
        return savedLayout;
      }
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

  // Preserve the user's saved preference; show properties on spacious screens on first use.
  const [isPropertiesSidebarOpen, setIsPropertiesSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apexa_task_properties_sidebar_open');
      if (saved === 'open') return true;
      if (saved === 'closed' || saved === 'false' || saved === 'true') return false;
    }
    return typeof window !== 'undefined' && window.innerWidth >= 1100;
  });

  const togglePropertiesSidebar = useCallback(() => {
    setIsPropertiesSidebarOpen(prev => {
      const nextVal = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('apexa_task_properties_sidebar_open', nextVal ? 'open' : 'closed');
      }
      return nextVal;
    });
  }, []);
  // Redesign state variables
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratingResponse, setAiGeneratingResponse] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
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
    modalLayout === 'modal' ? 'fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/40 dark:bg-black/55 transition-all duration-200 cursor-pointer' :
    modalLayout === 'fullscreen' ? 'fixed inset-0 z-[100] flex items-stretch justify-stretch p-0 bg-slate-950/40 transition-all duration-200' :
    'fixed inset-0 z-[100] flex items-stretch justify-end p-0 bg-slate-950/20 dark:bg-black/35 transition-all duration-200 cursor-pointer';

  const panelClass =
    modalLayout === 'modal' ? 'relative w-full sm:w-[92vw] max-w-[1240px] h-full sm:h-[88vh] sm:max-h-[920px] bg-white dark:bg-[#11131c] border-none sm:border border-slate-200/90 dark:border-white/10 rounded-none sm:rounded-[26px] flex flex-col overflow-hidden shadow-[0_28px_85px_rgba(15,23,42,0.22)] dark:shadow-[0_32px_96px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/10 pointer-events-auto cursor-default outline-none focus:outline-none ring-0' :
    modalLayout === 'fullscreen' ? 'relative w-full h-full bg-white dark:bg-[#0f1118] flex flex-col overflow-hidden shadow-2xl pointer-events-auto cursor-default outline-none focus:outline-none ring-0' :
    `relative w-full ${isSidebarExpanded ? 'max-w-[1100px] xl:max-w-[80vw]' : 'max-w-[680px] lg:max-w-[740px]'} h-full bg-white dark:bg-[#11131c] border-l border-slate-200/90 dark:border-white/10 rounded-none sm:rounded-l-[26px] flex flex-col overflow-hidden shadow-[-20px_0_60px_rgba(15,23,42,0.2)] dark:shadow-[-20px_0_60px_rgba(0,0,0,0.65)] pointer-events-auto cursor-default outline-none focus:outline-none ring-0`;

  const panelAnimation: any =
    modalLayout === 'modal' ? {
      initial: { scale: 0.96, opacity: 0, y: 14 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.96, opacity: 0, y: 10 },
      transition: { type: 'spring', damping: 28, stiffness: 320 }
    } : modalLayout === 'fullscreen' ? {
      initial: { scale: 0.99, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.99, opacity: 0 },
      transition: { duration: 0.16, ease: 'easeOut' }
    } : {
      initial: { x: '100%', opacity: 0.9 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0.9 },
      transition: { type: 'spring', damping: 32, stiffness: 320 }
    };
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [showSpaceDropdown, setShowSpaceDropdown] = useState(false);
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLinkTaskDropdown, setShowLinkTaskDropdown] = useState(false);
  const [showLinkDocDropdown, setShowLinkDocDropdown] = useState(false);
  const [showBlockedByDropdown, setShowBlockedByDropdown] = useState(false);
  const [showBlocksDropdown, setShowBlocksDropdown] = useState(false);
  const [relationshipSearchQuery, setRelationshipSearchQuery] = useState('');
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(false);
  const [isAttachmentDragActive, setIsAttachmentDragActive] = useState(false);
  const [attachmentBusyId, setAttachmentBusyId] = useState<string | null>(null);
  const newSubtaskInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const totalRelationshipsCount = useMemo(() => {
    return (task.relationships?.tasks?.length || 0) +
           (task.relationships?.docs?.length || 0) +
           (task.relationships?.blockedBy?.length || 0) +
           (task.relationships?.blocks?.length || 0);
  }, [task.relationships]);

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
    const exactLogged = Math.max(0.01, parseFloat((elapsedSeconds / 3600).toFixed(2)));
    if (elapsedSeconds > 0) {
      const nextLogged = parseFloat(((task.hoursLogged || 0) + exactLogged).toFixed(2));
      onUpdateTask({ ...task, hoursLogged: nextLogged });
      onAddSyncLog(`Logged ${exactLogged} hours of work via stopwatch`);
      if (triggerToast) triggerToast('success', 'Time Logged ⏱', `Added ${exactLogged}h to task.`);
    } else {
      triggerToast?.('info', 'Timer stopped', 'No time was logged because the timer did not run.');
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
    setDetailTab('overview');
    setCommentText('');
    setNewSubtaskTitle('');
    setAiResponseText('');
    try {
      const res = await callAiApi('/api/ai/chat', {
        message: `Về công việc này:\n- Tiêu đề: ${task.title}\n- Mô tả: ${task.description || 'Không có'}\n- Trạng thái: ${task.status}\n- Độ ưu tiên: ${task.priority}\n\nYêu cầu trợ giúp: ${promptToSend}`,
        history: []
      });
      const data = await res.json();
      if (data.success && data.text) {
        setAiResponseText(data.text);
        if (customPrompt?.includes('Cải thiện mô tả')) {
          triggerToast?.('info', 'Improved description ready', 'Review the result, then apply it to the task.');
        }
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
      const res = await callAiApi('/api/ai/suggest-tags', { title: task.title, description: task.description });
      const data = await res.json();
      if (data.success && data.tags) {
        const mergedTags = Array.from(new Set([...(task.tags || []), ...data.tags]));
        onUpdateTask({ ...task, tags: mergedTags });
        if (triggerToast) triggerToast('success', 'Tags Suggested', `Added suggested tags: ${data.tags.join(', ')}`);
        onAddSyncLog(`AI suggested tags: ${data.tags.join(', ')}`);
      } else {
        triggerToast?.('warning', 'Could not suggest tags', data.error || 'Please try again.');
      }
    } catch (err) {
      console.error(err);
      triggerToast?.('error', 'Could not suggest tags', 'The AI service is unavailable.');
    }
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => dialogRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [mounted]);

  React.useEffect(() => {
    // Sync form state with task prop changes
    setTitleValue(task.title);
    setDescValue(task.description);
  }, [task.id, task.title, task.description]);

  React.useEffect(() => {
    setAiResponseText('');
    setAiPrompt('');
    setIsAiPanelOpen(false);
    setConfirmDelete(false);
    setShowMoreMenu(false);
    setShowSpaceDropdown(false);
  }, [task.id]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        if (editingTitle) { setEditingTitle(false); setTitleValue(task.title); return; }
        if (showSharePopover) { setShowSharePopover(false); return; }
        if (showLogTimeModal) { setShowLogTimeModal(false); return; }
        if (layoutMenuOpen || showMoreMenu || showSpaceDropdown || showAssigneesDropdown || showTagsDropdown || showLinkTaskDropdown || showLinkDocDropdown || showBlockedByDropdown || showBlocksDropdown) {
          setLayoutMenuOpen(false);
          setShowMoreMenu(false);
          setShowSpaceDropdown(false);
          setConfirmDelete(false);
          setShowAssigneesDropdown(false);
          setShowTagsDropdown(false);
          setShowLinkTaskDropdown(false);
          setShowLinkDocDropdown(false);
          setShowBlockedByDropdown(false);
          setShowBlocksDropdown(false);
          return;
        }
        onClose();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
        event.preventDefault();
        togglePropertiesSidebar();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )).filter(element => !element.hasAttribute('hidden') && element.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingTitle, task.title, showSharePopover, showLogTimeModal, layoutMenuOpen, onClose, showAssigneesDropdown, showBlockedByDropdown, showBlocksDropdown, showLinkDocDropdown, showLinkTaskDropdown, showMoreMenu, showSpaceDropdown, showTagsDropdown, togglePropertiesSidebar]);

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

    if (!targetTask) return;
    const alreadyLinked = type === 'blockedBy'
      ? currentRels.blockedBy?.includes(targetTaskId)
      : currentRels.blocks?.includes(targetTaskId);
    if (alreadyLinked) return;

    const blockedTaskId = type === 'blockedBy' ? task.id : targetTaskId;
    const blockerTaskId = type === 'blockedBy' ? targetTaskId : task.id;
    if (wouldCreateDependencyCycle(blockedTaskId, blockerTaskId, allTasks)) {
      triggerToast?.(
        'warning',
        'Circular dependency prevented',
        `Linking “${task.title}” and “${targetTask.title}” would create a dependency loop.`
      );
      return;
    }

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

    const newTask = {
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
      comments: [],
      commentsCount: 0
    };

    onCreateTask?.(newTask as any);
    if (triggerToast) {
      triggerToast('success', 'Converted Checklist Item', `Checklist item converted to a subtask.`);
    }
    onAddSyncLog(`Converted checklist item "${title}" into a child task.`);
  };

  const createTaskLink = () => {
    const url = new URL(window.location.href);
    if (task.spaceId) url.searchParams.set('space', task.spaceId);
    if (task.listId) url.searchParams.set('list', task.listId);
    url.searchParams.set('task', task.id);
    return url.toString();
  };

  const copyTaskLink = async () => {
    try {
      await navigator.clipboard.writeText(createTaskLink());
      triggerToast?.('success', isVietnamese ? 'Đã sao chép liên kết' : 'Link copied', isVietnamese ? 'Bất kỳ ai có quyền truy cập workspace đều có thể mở công việc này.' : 'Anyone with workspace access can open this task.');
    } catch {
      triggerToast?.('error', isVietnamese ? 'Không thể sao chép liên kết' : 'Could not copy link', isVietnamese ? 'Quyền truy cập bộ nhớ tạm bị từ chối.' : 'Clipboard permission was denied.');
    }
  };

  const copyTaskAsMarkdown = async () => {
    try {
      const assigneeNames = (task.assigneeIds || [])
        .map(id => members.find(m => m.id === id)?.name)
        .filter(Boolean)
        .join(', ') || (isVietnamese ? 'Chưa giao' : 'Unassigned');
      const subtasksMd = (task.subtasks || [])
        .map(st => `- [${st.completed ? 'x' : ' '}] ${st.title}`)
        .join('\n');
      const md = [
        `# [${(task.status || 'todo').toUpperCase()}] ${task.title}`,
        `**${isVietnamese ? 'Độ ưu tiên' : 'Priority'}**: ${task.priority || 'medium'} | **${isVietnamese ? 'Hạn chót' : 'Due Date'}**: ${task.dueDate || (isVietnamese ? 'Không có' : 'None')} | **${isVietnamese ? 'Người thực hiện' : 'Assignees'}**: ${assigneeNames}`,
        task.description ? `\n### ${isVietnamese ? 'Mô tả' : 'Description'}\n${task.description}` : '',
        subtasksMd ? `\n### ${isVietnamese ? 'Việc phụ' : 'Subtasks'}\n${subtasksMd}` : '',
      ].filter(Boolean).join('\n');

      await navigator.clipboard.writeText(md);
      triggerToast?.('success', isVietnamese ? 'Đã sao chép Markdown' : 'Copied Markdown', isVietnamese ? 'Đã sao chép toàn bộ chi tiết công việc dưới dạng Markdown.' : 'Task details copied as Markdown.');
      setShowMoreMenu(false);
    } catch {
      triggerToast?.('error', isVietnamese ? 'Không thể sao chép' : 'Could not copy', isVietnamese ? 'Quyền truy cập bộ nhớ tạm bị từ chối.' : 'Clipboard permission was denied.');
    }
  };

  const exportTaskAsJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(task, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `task-${task.id.slice(0, 8)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast?.('success', isVietnamese ? 'Đã tải tệp JSON' : 'Downloaded JSON', isVietnamese ? 'Dữ liệu công việc đã được xuất thành công.' : 'Task data exported successfully.');
      setShowMoreMenu(false);
    } catch {
      triggerToast?.('error', isVietnamese ? 'Xuất tệp thất bại' : 'Export failed', isVietnamese ? 'Không thể xuất tệp JSON.' : 'Unable to export JSON.');
    }
  };

  const downloadAttachment = async (attachment: TaskAttachment) => {
    setAttachmentBusyId(attachment.id);
    try {
      const { data, error } = await supabase.storage.from('app-files').createSignedUrl(attachment.filePath, 60, {
        download: attachment.name
      });
      if (error || !data?.signedUrl) throw error || new Error('No download URL returned');
      const anchor = document.createElement('a');
      anchor.href = data.signedUrl;
      anchor.download = attachment.name;
      anchor.rel = 'noopener';
      anchor.click();
    } catch (error: any) {
      triggerToast?.('error', 'Download failed', error?.message || 'You may not have access to this file.');
    } finally {
      setAttachmentBusyId(null);
    }
  };

  const duplicateTask = () => {
    const duplicate = {
      ...task,
      title: `${task.title} (copy)`,
      parentId: undefined,
      status: 'todo' as TaskStatus,
      completedAt: undefined,
      progress: 0,
      subtasks: task.subtasks.map(subtask => ({ ...subtask, id: crypto.randomUUID(), completed: false })),
      comments: [],
      commentsCount: 0,
      activities: [],
      attachments: [],
      relationships: {}
    };
    delete (duplicate as Partial<Task>).id;
    delete (duplicate as Partial<Task>).createdAt;
    onCreateTask?.(duplicate as any);
    triggerToast?.('success', 'Task duplicated', `Created “${duplicate.title}”.`);
    setShowMoreMenu(false);
  };

  const focusSubtaskComposer = () => {
    setDetailTab('subtasks');
    newSubtaskInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => newSubtaskInputRef.current?.focus(), 250);
  };

  const scrollToRelationships = () => {
    setRelationshipsExpanded(true);
    setDetailTab('overview');
    window.setTimeout(() => document.getElementById('relationships-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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

  let spaceName = isVietnamese ? 'Không gian chung' : 'General Space';
  let listName = '';
  if (task.spaceId && spaces && spaces.length > 0) {
    const sp = spaces.find(s => s.id === task.spaceId);
    if (sp) spaceName = sp.name;
  } else if (task.workspaceId && workspaces && workspaces.length > 0) {
    const ws = workspaces.find(w => w.id === task.workspaceId);
    if (ws) spaceName = ws.name;
  } else if (spaces && spaces.length > 0) {
    spaceName = spaces[0].name;
  } else if (workspaces && workspaces.length > 0) {
    spaceName = workspaces[0].name;
  }

  if (spaces && spaces.length > 0) {
    for (const space of spaces) {
      const list = space.lists?.find((l: { id: string; name: string; folderId?: string }) => l.id === task.listId);
      if (list) {
        listName = list.name;
        if (!task.spaceId) spaceName = space.name;
      }
    }
  }
  const activeSpaceFieldDefinitions = spaces.find(space => space.id === task.spaceId)?.customFields || [];
  const dynamicCustomFieldNames = Array.from(new Set([
    ...activeSpaceFieldDefinitions.map(field => field.name),
    ...Object.keys(task.custom_fields || {})
  ])).filter(key => !['Objective', 'Owner', 'Cost'].includes(key));

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/25' };
    if (['pdf'].includes(ext || '')) return { color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/25' };
    if (['doc', 'docx'].includes(ext || '')) return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/25' };
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/25' };
    if (['zip', 'rar', '7z'].includes(ext || '')) return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/25' };
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

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const dateOnly = dateStr.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateOnly;
  };

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const dateOnly = dateStr.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateOnly;
  };

  // ── Sub-component renders to reduce duplication ──
  const renderPropertiesTable = () => {
    const isShown = (fieldKey: string) => !visibleFields || visibleFields.includes(fieldKey);

    return (
      <div className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
        {/* Status */}
        {isShown('status') && (
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-center justify-between min-h-[38px] group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none">
              <CircleDot className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Trạng thái' : 'Status'}
            </span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
              <StatusPillSelect value={task.status} onChange={s => { onUpdateTask({ ...task, status: s }); onAddSyncLog(`Status → ${s}`); }} />
              <button type="button"
                onClick={() => {
                  const next = task.status === 'completed' ? 'todo' : 'completed';
                  onUpdateTask({ ...task, status: next as TaskStatus });
                  onAddSyncLog(`Status → ${next}`);
                }}
                className={`p-1 rounded-lg border cursor-pointer transition-all ${task.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 dark:bg-slate-900 dark:border-slate-800'}`}
                title={task.status === 'completed' ? (isVietnamese ? 'Đánh dấu chưa hoàn thành' : 'Mark incomplete') : (isVietnamese ? 'Đánh dấu hoàn thành' : 'Mark complete')}>
                <Check className="w-3.5 h-3.5" />
              </button>
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('status')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Assignees */}
        {isShown('assignee') && (
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-center justify-between min-h-[38px] group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Người phụ trách' : 'Assignee'}
            </span>
            <div className="relative flex-1 min-w-0 flex items-center justify-end gap-1">
              <AssigneePillSelect
                value={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])}
                members={members}
                onChange={newIds => {
                  const nextIds = newIds || [];
                  onUpdateTask({
                    ...task,
                    assigneeIds: nextIds,
                    assigneeId: nextIds[0] || undefined,
                    custom_fields: {
                      ...(task.custom_fields || {}),
                      assigneeIds: nextIds
                    }
                  });
                }}
              />
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('assignee')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Priority */}
        {isShown('priority') && (
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-center justify-between min-h-[38px] group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none">
              <Flag className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Mức ưu tiên' : 'Priority'}
            </span>
            <div className="flex-1 min-w-0 flex items-center justify-end gap-1">
              <PriorityPillSelect value={task.priority} onChange={p => { onUpdateTask({ ...task, priority: p || 'medium' }); onAddSyncLog(`Priority → ${p || 'medium'}`); }} />
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('priority')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dates (Start & Due Date) */}
        {(isShown('dueDate') || isShown('startDate')) && (
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-center justify-between min-h-[38px] group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none z-10">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Ngày tháng' : 'Dates'}
            </span>
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-end overflow-hidden">
              <PremiumDatePicker 
                startDateValue={task.startDate || ''}
                onStartDateChange={v => onUpdateTask({ ...task, startDate: v || '' })}
                dateValue={task.dueDate || ''}
                onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} 
                label={isVietnamese ? "Chọn ngày" : "Dates"} 
                displayLabel={
                  task.startDate && task.dueDate
                    ? `${formatShortDate(task.startDate)} → ${formatShortDate(task.dueDate)}`
                    : task.dueDate
                    ? formatFullDate(task.dueDate)
                    : task.startDate
                    ? `${isVietnamese ? 'Từ ' : 'From '}${formatFullDate(task.startDate)}`
                    : undefined
                }
                align="right"
                taskId={task.id}
                taskTitle={task.title}
                reminderValue={task.reminder || (task.custom_fields?.reminder as ReminderOption)}
                onReminderChange={r => {
                  onUpdateTask({ ...task, reminder: r, custom_fields: { ...(task.custom_fields || {}), reminder: r } });
                  saveTaskReminder(task.id, task.title, task.dueDate || '', r);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all truncate max-w-full ${
                  (task.dueDate || task.startDate) ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/40 dark:bg-indigo-950/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`} 
              />
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('dueDate')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Space (Không gian làm việc) */}
        {isShown('space') && (
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-center justify-between min-h-[38px] group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none">
              <Folder className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Không gian' : 'Space'}
            </span>
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
              <div className="w-full max-w-[170px]">
                <SpacePillSelect 
                  value={task.workspaceId} 
                  workspaces={workspaces}
                  onChange={wsId => onUpdateTask({ ...task, workspaceId: wsId || undefined })} 
                />
              </div>
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('space')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Time Tracking */}
        <div className="py-2 px-2 -mx-1 rounded-xl flex flex-col justify-center min-h-[38px] space-y-1.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center justify-between">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Bấm giờ' : 'Time'}
            </span>
            <div className="flex items-center gap-2">
              {currentTimerActive ? (
                <>
                  <span className={`text-xs font-mono font-bold text-rose-500 tabular-nums ${currentTimerPaused ? '' : 'animate-pulse'}`}>
                    {formatTimerTime(currentElapsedSeconds)}
                  </span>
                  {isGlobalTrackingThisTask && (
                    <button
                      type="button"
                      onClick={onTogglePauseGlobalTimer}
                      className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10.5px] font-bold cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-200/40"
                    >
                      {currentTimerPaused ? (isVietnamese ? 'Tiếp tục' : 'Resume') : (isVietnamese ? 'Tạm dừng' : 'Pause')}
                    </button>
                  )}
                  <button type="button" onClick={handleStopTimer}
                    className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-[10.5px] font-bold cursor-pointer hover:bg-rose-100 transition-colors border border-rose-200/60 dark:border-rose-800/30">
                    <Square className="w-2.5 h-2.5 fill-current" /> {isVietnamese ? 'Dừng' : 'Stop'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={handleStartTimer}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 p-1 px-2.5 rounded-lg transition-all cursor-pointer border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 shadow-3xs">
                  <Play className="w-3 h-3 fill-slate-500 text-slate-500 shrink-0" /> {isVietnamese ? 'Bắt đầu' : 'Start'}
                </button>
              )}
              
              {/* Manual Logger */}
              <div className="relative">
                {showLogTimeModal ? (
                  <div className="absolute right-0 bottom-full mb-2.5 z-40 flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl">
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.1} 
                      placeholder={isVietnamese ? "giờ" : "hrs"} 
                      value={logTimeValue}
                      onChange={e => setLogTimeValue(e.target.value)}
                      className="w-14 text-xs text-center border border-slate-200/90 dark:border-slate-700 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 outline-none py-1.5 font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs"
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
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
                    >
                      {isVietnamese ? 'Ghi' : 'Log'}
                    </button>
                    <button type="button" onClick={() => setShowLogTimeModal(false)} className="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setShowLogTimeModal(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
                  >
                    + {isVietnamese ? 'Ghi nhận' : 'Log'}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>{(task.hoursLogged || 0)} {isVietnamese ? 'giờ đã ghi' : 'hrs logged'}</span>
            {task.hoursEstimate ? <span>{task.hoursEstimate} {isVietnamese ? 'giờ dự kiến' : 'hrs estimate'}</span> : null}
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
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-center justify-between min-h-[38px] group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none">
              <Timer className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Ước tính' : 'Estimate'}
            </span>
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
              <input type="number" min={0} step={0.5} placeholder="—"
                value={task.hoursEstimate || ''}
                onChange={e => onUpdateTask({ ...task, hoursEstimate: parseFloat(e.target.value) || undefined })}
                className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl outline-none px-2.5 py-1 w-16 text-right placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs" />
              {task.hoursEstimate ? <span className="text-[11px] text-slate-400 font-medium">{isVietnamese ? 'giờ' : 'hrs'}</span> : null}
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('progress')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {isShown('tags') && (
          <div className="py-1.5 px-2 -mx-1 rounded-xl flex items-start justify-between min-h-[38px] pt-2 group/row relative hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
            <span className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 select-none mt-0.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> {isVietnamese ? 'Nhãn' : 'Tags'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap relative flex-1 min-w-0 justify-end">
              {(task.tags || []).map(tag => {
                const color = getTagColor(tag);
                return (
                  <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border ${color.bg} ${color.text} ${color.border} select-none`}>
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
                  className="w-5 h-5 rounded-md border border-dashed border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Plus className="w-3 h-3 text-slate-400" />
                </button>
                <AnimatePresence>
                  {showTagsDropdown && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowTagsDropdown(false)} />
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 mt-1.5 z-30 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-36 space-y-0.5">
                        {['Design', 'Frontend', 'Backend', 'Bug', 'Marketing', 'Research', 'Copywriting'].map(preset => (
                          <button key={preset}
                            onClick={() => {
                              const current = task.tags || [];
                              if (!current.includes(preset)) onUpdateTask({ ...task, tags: [...current, preset] });
                              setShowTagsDropdown(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getTagColor(preset).bg} border ${getTagColor(preset).border}`} />
                            {preset}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {(!task.tags || task.tags.length === 0) && (
                <button onClick={() => setShowTagsDropdown(true)}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">{isVietnamese ? 'Trống' : 'Empty'}</button>
              )}
              {onToggleFieldVisibility && (
                <button 
                  type="button" 
                  onClick={() => onToggleFieldVisibility('tags')}
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer shrink-0 -mr-1"
                  title={isVietnamese ? "Ẩn trường" : "Hide field"}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCustomFieldsAccordion = () => {
    const isShown = (fieldKey: string) => !visibleFields || visibleFields.includes(fieldKey);
    const visibleCustomFieldsCount = [
      isShown('Objective') ? 1 : 0,
      isShown('Owner') ? 1 : 0,
      isShown('Cost') ? 1 : 0,
      ...dynamicCustomFieldNames.filter(k => isShown(k)).map(() => 1)
    ].reduce((a, b) => a + b, 0);

    return (
      <div className="border border-slate-200/80 dark:border-white/[0.08] rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-xs relative z-10">
        <button type="button" onClick={() => setFieldsExpanded(!fieldsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-white/[0.02] text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/[0.06] cursor-pointer select-none hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${fieldsExpanded ? '' : '-rotate-90'}`} />
            <span>{isVietnamese ? 'Trường tùy chỉnh' : 'Custom Fields'}</span>
          </div>
          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-semibold">
            {visibleCustomFieldsCount} {isVietnamese ? 'trường' : 'fields'}
          </span>
        </button>

        {fieldsExpanded && (
          <div className="p-4 space-y-3.5">
            {/* Single column layout to avoid cramped rows in sidebar */}
            <div className="flex flex-col space-y-3">
              {/* Objective */}
              {isShown('Objective') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {isVietnamese ? 'Mục tiêu' : 'Objective'}
                    </label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Objective')}
                        className="text-[9px] text-slate-400 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title={isVietnamese ? "Ẩn trường" : "Hide field"}
                      >
                        {isVietnamese ? 'Ẩn' : 'Hide'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder={isVietnamese ? "Mục tiêu cụ thể của công việc..." : "Specific task objective..."}
                    value={String(task.custom_fields?.Objective || '')} 
                    onChange={e => { const updated = { ...(task.custom_fields || {}), Objective: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-[#151515] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs" 
                  />
                </div>
              )}

              {/* Owner */}
              {isShown('Owner') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {isVietnamese ? 'Chủ sở hữu' : 'Owner'}
                    </label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Owner')}
                        className="text-[9px] text-slate-400 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title={isVietnamese ? "Ẩn trường" : "Hide field"}
                      >
                        {isVietnamese ? 'Ẩn' : 'Hide'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder={isVietnamese ? "Người chịu trách nhiệm chính..." : "Task owner..."}
                    value={String(task.custom_fields?.Owner || '')} 
                    onChange={e => { const updated = { ...(task.custom_fields || {}), Owner: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-[#151515] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs" 
                  />
                </div>
              )}

              {/* Cost */}
              {isShown('Cost') && (
                <div className="space-y-1 relative group/field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {isVietnamese ? 'Chi phí' : 'Cost'}
                    </label>
                    {onToggleFieldVisibility && (
                      <button 
                        type="button" 
                        onClick={() => onToggleFieldVisibility('Cost')}
                        className="text-[9px] text-slate-400 hover:text-rose-500 hover:underline opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer"
                        title={isVietnamese ? "Ẩn trường" : "Hide field"}
                      >
                        {isVietnamese ? 'Ẩn' : 'Hide'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder={isVietnamese ? "Ước tính chi phí (VD: 500.000 đ)..." : "Cost estimate..."}
                    value={String(task.custom_fields?.Cost || '')} 
                    onChange={e => { const updated = { ...(task.custom_fields || {}), Cost: e.target.value }; onUpdateTask({ ...task, custom_fields: updated }); }}
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-[#151515] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs" 
                  />
                </div>
              )}
            </div>

            {/* Dynamic space custom fields */}
            {dynamicCustomFieldNames.filter(key => isShown(key)).length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {isVietnamese ? 'Trường tùy chỉnh khác' : 'Other Custom Fields'}
                </label>
                <div className="flex flex-col space-y-3">
                  {dynamicCustomFieldNames
                    .filter(key => isShown(key))
                    .map(key => {
                      const val = task.custom_fields?.[key] ?? '';
                      const fieldConfig = activeSpaceFieldDefinitions.find(field => field.name === key);
                      const updateValue = (nextValue: unknown) => onUpdateTask({
                        ...task,
                        custom_fields: { ...(task.custom_fields || {}), [key]: nextValue }
                      });
                      return (
                      <div key={key} className="space-y-1 relative group/field">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 capitalize">{key}</label>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover/field:opacity-100 transition-opacity">
                            {onToggleFieldVisibility && (
                              <button 
                                type="button"
                                onClick={() => onToggleFieldVisibility(key)}
                                className="text-[9px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                title={isVietnamese ? "Ẩn trường" : "Hide field"}
                              >
                                {isVietnamese ? 'Ẩn' : 'Hide'}
                              </button>
                            )}
                            <button onClick={() => { const { [key]: _, ...rest } = task.custom_fields || {}; onUpdateTask({ ...task, custom_fields: rest }); }}
                              className="text-[9px] text-rose-500 hover:underline cursor-pointer">
                              {isVietnamese ? 'Xóa' : 'Delete'}
                            </button>
                          </div>
                        </div>
                        {fieldConfig?.type === 'dropdown' ? (
                          <DropdownFieldSelect value={String(val)} options={fieldConfig.options || []} fieldId={fieldConfig.id} onChange={updateValue} />
                        ) : fieldConfig?.type === 'labels' ? (
                          <LabelsFieldSelect value={String(val)} options={fieldConfig.options || []} fieldId={fieldConfig.id} onChange={updateValue} />
                        ) : fieldConfig?.type === 'checkbox' ? (
                          <button type="button" onClick={() => updateValue(!(val === true || val === 'true'))}
                            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${val === true || val === 'true' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'border-slate-200/90 bg-white text-slate-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-400'}`}>
                            <CheckSquare className="h-3.5 w-3.5" /> {fieldConfig.checkboxLabel || (isVietnamese ? 'Đánh dấu' : 'Check')}
                          </button>
                        ) : fieldConfig?.type === 'textarea' ? (
                          <textarea rows={3} value={String(val)} placeholder={fieldConfig.placeholder}
                            onChange={event => updateValue(event.target.value)}
                            className="w-full resize-y rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500/15 transition-all dark:border-white/10 dark:bg-[#151515] dark:text-slate-100 shadow-3xs" />
                        ) : fieldConfig?.type === 'number' ? (
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={fieldConfig?.numberMin}
                              max={fieldConfig?.numberMax}
                              value={String(val)} 
                              placeholder={fieldConfig?.placeholder || "0"}
                              onChange={event => updateValue(event.target.value)}
                              className={`w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-[#151515] text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs ${fieldConfig?.numberUnit ? 'pr-12' : ''}`} 
                            />
                            {fieldConfig?.numberUnit && (
                              <span className="absolute right-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                                {fieldConfig.numberUnit}
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            type={fieldConfig?.type === 'date' ? 'date' : fieldConfig?.type === 'money' || fieldConfig?.type === 'progress' || fieldConfig?.type === 'rating' ? 'number' : fieldConfig?.type === 'email' ? 'email' : fieldConfig?.type === 'phone' ? 'tel' : fieldConfig?.type === 'url' ? 'url' : 'text'}
                            min={fieldConfig?.type === 'progress' || fieldConfig?.type === 'rating' ? 0 : undefined}
                            max={fieldConfig?.type === 'progress' ? fieldConfig.progressMax || 100 : fieldConfig?.type === 'rating' ? fieldConfig.ratingMax || 5 : undefined}
                            value={String(val)} placeholder={fieldConfig?.placeholder}
                            onChange={event => updateValue(event.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-[#151515] text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-3xs" />
                        )}
                      </div>
                    );})}
                </div>
              </div>
            )}

            {/* Inline Add Custom Field Creator */}
            {showAddCustomField ? (
              <div className="p-3 bg-slate-50 dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 space-y-2.5 mt-2 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {isVietnamese ? 'Trường tùy chỉnh mới' : 'New Custom Field'}
                </div>
                <div className="flex flex-col space-y-2">
                  <input 
                    type="text" 
                    placeholder={isVietnamese ? "Tên trường (VD: Ngân sách, Sprint...)" : "Field name..."} 
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200/90 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder={isVietnamese ? "Giá trị ban đầu" : "Initial value..."} 
                    value={newFieldValue}
                    onChange={e => setNewFieldValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200/90 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddCustomField(false);
                      setNewFieldName('');
                      setNewFieldValue('');
                    }} 
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                  >
                    {isVietnamese ? 'Hủy' : 'Cancel'}
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
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-3xs"
                  >
                    {isVietnamese ? 'Lưu trường' : 'Save field'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <button 
                  type="button" 
                  onClick={() => setShowAddCustomField(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> {isVietnamese ? 'Thêm trường tùy chỉnh' : 'Add custom field'}
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
      <div className="task-studio-activity space-y-4 text-left relative z-10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-indigo-500" />
            Nhật ký hoạt động và bình luận
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
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs' 
                    : 'hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {{ all: 'Tất cả', comments: 'Bình luận', system: 'Hệ thống' }[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scroll Box */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1 py-1">
          {filteredTimelineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center select-none italic text-slate-400 text-xs">
              <MessageSquare size={28} strokeWidth={1.4} className="mb-3 text-slate-300" />
              <strong className="text-sm font-semibold not-italic text-slate-600 dark:text-slate-300">{isVietnamese ? 'Mọi trao đổi, cùng một nơi' : 'Keep the conversation together'}</strong>
              <span className="mt-2 max-w-[290px] leading-relaxed not-italic">{isVietnamese ? 'Chia sẻ cập nhật, đặt câu hỏi hoặc để lại ghi chú cho công việc này.' : 'Share an update, ask a question or leave a note for this task.'}</span>
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
                          <div className="text-[12px] text-slate-700 dark:text-slate-300">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100">{item.userName}</span>
                            <span className="ml-1 text-slate-500 dark:text-slate-400">{item.content}</span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">{item.timestamp}</div>
                        </div>
                      </motion.div>
                    );
                  } else {
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3.5 relative">
                        <div 
                          onClick={() => {
                            const foundMember = members.find(m => m.name === item.userName || m.id === (item as any).userId);
                            if (foundMember) useUiStore.getState().setViewingMemberProfileId(foundMember.id);
                          }}
                          className="relative shrink-0 z-10 ring-4 ring-white dark:ring-slate-900 cursor-pointer hover:opacity-85 transition-opacity"
                          title={`Xem hồ sơ của ${item.userName}`}
                        >
                          <SignedImage filePath={item.avatar} className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800 object-cover" alt={item.userName} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5 text-left">
                          <div className="flex items-center gap-2 mb-1 text-[11.5px]">
                            <button
                              type="button"
                              onClick={() => {
                                const foundMember = members.find(m => m.name === item.userName || m.id === (item as any).userId);
                                if (foundMember) useUiStore.getState().setViewingMemberProfileId(foundMember.id);
                              }}
                              className="font-extrabold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors text-left"
                              title={`Xem hồ sơ của ${item.userName}`}
                            >
                              {item.userName}
                            </button>
                            <span className="text-[9.5px] text-slate-400 font-medium">{item.timestamp}</span>
                          </div>
                          <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed font-semibold shadow-3xs">
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

        {/* Modern Comment Composer */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] shadow-3xs focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden">
          <div className="p-3">
            <textarea
              rows={2}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addComment();
                }
              }}
              placeholder={isVietnamese ? "Viết bình luận hoặc trao đổi (nhấn Enter để gửi, Shift+Enter xuống dòng)..." : "Write a comment (press Enter to send, Shift+Enter for new line)..."}
              className="w-full text-xs font-medium resize-none bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-none p-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 leading-relaxed custom-scrollbar"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-white/60 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.05]">
            <span className="text-[10px] text-slate-400 font-medium select-none">
              {isVietnamese ? "Nhấn Enter để gửi" : "Press Enter to send"}
            </span>
            <button
              type="button"
              onClick={addComment}
              disabled={!commentText.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs hover:shadow-indigo-500/20 active:scale-95"
            >
              <span>{isVietnamese ? "Gửi" : "Send"}</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRelationshipsSection = (idPrefix: string = 'relationships-section') => {
    const isExpanded = relationshipsExpanded || totalRelationshipsCount > 0;

    return (
      <div id={idPrefix} className="space-y-3 p-3.5 sm:p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-left select-none shadow-xs">
        <div 
          onClick={() => setRelationshipsExpanded(prev => !prev)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {isVietnamese ? 'Mối quan hệ & Liên kết' : 'Relationships & Links'}
            </label>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
              {totalRelationshipsCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRelationshipsExpanded(prev => !prev); }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            {/* Linked Tasks */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVietnamese ? 'Công việc liên kết' : 'Linked Tasks'}
                </span>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => { setShowLinkTaskDropdown(!showLinkTaskDropdown); setShowLinkDocDropdown(false); setShowBlockedByDropdown(false); setShowBlocksDropdown(false); }}
                    className="px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 cursor-pointer font-semibold transition-all bg-slate-50/50 dark:bg-slate-800/50"
                  >
                    + {isVietnamese ? 'Thêm liên kết' : 'Add Link'}
                  </button>
                  {showLinkTaskDropdown && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowLinkTaskDropdown(false)} />
                      <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-64 max-h-56 overflow-y-auto space-y-1">
                        <div className="relative mb-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input 
                            type="text" 
                            placeholder={isVietnamese ? "Tìm công việc..." : "Search task..."} 
                            value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 border border-slate-200/90 dark:border-slate-700 text-xs rounded-xl outline-none text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/15 transition-all font-medium placeholder:text-slate-400" 
                          />
                          {relationshipSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRelationshipSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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
                              className="w-full text-left p-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg truncate font-medium text-slate-700 dark:text-slate-300 block cursor-pointer">
                              {t.title}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {(task.relationships?.tasks || []).map(taskId => {
                  const t = allTasks.find(item => item.id === taskId);
                  if (!t) return null;
                  const tStatusMeta = STATUS_META[t.status];
                  return (
                    <div key={taskId} className="flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 px-3 py-1.5 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-3xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {tStatusMeta?.label || t.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                      </div>
                      <button onClick={() => {
                        const list = (task.relationships?.tasks || []).filter(id => id !== taskId);
                        onUpdateTask({ ...task, relationships: { ...task.relationships, tasks: list } });
                      }} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                    </div>
                  );
                })}
                {(task.relationships?.tasks || []).length === 0 && (
                  <p className="text-[11px] text-slate-400 font-medium italic py-0.5 pl-1">{isVietnamese ? 'Chưa có công việc liên kết' : 'No linked tasks'}</p>
                )}
              </div>
            </div>

            {/* Linked Docs */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVietnamese ? 'Tài liệu liên kết' : 'Linked Docs'}
                </span>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => { setShowLinkDocDropdown(!showLinkDocDropdown); setShowLinkTaskDropdown(false); setShowBlockedByDropdown(false); setShowBlocksDropdown(false); }}
                    className="px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 cursor-pointer font-semibold transition-all bg-slate-50/50 dark:bg-slate-800/50"
                  >
                    + {isVietnamese ? 'Thêm liên kết' : 'Add Link'}
                  </button>
                  {showLinkDocDropdown && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowLinkDocDropdown(false)} />
                      <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-64 max-h-56 overflow-y-auto space-y-1">
                        <div className="relative mb-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input 
                            type="text" 
                            placeholder={isVietnamese ? "Tìm tài liệu..." : "Search docs..."} 
                            value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 border border-slate-200/90 dark:border-slate-700 text-xs rounded-xl outline-none text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/15 transition-all font-medium placeholder:text-slate-400" 
                          />
                          {relationshipSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRelationshipSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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
                              className="w-full text-left p-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg truncate font-medium text-slate-700 dark:text-slate-300 block cursor-pointer">
                              {d.title}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {(task.relationships?.docs || []).map(docId => {
                  const d = allDocs.find(item => item.id === docId);
                  return (
                    <div key={docId} className="flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 px-3 py-1.5 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-3xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                          <FileText className="w-3 h-3 text-sky-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{d ? d.title : docId}</span>
                      </div>
                      <button onClick={() => {
                        const list = (task.relationships?.docs || []).filter(id => id !== docId);
                        onUpdateTask({ ...task, relationships: { ...task.relationships, docs: list } });
                      }} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                    </div>
                  );
                })}
                {(task.relationships?.docs || []).length === 0 && (
                  <p className="text-[11px] text-slate-400 font-medium italic py-0.5 pl-1">{isVietnamese ? 'Chưa có tài liệu liên kết' : 'No linked docs'}</p>
                )}
              </div>
            </div>

            {/* Dependencies: Blocked By */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {isVietnamese ? 'Bị chặn bởi (đang chờ)' : 'Blocked By'}
                  </span>
                  <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                    {isVietnamese ? 'Phụ thuộc' : 'Dependency'}
                  </span>
                </div>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => { setShowBlockedByDropdown(!showBlockedByDropdown); setShowBlocksDropdown(false); setShowLinkTaskDropdown(false); setShowLinkDocDropdown(false); }}
                    className="px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 cursor-pointer font-semibold transition-all bg-slate-50/50 dark:bg-slate-800/50"
                  >
                    + {isVietnamese ? 'Thêm công việc' : 'Add task'}
                  </button>
                  {showBlockedByDropdown && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowBlockedByDropdown(false)} />
                      <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-64 max-h-56 overflow-y-auto space-y-1">
                        <div className="relative mb-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input 
                            type="text" 
                            placeholder={isVietnamese ? "Tìm công việc..." : "Search task..."} 
                            value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 border border-slate-200/90 dark:border-slate-700 text-xs rounded-xl outline-none text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/15 transition-all font-medium placeholder:text-slate-400" 
                          />
                          {relationshipSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRelationshipSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {allTasks
                          .filter(t => t.id !== task.id && !task.relationships?.blockedBy?.includes(t.id) && !task.relationships?.blocks?.includes(t.id))
                          .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                          .map(t => (
                            <button key={t.id}
                              onClick={() => {
                                addDependency('blockedBy', t.id);
                                setShowBlockedByDropdown(false); setRelationshipSearchQuery('');
                              }}
                              className="w-full text-left p-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg truncate font-medium text-slate-700 dark:text-slate-300 block cursor-pointer">
                              {t.title}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {(task.relationships?.blockedBy || []).map(taskId => {
                  const t = allTasks.find(item => item.id === taskId);
                  if (!t) return null;
                  const tStatusMeta = STATUS_META[t.status];
                  return (
                    <div key={taskId} className="flex items-center justify-between bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 px-3 py-1.5 rounded-xl hover:border-amber-300 dark:hover:border-amber-800 transition-all shadow-3xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {tStatusMeta?.label || t.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</span>
                      </div>
                      <button onClick={() => removeDependency('blockedBy', taskId)} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                    </div>
                  );
                })}
                {(task.relationships?.blockedBy || []).length === 0 && (
                  <p className="text-[11px] text-slate-400 font-medium italic py-0.5 pl-1">{isVietnamese ? 'Không có quan hệ phụ thuộc đang chờ' : 'No dependencies'}</p>
                )}
              </div>
            </div>

            {/* Dependencies: Blocks */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {isVietnamese ? 'Đang chặn' : 'Blocking'}
                  </span>
                  <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">
                    {isVietnamese ? 'Chặn' : 'Blocks'}
                  </span>
                </div>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => { setShowBlocksDropdown(!showBlocksDropdown); setShowBlockedByDropdown(false); setShowLinkTaskDropdown(false); setShowLinkDocDropdown(false); }}
                    className="px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300 hover:border-rose-500 hover:text-rose-600 cursor-pointer font-semibold transition-all bg-slate-50/50 dark:bg-slate-800/50"
                  >
                    + {isVietnamese ? 'Thêm công việc' : 'Add task'}
                  </button>
                  {showBlocksDropdown && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowBlocksDropdown(false)} />
                      <div className="absolute right-0 mt-1.5 z-30 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-64 max-h-56 overflow-y-auto space-y-1">
                        <div className="relative mb-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input 
                            type="text" 
                            placeholder={isVietnamese ? "Tìm công việc..." : "Search task..."} 
                            value={relationshipSearchQuery}
                            onChange={e => setRelationshipSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 border border-slate-200/90 dark:border-slate-700 text-xs rounded-xl outline-none text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/15 transition-all font-medium placeholder:text-slate-400" 
                          />
                          {relationshipSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRelationshipSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {allTasks
                          .filter(t => t.id !== task.id && !task.relationships?.blocks?.includes(t.id) && !task.relationships?.blockedBy?.includes(t.id))
                          .filter(t => t.title.toLowerCase().includes(relationshipSearchQuery.toLowerCase()))
                          .map(t => (
                            <button key={t.id}
                              onClick={() => {
                                addDependency('blocks', t.id);
                                setShowBlocksDropdown(false); setRelationshipSearchQuery('');
                              }}
                              className="w-full text-left p-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg truncate font-medium text-slate-700 dark:text-slate-300 block cursor-pointer">
                              {t.title}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {(task.relationships?.blocks || []).map(taskId => {
                  const t = allTasks.find(item => item.id === taskId);
                  if (!t) return null;
                  const tStatusMeta = STATUS_META[t.status];
                  return (
                    <div key={taskId} className="flex items-center justify-between bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 px-3 py-1.5 rounded-xl hover:border-rose-300 dark:hover:border-rose-800 transition-all shadow-3xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${tStatusMeta?.bg || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {tStatusMeta?.label || t.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</span>
                      </div>
                      <button onClick={() => removeDependency('blocks', taskId)} className="text-slate-400 hover:text-rose-500 text-xs p-1 cursor-pointer">✕</button>
                    </div>
                  );
                })}
                {(task.relationships?.blocks || []).length === 0 && (
                  <p className="text-[11px] text-slate-400 font-medium italic py-0.5 pl-1">{isVietnamese ? 'Không có quan hệ chặn' : 'No blocked tasks'}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAttachmentsSection = () => (
    <div className="space-y-2.5 text-left">
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Paperclip className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {isVietnamese ? 'Tệp đính kèm' : 'Attachments'} <span className="text-slate-400 font-semibold">{task.attachments?.length || 0}</span>
          </label>
        </div>
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-lg text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-colors cursor-pointer shadow-3xs">
          <Upload className="w-3 h-3" /> {isVietnamese ? 'Tải tệp lên' : 'Upload'}
        </button>
      </div>

      <div
        onDragEnter={event => { event.preventDefault(); setIsAttachmentDragActive(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (event.currentTarget === event.target) setIsAttachmentDragActive(false); }}
        onDrop={event => {
          event.preventDefault();
          setIsAttachmentDragActive(false);
          const file = event.dataTransfer.files[0];
          if (file) onAttachmentUpload(task, file);
        }}
        className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl transition-all ${isAttachmentDragActive ? 'ring-2 ring-indigo-400 bg-indigo-50/40 p-2 dark:bg-indigo-950/20' : ''}`}
      >
        {(task.attachments || []).map(att => {
          const iconStyle = getFileIcon(att.name);
          return (
            <div key={att.id} className="flex items-center justify-between bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 px-3.5 py-2.5 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-3xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg ${iconStyle.bg} flex items-center justify-center shrink-0`}>
                  <FileText className={`w-4 h-4 ${iconStyle.color}`} />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{att.name}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{(att.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => downloadAttachment(att)} disabled={attachmentBusyId === att.id}
                  title="Tải tệp đính kèm"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors disabled:opacity-50">
                  <Download className={`w-3.5 h-3.5 ${attachmentBusyId === att.id ? 'animate-bounce' : ''}`} />
                </button>
                <button type="button" onClick={() => onAttachmentDelete(task, att)} title="Xóa tệp đính kèm"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {(task.attachments || []).length === 0 && (
          <button type="button"
            onClick={() => fileInputRef.current?.click()}
            className="sm:col-span-2 text-center py-2.5 px-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.05] hover:border-amber-400/60 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400"
          >
            <Upload className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{isVietnamese ? 'Tải tệp lên' : 'Upload file'}</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">• {isVietnamese ? 'hoặc kéo thả vào đây (ảnh, PDF, DOCX tối đa 25MB)' : 'or drag & drop (up to 25MB)'}</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderAiAssistantPanel = () => {
    const response = aiResponseText || aiSummary;

    return (
      <section className="rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-sky-50/60 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-sky-950/20 overflow-hidden shadow-3xs transition-all">
        <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 text-white flex items-center justify-center shadow-2xs shrink-0 ring-2 ring-indigo-500/20">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 tracking-tight">Apexa Brain AI</span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate hidden sm:inline">• {isVietnamese ? 'Trợ lý phân tích & copilot công việc' : 'Smart task copilot'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { setIsAiPanelOpen(true); onAiSummary(task); }}
              disabled={isSummarizing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-850 border border-indigo-200/80 dark:border-indigo-800/60 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 transition-all cursor-pointer shadow-3xs disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`w-3 h-3 ${isSummarizing ? 'animate-spin text-indigo-500' : 'text-indigo-500'}`} />
              <span>{isSummarizing ? 'Đang tóm tắt…' : 'Tóm tắt'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setDetailTab('subtasks'); onAiSubtasks(task); }}
              disabled={aiGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-850 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-bold text-emerald-600 dark:text-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-200 transition-all cursor-pointer shadow-3xs disabled:opacity-50 active:scale-95"
            >
              <CheckSquare className="w-3 h-3 text-emerald-500" />
              <span>{aiGenerating ? 'Đang tạo…' : 'Tạo việc con'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(open => !open)}
              aria-expanded={isAiPanelOpen}
              className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title={isAiPanelOpen ? "Thu gọn AI" : "Mở rộng hỏi đáp AI"}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAiPanelOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isAiPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3.5 pt-1 border-t border-indigo-100/80 dark:border-indigo-900/40 space-y-2.5">
                {/* AI Copilot Quick Actions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none mr-1">
                    Gợi ý nhanh:
                  </span>
                  <button
                    type="button"
                    disabled={aiGeneratingResponse}
                    onClick={() => handleAiQuery('Phân tích chuyên sâu về rủi ro kỹ thuật, giả định, sự phụ thuộc (dependencies) và điểm nghẽn (bottlenecks) có thể gây chậm trễ cho công việc này. Đưa ra 3 khuyến nghị hành động cụ thể để phòng ngừa.')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50 text-[11px] font-bold transition-all shadow-3xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Phân tích rủi ro & điểm nghẽn</span>
                  </button>
                  <button
                    type="button"
                    disabled={aiGeneratingResponse}
                    onClick={() => handleAiQuery('Cải thiện mô tả: Viết lại toàn bộ mô tả công việc này theo chuẩn Agile User Story chuyên nghiệp (Format: Là một [Vai trò], Tôi muốn [Hành động], Để [Giá trị mang lại]) kèm theo danh sách Acceptance Criteria (Tiêu chí nghiệm thu) dạng Checklist chi tiết, rõ ràng và có thể kiểm thử được.')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/50 text-[11px] font-bold transition-all shadow-3xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Chuẩn hóa Agile (User Story)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSuggestTags}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold transition-all shadow-3xs cursor-pointer active:scale-95"
                  >
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span>Gợi ý nhãn</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1.5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-3xs">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={event => setAiPrompt(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAiQuery();
                      }
                    }}
                    placeholder="Đặt câu hỏi hoặc yêu cầu Apexa Brain hỗ trợ công việc này…"
                    className="flex-1 bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-2 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAiQuery()}
                    disabled={!aiPrompt.trim() || aiGeneratingResponse}
                    aria-label="Gửi câu hỏi đến Apexa Brain"
                    className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0 shadow-2xs"
                  >
                    {aiGeneratingResponse ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Gửi</span>
                  </button>
                </div>

                {response && (
                  <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-800 p-3 space-y-2 shadow-3xs">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 font-normal">{response}</p>
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(response)}
                        className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 px-2 py-0.5 rounded cursor-pointer"
                      >
                        Sao chép
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDescValue(response);
                          onUpdateTask({ ...task, description: response });
                          onAddSyncLog(`Applied an AI-generated description to "${task.title}"`);
                          triggerToast?.('success', 'Description updated', 'The AI response was applied to this task.');
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2 py-0.5 rounded cursor-pointer bg-indigo-50 dark:bg-indigo-950/40"
                      >
                        Dùng làm mô tả
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  };

  if (!mounted) return null;

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
          data-layout={modalLayout}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          tabIndex={-1}
          onClick={e => e.stopPropagation()}
          className={`task-studio apexa-task-dialog ${panelClass} overflow-hidden outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`}
        >
          {/* Left-edge expand/collapse handle for sidebar layout */}
          {modalLayout === 'sidebar' && (
            <div 
              onClick={toggleSidebarExpand}
              className="hidden sm:flex absolute left-0 top-0 bottom-0 w-2.5 hover:w-3 bg-transparent hover:bg-indigo-500/15 active:bg-indigo-500/30 transition-all cursor-ew-resize z-30 items-center justify-center group"
              title={isSidebarExpanded ? (isVietnamese ? "Thu gọn thanh bên" : "Collapse sidebar") : (isVietnamese ? "Mở rộng thanh bên" : "Expand sidebar")}
            >
              <div className="w-0.5 h-12 rounded-full bg-slate-300/80 dark:bg-slate-700/80 group-hover:bg-indigo-500 transition-colors" />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── LEFT PANEL: Details & Properties ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 bg-white dark:bg-[#11131c]">
            
            {/* ── Header Bar ── */}
            <div className="task-studio-header apexa-task-detail-header shrink-0 px-3 sm:px-5 md:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-[#121212] select-none min-w-0 w-full overflow-hidden">
              
              {/* Left: Path Breadcrumb */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-0 flex-1 overflow-hidden">
                <div className="relative shrink min-w-0 max-w-[130px] sm:max-w-[170px] md:max-w-[210px]">
                  <button
                    type="button"
                    onClick={() => setShowSpaceDropdown(!showSpaceDropdown)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-slate-600 dark:text-slate-300 group w-full min-w-0"
                    title={isVietnamese ? 'Đổi không gian làm việc' : 'Change workspace / space'}
                  >
                    <Folder className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                    <span className="truncate font-semibold text-xs">{spaceName}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform shrink-0 ${showSpaceDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Space Selection Dropdown */}
                  {showSpaceDropdown && (
                    <>
                      <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowSpaceDropdown(false)} />
                      <div className="absolute left-0 mt-1 z-40 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-56 max-h-60 overflow-y-auto custom-scrollbar space-y-1 text-left">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isVietnamese ? 'Không gian làm việc' : 'Workspaces & Spaces'}
                        </div>
                        {spaces && spaces.length > 0 ? (
                          spaces.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                onUpdateTask({ ...task, spaceId: s.id, workspaceId: (s as any).workspaceId || task.workspaceId });
                                onAddSyncLog(`Space → ${s.name}`);
                                setShowSpaceDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                task.spaceId === s.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-955/40 text-indigo-600 dark:text-indigo-400 font-bold' 
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{s.name}</span>
                              </span>
                              {task.spaceId === s.id && <Check className="w-3 h-3 text-indigo-500 shrink-0" />}
                            </button>
                          ))
                        ) : workspaces && workspaces.length > 0 ? (
                          workspaces.map(w => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                onUpdateTask({ ...task, workspaceId: w.id });
                                onAddSyncLog(`Workspace → ${w.name}`);
                                setShowSpaceDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                task.workspaceId === w.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-955/40 text-indigo-600 dark:text-indigo-400 font-bold' 
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span className="w-4 h-4 rounded bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                  {w.initial}
                                </span>
                                <span className="truncate">{w.name}</span>
                              </span>
                              {task.workspaceId === w.id && <Check className="w-3 h-3 text-indigo-500 shrink-0" />}
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-xs text-slate-400 italic">
                            {isVietnamese ? 'Không có không gian' : 'No spaces available'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {listName ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-600 shrink-0 select-none">/</span>
                    <div 
                      className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink min-w-0 max-w-[110px] sm:max-w-[150px]"
                      title={listName}
                    >
                      <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-xs">{listName}</span>
                    </div>
                  </>
                ) : null}

                {/* Task Title Pill in Breadcrumb - shown only on non-sidebar md+ viewports to prevent crowding */}
                {modalLayout !== 'sidebar' && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600 shrink-0 select-none hidden md:inline">/</span>
                    <div 
                      onClick={() => setEditingTitle(true)}
                      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-white/[0.06] text-slate-800 dark:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.1] transition-colors cursor-pointer min-w-0 max-w-[160px] lg:max-w-[260px] group shrink"
                      title={isVietnamese ? `Tên công việc: "${task.title}" (Nhấp để chỉnh sửa)` : `Task: "${task.title}" (Click to edit)`}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-bold truncate text-xs">
                        {task.title || (isVietnamese ? 'Chưa đặt tên' : 'Untitled')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Actions Row */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto pl-1">
                {modalLayout !== 'sidebar' && (
                  <span className="text-[10.5px] text-slate-400 dark:text-slate-500 hidden xl:inline-block font-medium pr-1 select-none whitespace-nowrap">
                    {isVietnamese ? 'Đã tạo' : 'Created'} {new Date(task.createdAt || Date.now()).toLocaleDateString(isVietnamese ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' })}
                  </span>
                )}

                {/* Share Button & Popover */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setShowSharePopover(!showSharePopover)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-3xs"
                    title={isVietnamese ? 'Chia sẻ công việc' : 'Share task'}
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="hidden lg:inline">{isVietnamese ? 'Chia sẻ' : 'Share'}</span>
                  </button>

                  {showSharePopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSharePopover(false)} />
                      <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-left space-y-3 font-sans animate-fade-in select-none">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            {isVietnamese ? 'Chia sẻ công việc' : 'Share Task'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            ID: {task.id.slice(-6)}
                          </span>
                        </div>

                        {/* Direct URL Copy */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 block">
                            {isVietnamese ? 'Liên kết trực tiếp' : 'Direct Link'}
                          </label>
                          <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
                            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input 
                              readOnly 
                              value={createTaskLink()} 
                              className="w-full text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-none p-0 select-all truncate" 
                            />
                            <button
                              type="button"
                              onClick={() => { copyTaskLink(); setShowSharePopover(false); }}
                              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shrink-0 cursor-pointer shadow-2xs"
                            >
                              {isVietnamese ? 'Chép' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        {/* Quick Markdown Copy */}
                        <button
                          type="button"
                          onClick={() => { copyTaskAsMarkdown(); setShowSharePopover(false); }}
                          className="w-full py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <FileCode className="w-3.5 h-3.5 text-blue-500" />
                            <span>{isVietnamese ? 'Sao chép dạng Markdown' : 'Copy as Markdown'}</span>
                          </span>
                          <Copy className="w-3 h-3 text-slate-400" />
                        </button>

                        {/* Advanced Share & QR Modal button */}
                        <button
                          type="button"
                          onClick={() => { setShowSharePopover(false); setShowShareModal(true); }}
                          className="w-full py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-blue-600 dark:text-sky-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer border border-blue-100 dark:border-sky-800/50"
                        >
                          <span className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            <span>{isVietnamese ? 'Phân quyền, Mã QR & Nhúng...' : 'Access, QR Code & Embed...'}</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Assignees quick view */}
                        {(task.assigneeIds && task.assigneeIds.length > 0) && (
                          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                            <span className="text-[9.5px] font-black uppercase text-slate-400 block">
                              {isVietnamese ? 'Thành viên được giao việc' : 'Assigned Members'}
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                              {task.assigneeIds.map(id => {
                                const m = members.find(mem => mem.id === id || mem.userId === id);
                                return m ? (
                                  <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                                    <SignedImage filePath={m.avatar} className="w-4 h-4 rounded-full object-cover" alt={m.name} />
                                    <span className="truncate max-w-[120px]">{m.name}</span>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* More Options Menu */}
                <div className="relative flex items-center">
                  <button 
                    onClick={() => { setShowMoreMenu(!showMoreMenu); setConfirmDelete(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
                    title="Tùy chọn khác"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setShowMoreMenu(false); setConfirmDelete(false); }} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 text-left">
                        <button type="button" onClick={copyTaskLink}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors">
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isVietnamese ? 'Sao chép liên kết' : 'Copy link'}</span>
                        </button>
                        <button type="button" onClick={copyTaskAsMarkdown}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors">
                          <FileCode className="w-3.5 h-3.5 text-blue-500" />
                          <span>{isVietnamese ? 'Sao chép Markdown' : 'Copy Markdown'}</span>
                        </button>
                        <button type="button" onClick={exportTaskAsJson}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors">
                          <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isVietnamese ? 'Xuất tệp JSON' : 'Export JSON'}</span>
                        </button>
                        <button type="button" onClick={duplicateTask}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors">
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isVietnamese ? 'Nhân bản công việc' : 'Duplicate task'}</span>
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                        <button
                          onClick={() => {
                            if (!confirmDelete) {
                              setConfirmDelete(true);
                              return;
                            }
                            onDeleteTask(task.id); onClose();
                          }}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{confirmDelete ? 'Nhấp lại để xác nhận xóa' : 'Xóa công việc'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                {/* Star Pin Button */}
                <button 
                  onClick={() => {
                    const pinned = !task.isPinned;
                    onUpdateTask({ ...task, isPinned: pinned });
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                    task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-955/25 hover:bg-amber-100 dark:hover:bg-amber-950/40' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                  title={task.isPinned ? "Bỏ ghim công việc" : "Ghim công việc"}
                >
                  <Star className={`w-3.5 h-3.5 ${task.isPinned ? 'fill-amber-400' : ''}`} />
                </button>

                {/* Layout Switcher Dropdown Button */}
                <div className="relative flex items-center">
                  <button 
                    type="button"
                    onClick={() => setLayoutMenuOpen(!layoutMenuOpen)}
                    className={`h-8 px-2 flex items-center gap-1.5 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 ${
                      layoutMenuOpen 
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20' 
                        : ''
                    }`}
                    title={
                      isVietnamese 
                        ? `Đổi bố cục hiển thị (Đang chọn: ${modalLayout === 'modal' ? 'Hộp thoại' : modalLayout === 'fullscreen' ? 'Toàn màn hình' : 'Thanh bên'})`
                        : `Change layout (Current: ${modalLayout === 'modal' ? 'Center Modal' : modalLayout === 'fullscreen' ? 'Full Screen' : 'Right Sidebar'})`
                    }
                  >
                    {modalLayout === 'modal' && <AppWindow className="w-3.5 h-3.5" />}
                    {modalLayout === 'fullscreen' && <Maximize2 className="w-3.5 h-3.5" />}
                    {modalLayout === 'sidebar' && <PanelRight className="w-3.5 h-3.5" />}
                    <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${layoutMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {layoutMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setLayoutMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute right-0 top-full mt-2 z-[200] w-[370px] sm:w-[410px] bg-white dark:bg-[#12141e] border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 text-left font-sans select-none"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Layout className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                                  {isVietnamese ? 'Bố cục hiển thị' : 'Display Layout'}
                                </h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                                  {isVietnamese ? 'Tùy chỉnh cách xem chi tiết công việc' : 'Choose how task details appear'}
                                </p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setLayoutMenuOpen(false)}
                              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* 3 Layout Cards */}
                          <div className="grid grid-cols-3 gap-2.5">
                            {/* Option 1: Modal */}
                            <button
                              type="button"
                              onClick={() => {
                                handleLayoutChange('modal');
                                setLayoutMenuOpen(false);
                              }}
                              className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer text-center ${
                                modalLayout === 'modal'
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'border-slate-200/80 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {modalLayout === 'modal' && (
                                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}

                              {/* Wireframe Mini Preview */}
                              <div className="w-full h-15 rounded-xl bg-slate-200/60 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 p-1 flex items-center justify-center relative overflow-hidden mb-2">
                                <div className="absolute top-0 inset-x-0 h-2 bg-slate-300/60 dark:bg-slate-800/80 flex items-center px-1 gap-0.5">
                                  <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                  <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                </div>
                                <div className={`mt-1.5 w-[52px] h-[34px] rounded-md border shadow-xs flex flex-col p-1 gap-1 transition-all ${
                                  modalLayout === 'modal'
                                    ? 'bg-white dark:bg-[#1c1f2e] border-indigo-400 dark:border-indigo-500 shadow-indigo-500/10'
                                    : 'bg-white dark:bg-slate-900 border-slate-300/80 dark:border-slate-700'
                                }`}>
                                  <div className={`w-4 h-1 rounded ${modalLayout === 'modal' ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                  <div className="space-y-0.5">
                                    <div className="w-9 h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                                    <div className="w-6 h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                                  </div>
                                </div>
                              </div>

                              <span className="text-xs font-black tracking-tight whitespace-nowrap">
                                {isVietnamese ? 'Hộp thoại' : 'Modal'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                                {isVietnamese ? 'Cửa sổ nổi' : 'Floating'}
                              </span>
                            </button>

                            {/* Option 2: Full screen */}
                            <button
                              type="button"
                              onClick={() => {
                                handleLayoutChange('fullscreen');
                                setLayoutMenuOpen(false);
                              }}
                              className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer text-center ${
                                modalLayout === 'fullscreen'
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'border-slate-200/80 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {modalLayout === 'fullscreen' && (
                                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}

                              {/* Wireframe Mini Preview */}
                              <div className="w-full h-15 rounded-xl bg-slate-200/60 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 p-1 flex flex-col relative overflow-hidden mb-2">
                                <div className="h-2 w-full bg-slate-300/60 dark:bg-slate-800/80 flex items-center px-1 gap-0.5 mb-0.5">
                                  <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                  <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                </div>
                                <div className={`flex-1 rounded-sm border p-1 flex gap-1 transition-all ${
                                  modalLayout === 'fullscreen'
                                    ? 'bg-white dark:bg-[#1c1f2e] border-indigo-400 dark:border-indigo-500'
                                    : 'bg-white dark:bg-slate-900 border-slate-300/80 dark:border-slate-700'
                                }`}>
                                  <div className="flex-1 flex flex-col gap-0.5">
                                    <div className={`w-5 h-1 rounded ${modalLayout === 'fullscreen' ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                    <div className="w-full h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                                    <div className="w-4/5 h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                                  </div>
                                  <div className="w-4 h-full rounded-xs bg-slate-100 dark:bg-slate-950/60 border-l border-slate-200/60 dark:border-slate-800" />
                                </div>
                              </div>

                              <span className="text-xs font-black tracking-tight whitespace-nowrap">
                                {isVietnamese ? 'Toàn màn hình' : 'Full Screen'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                                {isVietnamese ? 'Tràn viền' : 'Maximized'}
                              </span>
                            </button>

                            {/* Option 3: Sidebar */}
                            <button
                              type="button"
                              onClick={() => {
                                handleLayoutChange('sidebar');
                                setLayoutMenuOpen(false);
                              }}
                              className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer text-center ${
                                modalLayout === 'sidebar'
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'border-slate-200/80 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {modalLayout === 'sidebar' && (
                                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}

                              {/* Wireframe Mini Preview */}
                              <div className="w-full h-15 rounded-xl bg-slate-200/60 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 p-1 flex relative overflow-hidden mb-2">
                                <div className="absolute top-0 inset-x-0 h-2 bg-slate-300/60 dark:bg-slate-800/80 flex items-center px-1 gap-0.5">
                                  <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                  <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                </div>
                                <div className="flex-1 mt-1.5 flex flex-col gap-1 pr-1">
                                  <div className="w-full h-1 rounded bg-slate-300/70 dark:bg-slate-800" />
                                  <div className="w-4/5 h-1 rounded bg-slate-300/70 dark:bg-slate-800" />
                                  <div className="w-3/5 h-1 rounded bg-slate-300/70 dark:bg-slate-800" />
                                </div>
                                <div className={`mt-1.5 w-[38px] h-full rounded-l-md border-l border-t border-b shadow-xs p-1 flex flex-col gap-0.5 transition-all ${
                                  modalLayout === 'sidebar'
                                    ? 'bg-white dark:bg-[#1c1f2e] border-indigo-400 dark:border-indigo-500'
                                    : 'bg-white dark:bg-slate-900 border-slate-300/80 dark:border-slate-700'
                                }`}>
                                  <div className={`w-3 h-1 rounded ${modalLayout === 'sidebar' ? 'bg-indigo-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                  <div className="w-full h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                                  <div className="w-2/3 h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                                </div>
                              </div>

                              <span className="text-xs font-black tracking-tight whitespace-nowrap">
                                {isVietnamese ? 'Thanh bên' : 'Sidebar'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                                {isVietnamese ? 'Cạnh phải' : 'Docked'}
                              </span>
                            </button>
                          </div>

                          {/* Footer Note */}
                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                              {isVietnamese ? 'Tự động lưu thiết lập cho lần sau' : 'Automatically saved for future tasks'}
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                              Esc
                            </span>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {modalLayout === 'sidebar' && (
                  <button 
                    type="button"
                    onClick={toggleSidebarExpand}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center ml-0.5"
                    title={isSidebarExpanded ? (isVietnamese ? "Thu gọn thanh bên" : "Collapse sidebar") : (isVietnamese ? "Mở rộng thanh bên" : "Expand sidebar")}
                  >
                    {isSidebarExpanded ? (
                      <ChevronsRight className="w-4 h-4" />
                    ) : (
                      <ChevronsLeft className="w-4 h-4" />
                    )}
                  </button>
                )}

                {modalLayout !== 'sidebar' && (
                  <button 
                    type="button" 
                    onClick={togglePropertiesSidebar}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                      isPropertiesSidebarOpen 
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60 shadow-3xs' 
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10'
                    }`}
                    title={isPropertiesSidebarOpen ? (isVietnamese ? "Thu gọn thuộc tính (Ctrl+\\)" : "Collapse properties (Ctrl+\\)") : (isVietnamese ? "Mở thuộc tính (Ctrl+\\)" : "Expand properties (Ctrl+\\)")}
                  >
                    {isPropertiesSidebarOpen ? (
                      <PanelRightClose className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <PanelRightOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    )}
                    <span className="hidden lg:inline text-[11px] font-bold">
                      {isPropertiesSidebarOpen ? (isVietnamese ? 'Thu gọn' : 'Collapse') : (isVietnamese ? 'Thuộc tính' : 'Properties')}
                    </span>
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={onClose} 
                  aria-label="Đóng chi tiết công việc" 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer" 
                  title={isVietnamese ? "Đóng (Esc)" : "Close (Esc)"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) onAttachmentUpload(task, file);
                event.target.value = '';
              }}
              className="hidden"
            />

            {/* ── Content Body Render ── */}
              <div className="task-studio-body">
                
                {/* Left: Main details (Scrollable) */}
                <div className="task-studio-main custom-scrollbar">
                  
                  {/* Blocked Warning Banner */}
                  {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-left select-none shadow-3xs relative z-10">
                      <Hourglass className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <div className="text-xs font-black text-amber-900 dark:text-amber-200">Công việc này đang chờ các công việc khác</div>
                        <div className="text-[11.5px] font-semibold text-amber-800 dark:text-amber-300 leading-relaxed">
                          Trước khi bắt đầu, bạn phải hoàn thành: {' '}
                          {task.relationships.blockedBy.map((id, index) => {
                            const t = allTasks.find(item => item.id === id);
                            return (
                              <span key={id} className="font-extrabold text-amber-900 dark:text-amber-200">
                                {index > 0 ? ', ' : ''}
                                "{t?.title || id}"
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Title & Complete Checkbox */}
                  <div className="task-studio-title text-left flex items-start gap-3.5">
                    {/* Complete toggle circle button */}
                    <button
                      type="button"
                      aria-pressed={task.status === 'completed'}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                        onUpdateTask({ ...task, status: newStatus as TaskStatus });
                        onAddSyncLog(`Toggled completion of task "${task.title}" to: ${newStatus}`);
                        if (typeof window !== 'undefined') {
                          (window as any).playSystemSound?.('toggle');
                        }
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-105 mt-1 shadow-2xs ${
                        task.status === 'completed'
                          ? 'border-emerald-500 bg-emerald-500 text-white ring-4 ring-emerald-500/15 animate-pulse-once'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                      title={task.status === 'completed' ? (isVietnamese ? 'Đánh dấu chưa hoàn thành' : 'Mark incomplete') : (isVietnamese ? 'Đánh dấu hoàn thành' : 'Mark completed')}
                    >
                      {task.status === 'completed' && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingTitle ? (
                        <input 
                          autoFocus 
                          value={titleValue} 
                          onChange={e => setTitleValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                          onBlur={saveTitle}
                          className="w-full text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white bg-transparent border-b-2 border-indigo-500 outline-none pb-1 leading-tight" 
                        />
                      ) : (
                        <h2 
                          id="task-modal-title" 
                          tabIndex={0}
                          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEditingTitle(true); } }}
                          onClick={() => setEditingTitle(true)}
                          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white cursor-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group flex items-start gap-2.5 leading-tight"
                        >
                          <span>{task.title}</span>
                          <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity mt-2 shrink-0" />
                        </h2>
                      )}
                    </div>
                  </div>

                  {/* Collapsed Sidebar Quick-Properties Strip (Linear style) */}
                  {(
                    <motion.div 
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="task-studio-quick-properties"
                    >
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-0.5 hidden sm:inline select-none">
                        {isVietnamese ? 'Thuộc tính:' : 'Properties:'}
                      </span>

                      {/* Status */}
                      <StatusPillSelect 
                        value={task.status} 
                        onChange={s => { onUpdateTask({ ...task, status: s }); onAddSyncLog(`Status → ${s}`); }} 
                      />

                      {/* Assignee */}
                      <AssigneePillSelect
                        value={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])}
                        members={members}
                        onChange={newIds => {
                          const nextIds = newIds || [];
                          onUpdateTask({
                            ...task,
                            assigneeIds: nextIds,
                            assigneeId: nextIds[0] || undefined,
                            custom_fields: {
                              ...(task.custom_fields || {}),
                              assigneeIds: nextIds
                            }
                          });
                        }}
                      />

                      {/* Priority */}
                      <PriorityPillSelect 
                        value={task.priority} 
                        onChange={p => { onUpdateTask({ ...task, priority: p || 'medium' }); onAddSyncLog(`Priority → ${p}`); }} 
                      />

                      {/* Due Date */}
                      <PremiumDatePicker 
                        startDateValue={task.startDate || ''}
                        onStartDateChange={v => onUpdateTask({ ...task, startDate: v || '' })}
                        dateValue={task.dueDate || ''}
                        onChange={v => onUpdateTask({ ...task, dueDate: v || '' })} 
                        label={isVietnamese ? "Hạn chót" : "Due date"} 
                        displayLabel={task.dueDate ? formatFullDate(task.dueDate) : undefined}
                        align="left"
                        taskId={task.id}
                        taskTitle={task.title}
                        reminderValue={task.reminder || (task.custom_fields?.reminder as ReminderOption)}
                        onReminderChange={r => {
                          onUpdateTask({ ...task, reminder: r, custom_fields: { ...(task.custom_fields || {}), reminder: r } });
                          saveTaskReminder(task.id, task.title, task.dueDate || '', r);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium cursor-pointer border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all ${task.dueDate ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900'}`} 
                      />

                      {/* Open Full Sidebar button */}
                      <button
                        type="button"
                        onClick={togglePropertiesSidebar}
                        className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer select-none"
                        title={isVietnamese ? 'Mở bảng thuộc tính chi tiết (Ctrl+\\)' : 'Open full properties (Ctrl+\\)'}
                      >
                        <PanelRightOpen className="w-3.5 h-3.5" />
                        <span>{isVietnamese ? (isPropertiesSidebarOpen ? 'Thu gọn' : 'Thuộc tính') : (isPropertiesSidebarOpen ? 'Collapse' : 'Properties')}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* Quick Actions Bar */}
                  <div className="task-studio-meta">
                    <span><CircleDot size={13} />{isVietnamese ? 'Công việc' : 'Task'} · {task.id.slice(-6).toUpperCase()}</span>
                    <span><Clock size={13} />{isVietnamese ? 'Tạo ngày ' : 'Created '}{new Date(task.createdAt).toLocaleDateString(isVietnamese ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="task-studio-tabs" role="tablist" aria-label={isVietnamese ? 'Nội dung công việc' : 'Task sections'}>
                    {([
                      { id: 'overview', label: isVietnamese ? 'Tổng quan' : 'Overview', icon: FileText, count: null },
                      { id: 'subtasks', label: isVietnamese ? 'Công việc con' : 'Subtasks', icon: CheckSquare, count: task.subtasks.length },
                      { id: 'files', label: isVietnamese ? 'Tệp đính kèm' : 'Files', icon: Paperclip, count: task.attachments?.length || 0 },
                      { id: 'activity', label: isVietnamese ? 'Thảo luận' : 'Activity', icon: MessageSquare, count: task.comments?.length || 0 },
                    ] as const).map((tab, index) => <button key={tab.id} type="button" role="tab" id={'task-tab-' + tab.id}
                      aria-selected={detailTab === tab.id} aria-controls={'task-panel-' + tab.id} tabIndex={detailTab === tab.id ? 0 : -1}
                      onClick={() => setDetailTab(tab.id)}
                      onKeyDown={event => {
                        const ids = ['overview', 'subtasks', 'files', 'activity'] as const;
                        const next = event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : -1;
                        if (next < 0) return;
                        event.preventDefault(); setDetailTab(ids[next]); document.getElementById('task-tab-' + ids[next])?.focus();
                      }}><tab.icon size={15} /><span>{tab.label}</span>{tab.count !== null && <small>{tab.count}</small>}</button>)}
                  </div>
                  <div role="tabpanel" id="task-panel-overview" aria-labelledby="task-tab-overview" hidden={detailTab !== 'overview'} className="task-studio-section">
                  {/* Notion Doc / Tài liệu & Mô tả chi tiết */}
                  <div className="pt-1">
                    <NotionDocEditor
                      key={task.id}
                      initialMode={descValue?.trim() ? 'preview' : 'edit'}
                      value={descValue}
                      onChange={val => {
                        setDescValue(val);
                        onUpdateTask({ ...task, description: val });
                      }}
                      onBlur={saveDesc}
                      taskTitle={task.title}
                    />
                  </div>

                  {renderRelationshipsSection('relationships-section')}
                  {renderAiAssistantPanel()}
                  <div className="task-studio-next-actions">
                    <button type="button" onClick={focusSubtaskComposer}><Plus size={15} />{isVietnamese ? 'Thêm công việc con' : 'Add subtask'}<ChevronRight size={14} /></button>
                    <button type="button" onClick={() => setDetailTab('activity')}><MessageSquare size={15} />{isVietnamese ? 'Bắt đầu trao đổi' : 'Start a conversation'}<ChevronRight size={14} /></button>
                  </div>
                  </div>
                  {/* Subtasks */}
                  <div role="tabpanel" id="task-panel-subtasks" aria-labelledby="task-tab-subtasks" hidden={detailTab !== 'subtasks'} className="task-studio-section space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 select-none">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-955/25 flex items-center justify-center">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Công việc con</label>
                        <span className="text-[10px] font-bold text-slate-400">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                      </div>
                      <button onClick={() => onAiSubtasks(task)} disabled={aiGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer disabled:opacity-50 border border-indigo-100/60 dark:border-indigo-900/30 transition-colors">
                        <Bot className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                        <span>{aiGenerating ? 'Đang tạo…' : 'AI gợi ý'}</span>
                      </button>
                    </div>

                    {task.subtasks.length > 0 && (
                      <div className="flex items-center gap-2.5 px-1 select-none">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400"
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
                                    
                                    <button type="button" aria-label={`${sub.completed ? 'Mở lại' : 'Hoàn thành'}: ${sub.title}`} aria-pressed={sub.completed} onClick={() => toggleSubtask(sub.id)}
                                      className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${sub.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-655 hover:border-indigo-400'}`}>
                                      {sub.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </button>
                                    
                                    {editingSubtaskId === sub.id ? (
                                      <input autoFocus value={editingSubtaskValue}
                                        onChange={e => setEditingSubtaskValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') editSubtask(sub.id, editingSubtaskValue); if (e.key === 'Escape') setEditingSubtaskId(null); }}
                                        onBlur={() => editSubtask(sub.id, editingSubtaskValue)}
                                        className="flex-1 w-full text-[12.5px] font-bold bg-transparent border-b-2 border-indigo-500 outline-none focus:outline-none focus:ring-0 py-0.5 text-slate-900 dark:text-slate-100" />
                                    ) : (
                                      <span tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') { setEditingSubtaskId(sub.id); setEditingSubtaskValue(sub.title); } }} onDoubleClick={() => { setEditingSubtaskId(sub.id); setEditingSubtaskValue(sub.title); }}
                                        className={`flex-1 text-[12.5px] cursor-text text-left transition-all ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 font-bold'}`}>
                                        {sub.title}
                                      </span>
                                    )}

                                    <button 
                                      onClick={() => convertChecklistItemToSubtask(sub.id, sub.title)}
                                      className="px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                      title="Chuyển mục kiểm tra thành công việc con"
                                    >
                                      Chuyển đổi
                                    </button>

                                    <button onClick={() => deleteSubtask(sub.id)}
                                      aria-label={`Xóa công việc con: ${sub.title}`}
                                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0">
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

                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/[0.08] focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-solid focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-3xs">
                      <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Plus className="w-3 h-3" />
                      </div>
                      <input 
                        ref={newSubtaskInputRef} 
                        value={newSubtaskTitle} 
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                        placeholder={isVietnamese ? "Thêm công việc con mới (nhấn Enter)..." : "Add subtask item (press Enter)..."}
                        className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-none p-0 placeholder:text-slate-400" 
                      />
                      {newSubtaskTitle.trim() && (
                        <button
                          type="button"
                          onClick={addSubtask}
                          className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          {isVietnamese ? "Thêm" : "Add"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div role="tabpanel" id="task-panel-files" aria-labelledby="task-tab-files" hidden={detailTab !== 'files'} className="task-studio-section">{renderAttachmentsSection()}</div>
                  <div role="tabpanel" id="task-panel-activity" aria-labelledby="task-tab-activity" hidden={detailTab !== 'activity'} className="task-studio-section">{renderTimelineFeed()}</div>
                </div>

                {/* Docked Edge Tab to reopen sidebar when collapsed */}
                {!isPropertiesSidebarOpen && (
                  <button
                    type="button"
                    onClick={togglePropertiesSidebar}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center py-3.5 px-1.5 rounded-l-xl bg-white dark:bg-[#1a1a1a] border border-r-0 border-slate-200/80 dark:border-white/10 shadow-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer group"
                    title={isVietnamese ? "Mở thuộc tính công việc (Ctrl+\\)" : "Expand task properties (Ctrl+\\)"}
                  >
                    <PanelRightOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                )}

                {/* Right: Sidebar properties panel (Collapsible) */}
                <AnimatePresence initial={false}>
                  {isPropertiesSidebarOpen && (
                    <motion.div 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'var(--task-sidebar-width)', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="apexa-task-properties w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-white/[0.08] bg-slate-50/40 dark:bg-[#151515] lg:overflow-y-auto text-left relative z-10 custom-scrollbar overflow-x-hidden"
                    >
                      <div className="task-studio-sidebar-content">
                        <div>
                          <div className="flex items-center justify-between mb-2.5 select-none gap-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                              {isVietnamese ? 'Thuộc tính công việc' : 'Task Properties'}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                type="button" 
                                onClick={() => onOpenFieldsPanel ? onOpenFieldsPanel() : setShowAddCustomField(true)} 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 transition-all cursor-pointer shadow-3xs"
                                title={isVietnamese ? "Tùy chỉnh trường & cột (mở bảng bên phải)" : "Customize fields & columns (opens panel on right)"}
                              >
                                <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                                <span>{isVietnamese ? 'Tùy chỉnh' : 'Customize'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={togglePropertiesSidebar}
                                className="p-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                                title={isVietnamese ? 'Thu gọn thuộc tính' : 'Collapse properties'}
                              >
                                <PanelRightClose className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="task-studio-property-list">
                            {renderPropertiesTable()}
                          </div>
                        </div>
                        <div>
                          {renderCustomFieldsAccordion()}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

          </div>
        </motion.div>
      </motion.div>

      {/* Advanced Sharing & Permission Modal */}
      {showShareModal && (
        <ShareSettingsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          targetType="task"
          targetId={task.id}
          targetName={task.title}
          isPrivate={!!task.isPrivate}
          shareSettings={task.shareSettings || {}}
          members={members}
          currentUser={currentUser || members[0] || { name: 'Me' }}
          canEdit={true}
          customShareUrl={createTaskLink()}
          spaceId={task.spaceId}
          onSave={(newIsPrivate, newShareSettings) => {
            onUpdateTask({
              ...task,
              isPrivate: newIsPrivate,
              shareSettings: newShareSettings
            });
            onAddSyncLog?.(`Updated sharing settings for task "${task.title}"`);
          }}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
