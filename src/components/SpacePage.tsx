"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus, Priority, User, Space, Document, SyncLog, Workspace, TaskAttachment } from '../types';
import { supabase } from '../lib/supabaseClient';
import { callAiApi } from '@/lib/aiClient';

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
  Folder, FolderOpen, Share2, ChevronRight, Star, Eye, ChevronsLeft, FileText, GanttChart, HelpCircle, EyeOff, Check, Cog, User as UserIcon, RefreshCw,
  Activity, Users, Brain, Map as MapIcon, Pencil, Link as LinkIcon, Droplet, Zap, Copy, Archive, Phone
, Flag, Lock, Shield, Rocket } from 'lucide-react';
import ShareSettingsModal from './ShareSettingsModal';
import { renderSpaceIcon } from './EmojiIconPicker';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, SpacePillSelect, BulkStatusSelect, BulkAssigneeSelect, BulkPrioritySelect } from './tasks/TaskSelects';
import TaskListView from './tasks/TaskListView';
import TaskBoardView from './tasks/TaskBoardView';
import TaskTableView from './tasks/TaskTableView';
import TaskGanttView from './tasks/TaskGanttView';
import TaskDetailsPanel from './tasks/TaskDetailsPanel';
import SpaceOverviewTab from './SpaceOverviewTab';
import ConfirmModal from './ConfirmModal';

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
  onDeleteSpace?: (spaceId: string) => void;
  onOpenAutomations?: () => void;
  onAddDoc?: (d: any) => void;
  onUpdateDoc?: (d: any) => void;
  onDeleteDoc?: (id: string) => void;

  // Dashboard properties
  syncLogs?: SyncLog[];
  onNavigate?: (tab: string) => void;
  onToggleOffline?: () => void;

  // Global Timer Props
  globalActiveTaskId?: string | null;
  globalActiveElapsed?: number;
  globalIsPaused?: boolean;
  onStartGlobalTimer?: (taskId: string) => void;
  onStopGlobalTimer?: () => void;
  onTogglePauseGlobalTimer?: () => void;
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
  onAddDoc, onUpdateDoc, onDeleteDoc, onDeleteSpace, onOpenAutomations,
  globalActiveTaskId = null, globalActiveElapsed = 0, globalIsPaused = false,
  onStartGlobalTimer, onStopGlobalTimer, onTogglePauseGlobalTimer
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

  // Active workspace configuration
  const activeWorkspace = useMemo(() => {
    return allWorkspaces?.find(w => w.id === activeWorkspaceId);
  }, [allWorkspaces, activeWorkspaceId]);

  // Sharing states
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [sharingTargetType, setSharingTargetType] = useState<'space' | 'list'>('space');
  const [sharingTargetId, setSharingTargetId] = useState('');
  const [sharingTargetName, setSharingTargetName] = useState('');
  const [sharingTargetIsPrivate, setSharingTargetIsPrivate] = useState(false);
  const [sharingTargetShareSettings, setSharingTargetShareSettings] = useState<Record<string, 'view' | 'edit'>>({});

  // Access check helpers
  const hasSpaceAccess = React.useCallback((space: Space) => {
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isCreator = space.user_id === cleanCurrentUserId;
    const isPublic = !space.isPrivate;
    
    // Check if shared with user
    const hasAccessKey = space.shareSettings && (space.shareSettings[cleanCurrentUserId] === 'view' || space.shareSettings[cleanCurrentUserId] === 'edit');
    
    return isWsOwner || isCreator || isPublic || hasAccessKey;
  }, [activeWorkspace, currentUser]);

  const canEditSpace = React.useCallback((space: Space) => {
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isCreator = space.user_id === cleanCurrentUserId;
    const isSharedEditor = space.shareSettings && space.shareSettings[cleanCurrentUserId] === 'edit';
    const isPublic = !space.isPrivate;
    return isWsOwner || isCreator || isSharedEditor || isPublic;
  }, [activeWorkspace, currentUser]);

  const hasListAccess = React.useCallback((space: Space, list: any) => {
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isCreator = list.user_id === cleanCurrentUserId;
    const isPublic = !list.isPrivate;
    const hasAccessKey = list.shareSettings && (list.shareSettings[cleanCurrentUserId] === 'view' || list.shareSettings[cleanCurrentUserId] === 'edit');
    return hasSpaceAccess(space) && (isWsOwner || isCreator || isPublic || hasAccessKey);
  }, [currentUser, hasSpaceAccess, activeWorkspace]);

  const canEditList = React.useCallback((space: Space, list: any) => {
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isCreator = list.user_id === cleanCurrentUserId;
    const isSharedEditor = list.shareSettings && list.shareSettings[cleanCurrentUserId] === 'edit';
    const isPublic = !list.isPrivate;
    return hasSpaceAccess(space) && (isWsOwner || isCreator || isSharedEditor || isPublic);
  }, [currentUser, hasSpaceAccess, activeWorkspace]);

  const handleSaveSharingSettings = (newIsPrivate: boolean, newShareSettings: Record<string, 'view' | 'edit'>) => {
    if (sharingTargetType === 'space') {
      const updated = spaces.map(s => {
        if (s.id === sharingTargetId) {
          return {
            ...s,
            isPrivate: newIsPrivate,
            shareSettings: newShareSettings
          };
        }
        return s;
      });
      onSaveSpaces?.(updated);
      onAddSyncLog(`Updated sharing settings for Space "${sharingTargetName}"`);
    } else {
      const updated = spaces.map(s => {
        const hasList = s.lists?.some(l => l.id === sharingTargetId);
        if (hasList) {
          const updatedLists = s.lists.map(l => {
            if (l.id === sharingTargetId) {
              return {
                ...l,
                isPrivate: newIsPrivate,
                shareSettings: newShareSettings
              };
            }
            return l;
          });
          return { ...s, lists: updatedLists };
        }
        return s;
      });
      onSaveSpaces?.(updated);
      onAddSyncLog(`Updated sharing settings for List "${sharingTargetName}"`);
    }
  };

  const [showQuickTools, setShowQuickTools] = useState(false);

  // Active View Tab State (Overview, List, Board, Table, Gantt, etc.)
  const [activeView, setActiveView] = useState<string>('list');

  useEffect(() => {
    const handleGlobalViewShortcut = (event: Event) => {
      const requestedView = (event as CustomEvent<{ view?: string }>).detail?.view;
      if (requestedView && ['list', 'board', 'calendar'].includes(requestedView)) {
        setActiveView(requestedView);
      }
    };
    window.addEventListener('apexa:set-task-view', handleGlobalViewShortcut);
    return () => window.removeEventListener('apexa:set-task-view', handleGlobalViewShortcut);
  }, []);

  // Spaces sub-sidebar collapsible states
  const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(false);
  const [isSpacesExpanded, setIsSpacesExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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


  // Space exact views from screenshot (managed dynamically)
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
    'title', 'status', 'priority', 'assignee', 'dueDate', 'progress', 'tags'
  ]);
  const [customFields, setCustomFields] = useState<any[]>([]);

  // Synchronize custom fields config from activeSpace
  useEffect(() => {
    if (activeSpace && activeSpace.customFields) {
      setCustomFields(activeSpace.customFields);
      
      const customFieldNames = activeSpace.customFields.map((f: any) => f.name);
      setVisibleFields(prev => {
        const baseFields = prev.filter(f => ['title', 'status', 'priority', 'assignee', 'dueDate', 'progress', 'tags'].includes(f));
        const nextFields = [...baseFields];
        customFieldNames.forEach((name: string) => {
          if (!nextFields.includes(name)) {
            nextFields.push(name);
          }
        });
        return nextFields;
      });
    } else {
      setCustomFields([]);
      setVisibleFields(['title', 'status', 'priority', 'assignee', 'dueDate', 'progress', 'tags']);
    }
  }, [activeSpace]);
  // Confirm Modal state and helper
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (config: {
    title: string;
    description: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
    cancelText?: string;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: config.title,
      description: config.description,
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      isDestructive: config.isDestructive ?? true,
      onConfirm: () => {
        config.onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [showBreadcrumbNav, setShowBreadcrumbNav] = useState(false);
  const [listNameInput, setListNameInput] = useState('');
  const [spacesAddDropdownOpen, setSpacesAddDropdownOpen] = useState(false);
  const [showSpacesSearch, setShowSpacesSearch] = useState(false);
  const [spacesSearchQuery, setSpacesSearchQuery] = useState('');
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [newChanScope, setNewChanScope] = useState<'space' | 'folder' | 'list'>('space');
  const [showHiddenSpaces, setShowHiddenSpaces] = useState(false);
  const [showArchivedToggle, setShowArchivedToggle] = useState(false);
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<Record<string, boolean>>({});

  const sidebarSpaces = useMemo(() => {
    const query = spacesSearchQuery.trim().toLowerCase();
    return spaces
      .filter(hasSpaceAccess)
      .filter(space => showHiddenSpaces || !space.isHidden)
      .filter(space => showArchivedToggle ? !!space.isArchived : !space.isArchived)
      .filter(space => !query || `${space.name} ${space.description || ''}`.toLowerCase().includes(query))
      .sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite) || a.name.localeCompare(b.name));
  }, [hasSpaceAccess, showArchivedToggle, showHiddenSpaces, spaces, spacesSearchQuery]);

  const updateSpaceProperties = (spaceId: string, patch: Partial<Space>, successMessage?: string) => {
    const target = spaces.find(space => space.id === spaceId);
    if (!target || !onSaveSpaces) return;
    onSaveSpaces(spaces.map(space => space.id === spaceId ? { ...space, ...patch } : space));
    if (successMessage) triggerToast?.('success', 'Đã cập nhật Space', successMessage);
  };

  const toggleSpaceFavorite = (space: Space) => {
    updateSpaceProperties(
      space.id,
      { isFavorite: !space.isFavorite },
      space.isFavorite ? `Đã bỏ ${space.name} khỏi mục yêu thích.` : `Đã ghim ${space.name} lên đầu danh sách.`
    );
    onAddSyncLog(`${space.isFavorite ? 'Unfavorited' : 'Favorited'} Space "${space.name}"`);
  };

  const duplicateSpace = (space: Space) => {
    if (!onSaveSpaces) return;
    const suffix = crypto.randomUUID();
    const folderIdMap = new Map((space.folders || []).map(folder => [folder.id, `folder-${crypto.randomUUID()}`]));
    const clonedSpace: Space = {
      ...space,
      id: `s-${suffix}`,
      name: `${space.name} (Bản sao)`,
      user_id: currentUser?.id,
      isFavorite: false,
      isHidden: false,
      isArchived: false,
      folders: (space.folders || []).map(folder => ({ ...folder, id: folderIdMap.get(folder.id)! })),
      lists: (space.lists || []).map(list => ({
        ...list,
        id: `l-${crypto.randomUUID()}`,
        folderId: list.folderId ? folderIdMap.get(list.folderId) : undefined,
        user_id: currentUser?.id
      })),
      whiteboards: (space.whiteboards || []).map(board => ({
        ...board,
        id: `wb-${crypto.randomUUID()}`,
        folderId: board.folderId ? folderIdMap.get(board.folderId) : undefined
      })),
      channels: (space.channels || []).map(channel => ({ ...channel, id: `channel-${crypto.randomUUID()}` }))
    };
    onSaveSpaces([...spaces, clonedSpace]);
    setActiveSpaceId?.(clonedSpace.id);
    setActiveListId?.(null);
    setActiveFolderId(null);
    setActiveView('overview');
    triggerToast?.('success', 'Đã nhân bản Space', `Đã sao chép cấu trúc của “${space.name}”.`);
    onAddSyncLog(`Duplicated Space "${space.name}" as "${clonedSpace.name}"`);
  };
  useEffect(() => {
    const currentList = activeSpace.lists?.find(l => l.id === activeListId);
    if (currentList) {
      setListNameInput(currentList.name);
    }
  }, [activeListId, activeSpace]);

  const handleRenameList = (listId: string, newName: string) => {
    if (!newName.trim() || !onSaveSpaces) return;
    const updatedSpaces = spaces.map(s => {
      if (s.id === activeSpace.id) {
        return {
          ...s,
          lists: s.lists?.map(l => l.id === listId ? { ...l, name: newName.trim() } : l) || []
        };
      }
      return s;
    });
    onSaveSpaces(updatedSpaces);
    if (onAddSyncLog) onAddSyncLog(`Renamed list to "${newName.trim()}"`);
    if (triggerToast) triggerToast('success', 'List Renamed', `The list has been successfully renamed to "${newName.trim()}"`);
  };

  const handleDeleteList = (listId: string) => {
    if (!onSaveSpaces) return;
    const updatedSpaces = spaces.map(s => {
      if (s.id === activeSpace.id) {
        return {
          ...s,
          lists: s.lists?.filter(l => l.id !== listId) || []
        };
      }
      return s;
    });
    onSaveSpaces(updatedSpaces);
    if (setActiveListId) setActiveListId(null);
    if (onAddSyncLog) onAddSyncLog(`Deleted list`);
    if (triggerToast) triggerToast('success', 'List Deleted', 'The list was permanently deleted.');
  };
  const [breadcrumbSearch, setBreadcrumbSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeSpaceId) return;
    const linkedFolderId = new URLSearchParams(window.location.search).get('folder');
    if (!linkedFolderId || !activeSpace.folders?.some(folder => folder.id === linkedFolderId)) return;
    setActiveFolderId(linkedFolderId);
    setActiveListId?.(null);
    setActiveTabId('tab-overview');
    setActiveView('overview');
  }, [activeSpace, activeSpaceId, setActiveListId]);

  // Automatically close mobile sidebar when the active list, folder, or space changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeListId, activeSpaceId, activeFolderId]);
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

  // Advanced Filter Builder State
  const [filterConjunction, setFilterConjunction] = useState<'AND' | 'OR'>('AND');
  const [filterConditions, setFilterConditions] = useState<{
    id: string;
    field: 'status' | 'priority' | 'assignee' | 'title';
    operator: 'is' | 'isNot' | 'contains' | 'isEmpty';
    value: string;
  }[]>([]);
  const [filterPresets, setFilterPresets] = useState<{ name: string; conjunction: 'AND' | 'OR'; conditions: any[] }[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  // Selection and Sorting states
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSmartSort, setIsSmartSort] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Bulk Actions State & Handlers
  const [undoAction, setUndoAction] = useState<{ previousTasks: Task[] } | null>(null);

  const handleBulkStatusChange = (newStatus: TaskStatus) => {
    const prev = [...tasks];
    setUndoAction({ previousTasks: prev });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        onUpdateTask({ ...task, status: newStatus });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Bulk Status Updated', `Updated status for ${selectedTaskIds.length} tasks.`);
    }
    setTimeout(() => {
      setUndoAction(null);
    }, 5000);
  };

  const handleBulkAssigneeChange = (assigneeId: string | null) => {
    const prev = [...tasks];
    setUndoAction({ previousTasks: prev });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        onUpdateTask({ 
          ...task, 
          assigneeId: assigneeId === 'unassigned' ? undefined : (assigneeId || undefined), 
          assigneeIds: assigneeId === 'unassigned' || !assigneeId ? [] : [assigneeId] 
        });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Bulk Assignees Updated', `Updated assignees for ${selectedTaskIds.length} tasks.`);
    }
    setTimeout(() => {
      setUndoAction(null);
    }, 5000);
  };

  const handleBulkPriorityChange = (newPriority: Priority | undefined) => {
    const prev = [...tasks];
    setUndoAction({ previousTasks: prev });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        onUpdateTask({ ...task, priority: newPriority || 'low' });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Bulk Priority Updated', `Updated priority for ${selectedTaskIds.length} tasks.`);
    }
    setTimeout(() => {
      setUndoAction(null);
    }, 5000);
  };

  const handleBulkDelete = () => {
    triggerConfirm({
      title: 'Xóa công việc hàng loạt',
      description: `Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn? Hành động này không thể hoàn tác.`,
      onConfirm: () => {
        const prev = [...tasks];
        setUndoAction({ previousTasks: prev });
        selectedTaskIds.forEach(id => {
          onDeleteTask(id);
        });
        if (triggerToast) {
          triggerToast('warning', 'Bulk Tasks Deleted', `Deleted ${selectedTaskIds.length} tasks.`);
        }
        setSelectedTaskIds([]);
        setTimeout(() => {
          setUndoAction(null);
        }, 5000);
      }
    });
  };

  const handleUndoBulkAction = () => {
    if (undoAction) {
      undoAction.previousTasks.forEach(pt => {
        onUpdateTask(pt);
      });
      setUndoAction(null);
      if (triggerToast) {
        triggerToast('info', 'Undo Successful', 'Restored previous state.');
      }
    }
  };

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
      const saved = localStorage.getItem(`apexa_task_order_${currentWorkspaceId}`);
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
        localStorage.setItem(`apexa_task_order_${currentWorkspaceId}`, JSON.stringify(updated));
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
     }
      return () => { if (interval) clearInterval(interval); };
   }, [timerRunning, timeLeft, timerTask, triggerToast, isMuted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Modern style Views Dropdown Menu Definitions
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

    // Evaluate advanced conditions
    if (filterConditions.length > 0) {
      result = result.filter(t => {
        const matches = filterConditions.map(cond => {
          let fieldVal = '';
          if (cond.field === 'status') fieldVal = t.status;
          else if (cond.field === 'priority') fieldVal = t.priority;
          else if (cond.field === 'assignee') fieldVal = t.assigneeId || '';
          else if (cond.field === 'title') fieldVal = t.title;

          const queryVal = cond.value.toLowerCase();
          const targetVal = fieldVal.toLowerCase();

          if (cond.operator === 'is') return targetVal === queryVal;
          if (cond.operator === 'isNot') return targetVal !== queryVal;
          if (cond.operator === 'contains') return targetVal.includes(queryVal);
          if (cond.operator === 'isEmpty') return !fieldVal;
          return true;
        });

        if (filterConjunction === 'AND') {
          return matches.every(m => m === true);
        } else {
          return matches.some(m => m === true);
        }
      });
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
  }, [tasks, activeSpaceId, activeListId, activeFolderId, activeSpace.lists, myTasksOnly, searchQuery, filterPriority, filterAssignee, filterTag, sortBy, taskOrder, filterConjunction, filterConditions]);

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
      const res = await callAiApi('/api/ai/priority-suggestions', { tasks: active });
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
      const res = await callAiApi('/api/ai/subtasks', { title: task.title, description: task.description });
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
      const res = await callAiApi('/api/ai/task-summarize', { task, assigneeName: assignee?.name || 'Unassigned' });
      const data = await res.json();
      if (data.success && data.text) {
        setAiSummary(data.text);
        localStorage.setItem(`apexa_task_ai_summary_${task.id}`, data.text);
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
    const proViews = ['gantt', 'timeline', 'workload', 'mindmap', 'ai'];
    if (proViews.includes(view.id) && !currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
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
    <div className="flex-grow flex h-full bg-white dark:bg-slate-950/20 font-sans overflow-hidden relative">
      
      {/* Backdrop overlay for mobile Spaces sidebar */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* ── Sub-sidebar for Spaces (Left side) ── */}
      <AnimatePresence initial={false}>
        {(!isSubSidebarCollapsed || isMobileSidebarOpen) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ 
              width: typeof window !== 'undefined' && window.innerWidth < 768 ? 280 : sidebarWidth, 
              opacity: 1 
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={isResizing ? { duration: 0 } : { duration: 0.2, ease: 'easeInOut' }}
            className={`h-full border-r border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#07080c] flex flex-col overflow-hidden shrink-0 ${
              isMobileSidebarOpen
                ? 'fixed inset-y-0 left-0 z-50 shadow-2xl w-[280px] max-w-[85vw] flex'
                : 'hidden md:flex'
            }`}
          >
            {/* Header: Spaces */}
            <div className="border-b border-slate-200/60 p-3 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center justify-between">
              <div><span className="text-sm font-extrabold text-slate-850 dark:text-slate-100">Spaces</span><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{spaces.filter(space => !space.isArchived).length} đang hoạt động</p></div>
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <button
                  type="button"
                  onClick={() => setShowSpacesSearch(value => !value)}
                  className={`rounded-lg p-1.5 transition-colors ${showSpacesSearch ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' : 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800'}`}
                  title="Tìm Space"
                  aria-label="Tìm Space"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => onAddSpace?.()}
                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer transition-colors"
                  title="Tạo Space"
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
              <AnimatePresence>
                {showSpacesSearch && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input autoFocus value={spacesSearchQuery} onChange={event => setSpacesSearchQuery(event.target.value)} placeholder="Tìm Space..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />{spacesSearchQuery && <button type="button" onClick={() => setSpacesSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}</div></motion.div>}
              </AnimatePresence>
              <div className="mt-3 flex gap-1.5">
                <button type="button" onClick={() => setShowHiddenSpaces(value => !value)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black transition ${showHiddenSpaces ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><EyeOff className="h-3 w-3" /> Đã ẩn {spaces.filter(space => space.isHidden).length}</button>
                <button type="button" onClick={() => setShowArchivedToggle(value => !value)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black transition ${showArchivedToggle ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><Archive className="h-3 w-3" /> Lưu trữ {spaces.filter(space => space.isArchived).length}</button>
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
                {sidebarSpaces.map(space => {
                  const isSpaceActive = activeSpaceId === space.id && activeListId === null;
                  const isAnyChildActive = activeSpaceId === space.id;
                  const isExpanded = expandedSpaceIds[space.id] !== undefined 
                    ? expandedSpaceIds[space.id] 
                    : (activeSpaceId === space.id || isSpacesExpanded);

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
                        {/* Accordion Chevron Toggle + Space Icon + Space Name */}
                        <div 
                          className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                          onClick={() => {
                            if (setActiveSpaceId) setActiveSpaceId(space.id);
                            if (setActiveListId) setActiveListId(null);
                            setActiveFolderId(null);
                            setActiveView('overview');
                            setExpandedSpaceIds(prev => ({
                              ...prev,
                              [space.id]: !isExpanded
                            }));
                            onAddSyncLog(`Entered Space: ${space.name}`);
                          }}
                        >
                          {/* Chevron Arrow toggle button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSpaceIds(prev => ({
                                ...prev,
                                [space.id]: !isExpanded
                              }));
                            }}
                            className="p-0.5 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
                            title={isExpanded ? "Collapse Space" : "Expand Space"}
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                          </button>

                          {/* Space Icon */}
                          {space.emoji && space.emoji !== '📦' ? (
                            renderSpaceIcon(space.emoji, "w-4.5 h-4.5 text-indigo-550 dark:text-indigo-400 shrink-0")
                          ) : (
                            <div className={`w-4.5 h-4.5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-3xs ${bgClass}`}>
                              {initialLetter}
                            </div>
                          )}
                          <span className="truncate font-extrabold">{space.name}</span>
                          {space.isFavorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />}
                          {space.isHidden && <EyeOff className="h-3 w-3 shrink-0 text-slate-400" />}
                          {space.isArchived && <Archive className="h-3 w-3 shrink-0 text-slate-400" />}
                          {space.isPrivate && <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />}
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
                        <div className="pl-4 space-y-0.5 ml-4.5 mt-0.5">
                          {/* Quick Add List button at top of hierarchy */}
                          {activeSpaceId === space.id && (
                            <button
                              onClick={() => onAddListSpace?.(space.id)}
                              className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl border border-dashed border-slate-200/90 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all duration-200 cursor-pointer mb-2 shadow-2xs group/addlist"
                            >
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-md bg-slate-100 dark:bg-slate-800 group-hover/addlist:bg-indigo-100 dark:group-hover/addlist:bg-indigo-900/60 text-slate-500 group-hover/addlist:text-indigo-600 dark:group-hover/addlist:text-indigo-300 flex items-center justify-center transition-colors">
                                  <Plus className="w-3 h-3 stroke-[2.5]" />
                                </div>
                                <span>New List</span>
                              </div>
                            </button>
                          )}
                          
                          {/* Render Folders */}
                          {space.folders?.filter(folder => showArchivedToggle ? folder.isArchived : !folder.isArchived).sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite)).map(folder => {
                            const isFolderOpen = expandedFolders[folder.id];
                            const folderLists = (space.lists?.filter(l => l.folderId === folder.id && (showArchivedToggle ? l.isArchived : !l.isArchived)) || []).filter(l => hasListAccess(space, l)).sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite));
                            const folderDocs = allDocs?.filter(d => d.folderId === folder.id) || [];
                            const folderWhiteboards = space.whiteboards?.filter(w => w.folderId === folder.id) || [];
                            return (
                              <div key={folder.id} className="space-y-0.5 text-left">
                                <div 
                                  className={`w-full flex items-center justify-between py-1 px-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer group/folder ${
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
                                  <div className="pl-3.5 space-y-0.5 ml-2 mt-0.5">
                                    {folderLists.map(list => {
                                       const isListActive = activeSpaceId === space.id && activeListId === list.id;
                                       const taskCount = tasks.filter(t => t.listId === list.id).length;
                                       return (
                                         <div 
                                           key={list.id}
                                           className={`w-full group/list flex items-center justify-between py-1.5 px-2 rounded-xl text-xs transition-all duration-200 text-left relative overflow-hidden ${
                                             isListActive
                                               ? 'bg-gradient-to-r from-indigo-50/90 via-slate-50/60 to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900/80 border border-indigo-200/70 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-300 font-black shadow-2xs'
                                               : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 font-bold border border-transparent'
                                           }`}
                                         >
                                           {isListActive && (
                                             <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-600 shadow-xs shadow-indigo-500/40" />
                                           )}

                                           {/* List name click area */}
                                           <div 
                                             onClick={() => {
                                               if (setActiveSpaceId) setActiveSpaceId(space.id);
                                               if (setActiveListId) setActiveListId(list.id);
                                               setActiveFolderId(null);
                                               setActiveView('table');
                                               onAddSyncLog(`Entered List: ${list.name}`);
                                             }}
                                             className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                                           >
                                             <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                               isListActive 
                                                 ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300' 
                                                 : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 group-hover/list:text-slate-600 dark:group-hover/list:text-slate-200'
                                             }`}>
                                               <List className="w-3.5 h-3.5 stroke-[2.2]" />
                                             </div>
                                             <span className="truncate">{list.name}</span>
                                             {list.isPrivate && <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />}
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
                                                 className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                                                 title="Settings"
                                               >
                                                 <MoreHorizontal className="w-3.5 h-3.5" />
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
                                                 className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                                                 title="Quick Create"
                                               >
                                                 <Plus className="w-3.5 h-3.5" />
                                               </button>
                                             </div>
                                             
                                             {/* Count (shown when not hovering) */}
                                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 group-hover/list:hidden transition-colors ${
                                               isListActive 
                                                 ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50' 
                                                 : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                                             }`}>
                                               {taskCount}
                                             </span>
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
                                          className="w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold text-slate-550 hover:bg-slate-50 hover:text-slate-855 dark:hover:bg-slate-800/10 text-left cursor-pointer"
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
                                        className="w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold text-slate-550 hover:bg-slate-50 hover:text-slate-850 dark:hover:bg-slate-800/10 text-left cursor-pointer"
                                      >
                                        <span className="text-sm shrink-0">🎨</span>
                                        <span className="truncate">{wb.name}</span>
                                      </button>
                                    ))}

                                    {folderLists.length === 0 && folderDocs.length === 0 && folderWhiteboards.length === 0 && (
                                      <div className="text-[10px] text-slate-400 italic pl-[28px] py-0.5">Empty folder.</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Render direct Lists */}
                          {space.lists?.filter(l => !l.folderId && (showArchivedToggle ? l.isArchived : !l.isArchived)).filter(l => hasListAccess(space, l)).sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite)).map(list => {
                            const isListActive = activeSpaceId === space.id && activeListId === list.id;
                            const taskCount = tasks.filter(t => t.listId === list.id).length;
                            return (
                              <div 
                                key={list.id}
                                className={`w-full group/list flex items-center justify-between py-1.5 px-2 rounded-xl text-xs transition-all duration-200 text-left relative overflow-hidden ${
                                  isListActive
                                    ? 'bg-gradient-to-r from-indigo-50/90 via-slate-50/60 to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900/80 border border-indigo-200/70 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-300 font-black shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 font-bold border border-transparent'
                                }`}
                              >
                                {isListActive && (
                                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-600 shadow-xs shadow-indigo-500/40" />
                                )}

                                {/* List name click area */}
                                <div 
                                  onClick={() => {
                                    if (setActiveSpaceId) setActiveSpaceId(space.id);
                                    if (setActiveListId) setActiveListId(list.id);
                                    setActiveFolderId(null);
                                    setActiveView('table');
                                    onAddSyncLog(`Entered List: ${list.name}`);
                                  }}
                                  className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                                >
                                  <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                    isListActive 
                                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300' 
                                      : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 group-hover/list:text-slate-600 dark:group-hover/list:text-slate-200'
                                  }`}>
                                    <List className="w-3.5 h-3.5 stroke-[2.2]" />
                                  </div>
                                  <span className="truncate">{list.name}</span>
                                  {list.isPrivate && <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />}
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
                                      className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                                      title="Settings"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
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
                                      className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                                      title="Quick Create"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  
                                  {/* Count (shown when not hovering) */}
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 group-hover/list:hidden transition-colors ${
                                    isListActive 
                                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50' 
                                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                                  }`}>
                                    {taskCount}
                                  </span>
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
                {!sidebarSpaces.length && <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center dark:border-slate-800"><FolderOpen className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-[11px] font-bold text-slate-500">Không có Space phù hợp</p><p className="mt-1 text-[9px] leading-relaxed text-slate-400">Thử đổi bộ lọc hoặc tạo Space mới.</p><button type="button" onClick={() => onAddSpace?.()} className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white">Tạo Space</button></div>}
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
        <header className="shrink-0 bg-white dark:bg-[#07080c]/90 border-b border-slate-200/60 dark:border-slate-800/80 flex flex-col relative z-30 select-none shadow-3xs">
          {/* Single Unified Header Row (UI/UX Upgraded, Clean & Compact) */}
          <div className="flex items-center justify-between px-5 py-2 relative flex-wrap gap-3 min-h-[48px]">
            
            {/* Left Side: Breadcrumbs, Divider, and View Switcher Tabs (Scrollable & Unified) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-grow flex-shrink min-w-0 pr-2">
              {/* Mobile Spaces sub-sidebar trigger drawer button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                title="Mở thanh danh mục Space"
              >
                <FolderOpen className="w-4 h-4 text-indigo-500" />
              </button>

              {/* Space Selector Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {/* Space Icon & Name */}
                <div 
                  onClick={() => {
                    if (setActiveListId) setActiveListId(null);
                    setActiveView('overview');
                  }}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                >
                  {activeSpace.emoji && activeSpace.emoji !== '📦' ? (
                    renderSpaceIcon(activeSpace.emoji, "w-5 h-5 text-indigo-550 dark:text-indigo-400")
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
                        
                        <div className="relative flex items-center">
                          <div 
                            onClick={() => setShowBreadcrumbNav(!showBreadcrumbNav)}
                            className="flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors py-1 px-2 rounded-lg text-slate-850 dark:text-slate-200"
                          >
                            <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-850 dark:text-slate-200 font-black text-xs">{currentList.name}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400 transition-transform duration-200" />
                          </div>

                          {/* Interactive Breadcrumb Dropdown Navigator */}
                          <AnimatePresence>
                            {showBreadcrumbNav && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowBreadcrumbNav(false)} />
                                <motion.div 
                                  initial={{ opacity: 0, y: 5, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 5, scale: 0.96 }}
                                  className="absolute left-0 top-full mt-2 w-[310px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-left font-sans select-none"
                                >
                                  {/* Header Box: Rename list input & options */}
                                  <div className="flex items-center gap-2 p-1.5 border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-xl mb-3 shadow-3xs">
                                    <List className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                                    <input
                                      type="text"
                                      value={listNameInput}
                                      onChange={e => setListNameInput(e.target.value)}
                                      onBlur={() => handleRenameList(currentList.id, listNameInput)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          handleRenameList(currentList.id, listNameInput);
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      placeholder="List Name..."
                                      className="flex-1 bg-transparent border-none outline-none font-bold text-slate-800 dark:text-slate-105 text-xs px-1 py-0.5"
                                    />
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        if (triggerToast) triggerToast('success', 'Link Copied', 'Copied list link to clipboard!');
                                      }}
                                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 cursor-pointer transition-colors"
                                      title="Copy list link"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        triggerConfirm({
                                          title: 'Xóa danh sách',
                                          description: `Bạn có chắc chắn muốn xóa danh sách "${currentList.name}"? Tất cả các công việc trong danh sách này cũng sẽ bị xóa.`,
                                          onConfirm: () => {
                                            handleDeleteList(currentList.id);
                                            setShowBreadcrumbNav(false);
                                          }
                                        });
                                      }}
                                      className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                      title="Delete list"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-2" />

                                  {/* Hierarchy List */}
                                  <div className="space-y-1">
                                    {/* Space Header */}
                                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                                      {activeSpace.emoji && activeSpace.emoji !== '📦' ? (
                                        renderSpaceIcon(activeSpace.emoji, "w-4 h-4 text-indigo-550 dark:text-indigo-400")
                                      ) : (
                                        <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">
                                          {activeSpace.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span>{activeSpace.name}</span>
                                    </div>

                                    {/* Lists lists */}
                                    <div className="pl-3.5 space-y-0.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                      {activeSpace.lists?.map(list => {
                                        const isSelected = list.id === activeListId;
                                        return (
                                          <button
                                            key={list.id}
                                            type="button"
                                            onClick={() => {
                                              if (setActiveListId) setActiveListId(list.id);
                                              setActiveView('table');
                                              setShowBreadcrumbNav(false);
                                            }}
                                            className={`w-full flex items-center gap-2 py-1.5 px-3 rounded-xl text-left font-bold transition-all cursor-pointer ${
                                              isSelected 
                                                ? 'bg-blue-55 dark:bg-indigo-950/30 text-blue-600 dark:text-indigo-400 shadow-3xs border border-blue-100/10 dark:border-indigo-900/10' 
                                                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                                            }`}
                                          >
                                            <List className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-450'}`} />
                                            <span className="truncate text-xs">{list.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}

              </div>

              {/* Star Button */}
              <button 
                onClick={() => toggleSpaceFavorite(activeSpace)}
                className="p-1 text-slate-400 hover:text-amber-500 rounded-md transition-colors cursor-pointer shrink-0"
                title={activeSpace.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                aria-label={activeSpace.isFavorite ? 'Bỏ Space khỏi yêu thích' : 'Thêm Space vào yêu thích'}
              >
                <Star className={`w-3.5 h-3.5 ${activeSpace.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

              {/* View Switcher Tabs (Segmented Glass Pill Controls) */}
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#0d0e15] p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-x-auto scrollbar-none max-w-fit shrink-0 shadow-3xs">
                {staticTabs.map(tab => {
                  const TabIcon = tab.icon;
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        const proViews = ['gantt', 'timeline', 'workload', 'mindmap', 'ai'];
                        if (proViews.includes(tab.viewId) && !currentUser?.isPremium) {
                          onUpgradePremium?.();
                          return;
                        }
                        setActiveTabId(tab.id);
                        setActiveView(tab.viewId);
                      }}
                      className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-white dark:bg-indigo-600/25 text-indigo-650 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-indigo-500/40'
                          : 'text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <TabIcon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{tab.label}</span>
                      {['gantt', 'timeline', 'workload', 'mindmap', 'ai'].includes(tab.viewId) && !currentUser?.isPremium && (
                        <span className="text-[7px] font-black text-amber-600 bg-amber-500/10 px-1 py-0.5 rounded-md leading-none shadow-3xs">PRO</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add View */}
              <div className="relative shrink-0">
                <button
                  onClick={() => {
                    setShowAddViewMenu(!showAddViewMenu);
                    setIsSearchViewOpen(true);
                  }}
                  className="flex items-center gap-1 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Add View"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {showAddViewMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowAddViewMenu(false); setIsSearchViewOpen(false); setSearchViewQuery(''); }} />
                    <div className="absolute left-0 top-full mt-1 w-[220px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-2 font-sans select-none">
                      <div className="relative mb-2">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search views..."
                          value={searchViewQuery}
                          onChange={(e) => setSearchViewQuery(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-[11px] font-semibold outline-none text-slate-800 dark:text-slate-200 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-0.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {POPULAR_VIEWS.filter(v => !searchViewQuery.trim() || v.label.toLowerCase().includes(searchViewQuery.toLowerCase())).map(view => {
                          const ViewIcon = view.icon;
                          return (
                            <button
                              key={view.id}
                              onClick={() => {
                                handleSelectView(view);
                                setShowAddViewMenu(false);
                                setIsSearchViewOpen(false);
                                setSearchViewQuery('');
                              }}
                              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 transition-colors text-left cursor-pointer group"
                            >
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: view.bg }}>
                                <ViewIcon className="w-3.5 h-3.5" style={{ color: view.color }} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{view.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Right Side: Quick Tools, Share, Cog Settings, and "+ Task" primary action */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Quick Tools Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowQuickTools(!showQuickTools)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 text-[10.5px] font-extrabold text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white rounded-lg flex items-center gap-1.5 hover:bg-slate-100/90 dark:hover:bg-slate-900 transition-colors cursor-pointer shadow-3xs"
                  title="Workspace settings & tools"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tools</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-450 transition-transform duration-200 ${showQuickTools ? 'rotate-180' : ''}`} />
                </button>

                {showQuickTools && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowQuickTools(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-[260px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-2xl z-50 p-2 font-sans select-none animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block mb-1">
                        Workspace Actions
                      </div>
                      
                      <button
                        onClick={() => { setShowQuickTools(false); setActiveTabId('tab-channel'); setActiveView('channel'); triggerToast?.('info', 'Phòng trao đổi đã mở', 'Bắt đầu cuộc gọi hoặc trao đổi nhanh trong Channel của Space.'); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <Phone className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">Start Audio Call</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Host an instant voice huddle</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowQuickTools(false); triggerToast?.('info', 'AI theo ngữ cảnh Space', 'Mở Apexa AI từ nút trợ lý nổi để làm việc với dữ liệu hiện tại.'); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <Bot className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">Workspace Agents</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Configure custom AI agents</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowQuickTools(false); onOpenAutomations?.(); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <SlidersHorizontal className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">Automations</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Create workflow trigger rules</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowQuickTools(false); triggerToast?.('info', 'Apexa AI', 'Trợ lý sẽ sử dụng Space và danh sách đang mở làm ngữ cảnh.'); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 transition-all text-left cursor-pointer group border border-indigo-500/10"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-black text-indigo-655 dark:text-indigo-400 block">Apexa AI</span>
                          <span className="text-[9px] text-indigo-500/80 dark:text-indigo-400/80 block leading-normal mt-0.5 font-semibold">Consult the AI cognitive engine</span>
                        </div>
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-808/60 my-1.5" />
                      
                      <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block mb-1">
                        List Customizations
                      </div>
                      
                      <button
                        onClick={() => { setShowQuickTools(false); setActiveView('table'); setShowFieldsPanel(true); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <SlidersHorizontal className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">Layout Columns</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Configure view custom fields</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowQuickTools(false); if (triggerToast) triggerToast('info', 'Team Members', 'Assign lists to specific team leads or members.'); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <Users className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">Assignees</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Assign tasks to multiple leads</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowQuickTools(false); if (triggerToast) triggerToast('info', 'List Priority', 'Set priority flag for the entire list.'); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <Flag className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">List Priority</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Define priority weight thresholds</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowQuickTools(false); setActiveTabId('tab-calendar'); setActiveView('calendar'); }}
                        className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-655 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <Calendar className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-250 block group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">Calendar Schedule</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-normal mt-0.5">Sync list cards to timelines</span>
                        </div>
                      </button>
                      
                    </div>
                  </>
                )}
              </div>

              {/* Share button */}
              <button 
                onClick={() => {
                  const currentList = activeSpace.lists?.find(l => l.id === activeListId);
                  if (currentList) {
                    setSharingTargetType('list');
                    setSharingTargetId(currentList.id);
                    setSharingTargetName(currentList.name);
                    setSharingTargetIsPrivate(!!currentList.isPrivate);
                    setSharingTargetShareSettings(currentList.shareSettings || {});
                  } else {
                    setSharingTargetType('space');
                    setSharingTargetId(activeSpace.id);
                    setSharingTargetName(activeSpace.name);
                    setSharingTargetIsPrivate(!!activeSpace.isPrivate);
                    setSharingTargetShareSettings(activeSpace.shareSettings || {});
                  }
                  setSharingModalOpen(true);
                }}
                className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white text-[10.5px] font-extrabold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-slate-655 dark:text-slate-350 shadow-3xs hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Users className="w-3.5 h-3.5 text-slate-455 dark:text-slate-500" />
                <span>Share</span>
              </button>

              {/* Space settings Cog */}
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
                className="p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-405 hover:text-slate-705 dark:hover:text-white transition-colors cursor-pointer relative border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
                title="Space Settings"
              >
                <Cog className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

              {/* Blue "+ Task" button */}
              <div className="flex items-center rounded-xl overflow-hidden shadow-sm shadow-blue-500/20 bg-[#007fff] hover:bg-blue-600 transition-colors shrink-0">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="pl-3 py-1.5 pr-1.5 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-white stroke-[2.5px]" />
                  <span>Task</span>
                </button>
                <div className="w-px h-3 bg-white/20" />
                <button
                  onClick={() => alert("More Task creation options.")}
                  className="px-1.5 py-1.5 text-white cursor-pointer hover:bg-white/10"
                >
                  <ChevronDown className="w-3 h-3 text-white" />
                </button>
              </div>

            </div>
          </div>
        </header>

      {/* ── Filter / Sorter Bar (Only visible in list/board/table/gantt views) ── */}
      {['list', 'board', 'table', 'gantt'].includes(activeView) && (
        <div className="shrink-0 bg-white dark:bg-[#07080c]/90 border-b border-slate-200/50 dark:border-slate-800/60 px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-3xs">
          
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
            className="shrink-0 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-205 dark:border-slate-800 px-5 py-4.5 space-y-4"
          >
            {/* Top row: conjunction selection & preset management */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Match Type</span>
                <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                  <button 
                    onClick={() => setFilterConjunction('AND')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded ${filterConjunction === 'AND' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-3xs' : 'text-slate-500'}`}
                  >
                    AND
                  </button>
                  <button 
                    onClick={() => setFilterConjunction('OR')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded ${filterConjunction === 'OR' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-3xs' : 'text-slate-500'}`}
                  >
                    OR
                  </button>
                </div>
                <span className="text-[10.5px] text-slate-550 dark:text-slate-400">tasks matching these rules:</span>
              </div>

              {/* Presets manager */}
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Save current filters as..." 
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  className="px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-indigo-500 text-slate-850 dark:text-slate-100"
                />
                <button
                  onClick={() => {
                    if (!newPresetName.trim()) return;
                    setFilterPresets(prev => [...prev, { name: newPresetName.trim(), conjunction: filterConjunction, conditions: [...filterConditions] }]);
                    setNewPresetName('');
                    if (triggerToast) triggerToast('success', 'Preset Saved', 'Saved filter combination.');
                  }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-2xs"
                >
                  Save Preset
                </button>
              </div>
            </div>

            {/* Presets List */}
            {filterPresets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Saved Presets:</span>
                {filterPresets.map(preset => (
                  <div key={preset.name} className="flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 shadow-3xs">
                    <button 
                      onClick={() => {
                        setFilterConjunction(preset.conjunction);
                        setFilterConditions([...preset.conditions]);
                      }}
                      className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 hover:underline mr-1.5 cursor-pointer"
                    >
                      {preset.name}
                    </button>
                    <button 
                      onClick={() => setFilterPresets(prev => prev.filter(p => p.name !== preset.name))}
                      className="text-slate-350 hover:text-rose-500 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Conditions Builder List */}
            <div className="space-y-2.5">
              {filterConditions.map((cond, idx) => (
                <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                  {idx > 0 && (
                    <span className="text-[9.5px] font-black text-slate-400 w-8 text-center">{filterConjunction}</span>
                  )}
                  {idx === 0 && <div className="w-8 shrink-0" />}

                  {/* Attribute Field Selector */}
                  <select 
                    value={cond.field}
                    onChange={e => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, field: e.target.value as any, value: '' } : c))}
                    className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="title">Task Name</option>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                    <option value="assignee">Assignee</option>
                  </select>

                  {/* Operator Dropdown */}
                  <select 
                    value={cond.operator}
                    onChange={e => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, operator: e.target.value as any } : c))}
                    className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="is">is</option>
                    <option value="isNot">is not</option>
                    <option value="contains">contains</option>
                    <option value="isEmpty">is empty</option>
                  </select>

                  {/* Value Picker */}
                  {cond.operator !== 'isEmpty' && (() => {
                    if (cond.field === 'status') {
                      return (
                        <select 
                          value={cond.value}
                          onChange={e => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: e.target.value } : c))}
                          className="px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select status...</option>
                          <option value="todo">To Do</option>
                          <option value="inprogress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Done</option>
                        </select>
                      );
                    }
                    if (cond.field === 'priority') {
                      return (
                        <select 
                          value={cond.value}
                          onChange={e => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: e.target.value } : c))}
                          className="px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select priority...</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      );
                    }
                    if (cond.field === 'assignee') {
                      return (
                        <select 
                          value={cond.value}
                          onChange={e => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: e.target.value } : c))}
                          className="px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select member...</option>
                          <option value="user">Me</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <input 
                        type="text" 
                        placeholder="Type text value..." 
                        value={cond.value}
                        onChange={e => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: e.target.value } : c))}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-800 dark:text-slate-100"
                      />
                    );
                  })()}

                  {/* Remove condition */}
                  <button 
                    onClick={() => setFilterConditions(prev => prev.filter(c => c.id !== cond.id))}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-500 rounded-lg cursor-pointer"
                    title="Remove rule"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom action row: add rule, reset */}
            <div className="flex justify-between items-center pt-2">
              <button 
                onClick={() => setFilterConditions(prev => [...prev, { id: `rule-${Date.now()}`, field: 'title', operator: 'contains', value: '' }])}
                className="px-3 py-1.5 rounded-lg text-[10.5px] font-black border border-dashed border-slate-250 hover:border-indigo-500 text-indigo-650 dark:text-indigo-400 cursor-pointer hover:bg-indigo-50/20"
              >
                + Add Rule
              </button>
              <button 
                onClick={() => {
                  setFilterConjunction('AND');
                  setFilterConditions([]);
                  setFilterPriority('all');
                  setFilterAssignee('all');
                  setFilterTag('all');
                }}
                className="px-3 py-1.5 rounded-lg text-[10.5px] font-black bg-rose-50 dark:bg-rose-955/10 text-rose-600 dark:text-rose-455 hover:bg-rose-100 cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Module Rendering Body Section ── */}
      <main className="flex-1 overflow-y-auto select-none scrollbar-none bg-white dark:bg-[#07080c] flex flex-col">
        
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
            onDeleteTask={onDeleteTask}
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
            onAddTask={onAddTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            visibleFields={visibleFields}
            customFields={customFields}
            onOpenFieldsPanel={() => setShowFieldsPanel(true)}
            setVisibleFields={setVisibleFields}
            setCustomFields={setCustomFields}
            openDialog={triggerConfirm}
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
            onDeleteTask={onDeleteTask}
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
            spaceId={activeSpaceId}
            folderId={activeFolderId || null}
            onCreateTaskFromDoc={(title, description, documentId) => onAddTask({
              title,
              description,
              priority: 'medium',
              status: 'todo',
              subtasks: [],
              tags: ['docs'],
              isPinned: false,
              relationships: { docs: [documentId] }
            })}
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
          <div className="bg-white dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4">
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
              <span>Apexa AI Generator</span>
            </h3>
            <div className="space-y-4 max-w-lg">
              <p className="text-xs text-slate-500 leading-relaxed">Let Apexa AI analyze your workspace context, suggest new lists, or generate workflow structures dynamically.</p>
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
            onCreateTask={onAddTask}
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
            visibleFields={visibleFields}
            onToggleFieldVisibility={(fieldKey) => {
              if (fieldKey === 'title') return;
              if (visibleFields.includes(fieldKey)) {
                setVisibleFields(visibleFields.filter(f => f !== fieldKey));
              } else {
                setVisibleFields([...visibleFields, fieldKey]);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Bulk Action Bar (Sticky UI) */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3.5 px-4.5 py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shadow-2xl max-w-[95vw] sm:max-w-full overflow-x-auto scrollbar-none select-none ring-1 ring-indigo-500/10 dark:ring-indigo-400/5"
          >
            {/* Selection Count Badge */}
            <div className="flex items-center gap-2.5 pr-4 border-r border-slate-150 dark:border-slate-800 shrink-0">
              <div className="relative">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 text-white text-[11px] font-black flex items-center justify-center shadow-md shadow-indigo-500/10">
                  {selectedTaskIds.length}
                </span>
              </div>
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Selected</span>
            </div>

            {/* Actions Group */}
            <div className="flex items-center gap-2 shrink-0">
              <BulkStatusSelect onChange={handleBulkStatusChange} />
              <BulkAssigneeSelect 
                members={members.filter(m => !activeWorkspaceId || m.workspaceIds?.includes(activeWorkspaceId))}
                onChange={handleBulkAssigneeChange} 
              />
              <BulkPrioritySelect onChange={handleBulkPriorityChange} />
            </div>

            <div className="w-[1px] h-5 bg-slate-200/85 dark:bg-slate-800/85 shrink-0" />

            {/* Bulk Delete with confirmation */}
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 text-[11px] font-extrabold rounded-xl bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shrink-0"
              title="Delete all selected tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedTaskIds([])}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/85 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors shrink-0 active:scale-95"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Undo Notification */}
      <AnimatePresence>
        {undoAction && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[145] bg-slate-900 text-white rounded-xl shadow-xl p-3.5 flex flex-col gap-2 min-w-[280px] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">Bulk action applied.</span>
              <button
                onClick={handleUndoBulkAction}
                className="text-xs font-black text-indigo-400 hover:text-indigo-350 flex items-center gap-1 cursor-pointer"
              >
                <span>Undo</span>
              </button>
            </div>
            {/* Timer visual count down bar */}
            <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-full bg-indigo-500"
              />
            </div>
          </motion.div>
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
                  <PriorityPillSelect value={newPrio} onChange={(v) => setNewPrio(v || 'medium')} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Assignee</label>
                  <AssigneePillSelect 
                    members={members.filter(m => !activeWorkspaceId || m.workspaceIds?.includes(activeWorkspaceId))} 
                    value={newAssignee || null} 
                    onChange={(val) => setNewAssignee(Array.isArray(val) ? (val[0] || '') : (val || ''))} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Start Date</label>
                  <PremiumDatePicker 
                    startDateValue={newStartDate} 
                    onStartDateChange={(val) => setNewStartDate(val || '')} 
                    dateValue={newDueDate} 
                    onChange={(val) => setNewDueDate(val || '')} 
                    label="Start"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Due Date</label>
                  <PremiumDatePicker 
                    startDateValue={newStartDate} 
                    onStartDateChange={(val) => setNewStartDate(val || '')} 
                    dateValue={newDueDate} 
                    onChange={(val) => setNewDueDate(val || '')} 
                    label="Due"
                  />
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
                <p className="text-xs text-slate-400 font-bold">Apexa AI is calculating urgency factors...</p>
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
                triggerConfirm({
                  title: 'Xóa chế độ xem',
                  description: 'Bạn có chắc chắn muốn xóa chế độ xem này? Hành động này không thể hoàn tác.',
                  onConfirm: () => {
                    setStaticTabs(prev => prev.filter(t => t.id !== viewContextMenu.tabId));
                  }
                });
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
                    triggerToast('success', 'Template Library Opened', 'Choose a template from our curated workspace library.');
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

      {/* ── Add Channel Dialog Modal (Image 4) ── */}
      {showAddChannelModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 font-sans select-none"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">Tạo phòng chat trao đổi</h3>
                </div>
                <button 
                  onClick={() => setShowAddChannelModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-left">
                {/* Channel Scope Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Phạm vi trò chuyện</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewChanScope('space')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        newChanScope === 'space'
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Rocket className="w-3.5 h-3.5" /> Space
                    </button>
                    <button
                      type="button"
                      disabled={!activeFolderId}
                      onClick={() => setNewChanScope('folder')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        !activeFolderId ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        newChanScope === 'folder'
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" /> Folder
                    </button>
                    <button
                      type="button"
                      disabled={!activeListId}
                      onClick={() => setNewChanScope('list')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        !activeListId ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        newChanScope === 'list'
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" /> List
                    </button>
                  </div>
                </div>

                {/* Channel Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tên phòng chat (kebab-case)</label>
                  <input
                    type="text"
                    value={newChanName}
                    onChange={e => setNewChanName(e.target.value)}
                    placeholder="ví-dụ: marketing-sprint-1"
                    className="w-full text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Channel Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Mô tả phòng chat</label>
                  <textarea
                    value={newChanDesc}
                    onChange={e => setNewChanDesc(e.target.value)}
                    placeholder="Mục đích của phòng chat này..."
                    rows={3}
                    className="w-full text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-805">
                <button
                  type="button"
                  onClick={() => setShowAddChannelModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newChanName.trim()) return;
                    const cleanedName = newChanName.trim().toLowerCase().replace(/\s+/g, '-');
                    
                    let chanId = '';
                    if (newChanScope === 'folder') {
                      chanId = `folder-${activeFolderId}`;
                    } else if (newChanScope === 'list') {
                      chanId = `list-${activeListId}`;
                    } else {
                      chanId = `space-chan-${Date.now()}`;
                    }

                    const newChanObj = {
                      id: chanId,
                      name: cleanedName,
                      description: newChanDesc.trim() || 'Work chat room',
                      type: 'public'
                    };

                    const updatedSpaces = spaces.map(s => {
                      if (s.id === activeSpace.id) {
                        const existing = s.channels || [];
                        // Check if channel already exists
                        if (existing.some(c => c.id === chanId)) {
                          return s;
                        }
                        return { ...s, channels: [...existing, newChanObj] };
                      }
                      return s;
                    });

                    if (onSaveSpaces) {
                      onSaveSpaces(updatedSpaces);
                    }

                    onAddSyncLog(`Created work chat room "#${cleanedName}" for ${newChanScope.toUpperCase()}`);
                    if (triggerToast) {
                      triggerToast('success', 'Chat Room Created', `Connected "#${cleanedName}" to active Space/Folder/List`);
                    }
                    setShowAddChannelModal(false);
                  }}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-indigo-650 hover:bg-indigo-750 text-white cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  Tạo phòng
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}

      {activeSpaceSettings && (() => {
        const space = spaces.find(s => s.id === activeSpaceSettings.id);
        if (!space) return null;
        return (
          <Portal>
            <div className="fixed inset-0 z-40" onClick={() => setActiveSpaceSettings(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, type: 'spring', stiffness: 420, damping: 28 }}
              style={{ 
                position: 'fixed', 
                top: activeSpaceSettings.y, 
                left: Math.min(activeSpaceSettings.x, typeof window !== 'undefined' ? window.innerWidth - 250 : activeSpaceSettings.x)
              }}
              className="w-[245px] bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-50 text-left font-sans select-none overflow-hidden text-xs p-2 space-y-1"
            >
              {/* Group 1: General Shortcuts */}
              <div className="space-y-0.5">
                {/* Favorite */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    toggleSpaceFavorite(space);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-amber-100 dark:group-hover/item:bg-amber-950/50 group-hover/item:text-amber-500 transition-colors shrink-0">
                      <Star className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 transition-colors">{space.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-amber-500 group-hover/item:translate-x-0.5 transition-all duration-200" />
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
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-950/50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">Rename</span>
                  </div>
                </button>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    if (typeof window !== 'undefined') {
                      const shareUrl = new URL(window.location.href);
                      shareUrl.searchParams.set('workspace', space.workspaceId);
                      shareUrl.searchParams.set('space', space.id);
                      void navigator.clipboard.writeText(shareUrl.toString()).then(() => {
                        triggerToast?.('success', 'Đã sao chép liên kết', `Liên kết tới “${space.name}” đã sẵn sàng để chia sẻ.`);
                      }).catch(() => {
                        triggerToast?.('warning', 'Không thể sao chép', 'Trình duyệt chưa cấp quyền truy cập clipboard.');
                      });
                    }
                    onAddSyncLog(`Copied space link for space ${space.name}`);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-950/50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">Sao chép liên kết</span>
                  </div>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Group 2: Create & Automations */}
              <div className="space-y-0.5">
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
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-950/50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">Create new</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Color & Icon */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); onOpenSpaceSettings?.(space); }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-950/50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0">
                      <Droplet className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">Màu sắc & biểu tượng</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Automations */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); onOpenAutomations?.(); }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-violet-100 dark:group-hover/item:bg-violet-950/50 group-hover/item:text-violet-500 transition-colors shrink-0">
                      <Zap className="w-3.5 h-3.5 text-violet-500 fill-violet-500/20" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-violet-600 dark:group-hover/item:text-violet-400 transition-colors">Tự động hóa</span>
                  </div>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Group 3: Space Visibility & Actions */}
              <div className="space-y-0.5">
                {/* Hide Space */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    updateSpaceProperties(space.id, { isHidden: !space.isHidden }, space.isHidden ? `Đã hiển thị lại ${space.name}.` : `Đã ẩn ${space.name} khỏi danh sách mặc định.`);
                    onAddSyncLog(`${space.isHidden ? 'Unhid' : 'Hid'} Space "${space.name}"`);
                  }}
                  className="w-full p-2 rounded-2xl text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-slate-200 dark:group-hover/item:bg-slate-700 transition-colors shrink-0">
                      <EyeOff className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-[12px] text-slate-700 dark:text-slate-200 block group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{space.isHidden ? 'Hiển thị Space' : 'Ẩn Space'}</span>
                      <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
                        {space.isHidden ? 'Đưa Space trở lại danh sách mặc định' : 'Vẫn giữ quyền truy cập và toàn bộ dữ liệu'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Duplicate */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    duplicateSpace(space);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-950/50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">Nhân bản cấu trúc</span>
                  </div>
                </button>

                {/* Archive */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    updateSpaceProperties(space.id, { isArchived: !space.isArchived }, space.isArchived ? `Đã khôi phục ${space.name}.` : `Đã chuyển ${space.name} vào lưu trữ.`);
                    if (!space.isArchived && activeSpaceId === space.id) {
                      setActiveSpaceId?.(spaces.find(candidate => candidate.id !== space.id && !candidate.isArchived && !candidate.isHidden)?.id || null);
                      setActiveListId?.(null);
                      setActiveFolderId(null);
                    }
                    onAddSyncLog(`${space.isArchived ? 'Restored' : 'Archived'} Space "${space.name}"`);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-450 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-950/50 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0">
                      <Archive className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-[12px] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{space.isArchived ? 'Khôi phục' : 'Lưu trữ'}</span>
                  </div>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    triggerConfirm({
                      title: 'Xóa không gian làm việc',
                      description: `Bạn có chắc chắn muốn xóa Space "${space.name}"? Tất cả các thư mục, danh sách và công việc trong Space này cũng sẽ bị xóa vĩnh viễn.`,
                      onConfirm: () => {
                        const updated = spaces.filter(s => s.id !== space.id);
                        if (onDeleteSpace) onDeleteSpace(space.id);
                        else onSaveSpaces?.(updated);
                        if (activeSpaceId === space.id) {
                          if (setActiveSpaceId) setActiveSpaceId(updated[0]?.id || null);
                          if (setActiveListId) setActiveListId(null);
                        }
                        onAddSyncLog(`Deleted Space "${space.name}"`);
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-all duration-150 group/item"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 group-hover/item:bg-rose-100 dark:group-hover/item:bg-rose-900/60 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <span className="font-extrabold text-[12px]">Xóa Space</span>
                  </div>
                </button>
              </div>

              {/* Group 4: Sharing & Permissions CTA */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpaceSettings(null);
                    setSharingTargetType('space');
                    setSharingTargetId(space.id);
                    setSharingTargetName(space.name);
                    setSharingTargetIsPrivate(!!space.isPrivate);
                    setSharingTargetShareSettings(space.shareSettings || {});
                    setSharingModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-white/90" />
                  <span>Sharing & Permissions</span>
                </button>
              </div>
            </motion.div>
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
                  const updatedLists = space.lists.map(item => item.id === list.id ? { ...item, isFavorite: !item.isFavorite } : item);
                  onSaveSpaces?.(spaces.map(item => item.id === space.id ? { ...item, lists: updatedLists } : item));
                  triggerToast?.('success', 'Đã cập nhật danh sách', list.isFavorite ? `Đã bỏ “${list.name}” khỏi yêu thích.` : `Đã ghim “${list.name}”.`);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-3.5 h-3.5 ${list.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-450'}`} />
                  <span className="font-bold">{list.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}</span>
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
                    const shareUrl = new URL(window.location.href);
                    shareUrl.searchParams.set('workspace', space.workspaceId);
                    shareUrl.searchParams.set('space', space.id);
                    shareUrl.searchParams.set('list', list.id);
                    void navigator.clipboard.writeText(shareUrl.toString()).then(() => triggerToast?.('success', 'Đã sao chép liên kết', `Đã sao chép liên kết tới “${list.name}”.`));
                  }
                  onAddSyncLog(`Copied list link for list ${list.name}`);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">Copy link</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Custom Fields */}
              {canEditList(space, list) && (
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
              )}

              {/* Automations */}
              {canEditList(space, list) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveListSettings(null); setActiveSpaceId?.(space.id); setActiveListId?.(list.id); onOpenAutomations?.(); }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-455" />
                  <span className="font-bold">Automations</span>
                </button>
              )}

              {/* Sharing & Permissions */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  setSharingTargetType('list');
                  setSharingTargetId(list.id);
                  setSharingTargetName(list.name);
                  setSharingTargetIsPrivate(!!list.isPrivate);
                  setSharingTargetShareSettings(list.shareSettings || {});
                  setSharingModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-left cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-bold">Sharing & Permissions</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

              {/* Duplicate */}
              {canEditList(space, list) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveListSettings(null);
                    const newListName = `${list.name} (Copy)`;
                    const updatedLists = [...space.lists, { ...list, id: `l-${crypto.randomUUID()}`, name: newListName, isFavorite: false, isArchived: false, user_id: currentUser?.id }];
                    const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                    onSaveSpaces?.(updated);
                    onAddSyncLog(`Duplicated List "${list.name}"`);
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-450" />
                  <span className="font-bold">Duplicate</span>
                </button>
              )}

              {/* Archive */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  const updatedLists = space.lists.map(item => item.id === list.id ? { ...item, isArchived: !item.isArchived } : item);
                  onSaveSpaces?.(spaces.map(item => item.id === space.id ? { ...item, lists: updatedLists } : item));
                  if (!list.isArchived && activeListId === list.id) setActiveListId?.(null);
                  triggerToast?.('success', list.isArchived ? 'Đã khôi phục danh sách' : 'Đã lưu trữ danh sách', `“${list.name}” đã được cập nhật.`);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-855 text-left cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-slate-450" />
                <span className="font-bold">{list.isArchived ? 'Khôi phục' : 'Lưu trữ'}</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListSettings(null);
                  triggerConfirm({
                    title: 'Xóa danh sách',
                    description: `Bạn có chắc chắn muốn xóa danh sách "${list.name}"? Tất cả các công việc trong danh sách này cũng sẽ bị xóa vĩnh viễn.`,
                    onConfirm: () => {
                      tasks.filter(task => task.listId === list.id).forEach(task => onDeleteTask(task.id));
                      const updatedLists = space.lists.filter(l => l.id !== list.id);
                      const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                      onSaveSpaces?.(updated);
                      if (activeListId === list.id) {
                        if (setActiveListId) setActiveListId(null);
                      }
                      onAddSyncLog(`Deleted List "${list.name}"`);
                    }
                  });
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
                  const updatedFolders = space.folders?.map(item => item.id === folder.id ? { ...item, isFavorite: !item.isFavorite } : item) || [];
                  onSaveSpaces?.(spaces.map(item => item.id === space.id ? { ...item, folders: updatedFolders } : item));
                  triggerToast?.('success', 'Đã cập nhật thư mục', folder.isFavorite ? `Đã bỏ “${folder.name}” khỏi yêu thích.` : `Đã ghim “${folder.name}”.`);
                }}
                className="w-full flex items-center justify-between px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-3.5 h-3.5 ${folder.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                  <span className="font-semibold text-slate-650 dark:text-slate-350">{folder.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}</span>
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
                    const shareUrl = new URL(window.location.href);
                    shareUrl.searchParams.set('workspace', space.workspaceId);
                    shareUrl.searchParams.set('space', space.id);
                    shareUrl.searchParams.set('folder', folder.id);
                    void navigator.clipboard.writeText(shareUrl.toString()).then(() => triggerToast?.('success', 'Đã sao chép liên kết', `Đã sao chép liên kết tới “${folder.name}”.`));
                  }
                  onAddSyncLog(`Copied folder link for folder ${folder.name}`);
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
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); setActiveSpaceId?.(space.id); setActiveListId?.(null); setActiveFolderId(folder.id); onOpenAutomations?.(); }}
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
                onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); onOpenSpaceSettings?.(space); }}
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
                  const newFolderId = `folder-${crypto.randomUUID()}`;
                  const updatedFolders = [...(space.folders || []), { ...folder, id: newFolderId, name: newFolderName, isFavorite: false, isArchived: false }];
                  const clonedLists = space.lists.filter(item => item.folderId === folder.id).map(item => ({ ...item, id: `l-${crypto.randomUUID()}`, folderId: newFolderId, isFavorite: false, isArchived: false, user_id: currentUser?.id }));
                  const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders, lists: [...s.lists, ...clonedLists] } : s);
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
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  const updatedFolders = space.folders?.map(item => item.id === folder.id ? { ...item, isArchived: !item.isArchived } : item) || [];
                  onSaveSpaces?.(spaces.map(item => item.id === space.id ? { ...item, folders: updatedFolders } : item));
                  if (!folder.isArchived && activeFolderId === folder.id) setActiveFolderId(null);
                  triggerToast?.('success', folder.isArchived ? 'Đã khôi phục thư mục' : 'Đã lưu trữ thư mục', `“${folder.name}” đã được cập nhật.`);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 text-left cursor-pointer transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-650 dark:text-slate-350">{folder.isArchived ? 'Khôi phục' : 'Lưu trữ'}</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFolderSettings(null);
                  triggerConfirm({
                    title: 'Xóa thư mục',
                    description: `Bạn có chắc chắn muốn xóa thư mục "${folder.name}" cùng tất cả danh sách bên trong? Tất cả các công việc trong thư mục này cũng sẽ bị xóa vĩnh viễn.`,
                    onConfirm: () => {
                      const removedListIds = new Set(space.lists.filter(item => item.folderId === folder.id).map(item => item.id));
                      tasks.filter(task => task.listId && removedListIds.has(task.listId)).forEach(task => onDeleteTask(task.id));
                      const updatedFolders = space.folders?.filter(f => f.id !== folder.id) || [];
                      const updatedLists = space.lists?.filter(l => l.folderId !== folder.id) || [];
                      const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders, lists: updatedLists } : s);
                      onSaveSpaces?.(updated);
                      if (activeFolderId === folder.id) {
                        setActiveFolderId(null);
                      }
                      onAddSyncLog(`Deleted Folder "${folder.name}"`);
                    }
                  });
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
                    setSharingTargetType('space');
                    setSharingTargetId(space.id);
                    setSharingTargetName(space.name);
                    setSharingTargetIsPrivate(!!space.isPrivate);
                    setSharingTargetShareSettings(space.shareSettings || {});
                    setSharingModalOpen(true);
                    triggerToast?.('info', 'Quyền của thư mục', 'Thư mục đang kế thừa quyền truy cập từ Space.');
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
              activeSpace={activeSpace}
              spaces={spaces}
              onSaveSpaces={onSaveSpaces}
              openDialog={triggerConfirm}
            />
          </div>
        </Portal>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {sharingModalOpen && (
        <ShareSettingsModal
          isOpen={sharingModalOpen}
          onClose={() => setSharingModalOpen(false)}
          targetType={sharingTargetType}
          targetId={sharingTargetId}
          targetName={sharingTargetName}
          isPrivate={sharingTargetIsPrivate}
          shareSettings={sharingTargetShareSettings}
          members={members}
          currentUser={currentUser}
          onSave={handleSaveSharingSettings}
          canEdit={sharingTargetType === 'space' 
            ? canEditSpace(spaces.find(s => s.id === sharingTargetId) || activeSpace) 
            : canEditList(activeSpace, activeSpace.lists?.find(l => l.id === sharingTargetId))}
        />
      )}

      </div> {/* Closing tag for Main Page Workspace Content Container */}
    </div>
  );
}

function CustomFieldsTabs({ 
  visibleFields, setVisibleFields, customFields, setCustomFields, tasks, onUpdateTask,
  activeSpace, spaces, onSaveSpaces, openDialog
}: { 
  visibleFields: string[]; 
  setVisibleFields: (f: string[]) => void; 
  customFields: any[]; 
  setCustomFields: (cf: any[]) => void; 
  tasks: Task[]; 
  onUpdateTask: (task: Task) => void;
  activeSpace: any;
  spaces: any[];
  onSaveSpaces?: (newSpaces: any[]) => void;
  openDialog?: (config: { title: string; description: string; onConfirm: () => void; isDestructive?: boolean; confirmText?: string; cancelText?: string }) => void;
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

    let options: string[] | undefined = undefined;
    if (type === 'dropdown' || type === 'labels') {
      const optsStr = prompt(`Enter options for this field, separated by commas (e.g. Planning, Design, QA):`);
      if (optsStr !== null) {
        options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (!options || options.length === 0) {
        options = ['Option 1', 'Option 2', 'Option 3'];
      }
    }

    const newField = {
      id: `cf-${Date.now()}`,
      name: cleanName,
      type,
      ...(options ? { options } : {})
    };
    const updatedCustomFields = [...customFields, newField];
    setCustomFields(updatedCustomFields);
    setVisibleFields([...visibleFields, cleanName]);

    // Save to Supabase (backend)
    if (onSaveSpaces && spaces) {
      const updatedSpace = {
        ...activeSpace,
        customFields: updatedCustomFields
      };
      onSaveSpaces(spaces.map(s => s.id === activeSpace.id ? updatedSpace : s));
    }

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

  const handleDeleteField = (fieldName: string) => {
    const performDelete = () => {
      const updatedCustomFields = customFields.filter(f => f.name !== fieldName);
      setCustomFields(updatedCustomFields);

      if (visibleFields.includes(fieldName)) {
        setVisibleFields(visibleFields.filter(f => f !== fieldName));
      }

      // Save to Supabase (backend)
      if (onSaveSpaces && spaces) {
        const updatedSpace = {
          ...activeSpace,
          customFields: updatedCustomFields
        };
        onSaveSpaces(spaces.map(s => s.id === activeSpace.id ? updatedSpace : s));
      }

      // Update tasks in backend (Remove field key from tasks)
      tasks.forEach(t => {
        if (t.spaceId === activeSpace.id && t.custom_fields && fieldName in t.custom_fields) {
          const nextCustomFields = { ...t.custom_fields };
          delete nextCustomFields[fieldName];

          onUpdateTask({
            ...t,
            custom_fields: nextCustomFields
          });
        }
      });
    };

    if (openDialog) {
      openDialog({
        title: 'Xóa trường tùy chỉnh',
        description: `Bạn có chắc chắn muốn xóa trường tùy chỉnh "${fieldName}"? Hành động này sẽ xóa trường này và toàn bộ dữ liệu của nó khỏi tất cả các công việc trong Space này vĩnh viễn.`,
        onConfirm: performDelete,
        isDestructive: true,
        confirmText: 'Xóa trường'
      });
    } else if (confirm(`Are you sure you want to delete the custom field "${fieldName}"? This will remove this field and all its values from all tasks in this space.`)) {
      performDelete();
    }
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
                  <div key={p.key} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-805/40 rounded-lg group">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{p.label}</span>
                      {!p.isStandard && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(p.key);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/10 text-rose-500 rounded transition-all cursor-pointer shrink-0"
                          title="Delete Field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                  <div key={p.key} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-805/40 rounded-lg group">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{p.label}</span>
                      {!p.isStandard && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(p.key);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/10 text-rose-500 rounded transition-all cursor-pointer shrink-0"
                          title="Delete Field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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

