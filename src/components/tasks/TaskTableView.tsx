"use client";

import CustomFieldInput from "./CustomFieldInput";
import { compareCustomFieldValues, applyCustomFieldDefaults, validateTaskCustomFields, isEmptyFieldValue } from "@/lib/customFields";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpDown, Pin, MessageSquare, Paperclip, Plus, Check, X, Circle, CheckCircle2, 
  Trophy, Flag, Timer, Pencil, ShieldAlert, ArrowLeft, ArrowRight, Zap, EyeOff, Copy, 
  Trash2, Bot, Sparkles, SlidersHorizontal, Play, Clock, ChevronDown, AlertTriangle, 
  Hourglass, Tag, Mail, Phone, ExternalLink, Maximize2, Table2, LayoutList, ChevronRight,
  Search, Filter, Layers, ListFilter, CornerDownRight, CheckSquare, Calendar
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { fireTaskCompleteConfetti } from '@/lib/confetti';
import { playSuccessSound, playToggleSound } from '@/lib/soundEffects';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
import { Task, User, Workspace, TaskStatus, Priority } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, TeamPillSelect, PremiumDatePicker, DropdownFieldSelect, LabelsFieldSelect } from './TaskSelects';
import { getTaskTeamIds } from '@/lib/teamStore';
import FieldSettingsModal from './FieldSettingsModal';
import SignedImage from '../SignedImage';
import {
  getStoredColumnNames,
  saveColumnNames,
  getStoredStatuses,
  saveStatuses,
  getStoredPriorities,
  savePriorities,
  getStoredCustomFieldsConfig,
  saveCustomFieldsConfig,
  getTailwindColorConfig,
  OptionConfig,
  DATE_FORMAT_PRESETS,
  getStoredDateFormat,
  saveDateFormat,
  DateFormatOption
} from '../../utils/fieldConfig';

const CustomizableHeader = ({ 
  col, 
  label, 
  className = '', 
  sortCol, 
  sortDir, 
  onToggleSort,
  onOpenMenu,
  isSortable = true
}: { 
  col: string; 
  label: string; 
  className?: string; 
  sortCol: string; 
  sortDir: 'asc' | 'desc'; 
  onToggleSort: (col: string) => void;
  onOpenMenu?: (e: React.MouseEvent) => void;
  isSortable?: boolean;
}) => (
  <th 
    onClick={() => isSortable && onToggleSort(col)}
    className={`h-10 px-2.5 sm:px-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#08090d]/95 backdrop-blur-md group/h select-none sticky top-0 z-10 transition-colors ${className}`}
  >
    <div className="flex items-center justify-between gap-1 w-full min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`truncate ${sortCol === col ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""}`}>{label}</span>
        {isSortable && sortCol === col && (
          <span className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-3xs shrink-0">
            <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
          </span>
        )}
      </div>
      {onOpenMenu && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e);
          }}
          aria-label={`Mở menu cột ${label}`}
          className="opacity-70 sm:opacity-0 group-hover/h:opacity-100 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-3xs shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
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
  triggerToast?: (type: 'success' | 'info' | 'comment' | 'warning' | 'error', title: string, desc: string) => void;
  visibleFields: string[];
  customFields: any[];
  onOpenFieldsPanel?: (anchor?: { x: number; y: number; rect?: DOMRect } | React.MouseEvent) => void;
  onStartFocus?: (task: Task) => void;
  setVisibleFields?: React.Dispatch<React.SetStateAction<string[]>>;
  setCustomFields?: React.Dispatch<React.SetStateAction<any[]>>;
  openDialog?: (config: any) => void;
  openPromptModal?: (config: any) => void;
  activeTimerTaskId?: string | null;
  onStartGlobalTimer?: (id: string) => void;
  onStopGlobalTimer?: () => void;
  totalTaskCount?: number;
  isSearchingOrFiltering?: boolean;
  wrapText?: boolean;
  showEmptyStatuses?: boolean;
}

