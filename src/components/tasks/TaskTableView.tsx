"use client";

import CustomFieldInput from "./CustomFieldInput";
import { compareCustomFieldValues, applyCustomFieldDefaults, validateTaskCustomFields } from "@/lib/customFields";

import React, { useState } from 'react';
import { ArrowUpDown, Pin, MessageSquare, Paperclip, Plus, Check, X, Circle, CheckCircle2, Trophy, Flag, Timer, Pencil, ShieldAlert, ArrowLeft, ArrowRight, Zap, EyeOff, Copy, Trash2, Bot, Sparkles, SlidersHorizontal, Play, Clock, ChevronDown, AlertTriangle, Hourglass, Tag, Mail, Phone, ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
import { Task, User, Workspace, TaskStatus } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, DropdownFieldSelect, LabelsFieldSelect } from './TaskSelects';
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
    className={`h-10 px-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/[0.06] bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-md group/h select-none sticky top-0 z-10 transition-colors ${className}`}
  >
    <div className="flex items-center justify-between gap-1 w-full">
      <div className="flex items-center gap-1.5">
        <span className={sortCol === col ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""}>{label}</span>
        {isSortable && sortCol === col && (
          <span className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-3xs">
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
          className="opacity-0 group-hover/h:opacity-100 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-3xs"
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
}

export default function TaskTableView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddTask, onAddSyncLog,
  visibleFields, customFields = [], onOpenFieldsPanel, onStartFocus,
  setVisibleFields, setCustomFields, openDialog, openPromptModal, triggerToast,
  activeTimerTaskId = null, onStartGlobalTimer, onStopGlobalTimer,
  totalTaskCount, isSearchingOrFiltering = false
}: TaskTableViewProps) {
  const { t, locale } = useTranslation();
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

    setActiveMenu({
      fieldId,
      fieldName: isStandard ? (columnNames[fieldId] || fieldId) : (customFields.find(cf => cf.id === fieldId)?.name || fieldId),
      fieldType,
      x: rect.left,
      y: rect.bottom,
      isStandard
    });
  };
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
  const [draftCustomFields, setDraftCustomFields] = useState<Record<string, unknown>>({});

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

  const activeFields = visibleFields || ['title', 'status', 'priority', 'assignee', 'startDate', 'dueDate'];

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
      const field = customFields.find(cf => cf.name === sortCol);
      if (field) return compareCustomFieldValues(field, a.custom_fields?.[sortCol], b.custom_fields?.[sortCol]) * dir;
      return 0;
    });
    return sorted;
  }, [filteredTasks, sortCol, sortDir, customFields]);

  const allSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id));
  const completedTaskCount = sortedTasks.filter(task => task.status === 'completed').length;
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

  const flatTree = React.useMemo(() => {
    const buildFlatTree = (
      nodes: Task[],
      parentId: string | undefined = undefined,
      depth = 0
    ): { task: Task; depth: number }[] => {
      const levelNodes = nodes.filter(n => 
        parentId === undefined 
          ? (!n.parentId || !nodes.some(parent => parent.id === n.parentId)) 
          : n.parentId === parentId
      );
      
      let result: { task: Task; depth: number }[] = [];
      levelNodes.forEach(node => {
        result.push({ task: node, depth });
        
        const hasChildren = nodes.some(n => n.parentId === node.id);
        const isExpanded = expandedTaskIds.includes(node.id);
        
        if (hasChildren && isExpanded) {
          const children = buildFlatTree(nodes, node.id, depth + 1);
          result = result.concat(children);
        }
      });
      return result;
    };

    return buildFlatTree(sortedTasks);
  }, [sortedTasks, expandedTaskIds]);
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
  const handleInlineCreate = async (options?: { keepOpen?: boolean }) => {
    const title = draftTitle.trim();
    if (!title) {
      setIsCreatingInline(false);
      resetDrafts();
      return;
    }
    if (!onAddTask || inlineCreatePending.current) return;

    const values = applyCustomFieldDefaults(customFields, draftCustomFields);
    const errors = validateTaskCustomFields(customFields, values, draftStatus === 'completed');
    if (errors.length) {
      triggerToast?.('info', 'Kiểm tra trường tùy chỉnh', errors.map(error => error.field + ': ' + error.message).join(' '));
      return;
    }
    inlineCreatePending.current = true;
    try {
      await onAddTask({
        title,
        description: '',
        priority: draftPriority,
        status: draftStatus,
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

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-transparent select-none">
      <div className="overflow-x-auto custom-touch-scroll flex-1">
      <table className="apexa-task-table w-full min-w-[900px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="bg-white dark:bg-[#0c0e14]/95">
            <th className="sticky left-0 top-0 z-20 w-11 h-10 px-3 border-b border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#0c0e14]/95 backdrop-blur-md text-center">
              <input 
                type="checkbox" 
                ref={el => { if (el) el.indeterminate = selectedTaskIds.length > 0 && !allSelected; }}
                checked={allSelected}
                aria-label="Chọn tất cả công việc"
                onChange={e => { if (e.target.checked) setSelectedTaskIds(sortedTasks.map(t => t.id)); else setSelectedTaskIds([]); }}
                className="w-4 h-4 rounded-md cursor-pointer accent-indigo-600 transition-all" 
              />
            </th>
            {/* Task Name is always visible and first */}
            <CustomizableHeader 
              col="title" 
              label={getColumnLabel('title', 'Task', 'Công việc')}
              className="min-w-[260px] sticky left-11 z-20 bg-white dark:bg-[#0c0e14]/95 backdrop-blur-md" 
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
                isSortable={false}
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
                isSortable={false}
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
                isSortable={false}
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
                isSortable={false}
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
            <th className="sticky top-0 z-10 w-11 h-10 px-2 text-center border-b border-slate-200/70 dark:border-white/[0.06] bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-md">
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
          {flatTree.map(({ task, depth }, index) => {
            const assignee = members.find(m => m.id === task.assigneeId);
            const isSelected = selectedTaskIds.includes(task.id);
            const daysInfo = getDaysText(task.dueDate);
            return (
              <tr 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className={`cursor-pointer transition-colors duration-150 group/row border-b border-slate-200/50 dark:border-white/[0.04] ${
                  isSelected 
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30' 
                    : 'bg-white dark:bg-[#0c0e14]'
                } hover:bg-slate-50/90 dark:hover:bg-[#121520]`}
              >
                {/* Sticky Checkbox Column */}
                <td 
                  className={`sticky left-0 z-[5] h-11 px-3 border-b border-slate-200/50 dark:border-white/[0.04] text-center w-11 ${
                    isSelected ? 'bg-indigo-50/90 dark:bg-[#0c1220]' : 'bg-white/95 dark:bg-[#0c0e14]/95'
                  } group-hover/row:bg-slate-50 dark:group-hover/row:bg-[#121520] transition-colors`} 
                  onClick={e => e.stopPropagation()}
                >
                  <div className="relative flex items-center justify-center w-4 h-4 mx-auto">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      aria-label={`Select ${task.title}`}
                      onChange={e => setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id))}
                      className={`w-4 h-4 rounded-md cursor-pointer accent-indigo-600 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 group-hover/row:opacity-100'}`} 
                    />
                  </div>
                </td>

                {/* Sticky Task Title Column */}
                <td 
                  className={`sticky left-11 z-[5] h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04] min-w-[260px] ${
                    isSelected ? 'bg-indigo-50/90 dark:bg-[#0c1220]' : 'bg-white/95 dark:bg-[#0c0e14]/95'
                  } group-hover/row:bg-slate-50 dark:group-hover/row:bg-[#121520] transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    {/* Render visual indentation and connector lines */}
                    {depth > 0 && (
                      <div className="flex items-center shrink-0" style={{ paddingLeft: `${(depth - 1) * 20}px` }}>
                        <div className="relative h-6 w-5 flex items-center justify-center shrink-0">
                          {/* Horizontal connector line */}
                          <div className="absolute top-[11px] left-[4px] w-3 h-[1.5px] bg-slate-200 dark:bg-slate-700/80 rounded" />
                          {/* Vertical connector line */}
                          <div className="absolute top-0 bottom-0 left-[4px] w-[1.5px] bg-slate-200 dark:bg-slate-700/80" />
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
                        if (typeof window !== 'undefined') {
                          (window as any).playSystemSound?.('toggle');
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
                        className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-2 py-0.5 outline-none focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500/40 shadow-3xs w-full max-w-[280px]" 
                      />
                    ) : (
                      <span 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setInlineEditTaskId(task.id);
                          setInlineEditTitle(task.title);
                        }}
                        className={`text-[13px] font-semibold truncate max-w-[320px] cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}
                        title="Nhấp đúp để đổi tên công việc"
                      >
                        {task.title}
                      </span>
                    )}

                    {/* Dependency Badges */}
                    {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                      <span className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0" title="Đang chờ công việc khác hoàn thành">
                        <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                        <span>Đang chờ</span>
                      </span>
                    )}
                    {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                      <span className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0" title="Đang chặn công việc khác bắt đầu">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Blocking</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {(task.comments?.length || 0) > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>}
                      {(task.attachments?.length || 0) > 0 && <Paperclip className="w-2.5 h-2.5" />}
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
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-sky-600 transition-all cursor-pointer"
                          title="Nhân bản công việc"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {activeFields.includes('status') && (
                  <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
                    <StatusPillSelect value={task.status} onChange={newS => {
                      onUpdateTask({ ...task, status: newS });
                      onAddSyncLog?.(`Status "${task.title}" → ${newS}`);
                    }} />
                  </td>
                )}

                {activeFields.includes('priority') && (
                  <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
                    <PriorityPillSelect value={task.priority} onChange={newP => {
                      onUpdateTask({ ...task, priority: newP || 'medium' });
                      onAddSyncLog?.(`Priority "${task.title}" → ${newP || 'medium'}`);
                    }} />
                  </td>
                )}

                {activeFields.includes('assignee') && (
                  <td className="h-11 px-3.5 border-b border-slate-200/50 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
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
            );
          })}
          {isCreatingInline ? (
            <tr className="h-11 border-b border-indigo-200/70 dark:border-indigo-900/40 bg-indigo-50/25 dark:bg-indigo-950/20 transition-colors">
              <td className="sticky left-0 z-[5] w-11 h-11 px-3 text-center border-b border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/80 dark:bg-[#0c1220]">
                <div
                  className="w-4.5 h-4.5 rounded-full border-2 border-dashed border-indigo-400 dark:border-indigo-500 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto transition-colors"
                  title={locale === 'vi' ? 'Tạo công việc mới' : 'Create new task'}
                >
                  <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
              </td>
              <td className="sticky left-11 z-[5] h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 min-w-[260px] bg-indigo-50/80 dark:bg-[#0c1220]">
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
                          handleInlineCreate({ keepOpen: false });
                        } else {
                          handleInlineCreate({ keepOpen: true });
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsCreatingInline(false);
                        resetDrafts();
                      }
                    }}
                    placeholder={t('inlineAddTitlePlaceholder') || (locale === 'vi' ? "Nhập tên công việc mới..." : "Enter task title...")}
                    title={locale === 'vi' ? "Enter: Lưu & tiếp tục • Shift+Enter: Lưu & đóng • Esc: Hủy" : "Enter: Save & next • Shift+Enter: Save & close • Esc: Cancel"}
                    className="w-full h-8 px-2.5 text-xs font-medium border border-indigo-300/80 dark:border-indigo-600/70 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-3xs transition-all"
                  />
                </div>
              </td>

              {activeFields.includes('status') && (
                <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
                  <StatusPillSelect value={draftStatus} onChange={setDraftStatus} />
                </td>
              )}

              {activeFields.includes('priority') && (
                <td className="h-11 px-3.5 border-b border-indigo-200/60 dark:border-indigo-900/40 align-middle">
                  <PriorityPillSelect value={draftPriority} onChange={newP => setDraftPriority(newP || 'medium')} />
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
                    onClick={() => handleInlineCreate({ keepOpen: false })}
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
          ) : sortedTasks.length > 0 ? (
            <tr
              onClick={() => setIsCreatingInline(true)}
              className="bg-white dark:bg-[#0c0e14] hover:bg-slate-50/80 dark:hover:bg-[#121520] transition-colors duration-150 group cursor-pointer border-b border-slate-200/40 dark:border-white/[0.03]"
            >
              {/* Sticky Column 0: Checkbox column alignment */}
              <td className="sticky left-0 z-[5] w-11 h-11 px-3 text-center border-b border-slate-200/40 dark:border-white/[0.03] bg-white/95 dark:bg-[#0c0e14]/95 group-hover:bg-slate-50 dark:group-hover:bg-[#121520] transition-colors">
                <div className="w-5 h-5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/80 group-hover:border-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-all duration-150 shadow-3xs mx-auto">
                  <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
              </td>

              {/* Sticky Column 1: Task Title column alignment */}
              <td className="sticky left-11 z-[5] h-11 px-3.5 border-b border-slate-200/40 dark:border-white/[0.03] min-w-[260px] bg-white/95 dark:bg-[#0c0e14]/95 group-hover:bg-slate-50 dark:group-hover:bg-[#121520] transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 transition-colors">
                    {t('addNewTask') || (locale === 'vi' ? 'Thêm công việc mới...' : 'Add a new task...')}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70">
                    <Plus className="w-2.5 h-2.5" />
                    <span>{t('clickToAdd') || (locale === 'vi' ? 'Nhấp để thêm' : 'Click to add')}</span>
                  </span>
                </div>
              </td>

              {/* Remaining columns */}
              <td colSpan={columnCount - 2} className="h-11 px-3.5 border-b border-slate-200/40 dark:border-white/[0.03] bg-white/95 dark:bg-[#0c0e14]/95 group-hover:bg-slate-50 dark:group-hover:bg-[#121520] transition-colors">
                <div className="w-full" />
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={columnCount} className="py-14 px-6 text-center border-b border-slate-200/50 dark:border-white/[0.04]">
                <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                  {isSearchingOrFiltering ? (
                    <>
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                        <SlidersHorizontal className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t('noMatchingTasks') || (locale === 'vi' ? 'Không tìm thấy công việc phù hợp' : 'No matching tasks found')}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                        {t('tryAdjustingFilters') || (locale === 'vi' ? 'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.' : 'Try changing your filters or search query.')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCreatingInline(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all shadow-3xs hover:shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{t('addNewTask') || (locale === 'vi' ? 'Thêm công việc mới' : 'Add a new task')}</span>
                      </button>
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
                        {t('noTasksYetDesc') || (locale === 'vi' ? 'Bắt đầu bằng cách tạo công việc đầu tiên hoặc dùng AI tạo nhanh.' : 'Get started by creating your first task or generate tasks with AI.')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCreatingInline(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{t('createFirstTask') || (locale === 'vi' ? 'Tạo công việc đầu tiên' : 'Create First Task')}</span>
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {sortedTasks.length > 0 && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-6 py-2 bg-white dark:bg-[#0c0e14]/95 backdrop-blur-md text-[11px] font-medium border-t border-slate-200/60 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 select-none">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{sortedTasks.length} {locale === 'vi' ? 'công việc' : sortedTasks.length === 1 ? 'task' : 'tasks'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedTaskCount} {locale === 'vi' ? 'hoàn thành' : 'completed'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenFieldsPanel}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {locale === 'vi' ? 'Tùy chỉnh cột' : 'Customize columns'}
          </button>
        </div>
      )}

      {activeMenu && (
        <Portal>
          <div className="fixed inset-0 z-[190] cursor-default" onClick={() => setActiveMenu(null)} />
          <div 
            className="fixed z-[200] w-[230px] bg-white dark:bg-[#111218] border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 font-sans text-xs select-none backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 animate-fadeIn"
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
