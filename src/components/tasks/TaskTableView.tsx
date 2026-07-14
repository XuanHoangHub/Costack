"use client";

import React, { useState } from 'react';
import { ArrowUpDown, Pin, MessageSquare, Paperclip, Plus, Check, X, Circle, CheckCircle2, Trophy, Flag, Timer, Pencil, ShieldAlert, ArrowLeft, ArrowRight, Zap, EyeOff, Copy, Trash2, Bot, Sparkles, SlidersHorizontal, Play, Clock, ChevronDown, AlertTriangle, Hourglass } from 'lucide-react';
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
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, DropdownFieldSelect, LabelsFieldSelect } from './TaskSelects';
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
    className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-105 dark:hover:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-905/10 group/h select-none ${className}`}
  >
    <div className="flex items-center justify-between gap-1 w-full">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isSortable && sortCol === col && <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />}
      </div>
      {onOpenMenu && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e);
          }}
          className="opacity-40 group-hover/h:opacity-100 p-0.5 rounded hover:bg-slate-205 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </th>
);


function CustomFieldCellEditor({ 
  field, 
  value, 
  onChange 
}: { 
  field: any; 
  value: any; 
  onChange: (val: string) => void;
}) {
  const val = value || '';

  switch (field.type) {
    case 'checkbox':
      const isChecked = val === 'true' || val === true;
      return (
        <button
          type="button"
          onClick={() => onChange(isChecked ? 'false' : 'true')}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            isChecked
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900'
          }`}
        >
          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
        </button>
      );

    case 'rating':
      const ratingVal = parseInt(String(val)) || 0;
      return (
        <div className="flex items-center gap-0.5 select-none">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(ratingVal === star ? '' : String(star))}
              className={`text-sm transition-transform hover:scale-125 cursor-pointer leading-none ${
                star <= ratingVal ? 'text-amber-400' : 'text-slate-200 dark:text-slate-800'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      );

    case 'date':
      return (
        <PremiumDatePicker
          dateValue={String(val)}
          onChange={newD => onChange(newD || '')}
          label="Date"
          align="left"
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer text-slate-700 dark:text-slate-300"
        />
      );

    case 'dropdown':
      return (
        <DropdownFieldSelect
          value={String(val)}
          options={field.options || []}
          onChange={onChange}
        />
      );

    case 'labels':
      return (
        <LabelsFieldSelect
          value={String(val)}
          options={field.options || []}
          onChange={onChange}
        />
      );

    case 'progress':
      const percent = Math.min(100, Math.max(0, parseInt(String(val)) || 0));
      return (
        <div className="flex items-center gap-1.5 min-w-[100px] select-none">
          <input
            type="range"
            min="0"
            max="100"
            value={percent}
            onChange={e => onChange(e.target.value)}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-805 accent-indigo-600"
          />
          <span className="text-[10px] font-black text-slate-550 w-7 shrink-0">{percent}%</span>
        </div>
      );

    case 'number':
      return (
        <input
          type="number"
          value={String(val)}
          placeholder="0"
          onChange={e => onChange(e.target.value)}
          className="px-2 py-1 text-xs border border-slate-205 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none max-w-[80px] focus:border-indigo-500 transition-colors font-semibold"
        />
      );

    case 'money':
      return (
        <div className="relative flex items-center max-w-[100px]">
          <span className="absolute left-2 text-xs font-bold text-slate-405">$</span>
          <input
            type="text"
            value={String(val)}
            placeholder="0.00"
            onChange={e => onChange(e.target.value)}
            className="pl-5 pr-2 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none w-full focus:border-indigo-505 transition-colors font-semibold"
          />
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={String(val)}
          placeholder="..."
          onChange={e => onChange(e.target.value)}
          className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none max-w-[120px] focus:border-indigo-500 transition-colors font-semibold"
        />
      );
  }
}

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
    isStandard?: boolean;
  } | null>(null);

  // Dynamic field settings states
  const [columnNames, setColumnNames] = useState<Record<string, string>>({});
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
    window.addEventListener('avaxa-field-config-changed', handleConfigChange);
    return () => {
      window.removeEventListener('avaxa-field-config-changed', handleConfigChange);
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

  const activeFields = visibleFields || ['title', 'status', 'priority', 'assignee', 'startDate', 'dueDate', 'progress', 'tags'];

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
        window.dispatchEvent(new Event('avaxa-field-config-changed'));
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
            custom_fields: { ...rest, [newName]: oldVal || '' }
          });
        });
      }

      if (updated.options) {
        const nextCustomConfigs = { ...customConfigs, [id]: updated.options };
        setCustomConfigs(nextCustomConfigs);
        saveCustomFieldsConfig(nextCustomConfigs);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('avaxa-field-config-changed'));
      }

      if (onAddSyncLog) onAddSyncLog(`Updated settings for custom field "${newName}"`);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[calc(100vh-220px)] bg-white dark:bg-slate-900/40">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-200/65 dark:border-slate-800/60">
            <th className="w-10 px-4 py-3 border-b border-slate-200/65 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/10 text-center">
              <input type="checkbox" checked={allSelected}
                onChange={e => { if (e.target.checked) setSelectedTaskIds(sortedTasks.map(t => t.id)); else setSelectedTaskIds([]); }}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600" />
            </th>
            {/* Task Name is always visible and first */}
            <CustomizableHeader 
              col="title" 
              label={columnNames.title || 'Task'} 
              className="min-w-[250px]" 
              sortCol={sortCol} 
              sortDir={sortDir} 
              onToggleSort={toggleSort}
              onOpenMenu={(e) => handleHeaderClick(e, 'title', 'text')}
            />
            
            {activeFields.includes('status') && (
              <CustomizableHeader 
                col="status" 
                label={columnNames.status || 'Status'} 
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
                label={columnNames.priority || 'Priority'} 
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                onOpenMenu={(e) => handleHeaderClick(e, 'priority', 'dropdown')}
              />
            )}
            {activeFields.includes('assignee') && (
              <CustomizableHeader 
                col="assignee" 
                label={columnNames.assignee || 'Assignee'} 
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
                label={columnNames.space || 'Space'} 
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
                label={columnNames.startDate || 'Start Date'} 
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                onOpenMenu={(e) => handleHeaderClick(e, 'startDate', 'date')}
              />
            )}
            {activeFields.includes('dueDate') && (
              <CustomizableHeader 
                col="dueDate" 
                label={columnNames.dueDate || 'Due Date'} 
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                onOpenMenu={(e) => handleHeaderClick(e, 'dueDate', 'date')}
              />
            )}
            {activeFields.includes('progress') && (
              <CustomizableHeader 
                col="progress" 
                label={columnNames.progress || 'Progress'} 
                sortCol={sortCol} 
                sortDir={sortDir} 
                onToggleSort={toggleSort}
                onOpenMenu={(e) => handleHeaderClick(e, 'progress', 'progress')}
              />
            )}
            {activeFields.includes('tags') && (
              <CustomizableHeader 
                col="tags" 
                label={columnNames.tags || 'Tags'} 
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
          {flatTree.map(({ task, depth }, index) => {
            const assignee = members.find(m => m.id === task.assigneeId);
            const isSelected = selectedTaskIds.includes(task.id);
            const daysInfo = getDaysText(task.dueDate);

            return (
              <tr key={task.id} onClick={() => setSelectedTask(task)}
                className={`cursor-pointer transition-all group/row ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/30 dark:bg-slate-900/20'} hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10`}>
                
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40 text-center w-12" onClick={e => e.stopPropagation()}>
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
                
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
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
                        className="p-0.5 rounded hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655 transition-all shrink-0 cursor-pointer"
                        title={expandedTaskIds.includes(task.id) ? "Collapse subtasks" : "Expand subtasks"}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedTaskIds.includes(task.id) ? '' : '-rotate-90'}`} />
                      </button>
                    ) : depth > 0 ? (
                      <div className="w-[18px] h-[18px] shrink-0" />
                    ) : null}

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

                    {/* Dependency Badges */}
                    {task.relationships?.blockedBy && task.relationships.blockedBy.length > 0 && (
                      <span className="bg-amber-50/80 dark:bg-amber-955/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-650 dark:text-amber-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0" title="Waiting on another task to complete">
                        <Hourglass className="w-2.5 h-2.5 animate-pulse" />
                        <span>Waiting On</span>
                      </span>
                    )}
                    {task.relationships?.blocks && task.relationships.blocks.length > 0 && (
                      <span className="bg-rose-50/80 dark:bg-rose-955/20 border border-rose-200/50 dark:border-rose-900/30 text-rose-650 dark:text-rose-400 font-extrabold text-[9px] tracking-wide rounded-md px-1.5 py-0.5 flex items-center gap-1 select-none shrink-0" title="Blocking another task from starting">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Blocking</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {(task.comments?.length || 0) > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>}
                      {(task.attachments?.length || 0) > 0 && <Paperclip className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                </td>

                {activeFields.includes('status') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40" onClick={e => e.stopPropagation()}>
                    <StatusPillSelect value={task.status} onChange={newS => {
                      onUpdateTask({ ...task, status: newS });
                      onAddSyncLog?.(`Status "${task.title}" → ${newS}`);
                    }} />
                  </td>
                )}

                {activeFields.includes('priority') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40" onClick={e => e.stopPropagation()}>
                    <PriorityPillSelect value={task.priority} onChange={newP => {
                      onUpdateTask({ ...task, priority: newP || 'medium' });
                      onAddSyncLog?.(`Priority "${task.title}" → ${newP || 'medium'}`);
                    }} />
                  </td>
                )}

                {activeFields.includes('assignee') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40" onClick={e => e.stopPropagation()}>
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
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                    {(() => {
                      const ws = task.workspaceId ? workspaces.find(w => w.id === task.workspaceId) : null;
                      return ws ? (
                        <span className="text-[11px] font-bold text-slate-650 dark:text-slate-400">
                          {ws.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-350">—</span>
                      );
                    })()}
                  </td>
                )}

                {activeFields.includes('startDate') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40" onClick={e => e.stopPropagation()}>
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
                      label="Start"
                      align="left"
                      className="text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"
                    />
                  </td>
                )}

                {activeFields.includes('dueDate') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40" onClick={e => e.stopPropagation()}>
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
                      label="Due"
                      align="left"
                      className={daysInfo ? `text-[11px] font-bold px-2 py-1 rounded-lg border-0 cursor-pointer select-none transition-all ${daysInfo.cls}` : "text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"}
                    />
                  </td>
                )}

                {activeFields.includes('progress') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                    {hasSubtasksOrChildren(task) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${getProgress(task)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-550">{getProgress(task)}%</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-350">—</span>
                    )}
                  </td>
                )}

                {activeFields.includes('tags') && (
                  <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                    <div className="flex flex-wrap gap-1">
                      {task.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400">#{tag}</span>
                      ))}
                      {(!task.tags || task.tags.length === 0) && <span className="text-[11px] text-slate-350">—</span>}
                    </div>
                  </td>
                )}

                {/* Custom fields data cells */}
                {visibleCustomFields.map(cf => {
                  const val = task.custom_fields?.[cf.name] || '';
                  return (
                    <td key={cf.id} className="px-4 py-3 text-left border-b border-slate-100/65 dark:border-slate-800/40" onClick={e => e.stopPropagation()}>
                      <CustomFieldCellEditor
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
                <td className="w-12 px-2 py-3 text-center border-b border-slate-100/65 dark:border-slate-800/40" />
              </tr>
            );
          })}
          {isCreatingInline ? (
            <tr className="border-t border-slate-200/70 dark:border-slate-800/60 bg-white dark:bg-slate-900">
              <td className="px-4 py-3 text-center border-b border-slate-100/65 dark:border-slate-800/40">
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </td>
              <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
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
                  className="w-full px-2.5 py-1.5 text-[13px] font-semibold border border-indigo-200 dark:border-indigo-900/40 rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-105 outline-none focus:border-indigo-500 transition-colors"
                />
              </td>

              {activeFields.includes('status') && (
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                  <StatusPillSelect value={draftStatus} onChange={setDraftStatus} />
                </td>
              )}

              {activeFields.includes('priority') && (
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                  <PriorityPillSelect value={draftPriority} onChange={newP => setDraftPriority(newP || 'medium')} />
                </td>
              )}

              {activeFields.includes('assignee') && (
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                  <AssigneePillSelect
                    value={draftAssigneeIds}
                    members={members}
                    onChange={(val) => setDraftAssigneeIds(val || [])}
                  />
                </td>
              )}

              {activeFields.includes('space') && (
                <td className="px-4 py-3 text-[11px] font-bold text-slate-550 dark:text-slate-400 border-b border-slate-100/65 dark:border-slate-800/40">
                  {workspaces.length > 0 ? (workspaces.find(w => w.id === 'w2')?.name || workspaces[0].name) : 'Personal Workspace'}
                </td>
              )}

              {activeFields.includes('startDate') && (
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                  <PremiumDatePicker
                    startDateValue={draftStartDate}
                    onStartDateChange={newD => setDraftStartDate(newD || '')}
                    dateValue={draftDueDate}
                    onChange={newD => setDraftDueDate(newD || '')}
                    label="Start"
                    align="left"
                    className="text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"
                  />
                </td>
              )}

              {activeFields.includes('dueDate') && (
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                  <PremiumDatePicker
                    startDateValue={draftStartDate}
                    onStartDateChange={newD => setDraftStartDate(newD || '')}
                    dateValue={draftDueDate}
                    onChange={newD => setDraftDueDate(newD || '')}
                    label="Due"
                    align="left"
                    className="text-[11px] text-slate-400 cursor-pointer border-0 bg-transparent"
                  />
                </td>
              )}

              {activeFields.includes('progress') && (
                <td className="px-4 py-3 text-[11px] text-slate-350 border-b border-slate-100/65 dark:border-slate-800/40">—</td>
              )}

              {activeFields.includes('tags') && (
                <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
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
                <td key={cf.id} className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
                  <CustomFieldCellEditor
                    field={cf}
                    value={draftCustomFields[cf.name] || ''}
                    onChange={newVal => setDraftCustomFields(prev => ({ ...prev, [cf.name]: newVal }))}
                  />
                </td>
              ))}

              <td className="px-4 py-3 text-center border-b border-slate-100/65 dark:border-slate-800/40">
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
              <td className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40" />
              <td colSpan={columnCount - 1} className="px-4 py-3 border-b border-slate-100/65 dark:border-slate-800/40">
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
        </div>
      )}

      {activeMenu && (
        <Portal>
          <div className="fixed inset-0 z-[190] cursor-default" onClick={() => setActiveMenu(null)} />
          <div 
            className="fixed z-[200] w-[220px] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 font-sans text-xs select-none animate-fadeIn"
            style={{ top: activeMenu.y, left: activeMenu.x }}
          >
            {/* Sort options (where applicable) */}
            {activeMenu.fieldId !== 'assignee' && activeMenu.fieldId !== 'space' && activeMenu.fieldId !== 'tags' && (
              <>
                <button
                  onClick={() => {
                    toggleSort(activeMenu.fieldId);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
              </>
            )}

            {activeMenu.isStandard ? (
              // Standard Columns Menu
              <>
                <button
                  onClick={() => {
                    const oldName = activeMenu.fieldName;
                    const newName = prompt(`Rename standard column "${activeMenu.fieldId}":`, oldName);
                    if (newName?.trim() && newName.trim() !== oldName) {
                      const nextNames = { ...columnNames, [activeMenu.fieldId]: newName.trim() };
                      setColumnNames(nextNames);
                      saveColumnNames(nextNames);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('avaxa-field-config-changed'));
                      }
                      if (onAddSyncLog) onAddSyncLog(`Renamed column "${activeMenu.fieldId}" to "${newName.trim()}"`);
                    }
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename column</span>
                </button>

                {(activeMenu.fieldId === 'status' || activeMenu.fieldId === 'priority') && (
                  <button
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
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Configure Options</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (setVisibleFields) {
                      setVisibleFields(prev => prev.filter(f => f !== activeMenu.fieldId));
                      if (onAddSyncLog) onAddSyncLog(`Hid column "${activeMenu.fieldId}"`);
                    }
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hide column</span>
                </button>
              </>
            ) : (
              // Custom Fields Menu
              <>
                <button
                  onClick={() => {
                    const cf = customFields.find(c => c.id === activeMenu.fieldId);
                    if (cf) {
                      const existing = customConfigs[cf.id] || [];
                      const options = (cf.options || []).map((optLabel: string) => {
                        const match = existing.find((ec: any) => ec.label === optLabel);
                        return match ? { ...match } : { id: `opt-${Math.random()}`, label: optLabel, color: 'indigo' };
                      });
                      setEditingFieldConfig({
                        id: cf.id,
                        name: cf.name,
                        type: cf.type,
                        isStandard: false,
                        options
                      });
                      setShowSettingsModal(true);
                    }
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Field Settings</span>
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
                    } else if (confirm(`Are you sure you want to delete this custom field "${oldName}"?`)) {
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
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete field</span>
                </button>
              </>
            )}

            {activeMenu.fieldType === 'date' && (
              <>
                <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Định dạng ngày
                </div>
                {DATE_FORMAT_PRESETS.map(preset => {
                  const isActive = getStoredDateFormat() === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        saveDateFormat(preset.id);
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new Event('avaxa-field-config-changed'));
                        }
                        if (onAddSyncLog) onAddSyncLog(`Changed date format to: "${preset.label}"`);
                        setActiveMenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left font-bold rounded-lg cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400' 
                          : 'text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[9px] font-medium opacity-60">({preset.sample})</span>
                    </button>
                  );
                })}
              </>
            )}

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
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-indigo-200 dark:border-indigo-900 rounded-xl text-[11px] font-black text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-955/20 hover:border-indigo-300 transition-all cursor-pointer shadow-3xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Fill with AI</span>
              </button>
            </div>
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

function FieldSettingsModal({
  config,
  onClose,
  onSave
}: {
  config: { id: string; name: string; type: string; isStandard: boolean; options?: any[] } | null;
  onClose: () => void;
  onSave: (updated: { name: string; type: string; options?: any[] }) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [options, setOptions] = useState<{ id: string; label: string; color: string; icon?: string }[]>([]);

  React.useEffect(() => {
    if (config) {
      setName(config.name);
      setType(config.type);
      setOptions(config.options || []);
    }
  }, [config]);

  if (!config) return null;

  const handleAddOption = () => {
    setOptions([...options, { id: `opt-${Date.now()}`, label: 'New Option', color: 'indigo' }]);
  };

  const handleUpdateOptionLabel = (id: string, label: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, label } : o));
  };

  const handleUpdateOptionColor = (id: string, color: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, color } : o));
  };

  const handleDeleteOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id));
  };

  const COLORS = ['slate', 'red', 'orange', 'yellow', 'emerald', 'cyan', 'indigo', 'violet', 'pink'];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      type,
      options: options.map(o => ({
        ...o,
        ...(config.id === 'status' ? getTailwindColorConfig(o.color, 'status') : {}),
        ...(config.id === 'priority' ? {
          ...getTailwindColorConfig(o.color, 'priority'),
          icon: o.icon || '⚪'
        } : {})
      }))
    });
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-955/60 backdrop-blur-xs" onClick={onClose} />
        
        {/* Modal content */}
        <form onSubmit={handleSave} className="relative w-full max-w-[480px] bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-[24px] shadow-2xl p-6 flex flex-col gap-5 z-10 font-sans text-xs">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Cài đặt trường: {config.isStandard ? 'Trường hệ thống' : 'Trường tùy chỉnh'}
            </h3>
            <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:text-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {/* Field Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên trường</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200"
                required
              />
            </div>

            {/* Field Type (only for custom fields) */}
            {!config.isStandard && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại dữ liệu</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="text">Text (Đoạn văn ngắn)</option>
                  <option value="number">Number (Số)</option>
                  <option value="date">Date (Ngày tháng)</option>
                  <option value="checkbox">Checkbox (Hộp kiểm)</option>
                  <option value="dropdown">Dropdown (Lựa chọn đơn)</option>
                  <option value="labels">Labels (Đa lựa chọn)</option>
                  <option value="money">Money (Tiền tệ)</option>
                  <option value="progress">Progress (Tiến trình)</option>
                  <option value="rating">Rating (Đánh giá sao)</option>
                </select>
              </div>
            )}

            {/* Options config list (only for dropdown, labels, status, priority) */}
            {(type === 'dropdown' || type === 'labels' || config.id === 'status' || config.id === 'priority') && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách Options</label>
                  {(type === 'dropdown' || type === 'labels') && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      + Thêm Option
                    </button>
                  )}
                </div>

                <div className="space-y-2 border border-slate-105 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-955/10">
                  {options.map((opt) => (
                    <div key={opt.id} className="flex gap-2 items-center">
                      <span className="text-sm shrink-0">{opt.icon || '📍'}</span>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={e => handleUpdateOptionLabel(opt.id, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg outline-none focus:border-indigo-500 font-semibold"
                        required
                      />

                      <div className="flex gap-1 items-center shrink-0">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleUpdateOptionColor(opt.id, c)}
                            className={`w-3.5 h-3.5 rounded-full border bg-${c}-500 hover:scale-125 transition-transform ${opt.color === c ? 'border-slate-900 dark:border-white scale-110 shadow-xs' : 'border-transparent'}`}
                            title={c}
                          />
                        ))}
                      </div>

                      {(type === 'dropdown' || type === 'labels') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(opt.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-105 dark:border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-650 text-white hover:bg-indigo-750 font-bold"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}