export default function TaskTableView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddTask, onAddSyncLog,
  visibleFields, customFields = [], onOpenFieldsPanel, onStartFocus,
  setVisibleFields, setCustomFields, openDialog, openPromptModal, triggerToast,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer,
  totalTaskCount, isSearchingOrFiltering = false,
  wrapText = false, showEmptyStatuses = true
}: TaskTableViewProps) {
  const { t, locale } = useTranslation();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);

  // Mobile mode: 'table' | 'cards'
  const [mobileMode, setMobileMode] = useState<'table' | 'cards'>('table');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [mobileNewTitle, setMobileNewTitle] = useState('');
  const [mobileSubtaskCardId, setMobileSubtaskCardId] = useState<string | null>(null);
  const [mobileSubtaskDraftTitle, setMobileSubtaskDraftTitle] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);

    const saved = localStorage.getItem('apexa_mobile_table_mode');
    if (saved === 'cards' || saved === 'table') {
      setMobileMode(saved);
    }

    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleMobileScroll = () => {
    const el = tableContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    handleMobileScroll();
    const handleResize = () => handleMobileScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [filteredTasks.length, visibleFields]);

  const handleMobileQuickAdd = () => {
    if (!mobileNewTitle.trim()) return;
    if (onAddTask) {
      const targetWorkspaceId = filteredTasks[0]?.workspaceId || workspaces[0]?.id;
      const targetSpaceId = (filteredTasks[0] as any)?.spaceId;
      const targetListId = (filteredTasks[0] as any)?.listId;
      onAddTask({
        title: mobileNewTitle.trim(),
        description: '',
        status: 'todo',
        priority: 'low',
        workspaceId: targetWorkspaceId,
        spaceId: targetSpaceId,
        listId: targetListId,
        tags: [],
        subtasks: []
      });
      triggerToast?.('success', locale === 'vi' ? 'Đã tạo công việc' : 'Task created', `"${mobileNewTitle.trim()}"`);
      if (onAddSyncLog) onAddSyncLog(`Mobile created task: "${mobileNewTitle.trim()}"`);
    }
    setMobileNewTitle('');
  };

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
    isStandard?: boolean;
  } | null>(null);

  // Dynamic field settings states
  const [columnNames, setColumnNames] = useState<Record<string, string>>({});
  const getColumnLabel = (key: string, fallback: string, vietnamese: string) => {
    if (columnNames[key]) return columnNames[key];
    const translationKey = key === 'title' ? 'taskColumn' : `${key}Column`;
    const translated = t(translationKey);
    if (translated && translated !== translationKey) return translated;
    return locale === 'vi' ? vietnamese : fallback;
  };
  const [statusConfigs, setStatusConfigs] = useState<OptionConfig[]>([]);
  const [priorityConfigs, setPriorityConfigs] = useState<OptionConfig[]>([]);
  const [customConfigs, setCustomConfigs] = useState<Record<string, any>>({});

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingFieldConfig, setEditingFieldConfig] = useState<{
    id: string;
    name: string;
    type: string;
    isStandard: boolean;
    options?: any[];
  } | null>(null);

  const reloadConfigs = () => {
    setColumnNames(getStoredColumnNames());
    setStatusConfigs(getStoredStatuses());
    setPriorityConfigs(getStoredPriorities());
    setCustomConfigs(getStoredCustomFieldsConfig());
  };

  React.useEffect(() => {
    reloadConfigs();
    
    // Add event listener to reload when other views save config
    const handleConfigChange = () => {
      reloadConfigs();
    };
    window.addEventListener('apexa-field-config-changed', handleConfigChange);
    return () => {
      window.removeEventListener('apexa-field-config-changed', handleConfigChange);
    };
  }, []);

  const handleHeaderClick = (e: React.MouseEvent, fieldId: string, fieldType: string, isStandard = true) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Determine options list for this field
    let options: any[] | undefined = undefined;
    if (isStandard) {
      if (fieldId === 'status') options = statusConfigs;
      else if (fieldId === 'priority') options = priorityConfigs;
    } else {
      const cf = customFields.find(c => c.id === fieldId);
      if (cf) {
        const existing = customConfigs[cf.id] || [];
        options = (cf.options || []).map((optLabel: string) => {
          const match = existing.find((ec: any) => ec.label === optLabel);
          return match ? { ...match } : { id: `opt-${Math.random()}`, label: optLabel, color: 'indigo' };
        });
      }
    }

    const menuWidth = 240;
    const margin = 12;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    let menuX = rect.left;
    if (rect.left + menuWidth > viewportWidth - margin) {
      menuX = Math.max(margin, rect.right - menuWidth);
    }
    menuX = Math.min(menuX, viewportWidth - menuWidth - margin);
    menuX = Math.max(margin, menuX);

    const estimatedHeight = 280;
    let menuY = rect.bottom + 4;
    if (menuY + estimatedHeight > viewportHeight - margin) {
      menuY = Math.max(margin, rect.top - estimatedHeight);
    }

    setActiveMenu({
      fieldId,
      fieldName: isStandard ? (columnNames[fieldId] || fieldId) : (customFields.find(cf => cf.id === fieldId)?.name || fieldId),
      fieldType,
      x: menuX,
      y: menuY,
      isStandard
    });
  };
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<TaskStatus>('todo');
  const [draftPriority, setDraftPriority] = useState<Priority | undefined>('medium');
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState<string>('');
  const [draftDueDate, setDraftDueDate] = useState<string>('');
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftCustomFields, setDraftCustomFields] = useState<Record<string, unknown>>({});

  // Quick Filter & Grouping & Subtask Inline States
  type QuickFilterType = 'all' | 'active' | 'overdue' | 'urgent' | 'completed';
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  type GroupByType = 'none' | 'status' | 'priority';
  const [groupBy, setGroupBy] = useState<GroupByType>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const [inlineSubtaskParentId, setInlineSubtaskParentId] = useState<string | null>(null);
  const [draftSubtaskTitle, setDraftSubtaskTitle] = useState('');
  const inlineSubtaskInputRef = useRef<HTMLInputElement>(null);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

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

  const openInlineCreateWithContext = (status?: TaskStatus, priority?: Priority) => {
    if (status) setDraftStatus(status);
    if (priority) setDraftPriority(priority);
    setIsCreatingInline(true);
    setTimeout(() => {
      inlineTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      inlineTitleInputRef.current?.focus();
    }, 40);
  };

  const openInlineSubtaskCreate = (parentId: string) => {
    setInlineSubtaskParentId(parentId);
    setDraftSubtaskTitle('');
    setExpandedTaskIds(prev => prev.includes(parentId) ? prev : [...prev, parentId]);
    setTimeout(() => {
      inlineSubtaskInputRef.current?.focus();
    }, 40);
  };

  const activeFields = visibleFields || ['title', 'status', 'priority', 'assignee', 'startDate', 'dueDate'];

  const toggleSort = (col: string) => {
    if (sortCol === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(col); setSortDir('asc'); }
  };

  // 1. Filter by Quick Filter & in-table search
  const filteredByQuickAndSearch = React.useMemo(() => {
    let list = filteredTasks;

    // Filter by quick chip
    if (quickFilter === 'active') {
      list = list.filter(t => t.status !== 'completed' && (t.status as string) !== 'canceled');
    } else if (quickFilter === 'overdue') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      list = list.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = new Date(t.dueDate.split('T')[0]);
        due.setHours(0, 0, 0, 0);
        return due.getTime() < now.getTime();
      });
    } else if (quickFilter === 'urgent') {
      list = list.filter(t => t.priority === 'urgent' || t.priority === 'high');
    } else if (quickFilter === 'completed') {
      list = list.filter(t => t.status === 'completed');
    }

    // Filter by table search query
    const q = tableSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [filteredTasks, quickFilter, tableSearchQuery]);

  // 2. Comprehensive Sort (all columns supported)
  const sortedTasks = React.useMemo(() => {
    if (!sortCol) return filteredByQuickAndSearch;
    const sorted = [...filteredByQuickAndSearch];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortCol === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortCol === 'status') {
        const sw: Record<string, number> = { todo: 1, inprogress: 2, in_review: 3, review: 3, completed: 4, canceled: 5 };
        return ((sw[a.status] || 99) - (sw[b.status] || 99)) * dir;
      }
      if (sortCol === 'priority') {
        const pw: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return ((pw[a.priority || ''] || 0) - (pw[b.priority || ''] || 0)) * dir;
      }
      if (sortCol === 'assignee') {
        const aId = a.assigneeIds?.[0] || a.assigneeId;
        const bId = b.assigneeIds?.[0] || b.assigneeId;
        const aName = members.find(m => m.id === aId)?.name || '';
        const bName = members.find(m => m.id === bId)?.name || '';
        if (!aName && bName) return 1;
        if (aName && !bName) return -1;
        return aName.localeCompare(bName) * dir;
      }
      if (sortCol === 'space') {
        const aSpace = workspaces.find(w => w.id === a.workspaceId)?.name || '';
        const bSpace = workspaces.find(w => w.id === b.workspaceId)?.name || '';
        return aSpace.localeCompare(bSpace) * dir;
      }
      if (sortCol === 'startDate') {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : (dir === 1 ? Infinity : -Infinity);
        const bTime = b.startDate ? new Date(b.startDate).getTime() : (dir === 1 ? Infinity : -Infinity);
        return (aTime - bTime) * dir;
      }
      if (sortCol === 'dueDate') {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : (dir === 1 ? Infinity : -Infinity);
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : (dir === 1 ? Infinity : -Infinity);
        return (aTime - bTime) * dir;
      }
      if (sortCol === 'progress') return ((a.progress || 0) - (b.progress || 0)) * dir;
      if (sortCol === 'tags') {
        const aTag = a.tags?.[0] || '';
        const bTag = b.tags?.[0] || '';
        return aTag.localeCompare(bTag) * dir;
      }
      const field = customFields.find(cf => cf.name === sortCol);
      if (field) return compareCustomFieldValues(field, a.custom_fields?.[sortCol], b.custom_fields?.[sortCol]) * dir;
      return 0;
    });
    return sorted;
  }, [filteredByQuickAndSearch, sortCol, sortDir, customFields, members, workspaces]);

  const allSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id));
  const completedTaskCount = filteredTasks.filter(task => task.status === 'completed').length;
  const overdueTaskCount = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return filteredTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      const due = new Date(t.dueDate.split('T')[0]);
      due.setHours(0, 0, 0, 0);
      return due.getTime() < now.getTime();
    }).length;
  }, [filteredTasks]);
  const activeTaskCount = filteredTasks.filter(t => t.status !== 'completed' && (t.status as string) !== 'canceled').length;
  const urgentTaskCount = filteredTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
  const visibleCustomFields = customFields.filter(cf => activeFields.includes(cf.name));

  // N-Level Subtasks State & Tree Flattener
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const getProgress = (t: Task) => {
    const children = sortedTasks.filter(c => c.parentId === t.id);
    if (children.length > 0) {
      const completed = children.filter(c => c.status === 'completed').length;
      return Math.round((completed / children.length) * 100);
    }
    return t.progress || 0;
  };

  const hasSubtasksOrChildren = (t: Task) => {
    const hasChildren = sortedTasks.some(c => c.parentId === t.id);
    const hasChecklist = t.subtasks && t.subtasks.length > 0;
    return hasChildren || hasChecklist;
  };

  const buildTreeFromList = React.useCallback((nodes: Task[]) => {
    const buildSubTree = (
      list: Task[],
      parentId: string | undefined = undefined,
      depth = 0
    ): { task: Task; depth: number }[] => {
      const levelNodes = list.filter(n => 
        parentId === undefined 
          ? (!n.parentId || !list.some(parent => parent.id === n.parentId)) 
          : n.parentId === parentId
      );
      
      let result: { task: Task; depth: number }[] = [];
      levelNodes.forEach(node => {
        result.push({ task: node, depth });
        
        const hasChildren = list.some(n => n.parentId === node.id);
        const isExpanded = expandedTaskIds.includes(node.id);
        
        if (hasChildren && isExpanded) {
          const children = buildSubTree(list, node.id, depth + 1);
          result = result.concat(children);
        }
      });
      return result;
    };

    return buildSubTree(nodes);
  }, [expandedTaskIds]);

  const flatTree = React.useMemo(() => {
    return buildTreeFromList(sortedTasks);
  }, [sortedTasks, buildTreeFromList]);

  const statusGroups = React.useMemo(() => {
    const baseList: { id: TaskStatus; label: string; color: string }[] = statusConfigs.length > 0
      ? statusConfigs.map(sc => ({ id: sc.id as TaskStatus, label: sc.label, color: sc.color || 'slate' }))
      : [
          { id: 'todo' as TaskStatus, label: locale === 'vi' ? 'Cần làm' : 'To Do', color: 'slate' },
          { id: 'inprogress' as TaskStatus, label: locale === 'vi' ? 'Đang thực hiện' : 'In Progress', color: 'blue' },
          { id: 'review' as TaskStatus, label: locale === 'vi' ? 'Đang xem xét' : 'In Review', color: 'amber' },
          { id: 'completed' as TaskStatus, label: locale === 'vi' ? 'Hoàn thành' : 'Completed', color: 'emerald' },
        ];

    const extraStatuses = Array.from(new Set(sortedTasks.map(t => t.status))).filter(
      st => !baseList.some(b => b.id === st)
    );
    extraStatuses.forEach(st => {
      baseList.push({ id: st as TaskStatus, label: String(st).toUpperCase(), color: 'zinc' });
    });

    return baseList;
  }, [statusConfigs, sortedTasks, locale]);

  type PriorityGroupId = Priority | 'none';
  const priorityGroups = React.useMemo<{ id: PriorityGroupId; label: string; color: string }[]>(() => [
    { id: 'urgent', label: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', color: 'rose' },
    { id: 'high', label: locale === 'vi' ? 'Cao' : 'High', color: 'amber' },
    { id: 'medium', label: locale === 'vi' ? 'Trung bình' : 'Medium', color: 'blue' },
    { id: 'low', label: locale === 'vi' ? 'Thấp' : 'Low', color: 'slate' },
    { id: 'none', label: locale === 'vi' ? 'Không ưu tiên' : 'No Priority', color: 'zinc' },
  ], [locale]);
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

  const inlineCreatePending = React.useRef(false);
  const inlineTitleInputRef = React.useRef<HTMLInputElement>(null);
  const handleInlineCreate = async (options?: { keepOpen?: boolean; status?: TaskStatus; priority?: Priority }) => {
    const title = draftTitle.trim();
    if (!title) {
      setIsCreatingInline(false);
      resetDrafts();
      return;
    }
    if (!onAddTask || inlineCreatePending.current) return;

    const values = applyCustomFieldDefaults(customFields, draftCustomFields);
    const errors = validateTaskCustomFields(customFields, values, (options?.status || draftStatus) === 'completed');
    if (errors.length) {
      triggerToast?.('info', 'Kiểm tra trường tùy chỉnh', errors.map(error => error.field + ': ' + error.message).join(' '));
      return;
    }
    inlineCreatePending.current = true;
    try {
      const targetWorkspaceId = filteredTasks[0]?.workspaceId || workspaces[0]?.id;
      const targetSpaceId = (filteredTasks[0] as any)?.spaceId;
      const targetListId = (filteredTasks[0] as any)?.listId;

      await onAddTask({
        title,
        description: '',
        priority: options?.priority || draftPriority,
        status: options?.status || draftStatus,
        workspaceId: targetWorkspaceId,
        spaceId: targetSpaceId,
        listId: targetListId,
        assigneeIds: draftAssigneeIds,
        assigneeId: draftAssigneeIds[0] || undefined,
        startDate: draftStartDate || undefined,
        dueDate: draftDueDate || undefined,
        tags: draftTags,
        custom_fields: { ...values, assigneeIds: draftAssigneeIds },
        subtasks: [],
        isPinned: false
      });

      if (typeof window !== 'undefined') {
        (window as any).playSystemSound?.('create');
      }

      triggerToast?.('success', locale === 'vi' ? 'Đã tạo công việc' : 'Task created', `"${title}"`);
      if (onAddSyncLog) onAddSyncLog(`Created task: "${title}"`);

      if (options?.keepOpen) {
        setDraftTitle('');
        setDraftTags([]);
        setDraftCustomFields({});
        setTimeout(() => {
          inlineTitleInputRef.current?.focus();
        }, 20);
      } else {
        resetDrafts();
        setIsCreatingInline(false);
      }
    } catch (error) {
      triggerToast?.('warning', 'Không thể tạo Task', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      inlineCreatePending.current = false;
    }
  };

  const handleInlineCreateSubtask = async (parentId: string, keepOpen = false, customTitle?: string) => {
    const title = (customTitle !== undefined ? customTitle : draftSubtaskTitle).trim();
    if (!title) {
      if (customTitle === undefined) {
        setInlineSubtaskParentId(null);
        setDraftSubtaskTitle('');
      }
      return;
    }
    if (!onAddTask) return;

    const parentTask = filteredTasks.find(t => t.id === parentId);
    try {
      const targetWorkspaceId = parentTask?.workspaceId || filteredTasks[0]?.workspaceId || workspaces[0]?.id;
      const targetSpaceId = (parentTask as any)?.spaceId || (filteredTasks[0] as any)?.spaceId;
      const targetListId = (parentTask as any)?.listId || (filteredTasks[0] as any)?.listId;

      await onAddTask({
        title,
        description: '',
        status: 'todo',
        priority: parentTask?.priority || 'medium',
        workspaceId: targetWorkspaceId,
        spaceId: targetSpaceId,
        listId: targetListId,
        parentId: parentId,
        assigneeIds: parentTask?.assigneeIds || (parentTask?.assigneeId ? [parentTask.assigneeId] : []),
        assigneeId: parentTask?.assigneeId,
        tags: parentTask?.tags || [],
        subtasks: [],
        isPinned: false
      });

      if (typeof window !== 'undefined') {
        (window as any).playSystemSound?.('create');
      }

      setExpandedTaskIds(prev => prev.includes(parentId) ? prev : [...prev, parentId]);
      triggerToast?.('success', locale === 'vi' ? 'Đã thêm việc con' : 'Subtask added', `"${title}"`);
      if (onAddSyncLog) onAddSyncLog(`Created subtask "${title}" for task "${parentTask?.title || parentId}"`);

      if (customTitle !== undefined) {
        setMobileSubtaskDraftTitle('');
        setMobileSubtaskCardId(null);
      } else if (keepOpen) {
        setDraftSubtaskTitle('');
        setTimeout(() => {
          inlineSubtaskInputRef.current?.focus();
        }, 20);
      } else {
        setDraftSubtaskTitle('');
        setInlineSubtaskParentId(null);
      }
    } catch (error) {
      triggerToast?.('warning', 'Không thể tạo việc con', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
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

  const handleSaveFieldSettings = (updated: { name: string; type: string; options?: any[] }) => {
    if (!editingFieldConfig) return;
    const { id, isStandard } = editingFieldConfig;

    if (isStandard) {
      const updatedNames = { ...columnNames, [id]: updated.name };
      setColumnNames(updatedNames);
      saveColumnNames(updatedNames);

      if (id === 'status' && updated.options) {
        setStatusConfigs(updated.options);
        saveStatuses(updated.options);
      } else if (id === 'priority' && updated.options) {
        setPriorityConfigs(updated.options);
        savePriorities(updated.options);
      }
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('apexa-field-config-changed'));
      }
      
      if (onAddSyncLog) onAddSyncLog(`Updated settings for standard field "${id}"`);
    } else {
      if (setCustomFields && customFields) {
        setCustomFields(prev => prev.map(cf => {
          if (cf.id === id) {
            return {
              ...cf,
              name: updated.name,
              type: updated.type,
              ...(updated.options ? { options: updated.options.map(o => o.label) } : {})
            };
          }
          return cf;
        }));
      }

      const oldName = editingFieldConfig.name;
      const newName = updated.name;
      if (oldName !== newName && setVisibleFields) {
        setVisibleFields(prev => prev.map(f => f === oldName ? newName : f));
        
        filteredTasks.forEach(t => {
          const { [oldName]: oldVal, ...rest } = t.custom_fields || {};
          onUpdateTask({
            ...t,
            custom_fields: { ...rest, [newName]: oldVal ?? '' }
          });
        });
      }

      if (updated.options) {
        const nextCustomConfigs = { ...customConfigs, [id]: updated.options };
        setCustomConfigs(nextCustomConfigs);
        saveCustomFieldsConfig(nextCustomConfigs);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('apexa-field-config-changed'));
      }

      if (onAddSyncLog) onAddSyncLog(`Updated settings for custom field "${newName}"`);
    }
  };

  const renderTaskRow = (task: Task, depth: number, index: number) => {
    const isSelected = selectedTaskIds.includes(task.id);
    const daysInfo = getDaysText(task.dueDate);

    return (
      <React.Fragment key={task.id}>
        <tr 
          onClick={() => setSelectedTask(task)}
          className={`cursor-pointer transition-colors duration-150 group/row border-b border-slate-200/50 dark:border-white/[0.04] ${
            isSelected 
              ? 'bg-indigo-50/70 dark:bg-blue-950/40' 
              : 'bg-white dark:bg-[#000000]'
          } hover:bg-slate-50/90 dark:hover:bg-[#090b10]`}
        >
          {/* Merged Sticky Index & Checkbox Column */}
          <td 
            className={`sticky left-0 z-[5] h-11 px-1 sm:px-2 border-b border-slate-200/50 dark:border-white/[0.04] text-center w-8 sm:w-10 ${
              isSelected ? 'bg-indigo-50/90 dark:bg-[#091122]' : 'bg-white/95 dark:bg-[#000000]'
            } group-hover/row:bg-slate-50 dark:group-hover/row:bg-[#090b10] transition-colors`} 
            onClick={e => {
              e.stopPropagation();
              setActiveCellKey(`${task.id}-index`);
            }}
          >
            <div className="relative flex items-center justify-center w-full h-full mx-auto">
              <div className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 sm:opacity-0 sm:group-hover/row:opacity-100'}`}>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  aria-label={`Select ${task.title}`}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    e.stopPropagation();
                    setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id));
                  }}
                  className="w-4 h-4 rounded-md cursor-pointer accent-indigo-600 transition-opacity" 
                />
              </div>
              <span className={`absolute text-xs font-mono font-bold text-slate-400 dark:text-zinc-500 select-none pointer-events-none transition-opacity ${isSelected ? 'opacity-0' : 'opacity-0 sm:opacity-100 sm:group-hover/row:opacity-0'}`}>
                {index + 1}
              </span>
            </div>
          </td>

          {/* Sticky Task Title Column */}
          <td 
            className={`sticky left-8 sm:left-10 z-[5] h-11 px-2 sm:px-3.5 border-b border-slate-200/50 dark:border-white/[0.04] min-w-[140px] max-w-[170px] sm:min-w-[260px] sm:max-w-none ${
              isSelected ? 'bg-indigo-50/90 dark:bg-[#091122]' : 'bg-white/95 dark:bg-[#000000]'
            } group-hover/row:bg-slate-50 dark:group-hover/row:bg-[#090b10] transition-colors ${
              canScrollLeft ? 'border-r border-slate-300/80 dark:border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.06)]' : ''
            } ${
              activeCellKey === `${task.id}-title` ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20 dark:bg-blue-950/20' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCellKey(`${task.id}-title`);
            }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Connector lines for hierarchy */}
              {depth > 0 && (
                <div className="flex items-center shrink-0" style={{ paddingLeft: `${(depth - 1) * 18}px` }}>
                  <div className="relative h-6 w-4 flex items-center justify-center shrink-0">
                    <div className="absolute top-[11px] left-[3px] w-2.5 h-[1.5px] bg-slate-300 dark:bg-slate-700 rounded" />
                    <div className="absolute top-0 bottom-0 left-[3px] w-[1.5px] bg-slate-300 dark:bg-slate-700" />
                  </div>
                </div>
              )}

              {/* Expand/Collapse Chevron */}
              {sortedTasks.some(c => c.parentId === task.id) ? (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskExpand(task.id);
                  }}
                  className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all shrink-0 cursor-pointer"
                  title={expandedTaskIds.includes(task.id) ? "Thu gọn công việc con" : "Mở rộng công việc con"}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedTaskIds.includes(task.id) ? '' : '-rotate-90'}`} />
                </button>
              ) : depth > 0 ? (
                <div className="w-[18px] h-[18px] shrink-0" />
              ) : null}

              {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}

              {/* Complete toggle circle button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                  onUpdateTask({ ...task, status: newStatus as TaskStatus });
                  if (onAddSyncLog) onAddSyncLog(`Toggled completion of task "${task.title}" to: ${newStatus}`);
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
                aria-label={task.status === 'completed' ? `Đánh dấu ${task.title} chưa hoàn thành` : `Đánh dấu ${task.title} hoàn thành`}
                className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  task.status === 'completed'
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                    : 'border-slate-300 dark:border-slate-600 bg-transparent text-transparent hover:border-emerald-500 hover:text-emerald-500'
                }`}
              >
                <Check className={`w-2.5 h-2.5 text-white dark:text-slate-100 transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
              </motion.button>

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
                  className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-2 py-0.5 outline-none focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500/40 shadow-3xs w-full max-w-[280px]" 
                />
              ) : (
                <span 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setInlineEditTaskId(task.id);
                    setInlineEditTitle(task.title);
                  }}
                  className={`text-[12.5px] sm:text-[13px] font-semibold cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${wrapText ? 'whitespace-normal break-words max-w-[420px]' : 'truncate max-w-[85px] sm:max-w-[300px]'} ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}
                  title="Nhấp đúp để đổi tên công việc"
                >
                  {task.title}
                </span>
              )}

              {/* Dependency Badges */}
              {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                <span className="hidden sm:flex bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 items-center gap-1 select-none shrink-0" title="Đang chờ công việc khác hoàn thành">
                  <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                  <span>Đang chờ</span>
                </span>
              )}
              {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                <span className="hidden sm:flex bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 items-center gap-1 select-none shrink-0" title="Đang chặn công việc khác bắt đầu">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Blocking</span>
                </span>
              )}

              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                {/* Maximize task modal */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTask(task);
                  }}
                  className="opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shrink-0"
                  title={locale === 'vi' ? "Mở chi tiết (Task Modal)" : "Open task details"}
                >
                  <Maximize2 className="w-3 h-3" />
                </button>

                {/* Inline Subtask Button */}
                {onAddTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInlineSubtaskCreate(task.id);
                    }}
                    className="opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    title={locale === 'vi' ? "Thêm công việc con" : "Add subtask"}
                  >
                    <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span className="hidden xl:inline">{locale === 'vi' ? 'Việc con' : 'Subtask'}</span>
                  </button>
                )}

                {(task.comments?.length || 0) > 0 && <span className="hidden sm:flex items-center gap-0.5 text-[9px] font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>}
                {(task.attachments?.length || 0) > 0 && <Paperclip className="hidden sm:inline-block w-2.5 h-2.5" />}
                
                {onAddTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTask({
                        ...task,
                        title: `${task.title} (Bản sao)`,
                        subtasks: (task.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
                        tags: task.tags ? [...task.tags] : []
                      });
                      triggerToast?.('success', 'Đã nhân bản', `Đã tạo bản sao cho "${task.title}"`);
                      if (onAddSyncLog) onAddSyncLog(`Duplicated task "${task.title}"`);
                    }}
                    className="hidden sm:inline-flex opacity-0 group-hover/row:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-sky-600 transition-all cursor-pointer"
                    title="Nhân bản công việc"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </td>

          {activeFields.includes('status') && (
            <td
              className={`h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04] ${
                activeCellKey === `${task.id}-status` ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20 dark:bg-blue-950/20' : ''
              }`}
              onClick={e => {
                e.stopPropagation();
                setActiveCellKey(`${task.id}-status`);
              }}
            >
              <StatusPillSelect value={task.status} onChange={newS => {
                onUpdateTask({ ...task, status: newS });
                onAddSyncLog?.(`Status "${task.title}" → ${newS}`);
              }} />
            </td>
          )}

          {activeFields.includes('priority') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
              <PriorityPillSelect value={task.priority} onChange={newP => {
                onUpdateTask({ ...task, priority: newP });
                onAddSyncLog?.(`Priority "${task.title}" → ${newP || 'none'}`);
              }} />
            </td>
          )}

          {activeFields.includes('assignee') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
              <AssigneePillSelect
                value={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])}
                members={members}
                teamIds={getTaskTeamIds(task)}
                onTeamChange={newTeams => {
                  const nextTeams = newTeams || [];
                  onUpdateTask({
                    ...task,
                    teamIds: nextTeams,
                    teamId: nextTeams[0] || undefined,
                    custom_fields: {
                      ...(task.custom_fields || {}),
                      teamIds: nextTeams
                    }
                  });
                }}
                workspaceId={task.workspaceId}
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
                  onAddSyncLog?.(`Assignees "${task.title}" → ${nextIds.length > 0 ? nextIds.map(id => members.find(m => m.id === id)?.name || id).join(', ') : 'Unassigned'}`);
                }}
              />
            </td>
          )}

          {activeFields.includes('space') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]">
              {(() => {
                const ws = task.workspaceId ? workspaces.find(w => w.id === task.workspaceId) : null;
                return ws ? (
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {ws.name}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                );
              })()}
            </td>
          )}

          {activeFields.includes('startDate') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
              <PremiumDatePicker
                startDateValue={task.startDate || ''}
                onStartDateChange={newD => {
                  onUpdateTask({ ...task, startDate: newD || '' });
                  onAddSyncLog?.(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                }}
                dateValue={task.startDate || ''}
                onChange={newD => {
                  onUpdateTask({ ...task, startDate: newD || '' });
                  onAddSyncLog?.(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                }}
                label={locale === 'vi' ? 'Bắt đầu' : 'Start date'}
                align="left"
                taskId={task.id}
                taskTitle={task.title}
                className={
                  task.startDate
                    ? "px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    : "px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-dashed border-slate-300/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all cursor-pointer"
                }
              />
            </td>
          )}

          {activeFields.includes('dueDate') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
              <PremiumDatePicker
                startDateValue={task.startDate || ''}
                onStartDateChange={newD => {
                  onUpdateTask({ ...task, startDate: newD || '' });
                  onAddSyncLog?.(`Start Date "${task.title}" → ${newD || 'Cleared'}`);
                }}
                dateValue={task.dueDate || ''}
                onChange={newD => {
                  onUpdateTask({ ...task, dueDate: newD || '' });
                  onAddSyncLog?.(`Due Date "${task.title}" → ${newD || 'Cleared'}`);
                }}
                label={locale === 'vi' ? 'Hạn chót' : 'Due date'}
                align="left"
                taskId={task.id}
                taskTitle={task.title}
                className={
                  daysInfo
                    ? `px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${daysInfo.cls}`
                    : task.dueDate
                      ? "px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      : "px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-dashed border-slate-300/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all cursor-pointer"
                }
              />
            </td>
          )}

          {activeFields.includes('progress') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]">
              {hasSubtasksOrChildren(task) ? (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${getProgress(task)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{getProgress(task)}%</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
              )}
            </td>
          )}

          {activeFields.includes('tags') && (
            <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]">
              <div className="flex flex-wrap gap-1">
                {task.tags?.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">#{tag}</span>
                ))}
                {(!task.tags || task.tags.length === 0) && <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>}
              </div>
            </td>
          )}

          {/* Custom fields data cells */}
          {visibleCustomFields.map(cf => {
            const val = task.custom_fields?.[cf.name] ?? '';
            return (
              <td key={cf.id} className="h-11 px-3.5 text-left border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
                <CustomFieldInput members={members}
                  field={cf}
                  variant="table"
                  value={val}
                  onChange={newVal => {
                    const updated = { ...(task.custom_fields || {}), [cf.name]: newVal };
                    onUpdateTask({ ...task, custom_fields: updated });
                  }}
                />
              </td>
            );
          })}

          {/* Empty alignment cell for trailing + header */}
          <td className="w-11 h-11 px-2 text-center border-b border-slate-200/50 dark:border-white/[0.04]" />
        </tr>

        {/* Inline Subtask Row */}
        {inlineSubtaskParentId === task.id && (
          <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 border-b border-indigo-200/60 dark:border-indigo-900/40">
            <td className="sticky left-0 z-[5] w-8 sm:w-10 h-10 px-1 sm:px-2 text-center bg-indigo-50/70 dark:bg-[#060810]">
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 mx-auto" />
            </td>
            <td className={`sticky left-8 sm:left-10 z-[5] h-10 px-2 sm:px-3.5 min-w-[140px] max-w-[170px] sm:min-w-[260px] sm:max-w-none bg-indigo-50/70 dark:bg-[#060810] ${canScrollLeft ? 'border-r border-indigo-300/80 dark:border-white/10' : ''}`}>
              <div className="flex items-center gap-2" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
                <input
                  ref={inlineSubtaskInputRef}
                  type="text"
                  autoFocus
                  value={draftSubtaskTitle}
                  onChange={e => setDraftSubtaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInlineCreateSubtask(task.id, !e.shiftKey);
                    } else if (e.key === 'Escape') {
                      setInlineSubtaskParentId(null);
                      setDraftSubtaskTitle('');
                    }
                  }}
                  placeholder={locale === 'vi' ? `Thêm việc con cho "${task.title.slice(0, 16)}..." (Enter để lưu)` : `Add subtask for "${task.title.slice(0, 16)}..." (Enter)`}
                  className="w-full h-7 px-2 text-xs font-medium border border-indigo-300 dark:border-indigo-600/50 rounded-md bg-white dark:bg-[#0a0b12] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 shadow-3xs"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleInlineCreateSubtask(task.id, false)}
                    disabled={!draftSubtaskTitle.trim()}
                    className="h-6 px-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-[10px] cursor-pointer"
                  >
                    {locale === 'vi' ? 'Lưu' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInlineSubtaskParentId(null); setDraftSubtaskTitle(''); }}
                    className="h-6 w-6 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </td>
            <td colSpan={columnCount - 2} className="h-10 px-3.5 text-xs text-slate-400 dark:text-slate-500 bg-indigo-50/70 dark:bg-[#060810]">
              <span className="text-[11px] italic text-slate-400">{locale === 'vi' ? 'Nhấn Enter để lưu và tiếp tục • Shift+Enter để lưu & đóng • Esc để hủy' : 'Enter: save & next • Shift+Enter: save & close • Esc: cancel'}</span>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderInlineCreateRow = (contextStatus?: TaskStatus, contextPriority?: Priority) => {
    return (
      <tr className="h-11 border-b border-indigo-200/70 dark:border-indigo-500/30 bg-indigo-50/25 dark:bg-indigo-950/30 transition-colors">
        <td className="sticky left-0 z-[5] w-8 sm:w-10 h-11 px-1 sm:px-2 text-center border-b border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-50/80 dark:bg-[#060810]">
          <div
            className="w-4.5 h-4.5 rounded-full border-2 border-dashed border-indigo-400 dark:border-indigo-400 text-indigo-500 dark:text-indigo-300 flex items-center justify-center mx-auto transition-colors"
            title={locale === 'vi' ? 'Tạo công việc mới' : 'Create new task'}
          >
            <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
          </div>
        </td>
        <td className={`sticky left-8 sm:left-10 z-[5] h-11 px-2 sm:px-3.5 border-b border-indigo-200/60 dark:border-indigo-500/30 min-w-[140px] max-w-[170px] sm:min-w-[260px] sm:max-w-none bg-indigo-50/80 dark:bg-[#060810] ${canScrollLeft ? 'border-r border-indigo-300/80 dark:border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.06)]' : ''}`}>
          <div className="flex items-center w-full">
            <input
              ref={inlineTitleInputRef}
              type="text"
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    handleInlineCreate({ keepOpen: false, status: contextStatus, priority: contextPriority });
                  } else {
                    handleInlineCreate({ keepOpen: true, status: contextStatus, priority: contextPriority });
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsCreatingInline(false);
                  resetDrafts();
                }
              }}
              placeholder={t('inlineAddTitlePlaceholder') || (locale === 'vi' ? "Nhập tên công việc mới..." : "Enter task title...")}
              title={locale === 'vi' ? "Enter: Lưu & tiếp tục • Shift+Enter: Lưu & đóng • Esc: Hủy" : "Enter: Save & next • Shift+Enter: Save & close • Esc: Cancel"}
              className="w-full h-8 px-2.5 text-xs font-medium border border-indigo-300/80 dark:border-indigo-500/50 rounded-md bg-white dark:bg-[#060812] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-3xs transition-all"
            />
          </div>
        </td>

        {activeFields.includes('status') && (
          <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <StatusPillSelect value={contextStatus || draftStatus} onChange={s => setDraftStatus(s)} />
          </td>
        )}

        {activeFields.includes('priority') && (
          <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <PriorityPillSelect value={contextPriority || draftPriority} onChange={newP => setDraftPriority(newP)} />
          </td>
        )}

        {activeFields.includes('assignee') && (
          <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <AssigneePillSelect
              value={draftAssigneeIds}
              members={members}
              onChange={(val) => setDraftAssigneeIds(val || [])}
            />
          </td>
        )}

        {activeFields.includes('space') && (
          <td className="h-11 px-3.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            {workspaces.length > 0 ? (workspaces.find(w => w.id === 'w2')?.name || workspaces[0].name) : 'Personal Workspace'}
          </td>
        )}

        {activeFields.includes('startDate') && (
          <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <PremiumDatePicker
              startDateValue={draftStartDate}
              onStartDateChange={newD => setDraftStartDate(newD || '')}
              dateValue={draftDueDate}
              onChange={newD => setDraftDueDate(newD || '')}
              label={locale === 'vi' ? 'Bắt đầu' : 'Start date'}
              align="left"
              className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            />
          </td>
        )}

        {activeFields.includes('dueDate') && (
          <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <PremiumDatePicker
              startDateValue={draftStartDate}
              onStartDateChange={newD => setDraftStartDate(newD || '')}
              dateValue={draftDueDate}
              onChange={newD => setDraftDueDate(newD || '')}
              label={locale === 'vi' ? 'Hạn' : 'Due date'}
              align="left"
              className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            />
          </td>
        )}

        {activeFields.includes('progress') && (
          <td className="h-11 px-3.5 text-[11px] text-slate-400 dark:text-slate-500 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">—</td>
        )}

        {activeFields.includes('tags') && (
          <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <div className="flex items-center gap-1.5 h-8 px-2.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all min-w-[110px]">
              <Tag className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={locale === 'vi' ? "Thẻ, VD: bug" : "Tags, e.g. bug"}
                value={draftTags.join(', ')}
                onChange={e => setDraftTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className="w-full text-[11px] font-medium bg-transparent text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
              />
            </div>
          </td>
        )}

        {visibleCustomFields.map(cf => (
          <td key={cf.id} className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
            <CustomFieldInput members={members}
              field={cf}
              variant="table"
              draft
              value={applyCustomFieldDefaults(customFields, draftCustomFields)[cf.name]}
              onChange={newVal => setDraftCustomFields(prev => ({ ...prev, [cf.name]: newVal }))}
            />
          </td>
        ))}

        <td className="h-11 px-3 text-center border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
          <div className="flex items-center gap-1 justify-center">
            <button
              type="button"
              onClick={() => handleInlineCreate({ keepOpen: false, status: contextStatus, priority: contextPriority })}
              disabled={!draftTitle.trim()}
              className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
              title={locale === 'vi' ? 'Lưu công việc (Shift + Enter)' : 'Save task (Shift + Enter)'}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{locale === 'vi' ? 'Lưu' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsCreatingInline(false); resetDrafts(); }}
              className="h-7.5 w-7.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              title={locale === 'vi' ? 'Hủy (Esc)' : 'Cancel (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderMobileCard = (task: Task, depth: number) => {
    const isSelected = selectedTaskIds.includes(task.id);
    const daysInfo = getDaysText(task.dueDate);

    return (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className={`p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.99] ${
          isSelected
            ? 'bg-indigo-50/90 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-600/50 shadow-xs'
            : 'bg-white dark:bg-[#0a0b10] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 shadow-3xs'
        }`}
        style={{ marginLeft: depth > 0 ? `${depth * 14}px` : undefined }}
      >
        {/* Top Row: Checkbox, Complete toggle, Title, Maximize button */}
        <div className="flex items-start gap-2.5">
          {/* Checkbox */}
          <div className="pt-0.5" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              aria-label={`Select ${task.title}`}
              onChange={e => {
                e.stopPropagation();
                setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id));
              }}
              className="w-4.5 h-4.5 rounded-md cursor-pointer accent-indigo-600 transition-all"
            />
          </div>

          {/* Complete check circle */}
          <div className="pt-0.5" onClick={e => e.stopPropagation()}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={(e) => {
                e.stopPropagation();
                const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                onUpdateTask({ ...task, status: newStatus as TaskStatus });
                if (onAddSyncLog) onAddSyncLog(`Toggled completion: ${newStatus}`);
                if (newStatus === 'completed') {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  fireTaskCompleteConfetti({
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight,
                  });
                  playSuccessSound();
                } else {
                  playToggleSound();
                }
              }}
              aria-label={task.status === 'completed' ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                task.status === 'completed'
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                  : 'border-slate-300 dark:border-slate-600 bg-transparent text-transparent hover:border-emerald-500'
              }`}
            >
              <Check className={`w-3 h-3 text-white transition-transform ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
            </motion.button>
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
              <h4 className={`text-[13.5px] font-bold leading-snug break-words ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-slate-100'}`}>
                {task.title}
              </h4>
            </div>
            {task.description && (
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 line-clamp-1 mt-0.5">
                {task.description}
              </p>
            )}
          </div>

          {/* Maximize modal button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTask(task);
            }}
            className="p-1.5 rounded-lg bg-slate-100/70 dark:bg-white/[0.06] text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 cursor-pointer active:scale-90"
            title={locale === 'vi' ? "Mở chi tiết công việc" : "Open task details"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Middle Row: Status, Priority, Assignee, Due Date */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex flex-wrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {activeFields.includes('status') && (
            <div className="shrink-0">
              <StatusPillSelect value={task.status} onChange={newS => {
                onUpdateTask({ ...task, status: newS });
                onAddSyncLog?.(`Status "${task.title}" → ${newS}`);
              }} />
            </div>
          )}

          {activeFields.includes('priority') && (
            <div className="shrink-0">
              <PriorityPillSelect value={task.priority} onChange={newP => {
                onUpdateTask({ ...task, priority: newP });
                onAddSyncLog?.(`Priority "${task.title}" → ${newP || 'none'}`);
              }} />
            </div>
          )}

          {activeFields.includes('assignee') && (
            <div className="shrink-0">
              <AssigneePillSelect
                value={task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : [])}
                members={members}
                teamIds={getTaskTeamIds(task)}
                workspaceId={task.workspaceId}
                onChange={newIds => {
                  const nextIds = newIds || [];
                  onUpdateTask({
                    ...task,
                    assigneeIds: nextIds,
                    assigneeId: nextIds[0] || undefined,
                  });
                }}
              />
            </div>
          )}

          {activeFields.includes('dueDate') && (
            <div className="shrink-0 ml-auto">
              <PremiumDatePicker
                startDateValue={task.startDate || ''}
                onStartDateChange={newD => onUpdateTask({ ...task, startDate: newD || '' })}
                dateValue={task.dueDate || ''}
                onChange={newD => onUpdateTask({ ...task, dueDate: newD || '' })}
                label={locale === 'vi' ? 'Hạn' : 'Due'}
                align="right"
                taskId={task.id}
                taskTitle={task.title}
                className={
                  daysInfo
                    ? `px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${daysInfo.cls}`
                    : task.dueDate
                      ? "px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                      : "px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 dark:text-slate-500 border border-dashed border-slate-300/80 dark:border-slate-800"
                }
              />
            </div>
          )}
        </div>

        {/* Checklist / Subtasks Section on Card */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04] space-y-1" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-zinc-500 mb-1">
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-indigo-500" />
                <span>Việc con ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})</span>
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">{getProgress(task)}%</span>
            </div>
            {task.subtasks.map(sub => (
              <label
                key={sub.id}
                className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer text-xs transition-colors"
              >
                <input
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => {
                    const updated = (task.subtasks || []).map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                    onUpdateTask({ ...task, subtasks: updated });
                  }}
                  className="w-3.5 h-3.5 rounded cursor-pointer accent-indigo-600"
                />
                <span className={`flex-1 break-words ${sub.completed ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-700 dark:text-slate-200'}`}>
                  {sub.title}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Mobile Subtask Quick Add on Card */}
        {mobileSubtaskCardId === task.id ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={mobileSubtaskDraftTitle}
              onChange={e => setMobileSubtaskDraftTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleInlineCreateSubtask(task.id, false, mobileSubtaskDraftTitle);
                if (e.key === 'Escape') setMobileSubtaskCardId(null);
              }}
              placeholder={locale === 'vi' ? 'Tên việc con...' : 'Subtask title...'}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-600/50 bg-white dark:bg-zinc-850 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={() => handleInlineCreateSubtask(task.id, false, mobileSubtaskDraftTitle)}
              disabled={!mobileSubtaskDraftTitle.trim()}
              className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
            >
              {locale === 'vi' ? 'Lưu' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setMobileSubtaskCardId(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between text-[11px] pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSubtaskCardId(task.id);
                setMobileSubtaskDraftTitle('');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>{locale === 'vi' ? 'Thêm việc con' : 'Add subtask'}</span>
            </button>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500">
              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {task.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400 font-medium">#{tag}</span>
                  ))}
                </div>
              )}
              {task.comments && task.comments.length > 0 && (
                <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{task.comments.length}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroupHeaderRow = (
    groupId: string,
    title: string,
    count: number,
    color: string,
    onAddClick?: () => void
  ) => {
    const isCollapsed = collapsedGroups.includes(groupId);
    return (
      <tr
        key={`group-${groupId}`}
        className="bg-slate-100/80 dark:bg-[#0c0e14] border-y border-slate-200/80 dark:border-white/[0.06] select-none"
      >
        <td
          colSpan={columnCount}
          className="py-2 px-3 sm:px-4 text-xs font-bold text-slate-700 dark:text-slate-200"
        >
          <div className="flex items-center justify-between">
            <div
              onClick={() => toggleGroupCollapse(groupId)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  color === 'rose'
                    ? 'bg-rose-500'
                    : color === 'amber'
                    ? 'bg-amber-500'
                    : color === 'blue'
                    ? 'bg-blue-500'
                    : color === 'emerald'
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className="font-extrabold text-[13px]">{title}</span>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold">
                {count}
              </span>
            </div>

            {onAddClick && onAddTask && (
              <button
                type="button"
                onClick={onAddClick}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors"
                title={locale === 'vi' ? 'Thêm công việc vào nhóm này' : 'Add task to this group'}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>{locale === 'vi' ? 'Thêm việc' : 'Add task'}</span>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-transparent select-none">
      {/* Table & View Control Toolbar */}
      <div className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Quick Filters & Search */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-zinc-850 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{locale === 'vi' ? 'Tất cả' : 'All'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quickFilter === 'all' ? 'bg-white/20 dark:bg-black/20' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400'}`}>
                {filteredTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('active')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'active'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-850 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{locale === 'vi' ? 'Đang làm' : 'Active'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quickFilter === 'active' ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400'}`}>
                {activeTaskCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('overdue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-850 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className={overdueTaskCount > 0 && quickFilter !== 'overdue' ? 'text-rose-600 dark:text-rose-400' : ''}>
                {locale === 'vi' ? 'Quá hạn' : 'Overdue'}
              </span>
              {overdueTaskCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quickFilter === 'overdue' ? 'bg-white/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold'}`}>
                  {overdueTaskCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('urgent')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'urgent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-850 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className={urgentTaskCount > 0 && quickFilter !== 'urgent' ? 'text-amber-600 dark:text-amber-400' : ''}>
                {locale === 'vi' ? 'Khẩn cấp' : 'Urgent'}
              </span>
              {urgentTaskCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quickFilter === 'urgent' ? 'bg-white/20' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-extrabold'}`}>
                  {urgentTaskCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-850 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{locale === 'vi' ? 'Đã xong' : 'Done'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quickFilter === 'completed' ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400'}`}>
                {completedTaskCount}
              </span>
            </button>
          </div>

          {/* Quick Search inside Table */}
          <div className="relative flex items-center min-w-[130px] sm:min-w-[170px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={tableSearchQuery}
              onChange={e => setTableSearchQuery(e.target.value)}
              placeholder={locale === 'vi' ? 'Tìm trong bảng...' : 'Search in table...'}
              className="w-full pl-8 pr-7 py-1 text-xs font-medium rounded-lg bg-white dark:bg-zinc-850 border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {tableSearchQuery && (
              <button
                type="button"
                onClick={() => setTableSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Group By & Mode Toggles & Add Task */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Group By selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-850 border border-slate-200/80 dark:border-white/[0.08] rounded-lg p-0.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 pl-1.5 hidden sm:flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{locale === 'vi' ? 'Nhóm:' : 'Group:'}</span>
            </span>
            <button
              type="button"
              onClick={() => setGroupBy('none')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                groupBy === 'none'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              title={locale === 'vi' ? 'Không nhóm' : 'No grouping'}
            >
              {locale === 'vi' ? 'Không' : 'None'}
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('status')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                groupBy === 'status'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              title={locale === 'vi' ? 'Nhóm theo trạng thái' : 'Group by status'}
            >
              {locale === 'vi' ? 'Trạng thái' : 'Status'}
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('priority')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                groupBy === 'priority'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              title={locale === 'vi' ? 'Nhóm theo mức ưu tiên' : 'Group by priority'}
            >
              {locale === 'vi' ? 'Ưu tiên' : 'Priority'}
            </button>
          </div>

          {/* Mobile Table/Cards Toggle (on small screens) */}
          <div className="md:hidden flex items-center bg-slate-200/70 dark:bg-white/[0.06] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMobileMode('table');
                localStorage.setItem('apexa_mobile_table_mode', 'table');
              }}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                mobileMode === 'table' ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-3xs' : 'text-slate-500'
              }`}
              title={locale === 'vi' ? 'Chế độ Bảng' : 'Table mode'}
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMode('cards');
                localStorage.setItem('apexa_mobile_table_mode', 'cards');
              }}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                mobileMode === 'cards' ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-3xs' : 'text-slate-500'
              }`}
              title={locale === 'vi' ? 'Chế độ Thẻ gọn' : 'Cards mode'}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick "+ Thêm việc" button in toolbar */}
          {onAddTask && (
            <button
              type="button"
              onClick={() => {
                if (mobileMode === 'cards' && isMobileScreen) {
                  document.getElementById('mobile-quick-task-input')?.focus();
                } else {
                  setIsCreatingInline(true);
                  setTimeout(() => inlineTitleInputRef.current?.focus(), 20);
                }
              }}
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">{locale === 'vi' ? 'Thêm công việc' : 'Add Task'}</span>
            </button>
          )}
        </div>
      </div>

      {mobileMode === 'cards' && isMobileScreen ? (
        /* Mobile Card View Mode */
        <div className="flex-1 flex flex-col p-3 space-y-2.5 overflow-y-auto">
          {sortedTasks.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t('noTasksYet') || (locale === 'vi' ? 'Chưa có công việc nào' : 'No tasks in this list')}
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                {locale === 'vi' ? 'Bắt đầu bằng cách tạo công việc đầu tiên bên dưới.' : 'Start by adding a task below.'}
              </p>
              {(quickFilter !== 'all' || tableSearchQuery) && (
                <button
                  type="button"
                  onClick={() => { setQuickFilter('all'); setTableSearchQuery(''); }}
                  className="mt-3 px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400"
                >
                  {locale === 'vi' ? 'Xóa bộ lọc' : 'Clear filter'}
                </button>
              )}
            </div>
          ) : groupBy === 'status' ? (
            statusGroups.map(status => {
              const groupTasks = sortedTasks.filter(t => t.status === status.id);
              if (groupTasks.length === 0 && !showEmptyStatuses) return null;
              const isCollapsed = collapsedGroups.includes(status.id);
              const tree = buildTreeFromList(groupTasks);

              return (
                <div key={status.id} className="space-y-2">
                  <div
                    onClick={() => toggleGroupCollapse(status.id)}
                    className="flex items-center justify-between py-1 px-1.5 cursor-pointer text-xs font-extrabold text-slate-700 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{status.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 text-[10px] text-slate-500">{groupTasks.length}</span>
                    </div>
                  </div>
                  {!isCollapsed && tree.map(({ task, depth }) => renderMobileCard(task, depth))}
                </div>
              );
            })
          ) : groupBy === 'priority' ? (
            priorityGroups.map(priority => {
              const groupTasks = sortedTasks.filter(t => 
                priority.id === 'none' ? !t.priority : t.priority === priority.id
              );
              if (groupTasks.length === 0 && !showEmptyStatuses) return null;
              const isCollapsed = collapsedGroups.includes(priority.id);
              const tree = buildTreeFromList(groupTasks);

              return (
                <div key={priority.id} className="space-y-2">
                  <div
                    onClick={() => toggleGroupCollapse(priority.id)}
                    className="flex items-center justify-between py-1 px-1.5 cursor-pointer text-xs font-extrabold text-slate-700 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>{priority.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 text-[10px] text-slate-500">{groupTasks.length}</span>
                    </div>
                  </div>
                  {!isCollapsed && tree.map(({ task, depth }) => renderMobileCard(task, depth))}
                </div>
              );
            })
          ) : (
            flatTree.map(({ task, depth }) => renderMobileCard(task, depth))
          )}

          {/* Mobile Bottom Quick Add Task Bar */}
          {onAddTask && (
            <div className="mt-2 p-2.5 rounded-2xl bg-white dark:bg-[#0a0b10] border border-dashed border-indigo-300 dark:border-indigo-600/40 shadow-xs flex items-center gap-2">
              <input
                id="mobile-quick-task-input"
                type="text"
                value={mobileNewTitle}
                onChange={e => setMobileNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleMobileQuickAdd();
                }}
                placeholder={locale === 'vi' ? 'Thêm công việc nhanh...' : 'Quick add task...'}
                className="flex-1 bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none px-1"
              />
              <button
                type="button"
                onClick={handleMobileQuickAdd}
                disabled={!mobileNewTitle.trim()}
                className="h-7 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{locale === 'vi' ? 'Thêm' : 'Add'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Render Responsive Table View */
        <div 
          ref={tableContainerRef}
          onScroll={handleMobileScroll}
          className="overflow-x-auto custom-touch-scroll flex-1 relative"
        >
          {/* Scroll hint on mobile right edge */}
          {canScrollRight && (
            <div className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/15 dark:from-black/50 to-transparent z-30 flex items-center justify-end pr-1">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-zinc-300 animate-pulse" />
            </div>
          )}
        <table className="apexa-task-table w-full min-w-[720px] sm:min-w-[900px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="bg-slate-50/90 dark:bg-[#08090d]/95">
            {/* Merged Checkbox & Index # Column */}
            <th className="sticky left-0 top-0 z-20 w-8 sm:w-10 h-10 px-1 sm:px-2 border-b border-slate-200/70 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#08090d]/95 backdrop-blur-md text-center group/th select-none">
              <div className="relative flex items-center justify-center w-full h-full">
                {/* Checkbox visible on hover or when any tasks are selected */}
                <div className={`transition-opacity ${selectedTaskIds.length > 0 ? 'opacity-100' : 'opacity-80 sm:opacity-0 group-hover/th:opacity-100'}`}>
                  <input 
                    type="checkbox" 
                    ref={el => { if (el) el.indeterminate = selectedTaskIds.length > 0 && !allSelected; }}
                    checked={allSelected}
                    aria-label="Chọn tất cả công việc"
                    onChange={e => { if (e.target.checked) setSelectedTaskIds(sortedTasks.map(t => t.id)); else setSelectedTaskIds([]); }}
                    className="w-4 h-4 rounded-md cursor-pointer accent-indigo-600 transition-all" 
                  />
                </div>
                {/* # symbol visible when not hovering and no tasks selected */}
                <span className={`absolute text-[11px] font-bold text-slate-400 dark:text-slate-500 pointer-events-none transition-opacity ${selectedTaskIds.length > 0 ? 'opacity-0' : 'opacity-0 sm:opacity-100 group-hover/th:opacity-0'}`}>
                  #
                </span>
              </div>
            </th>

            {/* Task Name is always visible and first */}
            <CustomizableHeader 
              col="title" 
              label={getColumnLabel('title', 'Task', 'Công việc')}
              className={`min-w-[140px] max-w-[170px] sm:min-w-[260px] sm:max-w-none sticky left-8 sm:left-10 z-20 bg-slate-50/90 dark:bg-[#08090d]/95 backdrop-blur-md ${canScrollLeft ? 'border-r border-slate-300/80 dark:border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.06)]' : ''}`} 
              sortCol={sortCol} 
              sortDir={sortDir} 
              onToggleSort={toggleSort}
              onOpenMenu={(e) => handleHeaderClick(e, 'title', 'text')}
            />
            
            {activeFields.includes('status') && (
              <CustomizableHeader 
                col="status" 
                label={getColumnLabel('status', 'Status', 'Trạng thái')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort} 
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'status', 'dropdown')}
              />
            )}
            {activeFields.includes('priority') && (
              <CustomizableHeader 
                col="priority" 
                label={getColumnLabel('priority', 'Priority', 'Ưu tiên')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'priority', 'dropdown')}
              />
            )}
            {activeFields.includes('assignee') && (
              <CustomizableHeader 
                col="assignee" 
                label={getColumnLabel('assignee', 'Assignee', 'Người phụ trách')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort} 
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'assignee', 'people')}
              />
            )}
            {activeFields.includes('space') && (
              <CustomizableHeader 
                col="space" 
                label={getColumnLabel('space', 'Space', 'Không gian')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort} 
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'space', 'space')}
              />
            )}
            {activeFields.includes('startDate') && (
              <CustomizableHeader 
                col="startDate" 
                label={getColumnLabel('startDate', 'Start Date', 'Ngày bắt đầu')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'startDate', 'date')}
              />
            )}
            {activeFields.includes('dueDate') && (
              <CustomizableHeader 
                col="dueDate" 
                label={getColumnLabel('dueDate', 'Due Date', 'Hạn chót')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'dueDate', 'date')}
              />
            )}
            {activeFields.includes('progress') && (
              <CustomizableHeader 
                col="progress" 
                label={getColumnLabel('progress', 'Progress', 'Tiến độ')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'progress', 'progress')}
              />
            )}
            {activeFields.includes('tags') && (
              <CustomizableHeader 
                col="tags" 
                label={getColumnLabel('tags', 'Tags', 'Nhãn')}
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort} 
                isSortable={true}
                onOpenMenu={(e) => handleHeaderClick(e, 'tags', 'labels')}
              />
            )}

            {/* Custom fields headers */}
            {visibleCustomFields.map(cf => (
              <CustomizableHeader 
                key={cf.id}
                col={cf.name} 
                label={cf.name} 
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                onOpenMenu={(e) => handleHeaderClick(e, cf.id, cf.type, false)}
              />
            ))}

            {/* Plus button at the end to add field */}
            <th className="sticky top-0 z-10 w-11 h-10 px-2 text-center border-b border-slate-200/70 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#08090d]/95 backdrop-blur-md">
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onOpenFieldsPanel?.({ x: rect.left, y: rect.bottom, rect });
                }}
                aria-label="Thêm trường bảng"
                className="bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center w-6 h-6 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="Thêm trường"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="py-14 px-6 text-center border-b border-slate-200/50 dark:border-white/[0.04]">
                <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                  {tableSearchQuery || quickFilter !== 'all' || isSearchingOrFiltering ? (
                    <>
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                        <SlidersHorizontal className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {locale === 'vi' ? 'Không tìm thấy công việc phù hợp' : 'No matching tasks found'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                        {locale === 'vi' ? 'Thử xóa bộ lọc nhanh hoặc từ khóa tìm kiếm.' : 'Try resetting your filter or search query.'}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickFilter('all');
                            setTableSearchQuery('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all shadow-3xs hover:shadow-xs"
                        >
                          {locale === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
                        </button>
                        {onAddTask && (
                          <button
                            type="button"
                            onClick={() => setIsCreatingInline(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition-all shadow-3xs hover:shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{locale === 'vi' ? 'Thêm công việc' : 'Add task'}</span>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 ring-1 ring-indigo-500/20">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t('noTasksYet') || (locale === 'vi' ? 'Chưa có công việc nào trong danh sách' : 'No tasks in this list yet')}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                        {t('noTasksYetDesc') || (locale === 'vi' ? 'Bắt đầu bằng cách tạo công việc đầu tiên bên dưới.' : 'Get started by creating your first task below.')}
                      </p>
                      {onAddTask && (
                        <button
                          type="button"
                          onClick={() => setIsCreatingInline(true)}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{t('createFirstTask') || (locale === 'vi' ? 'Tạo công việc đầu tiên' : 'Create First Task')}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : groupBy === 'status' ? (
            statusGroups.map(status => {
              const groupTasks = sortedTasks.filter(t => t.status === status.id);
              if (groupTasks.length === 0 && !showEmptyStatuses) return null;
              const isCollapsed = collapsedGroups.includes(status.id);
              const tree = buildTreeFromList(groupTasks);

              return (
                <React.Fragment key={status.id}>
                  {renderGroupHeaderRow(
                    status.id,
                    status.label,
                    groupTasks.length,
                    status.color,
                    () => openInlineCreateWithContext(status.id)
                  )}
                  {!isCollapsed && (
                    <>
                      {tree.map(({ task, depth }, index) => renderTaskRow(task, depth, index))}
                      {isCreatingInline && draftStatus === status.id && renderInlineCreateRow(status.id)}
                    </>
                  )}
                </React.Fragment>
              );
            })
          ) : groupBy === 'priority' ? (
            priorityGroups.map(priority => {
              const groupTasks = sortedTasks.filter(t => 
                priority.id === 'none' ? !t.priority : t.priority === priority.id
              );
              if (groupTasks.length === 0 && !showEmptyStatuses) return null;
              const isCollapsed = collapsedGroups.includes(priority.id);
              const tree = buildTreeFromList(groupTasks);

              return (
                <React.Fragment key={priority.id}>
                  {renderGroupHeaderRow(
                    priority.id,
                    priority.label,
                    groupTasks.length,
                    priority.color,
                    () => openInlineCreateWithContext(undefined, priority.id === 'none' ? undefined : (priority.id as Priority))
                  )}
                  {!isCollapsed && (
                    <>
                      {tree.map(({ task, depth }, index) => renderTaskRow(task, depth, index))}
                      {isCreatingInline && (priority.id === 'none' ? !draftPriority : draftPriority === priority.id) && (
                        renderInlineCreateRow(undefined, priority.id === 'none' ? undefined : (priority.id as Priority))
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            // groupBy === 'none'
            <>
              {flatTree.map(({ task, depth }, index) => renderTaskRow(task, depth, index))}
              {isCreatingInline && renderInlineCreateRow()}
              {!isCreatingInline && onAddTask && (
                <tr
                  onClick={() => {
                    setIsCreatingInline(true);
                    setTimeout(() => inlineTitleInputRef.current?.focus(), 20);
                  }}
                  className="h-10 border-b border-dashed border-slate-200/80 dark:border-white/[0.06] hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors group/new"
                >
                  <td className="sticky left-0 z-[5] w-8 sm:w-10 h-10 px-1 sm:px-2 text-center bg-white/95 dark:bg-[#000000] group-hover/new:bg-indigo-50/40 dark:group-hover/new:bg-indigo-950/20 transition-colors">
                    <Plus className="w-4 h-4 mx-auto text-slate-400 group-hover/new:text-indigo-600 dark:group-hover/new:text-indigo-400 transition-colors" />
                  </td>
                  <td colSpan={columnCount - 1} className="h-10 px-3.5 text-xs font-semibold text-slate-400 group-hover/new:text-indigo-600 dark:group-hover/new:text-indigo-400 transition-colors">
                    + {locale === 'vi' ? 'Thêm công việc mới...' : 'Add new task...'}
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
      </div>
      )}


      {activeMenu && (
        <Portal>
          <div className="fixed inset-0 z-[190] cursor-default" onClick={() => setActiveMenu(null)} />
          <div 
            className="fixed z-[200] w-[230px] max-w-[calc(100vw-24px)] bg-white dark:bg-[#0a0b10] border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 font-sans text-xs select-none backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 animate-fadeIn"
            style={{ top: activeMenu.y, left: activeMenu.x }}
          >
            {/* Sort options (where applicable) */}
            {activeMenu.fieldId !== 'assignee' && activeMenu.fieldId !== 'space' && activeMenu.fieldId !== 'tags' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    toggleSort(activeMenu.fieldId);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 shrink-0" />
                  <span>Sắp xếp (Sort)</span>
                </button>
                <div className="border-t border-slate-100 dark:border-white/10 my-1" />
              </>
            )}

            {activeMenu.isStandard ? (
              // Standard Columns Menu
              <>
                <button
                  type="button"
                  onClick={() => {
                    const oldName = activeMenu.fieldName;
                    const fieldId = activeMenu.fieldId;
                    setActiveMenu(null);
                    if (openPromptModal) {
                      openPromptModal({
                        type: 'rename',
                        title: 'Đổi tên cột',
                        subtitle: `Cột: ${fieldId}`,
                        defaultValue: oldName,
                        placeholder: 'Nhập tên cột mới...',
                        confirmText: 'Lưu thay đổi',
                        onConfirm: (newName: string) => {
                          if (newName?.trim() && newName.trim() !== oldName) {
                            const nextNames = { ...columnNames, [fieldId]: newName.trim() };
                            setColumnNames(nextNames);
                            saveColumnNames(nextNames);
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new Event('apexa-field-config-changed'));
                            }
                            if (onAddSyncLog) onAddSyncLog(`Renamed column "${fieldId}" to "${newName.trim()}"`);
                          }
                        }
                      });
                    } else {
                      const newName = prompt(`Rename standard column "${fieldId}":`, oldName);
                      if (newName?.trim() && newName.trim() !== oldName) {
                        const nextNames = { ...columnNames, [fieldId]: newName.trim() };
                        setColumnNames(nextNames);
                        saveColumnNames(nextNames);
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new Event('apexa-field-config-changed'));
                        }
                        if (onAddSyncLog) onAddSyncLog(`Renamed column "${fieldId}" to "${newName.trim()}"`);
                      }
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 shrink-0" />
                  <span>Đổi tên cột</span>
                </button>

                {(activeMenu.fieldId === 'status' || activeMenu.fieldId === 'priority') && (
                  <button
                    type="button"
                    onClick={() => {
                      let options: any[] = [];
                      if (activeMenu.fieldId === 'status') options = statusConfigs;
                      else if (activeMenu.fieldId === 'priority') options = priorityConfigs;
                      
                      setEditingFieldConfig({
                        id: activeMenu.fieldId,
                        name: activeMenu.fieldName,
                        type: 'dropdown',
                        isStandard: true,
                        options
                      });
                      setShowSettingsModal(true);
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Cấu hình tùy chọn</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (setVisibleFields) {
                      setVisibleFields(prev => prev.filter(f => f !== activeMenu.fieldId));
                      if (onAddSyncLog) onAddSyncLog(`Hid column "${activeMenu.fieldId}"`);
                    }
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 shrink-0" />
                  <span>Ẩn cột</span>
                </button>
              </>
            ) : (
              // Field changes are managed against the whole Space, independent of table filters.
              <>
                <button type="button" onClick={() => { setActiveMenu(null); onOpenFieldsPanel?.(); }} className="w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
                  {locale === 'vi' ? 'Quản lý trường trong Space' : 'Manage Space fields'}
                </button>
                <button type="button" onClick={() => { setVisibleFields?.(prev => prev.filter(name => name !== activeMenu.fieldName)); setActiveMenu(null); }} className="w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
                  {locale === 'vi' ? 'Ẩn cột trong chế độ xem này' : 'Hide column in this view'}
                </button>
              </>
            )}

            {activeMenu.isStandard && activeMenu.fieldType === 'date' && (
              <>
                <div className="border-t border-slate-100 dark:border-white/10 my-1" />
                <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Định dạng ngày</span>
                </div>
                <div className="space-y-0.5">
                  {DATE_FORMAT_PRESETS.map(preset => {
                    const isActive = getStoredDateFormat() === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          saveDateFormat(preset.id);
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('apexa-field-config-changed'));
                          }
                          if (onAddSyncLog) onAddSyncLog(`Changed date format to: "${preset.label}"`);
                          setActiveMenu(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-500/30 shadow-xs' 
                            : 'text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="text-xs">{preset.label}</span>
                        <span className={`text-[10px] tabular-nums ${isActive ? 'text-blue-600 dark:text-blue-300 font-bold' : 'text-slate-400 dark:text-slate-400 font-medium'}`}>
                          ({preset.sample})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

          </div>
        </Portal>
      )}

      {/* Field Settings Modal */}
      {showSettingsModal && editingFieldConfig && (
        <FieldSettingsModal
          config={editingFieldConfig}
          onClose={() => {
            setShowSettingsModal(false);
            setEditingFieldConfig(null);
          }}
          onSave={handleSaveFieldSettings}
        />
      )}
    </div>
  );
}
