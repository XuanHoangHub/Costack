"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus, Priority, User, Space, Document, SyncLog, Workspace, TaskAttachment } from '../types';
import { supabase } from '../lib/supabaseClient';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
import {
  List, Kanban, Plus, Bot, Calendar, Trash2, Search, Filter, ArrowUpDown,
  SlidersHorizontal, Table, X, CheckSquare, Clock, Play, Pause, RotateCcw,
  Volume2, VolumeX, Timer, Sparkles, Pin, Tag, Hash, MoreHorizontal, ChevronDown,
  Folder, FolderOpen, Share2, ChevronRight, Star, Eye, FileText, GanttChart, HelpCircle, EyeOff, Check, Cog, User as UserIcon, RefreshCw,
  Activity, Users, Brain, Map as MapIcon, Pencil, Link as LinkIcon, Droplet, Zap, Copy, Archive, Phone
} from 'lucide-react';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, SpacePillSelect } from './tasks/TaskSelects';
import TaskListView from './tasks/TaskListView';
import TaskBoardView from './tasks/TaskBoardView';
import TaskTableView from './tasks/TaskTableView';
import TaskGanttView from './tasks/TaskGanttView';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';
import SpaceOverviewTab from './SpaceOverviewTab';

// Import other workspace view modules
import CalendarView from './CalendarView';
import Whiteboard from './Whiteboard';
import ChatRoom from './ChatRoom';
import DocumentHub from './DocumentHub';
import TeamDirectory from './TeamDirectory';
import DashboardOverview from './DashboardOverview';

const STATUS_LABELS: Record<TaskStatus, { label: string }> = {
  todo: { label: 'TO DO' }, inprogress: { label: 'IN PROGRESS' },
  review: { label: 'REVIEW' }, completed: { label: 'DONE' }
};

interface SpacePageProps {
  tasks: Task[];
  members: User[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  initialSelectedTaskId?: string | null;
  onClearInitialSelectedTaskId?: () => void;
  onUpdateTaskOrder?: (workspaceId: string, orderedIds: string[]) => void;
  allWorkspaces?: Workspace[];
  activeWorkspaceId?: string;
  onActiveWorkspaceChange?: (id: string) => void;
  onAddWorkspace?: (name: string, theme: string, coverUrl?: string) => void;
  currentUser?: any;
  onUpgradePremium?: () => void;
  allDocs?: Document[];

  // Space context props
  spaces?: Space[];
  onSaveSpaces?: (newSpaces: Space[]) => void;
  activeSpaceId?: string | null;
  setActiveSpaceId?: (id: string | null) => void;
  activeListId?: string | null;
  setActiveListId?: (id: string | null) => void;
  myTasksOnly?: boolean;
  onOpenSpaceSettings?: (space: Space) => void;
  onAddListSpace?: (spaceId: string) => void;
  onAddSpace?: () => void;
  onAddFolderToSpace?: (spaceId: string, name: string) => void;
  onAddDocToSpace?: (spaceId: string, title: string) => void;
  onAddWhiteboardToSpace?: (spaceId: string, name: string) => void;
  onAddListToFolder?: (spaceId: string, folderId: string, name: string) => void;
  onAddDoc?: (d: any) => void;
  onUpdateDoc?: (d: any) => void;
  onDeleteDoc?: (id: string) => void;

  // Dashboard properties
  syncLogs?: SyncLog[];
  onNavigate?: (tab: string) => void;
  onToggleOffline?: () => void;
}

export default function SpacePage({
  tasks, members, onAddTask: rawOnAddTask, onUpdateTask, onDeleteTask, isOffline, onAddSyncLog,
  triggerToast, initialSelectedTaskId, onClearInitialSelectedTaskId, onUpdateTaskOrder,
  allWorkspaces, activeWorkspaceId, onActiveWorkspaceChange, onAddWorkspace,
  currentUser, onUpgradePremium, allDocs = [],
  spaces = [], onSaveSpaces, activeSpaceId = null, setActiveSpaceId, activeListId = null, setActiveListId,
  myTasksOnly = false, onOpenSpaceSettings, onAddListSpace, onAddSpace,
  syncLogs = [], onNavigate, onToggleOffline,
  onAddFolderToSpace, onAddDocToSpace, onAddWhiteboardToSpace, onAddListToFolder,
  onAddDoc, onUpdateDoc, onDeleteDoc
}: SpacePageProps) {

// Local handler to insert space/list context
   const onAddTask = (taskObj: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & { workspaceId?: string; spaceId?: string; listId?: string }) => {
     rawOnAddTask({
       workspaceId: taskObj.workspaceId || activeWorkspaceId,
       spaceId: taskObj.spaceId || activeSpaceId || undefined,
       listId: taskObj.listId || activeListId || undefined,
       ...taskObj
     });
   };

  // Find active space object
  const activeSpace = useMemo(() => {
    return spaces.find(s => s.id === activeSpaceId) || spaces[0] || {
      id: 'default-space',
      name: 'Primary Space',
      emoji: '📦',
      themeColor: 'indigo',
      lists: []
    };
  }, [spaces, activeSpaceId]);

  // Favorite star state
  const [isFavorite, setIsFavorite] = useState(false);

  // Active View Tab State (Overview, List, Board, Table, Gantt, etc.)
  const [activeView, setActiveView] = useState<string>('list');

  // Spaces sub-sidebar collapsible states
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(false);
  const [isSpacesExpanded, setIsSpacesExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [isResizing, setIsResizing] = useState(false);

  // Handle mouse drag sidebar resizing
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Limit sidebar width between 160px and 480px
      const newWidth = Math.max(160, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle Ctrl + \ shortcut to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        setIsSubSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  // ClickUp exact views from screenshot (managed dynamically)
  const [staticTabs, setStaticTabs] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-overview');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeSpaceMenu, setActiveSpaceMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [activeSpaceSettings, setActiveSpaceSettings] = useState<{ id: string; x: number; y: number } | null>(null);
  const [activeListMenu, setActiveListMenu] = useState<{ id: string; spaceId: string; folderId: string | null; x: number; y: number } | null>(null);
  const [activeListSettings, setActiveListSettings] = useState<{ id: string; spaceId: string; folderId: string | null; x: number; y: number } | null>(null);
  const [activeFolderSettings, setActiveFolderSettings] = useState<{ id: string; spaceId: string; x: number; y: number } | null>(null);
  const [folderColorMenuOpen, setFolderColorMenuOpen] = useState<string | null>(null);

  // Custom Fields and visibility states
  const [showFieldsPanel, setShowFieldsPanel] = useState<boolean>(false);
  const [visibleFields, setVisibleFields] = useState<string[]>([
    'title', 'status', 'priority', 'assignee', 'space', 'dueDate', 'progress', 'tags'
  ]);
  const [customFields, setCustomFields] = useState<any[]>([
    { id: 'cf-objective', name: 'Objective', type: 'text' },
    { id: 'cf-owner', name: 'Owner', type: 'text' },
    { id: 'cf-cost', name: 'Cost', type: 'number' }
  ]);
  const [showBreadcrumbNav, setShowBreadcrumbNav] = useState(false);
  const [breadcrumbSearch, setBreadcrumbSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewContextMenu, setViewContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    tabId: string;
  }>({ show: false, x: 0, y: 0, tabId: '' });

  // Initialize tabs dynamically based on space, folder, or list context
  useEffect(() => {
    if (!activeListId) {
      setStaticTabs([
        { id: 'tab-channel', label: 'Channel', icon: Hash, viewId: 'channel' },
        { id: 'tab-overview', label: 'Overview', icon: FileText, viewId: 'overview' },
        { id: 'tab-list', label: 'List', icon: List, viewId: 'list' },
        { id: 'tab-board', label: 'Board', icon: Kanban, viewId: 'board' },
        { id: 'tab-doc', label: 'Doc', icon: FileText, viewId: 'doc' },
        { id: 'tab-calendar', label: 'Calendar', icon: Calendar, viewId: 'calendar' },
        { id: 'tab-table', label: 'Table', icon: Table, viewId: 'table' },
      ]);
      setActiveTabId('tab-overview');
      setActiveView('overview');
    } else {
      setStaticTabs([
        { id: 'tab-channel', label: 'Channel', icon: Hash, viewId: 'channel' },
        { id: 'tab-table', label: 'Table', icon: Table, viewId: 'table' },
        { id: 'tab-list', label: 'List', icon: List, viewId: 'list' },
        { id: 'tab-board', label: 'Board', icon: Kanban, viewId: 'board' },
        { id: 'tab-gantt', label: 'Gantt', icon: GanttChart, viewId: 'gantt' },
      ]);
      setActiveTabId('tab-table');
      setActiveView('table');
    }
  }, [activeSpaceId, activeListId, activeFolderId]);
  const [isSearchViewOpen, setIsSearchViewOpen] = useState(false);

  // Search input for views list
  const [searchViewQuery, setSearchViewQuery] = useState('');
  const [showAddViewMenu, setShowAddViewMenu] = useState(false);
  const [privateView, setPrivateView] = useState(false);
  const [pinView, setPinView] = useState(false);

  // Auto refresh simulation
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('just now');

  // Customize layout/card sizing drawer states
  const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false);
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [cardCover, setCardCover] = useState<boolean>(true);
  const [stackFields, setStackFields] = useState(false);

  // Search and Filter States for Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('manual');
  // Selection and Sorting states
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSmartSort, setIsSmartSort] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [boardGroupBy, setBoardGroupBy] = useState<'status' | 'priority' | 'assignee'>('status');
  const [boardSwimlaneBy, setBoardSwimlaneBy] = useState<'none' | 'status' | 'priority' | 'assignee'>('none');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeOverDropId, setActiveOverDropId] = useState<string | null>(null);

  const isUrgentNearDueTask = (t: Task) => {
    if (t.status === 'completed') return false;
    if (t.priority !== 'urgent' && t.priority !== 'high') return false;
    if (!t.dueDate) return false;
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
      return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 3;
    } catch (e) { return false; }
  };

  const [showFilters, setShowFilters] = useState(false);

  // Detail Drawer & Quick Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Task Form States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrio, setNewPrio] = useState<Priority>('medium');
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStartDate, setNewStartDate] = useState('');

  // AI & Pomodoro States
  const [showAiPriorityModal, setShowAiPriorityModal] = useState(false);
  const [loadingAiPriority, setLoadingAiPriority] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  interface AiSuggestions {
    suggestions?: string[];
    generalSummary?: string;
    explanation?: string;
    suggestedTasks?: Task[];
  }
  
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);

  const [isFocusActive, setIsFocusActive] = useState(false);
  const [timerTask, setTimerTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Track task orders
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
  const currentWorkspaceId = activeWorkspaceId || 'default';

  // Sync auto refresh label
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefreshed('just now');
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Load task ordering
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`avaxa_task_order_${currentWorkspaceId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTaskOrder(parsed);
          return;
        }
      }
    } catch (e) {}
    setTaskOrder([]);
  }, [currentWorkspaceId]);

  // Sync new task ids to ordering
  useEffect(() => {
    setTaskOrder(prev => {
      const existing = new Set(prev);
      const newIds = tasks.map(t => t.id).filter(id => !existing.has(id));
      if (newIds.length === 0) return prev;
      const updated = [...prev, ...newIds];
      try {
        localStorage.setItem(`avaxa_task_order_${currentWorkspaceId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [tasks, currentWorkspaceId]);

  // Sync initial task selection
  useEffect(() => {
    if (initialSelectedTaskId) {
      const task = tasks.find(t => t.id === initialSelectedTaskId);
      if (task) {
        setSelectedTask(task);
        onClearInitialSelectedTaskId?.();
      }
    }
  }, [initialSelectedTaskId, tasks, onClearInitialSelectedTaskId]);

  // Keep selectedTask in sync with tasks prop updates (e.g. from drag-and-drop or realtime updates)
  useEffect(() => {
    if (selectedTask) {
      const currentTask = tasks.find(t => t.id === selectedTask.id);
      if (currentTask && JSON.stringify(currentTask) !== JSON.stringify(selectedTask)) {
        setSelectedTask(currentTask);
      }
    }
  }, [tasks, selectedTask]);

// Pomodoro countdown effect
   useEffect(() => {
     let interval: NodeJS.Timeout | null = null;
     if (timerRunning && timeLeft > 0) {
       interval = setInterval(() => {
         setTimeLeft(prev => prev - 1);
       }, 1000);
     } else if (timeLeft === 0 && timerRunning) {
       setTimerRunning(false);
       if (triggerToast) {
         triggerToast('success', 'Pomodoro Session Finished!', `Focus block on "${timerTask?.title || 'task'}" completed.`);
       }
       if (!isMuted) {
         try {
           const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
           audio.volume = 0.3;
           audio.play();
         } catch (e) {}
       }
     }
      return () => { if (interval) clearInterval(interval); };
   }, [timerRunning, timeLeft, timerTask, triggerToast, isMuted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ClickUp style Views Dropdown Menu Definitions
  const POPULAR_VIEWS = [
    { id: 'list', label: 'List', desc: 'Track tasks, bugs, people & more', icon: List, color: '#7c828d', bg: 'rgba(124, 130, 141, 0.08)' },
    { id: 'gantt', label: 'Gantt Chart', desc: 'Plan dependencies & time', icon: GanttChart, color: '#f04438', bg: 'rgba(240, 68, 56, 0.08)' },
    { id: 'calendar', label: 'Calendar', desc: 'Plan, schedule, & delegate', icon: Calendar, color: '#ff5f5f', bg: 'rgba(255, 95, 95, 0.08)' },
    { id: 'doc', label: 'Doc Wiki', desc: 'Collaborate & document anything', icon: FileText, color: '#1570ef', bg: 'rgba(21, 112, 239, 0.08)' },
    { id: 'board', label: 'Board Kanban', desc: 'Move tasks between columns', icon: Kanban, color: '#7b68ee', bg: 'rgba(123, 104, 238, 0.08)' },
    { id: 'form', label: 'Form Survey', desc: 'Collect, track, & report data', icon: CheckSquare, color: '#9c27b0', bg: 'rgba(156, 39, 176, 0.08)' },
    { id: 'ai', label: 'Create with AI', desc: 'Generate task views using AI', icon: Bot, color: '#aa33ff', bg: 'rgba(170, 51, 255, 0.08)' },
    { id: 'dashboard', label: 'Dashboard Report', desc: 'Track metrics & insights', icon: SlidersHorizontal, color: '#ee46bc', bg: 'rgba(238, 70, 188, 0.08)' },
    { id: 'table', label: 'Table', desc: 'Structured table format', icon: Table, color: '#12b76a', bg: 'rgba(18, 183, 106, 0.08)' },
    { id: 'whiteboard', label: 'Whiteboard', desc: 'Visualize & brainstorm ideas', icon: Sparkles, color: '#f79009', bg: 'rgba(247, 144, 9, 0.08)' },
    { id: 'timeline', label: 'Timeline', desc: 'See tasks by start & due date', icon: Clock, color: '#ff7e33', bg: 'rgba(255, 126, 51, 0.08)' },
    { id: 'activity', label: 'Activity Feed', desc: 'Real-time activity feed', icon: Activity, color: '#00bcd4', bg: 'rgba(0, 188, 212, 0.08)' },
    { id: 'workload', label: 'Workload Capacity', desc: 'Visualize team capacity', icon: Users, color: '#009688', bg: 'rgba(0, 150, 136, 0.08)' },
    { id: 'mindmap', label: 'Mind Map', desc: 'Visual brainstorming of ideas', icon: Brain, color: '#e91e63', bg: 'rgba(233, 30, 99, 0.08)' },
    { id: 'team', label: 'Team', desc: 'Monitor work being done', icon: UserIcon, color: '#9c27b0', bg: 'rgba(156, 39, 176, 0.08)' },
    { id: 'map', label: 'Map', desc: 'Tasks visualized by address', icon: MapIcon, color: '#ff9800', bg: 'rgba(255, 152, 0, 0.08)' }
  ];

  const MORE_VIEWS: any[] = [];

  // Filtering and Sorting operations
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      // Space filter
      if (activeSpaceId && t.spaceId !== activeSpaceId) return false;
      // Folder filter
      if (activeFolderId) {
        const folderListIds = activeSpace.lists?.filter(l => l.folderId === activeFolderId).map(l => l.id) || [];
        if (!t.listId || !folderListIds.includes(t.listId)) return false;
      }
      // List filter
      if (activeListId && t.listId !== activeListId) return false;
      // My Tasks Only filter
      if (myTasksOnly && t.assigneeId !== 'user') return false;
      return true;
    });

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // Priority filter
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }

    // Assignee filter
    if (filterAssignee !== 'all') {
      result = result.filter(t => t.assigneeId === filterAssignee);
    }

    // Tag filter
    if (filterTag !== 'all') {
      result = result.filter(t => t.tags && t.tags.includes(filterTag));
    }

    // Sorting
    if (sortBy === 'priority') {
      const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
      result = [...result].sort((a, b) => (weight[b.priority] || 0) - (weight[a.priority] || 0));
    } else if (sortBy === 'dueDate') {
      result = [...result].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'manual') {
      const orderMap = new Map(taskOrder.map((id, idx) => [id, idx]));
      result = [...result].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return idxA - idxB;
      });
    }

    return result;
  }, [tasks, activeSpaceId, activeListId, myTasksOnly, searchQuery, filterPriority, filterAssignee, filterTag, sortBy, taskOrder]);

  // Handle Form Submission for Quick Add Task Modal
  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPrio,
      status: newStatus,
      assigneeId: newAssignee || undefined,
      dueDate: newDueDate || undefined,
      startDate: newStartDate || undefined,
      subtasks: [],
      tags: [],
      isPinned: false
    });

    setNewTitle('');
    setNewDesc('');
    setNewPrio('medium');
    setNewStatus('todo');
    setNewAssignee('');
    setNewDueDate('');
    setNewStartDate('');
    setShowAddModal(false);
  };

  const activeFilterCount = (filterPriority !== 'all' ? 1 : 0) + (filterAssignee !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0);

  // Fetch AI task suggestions
  const fetchAiPriority = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setLoadingAiPriority(true);
    try {
      const active = tasks.filter(t => t.status !== 'completed');
      if (active.length === 0) {
        setAiSuggestions({ suggestions: [], generalSummary: 'No active tasks!' });
        setLoadingAiPriority(false);
        return;
      }
      const res = await fetch('/api/ai/priority-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: active })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setAiSuggestions(JSON.parse(data.text));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAiPriority(false);
    }
  };

  // AI Subtask Generation
  const triggerAiSubtasks = async (task: Task) => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtasks)) {
        const gen = data.subtasks.map((t: string, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          title: t,
          completed: false
        }));
        const updated = {
          ...task,
          subtasks: [...task.subtasks, ...gen],
          progress: Math.round((task.subtasks.filter(s => s.completed).length / Math.max(1, task.subtasks.length + gen.length)) * 100)
        };
        onUpdateTask(updated);
        setSelectedTask(updated);
        onAddSyncLog(`AI suggested ${gen.length} subtasks for "${task.title}"`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  // AI Summary
  const handleAiSummary = async (task: Task) => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setIsSummarizing(true);
    try {
      const assignee = members.find(m => m.id === task.assigneeId);
      const res = await fetch('/api/ai/task-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, assigneeName: assignee?.name || 'Unassigned' })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setAiSummary(data.text);
        localStorage.setItem(`avaxa_task_ai_summary_${task.id}`, data.text);
        onAddSyncLog(`AI summary for "${task.title}"`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Attachment Handlers
  const handleAttachmentUpload = async (task: Task, e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uuid = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${session.user.id}/tasks/${task.id}/${uuid}.${ext}`;
      onAddSyncLog(`Uploading: ${file.name}...`);
      const { error } = await supabase.storage.from('app-files').upload(filePath, file);
      if (error) {
        console.error('Upload error:', error);
        return;
      }
      const att = {
        id: uuid,
        name: file.name,
        filePath,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };
      const updated = {
        ...task,
        attachments: [...(task.attachments || []), att]
      };
      setSelectedTask(updated);
      onUpdateTask(updated);
      onAddSyncLog(`Uploaded successfully: ${file.name}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttachmentDelete = async (task: Task, att: TaskAttachment) => {
    try {
      await supabase.storage.from('app-files').remove([att.filePath]);
      const updated = {
        ...task,
        attachments: (task.attachments || []).filter(a => a.id !== att.id)
      };
      setSelectedTask(updated);
      onUpdateTask(updated);
      onAddSyncLog(`Deleted: ${att.name}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectView = (view: { id: string; label: string; icon: React.ElementType; desc: string; color: string; bg: string }) => {
    // Check if view is already in staticTabs
    const existingTab = staticTabs.find(t => t.viewId === view.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      setActiveView(existingTab.viewId);
    } else {
      const newTabId = `tab-custom-${Date.now()}`;
      const newTab = {
        id: newTabId,
        label: view.label,
        icon: view.icon,
        viewId: view.id
      };
      setStaticTabs([...staticTabs, newTab]);
      setActiveTabId(newTabId);
      setActiveView(view.id);
      onAddSyncLog(`Added view: ${view.label}`);
    }
    setShowAddViewMenu(false);
    setIsSearchViewOpen(false);
  };

  // Breadcrumbs title for space page header
  const spaceBreadcrumb = activeListId 
    ? `${activeSpace.name} / ${activeSpace.lists.find(l => l.id === activeListId)?.name || 'List'}` 
    : activeSpace.name;

  return (
    <div className="flex-grow flex h-full bg-slate-50/50 dark:bg-slate-950/20 font-sans overflow-hidden relative">
      
      {/* ── Sub-sidebar for Spaces (Left side, matching ClickUp) ── */}
      <AnimatePresence initial={false}>
        {!isSubSidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: sidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={isResizing ? { duration: 0 } : { duration: 0.2, ease: 'easeInOut' }}
            className="h-full border-r border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden hidden md:flex"
          >
            {/* Header: Spaces */}
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-wider">Spaces</span>
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <button 
                  onClick={() => onAddSpace?.()}
                  className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer transition-colors" 
                  title="Add Space"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsSpacesExpanded(!isSpacesExpanded)}
                  className="p-1 hover:bg-slate-105 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-202 rounded cursor-pointer transition-colors"
                  title="Expand/Collapse All"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSpacesExpanded ? '' : '-rotate-90'}`} />
                </button>
              </div>
            </div>

            {/* Spaces navigation list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3.5 scrollbar-none">
              
              {/* All Tasks Link */}
              <button
                onClick={() => {
                  if (setActiveSpaceId) setActiveSpaceId(null);
                  if (setActiveListId) setActiveListId(null);
                  setActiveView('overview');
                  onAddSyncLog(`Switched to All Tasks view`);
                }}
                className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeSpaceId === null && activeListId === null
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 font-extrabold shadow-3xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805 hover:text-slate-850 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                  <span className="truncate">All Tasks - {currentUser?.name || 'Xuan Hoang'}</span>
                </div>
              </button>

              {/* Spaces list */}
              <div className="space-y-1">
                {spaces.map(space => {
                  const isSpaceActive = activeSpaceId === space.id && activeListId === null;
                  const isAnyChildActive = activeSpaceId === space.id;
                  const isExpanded = isSpacesExpanded;

                  const themeBgColors: Record<string, string> = {
                    indigo: 'bg-[#7B61FF]',
                    rose: 'bg-[#FF3366]',
                    sky: 'bg-[#33D1FF]',
                    emerald: 'bg-[#10b981]',
                    amber: 'bg-[#f59e0b]',
                    sunset: 'bg-[#f97316]'
                  };
                  const bgClass = themeBgColors[space.themeColor || 'indigo'] || 'bg-[#7B61FF]';
                  const initialLetter = space.name.charAt(0).toUpperCase();

                  return (
                    <div key={space.id} className="space-y-0.5">
                      <div 
                        className={`flex items-center justify-between py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer group/space transition-all ${
                          isSpaceActive 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold shadow-3xs' 
                            : isAnyChildActive
                              ? 'text-slate-850 dark:text-slate-100 font-extrabold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-850 dark:hover:text-slate-200'
                        }`}
                      >
                        <div className="flex-1 flex items-center gap-2 text-left min-w-0"
                          onClick={() => {
                            if (setActiveSpaceId) setActiveSpaceId(space.id);
                            if (setActiveListId) setActiveListId(null);
                            setActiveFolderId(null);
                            setActiveView('overview');
                            onAddSyncLog(`Entered Space: ${space.name}`);
                          }}
                        >
                          {/* Space Icon */}
                          {space.emoji && space.emoji !== '📦' ? (
                            <span className="text-sm shrink-0">{space.emoji}</span>
                          ) : (
                            <div className={`w-4.5 h-4.5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-3xs ${bgClass}`}>
                              {initialLetter}
                            </div>
                          )}
                          <span className="truncate">{space.name}</span>
                        </div>
                        {/* Space Hover actions */}
                        <div className="opacity-0 group-hover/space:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (activeSpaceMenu?.id === space.id) {
                                setActiveSpaceMenu(null);
                              } else {
                                setActiveSpaceMenu({
                                  id: space.id,
                                  x: rect.left,
                                  y: rect.bottom + 4
                                });
                              }
                              setActiveSpaceSettings(null);
                              setActiveListMenu(null);
                            }}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="Create menu"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (activeSpaceSettings?.id === space.id) {
                                setActiveSpaceSettings(null);
                              } else {
                                setActiveSpaceSettings({
                                  id: space.id,
                                  x: rect.left,
                                  y: rect.bottom + 4
                                });
                              }
                              setActiveSpaceMenu(null);
                              setActiveListMenu(null);
                            }}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="Space Settings"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Lists nested under Space */}
                      {isExpanded && (
                        <div className="pl-4 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-4.5 mt-0.5">
                          {/* Render Folders */}
                          {space.folders?.map(folder => {
                            const isFolderOpen = expandedFolders[folder.id];
                            const folderLists = space.lists?.filter(l => l.folderId === folder.id) || [];
                            const folderDocs = allDocs?.filter(d => d.folderId === folder.id) || [];
                            const folderWhiteboards = space.whiteboards?.filter(w => w.folderId === folder.id) || [];
                            return (
                              <div key={folder.id} className="space-y-0.5 text-left">
                                <div 
                                  className={`w-full flex items-center justify-between py-1 px-1.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer group/folder ${
                                    activeSpaceId === space.id && activeFolderId === folder.id
                                      ? 'text-indigo-650 dark:text-indigo-400 font-extrabold bg-indigo-50/50 dark:bg-indigo-950/10'
                                      : 'text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-850 dark:hover:text-slate-250'
                                  }`}
                                  onClick={() => {
                                    if (setActiveSpaceId) setActiveSpaceId(space.id);
                                    if (setActiveListId) setActiveListId(null);
                                    setActiveFolderId(folder.id);
                                    setActiveView('overview');
                                    setExpandedFolders(prev => ({ ...prev, [folder.id]: !isFolderOpen }));
                                  }}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isFolderOpen ? (
                                      <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                                    ) : (
                                      <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                                    )}
                                    <span className="truncate">{folder.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        if (activeFolderSettings?.id === folder.id) {
                                          setActiveFolderSettings(null);
                                          setFolderColorMenuOpen(null);
                                        } else {
                                          setActiveFolderSettings({
                                            id: folder.id,
                                            spaceId: space.id,
                                            x: rect.left,
                                            y: rect.bottom + 4
                                          });
                                          setFolderColorMenuOpen(null);
                                        }
                                        setActiveSpaceMenu(null);
                                        setActiveSpaceSettings(null);
                                        setActiveListMenu(null);
                                        setActiveListSettings(null);
                                      }}
                                      className="opacity-0 group-hover/folder:opacity-100 p-0.5 hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
                                      title="Folder Settings"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const name = prompt("Enter List Name:");
                                        if (name?.trim() && onAddListToFolder) {
                                          onAddListToFolder(space.id, folder.id, name.trim());
                                        }
                                      }}
                                      className="opacity-0 group-hover/folder:opacity-100 p-0.5 hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
                                      title="Add List to Folder"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isFolderOpen ? '' : '-rotate-90'}`} />
                                  </div>
                                </div>

                                {isFolderOpen && (
                                  <div className="pl-3.5 space-y-0.5 border-l border-slate-150 dark:border-slate-850 ml-2 mt-0.5">
                                    {folderLists.map(list => {
                                      const isListActive = activeSpaceId === space.id && activeListId === list.id;
                                      const taskCount = tasks.filter(t => t.listId === list.id).length;
                                      return (
                                        <div 
                                          key={list.id}
                                          className={`w-full group/list flex items-center justify-between py-1 px-1.5 rounded-lg text-xs font-bold transition-all text-left relative ${
                                            isListActive
                                              ? 'text-indigo-650 dark:text-indigo-400 font-extrabold bg-indigo-50/50 dark:bg-indigo-950/10'
                                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-850 dark:hover:bg-slate-800/10'
                                          }`}
                                        >
                                          {/* List name click area */}
                                          <div 
                                            onClick={() => {
                                              if (setActiveSpaceId) setActiveSpaceId(space.id);
                                              if (setActiveListId) setActiveListId(list.id);
                                              setActiveFolderId(null);
                                              setActiveView('table');
                                              onAddSyncLog(`Entered List: ${list.name}`);
                                            }}
                                            className="flex-1 flex items-center gap-1.5 min-w-0 cursor-pointer"
                                          >
                                            <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">{list.name}</span>
                                          </div>
                                          
                                          {/* Task count or hover actions */}
                                          <div className="flex items-center gap-1 shrink-0 relative">
                                            {/* Hover Actions */}
                                            <div className="opacity-0 group-hover/list:opacity-100 flex items-center gap-0.5 transition-all">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  if (activeListSettings?.id === list.id) {
                                                    setActiveListSettings(null);
                                                  } else {
                                                    setActiveListSettings({
                                                      id: list.id,
                                                      spaceId: space.id,
                                                      folderId: folder.id,
                                                      x: rect.left,
                                                      y: rect.bottom + 4
                                                    });
                                                  }
                                                  setActiveSpaceMenu(null);
                                                  setActiveSpaceSettings(null);
                                                  setActiveListMenu(null);
                                                }}
                                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                                                title="Settings"
                                              >
                                                <MoreHorizontal className="w-3 h-3" />
                                              </button>
                                              
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  if (activeListMenu?.id === list.id) {
                                                    setActiveListMenu(null);
                                                  } else {
                                                    setActiveListMenu({
                                                      id: list.id,
                                                      spaceId: space.id,
                                                      folderId: folder.id,
                                                      x: rect.left,
                                                      y: rect.bottom + 4
                                                    });
                                                  }
                                                  setActiveSpaceMenu(null);
                                                  setActiveSpaceSettings(null);
                                                }}
                                                className="p-0.5 hover:bg-slate-205 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                                                title="Quick Create"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                            
                                            {/* Count (shown when not hovering) */}
                                            <span className="text-[10px] text-slate-455 font-semibold pl-1 shrink-0 group-hover/list:hidden">{taskCount}</span>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {folderDocs.map(doc => {
                                      return (
                                        <button
                                          key={doc.id}
                                          onClick={() => {
                                            if (setActiveSpaceId) setActiveSpaceId(space.id);
                                            if (setActiveListId) setActiveListId(null);
                                            setActiveView('doc');
                                          }}
                                          className="w-full flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-xs font-bold text-slate-550 hover:bg-slate-50 hover:text-slate-855 dark:hover:bg-slate-800/10 text-left cursor-pointer"
                                        >
                                          <span className="text-sm shrink-0">📄</span>
                                          <span className="truncate">{doc.title}</span>
                                        </button>
                                      );
                                    })}

                                    {folderWhiteboards.map(wb => (
                                      <button
                                        key={wb.id}
                                        onClick={() => {
                                          if (setActiveSpaceId) setActiveSpaceId(space.id);
                                          if (setActiveListId) setActiveListId(null);
                                          setActiveFolderId(folder.id);
                                          setActiveView('whiteboard');
                                        }}
                                        className="w-full flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-xs font-bold text-slate-550 hover:bg-slate-50 hover:text-slate-850 dark:hover:bg-slate-800/10 text-left cursor-pointer"
                                      >
                                        <span className="text-sm shrink-0">🎨</span>
                                        <span className="truncate">{wb.name}</span>
                                      </button>
                                    ))}

                                    {folderLists.length === 0 && folderDocs.length === 0 && folderWhiteboards.length === 0 && (
                                      <div className="text-[10px] text-slate-400 italic pl-5 py-0.5">Empty folder.</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Render direct Lists */}
                          {space.lists?.filter(l => !l.folderId).map(list => {
                            const isListActive = activeSpaceId === space.id && activeListId === list.id;
                            const taskCount = tasks.filter(t => t.listId === list.id).length;
                            return (
                              <div 
                                key={list.id}
                                className={`w-full group/list flex items-center justify-between py-1 px-2 rounded-lg text-xs font-bold transition-all text-left relative ${
                                  isListActive
                                    ? 'text-indigo-650 dark:text-indigo-400 font-extrabold bg-indigo-50/50 dark:bg-indigo-950/10'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-850 dark:hover:bg-slate-800/10'
                                }`}
                              >
                                {/* List name click area */}
                                <div 
                                  onClick={() => {
                                    if (setActiveSpaceId) setActiveSpaceId(space.id);
                                    if (setActiveListId) setActiveListId(list.id);
                                    setActiveFolderId(null);
                                    setActiveView('table');
                                    onAddSyncLog(`Entered List: ${list.name}`);
                                  }}
                                  className="flex-1 flex items-center gap-1.5 min-w-0 cursor-pointer"
                                >
                                  <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{list.name}</span>
                                </div>
                                
                                {/* Task count or hover actions */}
                                <div className="flex items-center gap-1 shrink-0 relative">
                                  {/* Hover Actions */}
                                  <div className="opacity-0 group-hover/list:opacity-100 flex items-center gap-0.5 transition-all">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        if (activeListSettings?.id === list.id) {
                                          setActiveListSettings(null);
                                        } else {
                                          setActiveListSettings({
                                            id: list.id,
                                            spaceId: space.id,
                                            folderId: null,
                                            x: rect.left,
                                            y: rect.bottom + 4
                                          });
                                        }
                                        setActiveSpaceMenu(null);
                                        setActiveSpaceSettings(null);
                                        setActiveListMenu(null);
                                      }}
                                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                                      title="Settings"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </button>
                                    
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        if (activeListMenu?.id === list.id) {
                                          setActiveListMenu(null);
                                        } else {
                                          setActiveListMenu({
                                            id: list.id,
                                            spaceId: space.id,
                                            folderId: null,
                                            x: rect.left,
                                            y: rect.bottom + 4
                                          });
                                        }
                                        setActiveSpaceMenu(null);
                                        setActiveSpaceSettings(null);
                                      }}
                                      className="p-0.5 hover:bg-slate-205 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                                      title="Quick Create"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  
                                  {/* Count (shown when not hovering) */}
                                  <span className="text-[10px] text-slate-455 font-semibold pl-1 shrink-0 group-hover/list:hidden">{taskCount}</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Render direct Docs */}
                          {allDocs?.filter(d => d.spaceId === space.id && !d.folderId).map(doc => (
                            <button
                              key={doc.id}
                              onClick={() => {
                                if (setActiveSpaceId) setActiveSpaceId(space.id);
                                if (setActiveListId) setActiveListId(null);
                                setActiveView('doc');
                              }}
                              className="w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold text-slate-550 hover:bg-slate-50 hover:text-slate-855 dark:hover:bg-slate-800/10 text-left cursor-pointer"
                            >
                              <span className="text-sm shrink-0">📄</span>
                              <span className="truncate">{doc.title}</span>
                            </button>
                          ))}

                          {/* Render direct Whiteboards */}
                          {space.whiteboards?.filter(w => !w.folderId).map(wb => (
                            <button
                              key={wb.id}
                              onClick={() => {
                                if (setActiveSpaceId) setActiveSpaceId(space.id);
                                if (setActiveListId) setActiveListId(null);
                                setActiveFolderId(null);
                                setActiveView('whiteboard');
                              }}
                              className="w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold text-slate-550 hover:bg-slate-50 hover:text-slate-855 dark:hover:bg-slate-800/10 text-left cursor-pointer"
                            >
                              <span className="text-sm shrink-0">🎨</span>
                              <span className="truncate">{wb.name}</span>
                            </button>
                          ))}

                          {(!space.lists || space.lists.length === 0) && (!space.folders || space.folders.length === 0) && (!space.whiteboards || space.whiteboards.length === 0) && (
                            <div className="text-[10px] text-slate-455 italic pl-5 py-1 select-none font-medium text-left">No lists yet.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Create space row */}
              <button
                onClick={() => onAddSpace?.()}
                className="w-full flex items-center gap-2 py-2 px-2.5 mt-1 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer text-left"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>New Space</span>
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Resizer Border Handle */}
      {!isSubSidebarCollapsed && (
        <div
          onMouseDown={startResizing}
          onDoubleClick={() => setSidebarWidth(240)}
          className={`hidden md:block w-[4px] hover:w-[6px] relative cursor-col-resize h-full bg-transparent hover:bg-indigo-500/50 dark:hover:bg-indigo-500/50 transition-all z-40 select-none group shrink-0 ${
            isResizing ? 'bg-indigo-500/70 w-[6px]' : ''
          }`}
        >
          {/* Custom Instructions Tooltip */}
          <div className="pointer-events-none absolute left-full ml-3 top-12 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] py-2 px-3 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] border border-slate-800 z-50 whitespace-nowrap space-y-1.5 font-sans">
            <div className="font-extrabold uppercase text-[8px] tracking-wider text-indigo-400">Sidebar Controls</div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300">Resize</span>
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono text-[9px] border border-slate-700 font-bold shadow-xs">Drag</kbd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300">Toggle</span>
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono text-[9px] border border-slate-700 font-bold shadow-xs">Ctrl + \</kbd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300">Reset</span>
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono text-[9px] border border-slate-700 font-bold shadow-xs">Double Click</kbd>
            </div>
          </div>
        </div>
      )}


      {/* Restore sub-sidebar trigger if collapsed */}
      {isSubSidebarCollapsed && (
        <button
          onClick={() => setIsSubSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-slate-900 border border-l-0 border-slate-200/80 dark:border-slate-800 rounded-r-xl shadow-md p-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer shrink-0 hidden md:block"
          title="Expand Spaces Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Main Page Workspace Content Container (Right) */}
      <div className="flex-grow flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/80 flex flex-col relative z-30 select-none shadow-3xs font-sans">
          
          {/* Row 1: Breadcrumbs & Actions (Image 2 Top Row) */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/65 flex-wrap gap-2.5">
            {/* Left Side: Space Selector Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 relative">
              {/* Space Icon & Name */}
              <div 
                onClick={() => {
                  if (setActiveListId) setActiveListId(null);
                  setActiveView('overview');
                }}
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
              >
                {activeSpace.emoji && activeSpace.emoji !== '📦' ? (
                  <span className="text-sm shrink-0">{activeSpace.emoji}</span>
                ) : (
                  <div 
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-3xs"
                    style={{ 
                      backgroundColor: 
                        activeSpace.themeColor === 'rose' ? '#FF3366' : 
                        activeSpace.themeColor === 'sky' ? '#33D1FF' : 
                        activeSpace.themeColor === 'emerald' ? '#10b981' : 
                        activeSpace.themeColor === 'amber' ? '#f59e0b' : 
                        activeSpace.themeColor === 'sunset' ? '#f97316' : '#7B61FF' 
                    }}
                  >
                    {(activeSpace.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-slate-850 dark:text-slate-200 font-extrabold">{activeSpace.name}</span>
              </div>

              {/* Folder if nested or active directly */}
              {(() => {
                const currentList = activeSpace.lists?.find(l => l.id === activeListId);
                const folderId = currentList?.folderId || activeFolderId;
                const folder = activeSpace.folders?.find(f => f.id === folderId);
                if (folder) {
                  return (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 mx-0.5 font-normal">/</span>
                      <div className="flex items-center gap-1 text-slate-550 dark:text-slate-400">
                        <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                    </>
                  );
                }
                return null;
              })()}

              {/* List Name and Navigator Chevron */}
              {(() => {
                const currentList = activeSpace.lists?.find(l => l.id === activeListId);
                if (currentList) {
                  return (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 mx-0.5 font-normal">/</span>
                      
                      <div 
                        onClick={() => setShowBreadcrumbNav(!showBreadcrumbNav)}
                        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors bg-slate-50 dark:bg-slate-805 py-1 px-2 rounded-lg"
                      >
                        <List className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span className="text-slate-850 dark:text-slate-200 font-extrabold">{currentList.name}</span>
                        <ChevronDown className="w-3 h-3 text-slate-450" />
                      </div>

                      {/* Interactive Breadcrumb Dropdown Navigator (Image 5) */}
                      {showBreadcrumbNav && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowBreadcrumbNav(false)} />
                          <div className="absolute left-0 top-full mt-2 w-[280px] bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-left font-sans select-none animate-fadeIn text-xs">
                            {/* Search bar */}
                            <div className="relative mb-2">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={breadcrumbSearch}
                                onChange={e => setBreadcrumbSearch(e.target.value)}
                                placeholder="Search folders, lists..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500"
                              />
                            </div>

                            {/* Active Space Header */}
                            <div className="flex items-center gap-1.5 px-1 py-1.5 border-b border-slate-100 dark:border-slate-800/50 mb-1">
                              <span className="text-xs">📦</span>
                              <span className="font-extrabold text-slate-700 dark:text-slate-300">{activeSpace.name}</span>
                            </div>

                            {/* Space Tree */}
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {/* Folders */}
                              {activeSpace.folders?.map(folder => {
                                const folderLists = activeSpace.lists?.filter(l => l.folderId === folder.id && l.name.toLowerCase().includes(breadcrumbSearch.toLowerCase())) || [];
                                if (breadcrumbSearch && folderLists.length === 0) return null;
                                return (
                                  <div key={folder.id} className="space-y-0.5">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-extrabold px-1 uppercase tracking-wider">
                                      <Folder className="w-3 h-3 text-indigo-400" />
                                      <span>{folder.name}</span>
                                    </div>
                                    <div className="pl-3 space-y-0.5">
                                      {folderLists.map(list => (
                                        <button
                                          key={list.id}
                                          type="button"
                                          onClick={() => {
                                            if (setActiveListId) setActiveListId(list.id);
                                            setActiveView('table');
                                            setShowBreadcrumbNav(false);
                                            setBreadcrumbSearch('');
                                          }}
                                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-805 text-left font-bold cursor-pointer ${
                                            activeListId === list.id ? 'text-indigo-600 bg-indigo-50/40 dark:text-indigo-400 dark:bg-indigo-955/10' : 'text-slate-600 dark:text-slate-350'
                                          }`}
                                        >
                                          <List className="w-3 h-3 text-slate-400" />
                                          <span className="truncate">{list.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Direct Lists */}
                              {activeSpace.lists?.filter(l => !l.folderId && l.name.toLowerCase().includes(breadcrumbSearch.toLowerCase())).map(list => (
                                <button
                                  key={list.id}
                                  type="button"
                                  onClick={() => {
                                    if (setActiveListId) setActiveListId(list.id);
                                    setActiveView('table');
                                    setShowBreadcrumbNav(false);
                                    setBreadcrumbSearch('');
                                  }}
                                  className={`w-full flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-805 text-left font-bold cursor-pointer ${
                                    activeListId === list.id ? 'text-indigo-650 bg-indigo-50/40 dark:text-indigo-400 dark:bg-indigo-955/10' : 'text-slate-655 dark:text-slate-350'
                                  }`}
                                >
                                  <List className="w-3 h-3 text-slate-400" />
                                  <span className="truncate">{list.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                }
                return null;
              })()}

              {/* Favorite Star Button */}
              <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-1 text-slate-400 hover:text-amber-500 rounded-md transition-colors ml-1 cursor-pointer"
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
              </button>
            </div>

            {/* Right Side Actions (Row 1): Call, Agents, Automate, Brain, Share */}
            <div className="flex items-center gap-1 flex-wrap">
              <button className="py-1 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
                <Phone className="w-3.5 h-3.5 text-slate-450" />
                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
              </button>
              <button className="py-1 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
                <Bot className="w-3.5 h-3.5 text-slate-455" />
                <span>Agents</span>
              </button>
              <button className="py-1 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-455" />
                <span>Automate</span>
              </button>
              <button className="py-1 px-2 text-slate-550 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Brain²</span>
              </button>
              <button className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 hover:text-slate-800 dark:hover:text-white text-[11px] font-black rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ml-1 text-slate-655 shadow-3xs">
                <Users className="w-3.5 h-3.5 text-slate-455" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Row 2: View Tabs & View Controls (Image 2 Bottom Row) */}
          <div className="flex items-center justify-between px-5 py-1 flex-wrap gap-2.5">
            {/* Left Side: View Tab Selector Bar */}
            <div className="flex items-center gap-4 flex-wrap">
              {staticTabs.map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setActiveView(tab.viewId);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setViewContextMenu({
                        show: true,
                        x: e.clientX,
                        y: e.clientY,
                        tabId: tab.id
                      });
                    }}
                    className={`py-2 px-0.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative border-b-2 ${
                      isActive 
                        ? 'text-slate-900 dark:text-white border-indigo-500 font-extrabold' 
                        : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {/* View options */}
              <div className="relative">
                {isSearchViewOpen ? (
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Search views..."
                      value={searchViewQuery}
                      onChange={(e) => {
                        setSearchViewQuery(e.target.value);
                        setShowAddViewMenu(true);
                      }}
                      onFocus={() => setShowAddViewMenu(true)}
                      className="bg-white dark:bg-slate-950 border border-indigo-500 rounded-lg pl-8 pr-7 py-1 text-[11px] font-semibold outline-none text-slate-800 dark:text-slate-100 w-44 transition-all shadow-xs"
                    />
                    <button 
                      onClick={() => {
                        setIsSearchViewOpen(false);
                        setShowAddViewMenu(false);
                        setSearchViewQuery('');
                      }} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-650"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsSearchViewOpen(true);
                      setShowAddViewMenu(true);
                    }}
                    className="py-1 px-2.5 text-xs font-bold text-slate-500 hover:text-indigo-650 rounded-lg flex items-center gap-1 transition-colors cursor-pointer hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-455" />
                    <span>View</span>
                  </button>
                )}

                {showAddViewMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => {
                        setShowAddViewMenu(false);
                        setIsSearchViewOpen(false);
                        setSearchViewQuery('');
                      }} 
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-[calc(100vw-32px)] sm:w-[460px] max-h-[calc(100vh-220px)] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 text-left font-sans select-none overflow-hidden animate-fadeIn">
                      {/* Search box inside dropdown */}
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input 
                          type="text"
                          placeholder="Search or describe a view to create"
                          value={searchViewQuery}
                          onChange={(e) => setSearchViewQuery(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold outline-none border-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                          autoFocus
                        />
                        <button 
                          onClick={() => {
                            if (searchViewQuery.trim()) {
                              const found = POPULAR_VIEWS.find(v => v.label.toLowerCase().includes(searchViewQuery.toLowerCase()));
                              if (found) handleSelectView(found);
                            }
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-450 hover:text-indigo-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                        </button>
                      </div>

                      {/* Popular views grid */}
                      <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-0 custom-scrollbar">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest px-1.5 mb-2">Popular</p>
                          <div className="grid grid-cols-2 gap-2">
                            {POPULAR_VIEWS.filter(v => !searchViewQuery.trim() || v.label.toLowerCase().includes(searchViewQuery.toLowerCase())).map(view => {
                              const ViewIcon = view.icon;
                              return (
                                <button
                                  key={view.id}
                                  onClick={() => handleSelectView(view)}
                                  className="w-full flex items-center gap-3 p-2 rounded-xl border border-slate-150/60 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/10 hover:border-indigo-500/40 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 hover:shadow-xs transition-all text-left cursor-pointer group"
                                >
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: view.bg }}
                                  >
                                    <ViewIcon className="w-4 h-4" style={{ color: view.color }} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{view.label}</p>
                                    <p className="text-[9px] text-slate-400 truncate mt-0.5">{view.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Footer checkboxes */}
                      <div className="px-3.5 py-2.5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-4 text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-transparent" />
                          <span>Private view</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-transparent" defaultChecked />
                          <span>Pin view</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Side: View Controls (Filter, Checkmark, Search, Settings, +Task) */}
            <div className="flex items-center gap-3">
              {/* Extra view tools */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => alert("Filters applied.")}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Filter"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert("Show completed tasks toggled.")}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Show Closed Tasks"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert("Search task list.")}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Search Tasks"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

              {/* Space settings cog */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (activeSpaceSettings?.id === activeSpace.id) {
                    setActiveSpaceSettings(null);
                  } else {
                    setActiveSpaceSettings({
                      id: activeSpace.id,
                      x: rect.left - 200,
                      y: rect.bottom + 4
                    });
                  }
                  setActiveSpaceMenu(null);
                  setActiveListMenu(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer relative"
                title="Space Settings"
              >
                <Cog className="w-4 h-4" />
              </button>

              {/* Blue "+ Task" button */}
              <div className="flex items-center rounded-xl overflow-hidden shadow-sm shadow-blue-500/20 bg-[#007fff] hover:bg-blue-600 transition-colors shrink-0">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="pl-3.5 pr-2 py-1.5 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white stroke-[2.5px]" />
                  <span>Task</span>
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button
                  onClick={() => alert("More Task creation options.")}
                  className="px-2 py-1.5 text-white cursor-pointer hover:bg-white/10"
                >
                  <ChevronDown className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
        </header>

      {/* ── Filter / Sorter Bar (Only visible in list/board/table/gantt views) ── */}
      {['list', 'board', 'table', 'gantt'].includes(activeView) && (
        <div className="shrink-0 bg-white dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/60 px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-3xs">
          
          {/* Search task input */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl px-3 py-1.5 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Drawer Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-650 dark:bg-indigo-950/20 dark:border-indigo-905'
                  : 'bg-white border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sorter Selector */}
            <div className="relative">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-3 py-1.5 pr-7 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-655 outline-none cursor-pointer"
              >
                <option value="manual">Manual Sorting</option>
                <option value="priority">Sort by Priority</option>
                <option value="dueDate">Sort by Due Date</option>
                <option value="title">Sort alphabetically (A-Z)</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* AI suggestions suggestions suggestions */}
            <button
              onClick={() => {
                if (!currentUser?.isPremium) {
                  onUpgradePremium?.();
                  return;
                }
                setShowAiPriorityModal(true);
                fetchAiPriority();
              }}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-[11px] font-bold hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Priorities</span>
            </button>

            {/* Pomodoro Focus indicator */}
            {isFocusActive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 rounded-xl text-[11px] font-bold text-rose-600">
                <Timer className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-mono">{formatTime(timeLeft)}</span>
                <button onClick={() => setTimerRunning(!timerRunning)}>
                  {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5"
          >
            <div className="flex gap-4 flex-wrap text-xs font-bold text-slate-700 dark:text-slate-350">
              {/* Priority Filters */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase">Priority</label>
                <div className="flex gap-1.5">
                  {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => setFilterPriority(p)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
                        filterPriority === p 
                          ? 'bg-indigo-600 border-indigo-650 text-white' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee Filters */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase">Assignee</label>
                <select 
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 outline-none"
                >
                  <option value="all">Everyone</option>
                  <option value="user">Me Only</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    setFilterPriority('all');
                    setFilterAssignee('all');
                    setFilterTag('all');
                  }}
                  className="px-3 py-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-[11px] transition-colors"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Module Rendering Body Section ── */}
      <main className="flex-1 overflow-y-auto p-5 select-none scrollbar-none">
        
        {/* Render Overview Dashboard */}
        {activeView === 'overview' && (
          <SpaceOverviewTab 
            space={activeSpace}
            tasks={tasks}
            members={members}
            docs={allDocs}
            activeFolderId={activeFolderId}
            onOpenList={(listId) => {
              if (setActiveListId) setActiveListId(listId);
              setActiveView('table');
            }}
            onAddList={() => onAddListSpace?.(activeSpace.id)}
            onAddTask={onAddTask}
            triggerToast={triggerToast}
            onAddFolder={() => {
              const name = prompt("Enter Folder Name:");
              if (name?.trim() && onAddFolderToSpace) {
                onAddFolderToSpace(activeSpace.id, name.trim());
              }
            }}
            onAddDoc={() => {
              const title = prompt("Enter Doc Title:");
              if (title?.trim() && onAddDocToSpace) {
                onAddDocToSpace(activeSpace.id, title.trim());
              }
            }}
            onOpenDoc={(docId) => {
              setActiveView('doc');
            }}
          />
        )}

        {/* Render `# Channel` Chat room */}
        {activeView === 'channel' && (
          <ChatRoom
            members={members}
            currentUser={currentUser}
            isOffline={isOffline}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            workspaceId={activeWorkspaceId || ''}
            spaces={spaces}
            forcedChannelId={activeListId ? `${activeWorkspaceId}:list-${activeSpaceId}-${activeListId}` : activeFolderId ? `${activeWorkspaceId}:folder-${activeSpaceId}-${activeFolderId}` : `${activeWorkspaceId}:space-${activeSpaceId}-general`}
            forcedChannelName={activeListId ? (activeSpace.lists?.find(l => l.id === activeListId)?.name || 'List') : activeFolderId ? (activeSpace.folders?.find(f => f.id === activeFolderId)?.name || 'Folder') : 'general'}
          />
        )}

        {/* Render Task List View */}
        {activeView === 'list' && (
          <TaskListView 
            filteredTasks={filteredTasks}
            tasks={tasks}
            members={members}
            workspaces={allWorkspaces || []}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            isSmartSort={isSmartSort}
            isUrgentNearDueTask={isUrgentNearDueTask}
            isMultiSelectMode={isMultiSelectMode}
            onAddTask={onAddTask}
            setViewType={setActiveView as any}
          />
        )}

        {/* Render Kanban Board View */}
        {activeView === 'board' && (
          <TaskBoardView 
            filteredTasks={filteredTasks}
            members={members}
            workspaces={allWorkspaces || []}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            boardGroupBy={boardGroupBy}
            setBoardGroupBy={setBoardGroupBy}
            boardSwimlaneBy={boardSwimlaneBy}
            setBoardSwimlaneBy={setBoardSwimlaneBy}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            isSmartSort={isSmartSort}
            isUrgentNearDueTask={isUrgentNearDueTask}
            isMultiSelectMode={isMultiSelectMode}
            activeDragId={activeDragId}
            activeOverDropId={activeOverDropId}
            cardSize={cardSize}
            setCardSize={setCardSize}
            cardCover={cardCover}
            setCardCover={setCardCover}
            onAddTask={onAddTask}
          />
        )}

        {/* Render Table View */}
        {activeView === 'table' && (
          <TaskTableView 
            filteredTasks={filteredTasks}
            members={members}
            workspaces={allWorkspaces || []}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            visibleFields={visibleFields}
            customFields={customFields}
            onOpenFieldsPanel={() => setShowFieldsPanel(true)}
          />
        )}

        {/* Render Gantt Chart View */}
        {activeView === 'gantt' && (
          <TaskGanttView 
            filteredTasks={filteredTasks}
            members={members}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={onUpdateTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
          />
        )}

        {/* Integrate Calendar Module */}
        {activeView === 'calendar' && (
          <CalendarView 
            tasks={filteredTasks}
            members={members}
            isOffline={isOffline}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
          />
        )}

        {/* Integrate Whiteboard Module */}
        {activeView === 'whiteboard' && (
          <Whiteboard 
            members={members}
            isOffline={isOffline}
            onAddSyncLog={onAddSyncLog}
            whiteboardId={activeSpaceId || ''}
            onAddTask={onAddTask}
            tasks={filteredTasks}
          />
        )}

        {/* Integrate Document Hub Module */}
        {activeView === 'doc' && (
          <DocumentHub 
            docs={allDocs.filter(d => activeSpaceId ? d.spaceId === activeSpaceId : d.workspaceId === activeWorkspaceId)}
            currentUser={currentUser}
            onAddDoc={onAddDoc || (() => {})}
            onUpdateDoc={onUpdateDoc || (() => {})}
            onDeleteDoc={onDeleteDoc || (() => {})}
            isOffline={isOffline}
            onAddSyncLog={onAddSyncLog}
            initialSelectedDocId={null}
            onClearInitialSelectedDocId={() => {}}
          />
        )}

        {/* Integrate Team Directory Module */}
        {activeView === 'team' && (
          <TeamDirectory 
            members={members}
            tasks={tasks}
            workspaces={allWorkspaces || []}
            activeWorkspaceId={activeWorkspaceId || ''}
            onAddMember={() => {}}
            onUpdateMember={() => {}}
            onDeleteMember={() => {}}
            onAddSyncLog={onAddSyncLog}
          />
        )}

        {/* Integrate Dashboard/Analytics Overview Module */}
        {activeView === 'dashboard' && (
          <DashboardOverview 
            tasks={filteredTasks}
            members={members}
            docs={allDocs}
            syncLogs={syncLogs}
            isOffline={isOffline}
            onNavigate={(tab) => onNavigate?.(tab)}
            onToggleOffline={() => onToggleOffline?.()}
            currentUser={currentUser}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
          />
        )}

        {/* Timeline View */}
        {activeView === 'timeline' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Timeline view</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed text-left">Visualize your project schedule, deadlines, and milestones sequentially.</p>
            <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/30">
              <Calendar className="w-10 h-10 text-slate-400 animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-700 dark:text-slate-250">No timeline items found</p>
                <p className="text-[10px] text-slate-400">Add start and due dates to your tasks to populate the timeline.</p>
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed View */}
        {activeView === 'activity' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span>Activity Feed</span>
            </h3>
            <div className="space-y-3">
              {syncLogs && syncLogs.length > 0 ? (
                syncLogs.slice(0, 10).map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10">
                    <span className="text-lg">⚡</span>
                    <div>
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-200">{log.action}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(log.time).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-xs font-medium">
                  No activities logged yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workload Capacity View */}
        {activeView === 'workload' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <span>Workload Capacity</span>
            </h3>
            <div className="space-y-4">
              {members.map(member => {
                const memberTasks = tasks.filter(t => t.assigneeId === member.id);
                const capacityPct = Math.min(100, Math.round((memberTasks.length / 5) * 100));
                return (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{member.name}</span>
                      <span className="text-slate-400 font-semibold">{memberTasks.length} / 5 tasks</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${capacityPct > 80 ? 'bg-rose-500' : capacityPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mind Map View */}
        {activeView === 'mindmap' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-pink-500" />
              <span>Mind Map view</span>
            </h3>
            <div className="p-8 border border-slate-150 dark:border-slate-850 rounded-2xl bg-slate-50/20 dark:bg-slate-950/10 flex flex-col items-center space-y-4">
              <div className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-sm">
                {activeSpace.name}
              </div>
              <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />
              <div className="grid grid-cols-3 gap-6 w-full">
                {activeSpace.lists.map(list => (
                  <div key={list.id} className="flex flex-col items-center">
                    <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-750 dark:text-slate-300 shadow-3xs w-full text-center truncate">
                      {list.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Survey View */}
        {activeView === 'form' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-500" />
              <span>Form Survey Builder</span>
            </h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Form Title</label>
                <input type="text" defaultValue="Task Request Form" className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Form Fields</label>
                <div className="p-3 bg-slate-50/30 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800"><span>Task Name</span><span className="text-[10px] text-slate-400 font-bold">Text</span></div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800"><span>Description</span><span className="text-[10px] text-slate-400 font-bold">Textarea</span></div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800"><span>Priority</span><span className="text-[10px] text-slate-400 font-bold">Select</span></div>
                </div>
              </div>
              <button onClick={() => alert("Form published!")} className="px-4 py-2 bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">Publish Form</button>
            </div>
          </div>
        )}

        {/* Map View */}
        {activeView === 'map' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-amber-600" />
              <span>Map view</span>
            </h3>
            <div className="h-64 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-center text-slate-400 text-xs font-semibold relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#ddd_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
              <div className="relative z-10 space-y-1">
                <p className="font-extrabold text-slate-700 dark:text-slate-200">Interactive Map Sandbox</p>
                <p className="text-[10px] text-slate-400">All tasks plotted on map based on location metadata tags.</p>
              </div>
            </div>
          </div>
        )}

        {/* Create with AI View */}
        {activeView === 'ai' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span>Avaxa AI Generator</span>
            </h3>
            <div className="space-y-4 max-w-lg">
              <p className="text-xs text-slate-500 leading-relaxed">Let Avaxa AI analyze your workspace context, suggest new lists, or generate workflow structures dynamically.</p>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. Generate a content marketing list with 5 tasks" className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100" />
                <button onClick={() => alert("AI generation started!")} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors shrink-0">Generate</button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Task Detail Drawer Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailsPanel 
            task={selectedTask}
            members={members}
            workspaces={allWorkspaces || []}
            spaces={spaces}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={(t) => {
              onUpdateTask(t);
              setSelectedTask(t);
            }}
            onDeleteTask={(id) => {
              onDeleteTask(id);
              setSelectedTask(null);
            }}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            onAttachmentUpload={handleAttachmentUpload}
            onAttachmentDelete={handleAttachmentDelete}
            onAiSubtasks={triggerAiSubtasks}
            aiGenerating={aiGenerating}
            onAiSummary={handleAiSummary}
            isSummarizing={isSummarizing}
            aiSummary={aiSummary}
            allTasks={tasks}
            allDocs={allDocs}
            onOpenFieldsPanel={() => setShowFieldsPanel(true)}
          />
        )}
      </AnimatePresence>

      {/* Full Task Create Dialog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[140] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-[0_20px_50px_rgba(109,85,254,0.15)] space-y-5 overflow-hidden"
          >
            {/* Top decorative gradient border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <span>Create New Task</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Task Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="What needs to be done?" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Description</label>
                <textarea 
                  placeholder="Task details & notes..." 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full h-24 px-4 py-2.5 text-xs rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-semibold transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Priority</label>
                  <PriorityPillSelect value={newPrio} onChange={setNewPrio} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Assignee</label>
                  <AssigneePillSelect 
                    members={members.filter(m => !activeWorkspaceId || m.workspaceIds?.includes(activeWorkspaceId))} 
                    value={newAssignee || null} 
                    onChange={(val) => setNewAssignee(val || '')} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Start Date</label>
                  <PremiumDatePicker dateValue={newStartDate} onChange={(val) => setNewStartDate(val || '')} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Due Date</label>
                  <PremiumDatePicker dateValue={newDueDate} onChange={(val) => setNewDueDate(val || '')} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="py-2.5 px-6 bg-gradient-to-r from-indigo-650 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Urgency Suggestion Modal */}
      {showAiPriorityModal && (
        <div className="fixed inset-0 z-[140] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <span>AI Urgency Suggestions</span>
              </h3>
              <button onClick={() => setShowAiPriorityModal(false)} className="text-slate-400 hover:text-slate-650 text-sm">✕</button>
            </div>

            {loadingAiPriority ? (
              <div className="text-center py-10 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Avaxa AI is calculating urgency factors...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                  <p className="leading-relaxed">{aiSuggestions?.explanation}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase">Recommended Actions</h4>
                  {aiSuggestions?.suggestedTasks?.map((t: Task) => (
                    <div 
                      key={t.id} 
                      className="p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center justify-between gap-3 cursor-pointer hover:border-indigo-500/30 transition-all"
                      onClick={() => {
                        setSelectedTask(t);
                        setShowAiPriorityModal(false);
                      }}
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{t.title}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                        t.priority === 'urgent' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}>{t.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* View Tab Right-Click Context Menu (Image 3) */}
      {viewContextMenu.show && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-transparent" 
            onClick={() => setViewContextMenu(prev => ({ ...prev, show: false }))}
            onContextMenu={(e) => { e.preventDefault(); setViewContextMenu(prev => ({ ...prev, show: false })); }}
          />
          <div 
            style={{ top: viewContextMenu.y, left: viewContextMenu.x }}
            className="fixed w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 text-left font-sans select-none overflow-hidden py-1.5 text-xs animate-fadeIn text-slate-700 dark:text-slate-200"
          >
            {/* Favorite */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                alert("Added view to favorites!");
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-slate-400" />
                <span>Favorite</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Rename */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                const newName = prompt("Enter new view name:");
                if (newName?.trim()) {
                  setStaticTabs(prev => prev.map(t => t.id === viewContextMenu.tabId ? { ...t, label: newName.trim() } : t));
                }
              }}
              className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>Rename</span>
            </button>

            {/* Copy link to view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                navigator.clipboard.writeText(window.location.href);
                alert("Copied view link to clipboard!");
              }}
              className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy link to view</span>
            </button>

            {/* Customize view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                alert("Customize view settings.");
              }}
              className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <Cog className="w-3.5 h-3.5 text-slate-400" />
              <span>Customize view</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            {/* Toggle Switches */}
            <div className="px-3.5 py-1 space-y-1.5">
              {[
                { label: 'Pin view', key: 'pin' },
                { label: 'Private view', key: 'private' },
                { label: 'Protect view', key: 'protect' },
                { label: 'Autosave for me', key: 'autosave' },
                { label: 'Set as default view', key: 'default' },
              ].map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-650 dark:text-slate-300 font-bold">{toggle.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-650 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            {/* Export view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                alert("Exporting view data...");
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <span>Export view</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Templates */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                alert("Opening view templates...");
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <span>Templates</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Move */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                alert("Move view action.");
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <span>Move</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Duplicate view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                const currentTab = staticTabs.find(t => t.id === viewContextMenu.tabId);
                if (currentTab) {
                  const newTab = { ...currentTab, id: `tab-${Date.now()}`, label: `${currentTab.label} (Copy)` };
                  setStaticTabs(prev => [...prev, newTab]);
                }
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold"
            >
              <span>Duplicate view</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Delete view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                if (staticTabs.length <= 1) {
                  alert("You must keep at least one view!");
                  return;
                }
                if (confirm("Are you sure you want to delete this view?")) {
                  setStaticTabs(prev => prev.filter(t => t.id !== viewContextMenu.tabId));
                }
              }}
              className="w-full flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-red-600"
            >
              <span>Delete view</span>
            </button>

            <div className="p-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 mt-1">
              <button 
                onClick={() => {
                  setViewContextMenu(prev => ({ ...prev, show: false }));
                  alert("Opening Sharing & Permissions settings...");
                }}
                className="w-full py-1.5 bg-[#007fff] hover:bg-blue-650 text-white font-extrabold text-center rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Sharing & Permissions
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Portals for Space and List Context Menus ── */}
      {activeSpaceMenu && (
        <Portal>
          <div className="fixed inset-0 z-40" onClick={() => setActiveSpaceMenu(null)} />
          <div 
            style={{ 
              position: 'fixed', 
              top: activeSpaceMenu.y, 
              left: Math.min(activeSpaceMenu.x, typeof window !== 'undefined' ? window.innerWidth - 290 : activeSpaceMenu.x)
            }}
            className="w-[280px] p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 text-left font-sans select-none animate-fadeIn max-h-[80vh] overflow-y-auto scrollbar-none"
          >
            {/* Section: CREATE */}
            <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Create</div>
            <div className="space-y-0.5">
              {/* List */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddListSpace?.(activeSpaceMenu.id);
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <List className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">List</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Track tasks, projects, people & more</p>
                </div>
              </button>

              {/* Folder */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const name = prompt("Enter Folder Name:");
                  if (name?.trim() && onAddFolderToSpace) {
                    onAddFolderToSpace(activeSpaceMenu.id, name.trim());
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <Folder className="w-4 h-4 text-indigo-500 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Folder</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Group Lists, Docs & more</p>
                </div>
              </button>

              {/* Sprint Folder */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const name = prompt("Enter Sprint Name:");
                  if (name?.trim() && onAddFolderToSpace) {
                    onAddFolderToSpace(activeSpaceMenu.id, `Sprint: ${name.trim()}`);
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <RefreshCw className="w-4 h-4 text-cyan-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-455 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Sprint Folder</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Manage iterations and sprints</p>
                </div>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

            {/* Section: DOCS & VIEWS */}
            <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Docs & Views</div>
            <div className="space-y-0.5">
              {/* Doc */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const title = prompt("Enter Doc Title:");
                  if (title?.trim() && onAddDocToSpace) {
                    onAddDocToSpace(activeSpaceMenu.id, title.trim());
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <FileText className="w-4 h-4 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Doc</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Collaborate & document anything</p>
                </div>
              </button>

              {/* Dashboard */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (triggerToast) {
                    triggerToast('success', 'Dashboard View Mocked', 'A new dashboard view has been added to this Space.');
                  } else {
                    alert("Dashboard view simulated!");
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <Activity className="w-4 h-4 text-pink-500 group-hover:text-pink-650 dark:group-hover:text-pink-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-855 dark:text-slate-200">Dashboard</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Track metrics & insights</p>
                </div>
              </button>

              {/* Whiteboard */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const name = prompt("Enter Whiteboard Name:");
                  if (name?.trim() && onAddWhiteboardToSpace) {
                    onAddWhiteboardToSpace(activeSpaceMenu.id, name.trim());
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <Sparkles className="w-4 h-4 text-amber-500 group-hover:text-amber-650 dark:group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-855 dark:text-slate-200">Whiteboard</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Visualize & brainstorm ideas</p>
                </div>
              </button>

              {/* Form */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (triggerToast) {
                    triggerToast('info', 'Feature Under Development', 'Form builder integration is coming soon.');
                  } else {
                    alert("Form builder integration is coming soon.");
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <CheckSquare className="w-4 h-4 text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Form</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Collect, track, & report data</p>
                </div>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

            {/* Section: MORE */}
            <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">More</div>
            <div className="space-y-0.5">
              {/* Imports */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (triggerToast) {
                    triggerToast('success', 'Imports Triggered', 'Select a CSV or Excel file to import your tasks.');
                  } else {
                    alert("Imports triggered!");
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <LinkIcon className="w-4 h-4 text-teal-500 group-hover:text-teal-655 dark:group-hover:text-teal-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Imports</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Bring work in from other apps</p>
                </div>
              </button>

              {/* Templates */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (triggerToast) {
                    triggerToast('success', 'Template Library Opened', 'Choose a ClickUp template from our curated workspace library.');
                  } else {
                    alert("Templates gallery opened!");
                  }
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Templates</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-tight mt-0.5">Create from ready-made templates</p>
                </div>
              </button>
            </div>
          </div>
        </Portal>
      )}

      {activeSpaceSettings && (() => {
        const space = spaces.find(s => s.id === activeSpaceSettings.id);
        if (!space) return null;
        return (
          <Portal>
            <div className="fixed inset-0 z-40" onClick={() => setActiveSpaceSettings(null)} />
            <div 
              style={{ 
                position: 'fixed', 
                top: activeSpaceSettings.y, 
                left: Math.min(activeSpaceSettings.x, typeof window !== 'undefined' ? window.innerWidth - 225 : activeSpaceSettings.x)
              }}
              className="w-[215px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 text-left font-sans select-none overflow-hidden text-xs py-1.5 animate-fadeIn"
            >
              {/* Favorite */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceSettings(null);
                  alert("Added Space to favorites!");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-450" />
                  <span className="font-bold">Favorite</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              {/* Rename */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceSettings(null);
                  const newName = prompt("Rename Space:", space.name);
                  if (newName?.trim()) {
                    const updated = spaces.map(s => s.id === space.id ? { ...s, name: newName.trim() } : s);
                    onSaveSpaces?.(updated);
                    onAddSyncLog(`Renamed Space "${space.name}" to "${newName.trim()}"`);
                  }
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Rename</span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceSettings(null);
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/space/${space.id}`);
                  }
                  onAddSyncLog(`Copied space link for space ${space.name}`);
                  alert("Copied Space link to clipboard!");
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Copy link</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Create new */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceSettings(null);
                  setActiveSpaceMenu({
                    id: space.id,
                    x: activeSpaceSettings.x - 20,
                    y: activeSpaceSettings.y
                  });
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-slate-450" />
                  <span className="font-bold">Create new</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-450" />
              </button>

              {/* Color & Icon */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); alert("Color & Icon options can be set inside Workspace settings."); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Droplet className="w-3.5 h-3.5 text-slate-455" />
                  <span className="font-bold">Color & Icon</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-455" />
              </button>

              {/* Automations */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); alert("ClickUp Automations dashboard loaded."); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Automations</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Hide Space */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); alert("Space hidden from sidebar."); }}
                className="w-full px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-202">
                  <EyeOff className="w-3.5 h-3.5 text-slate-450" />
                  <span className="font-bold">Hide Space</span>
                </div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium leading-tight">
                  You'll retain access to this Space, but it won't show in your sidebar
                </span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Duplicate */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceSettings(null);
                  const newSpace = { ...space, id: `s-${Date.now()}`, name: `${space.name} (Copy)` };
                  onSaveSpaces?.([...spaces, newSpace]);
                  onAddSyncLog(`Duplicated Space "${space.name}"`);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-455" />
                <span className="font-bold">Duplicate</span>
              </button>

              {/* Archive */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); alert("Space archived successfully."); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Archive</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceSettings(null);
                  if (confirm(`Are you sure you want to delete Space "${space.name}"?`)) {
                    const updated = spaces.filter(s => s.id !== space.id);
                    onSaveSpaces?.(updated);
                    if (activeSpaceId === space.id) {
                      if (setActiveSpaceId) setActiveSpaceId(updated[0]?.id || null);
                      if (setActiveListId) setActiveListId(null);
                    }
                    onAddSyncLog(`Deleted Space "${space.name}"`);
                  }
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-955/20 text-left cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span className="font-bold">Delete</span>
              </button>

              {/* Sharing & Permissions bottom button */}
              <div className="p-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 mt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); alert("Sharing and permissions menu loaded."); }}
                  className="w-full py-2 bg-[#007fff] hover:bg-blue-650 text-white font-extrabold text-center rounded-lg transition-colors cursor-pointer block text-xs"
                >
                  Sharing & Permissions
                </button>
              </div>
            </div>
          </Portal>
        );
      })()}

      {activeListMenu && (() => {
        const space = spaces.find(s => s.id === activeListMenu.spaceId);
        const list = space?.lists.find(l => l.id === activeListMenu.id);
        if (!space || !list) return null;
        return (
          <Portal>
            <div className="fixed inset-0 z-40" onClick={() => setActiveListMenu(null)} />
            <div 
              style={{ 
                position: 'fixed', 
                top: activeListMenu.y, 
                left: Math.min(activeListMenu.x, typeof window !== 'undefined' ? window.innerWidth - 250 : activeListMenu.x)
              }}
              className="w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 text-left font-sans select-none overflow-hidden py-1.5 text-xs animate-fadeIn text-slate-700 dark:text-slate-200"
            >
              <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">Create</div>
              
              {/* Task */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  const tTitle = prompt("Enter Task Title:");
                  if (tTitle?.trim()) {
                    onAddTask({
                      title: tTitle.trim(),
                      status: 'todo',
                      priority: 'medium',
                      listId: list.id,
                      spaceId: space.id,
                      workspaceId: activeWorkspaceId,
                      dueDate: new Date().toISOString(),
                      description: '',
                      subtasks: []
                    });
                  }
                }}
                className="w-full flex items-start gap-2.5 px-3.5 py-1.5 hover:bg-slate-550 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-slate-700 dark:text-slate-200"
              >
                <span className="text-sm shrink-0">➕</span>
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Task</p>
                  <p className="text-[9px] text-slate-455 leading-none mt-0.5">Create individual tasks to manage your work</p>
                </div>
              </button>
              
              {/* List */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  const newListName = prompt("Enter List Name:");
                  if (newListName?.trim()) {
                    const updated = spaces.map(s => {
                      if (s.id === space.id) {
                        return {
                          ...s,
                          lists: [...s.lists, { id: `l-${Date.now()}`, name: newListName.trim(), folderId: activeListMenu.folderId || undefined }]
                        };
                      }
                      return s;
                    });
                    onSaveSpaces?.(updated);
                  }
                }}
                className="w-full flex items-start gap-2.5 px-3.5 py-1.5 hover:bg-slate-550 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-slate-700 dark:text-slate-200"
              >
                <List className="w-4 h-4 text-slate-455 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">List</p>
                  <p className="text-[9px] text-slate-455 leading-none mt-0.5">Track tasks, projects, people & more</p>
                </div>
              </button>
              
              {/* Sprint */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  const sprintName = prompt("Enter Sprint Name:");
                  if (sprintName?.trim()) {
                    const updated = spaces.map(s => {
                      if (s.id === space.id) {
                        return {
                          ...s,
                          lists: [...s.lists, { id: `l-${Date.now()}`, name: `Sprint ${sprintName.trim()}`, folderId: activeListMenu.folderId || undefined }]
                        };
                      }
                      return s;
                    });
                    onSaveSpaces?.(updated);
                  }
                }}
                className="w-full flex items-start gap-2.5 px-3.5 py-1.5 hover:bg-slate-550 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-slate-700 dark:text-slate-200"
              >
                <RefreshCw className="w-4 h-4 text-indigo-550 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-805 dark:text-slate-200">Sprint</p>
                  <p className="text-[9px] text-slate-455 leading-none mt-0.5">Plan a new Sprint</p>
                </div>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              
              {/* Doc */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  const docT = prompt("Enter Doc Title:");
                  if (docT?.trim() && onAddDocToSpace) {
                    onAddDocToSpace(space.id, docT.trim());
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-550 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-slate-700 dark:text-slate-200"
              >
                <span className="text-sm shrink-0">📄</span>
                <span>Doc</span>
              </button>

              {/* Dashboard */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveListMenu(null); alert("Dashboard creation triggered."); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-550 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-slate-700 dark:text-slate-200"
              >
                <Activity className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <span>Dashboard</span>
              </button>
              
              {/* Whiteboard */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  const boardName = prompt("Enter Whiteboard Name:");
                  if (boardName?.trim() && onAddWhiteboardToSpace) {
                    onAddWhiteboardToSpace(space.id, boardName.trim());
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-550 dark:hover:bg-slate-800 text-left cursor-pointer font-bold text-slate-700 dark:text-slate-200"
              >
                <Brain className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Whiteboard</span>
              </button>
            </div>
          </Portal>
        );
      })()}

      {/* ── Portal for List Settings Dropdown Menu ── */}
      {activeListSettings && (() => {
        const space = spaces.find(s => s.id === activeListSettings.spaceId);
        const list = space?.lists.find(l => l.id === activeListSettings.id);
        if (!space || !list) return null;
        return (
          <Portal>
            <div className="fixed inset-0 z-40" onClick={() => setActiveListSettings(null)} />
            <div 
              style={{ 
                position: 'fixed', 
                top: activeListSettings.y, 
                left: Math.min(activeListSettings.x, typeof window !== 'undefined' ? window.innerWidth - 225 : activeListSettings.x)
              }}
              className="w-[215px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 text-left font-sans select-none overflow-hidden text-xs py-1.5 animate-fadeIn"
            >
              {/* Favorite */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  alert("Added List to favorites!");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-450" />
                  <span className="font-bold">Favorite</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              {/* Rename */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  const newName = prompt("Rename List:", list.name);
                  if (newName?.trim()) {
                    const updatedLists = space.lists.map(l => l.id === list.id ? { ...l, name: newName.trim() } : l);
                    const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                    onSaveSpaces?.(updated);
                    onAddSyncLog(`Renamed List "${list.name}" to "${newName.trim()}"`);
                  }
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Rename</span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/space/${space.id}/list/${list.id}`);
                  }
                  onAddSyncLog(`Copied list link for list ${list.name}`);
                  alert("Copied List link to clipboard!");
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Copy link</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Custom Fields */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  setShowFieldsPanel(true);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Custom Fields</span>
              </button>

              {/* Automations */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveListSettings(null); alert("List Automations settings loaded."); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Automations</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Duplicate */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  const newListName = `${list.name} (Copy)`;
                  const updatedLists = [...space.lists, { id: `l-${Date.now()}`, name: newListName, folderId: list.folderId }];
                  const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                  onSaveSpaces?.(updated);
                  onAddSyncLog(`Duplicated List "${list.name}"`);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Duplicate</span>
              </button>

              {/* Archive */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveListSettings(null); alert("List archived successfully."); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Archive</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  if (confirm(`Are you sure you want to delete List "${list.name}"?`)) {
                    const updatedLists = space.lists.filter(l => l.id !== list.id);
                    const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                    onSaveSpaces?.(updated);
                    if (activeListId === list.id) {
                      if (setActiveListId) setActiveListId(null);
                    }
                    onAddSyncLog(`Deleted List "${list.name}"`);
                  }
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-955/20 text-left cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span className="font-bold">Delete</span>
              </button>
            </div>
          </Portal>
        );
      })()}

      {/* ── Portal for Folder Settings Dropdown Menu ── */}
      {activeFolderSettings && (() => {
        const space = spaces.find(s => s.id === activeFolderSettings.spaceId);
        const folder = space?.folders?.find(f => f.id === activeFolderSettings.id);
        if (!space || !folder) return null;
        return (
          <Portal>
            <div className="fixed inset-0 z-40" onClick={() => { setActiveFolderSettings(null); setFolderColorMenuOpen(null); }} />
            <div 
              style={{ 
                position: 'fixed', 
                top: activeFolderSettings.y, 
                left: Math.min(activeFolderSettings.x, typeof window !== 'undefined' ? window.innerWidth - 250 : activeFolderSettings.x)
              }}
              className="w-[235px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-left font-sans select-none overflow-hidden text-xs py-2 animate-fadeIn"
            >
              {/* Favorite */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  alert("Added Folder to favorites!");
                }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-650 dark:text-slate-350">Favorite</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              {/* Rename */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  const newName = prompt("Rename Folder:", folder.name);
                  if (newName?.trim()) {
                    const updatedFolders = space.folders?.map(f => f.id === folder.id ? { ...f, name: newName.trim() } : f) || [];
                    const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders } : s);
                    onSaveSpaces?.(updated);
                    onAddSyncLog(`Renamed Folder "${folder.name}" to "${newName.trim()}"`);
                  }
                }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Rename</span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/space/${space.id}/folder/${folder.id}`);
                  }
                  onAddSyncLog(`Copied folder link for folder ${folder.name}`);
                  alert("Copied Folder link to clipboard!");
                }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Copy link</span>
              </button>

                   {/* Create new */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  const name = prompt("Enter List Name:");
                  if (name?.trim() && onAddListToFolder) {
                    onAddListToFolder(space.id, folder.id, name.trim());
                  }
                }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-650 dark:text-slate-355">Create new</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              {/* Folder color */}
              <div className="border-b border-slate-100 dark:border-slate-800/80 my-1 pb-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderColorMenuOpen(folderColorMenuOpen === folder.id ? null : folder.id);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Droplet className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-650 dark:text-slate-355">Folder color</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border border-slate-200/50" style={{ backgroundColor: folder.color || '#6366f1' }} />
                    <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${folderColorMenuOpen === folder.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {folderColorMenuOpen === folder.id && (
                  <div className="px-3.5 py-2 grid grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-950 rounded-xl mx-2 my-1 animate-fadeIn">
                    {[
                      { hex: '#6366f1', name: 'indigo' },
                      { hex: '#ec4899', name: 'rose' },
                      { hex: '#0ea5e9', name: 'sky' },
                      { hex: '#10b981', name: 'emerald' },
                      { hex: '#f59e0b', name: 'amber' },
                      { hex: '#f97316', name: 'sunset' }
                    ].map(colorOpt => (
                      <button
                        key={colorOpt.hex}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updatedFolders = space.folders?.map(f => f.id === folder.id ? { ...f, color: colorOpt.hex } : f) || [];
                          const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders } : s);
                          onSaveSpaces?.(updated);
                          onAddSyncLog(`Changed Folder "${folder.name}" color to ${colorOpt.name}`);
                          setFolderColorMenuOpen(null);
                          setActiveFolderSettings(null);
                        }}
                        className={`w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform border ${
                          folder.color === colorOpt.hex ? 'border-slate-800 dark:border-white ring-1 ring-slate-400' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: colorOpt.hex }}
                        title={colorOpt.name}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Automations */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); alert("Folder Automations settings loaded."); }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Automations</span>
              </button>

              {/* Custom Fields */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  setShowFieldsPanel(true);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Custom Fields</span>
              </button>

              {/* Task statuses */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); alert("Manage Task Statuses for this Folder."); }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Task statuses</span>
              </button>

              {/* More */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-650 dark:text-slate-350">More</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Imports */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-650 dark:text-slate-350">Imports</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              {/* Templates */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-650 dark:text-slate-350">Templates</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Move */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-650 dark:text-slate-350">Move</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>

              {/* Duplicate */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  const newFolderName = `${folder.name} (Copy)`;
                  const updatedFolders = [...(space.folders || []), { id: `f-${Date.now()}`, name: newFolderName }];
                  const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders } : s);
                  onSaveSpaces?.(updated);
                  onAddSyncLog(`Duplicated Folder "${folder.name}"`);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Duplicate</span>
              </button>

              {/* Archive */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); alert("Folder archived successfully."); }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">Archive</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  if (confirm(`Are you sure you want to delete Folder "${folder.name}" and all its lists?`)) {
                    const updatedFolders = space.folders?.filter(f => f.id !== folder.id) || [];
                    const updatedLists = space.lists?.filter(l => l.folderId !== folder.id) || [];
                    const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders, lists: updatedLists } : s);
                    onSaveSpaces?.(updated);
                    if (activeFolderId === folder.id) {
                      setActiveFolderId(null);
                    }
                    onAddSyncLog(`Deleted Folder "${folder.name}"`);
                  }
                }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-red-655 hover:bg-red-50 dark:hover:bg-red-955/20 text-left cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span className="font-bold">Delete</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1.5" />

              {/* Sharing & Permissions */}
              <div className="px-3 py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderSettings(null);
                    alert("Sharing & Permissions settings loaded.");
                  }}
                  className="w-full py-1.5 text-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  Sharing & Permissions
                </button>
              </div>
            </div>
          </Portal>
        );
      })()}

      {/* ── Portal for Custom Fields Drawer ── */}
      {showFieldsPanel && (
        <Portal>
          <div className="fixed inset-0 z-[80]" onClick={() => setShowFieldsPanel(false)} />
          <div 
            className="fixed top-0 right-0 h-full w-[330px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-[90] shadow-2xl flex flex-col p-4 font-sans select-none animate-slideInRight"
            style={{ boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-205 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span className="font-black text-[13px] text-slate-800 dark:text-slate-100 uppercase tracking-wider">Fields</span>
              </div>
              <button 
                onClick={() => setShowFieldsPanel(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CustomFieldsTabs 
              visibleFields={visibleFields}
              setVisibleFields={setVisibleFields}
              customFields={customFields}
              setCustomFields={setCustomFields}
              tasks={tasks}
              onUpdateTask={onUpdateTask}
            />
          </div>
        </Portal>
      )}

      </div> {/* Closing tag for Main Page Workspace Content Container */}
    </div>
  );
}

function CustomFieldsTabs({ 
  visibleFields, setVisibleFields, customFields, setCustomFields, tasks, onUpdateTask 
}: { 
  visibleFields: string[]; 
  setVisibleFields: (f: string[]) => void; 
  customFields: any[]; 
  setCustomFields: (cf: any[]) => void; 
  tasks: Task[]; 
  onUpdateTask: (task: Task) => void;
}) {
  const [tab, setTab] = useState<'create' | 'add'>('create');
  const [search, setSearch] = useState('');

  const fieldTypesCatalog = [
    { type: 'text', label: 'Text', icon: '📝' },
    { type: 'number', label: 'Number', icon: '🔢' },
    { type: 'date', label: 'Date', icon: '📅' },
    { type: 'textarea', label: 'Text area (Long Text)', icon: '📖' },
    { type: 'dropdown', label: 'Dropdown', icon: '🔽' },
    { type: 'labels', label: 'Labels (Multi-select)', icon: '🏷️' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { type: 'email', label: 'Email', icon: '✉️' },
    { type: 'phone', label: 'Phone', icon: '📞' },
    { type: 'money', label: 'Money', icon: '💵' },
    { type: 'rating', label: 'Rating', icon: '⭐' },
    { type: 'progress', label: 'Progress (Manual)', icon: '📈' }
  ];

  const handleCreateField = (type: string, label: string) => {
    const name = prompt(`Enter name for the new ${label} field:`);
    if (!name?.trim()) return;
    const cleanName = name.trim();
    if (customFields.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
      alert(`A field named "${cleanName}" already exists!`);
      return;
    }
    const newField = {
      id: `cf-${Date.now()}`,
      name: cleanName,
      type
    };
    setCustomFields([...customFields, newField]);
    setVisibleFields([...visibleFields, cleanName]);

    // Add empty field to all tasks
    tasks.forEach(t => {
      onUpdateTask({
        ...t,
        custom_fields: {
          ...(t.custom_fields || {}),
          [cleanName]: ''
        }
      });
    });
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    if (visibleFields.includes(fieldKey)) {
      if (fieldKey === 'title') return;
      setVisibleFields(visibleFields.filter(f => f !== fieldKey));
    } else {
      setVisibleFields([...visibleFields, fieldKey]);
    }
  };

  const filteredCatalog = fieldTypesCatalog.filter(f => f.label.toLowerCase().includes(search.toLowerCase()));

  const propertiesList = [
    { key: 'title', label: 'Task Name', isStandard: true },
    { key: 'status', label: 'Status', isStandard: true },
    { key: 'priority', label: 'Priority', isStandard: true },
    { key: 'assignee', label: 'Assignee', isStandard: true },
    { key: 'space', label: 'Space', isStandard: true },
    { key: 'dueDate', label: 'Due date', isStandard: true },
    { key: 'progress', label: 'Progress', isStandard: true },
    { key: 'tags', label: 'Tags', isStandard: true },
    ...customFields.map(cf => ({ key: cf.name, label: cf.name, isStandard: false }))
  ];

  const filteredProperties = propertiesList.filter(p => p.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col min-h-0 mt-3 font-sans">
      <div className="relative mb-3 shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-405" />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Task Fields" 
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 transition-colors text-slate-700 dark:text-slate-250 font-bold" 
        />
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 text-xs font-bold mb-3">
        <button 
          onClick={() => setTab('create')}
          className={`flex-1 pb-2 border-b-2 text-center cursor-pointer transition-all ${tab === 'create' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-605'}`}
        >
          Create new
        </button>
        <button 
          onClick={() => setTab('add')}
          className={`flex-1 pb-2 border-b-2 text-center cursor-pointer transition-all ${tab === 'add' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-605'}`}
        >
          Add existing
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 space-y-4">
        {tab === 'create' && (
          <div className="space-y-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Popular</div>
            <div className="grid grid-cols-1 gap-1">
              {filteredCatalog.slice(0, 7).map(fc => (
                <button
                  key={fc.type}
                  onClick={() => handleCreateField(fc.type, fc.label)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-205 cursor-pointer group"
                >
                  <span className="text-sm shrink-0">{fc.icon}</span>
                  <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{fc.label}</span>
                </button>
              ))}
            </div>
            
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">All</div>
            <div className="grid grid-cols-1 gap-1">
              {filteredCatalog.map(fc => (
                <button
                  key={fc.type}
                  onClick={() => handleCreateField(fc.type, fc.label)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-205 cursor-pointer group"
                >
                  <span className="text-sm shrink-0">{fc.icon}</span>
                  <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{fc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'add' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">
              <span>Shown</span>
              <span>{visibleFields.length}</span>
            </div>
            <div className="space-y-1">
              {filteredProperties
                .filter(p => visibleFields.includes(p.key))
                .map(p => (
                  <div key={p.key} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-805/40 rounded-lg">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={true}
                        disabled={p.key === 'title'}
                        onChange={() => toggleFieldVisibility(p.key)}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-650 peer-checked:bg-indigo-650 disabled:opacity-50"></div>
                    </label>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 pt-2">
              <span>Properties</span>
              <span>{filteredProperties.length - visibleFields.length}</span>
            </div>
            <div className="space-y-1">
              {filteredProperties
                .filter(p => !visibleFields.includes(p.key))
                .map(p => (
                  <div key={p.key} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-805/40 rounded-lg">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={false}
                        onChange={() => toggleFieldVisibility(p.key)}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-650 peer-checked:bg-indigo-650"></div>
                    </label>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

