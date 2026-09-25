"use client";

import CustomFieldsManagerModal from "./tasks/CustomFieldsManagerModal";
import CustomizeViewModal from "./tasks/CustomizeViewModal";
import { matchesCustomFieldFilter } from "@/lib/customFields";
import { useSpaceStore } from '@/store/spaceStore';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus, Priority, User, Space, Document, SyncLog, Workspace, TaskAttachment, ShareRole, ShareTargetType } from '../types';
import { supabase } from '../lib/supabaseClient';
import { callAiApi } from '@/lib/aiClient';
import { restoreBulkTaskFields } from '@/lib/taskLifecycle';
import { matchesSpaceFocus, type SpaceFocus } from '@/lib/spaceInsights';
import SpaceFocusBar from './spaces/SpaceFocusBar';
import { useTranslation } from '../contexts/TranslationContext';

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
  SlidersHorizontal, Sliders, Table, X, CheckSquare, Clock, Play, Pause, RotateCcw,
  Volume2, VolumeX, Timer, Sparkles, Pin, Tag, Hash, MoreHorizontal, ChevronDown, ChevronUp, LayoutGrid,
  Folder, FolderOpen, FolderInput, Share2, ChevronRight, Star, Eye, ChevronsLeft, FileText, GanttChart, HelpCircle, EyeOff, Check, Cog, User as UserIcon, RefreshCw,
  Activity, Users, Brain, Map as MapIcon, Pencil, Link as LinkIcon, Droplet, Zap, Copy, Archive, Phone,
  Flag, Lock, Shield, Rocket, BarChart3, Bookmark, ArrowDownAZ, ArrowUpAZ, ArrowUpNarrowWide, ArrowDownWideNarrow, GripVertical, CheckCircle2,
  Paperclip, Settings2, Flame, Layers, Palette, ZoomIn, ZoomOut
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Select } from './ui/Select';
import EmojiIconPicker, { renderSpaceIcon } from './EmojiIconPicker';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, SpacePillSelect, BulkStatusSelect, BulkAssigneeSelect, BulkPrioritySelect } from './tasks/TaskSelects';
import TaskListView from './tasks/TaskListView';
import TaskBoardView from './tasks/TaskBoardView';
import TaskTableView from './tasks/TaskTableView';
import SpaceOverviewTab from './SpaceOverviewTab';
import ConfirmModal from './ConfirmModal';
import TaskModal from './tasks/TaskModal';
import ManageSpacesModal from './spaces/ManageSpacesModal';
import FieldSettingsModal, { ALL_FIELD_TYPES } from './tasks/FieldSettingsModal';
import { ApexaAiIcon } from './ApexaAiIcon';
import PromptModal, { PromptModalConfig } from './PromptModal';
import TaskTrashModal from './tasks/TaskTrashModal';

// Dynamically split heavy non-default views and dialogs
const TaskGanttView = dynamic(() => import('./tasks/TaskGanttView'), { ssr: false });
const TaskDetailsPanel = dynamic(() => import('./tasks/TaskDetailsPanel'), { ssr: false });
const Whiteboard = dynamic(() => import('./Whiteboard'), { ssr: false });
const CalendarView = dynamic(() => import('./CalendarView'), { ssr: false });
const TeamDirectory = dynamic(() => import('./TeamDirectory'), { ssr: false });
const DashboardOverview = dynamic(() => import('./DashboardOverview'), { ssr: false });
const ShareSettingsModal = dynamic(() => import('./ShareSettingsModal'), { ssr: false });
const AddFolderModal = dynamic(() => import('./AddFolderModal'), { ssr: false });

import SpaceViewTabBar, {
  SpaceViewTab,
  ViewTabSettings,
  ViewSettingKey,
  VIEW_ICON_MAP,
  DEFAULT_VIEW_SETTINGS,
} from './SpaceViewTabBar';

const FOLDER_COLOR_VALUES: Record<string, string> = {
  amber: '#f59e0b',
  indigo: '#6366f1',
  blue: '#3b82f6',
  emerald: '#10b981',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  sunset: '#f97316',
};

const TASK_WORKSPACE_VIEWS = new Set(['list', 'board', 'table', 'gantt', 'timeline']);

const resolveFolderColor = (color?: string) => color ? (FOLDER_COLOR_VALUES[color] || color) : '#6366f1';

const createViewTab = (id: string, label: string, viewId: string, settings?: Partial<ViewTabSettings>): SpaceViewTab => ({
  id,
  label,
  viewId,
  icon: VIEW_ICON_MAP[viewId] || List,
  settings: { ...DEFAULT_VIEW_SETTINGS, ...settings },
});

const getDefaultViewTabs = (hasActiveList: boolean): SpaceViewTab[] => hasActiveList
  ? [
      createViewTab('tab-table', 'Bảng dữ liệu', 'table', { default: true }),
      createViewTab('tab-list', 'Danh sách', 'list'),
      createViewTab('tab-board', 'Bảng', 'board'),
      createViewTab('tab-gantt', 'Gantt', 'gantt'),
    ]
  : [
      createViewTab('tab-overview', 'Tổng quan', 'overview', { default: true }),
      createViewTab('tab-list', 'Danh sách', 'list'),
      createViewTab('tab-board', 'Bảng', 'board'),
      createViewTab('tab-calendar', 'Lịch', 'calendar'),
      createViewTab('tab-table', 'Bảng dữ liệu', 'table'),
    ];

const STATUS_LABELS: Record<TaskStatus, { label: string }> = {
  todo: { label: 'TO DO' }, inprogress: { label: 'IN PROGRESS' },
  review: { label: 'REVIEW' }, completed: { label: 'DONE' }
};

interface SpacePageProps {
  tasks: Task[];
  members: User[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => void | Promise<void>;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void | Promise<void>;
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
  onSaveSpaces?: (newSpaces: Space[]) => void | Promise<void>;
  activeSpaceId?: string | null;
  setActiveSpaceId?: (id: string | null) => void;
  activeListId?: string | null;
  setActiveListId?: (id: string | null) => void;
  myTasksOnly?: boolean;
  onOpenSpaceSettings?: (space: Space) => void;
  onAddListSpace?: (spaceId: string) => void;
  onAddSpace?: () => void;
  onAddFolderToSpace?: (spaceId: string, name: string, color?: string) => void;
  onAddDocToSpace?: (spaceId: string, title: string, folderId?: string) => void;
  onAddWhiteboardToSpace?: (spaceId: string, name: string) => void;
  onAddListToFolder?: (spaceId: string, folderId: string, name: string) => void;
  onDeleteSpace?: (spaceId: string) => void;
  onOpenAutomations?: () => void;
  onAddDoc?: (d: any) => void;
  onUpdateDoc?: (d: any) => void | Promise<void>;
  onDeleteDoc?: (id: string) => void | Promise<void>;

  // Dashboard properties
  syncLogs?: SyncLog[];
  onNavigate?: (tab: string) => void;
  onToggleOffline?: () => void;

  // Global Timer Props
  onStartGlobalTimer?: (taskId: string) => void;
  onStopGlobalTimer?: () => void;
  onTogglePauseGlobalTimer?: () => void;

  // Task Trash props
  deletedTasks?: Task[];
  onRestoreTask?: (id: string) => void | Promise<void>;
  onPermanentDeleteTask?: (id: string) => void | Promise<void>;
  onEmptyTrash?: () => void | Promise<void>;
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
  onStartGlobalTimer, onStopGlobalTimer, onTogglePauseGlobalTimer,
  deletedTasks = [], onRestoreTask, onPermanentDeleteTask, onEmptyTrash
}: SpacePageProps) {
  const { t, locale } = useTranslation();

// Local handler to insert space/list context
   const onAddTask = (taskObj: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & { workspaceId?: string; spaceId?: string; listId?: string }) => {
     return rawOnAddTask({
       ...taskObj,
       workspaceId: taskObj.workspaceId || activeWorkspaceId,
       spaceId: taskObj.spaceId || activeSpaceId || undefined,
       ...(!Object.prototype.hasOwnProperty.call(taskObj, 'listId') && (!taskObj.spaceId || taskObj.spaceId === activeSpaceId)
         ? { listId: activeListId || undefined } : {}),
     });
   };

  const activeViewProtectedRef = useRef(false);
  const notifyProtectedView = () => {
    triggerToast?.('warning', 'Chế độ xem đã khóa', 'Tắt “Khóa chỉnh sửa” trong menu chế độ xem để thay đổi dữ liệu.');
  };
  const guardedAddTask = (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & { workspaceId?: string; spaceId?: string; listId?: string }) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    return onAddTask(task);
  };
  const guardedUpdateTask = (task: Task) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    onUpdateTask(task);
  };
  const guardedDeleteTask = (taskId: string) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    return onDeleteTask(taskId);
  };

  // Auto-select first space if activeSpaceId is null/unset
  useEffect(() => {
    if (activeSpaceId && !spaces.some(space => space.id === activeSpaceId) && spaces.length > 0 && setActiveSpaceId) {
      setActiveSpaceId(spaces[0].id);
    }
  }, [activeSpaceId, spaces, setActiveSpaceId]);

  // Find active space object
  const activeSpace: Space = useMemo(() => {
    if (activeSpaceId) {
      const found = spaces.find(s => s.id === activeSpaceId);
      if (found) return found;
    }
    if (spaces.length > 0) {
      return spaces[0];
    }
    return {
      id: 'default-space',
      name: 'Primary Space',
      emoji: '📦',
      themeColor: 'indigo',
      workspaceId: activeWorkspaceId || 'default-workspace',
      lists: [],
      folders: [],
      whiteboards: [],
      channels: [],
      customFields: [],
      isPrivate: false,
      isFavorite: false,
      shareSettings: {},
    };
  }, [spaces, activeSpaceId, activeWorkspaceId]);

  useEffect(() => {
    if (activeListId && !activeSpace.lists.some(list => list.id === activeListId)) {
      setActiveListId?.(null);
    }
  }, [activeListId, activeSpace, setActiveListId]);

  // Active workspace configuration
  const activeWorkspace = useMemo(() => {
    return allWorkspaces?.find(w => w.id === activeWorkspaceId);
  }, [allWorkspaces, activeWorkspaceId]);

  // Modern UI/UX Prompt Modal state
  const [promptConfig, setPromptConfig] = useState<PromptModalConfig | null>(null);
  const openPromptModal = React.useCallback((config: Omit<PromptModalConfig, 'isOpen'>) => {
    setPromptConfig({
      ...config,
      isOpen: true,
      onConfirm: (val, secondaryVal) => {
        setPromptConfig(null);
        config.onConfirm(val, secondaryVal);
      },
      onCancel: () => {
        setPromptConfig(null);
        config.onCancel?.();
      }
    });
  }, []);

  // Sharing states
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [sharingTargetType, setSharingTargetType] = useState<ShareTargetType>('space');
  const [sharingTargetId, setSharingTargetId] = useState('');
  const [sharingTargetName, setSharingTargetName] = useState('');
  const [sharingTargetIsPrivate, setSharingTargetIsPrivate] = useState(false);
  const [sharingTargetShareSettings, setSharingTargetShareSettings] = useState<Record<string, ShareRole>>({});

  // Access check helpers (RBAC)
  const hasSpaceAccess = React.useCallback((space: Space) => {
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isWsAdmin = currentUser?.role === 'admin' || activeWorkspace?.membershipRole === 'owner' || activeWorkspace?.membershipRole === 'admin';
    if (isWsOwner || isWsAdmin) return true;

    const isCreator = space.user_id === cleanCurrentUserId;
    const isGuest = currentUser?.role === 'guest' || activeWorkspace?.membershipRole === 'guest';
    const hasAccessKey = Boolean(space.shareSettings && space.shareSettings[cleanCurrentUserId]);

    if (isGuest) {
      return isCreator || hasAccessKey;
    }

    const isPublic = !space.isPrivate;
    return isCreator || isPublic || hasAccessKey;
  }, [activeWorkspace, currentUser]);

  const canEditSpace = React.useCallback((space: Space) => {
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isWsAdmin = currentUser?.role === 'admin' || activeWorkspace?.membershipRole === 'owner' || activeWorkspace?.membershipRole === 'admin';
    if (isWsOwner || isWsAdmin) return true;

    const isCreator = space.user_id === cleanCurrentUserId;
    const isGuest = currentUser?.role === 'guest' || activeWorkspace?.membershipRole === 'guest';
    const userShareRole = space.shareSettings ? space.shareSettings[cleanCurrentUserId] : undefined;

    if (userShareRole === 'edit') return true;
    if (userShareRole === 'view') return false; // Explicit read-only

    if (isGuest) return isCreator;

    const isPublic = !space.isPrivate;
    return isCreator || isPublic;
  }, [activeWorkspace, currentUser]);

  // Inline Space Rename on Double Click (Scoped by location: 'sidebar' vs 'header')
  const [editingSpace, setEditingSpace] = useState<{ id: string; location: 'sidebar' | 'header' } | null>(null);
  const [editingSpaceName, setEditingSpaceName] = useState<string>('');
  const sidebarSpaceRenameInputRef = useRef<HTMLInputElement>(null);
  const headerSpaceRenameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSpace?.location === 'sidebar' && sidebarSpaceRenameInputRef.current) {
      sidebarSpaceRenameInputRef.current.focus();
      sidebarSpaceRenameInputRef.current.select();
    } else if (editingSpace?.location === 'header' && headerSpaceRenameInputRef.current) {
      headerSpaceRenameInputRef.current.focus();
      headerSpaceRenameInputRef.current.select();
    }
  }, [editingSpace]);

  const handleSaveSpaceRename = useCallback((spaceId: string) => {
    const trimmed = editingSpaceName.trim();
    const targetSpace = spaces.find(s => s.id === spaceId);
    if (targetSpace && trimmed && trimmed !== targetSpace.name) {
      const updated = spaces.map(s => s.id === spaceId ? { ...s, name: trimmed } : s);
      onSaveSpaces?.(updated);
      onAddSyncLog(`Renamed Space "${targetSpace.name}" to "${trimmed}"`);
      triggerToast?.('success', 'Đã đổi tên', `Đã đổi tên không gian thành "${trimmed}"`);
    }
    setEditingSpace(null);
  }, [editingSpaceName, spaces, onSaveSpaces, onAddSyncLog, triggerToast]);

  const handleStartSpaceRename = useCallback((space: Space, location: 'sidebar' | 'header', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canEditSpace(space)) {
      triggerToast?.('error', 'Không có quyền', 'Bạn không có quyền đổi tên không gian này.');
      return;
    }
    setEditingSpace({ id: space.id, location });
    setEditingSpaceName(space.name);
  }, [canEditSpace, triggerToast]);

  // Inline Folder Rename on Double Click (Scoped by location: 'sidebar' vs 'header')
  const [editingFolder, setEditingFolder] = useState<{ id: string; spaceId: string; location: 'sidebar' | 'header' } | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');
  const sidebarFolderRenameInputRef = useRef<HTMLInputElement>(null);
  const headerFolderRenameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFolder?.location === 'sidebar' && sidebarFolderRenameInputRef.current) {
      sidebarFolderRenameInputRef.current.focus();
      sidebarFolderRenameInputRef.current.select();
    } else if (editingFolder?.location === 'header' && headerFolderRenameInputRef.current) {
      headerFolderRenameInputRef.current.focus();
      headerFolderRenameInputRef.current.select();
    }
  }, [editingFolder]);

  const handleSaveFolderRename = useCallback((spaceId: string, folderId: string) => {
    const trimmed = editingFolderName.trim();
    const targetSpace = spaces.find(s => s.id === spaceId);
    const targetFolder = targetSpace?.folders?.find(f => f.id === folderId);
    if (targetSpace && targetFolder && trimmed && trimmed !== targetFolder.name) {
      const updated = spaces.map(s => {
        if (s.id === spaceId) {
          return {
            ...s,
            folders: s.folders?.map(f => f.id === folderId ? { ...f, name: trimmed } : f) || []
          };
        }
        return s;
      });
      onSaveSpaces?.(updated);
      onAddSyncLog(`Renamed Folder to "${trimmed}"`);
      triggerToast?.('success', 'Đã đổi tên', `Đã đổi tên thư mục thành "${trimmed}"`);
    }
    setEditingFolder(null);
  }, [editingFolderName, spaces, onSaveSpaces, onAddSyncLog, triggerToast]);

  const handleStartFolderRename = useCallback((spaceId: string, folder: { id: string; name: string }, location: 'sidebar' | 'header', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingFolder({ id: folder.id, spaceId, location });
    setEditingFolderName(folder.name);
  }, []);

  // Inline List Rename on Double Click
  const [editingList, setEditingList] = useState<{ id: string; spaceId: string; location?: 'sidebar' | 'header' } | null>(null);
  const [editingListName, setEditingListName] = useState<string>('');
  const sidebarListRenameInputRef = useRef<HTMLInputElement>(null);
  const headerListRenameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingList?.location === 'header' && headerListRenameInputRef.current) {
      headerListRenameInputRef.current.focus();
      headerListRenameInputRef.current.select();
    } else if (editingList && sidebarListRenameInputRef.current) {
      sidebarListRenameInputRef.current.focus();
      sidebarListRenameInputRef.current.select();
    }
  }, [editingList]);

  const handleSaveListRename = useCallback((spaceId: string, listId: string) => {
    const trimmed = editingListName.trim();
    const targetSpace = spaces.find(s => s.id === spaceId);
    const targetList = targetSpace?.lists?.find(l => l.id === listId);
    if (targetSpace && targetList && trimmed && trimmed !== targetList.name) {
      const updated = spaces.map(s => {
        if (s.id === spaceId) {
          return {
            ...s,
            lists: s.lists?.map(l => l.id === listId ? { ...l, name: trimmed } : l) || []
          };
        }
        return s;
      });
      onSaveSpaces?.(updated);
      onAddSyncLog(`Renamed List "${targetList.name}" to "${trimmed}"`);
      triggerToast?.('success', 'Đã đổi tên', `Đã đổi tên danh sách thành "${trimmed}"`);
    }
    setEditingList(null);
  }, [editingListName, spaces, onSaveSpaces, onAddSyncLog, triggerToast]);

  const handleStartListRename = useCallback((spaceId: string, list: { id: string; name: string }, location: 'sidebar' | 'header' = 'sidebar', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingList({ id: list.id, spaceId, location });
    setEditingListName(list.name);
  }, []);

  const hasListAccess = React.useCallback((space: Space, list: any) => {
    if (!hasSpaceAccess(space)) return false;
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isWsAdmin = currentUser?.role === 'admin' || activeWorkspace?.membershipRole === 'owner' || activeWorkspace?.membershipRole === 'admin';
    if (isWsOwner || isWsAdmin) return true;

    const isCreator = list.user_id === cleanCurrentUserId;
    const isGuest = currentUser?.role === 'guest' || activeWorkspace?.membershipRole === 'guest';
    const hasAccessKey = Boolean(list.shareSettings && list.shareSettings[cleanCurrentUserId]);

    if (isGuest) {
      return isCreator || hasAccessKey;
    }

    const isPublic = !list.isPrivate;
    return isCreator || isPublic || hasAccessKey;
  }, [currentUser, hasSpaceAccess, activeWorkspace]);

  const canEditList = React.useCallback((space: Space, list: any) => {
    if (!hasSpaceAccess(space)) return false;
    const cleanCurrentUserId = currentUser?.id;
    const isWsOwner = activeWorkspace?.user_id === cleanCurrentUserId;
    const isWsAdmin = currentUser?.role === 'admin' || activeWorkspace?.membershipRole === 'owner' || activeWorkspace?.membershipRole === 'admin';
    if (isWsOwner || isWsAdmin) return true;

    const isCreator = list.user_id === cleanCurrentUserId;
    const isGuest = currentUser?.role === 'guest' || activeWorkspace?.membershipRole === 'guest';
    const userShareRole = list.shareSettings ? list.shareSettings[cleanCurrentUserId] : undefined;

    if (userShareRole === 'edit') return true;
    if (userShareRole === 'view') return false; // Explicit read-only

    if (isGuest) return isCreator;

    const isPublic = !list.isPrivate;
    return isCreator || (canEditSpace(space) && isPublic);
  }, [currentUser, hasSpaceAccess, canEditSpace, activeWorkspace]);

  const handleSaveSharingSettings = (newIsPrivate: boolean, newShareSettings: Record<string, ShareRole>) => {
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
    } else if (sharingTargetType === 'folder') {
      const updated = spaces.map(s => {
        const hasFolder = s.folders?.some(f => f.id === sharingTargetId);
        if (hasFolder) {
          const updatedFolders = (s.folders || []).map(f => {
            if (f.id === sharingTargetId) {
              return {
                ...f,
                isPrivate: newIsPrivate,
                shareSettings: newShareSettings
              };
            }
            return f;
          });
          return { ...s, folders: updatedFolders };
        }
        return s;
      });
      onSaveSpaces?.(updated);
      onAddSyncLog(`Updated sharing settings for Folder "${sharingTargetName}"`);
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

  // Folder & Sprint Modal state
  const [folderModalState, setFolderModalState] = useState<{
    isOpen: boolean;
    spaceId: string | null;
    initialName?: string;
    isSprintMode?: boolean;
    editingFolderId?: string | null;
  }>({
    isOpen: false,
    spaceId: null,
    initialName: '',
    isSprintMode: false,
    editingFolderId: null,
  });

  const handleFolderModalSave = (spaceId: string, name: string, color?: string, editingFolderId?: string) => {
    if (editingFolderId) {
      const updated = spaces.map(s => {
        if (s.id === spaceId) {
          const updatedFolders = s.folders?.map(f => f.id === editingFolderId ? { ...f, name, color: color || f.color } : f) || [];
          return { ...s, folders: updatedFolders };
        }
        return s;
      });
      onSaveSpaces?.(updated);
      onAddSyncLog(`Renamed Folder to "${name}"`);
      triggerToast?.('success', 'Đã đổi tên', `Đã cập nhật thư mục "${name}"`);
    } else {
      if (onAddFolderToSpace) {
        onAddFolderToSpace(spaceId, name, color);
      } else {
        const updated = spaces.map(s => {
          if (s.id === spaceId) {
            const folders = s.folders || [];
            return {
              ...s,
              folders: [...folders, { id: `folder-${Date.now()}`, name, color }]
            };
          }
          return s;
        });
        onSaveSpaces?.(updated);
        onAddSyncLog(`Created Folder "${name}" in Space`);
        triggerToast?.('success', 'New Folder Created', `Created folder "${name}"`);
      }
    }
  };

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
  const [sidebarWidth, setSidebarWidth] = useState<number>(272);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle mouse drag sidebar resizing
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Keep the navigation comfortable to scan without letting it dominate the canvas.
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left || 0;
      const newWidth = Math.max(232, Math.min(380, e.clientX - sidebarLeft));
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
  const [staticTabs, setStaticTabs] = useState<SpaceViewTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-overview');
  const skipNextViewPersistenceRef = useRef(true);
  useEffect(() => {
    activeViewProtectedRef.current = Boolean(staticTabs.find(tab => tab.id === activeTabId)?.settings.protect);
  }, [activeTabId, staticTabs]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeSpaceMenu, setActiveSpaceMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [activeSpaceSettings, setActiveSpaceSettings] = useState<{ id: string; x: number; y: number } | null>(null);
  const [inlineRenameSpaceId, setInlineRenameSpaceId] = useState<string | null>(null);
  const [inlineRenameSpaceName, setInlineRenameSpaceName] = useState<string>('');
  const [activeListMenu, setActiveListMenu] = useState<{ id: string; spaceId: string; folderId: string | null; x: number; y: number } | null>(null);
  const [activeListSettings, setActiveListSettings] = useState<{ id: string; spaceId: string; folderId: string | null; x: number; y: number } | null>(null);
  const [activeFolderSettings, setActiveFolderSettings] = useState<{ id: string; spaceId: string; x: number; y: number } | null>(null);
  const [folderColorMenuOpen, setFolderColorMenuOpen] = useState<string | null>(null);
  // Custom Fields and visibility states
  const [showFieldsPanel, setShowFieldsPanel] = useState<boolean>(false);
  const [fieldsPanelAnchor, setFieldsPanelAnchor] = useState<{ x: number; y: number } | null>(null);
  const [visibleFields, setVisibleFields] = useState<string[]>([
    'title', 'status', 'priority', 'assignee', 'dueDate'
  ]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const openFieldsPanel = (anchor?: { x: number; y: number; rect?: DOMRect } | React.MouseEvent) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    if (anchor && 'currentTarget' in anchor) {
      const rect = (anchor.currentTarget as HTMLElement).getBoundingClientRect();
      setFieldsPanelAnchor({ x: rect.right, y: rect.bottom + 4 });
    } else if (anchor && 'x' in anchor) {
      setFieldsPanelAnchor({ x: anchor.x, y: anchor.y + 4 });
    } else {
      setFieldsPanelAnchor(null);
    }
    setShowFieldsPanel(true);
  };
  const persistCustomFields: React.Dispatch<React.SetStateAction<any[]>> = (action) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    const nextFields = typeof action === 'function' ? action(customFields) : action;
    setCustomFields(nextFields);
    if (activeSpace) {
      activeSpace.customFields = nextFields;
    }
    const targetSpaceId = activeSpaceId || activeSpace?.id;
    if (targetSpaceId) {
      const currentStoreSpaces = useSpaceStore.getState().spaces;
      const spaceInStore = currentStoreSpaces.find(s => s.id === targetSpaceId);
      const updatedSpace = {
        ...(spaceInStore || activeSpace || {}),
        id: targetSpaceId,
        customFields: nextFields
      };
      useSpaceStore.getState().updateSpace(updatedSpace);

      if (onSaveSpaces) {
        const existsInSpaces = spaces.some(space => space.id === targetSpaceId);
        const updatedSpaces = existsInSpaces
          ? spaces.map(space => space.id === targetSpaceId ? { ...space, customFields: nextFields } : space)
          : [...spaces, updatedSpace];
        onSaveSpaces(updatedSpaces);
      }
    }
  };

  const previousFieldScope = useRef<{ id: string; names: string[] }>({ id: '', names: [] });
  useEffect(() => {
    const fields = activeSpace.customFields || [];
    const names = fields.map(field => field.name);
    const previous = previousFieldScope.current;
    setCustomFields(prev => {
      const prevNames = prev.map(p => p.name);
      if (names.length === prevNames.length && names.every((n, i) => n === prevNames[i])) {
        return prev;
      }
      const activeMap = new Map(fields.map(f => [f.name, f]));
      prev.forEach(p => {
        if (!activeMap.has(p.name)) {
          activeMap.set(p.name, p);
        }
      });
      return Array.from(activeMap.values());
    });
    setVisibleFields(visible => {
      const standard = ['title', 'status', 'priority', 'assignee', 'dueDate', 'startDate'];
      const currentKnownNames = new Set([...names, ...customFields.map(cf => cf.name)]);
      const retained = visible.filter(name => standard.includes(name) || currentKnownNames.has(name));
      const added = names.filter(name => previous.id !== activeSpace.id || !previous.names.includes(name));
      return [...new Set([...retained, ...added])];
    });
    previousFieldScope.current = { id: activeSpace.id, names };
  }, [activeSpace.id, activeSpace.customFields]);
  // Confirm Modal state and helper
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemName?: string;
    itemType?: 'space' | 'folder' | 'list' | 'task' | 'doc' | 'whiteboard' | 'custom_field' | 'view' | 'generic';
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    type?: 'danger' | 'warning' | 'info' | 'success';
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
    itemName?: string;
    itemType?: 'space' | 'folder' | 'list' | 'task' | 'doc' | 'whiteboard' | 'custom_field' | 'view' | 'generic';
    onConfirm: () => void;
    isDestructive?: boolean;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: config.title,
      description: config.description,
      itemName: config.itemName,
      itemType: config.itemType,
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      type: config.type,
      isDestructive: config.isDestructive ?? true,
      onConfirm: () => {
        config.onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [showBreadcrumbNav, setShowBreadcrumbNav] = useState(false);
  const breadcrumbBtnRef = useRef<HTMLDivElement>(null);
  const [breadcrumbCoords, setBreadcrumbCoords] = useState<{ top: number; left: number } | null>(null);

  const toggleBreadcrumbNav = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!showBreadcrumbNav) {
      if (breadcrumbBtnRef.current) {
        const rect = breadcrumbBtnRef.current.getBoundingClientRect();
        setBreadcrumbCoords({
          top: rect.bottom + 6,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 325)),
        });
      }
      setShowBreadcrumbNav(true);
    } else {
      setShowBreadcrumbNav(false);
    }
  };

  useEffect(() => {
    if (!showBreadcrumbNav) return;
    const handleScrollOrResize = () => {
      if (breadcrumbBtnRef.current) {
        const rect = breadcrumbBtnRef.current.getBoundingClientRect();
        setBreadcrumbCoords({
          top: rect.bottom + 6,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 325)),
        });
      }
    };
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [showBreadcrumbNav]);

  useEffect(() => {
    setShowBreadcrumbNav(false);
  }, [activeListId, activeSpaceId]);

  const [listNameInput, setListNameInput] = useState('');
  const [spacesAddDropdownOpen, setSpacesAddDropdownOpen] = useState(false);
  const [showSpaceOptionsDropdown, setShowSpaceOptionsDropdown] = useState(false);
  const [showSpacesSearch, setShowSpacesSearch] = useState(false);
  const [spacesSearchQuery, setSpacesSearchQuery] = useState('');
  const [showHiddenSpaces, setShowHiddenSpaces] = useState(false);
  const [showArchivedToggle, setShowArchivedToggle] = useState(false);
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<Record<string, boolean>>({});
  const [showManageSpacesModal, setShowManageSpacesModal] = useState(false);

  const handleExpandAllFolders = () => {
    const nextFolders: Record<string, boolean> = {};
    const nextSpaces: Record<string, boolean> = {};
    spaces.forEach(s => {
      nextSpaces[s.id] = true;
      (s.folders || []).forEach(f => {
        nextFolders[f.id] = true;
      });
    });
    setExpandedSpaceIds(prev => ({ ...prev, ...nextSpaces }));
    setExpandedFolders(nextFolders);
    setShowSpaceOptionsDropdown(false);
  };

  const handleCloseAllFolders = () => {
    const nextFolders: Record<string, boolean> = {};
    spaces.forEach(s => {
      (s.folders || []).forEach(f => {
        nextFolders[f.id] = false;
      });
    });
    setExpandedFolders(nextFolders);
    setShowSpaceOptionsDropdown(false);
  };

  // Real Features: AI Generation, Form builder, Data Import & Export
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isAiGeneratingTasks, setIsAiGeneratingTasks] = useState(false);
  const [formTaskTitle, setFormTaskTitle] = useState('');
  const [formTaskDesc, setFormTaskDesc] = useState('');
  const [formTaskPriority, setFormTaskPriority] = useState<Priority>('medium');
  const [formTaskAssigneeId, setFormTaskAssigneeId] = useState('');
  const [formCustomValues, setFormCustomValues] = useState<Record<string, any>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [mindmapCollapsedLists, setMindmapCollapsedLists] = useState<Record<string, boolean>>({});
  const [mindmapZoom, setMindmapZoom] = useState<number>(100);
  const fileImportInputRef = useRef<HTMLInputElement>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  const totalArchivedCount = useMemo(() => {
    let count = 0;
    spaces.forEach(s => {
      if (s.isArchived) count++;
      (s.folders || []).forEach(f => { if (f.isArchived) count++; });
      (s.lists || []).forEach(l => { if (l.isArchived) count++; });
    });
    return count;
  }, [spaces]);

  const sidebarSpaces = useMemo(() => {
    const query = spacesSearchQuery.trim().toLowerCase();
    return spaces
      .filter(hasSpaceAccess)
      .filter(space => showHiddenSpaces || !space.isHidden)
      .filter(space => {
        if (!showArchivedToggle) {
          return !space.isArchived;
        }
        // In Archive view: show space if space itself is archived OR if it contains archived lists or folders
        const hasArchivedLists = (space.lists || []).some(l => l.isArchived);
        const hasArchivedFolders = (space.folders || []).some(f => f.isArchived || (space.lists || []).some(l => l.folderId === f.id && l.isArchived));
        return !!space.isArchived || hasArchivedLists || hasArchivedFolders;
      })
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

  const duplicateSpace = async (space: Space) => {
    if (!onSaveSpaces) return;
    const suffix = crypto.randomUUID();
    const folderIdMap = new Map((space.folders || []).map(folder => [folder.id, `folder-${crypto.randomUUID()}`]));
    const listIdMap = new Map((space.lists || []).map(list => [list.id, `l-${crypto.randomUUID()}`]));
    const clonedSpaceId = `s-${suffix}`;

    const clonedSpace: Space = {
      ...space,
      id: clonedSpaceId,
      name: `${space.name} (Bản sao)`,
      user_id: currentUser?.id,
      workspaceId: activeWorkspaceId || space.workspaceId,
      isFavorite: false,
      isHidden: false,
      isArchived: false,
      folders: (space.folders || []).map(folder => ({ ...folder, id: folderIdMap.get(folder.id)! })),
      lists: (space.lists || []).map(list => ({
        ...list,
        id: listIdMap.get(list.id)!,
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

    // Create the destination and its lists before inserting linked tasks.
    await onSaveSpaces([...spaces, clonedSpace]);
    const spaceTasks = tasks.filter(t => t.spaceId === space.id);
    await Promise.all(spaceTasks.map(task => {
      const newListId = task.listId ? listIdMap.get(task.listId) : undefined;
      return onAddTask({
        ...task,
        spaceId: clonedSpaceId,
        listId: newListId,
        workspaceId: activeWorkspaceId || task.workspaceId,
        title: task.title,
        subtasks: (task.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
        tags: task.tags ? [...task.tags] : []
      });
    }));
    setActiveSpaceId?.(clonedSpace.id);
    setActiveListId?.(null);
    setActiveFolderId(null);
    setActiveView('overview');
    triggerToast?.('success', 'Đã nhân bản Không gian', `Đã tạo "${clonedSpace.name}" cùng ${clonedSpace.lists.length} danh sách & ${spaceTasks.length} công việc.`);
    onAddSyncLog(`Duplicated Space "${space.name}" as "${clonedSpace.name}" with ${spaceTasks.length} tasks`);
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

  const handleDeleteList = async (listId: string) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    if (!onSaveSpaces) return;
    const listTasks = tasks.filter(task => task.listId === listId);
    const updatedSpaces = spaces.map(s => {
      if (s.id === activeSpace.id) {
        return {
          ...s,
          lists: s.lists?.filter(l => l.id !== listId) || []
        };
      }
      return s;
    });
    await Promise.all(listTasks.map(task => Promise.resolve(onDeleteTask(task.id))));
    onSaveSpaces(updatedSpaces);
    if (setActiveListId) setActiveListId(null);
    if (onAddSyncLog) onAddSyncLog(`Deleted list and ${listTasks.length} linked tasks`);
    if (triggerToast) triggerToast('success', 'Đã xóa danh sách', `Đã xóa danh sách cùng ${listTasks.length} công việc liên quan.`);
  };

  // Real AI Task Generation using structured task blueprint endpoint
  const handleAiGenerateTasks = async () => {
    if (!aiPromptInput.trim()) return;
    setIsAiGeneratingTasks(true);
    try {
      const targetSpaceId = activeSpace.id;
      const targetListId = activeListId || activeSpace.lists?.[0]?.id;

      const res = await callAiApi('/api/ai/generate-tasks', {
        prompt: aiPromptInput.trim(),
      });

      let generatedItems: Array<{
        title: string;
        description?: string;
        priority?: Priority;
        hoursEstimate?: number;
        tags?: string[];
        subtasks?: string[];
      }> = [];

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks) && data.tasks.length > 0) {
          generatedItems = data.tasks.map((item: any) => ({
            title: item.title,
            description: item.description || '',
            priority: (item.priority === 'normal' ? 'medium' : item.priority) as Priority || 'medium',
            hoursEstimate: Number(item.hoursEstimate) || 2,
            tags: Array.isArray(item.tags) ? item.tags : ['AI-Generated'],
            subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
          }));
        }
      }

      if (generatedItems.length === 0) {
        generatedItems = [
          { title: `${aiPromptInput.trim()} - Lập kế hoạch & Yêu cầu`, priority: 'high', hoursEstimate: 2, tags: ['AI-Generated'], subtasks: ['Khảo sát yêu cầu', 'Viết tài liệu kỹ thuật'] },
          { title: `${aiPromptInput.trim()} - Triển khai thực hiện`, priority: 'medium', hoursEstimate: 4, tags: ['AI-Generated'], subtasks: ['Phát triển tính năng', 'Tích hợp hệ thống'] },
          { title: `${aiPromptInput.trim()} - Đánh giá & Hoàn tất`, priority: 'medium', hoursEstimate: 2, tags: ['AI-Generated'], subtasks: ['Kiểm thử tính năng', 'Nghiệm thu'] },
        ];
      }

      generatedItems.forEach((item, itemIdx) => {
        const subtasks = (item.subtasks || []).map((subTitle: string, subIdx: number) => ({
          id: `sub-${Date.now()}-${itemIdx}-${subIdx}`,
          title: subTitle,
          completed: false,
        }));

        const tags = Array.from(new Set([...(item.tags || []), 'AI-Generated']));

        onAddTask({
          title: item.title,
          description: item.description || '',
          status: 'todo',
          priority: item.priority || 'medium',
          spaceId: targetSpaceId,
          listId: targetListId,
          workspaceId: activeWorkspaceId || activeSpace.workspaceId,
          hoursEstimate: item.hoursEstimate || 2,
          subtasks,
          tags,
        });
      });

      onAddSyncLog?.(`AI generated ${generatedItems.length} tasks from prompt: "${aiPromptInput.trim()}"`);
      triggerToast?.('success', 'Costack AI', `Đã tạo ${generatedItems.length} công việc kèm phân việc con vào danh sách.`);
      setAiPromptInput('');
      setActiveView('list');
    } catch (err) {
      console.error('Error generating tasks with AI:', err);
      triggerToast?.('error', 'Costack AI', 'Không thể tạo công việc tự động. Vui lòng thử lại.');
    } finally {
      setIsAiGeneratingTasks(false);
    }
  };

  // Real Export View Data (CSV / JSON)
  const handleExportViewData = (format: 'csv' | 'json' = 'csv') => {
    const tasksToExport = filteredTasks;
    if (tasksToExport.length === 0) {
      triggerToast?.('info', 'Xuất dữ liệu', 'Không có công việc nào trong chế độ xem hiện tại để xuất.');
      return;
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `apexa-${(activeSpace.name || 'space').toLowerCase().replace(/\s+/g, '-')}-${activeView}-${timestamp}.${format}`;
    
    if (format === 'csv') {
      const csvCell = (value: unknown) => {
        let str = Array.isArray(value) ? value.join('; ') : String(value ?? '');
        if (/^[=+@\-\t\r]/.test(str)) str = "'" + str;
        return '"' + str.replace(/"/g, '""') + '"';
      };
      const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'DueDate', 'HoursEstimate', 'Tags', ...customFields.map(field => field.name)].map(csvCell);
      const rows = tasksToExport.map(t => [t.id, t.title, t.status, t.priority, t.assigneeIds || [t.assigneeId || ''], t.dueDate, t.hoursEstimate ?? 0, t.tags || [], ...customFields.map(field => t.custom_fields?.[field.name])].map(csvCell));
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(tasksToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    triggerToast?.('success', 'Đã xuất dữ liệu', `Đã tải xuống ${tasksToExport.length} công việc (${format.toUpperCase()}).`);
    onAddSyncLog(`Exported ${tasksToExport.length} tasks as ${format.toUpperCase()}`);
  };

  // Real CSV / JSON File Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let count = 0;
        const targetSpaceId = activeSpace.id;
        const targetListId = activeListId || activeSpace.lists?.[0]?.id;
        
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item.title) {
                onAddTask({
                  title: item.title,
                  description: item.description || '',
                  status: item.status || 'todo',
                  priority: (item.priority === 'normal' ? 'medium' : item.priority) as Priority || 'medium',
                  spaceId: targetSpaceId,
                  listId: targetListId,
                  workspaceId: activeWorkspaceId || activeSpace.workspaceId,
                  hoursEstimate: item.hoursEstimate || 0,
                  subtasks: [],
                  tags: item.tags || ['Imported']
                });
                count++;
              }
            });
          }
        } else {
          const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
              if (parts.length > 0 && (parts[1] || parts[0])) {
                onAddTask({
                  title: parts[1] || parts[0],
                  description: parts[2] || '',
                  status: (parts[3] as TaskStatus) || 'todo',
                  priority: (parts[4] === 'normal' ? 'medium' : parts[4]) as Priority || 'medium',
                  spaceId: targetSpaceId,
                  listId: targetListId,
                  workspaceId: activeWorkspaceId || activeSpace.workspaceId,
                  subtasks: [],
                  tags: ['Imported']
                });
                count++;
              }
            }
          }
        }
        
        triggerToast?.('success', 'Nhập dữ liệu', `Đã nhập thành công ${count} công việc vào không gian.`);
        onAddSyncLog(`Imported ${count} tasks from file "${file.name}"`);
        setActiveView('list');
      } catch (err) {
        console.error('Failed to import file:', err);
        triggerToast?.('error', 'Lỗi nhập dữ liệu', 'Không thể đọc tệp dữ liệu. Vui lòng kiểm tra định dạng CSV hoặc JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Real Form Submission
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTaskTitle.trim()) {
      triggerToast?.('warning', 'Biểu mẫu', 'Vui lòng nhập tiêu đề yêu cầu công việc.');
      return;
    }
    setFormSubmitting(true);
    try {
      const targetSpaceId = activeSpace.id;
      const targetListId = activeListId || activeSpace.lists?.[0]?.id;
      
      onAddTask({
        title: formTaskTitle.trim(),
        description: formTaskDesc.trim(),
        status: 'todo',
        priority: formTaskPriority,
        assigneeId: formTaskAssigneeId || undefined,
        spaceId: targetSpaceId,
        listId: targetListId,
        workspaceId: activeWorkspaceId || activeSpace.workspaceId,
        subtasks: [],
        tags: ['Form-Submission'],
        custom_fields: { ...formCustomValues }
      });
      
      triggerToast?.('success', 'Đã gửi biểu mẫu', `Yêu cầu "${formTaskTitle.trim()}" đã được thêm vào danh sách công việc.`);
      onAddSyncLog(`Form submission created task: "${formTaskTitle.trim()}"`);
      setFormTaskTitle('');
      setFormTaskDesc('');
      setFormTaskPriority('medium');
      setFormCustomValues({});
    } catch (err) {
      console.error('Error submitting form task:', err);
      triggerToast?.('error', 'Lỗi', 'Không thể gửi biểu mẫu. Vui lòng thử lại.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Real Form Link Publish
  const handlePublishForm = () => {
    const formUrl = new URL(window.location.origin);
    formUrl.searchParams.set('space', activeSpace.id);
    formUrl.searchParams.set('view', 'form');
    if (activeListId) formUrl.searchParams.set('list', activeListId);
    navigator.clipboard.writeText(formUrl.toString());
    triggerToast?.('success', 'Đã xuất bản biểu mẫu', 'Đã sao chép liên kết biểu mẫu thu thập công việc vào bộ nhớ tạm.');
  };

  // Real Template Application
  const handleApplyTemplatePreset = (presetKey: string) => {
    const targetSpaceId = activeSpace.id;
    const templates: Record<string, { listName: string; tasks: Array<{ title: string; priority: Priority; hours: number }> }> = {
      agile: {
        listName: 'Sprint 1 - Agile Dev',
        tasks: [
          { title: 'Thiết kế kiến trúc hệ thống & cơ sở dữ liệu', priority: 'high', hours: 4 },
          { title: 'Xây dựng API Backend & tích hợp dịch vụ Cloud', priority: 'urgent', hours: 8 },
          { title: 'Phát triển giao diện người dùng và component UI', priority: 'high', hours: 6 },
          { title: 'Kiểm thử chất lượng QA & Unit Tests', priority: 'medium', hours: 4 },
          { title: 'Triển khai bản thử nghiệm Staging & Review', priority: 'medium', hours: 2 },
        ]
      },
      crm: {
        listName: 'Khách hàng tiềm năng (CRM Pipeline)',
        tasks: [
          { title: 'Liên hệ tư vấn khách hàng Doanh nghiệp (Deal 150M)', priority: 'urgent', hours: 2 },
          { title: 'Gửi báo giá và đề xuất giải pháp chi tiết', priority: 'high', hours: 1 },
          { title: 'Demo sản phẩm trực tiếp với ban lãnh đạo', priority: 'high', hours: 3 },
          { title: 'Ký kết hợp đồng & Kích hoạt gói bản quyền', priority: 'medium', hours: 2 },
        ]
      },
      marketing: {
        listName: 'Chiến dịch Tiếp thị Kỹ thuật số (Marketing)',
        tasks: [
          { title: 'Soạn thảo bài viết Blog & Tài liệu hướng dẫn', priority: 'medium', hours: 3 },
          { title: 'Thiết kế bộ banner và hình ảnh truyền thông', priority: 'high', hours: 4 },
          { title: 'Thiết lập chiến dịch quảng cáo Lead Generation', priority: 'urgent', hours: 5 },
          { title: 'Đo lường chi phí CAC và tối ưu tỷ lệ chuyển đổi', priority: 'medium', hours: 2 },
        ]
      }
    };
    
    const template = templates[presetKey] || templates.agile;
    const newListId = `l-${Date.now()}`;
    
    if (onSaveSpaces && spaces) {
      const updatedSpaces = spaces.map(s => {
        if (s.id === targetSpaceId) {
          const existingLists = s.lists || [];
          return {
            ...s,
            lists: [...existingLists, { id: newListId, name: template.listName, spaceId: s.id }]
          };
        }
        return s;
      });
      onSaveSpaces(updatedSpaces);
    }
    
    template.tasks.forEach(t => {
      onAddTask({
        title: t.title,
        description: '',
        status: 'todo',
        priority: t.priority,
        spaceId: targetSpaceId,
        listId: newListId,
        workspaceId: activeWorkspaceId || activeSpace.workspaceId,
        hoursEstimate: t.hours,
        subtasks: [],
        tags: ['Template']
      });
    });
    
    setActiveListId?.(newListId);
    setActiveView('list');
    setTemplatesModalOpen(false);
    triggerToast?.('success', 'Áp dụng Mẫu', `Đã tạo danh sách "${template.listName}" với ${template.tasks.length} công việc.`);
    onAddSyncLog(`Applied template "${presetKey}" to Space "${activeSpace.name}"`);
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

  const viewContextStorageKey = useMemo(() => {
    const contextId = activeListId ? `list-${activeListId}` : activeFolderId ? `folder-${activeFolderId}` : 'space-root';
    return `apexa_space_views_${activeWorkspaceId || 'workspace'}_${activeSpace.id}_${contextId}`;
  }, [activeFolderId, activeListId, activeSpace.id, activeWorkspaceId]);

  const updateViewSetting = (tabId: string, key: ViewSettingKey, checked: boolean) => {
    setStaticTabs(currentTabs => currentTabs.map(tab => {
      if (key === 'default') {
        return {
          ...tab,
          settings: { ...tab.settings, default: tab.id === tabId ? checked : false }
        };
      }
      return tab.id === tabId
        ? { ...tab, settings: { ...tab.settings, [key]: checked } }
        : tab;
    }));
    triggerToast?.('success', 'Đã cập nhật chế độ xem', checked ? 'Tùy chọn đã được bật và lưu.' : 'Tùy chọn đã được tắt và lưu.');
  };

  // Initialize and restore views independently for each Space / Folder / List context.
  useEffect(() => {
    const defaults = getDefaultViewTabs(Boolean(activeListId));
    let nextTabs = defaults;
    let nextActiveTabId = defaults.find(tab => tab.settings.default)?.id || defaults[0].id;

    try {
      const stored = localStorage.getItem(viewContextStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { tabs?: Array<Omit<SpaceViewTab, 'icon'>>; activeTabId?: string };
        const restoredTabs = Array.isArray(parsed.tabs)
          ? parsed.tabs
              .filter(tab => tab?.id && tab?.label && tab?.viewId && tab.viewId !== 'channel' && tab.id !== 'tab-channel' && tab.viewId !== 'doc' && tab.id !== 'tab-doc' && VIEW_ICON_MAP[tab.viewId])
              .map(tab => createViewTab(tab.id, tab.label, tab.viewId, tab.settings))
          : [];
        if (restoredTabs.length > 0) {
          nextTabs = restoredTabs;
          const requestedActive = restoredTabs.find(tab => tab.id === parsed.activeTabId);
          const defaultTab = restoredTabs.find(tab => tab.settings.default);
          nextActiveTabId = requestedActive?.id || defaultTab?.id || restoredTabs[0].id;
        }
      }
    } catch (error) {
      console.warn('Could not restore Space views:', error);
    }

    const linkedView = new URLSearchParams(window.location.search).get('view');
    const linkedTab = linkedView ? nextTabs.find(tab => tab.viewId === linkedView) : undefined;
    if (linkedTab) nextActiveTabId = linkedTab.id;

    const nextActiveTab = nextTabs.find(tab => tab.id === nextActiveTabId) || nextTabs[0];
    skipNextViewPersistenceRef.current = true;
    setStaticTabs(nextTabs);
    setActiveTabId(nextActiveTab.id);
    setActiveView(nextActiveTab.viewId);
  }, [activeListId, viewContextStorageKey]);

  useEffect(() => {
    if (skipNextViewPersistenceRef.current) {
      skipNextViewPersistenceRef.current = false;
      return;
    }
    if (staticTabs.length === 0) return;
    try {
      localStorage.setItem(viewContextStorageKey, JSON.stringify({
        activeTabId,
        tabs: staticTabs.map(tab => ({ id: tab.id, label: tab.label, viewId: tab.viewId, settings: tab.settings })),
      }));
    } catch (error) {
      console.warn('Could not persist Space views:', error);
    }
  }, [activeTabId, staticTabs, viewContextStorageKey]);

  useEffect(() => {
    const matchingTab = staticTabs.find(tab => tab.viewId === activeView);
    if (matchingTab && matchingTab.id !== activeTabId) setActiveTabId(matchingTab.id);
  }, [activeTabId, activeView, staticTabs]);
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [isBoardDisplayMenuOpen, setIsBoardDisplayMenuOpen] = useState<boolean>(false);
  const boardDisplayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (boardDisplayMenuRef.current && !boardDisplayMenuRef.current.contains(e.target as Node)) {
        setIsBoardDisplayMenuOpen(false);
      }
    };
    if (isSortMenuOpen || isBoardDisplayMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen, isBoardDisplayMenuOpen]);

  // Advanced Filter Builder State
  const [filterConjunction, setFilterConjunction] = useState<'AND' | 'OR'>('AND');
  const [filterConditions, setFilterConditions] = useState<{
    id: string;
    field: string;
    operator: 'is' | 'isNot' | 'contains' | 'isEmpty' | 'isNotEmpty' | 'gt' | 'lt';
    value: string;
  }[]>([]);
  const [filterPresets, setFilterPresets] = useState<{ name: string; conjunction: 'AND' | 'OR'; conditions: any[] }[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  // Selection and Sorting states
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskFocus, setTaskFocus] = useState<SpaceFocus>('all');
  const [isSmartSort, setIsSmartSort] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Bulk Actions State & Handlers
  const [undoAction, setUndoAction] = useState<{ previousTasks: Task[]; fields: (keyof Task)[] } | null>(null);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [bulkMoveSpaceId, setBulkMoveSpaceId] = useState<string>('');
  const [bulkMoveListId, setBulkMoveListId] = useState<string>('');
  useEffect(() => {
    if (!undoAction) return;
    const timeout = setTimeout(() => setUndoAction(null), 5000);
    return () => clearTimeout(timeout);
  }, [undoAction]);

  const handleBulkStatusChange = (newStatus: TaskStatus) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    const prev = tasks.filter(task => selectedTaskIds.includes(task.id));
    setUndoAction({ previousTasks: prev, fields: ['status', 'progress', 'completedAt'] });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        guardedUpdateTask({ ...task, status: newStatus });
      }
    });
  };

  const handleBulkAssigneeChange = (assigneeId: string | null) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    const prev = tasks.filter(task => selectedTaskIds.includes(task.id));
    setUndoAction({ previousTasks: prev, fields: ['assigneeId', 'assigneeIds'] });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        guardedUpdateTask({ 
          ...task, 
          assigneeId: assigneeId === 'unassigned' ? undefined : (assigneeId || undefined), 
          assigneeIds: assigneeId === 'unassigned' || !assigneeId ? [] : [assigneeId] 
        });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Bulk Assignees Updated', `Updated assignees for ${selectedTaskIds.length} tasks.`);
    }
  };

  const handleBulkPriorityChange = (newPriority: Priority | undefined) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    const prev = tasks.filter(task => selectedTaskIds.includes(task.id));
    setUndoAction({ previousTasks: prev, fields: ['priority'] });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        guardedUpdateTask({ ...task, priority: newPriority });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Bulk Priority Updated', `Updated priority for ${selectedTaskIds.length} tasks.`);
    }
  };

  const handleBulkDelete = () => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    triggerConfirm({
      title: 'Xóa công việc hàng loạt',
      description: `Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn? Hành động này không thể hoàn tác.`,
      onConfirm: () => {
        setUndoAction(null);
        selectedTaskIds.forEach(id => {
          guardedDeleteTask(id);
        });
        if (triggerToast) {
          triggerToast('warning', 'Bulk Tasks Deleted', `Deleted ${selectedTaskIds.length} tasks.`);
        }
        setSelectedTaskIds([]);
      }
    });
  };

  const handleBulkComplete = () => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    setUndoAction({
      previousTasks: tasks.filter(t => selectedTaskIds.includes(t.id)),
      fields: ['status', 'progress', 'completedAt'],
    });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        guardedUpdateTask({ ...task, status: 'completed' });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Đã hoàn thành', `Đã đánh dấu hoàn thành ${selectedTaskIds.length} công việc.`);
    }
    setSelectedTaskIds([]);
  };

  const handleBulkDuplicate = () => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    const tasksToDup = tasks.filter(t => selectedTaskIds.includes(t.id));
    tasksToDup.forEach(t => {
      guardedAddTask({
        ...t,
        title: `${t.title} (Bản sao)`,
        subtasks: (t.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
        tags: t.tags ? [...t.tags] : []
      });
    });
    if (triggerToast) {
      triggerToast('success', 'Đã nhân bản', `Đã nhân bản ${tasksToDup.length} công việc đã chọn.`);
    }
    if (onAddSyncLog) onAddSyncLog(`Bulk duplicated ${tasksToDup.length} tasks`);
    setSelectedTaskIds([]);
  };

  const handleBulkMove = (targetSpaceId: string, targetListId?: string) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    const targetSpace = spaces.find(s => s.id === targetSpaceId);
    const prev = tasks.filter(task => selectedTaskIds.includes(task.id));
    setUndoAction({ previousTasks: prev, fields: ['spaceId', 'workspaceId', 'listId'] });
    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        guardedUpdateTask({
          ...task,
          spaceId: targetSpaceId,
          workspaceId: (targetSpace as any)?.workspaceId || task.workspaceId,
          listId: targetListId || undefined,
        });
      }
    });
    if (triggerToast) {
      triggerToast('success', 'Di chuyển thành công', `Đã chuyển ${selectedTaskIds.length} công việc sang ${targetSpace?.name || 'không gian mới'}.`);
    }
    if (onAddSyncLog) onAddSyncLog(`Bulk moved ${selectedTaskIds.length} tasks to ${targetSpace?.name || targetSpaceId}`);
    setSelectedTaskIds([]);
    setShowBulkMoveModal(false);
  };

  const handleUndoBulkAction = () => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    if (undoAction) {
      undoAction.previousTasks.forEach(pt => {
        const current = tasks.find(task => task.id === pt.id);
        if (current) guardedUpdateTask(restoreBulkTaskFields(current, pt, undoAction.fields));
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
  const skipNextViewOptionsPersistenceRef = useRef(true);
  const viewOptionsStorageKey = `${viewContextStorageKey}_${activeView}_options`;

  // Customize View states
  const [showCustomizeViewModal, setShowCustomizeViewModal] = useState(false);
  const [showClosedTasks, setShowClosedTasks] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const item = localStorage.getItem('apexa_view_show_closed_tasks');
    return item !== null ? item === 'true' : true;
  });
  const [wrapText, setWrapText] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('apexa_view_wrap_text') === 'true';
  });
  const [showEmptyStatuses, setShowEmptyStatuses] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const item = localStorage.getItem('apexa_view_show_empty_statuses_v2');
    return item !== null ? item === 'true' : false;
  });
  const [showTaskLocations, setShowTaskLocations] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('apexa_view_show_locations') === 'true';
  });
  const [showSubtaskParentNames, setShowSubtaskParentNames] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const item = localStorage.getItem('apexa_view_show_parent_names');
    return item !== null ? item === 'true' : true;
  });
  const [subtasksMode, setSubtasksMode] = useState<'collapsed' | 'expanded' | 'separate'>(() => {
    if (typeof window === 'undefined') return 'collapsed';
    const item = localStorage.getItem('apexa_view_subtasks_mode') as any;
    return ['collapsed', 'expanded', 'separate'].includes(item) ? item : 'collapsed';
  });

  useEffect(() => {
    try {
      localStorage.setItem('apexa_view_show_closed_tasks', String(showClosedTasks));
      localStorage.setItem('apexa_view_wrap_text', String(wrapText));
      localStorage.setItem('apexa_view_show_empty_statuses_v2', String(showEmptyStatuses));
      localStorage.setItem('apexa_view_show_locations', String(showTaskLocations));
      localStorage.setItem('apexa_view_show_parent_names', String(showSubtaskParentNames));
      localStorage.setItem('apexa_view_subtasks_mode', subtasksMode);
    } catch (e) {}
  }, [showClosedTasks, wrapText, showEmptyStatuses, showTaskLocations, showSubtaskParentNames, subtasksMode]);

  const currentActiveTab = staticTabs.find(tab => tab.id === activeTabId) || staticTabs.find(tab => tab.viewId === activeView);
  const activeViewSettings = useMemo(() => ({
    autosave: currentActiveTab?.settings?.autosave ?? true,
    pin: currentActiveTab?.settings?.pin ?? false,
    private: currentActiveTab?.settings?.private ?? false,
    protect: currentActiveTab?.settings?.protect ?? false,
    default: currentActiveTab?.settings?.default ?? false,
  }), [currentActiveTab]);

  const handleUpdateActiveViewSetting = (key: 'autosave' | 'pin' | 'private' | 'protect' | 'default', val: boolean) => {
    const targetTabId = currentActiveTab?.id || activeTabId;
    if (!targetTabId) return;
    setStaticTabs(prev => prev.map(tab => {
      if (key === 'default') {
        return { ...tab, settings: { ...tab.settings, default: tab.id === targetTabId ? val : false } };
      }
      return tab.id === targetTabId ? { ...tab, settings: { ...tab.settings, [key]: val } } : tab;
    }));
    triggerToast?.('success', locale === 'vi' ? 'Cài đặt chế độ xem' : 'View settings', val ? (locale === 'vi' ? 'Đã bật tùy chọn.' : 'Option enabled.') : (locale === 'vi' ? 'Đã tắt tùy chọn.' : 'Option disabled.'));
  };

  const handleCopyViewLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeView);
    if (activeTabId) url.searchParams.set('tab', activeTabId);
    navigator.clipboard.writeText(url.toString());
    triggerToast?.('success', locale === 'vi' ? 'Sao chép liên kết' : 'Link copied', locale === 'vi' ? 'Đã sao chép liên kết trực tiếp tới chế độ xem này.' : 'Copied link to this view.');
  };

  useEffect(() => {
    skipNextViewOptionsPersistenceRef.current = true;
    setFilterPriority('all');
    setFilterAssignee('all');
    setFilterTag('all');
    setSortBy('manual');
    setSortDirection('asc');
    setFilterConjunction('AND');
    setFilterConditions([]);
    setFilterPresets([]);
    setIsSmartSort(false);
    setBoardGroupBy('status');
    setBoardSwimlaneBy('none');
    setCardSize('medium');
    setCardCover(true);
    setStackFields(false);
    try {
      const stored = localStorage.getItem(viewOptionsStorageKey);
      if (!stored) return;
      const options = JSON.parse(stored);
      setFilterPriority(options.filterPriority || 'all');
      setFilterAssignee(options.filterAssignee || 'all');
      setFilterTag(options.filterTag || 'all');
      setSortBy(options.sortBy || 'manual');
      setSortDirection(options.sortDirection === 'desc' ? 'desc' : 'asc');
      setFilterConjunction(options.filterConjunction === 'OR' ? 'OR' : 'AND');
      setFilterConditions(Array.isArray(options.filterConditions) ? options.filterConditions : []);
      setFilterPresets(Array.isArray(options.filterPresets) ? options.filterPresets : []);
      setIsSmartSort(Boolean(options.isSmartSort));
      setBoardGroupBy(['status', 'priority', 'assignee'].includes(options.boardGroupBy) ? options.boardGroupBy : 'status');
      setBoardSwimlaneBy(['none', 'status', 'priority', 'assignee'].includes(options.boardSwimlaneBy) ? options.boardSwimlaneBy : 'none');
      setCardSize(['small', 'medium', 'large'].includes(options.cardSize) ? options.cardSize : 'medium');
      setCardCover(options.cardCover !== false);
      setStackFields(Boolean(options.stackFields));
      if (typeof options.showClosedTasks === 'boolean') setShowClosedTasks(options.showClosedTasks);
      if (typeof options.wrapText === 'boolean') setWrapText(options.wrapText);
      if (typeof options.showEmptyStatuses === 'boolean') setShowEmptyStatuses(options.showEmptyStatuses);
      if (typeof options.showTaskLocations === 'boolean') setShowTaskLocations(options.showTaskLocations);
      if (typeof options.showSubtaskParentNames === 'boolean') setShowSubtaskParentNames(options.showSubtaskParentNames);
      if (options.subtasksMode && ['collapsed', 'expanded', 'separate'].includes(options.subtasksMode)) setSubtasksMode(options.subtasksMode);
      if (Array.isArray(options.visibleFields) && options.visibleFields.includes('title')) setVisibleFields(options.visibleFields);
    } catch (error) {
      console.warn('Could not restore view options:', error);
    }
  }, [viewOptionsStorageKey]);

  useEffect(() => {
    if (skipNextViewOptionsPersistenceRef.current) {
      skipNextViewOptionsPersistenceRef.current = false;
      return;
    }
    const activeTab = staticTabs.find(tab => tab.id === activeTabId);
    if (activeTab && !activeTab.settings.autosave) return;
    try {
      localStorage.setItem(viewOptionsStorageKey, JSON.stringify({
        filterPriority,
        filterAssignee,
        filterTag,
        sortBy,
        sortDirection,
        filterConjunction,
        filterConditions,
        filterPresets,
        isSmartSort,
        boardGroupBy,
        boardSwimlaneBy,
        cardSize,
        cardCover,
        stackFields,
        visibleFields,
        showClosedTasks,
        wrapText,
        showEmptyStatuses,
        showTaskLocations,
        showSubtaskParentNames,
        subtasksMode,
      }));
    } catch (error) {
      console.warn('Could not persist view options:', error);
    }
  }, [activeTabId, boardGroupBy, boardSwimlaneBy, cardCover, cardSize, filterAssignee, filterConditions, filterConjunction, filterPresets, filterPriority, filterTag, isSmartSort, sortBy, sortDirection, stackFields, staticTabs, viewOptionsStorageKey, visibleFields, showClosedTasks, wrapText, showEmptyStatuses, showTaskLocations, showSubtaskParentNames, subtasksMode]);

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
  const [initialSpaceDocId, setInitialSpaceDocId] = useState<string | null>(null);
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
  interface PrioritySuggestionItem {
    taskId: string;
    taskTitle: string;
    estimatedDifficulty: string;
    analysis: string;
    suggestedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'urgent' | 'high' | 'medium' | 'low';
    reasoningScore: number;
  }

  interface AiPriorityResponse {
    suggestions: PrioritySuggestionItem[];
    generalSummary: string;
  }
  
  const [aiSuggestions, setAiSuggestions] = useState<AiPriorityResponse | null>(null);

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
      if (!currentTask) {
        setSelectedTask(null);
      } else if (JSON.stringify(currentTask) !== JSON.stringify(selectedTask)) {
        setSelectedTask(currentTask);
      }
    }
  }, [tasks, selectedTask]);

  // Drop stale selections after realtime updates, list deletion, or bulk deletion.
  useEffect(() => {
    const validTaskIds = new Set(tasks.map(task => task.id));
    setSelectedTaskIds(previous => previous.filter(id => validTaskIds.has(id)));
  }, [tasks]);

  useEffect(() => {
    setSelectedTaskIds([]);
    setUndoAction(null);
    setTaskFocus('all');
  }, [activeWorkspaceId, activeSpaceId, activeListId, activeFolderId]);

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
    { id: 'list', label: 'Danh sách', desc: 'Theo dõi công việc theo nhóm', icon: List, color: '#7c828d', bg: 'rgba(124, 130, 141, 0.08)' },
    { id: 'gantt', label: 'Biểu đồ Gantt', desc: 'Lập kế hoạch phụ thuộc và thời gian', icon: GanttChart, color: '#f04438', bg: 'rgba(240, 68, 56, 0.08)' },
    { id: 'calendar', label: 'Lịch', desc: 'Lên lịch và phân công công việc', icon: Calendar, color: '#ff5f5f', bg: 'rgba(255, 95, 95, 0.08)' },
    { id: 'board', label: 'Bảng Kanban', desc: 'Di chuyển công việc giữa các cột', icon: Kanban, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
    { id: 'dashboard', label: 'Bảng điều khiển', desc: 'Theo dõi số liệu và tiến độ', icon: SlidersHorizontal, color: '#ee46bc', bg: 'rgba(238, 70, 188, 0.08)' },
    { id: 'table', label: 'Bảng dữ liệu', desc: 'Quản lý dữ liệu theo cột', icon: Table, color: '#12b76a', bg: 'rgba(18, 183, 106, 0.08)' },
    { id: 'whiteboard', label: 'Bảng trắng', desc: 'Phác thảo và kết nối ý tưởng', icon: Sparkles, color: '#f79009', bg: 'rgba(247, 144, 9, 0.08)' },
    { id: 'timeline', label: 'Dòng thời gian', desc: 'Xem công việc theo ngày bắt đầu và hạn', icon: Clock, color: '#ff7e33', bg: 'rgba(255, 126, 51, 0.08)' },
    { id: 'activity', label: 'Hoạt động', desc: 'Theo dõi thay đổi theo thời gian thực', icon: Activity, color: '#00bcd4', bg: 'rgba(0, 188, 212, 0.08)' },
    { id: 'workload', label: 'Khối lượng công việc', desc: 'Theo dõi năng lực của đội ngũ', icon: Users, color: '#009688', bg: 'rgba(0, 150, 136, 0.08)' },
    { id: 'mindmap', label: 'Sơ đồ tư duy', desc: 'Trực quan hóa cấu trúc ý tưởng', icon: Brain, color: '#e91e63', bg: 'rgba(233, 30, 99, 0.08)' },
    { id: 'team', label: 'Đội ngũ', desc: 'Theo dõi thành viên và phần việc', icon: UserIcon, color: '#9c27b0', bg: 'rgba(156, 39, 176, 0.08)' }
  ];

  const MORE_VIEWS: any[] = [];

  // Filtering and Sorting operations
  const scopedTasks = useMemo(() => tasks.filter(t => {
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
      if (myTasksOnly) {
        const currentUserId = currentUser?.id;
        if (!currentUserId || (t.assigneeId !== currentUserId && !t.assigneeIds?.includes(currentUserId))) return false;
      }
      return true;
    }), [tasks, activeSpaceId, activeListId, activeFolderId, activeSpace.lists, myTasksOnly, currentUser?.id]);

  const filteredTasks = useMemo(() => {
    let result = scopedTasks.filter(task => matchesSpaceFocus(task, taskFocus, currentUser?.id));

    // Closed tasks filter
    if (!showClosedTasks) {
      result = result.filter(t => t.status !== 'completed');
    }

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description || '').toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (t.assigneeId && members.find(m => m.id === t.assigneeId)?.name.toLowerCase().includes(q)) ||
        (t.assigneeIds && t.assigneeIds.some(id => members.find(m => m.id === id)?.name.toLowerCase().includes(q))) ||
        customFields.some(field => String(t.custom_fields?.[field.name] ?? '').toLowerCase().includes(q))
      );
    }

    // Priority filter
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }

    // Assignee filter
    if (filterAssignee !== 'all') {
      result = result.filter(t => t.assigneeId === filterAssignee || t.assigneeIds?.includes(filterAssignee));
    }

    // Tag filter
    if (filterTag !== 'all') {
      result = result.filter(t => t.tags && t.tags.includes(filterTag));
    }

    // Evaluate advanced conditions
    if (filterConditions.length > 0) {
      result = result.filter(t => {
        const matches = filterConditions.map(cond => {
          if (cond.field.startsWith('custom:')) return matchesCustomFieldFilter(t.custom_fields?.[cond.field.slice(7)], cond.operator, cond.value);
          let fieldVal = '';
          if (cond.field === 'status') fieldVal = t.status;
          else if (cond.field === 'priority') fieldVal = t.priority || '';
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
      result = [...result].sort((a, b) => {
        const aW = a.priority ? (weight[a.priority] || 0) : 0;
        const bW = b.priority ? (weight[b.priority] || 0) : 0;
        const diff = bW - aW;
        return sortDirection === 'desc' ? diff : -diff;
      });
    } else if (sortBy === 'dueDate') {
      result = [...result].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return sortDirection === 'asc' ? diff : -diff;
      });
    } else if (sortBy === 'title') {
      result = [...result].sort((a, b) => {
        const diff = a.title.localeCompare(b.title, 'vi');
        return sortDirection === 'asc' ? diff : -diff;
      });
    } else if (sortBy === 'createdAt') {
      result = [...result].sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        const diff = tB - tA; // default newest first
        return sortDirection === 'desc' ? diff : -diff;
      });
    } else if (sortBy === 'status') {
      const statusWeight: Record<TaskStatus, number> = { todo: 1, inprogress: 2, review: 3, completed: 4 };
      result = [...result].sort((a, b) => {
        const diff = (statusWeight[a.status] || 0) - (statusWeight[b.status] || 0);
        return sortDirection === 'asc' ? diff : -diff;
      });
    } else if (sortBy === 'manual') {
      const orderMap = new Map(taskOrder.map((id, idx) => [id, idx]));
      result = [...result].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : (typeof a.position === 'number' ? a.position : 9999);
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : (typeof b.position === 'number' ? b.position : 9999);
        return idxA - idxB;
      });
    }

    return result;
  }, [scopedTasks, taskFocus, currentUser?.id, searchQuery, filterPriority, filterAssignee, filterTag, sortBy, sortDirection, taskOrder, filterConjunction, filterConditions, customFields, showClosedTasks, members]);

  useEffect(() => {
    const visible = new Set(filteredTasks.map(task => task.id));
    setSelectedTaskIds(previous => previous.filter(id => visible.has(id)));
  }, [filteredTasks]);

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

  const activeFilterCount = (filterPriority !== 'all' ? 1 : 0) + (filterAssignee !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0) + filterConditions.length;

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
        try {
          const parsed = JSON.parse(data.text);
          setAiSuggestions(parsed);
        } catch (e) {
          console.error('Failed to parse AI priority suggestions JSON:', e);
        }
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
        guardedUpdateTask(updated);
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
    if (activeViewProtectedRef.current) return notifyProtectedView();
    if (file.size > 25 * 1024 * 1024) {
      triggerToast?.('warning', 'Tệp quá lớn', 'Mỗi tệp đính kèm không được vượt quá 25 MB.');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        triggerToast?.('warning', 'Cần đăng nhập', 'Vui lòng đăng nhập để tải tệp lên kho lưu trữ.');
        return;
      }
      const uuid = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${session.user.id}/tasks/${task.id}/${uuid}.${ext}`;
      onAddSyncLog(`Uploading: ${file.name}...`);
      const { error } = await supabase.storage.from('app-files').upload(filePath, file);
      if (error) {
        console.error('Upload error:', error);
        triggerToast?.('error', 'Tải tệp thất bại', error.message || 'Không thể tải tệp lên.');
        return;
      }
      const att = {
        id: uuid,
        name: file.name,
        filePath,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        mimeType: file.type || undefined,
      };
      const updated = {
        ...task,
        attachments: [...(task.attachments || []), att]
      };
      setSelectedTask(updated);
      guardedUpdateTask(updated);
      onAddSyncLog(`Uploaded successfully: ${file.name}`);
      triggerToast?.('success', 'Đã tải tệp', `${file.name} đã được đính kèm vào công việc.`);
    } catch (err) {
      console.error(err);
      triggerToast?.('error', 'Tải tệp thất bại', err instanceof Error ? err.message : 'Không thể tải tệp lên.');
    }
  };

  const handleAttachmentDelete = async (task: Task, att: TaskAttachment) => {
    if (activeViewProtectedRef.current) return notifyProtectedView();
    try {
      const { error } = await supabase.storage.from('app-files').remove([att.filePath]);
      if (error) throw error;
      const updated = {
        ...task,
        attachments: (task.attachments || []).filter(a => a.id !== att.id)
      };
      setSelectedTask(updated);
      guardedUpdateTask(updated);
      onAddSyncLog(`Deleted: ${att.name}`);
      triggerToast?.('success', 'Đã xóa tệp', `${att.name} đã được gỡ khỏi công việc.`);
    } catch (err) {
      console.error(err);
      triggerToast?.('error', 'Không thể xóa tệp', err instanceof Error ? err.message : 'Vui lòng thử lại.');
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
        viewId: view.id,
        settings: { ...DEFAULT_VIEW_SETTINGS, private: privateView, pin: pinView }
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

  const spacePulse = useMemo(() => {
    const contextTasks = tasks.filter(task => {
      if (activeSpaceId && task.spaceId !== activeSpaceId) return false;
      if (activeListId && task.listId !== activeListId) return false;
      return true;
    });
    const completed = contextTasks.filter(task => task.status === 'completed').length;
    const inMotion = contextTasks.filter(task => task.status === 'inprogress' || task.status === 'review').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = contextTasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = new Date(task.dueDate);
      return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    }).length;

    return {
      total: contextTasks.length,
      completed,
      inMotion,
      overdue,
      progress: contextTasks.length ? Math.round((completed / contextTasks.length) * 100) : 0,
    };
  }, [activeListId, activeSpaceId, tasks]);
  const activeViewLabel = staticTabs.find(tab => tab.viewId === activeView)?.label || 'Không gian làm việc';
  const isTaskWorkspaceView = TASK_WORKSPACE_VIEWS.has(activeView);

  return (
    <div className="apexa-space-shell flex-grow flex h-full bg-white dark:bg-[#000000] font-sans overflow-hidden relative">
      
      {/* Backdrop overlay for mobile Spaces sidebar */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-950/40 z-40 cursor-pointer"
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
            transition={isResizing ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            data-testid="space-sidebar"
            ref={sidebarRef}
            className={`apexa-space-sidebar h-full border-r border-slate-100 dark:border-white/[0.08] bg-white dark:bg-[var(--sidebar-bg)] flex flex-col overflow-hidden shrink-0 ${
              isMobileSidebarOpen
                ? 'fixed inset-y-0 left-0 z-50 shadow-2xl w-[280px] max-w-[85vw] flex'
                : 'hidden md:flex'
            }`}
          >
            {/* Inner fixed-width wrapper prevents content crushing during width collapse */}
            <div 
              className="h-full flex flex-col shrink-0 overflow-hidden" 
              style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? 280 : sidebarWidth }}
            >
              {/* Header: Spaces (Matches Hình 5) */}
              <div className="relative shrink-0 px-3.5 py-2.5 border-b border-slate-100 dark:border-white/[0.08] bg-white dark:bg-[var(--sidebar-bg)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                    {locale === 'vi' ? 'Không gian' : 'Spaces'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* 1. More options (...) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSpaceOptionsDropdown(prev => !prev)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        showSpaceOptionsDropdown || showHiddenSpaces || showArchivedToggle
                          ? 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white'
                          : 'text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                      title={locale === 'vi' ? 'Tùy chọn không gian' : 'Space options'}
                      aria-label={locale === 'vi' ? 'Tùy chọn không gian' : 'Space options'}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {showSpaceOptionsDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowSpaceOptionsDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-[#18191c] border border-slate-200 dark:border-white/10 p-1.5 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 text-slate-700 dark:text-zinc-300"
                          >
                            <div className="space-y-0.5">
                              {/* + Create Space */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSpaceOptionsDropdown(false);
                                  onAddSpace?.();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                              >
                                <Plus className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                <span>{locale === 'vi' ? 'Tạo Không gian' : 'Create Space'}</span>
                              </button>

                              {/* ⊞ Manage Spaces */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSpaceOptionsDropdown(false);
                                  setShowManageSpacesModal(true);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                              >
                                <LayoutGrid className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                <span>{locale === 'vi' ? 'Quản lý Không gian' : 'Manage Spaces'}</span>
                              </button>

                              {/* Divider */}
                              <div className="my-1 border-t border-slate-100 dark:border-white/[0.08]" />

                              {/* ⌵ Expand all Folders */}
                              <button
                                type="button"
                                onClick={handleExpandAllFolders}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                              >
                                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                <span>{locale === 'vi' ? 'Mở rộng tất cả Thư mục' : 'Expand all Folders'}</span>
                              </button>

                              {/* ^ Close all Folders */}
                              <button
                                type="button"
                                onClick={handleCloseAllFolders}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                              >
                                <ChevronUp className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                <span>{locale === 'vi' ? 'Đóng tất cả Thư mục' : 'Close all Folders'}</span>
                              </button>

                              {/* Divider */}
                              <div className="my-1 border-t border-slate-100 dark:border-white/[0.08]" />

                              {/* 👁 Show all Spaces */}
                              <div
                                onClick={() => setShowHiddenSpaces(prev => !prev)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Eye className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                  <span>{locale === 'vi' ? 'Hiện tất cả Không gian' : 'Show all Spaces'}</span>
                                </div>
                                <div className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                  showHiddenSpaces ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'
                                }`}>
                                  <span
                                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                      showHiddenSpaces ? 'translate-x-3.5' : 'translate-x-0'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* 🗃 Show archived */}
                              <div
                                onClick={() => setShowArchivedToggle(prev => !prev)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Archive className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                  <span>{locale === 'vi' ? 'Hiện lưu trữ' : 'Show archived'}</span>
                                </div>
                                <div className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                  showArchivedToggle ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'
                                }`}>
                                  <span
                                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                      showArchivedToggle ? 'translate-x-3.5' : 'translate-x-0'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 2. Search (🔍) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpacesSearch(prev => !prev);
                      if (showSpacesSearch) setSpacesSearchQuery('');
                    }}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      showSpacesSearch || spacesSearchQuery
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                        : 'text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    }`}
                    title={locale === 'vi' ? 'Tìm kiếm' : 'Search'}
                    aria-label={locale === 'vi' ? 'Tìm kiếm' : 'Search'}
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {/* 3. Collapse sidebar (<<) */}
                  <button
                    type="button"
                    onClick={() => setIsSubSidebarCollapsed(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title={locale === 'vi' ? 'Thu gọn thanh bên (Ctrl + \\)' : 'Collapse sidebar (Ctrl + \\)'}
                    aria-label={locale === 'vi' ? 'Thu gọn thanh bên' : 'Collapse sidebar'}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* 4. Unified Add button (+ ⌵) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSpacesAddDropdownOpen(prev => !prev)}
                      className="flex h-7 items-center gap-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-zinc-200 px-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      title={locale === 'vi' ? 'Tạo mới' : 'Create new'}
                      aria-label={locale === 'vi' ? 'Tạo mới' : 'Create new'}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <ChevronDown className="w-3 h-3 stroke-[2] opacity-70" />
                    </button>

                    <AnimatePresence>
                      {spacesAddDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setSpacesAddDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#18191c] border border-slate-200 dark:border-white/10 p-1 shadow-xl z-50 divide-y divide-slate-100 dark:divide-white/[0.06]"
                          >
                            <div className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSpacesAddDropdownOpen(false);
                                  onAddSpace?.();
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                              >
                                <Plus className="w-3.5 h-3.5 text-blue-500" />
                                <span>{locale === 'vi' ? 'Không gian mới' : 'New Space'}</span>
                              </button>
                              {activeSpace && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSpacesAddDropdownOpen(false);
                                      const folderName = prompt(locale === 'vi' ? 'Tên thư mục mới:' : 'New Folder name:');
                                      if (folderName?.trim()) {
                                        onAddFolderToSpace?.(activeSpace.id, folderName.trim());
                                      }
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                                  >
                                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{locale === 'vi' ? 'Thư mục mới' : 'New Folder'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSpacesAddDropdownOpen(false);
                                      onAddListSpace?.(activeSpace.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                                  >
                                    <List className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{locale === 'vi' ? 'Danh sách mới' : 'New List'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSpacesAddDropdownOpen(false);
                                      const docTitle = prompt(locale === 'vi' ? 'Tiêu đề tài liệu mới:' : 'New Doc title:');
                                      if (docTitle?.trim()) {
                                        onAddDocToSpace?.(activeSpace.id, docTitle.trim());
                                      }
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{locale === 'vi' ? 'Tài liệu mới' : 'New Doc'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Close mobile drawer */}
                  {isMobileSidebarOpen && (
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200 transition-all cursor-pointer"
                      title="Đóng thanh Không gian"
                      aria-label="Đóng thanh Không gian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Filter Search Bar if toggled via 🔍 */}
            {showSpacesSearch && (
              <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={spacesSearchQuery}
                    onChange={(e) => setSpacesSearchQuery(e.target.value)}
                    placeholder={locale === 'vi' ? 'Tìm không gian, thư mục...' : 'Search spaces, folders...'}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  {spacesSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSpacesSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSpacesSearch(false);
                    setSpacesSearchQuery('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  {locale === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </div>
            )}

            {/* Spaces navigation list */}
            <div className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-none">
              
              {/* Archive Mode Active Banner */}
              {showArchivedToggle && (
                <div className="mb-3 mx-0.5 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs shadow-3xs">
                  <div className="flex items-center gap-1.5 font-black text-[10.5px]">
                    <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Lưu trữ ({totalArchivedCount} mục)</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowArchivedToggle(false)} 
                    className="text-[9.5px] font-extrabold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 px-1.5 py-0.5 rounded-md transition-colors"
                  >
                    Thoát
                  </button>
                </div>
              )}

              {/* Spaces list */}
              <div className={showArchivedToggle ? 'mt-1' : 'mt-1'}>
                <div className="mb-1.5 flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {showArchivedToggle ? (locale === 'vi' ? 'Không gian lưu trữ' : 'Archived Spaces') : t('yourSpaces')}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onAddSpace?.()}
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer"
                      title={locale === 'vi' ? 'Thêm không gian mới' : 'Add new space'}
                      aria-label={locale === 'vi' ? 'Thêm không gian mới' : 'Add new space'}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpacesExpanded(value => !value);
                        setExpandedSpaceIds({});
                      }}
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer"
                      title={isSpacesExpanded ? 'Thu gọn tất cả Space' : 'Mở rộng tất cả Space'}
                      aria-label={isSpacesExpanded ? 'Thu gọn tất cả Space' : 'Mở rộng tất cả Space'}
                      aria-expanded={isSpacesExpanded}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isSpacesExpanded ? '' : '-rotate-90'}`} />
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5">
                {sidebarSpaces.map(space => {
                  const isSpaceActive = activeSpaceId === space.id && activeListId === null;
                  const isAnyChildActive = activeSpaceId === space.id;
                  const isExpanded = expandedSpaceIds[space.id] !== undefined 
                    ? expandedSpaceIds[space.id] 
                    : (showArchivedToggle || activeSpaceId === space.id || isSpacesExpanded);

                  const themeBgColors: Record<string, string> = {
                    indigo: 'bg-[#2563EB]',
                    rose: 'bg-[#FF3366]',
                    sky: 'bg-[#33D1FF]',
                    emerald: 'bg-[#10b981]',
                    amber: 'bg-[#f59e0b]',
                    sunset: 'bg-[#f97316]'
                  };
                  const bgClass = themeBgColors[space.themeColor || 'indigo'] || 'bg-[#2563EB]';
                  const initialLetter = space.name.charAt(0).toUpperCase();

                  return (
                    <div key={space.id} className="space-y-0.5">
                      <div
                        data-space-active={isSpaceActive || undefined}
                        className={`group/space relative flex h-[32px] items-center justify-between rounded-md px-1.5 text-xs transition-colors duration-150 select-none ${
                          isSpaceActive 
                            ? 'bg-blue-50/70 text-blue-900 dark:bg-sky-500/10 dark:text-sky-200 font-semibold' 
                            : isAnyChildActive
                              ? 'text-slate-900 dark:text-zinc-100 font-semibold hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
                              : 'text-slate-700 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white font-medium'
                        }`}
                      >
                        {isSpaceActive && (
                          <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-blue-600 dark:bg-sky-400 shadow-xs shadow-blue-500/40" />
                        )}

                        {/* Accordion Chevron Toggle + Space Icon + Space Name */}
                        <div 
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left cursor-pointer"
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
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-white transition-colors"
                            title={isExpanded ? "Thu gọn khu vực" : "Mở rộng khu vực"}
                            aria-label={isExpanded ? `Thu gọn ${space.name}` : `Mở rộng ${space.name}`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                          </button>

                          {/* Space Icon (Clickable to change Icon & Color) */}
                          <EmojiIconPicker
                            size="inline"
                            value={space.emoji || 'Folder'}
                            onChange={(newIcon) => updateSpaceProperties(space.id, { emoji: newIcon }, 'Đã cập nhật biểu tượng không gian.')}
                            title={`Đổi biểu tượng cho không gian "${space.name}"`}
                          >
                            {space.emoji && space.emoji !== '📦' ? (
                              renderSpaceIcon(space.emoji, "w-4 h-4 text-indigo-550 dark:text-indigo-400 shrink-0")
                            ) : (
                              <div className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold text-white shadow-2xs ring-1 ring-black/5 ${bgClass}`}>
                                {initialLetter}
                              </div>
                            )}
                          </EmojiIconPicker>
                          {editingSpace?.id === space.id && editingSpace.location === 'sidebar' ? (
                            <input
                              ref={sidebarSpaceRenameInputRef}
                              type="text"
                              value={editingSpaceName}
                              onChange={(e) => setEditingSpaceName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSaveSpaceRename(space.id);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingSpace(null);
                                }
                              }}
                              onBlur={() => handleSaveSpaceRename(space.id)}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                                className="h-[26px] min-w-0 flex-1 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                            />
                          ) : (
                            <span 
                              className="truncate text-[12.5px] font-semibold tracking-tight cursor-pointer"
                              title={locale === 'vi' ? 'Nhấp đúp để đổi tên nhanh' : 'Double click to rename'}
                              onDoubleClick={(e) => handleStartSpaceRename(space, 'sidebar', e)}
                            >
                              {space.name}
                            </span>
                          )}
                          {space.isFavorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />}
                          {space.isHidden && <EyeOff className="h-3 w-3 shrink-0 text-slate-400" />}
                          {space.isArchived && <Archive className="h-3 w-3 shrink-0 text-slate-400" />}
                          {space.isPrivate && <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />}
                        </div>

                        {/* Space Hover actions */}
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/space:opacity-100 group-hover/space:opacity-100">
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
                            className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="Thêm mục mới vào Không gian"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
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
                            className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="Cài đặt khu vực"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Lists & items nested under Space */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="relative ml-3 mt-0.5 space-y-0.5 border-l border-slate-200/80 dark:border-white/[0.08] pl-2 overflow-hidden"
                          >
                          {/* Render Folders */}
                          {space.folders?.filter(folder => showArchivedToggle ? (folder.isArchived || (space.lists || []).some(l => l.folderId === folder.id && l.isArchived)) : !folder.isArchived).sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite)).map(folder => {
                            const isFolderOpen = expandedFolders[folder.id] !== undefined ? expandedFolders[folder.id] : (showArchivedToggle || activeFolderId === folder.id);
                            const folderLists = (space.lists?.filter(l => l.folderId === folder.id && (showArchivedToggle ? (l.isArchived || folder.isArchived || space.isArchived) : (!l.isArchived && !folder.isArchived && !space.isArchived))) || []).filter(l => hasListAccess(space, l)).sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite));
                            const folderDocs = allDocs?.filter(d => d.folderId === folder.id) || [];
                            const folderWhiteboards = space.whiteboards?.filter(w => w.folderId === folder.id) || [];
                            return (
                              <div key={folder.id} className="space-y-0.5 text-left">
                                <div 
                                  className={`w-full flex items-center justify-between h-[30px] px-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer group/folder select-none ${
                                    activeSpaceId === space.id && activeFolderId === folder.id
                                      ? 'text-blue-700 dark:text-blue-300 font-bold bg-blue-50/70 dark:bg-blue-500/15'
                                      : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                  onClick={() => {
                                    if (setActiveSpaceId) setActiveSpaceId(space.id);
                                    if (setActiveListId) setActiveListId(null);
                                    setActiveFolderId(folder.id);
                                    setActiveView('overview');
                                    setExpandedFolders(prev => ({ ...prev, [folder.id]: !isFolderOpen }));
                                  }}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {isFolderOpen ? (
                                      <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: resolveFolderColor(folder.color) }} />
                                    ) : (
                                      <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: resolveFolderColor(folder.color) }} />
                                    )}
                                    {editingFolder?.id === folder.id && editingFolder.location === 'sidebar' ? (
                                      <input
                                        ref={sidebarFolderRenameInputRef}
                                        type="text"
                                        value={editingFolderName}
                                        onChange={(e) => setEditingFolderName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSaveFolderRename(space.id, folder.id);
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingFolder(null);
                                          }
                                        }}
                                        onBlur={() => handleSaveFolderRename(space.id, folder.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                        className="h-[26px] min-w-0 flex-1 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                                      />
                                    ) : (
                                      <span 
                                        className="truncate text-[12px] cursor-pointer"
                                        title={locale === 'vi' ? 'Nhấp đúp để đổi tên nhanh' : 'Double click to rename'}
                                        onDoubleClick={(e) => handleStartFolderRename(space.id, folder, 'sidebar', e)}
                                      >
                                        {folder.name}
                                      </span>
                                    )}
                                    {folder.isArchived && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0 ml-1">
                                        <Archive className="w-2.5 h-2.5" />
                                        Lưu trữ
                                      </span>
                                    )}
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
                                      className="opacity-0 group-hover/folder:opacity-100 h-5 w-5 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-white/[0.08] rounded-md text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer"
                                      title="Cài đặt thư mục"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPromptModal({
                                          type: 'list',
                                          title: 'Tạo danh sách trong thư mục',
                                          subtitle: `Thư mục: ${folder.name}`,
                                          placeholder: 'Nhập tên danh sách...',
                                          confirmText: 'Tạo danh sách',
                                          onConfirm: (name) => {
                                            if (name?.trim() && onAddListToFolder) {
                                              onAddListToFolder(space.id, folder.id, name.trim());
                                            }
                                          }
                                        });
                                      }}
                                      className="opacity-0 group-hover/folder:opacity-100 h-5 w-5 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-white/[0.08] rounded-md text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer"
                                      title="Thêm danh sách vào thư mục"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isFolderOpen ? '' : '-rotate-90'}`} />
                                  </div>
                                </div>

                                <AnimatePresence initial={false}>
                                  {isFolderOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                      className="pl-2 space-y-0.5 ml-1 mt-0.5 border-l border-slate-200/80 dark:border-white/[0.08] overflow-hidden"
                                    >
                                    {folderLists.map(list => {
                                      const isListActive = activeSpaceId === space.id && activeListId === list.id;
                                      const taskCount = tasks.filter(t => t.listId === list.id).length;
                                      return (
                                        <div
                                          key={list.id}
                                          className={`group/list relative flex h-[30px] w-full items-center justify-between rounded-md px-2 text-left text-xs transition-colors duration-150 select-none ${
                                            isListActive
                                              ? 'bg-blue-50/70 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300 font-semibold'
                                              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-zinc-100 font-medium'
                                          }`}
                                        >
                                          {isListActive && (
                                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-blue-600 dark:bg-sky-400 shadow-xs shadow-blue-500/40" />
                                          )}

                                          {/* List name click area */}
                                          <div 
                                            onClick={() => {
                                              if (setActiveSpaceId) setActiveSpaceId(space.id);
                                              if (setActiveListId) setActiveListId(list.id);
                                              setActiveFolderId(folder.id);
                                              setActiveView('table');
                                              onAddSyncLog(`Entered List: ${list.name}`);
                                            }}
                                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 pr-1"
                                          >
                                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                                              isListActive 
                                                ? 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300' 
                                                : 'text-slate-400 group-hover/list:text-slate-600 dark:text-zinc-400 dark:group-hover/list:text-zinc-200'
                                            }`}>
                                              <List className="h-3.5 w-3.5 stroke-[2]" />
                                            </div>
                                             {editingList?.id === list.id && editingList.location !== 'header' ? (
                                               <input
                                                 ref={sidebarListRenameInputRef}
                                                 type="text"
                                                 value={editingListName}
                                                 onChange={(e) => setEditingListName(e.target.value)}
                                                 onKeyDown={(e) => {
                                                   if (e.key === 'Enter') {
                                                     e.preventDefault();
                                                     e.stopPropagation();
                                                     handleSaveListRename(space.id, list.id);
                                                   } else if (e.key === 'Escape') {
                                                     e.preventDefault();
                                                     e.stopPropagation();
                                                     setEditingList(null);
                                                   }
                                                 }}
                                                 onBlur={() => handleSaveListRename(space.id, list.id)}
                                                 onClick={(e) => e.stopPropagation()}
                                                 onDoubleClick={(e) => e.stopPropagation()}
                                                 className="h-[26px] min-w-0 flex-1 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                                               />
                                             ) : (
                                               <span 
                                                 className="truncate text-[12px] cursor-pointer"
                                                 title={locale === 'vi' ? 'Nhấp đúp để đổi tên nhanh' : 'Double click to rename'}
                                                 onDoubleClick={(e) => handleStartListRename(space.id, list, 'sidebar', e)}
                                               >
                                                 {list.name}
                                               </span>
                                             )}
                                             {list.isArchived && (
                                               <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0 ml-1">
                                                 <Archive className="w-2.5 h-2.5" />
                                                 Lưu trữ
                                               </span>
                                             )}
                                             {list.isPrivate && <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />}
                                           </div>
                                          
                                          {/* Task count or hover actions */}
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            {/* Hover Actions */}
                                            <div className="opacity-0 group-hover/list:opacity-100 flex items-center gap-0.5 transition-opacity">
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
                                                className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-200/80 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors"
                                                title="Cài đặt"
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
                                                className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-200/80 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors"
                                                title="Tạo nhanh"
                                              >
                                                <Plus className="w-3 h-3" />
                                              </button>
                                            </div>
                                            
                                            {/* Count (shown when not hovering) */}
                                            <span className={`min-w-[18px] h-[18px] px-1.5 rounded-full text-center text-[10px] font-bold tabular-nums transition-colors group-hover/list:hidden flex items-center justify-center ${
                                              isListActive 
                                                ? 'bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-200' 
                                                : 'text-slate-400 dark:text-zinc-400'
                                            }`}>
                                              {taskCount}
                                            </span>
                                          </div>
                                        </div>
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
                                        className="w-full flex items-center gap-2 h-[30px] px-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100/70 hover:text-slate-900 dark:hover:bg-white/[0.04] dark:hover:text-white text-left cursor-pointer transition-all"
                                      >
                                        <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate text-[12px]">{wb.name}</span>
                                      </button>
                                    ))}

                                    {folderLists.length === 0 && folderDocs.length === 0 && folderWhiteboards.length === 0 && (
                                      <div className="text-[10px] text-slate-400 italic pl-3 py-1">Thư mục trống.</div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            );
                          })}

                          {/* Render direct Lists */}
                          {space.lists?.filter(l => !l.folderId && (showArchivedToggle ? (l.isArchived || space.isArchived) : (!l.isArchived && !space.isArchived))).filter(l => hasListAccess(space, l)).sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite)).map(list => {
                            const isListActive = activeSpaceId === space.id && activeListId === list.id;
                            const taskCount = tasks.filter(t => t.listId === list.id).length;
                            return (
                              <div
                                key={list.id}
                                className={`group/list relative flex h-[30px] w-full items-center justify-between rounded-md px-2 text-left text-xs transition-colors duration-150 select-none ${
                                  isListActive
                                    ? 'bg-blue-50/70 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300 font-semibold'
                                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-zinc-100 font-medium'
                                }`}
                              >
                                {isListActive && (
                                  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-blue-600 dark:bg-sky-400 shadow-xs shadow-blue-500/40" />
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
                                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 pr-1"
                                >
                                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                                    isListActive 
                                      ? 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300' 
                                      : 'text-slate-400 group-hover/list:text-slate-600 dark:text-zinc-400 dark:group-hover/list:text-zinc-200'
                                  }`}>
                                    <List className="h-3.5 w-3.5 stroke-[2]" />
                                  </div>
                                  {editingList?.id === list.id && editingList.location !== 'header' ? (
                                    <input
                                      ref={sidebarListRenameInputRef}
                                      type="text"
                                      value={editingListName}
                                      onChange={(e) => setEditingListName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleSaveListRename(space.id, list.id);
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingList(null);
                                        }
                                      }}
                                      onBlur={() => handleSaveListRename(space.id, list.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="h-[26px] min-w-0 flex-1 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                                    />
                                  ) : (
                                    <span 
                                      className="truncate text-[12px] cursor-pointer"
                                      title={locale === 'vi' ? 'Nhấp đúp để đổi tên nhanh' : 'Double click to rename'}
                                      onDoubleClick={(e) => handleStartListRename(space.id, list, 'sidebar', e)}
                                    >
                                      {list.name}
                                    </span>
                                  )}
                                  {list.isArchived && (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0 ml-1">
                                      <Archive className="w-2.5 h-2.5" />
                                      Lưu trữ
                                    </span>
                                  )}
                                  {list.isPrivate && <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />}
                                </div>
                                
                                {/* Task count or hover actions */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {/* Hover Actions */}
                                  <div className="opacity-0 group-hover/list:opacity-100 flex items-center gap-0.5 transition-opacity">
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
                                      className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-200/80 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors"
                                      title="Cài đặt"
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
                                      className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-200/80 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors"
                                      title="Tạo nhanh"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  {/* Count (shown when not hovering) */}
                                  <span className={`min-w-[18px] h-[18px] px-1.5 rounded-full text-center text-[10px] font-bold tabular-nums transition-colors group-hover/list:hidden flex items-center justify-center ${
                                    isListActive 
                                      ? 'bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-200' 
                                      : 'text-slate-400 dark:text-zinc-400'
                                  }`}>
                                    {taskCount}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

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
                              className="w-full flex items-center gap-2 h-[30px] px-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100/70 hover:text-slate-900 dark:hover:bg-white/[0.04] dark:hover:text-white text-left cursor-pointer transition-all"
                            >
                              <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate text-[12px]">{wb.name}</span>
                            </button>
                          ))}

                          {/* Quick Add List button at bottom of hierarchy */}
                          {activeSpaceId === space.id && (
                            <button
                              type="button"
                              onClick={() => onAddListSpace?.(space.id)}
                              className="group/addlist flex h-[28px] w-full items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 dark:text-zinc-400 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-all duration-150 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[2] opacity-70 group-hover/addlist:opacity-100 transition-opacity" />
                              <span>{locale === 'vi' ? 'Danh sách mới' : 'New list'}</span>
                            </button>
                          )}

                          {(!space.lists || space.lists.length === 0) && (!space.folders || space.folders.length === 0) && (!space.whiteboards || space.whiteboards.length === 0) && (
                            <div className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => onAddListSpace?.(space.id)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-dashed border-slate-200 dark:border-white/10 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-500/10 text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs font-medium transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2]" />
                                <span>{locale === 'vi' ? 'Tạo danh sách đầu tiên' : 'Create first list'}</span>
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  );
                })}
                {!sidebarSpaces.length && (
                  showArchivedToggle ? (
                    <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-8 text-center dark:border-amber-500/20">
                      <div className="w-9 h-9 mx-auto rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                        <Archive className="h-4.5 w-4.5" />
                      </div>
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">Không có mục nào trong lưu trữ</p>
                      <p className="mt-1 text-[9.5px] leading-relaxed text-slate-400">Các Không gian, Thư mục và Danh sách khi chọn "Lưu trữ" sẽ hiển thị tại đây.</p>
                      <button type="button" onClick={() => setShowArchivedToggle(false)} className="mt-3 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-[10px] font-black text-white cursor-pointer transition-colors shadow-xs">
                        Quay lại danh sách chính
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 text-center bg-white dark:bg-white/[0.02] shadow-xs">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-2.5 ring-4 ring-blue-500/5 dark:ring-sky-500/10">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('noMatchingSpaces') || (locale === 'vi' ? 'Chưa có không gian nào' : 'No spaces yet')}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{t('noMatchingSpacesDesc') || (locale === 'vi' ? 'Tạo không gian làm việc đầu tiên để sắp xếp dự án và công việc.' : 'Create your first space to organize projects and tasks.')}</p>
                      <button 
                        type="button" 
                        onClick={() => onAddSpace?.()} 
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>{t('createNewSpace') || (locale === 'vi' ? 'Tạo không gian mới' : 'Create new space')}</span>
                      </button>
                    </div>
                  )
                )}
              </div>
              </div>
            </div>

            {/* Create space & Trash rows */}
            <div className="shrink-0 border-t border-slate-100 bg-white p-2.5 dark:border-white/[0.08] dark:bg-[var(--sidebar-bg)] space-y-1.5">
              <button
                type="button"
                onClick={() => onAddSpace?.()}
                className="group/newspace flex min-h-9 w-full items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] px-2.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-all hover:border-slate-200/70 hover:bg-slate-100/80 dark:hover:bg-white/[0.05] dark:hover:border-white/15 dark:hover:text-white cursor-pointer"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-3xs transition group-hover/newspace:border-blue-300 group-hover/newspace:text-blue-600 group-hover/newspace:bg-blue-50 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-zinc-300 dark:group-hover/newspace:border-blue-500/40 dark:group-hover/newspace:bg-blue-500/15 dark:group-hover/newspace:text-blue-300">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <span>{t('createNewSpace') || (locale === 'vi' ? 'Tạo không gian mới' : 'Create new space')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTrashModal(true)}
                className="group/trash flex min-h-9 w-full items-center justify-between gap-2.5 rounded-xl border border-transparent hover:border-rose-200/60 dark:hover:border-rose-900/30 bg-transparent hover:bg-rose-50/50 dark:hover:bg-rose-950/20 px-2.5 py-2 text-left text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-3xs transition group-hover/trash:border-rose-300 group-hover/trash:text-rose-600 group-hover/trash:bg-rose-50 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-zinc-400 dark:group-hover/trash:border-rose-500/40 dark:group-hover/trash:bg-rose-500/15 dark:group-hover/trash:text-rose-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                  <span>{locale === 'vi' ? 'Thùng rác' : 'Task Trash'}</span>
                </div>
                {deletedTasks && deletedTasks.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    {deletedTasks.length}
                  </span>
                )}
              </button>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Resizer Border Handle */}
      {!isSubSidebarCollapsed && (
        <div
          onMouseDown={startResizing}
          onDoubleClick={() => setSidebarWidth(272)}
          className={`group relative z-40 hidden h-full w-[3px] shrink-0 cursor-col-resize select-none bg-transparent transition-all hover:w-[5px] hover:bg-indigo-500/40 md:block dark:hover:bg-indigo-500/50 ${
            isResizing ? 'bg-indigo-500/70 w-[6px]' : ''
          }`}
        />
      )}

      {/* Restore sub-sidebar trigger if collapsed (Smooth Slide Animation) */}
      <AnimatePresence>
        {isSubSidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0, x: -16, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.9 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsSubSidebarCollapsed(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-[var(--cu-surface)] border border-l-0 border-slate-200/80 dark:border-white/[0.08] rounded-r-xl shadow-md hover:shadow-lg px-1.5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0 hidden md:flex items-center justify-center group"
            title={locale === 'vi' ? 'Mở rộng thanh khu vực' : 'Expand sidebar'}
          >
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Page Workspace Content Container (Right) */}
      <div className="apexa-space-workspace flex-grow flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-transparent">
        <header className="apexa-space-header shrink-0 bg-white dark:bg-[var(--cu-surface)]/80 backdrop-blur-xl border-b border-slate-200/30 dark:border-white/[0.06] flex flex-col relative z-30 select-none">
          {/* Single Unified Header Row (UI/UX Upgraded, Clean & Compact) */}
          <div className="apexa-space-commandbar flex items-center justify-between px-3 sm:px-5 py-2 relative flex-wrap gap-2 sm:gap-3 min-h-[48px]">
            
            {/* Left Side: Breadcrumbs and Favorites */}
            <div className="apexa-space-header-left flex items-center gap-2 overflow-visible min-w-0 max-w-[calc(100%-140px)] sm:max-w-none order-1">
              {/* Mobile Spaces sub-sidebar trigger drawer button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
                title="Mở thanh danh mục Space"
              >
                <FolderOpen className="w-4 h-4 text-indigo-500" />
              </button>

              {/* Space Selector Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {activeSpaceId === null ? (
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/25 dark:bg-amber-400/20 dark:text-amber-400 shadow-xs">
                      <Star className="h-3.5 w-3.5 fill-current" />
                    </span>
                    <span className="text-slate-900 dark:text-zinc-100 font-bold text-sm tracking-tight">{t('allTasks')}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-zinc-300 border border-slate-200/70 dark:border-white/[0.08] shadow-3xs">
                      {filteredTasks.length} {locale === 'vi' ? 'việc' : filteredTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                ) : (
                  /* Space Icon & Name */
                  <div className="flex items-center gap-1">
                    <EmojiIconPicker
                      size="inline"
                      value={activeSpace.emoji || 'Folder'}
                      onChange={(newIcon) => updateSpaceProperties(activeSpace.id, { emoji: newIcon }, 'Đã cập nhật biểu tượng không gian.')}
                    />
                    {editingSpace?.id === activeSpace.id && editingSpace.location === 'header' ? (
                      <input
                        ref={headerSpaceRenameInputRef}
                        type="text"
                        value={editingSpaceName}
                        onChange={(e) => setEditingSpaceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveSpaceRename(activeSpace.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingSpace(null);
                          }
                        }}
                        onBlur={() => handleSaveSpaceRename(activeSpace.id)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="h-7 w-44 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                      />
                    ) : (
                      <div 
                        onClick={() => {
                          if (setActiveListId) setActiveListId(null);
                          setActiveView('overview');
                        }}
                        onDoubleClick={(e) => handleStartSpaceRename(activeSpace, 'header', e)}
                        className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                        title={locale === 'vi' ? 'Nhấp đúp để đổi tên nhanh' : 'Double click to rename'}
                      >
                        <span className="text-slate-850 dark:text-slate-200 font-extrabold">{activeSpace.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Folder if nested or active directly */}
                {(() => {
                  const currentList = activeSpace.lists?.find(l => l.id === activeListId);
                  const folderId = currentList?.folderId || activeFolderId;
                  const folder = activeSpace.folders?.find(f => f.id === folderId);
                  if (folder) {
                    return (
                      <>
                        <span className="text-slate-300 dark:text-zinc-700 mx-0.5 font-normal">/</span>
                        <div className="flex items-center gap-1 text-slate-550 dark:text-slate-400">
                          <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          {editingFolder?.id === folder.id && editingFolder.location === 'header' ? (
                            <input
                              ref={headerFolderRenameInputRef}
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSaveFolderRename(activeSpace.id, folder.id);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingFolder(null);
                                }
                              }}
                              onBlur={() => handleSaveFolderRename(activeSpace.id, folder.id)}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              className="h-7 w-40 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                            />
                          ) : (
                            <span 
                              className="truncate cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                              title={locale === 'vi' ? 'Nhấp đúp để đổi tên nhanh' : 'Double click to rename'}
                              onDoubleClick={(e) => handleStartFolderRename(activeSpace.id, folder, 'header', e)}
                            >
                              {folder.name}
                            </span>
                          )}
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
                        <span className="text-slate-300 dark:text-zinc-700 mx-0.5 font-normal">/</span>
                        
                        <div className="relative flex items-center" ref={breadcrumbBtnRef}>
                          {editingList?.id === currentList.id && editingList.location === 'header' ? (
                            <div className="flex items-center gap-1.5 py-0.5 px-1 rounded-lg">
                              <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <input
                                ref={headerListRenameInputRef}
                                type="text"
                                value={editingListName}
                                onChange={(e) => setEditingListName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSaveListRename(activeSpace.id, currentList.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingList(null);
                                  }
                                }}
                                onBlur={() => handleSaveListRename(activeSpace.id, currentList.id)}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                                className="h-7 w-40 rounded-md bg-white dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white border border-blue-500/50 dark:border-sky-400/50 outline-none shadow-xs ring-2 ring-blue-500/20 dark:ring-sky-400/20 transition-all selection:bg-blue-600 selection:text-white"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={toggleBreadcrumbNav}
                              className="flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors py-1 px-2 rounded-lg text-slate-800 dark:text-zinc-200"
                              title={locale === 'vi' ? 'Chuyển danh sách / Nhấp đúp để đổi tên nhanh' : 'Switch list / Double-click to rename'}
                            >
                              <List className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span 
                                onDoubleClick={(e) => handleStartListRename(activeSpace.id, currentList, 'header', e)}
                                className="text-slate-800 dark:text-zinc-200 font-bold text-xs max-w-[140px] sm:max-w-[220px] truncate"
                              >
                                {currentList.name}
                              </span>
                              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showBreadcrumbNav ? 'rotate-180' : ''}`} />
                            </button>
                          )}

                          {/* Interactive Breadcrumb Dropdown Navigator */}
                          <AnimatePresence>
                            {showBreadcrumbNav && breadcrumbCoords && (
                              <Portal>
                                <div
                                  className="fixed inset-0 z-[140] bg-transparent cursor-default"
                                  onClick={() => setShowBreadcrumbNav(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  style={{
                                    position: 'fixed',
                                    top: breadcrumbCoords.top,
                                    left: breadcrumbCoords.left,
                                  }}
                                  className="w-[310px] bg-white dark:bg-[#0a0b10] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-3 z-[150] text-left font-sans select-none"
                                >
                                  {/* Header Box: Rename list input & options */}
                                  <div className="flex items-center gap-2 p-1.5 border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.04] rounded-xl mb-3 shadow-3xs">
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
                                      placeholder="Tên danh sách..."
                                      className="flex-1 bg-transparent border-none outline-none font-bold text-slate-800 dark:text-zinc-100 text-xs px-1 py-0.5"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        if (triggerToast) triggerToast('success', 'Link Copied', 'Copied list link to clipboard!');
                                      }}
                                      className="p-1 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                                      title="Sao chép liên kết danh sách"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      type="button"
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
                                      className="p-1 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                                      title="Xóa danh sách"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="border-t border-slate-100 dark:border-white/[0.08] my-2" />

                                  {/* Hierarchy List */}
                                  <div className="space-y-1">
                                    {/* Space Header */}
                                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                                      {activeSpace.emoji && activeSpace.emoji !== '📦' ? (
                                        renderSpaceIcon(activeSpace.emoji, "w-4 h-4 text-indigo-550 dark:text-indigo-400")
                                      ) : (
                                        <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">
                                          {activeSpace.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="truncate">{activeSpace.name}</span>
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
                                                ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 shadow-3xs border border-blue-100/10 dark:border-blue-500/30' 
                                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] dark:hover:text-white'
                                            }`}
                                          >
                                            <List className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                                            <span className="truncate text-xs">{list.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              </Portal>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}

              </div>

              {/* Star Favorite Button */}
              <button 
                type="button"
                onClick={() => toggleSpaceFavorite(activeSpace)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer shrink-0 active:scale-90"
                title={activeSpace?.isFavorite ? (locale === 'vi' ? 'Bỏ yêu thích' : 'Remove from favorites') : (locale === 'vi' ? 'Thêm vào yêu thích' : 'Add to favorites')}
                aria-label={activeSpace?.isFavorite ? 'Bỏ Space khỏi yêu thích' : 'Thêm Space vào yêu thích'}
              >
                <Star className={`w-3.5 h-3.5 transition-transform duration-150 ${activeSpace?.isFavorite ? 'fill-amber-500 text-amber-500 scale-105' : 'hover:scale-110'}`} />
              </button>
            </div>

            {/* Modern View Switcher Tabs Bar (Full-width scrollable row on mobile, unified center on desktop) */}
            <div className="apexa-space-view-switcher w-full md:w-auto md:flex-1 flex items-center gap-2 order-3 md:order-2 overflow-x-auto no-scrollbar">
              <div className="hidden md:block w-px h-4.5 bg-slate-200/90 dark:bg-zinc-800 shrink-0 mx-1" />
              <SpaceViewTabBar
                tabs={staticTabs}
                onTabsChange={setStaticTabs}
                activeTabId={activeTabId}
                onSelectTab={(tabId, viewId) => {
                  const proViews = ['gantt', 'timeline', 'workload', 'mindmap', 'ai'];
                  if (proViews.includes(viewId) && !currentUser?.isPremium) {
                    onUpgradePremium?.();
                    return;
                  }
                  setActiveTabId(tabId);
                  setActiveView(viewId);
                }}
                activeSpace={activeSpace}
                activeListId={activeListId}
                currentUser={currentUser}
                onUpgradePremium={onUpgradePremium}
                triggerToast={triggerToast}
                triggerConfirm={triggerConfirm}
                onOpenFieldsPanel={openFieldsPanel}
                onExportCsv={() => handleExportViewData('csv')}
                onOpenTemplates={() => setTemplatesModalOpen(true)}
                onOpenShareModal={() => {
                  setSharingTargetType('space');
                  setSharingTargetId(activeSpace.id);
                  setSharingTargetName(activeSpace.name);
                  setSharingTargetIsPrivate(!!activeSpace.isPrivate);
                  setSharingTargetShareSettings(activeSpace.shareSettings || {});
                  setSharingModalOpen(true);
                }}
                onAddSyncLog={onAddSyncLog}
                onOpenCustomizeView={() => setShowCustomizeViewModal(true)}
              />
            </div>

            {/* Right Side: Share, Cog Settings, and "+ Task" primary action */}
            <div className="apexa-space-header-actions flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 order-2 md:order-3 ml-auto">

              {/* Share button (Sleek Ghost Pill) */}
              <button 
                type="button"
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
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer group"
                title="Chia sẻ và quản lý quyền truy cập"
              >
                <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-500 transition-colors shrink-0" />
                <span>{locale === 'vi' ? 'Chia sẻ' : 'Share'}</span>
                {activeSpace.isPrivate && (
                  <Lock className="w-3 h-3 text-amber-500 ml-0.5 shrink-0" />
                )}
              </button>

              {/* Solid "+ Task" button */}
              <button
                type="button"
                onClick={() => activeViewProtectedRef.current ? notifyProtectedView() : setShowAddModal(true)}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                <span>{locale === 'vi' ? 'Công việc' : 'Task'}</span>
              </button>

            </div>
          </div>
        </header>

      {/* ── Filter / Sorter Bar (Seamless & Gentle Workspace Toolbar) ── */}
      {isTaskWorkspaceView && (
        <div className="apexa-space-filterbar shrink-0 border-b border-slate-200/60 dark:border-white/[0.06] px-3 sm:px-5 py-1 flex items-center justify-between gap-2 bg-white/80 dark:bg-[#050508]/90 backdrop-blur-md min-h-[38px] overflow-x-auto no-scrollbar" role="search" aria-label={locale === 'vi' ? 'Tìm kiếm và lọc công việc' : 'Search and filter tasks'}>
          
          {/* Left section: Search + (if Board view) Group & Swimlane */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search task input */}
            <div className="group flex items-center gap-1.5 bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-3xs rounded-xl px-2.5 py-0.5 w-32 sm:w-40 lg:w-48 transition-all h-7.5">
              <Search className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors shrink-0" />
              <input 
                type="text" 
                placeholder={locale === 'vi' ? 'Tìm kiếm công việc...' : (t('searchTask') || 'Search tasks...')} 
                aria-label={locale === 'vi' ? 'Tìm kiếm công việc...' : (t('searchTask') || 'Search tasks...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-no-focus-outline="true"
                className="apexa-search-input w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 border-none !border-0 outline-none !outline-none focus:outline-none focus:!outline-none focus-visible:outline-none focus-visible:!outline-none focus:ring-0 focus:!ring-0 focus-visible:ring-0 focus-visible:!ring-0 shadow-none"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title={locale === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Board View Specific Controls (Inline seamlessly with Search) */}
            {activeView === 'board' && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

                {/* Group By Selector */}
                <div className="flex items-center gap-1 bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 rounded-xl px-2 shadow-3xs h-7.5 transition-colors">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold hidden md:inline shrink-0">
                    {locale === 'vi' ? 'Nhóm:' : 'Group:'}
                  </span>
                  <Select
                    value={boardGroupBy}
                    onChange={(v) => {
                      setBoardGroupBy(v as any);
                      if (boardSwimlaneBy === v) {
                        setBoardSwimlaneBy('none');
                      }
                    }}
                    size="sm"
                    variant="inline"
                    ariaLabel={locale === 'vi' ? 'Nhóm theo' : 'Group by'}
                    options={[
                      { value: 'status', label: locale === 'vi' ? 'Trạng thái' : 'Status' },
                      { value: 'priority', label: locale === 'vi' ? 'Mức ưu tiên' : 'Priority' },
                      { value: 'assignee', label: locale === 'vi' ? 'Người phụ trách' : 'Assignee' },
                    ]}
                  />
                </div>

                {/* Swimlane Selector */}
                <div className="flex items-center gap-1 bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 rounded-xl px-2 shadow-3xs h-7.5 transition-colors">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold hidden md:inline shrink-0">
                    {locale === 'vi' ? 'Làn bơi:' : 'Swimlane:'}
                  </span>
                  <Select
                    value={boardSwimlaneBy}
                    onChange={(v) => setBoardSwimlaneBy(v as any)}
                    size="sm"
                    variant="inline"
                    ariaLabel={locale === 'vi' ? 'Làn công việc' : 'Swimlane'}
                    options={[
                      { value: 'none', label: locale === 'vi' ? 'Không' : 'None' },
                      ...(boardGroupBy !== 'status' ? [{ value: 'status', label: locale === 'vi' ? 'Trạng thái' : 'Status' }] : []),
                      ...(boardGroupBy !== 'priority' ? [{ value: 'priority', label: locale === 'vi' ? 'Mức ưu tiên' : 'Priority' }] : []),
                      ...(boardGroupBy !== 'assignee' ? [{ value: 'assignee', label: locale === 'vi' ? 'Người phụ trách' : 'Assignee' }] : []),
                    ]}
                  />
                </div>
              </>
            )}

            {/* List View Specific Controls (Quick Empty Statuses Toggle) */}
            {activeView === 'list' && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => {
                    const next = !showEmptyStatuses;
                    setShowEmptyStatuses(next);
                    triggerToast?.('info', 'Chế độ xem', next ? (locale === 'vi' ? 'Đang hiển thị tất cả trạng thái' : 'Showing all statuses') : (locale === 'vi' ? 'Đã ẩn các trạng thái chưa có công việc' : 'Hidden empty statuses'));
                  }}
                  className={`h-7.5 px-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                    !showEmptyStatuses
                      ? 'bg-blue-50/90 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300 font-bold'
                      : 'bg-slate-50/90 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={locale === 'vi'
                    ? (showEmptyStatuses ? 'Đang hiện nhóm trạng thái trống — Nhấp để ẩn các trạng thái chưa có việc' : 'Đang ẩn các trạng thái chưa có việc — Nhấp để hiện tất cả')
                    : (showEmptyStatuses ? 'Showing empty statuses — Click to hide' : 'Hiding empty statuses — Click to show all')
                  }
                >
                  {showEmptyStatuses ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 shrink-0" />}
                  <span className="hidden md:inline">
                    {locale === 'vi' ? (showEmptyStatuses ? 'Hiện nhóm trống' : 'Ẩn nhóm trống') : (showEmptyStatuses ? 'Empty: Show' : 'Empty: Hide')}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Middle section: Focus Pills (Integrated cleanly on the same row) */}
          {TASK_WORKSPACE_VIEWS.has(activeView) && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10 shrink-0 mx-1 hidden md:block" />
              <SpaceFocusBar 
                variant="inline"
                tasks={scopedTasks} 
                focus={taskFocus} 
                onFocusChange={setTaskFocus}
                userId={currentUser?.id} 
                locale={locale} 
                resultCount={filteredTasks.length} 
              />
            </>
          )}

          {/* Right section: Filters, Sorter, Card Size/Covers, AI, Add Board */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Customize View Button (ClickUp style) */}
            <button 
              type="button"
              onClick={() => setShowCustomizeViewModal(true)}
              className={`h-7.5 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showCustomizeViewModal
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
              title={locale === 'vi' ? 'Tùy chỉnh chế độ xem (Bảng, Danh sách, Kanban, Gantt)' : 'Customize view'}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{locale === 'vi' ? 'Tùy chỉnh' : 'Customize'}</span>
            </button>

            {/* Filter Drawer Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-7.5 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-500/30 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
              }`}
              title={locale === 'vi' ? 'Bộ lọc công việc' : (t('filter') || 'Filter')}
            >
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{locale === 'vi' ? 'Bộ lọc' : (t('filter') || 'Filter')}</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[8.5px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Custom Sorter Dropdown Popover */}
            <div className="relative" ref={sortMenuRef}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className={`h-7.5 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortBy !== 'manual'
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-500/30 shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                  }`}
                  title={locale === 'vi' ? 'Sắp xếp công việc' : 'Sort'}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{locale === 'vi' ? 'Sắp xếp' : 'Sort'}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <AnimatePresence>
                {isSortMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-72 p-2 bg-white/98 dark:bg-[#0a0b10]/98 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-1 font-sans text-xs"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-white/[0.08] mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {locale === 'vi' ? 'Sắp xếp công việc' : 'Sort Tasks'}
                      </span>
                      {sortBy !== 'manual' && (
                        <button
                          type="button"
                          onClick={() => { setSortBy('manual'); setIsSortMenuOpen(false); }}
                          className="text-[10px] text-indigo-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                        >
                          {locale === 'vi' ? 'Đặt lại' : 'Reset'}
                        </button>
                      )}
                    </div>

                    {/* Sorting Options list */}
                    {[
                      { id: 'manual', label: locale === 'vi' ? 'Thứ tự thủ công' : (t('manualOrder') || 'Manual'), desc: locale === 'vi' ? 'Kéo thả tùy ý' : 'Drag and drop freely', icon: SlidersHorizontal, color: 'text-slate-500 bg-slate-100 dark:bg-white/[0.06]' },
                      { id: 'priority', label: locale === 'vi' ? 'Độ ưu tiên' : (t('sortByPriority') || 'Priority'), desc: locale === 'vi' ? 'Khẩn cấp → Thấp' : 'Urgent to Low', icon: Flag, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20' },
                      { id: 'dueDate', label: locale === 'vi' ? 'Hạn chót' : (t('sortByDueDate') || 'Due Date'), desc: locale === 'vi' ? 'Gần hạn nhất trước' : 'Nearest deadline first', icon: Calendar, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/20' },
                      { id: 'title', label: locale === 'vi' ? 'Bảng chữ cái' : (t('sortByTitle') || 'Title (A-Z)'), desc: locale === 'vi' ? 'Theo tên A-Z' : 'Alphabetical order', icon: ArrowDownAZ, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/20' },
                      { id: 'createdAt', label: locale === 'vi' ? 'Ngày tạo' : (t('sortByCreatedAt') || 'Created Date'), desc: locale === 'vi' ? 'Gần đây nhất' : 'Recently created first', icon: Clock, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/20' },
                      { id: 'status', label: locale === 'vi' ? 'Trạng thái' : (t('sortByStatus') || 'Status'), desc: locale === 'vi' ? 'Theo tiến độ' : 'By task progress', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20' },
                    ].map(opt => {
                      const isActive = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.id as any);
                            if (opt.id === 'manual') setIsSortMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50/80 dark:bg-blue-500/15 text-indigo-900 dark:text-blue-200 font-bold'
                              : 'hover:bg-slate-100/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${opt.color}`}>
                              <opt.icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate leading-tight">{opt.label}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">{opt.desc}</p>
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-indigo-600 dark:text-blue-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Board View Right Controls (Size, Covers, Add Board) */}
            {activeView === 'board' && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

                {/* Card Size Selector (Inline on desktop >= xl) */}
                <div className="hidden xl:flex items-center gap-0.5 bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.07] rounded-xl p-0.5 shadow-3xs h-8">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCardSize(size)}
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                        cardSize === size
                          ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-white/10'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={locale === 'vi' ? `Kích cỡ thẻ: ${{ small: 'Nhỏ', medium: 'Vừa', large: 'Lớn' }[size]}` : `Card size: ${{ small: 'Small', medium: 'Medium', large: 'Large' }[size]}`}
                    >
                      {{ small: locale === 'vi' ? 'Nhỏ' : 'Small', medium: locale === 'vi' ? 'Vừa' : 'Medium', large: locale === 'vi' ? 'Lớn' : 'Large' }[size]}
                    </button>
                  ))}
                </div>

                {/* Show Covers Toggle Button (Inline on desktop >= xl) */}
                <button
                  type="button"
                  onClick={() => setCardCover(!cardCover)}
                  className={`hidden xl:flex h-8 px-2.5 border rounded-xl items-center gap-1.5 transition-all cursor-pointer text-[11px] font-bold shadow-3xs ${
                    cardCover
                      ? 'bg-indigo-50/90 dark:bg-blue-500/20 border-indigo-200 dark:border-blue-500/40 text-indigo-600 dark:text-blue-300'
                      : 'bg-white dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title={locale === 'vi' ? 'Bật/tắt hiển thị ảnh đính kèm làm bìa' : 'Toggle cover images'}
                >
                  <Paperclip className="w-3 h-3" />
                  <span>{locale === 'vi' ? 'Ảnh bìa' : 'Covers'}</span>
                </button>

                {/* Display Popover (For screens < xl:) */}
                <div className="relative xl:hidden" ref={boardDisplayMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsBoardDisplayMenuOpen(!isBoardDisplayMenuOpen)}
                    className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isBoardDisplayMenuOpen || !cardCover || cardSize !== 'medium'
                        ? 'bg-indigo-50 dark:bg-blue-500/20 border-indigo-200 dark:border-blue-500/40 text-indigo-600 dark:text-blue-300 font-bold'
                        : 'bg-white dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={locale === 'vi' ? 'Tùy chọn hiển thị thẻ' : 'Display options'}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{locale === 'vi' ? 'Hiển thị' : 'Display'}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isBoardDisplayMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isBoardDisplayMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-1.5 z-50 w-60 p-3 bg-white/98 dark:bg-[#0a0b10]/98 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-3 font-sans text-xs"
                      >
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                            {locale === 'vi' ? 'Kích thước thẻ' : 'Card Size'}
                          </span>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl">
                            {(['small', 'medium', 'large'] as const).map(size => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setCardSize(size)}
                                className={`py-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  cardSize === size 
                                    ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-blue-400 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                              >
                                {{ small: locale === 'vi' ? 'Nhỏ' : 'Small', medium: locale === 'vi' ? 'Vừa' : 'Medium', large: locale === 'vi' ? 'Lớn' : 'Large' }[size]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                          <span className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            {locale === 'vi' ? 'Ảnh bìa công việc' : 'Cover images'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCardCover(!cardCover)}
                            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                              cardCover ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              cardCover ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Add Board Button */}
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('apexa-open-add-board'));
                  }}
                  className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer active:scale-95 transition-all"
                  title={locale === 'vi' ? 'Thêm bảng / cột trạng thái mới' : 'Add new column'}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{locale === 'vi' ? 'Thêm bảng' : 'Add Board'}</span>
                </button>
              </>
            )}

            {/* AI Priority suggestions button (Ghost pill) */}
            <button
              onClick={() => {
                if (!currentUser?.isPremium) {
                  onUpgradePremium?.();
                  return;
                }
                setShowAiPriorityModal(true);
                fetchAiPriority();
              }}
              title={locale === 'vi' ? 'Ưu tiên do AI đề xuất' : 'AI Priority Suggestions'}
              className="h-7.5 px-2 sm:px-2.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-sky-300 hover:bg-blue-50/80 dark:hover:bg-sky-500/15 cursor-pointer flex items-center gap-1.5 transition-colors border border-transparent hover:border-blue-200/50 dark:hover:border-sky-500/30 shrink-0"
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">{locale === 'vi' ? 'Gợi ý AI' : 'AI Priority'}</span>
            </button>

            {/* Pomodoro Focus indicator */}
            {isFocusActive && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-rose-50/80 dark:bg-rose-950/30 text-rose-600 rounded-lg text-xs font-bold">
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
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Kiểu khớp</span>
                <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                  <button 
                    onClick={() => setFilterConjunction('AND')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded ${filterConjunction === 'AND' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-3xs' : 'text-slate-500'}`}
                  >
                    VÀ
                  </button>
                  <button 
                    onClick={() => setFilterConjunction('OR')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded ${filterConjunction === 'OR' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-3xs' : 'text-slate-500'}`}
                  >
                    HOẶC
                  </button>
                </div>
                <span className="text-[10.5px] text-slate-550 dark:text-slate-400">công việc khớp các quy tắc:</span>
              </div>

              {/* Presets manager */}
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Lưu bộ lọc hiện tại với tên..." 
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
                  Lưu bộ lọc mẫu
                </button>
              </div>
            </div>

            {/* Presets List */}
            {filterPresets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Bộ lọc mẫu đã lưu:</span>
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
                  <Select
                    value={cond.field}
                    onChange={v => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, field: v, operator: 'is', value: '' } : c))}
                    options={[
                      { value: 'title', label: 'Tên công việc' },
                      { value: 'status', label: 'Trạng thái' },
                      { value: 'priority', label: 'Mức ưu tiên' },
                      { value: 'assignee', label: 'Người phụ trách' },
                      ...customFields.map(field => ({ value: 'custom:' + field.name, label: field.name }))
                    ]}
                    size="sm"
                    className="w-36"
                    ariaLabel="Thuộc tính lọc"
                  />

                  {/* Operator Dropdown */}
                  <Select
                    value={cond.operator}
                    onChange={v => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, operator: v as any } : c))}
                    options={[
                      { value: 'is', label: 'là' },
                      { value: 'isNot', label: 'không phải' },
                      { value: 'contains', label: 'có chứa' },
                      { value: 'isEmpty', label: 'đang trống' },
                      ...(cond.field.startsWith('custom:') ? [{ value: 'isNotEmpty', label: 'đã có giá trị' }, { value: 'gt', label: 'lớn hơn' }, { value: 'lt', label: 'nhỏ hơn' }] : [])
                    ]}
                    size="sm"
                    className="w-32"
                    ariaLabel="Toán tử lọc"
                  />

                  {/* Value Picker */}
                  {cond.operator !== 'isEmpty' && (() => {
                    if (cond.field === 'status') {
                      return (
                        <Select
                          value={cond.value}
                          onChange={v => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: v } : c))}
                          options={[
                            { value: 'todo', label: 'Cần làm' },
                            { value: 'inprogress', label: 'Đang thực hiện' },
                            { value: 'review', label: 'Đang duyệt' },
                            { value: 'completed', label: 'Hoàn thành' }
                          ]}
                          size="sm"
                          className="w-40"
                          placeholder="Chọn trạng thái..."
                          ariaLabel="Giá trị trạng thái"
                        />
                      );
                    }
                    if (cond.field === 'priority') {
                      return (
                        <Select
                          value={cond.value}
                          onChange={v => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: v } : c))}
                          options={[
                            { value: 'low', label: 'Thấp' },
                            { value: 'medium', label: 'Trung bình' },
                            { value: 'high', label: 'Cao' },
                            { value: 'urgent', label: 'Khẩn cấp' }
                          ]}
                          size="sm"
                          className="w-40"
                          placeholder="Chọn mức ưu tiên..."
                          ariaLabel="Giá trị mức ưu tiên"
                        />
                      );
                    }
                    if (cond.field === 'assignee') {
                      return (
                        <Select
                          value={cond.value}
                          onChange={v => setFilterConditions(prev => prev.map(c => c.id === cond.id ? { ...c, value: v } : c))}
                          options={[{ value: 'user', label: 'Tôi' }, ...members.map(m => ({ value: m.id, label: m.name }))]}
                          size="sm"
                          className="w-40"
                          placeholder="Chọn thành viên..."
                          ariaLabel="Giá trị người phụ trách"
                        />
                      );
                    }
                    return (
                      <input 
                        type="text" 
                        placeholder="Nhập giá trị văn bản..." 
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
                    title="Xóa điều kiện"
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
                + Thêm quy tắc
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
                Đặt lại bộ lọc
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Module Rendering Body Section ── */}
      <section className={`apexa-space-content flex-1 select-none scrollbar-none bg-white dark:bg-[var(--cu-bg)] flex flex-col ${activeView === 'board' ? 'overflow-hidden min-h-0' : 'overflow-y-auto'}`} aria-label="Không gian làm việc" data-view={activeView}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full h-full flex flex-col flex-1 ${activeView === 'board' ? 'overflow-hidden min-h-0' : ''}`}
          >
            {/* Render Overview Dashboard */}
            {activeView === 'overview' && (
          <SpaceOverviewTab 
            space={activeSpace}
            tasks={tasks}
            members={members}
            docs={allDocs}
            activeFolderId={activeFolderId}
            onUpdateSpaceEmoji={(newEmoji) => updateSpaceProperties(activeSpace.id, { emoji: newEmoji }, 'Đã cập nhật biểu tượng không gian.')}
            onUpdateBookmarks={(bookmarks) => {
              const currentPreferences = activeSpace.clickApps?.spacePreferences || {};
              const nextPreferences = activeFolderId
                ? {
                    ...currentPreferences,
                    folderBookmarks: {
                      ...(currentPreferences.folderBookmarks || {}),
                      [activeFolderId]: bookmarks,
                    },
                  }
                : { ...currentPreferences, bookmarks };
              updateSpaceProperties(activeSpace.id, {
                clickApps: {
                  ...(activeSpace.clickApps || {}),
                  spacePreferences: nextPreferences,
                },
              });
            }}
            onOpenList={(listId) => {
              if (setActiveListId) setActiveListId(listId);
              setActiveView('table');
            }}
            onBrowseTasks={(focus) => {
              setTaskFocus(focus);
              setActiveView('list');
            }}
            onAddList={() => onAddListSpace?.(activeSpace.id)}
            onAddTask={guardedAddTask}
            triggerToast={triggerToast}
            onAddFolder={() => {
              setFolderModalState({
                isOpen: true,
                spaceId: activeSpace.id,
                initialName: '',
                isSprintMode: false,
                editingFolderId: null,
              });
            }}
            onAddDoc={() => {
              openPromptModal({
                type: 'doc',
                title: 'Tạo tài liệu mới',
                subtitle: `Trong không gian: ${activeSpace.name}`,
                placeholder: 'Nhập tiêu đề tài liệu...',
                confirmText: 'Tạo tài liệu',
                onConfirm: (title) => {
                  if (title?.trim() && onAddDocToSpace) {
                    onAddDocToSpace(activeSpace.id, title.trim(), activeFolderId || undefined);
                  }
                }
              });
            }}
            onOpenDoc={(docId) => {
              setInitialSpaceDocId(docId);
              setActiveView('doc');
            }}
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
            onUpdateTask={guardedUpdateTask}
            onDeleteTask={guardedDeleteTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            isSmartSort={isSmartSort}
            isUrgentNearDueTask={isUrgentNearDueTask}
            isMultiSelectMode={isMultiSelectMode}
            onAddTask={guardedAddTask}
            setViewType={setActiveView as any}
            openPromptModal={openPromptModal}
            openDialog={triggerConfirm}
            spaces={spaces}
            wrapText={wrapText}
            showEmptyStatuses={showEmptyStatuses}
            onToggleShowEmptyStatuses={setShowEmptyStatuses}
            customFields={customFields}
            visibleFields={visibleFields}
            onReorderTasks={(orderedIds) => {
              if (onUpdateTaskOrder && activeWorkspaceId) {
                onUpdateTaskOrder(activeWorkspaceId, orderedIds);
              }
              orderedIds.forEach((id, idx) => {
                const t = tasks.find(item => item.id === id);
                if (t && t.position !== idx) {
                  guardedUpdateTask({ ...t, position: idx });
                }
              });
            }}
          />
        )}

        {/* Render Kanban Board View */}
        {activeView === 'board' && (
          <TaskBoardView 
            customFields={customFields.filter(field => visibleFields.includes(field.name))}
            filteredTasks={filteredTasks}
            members={members}
            workspaces={allWorkspaces || []}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={guardedUpdateTask}
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
            onAddTask={guardedAddTask}
            hideHeaderControls={true}
            showEmptyStatuses={showEmptyStatuses}
          />
        )}

        {/* Render Table View */}
        {activeView === 'table' && (
          <TaskTableView 
            filteredTasks={filteredTasks}
            totalTaskCount={scopedTasks.length}
            isSearchingOrFiltering={Boolean(searchQuery.trim() || activeFilterCount > 0 || myTasksOnly || taskFocus !== 'all')}
            members={members}
            workspaces={allWorkspaces || []}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={guardedUpdateTask}
            onAddTask={guardedAddTask}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            visibleFields={visibleFields}
            customFields={customFields}
            onOpenFieldsPanel={openFieldsPanel}
            setVisibleFields={setVisibleFields}
            setCustomFields={persistCustomFields}
            openDialog={triggerConfirm}
            openPromptModal={openPromptModal}
            wrapText={wrapText}
            showEmptyStatuses={showEmptyStatuses}
          />
        )}

        {/* Render Gantt Chart & Timeline View */}
        {(activeView === 'gantt' || activeView === 'timeline') && (
          <TaskGanttView 
            filteredTasks={filteredTasks}
            members={members}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            setSelectedTask={setSelectedTask}
            onUpdateTask={guardedUpdateTask}
            onAddTask={guardedAddTask}
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
            onAddTask={guardedAddTask}
            onUpdateTask={guardedUpdateTask}
            onDeleteTask={guardedDeleteTask}
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            activeListId={activeListId}
          />
        )}

        {/* Integrate Whiteboard Module */}
        {activeView === 'whiteboard' && (
          <Whiteboard 
            members={members}
            isOffline={isOffline}
            onAddSyncLog={onAddSyncLog}
            whiteboardId={activeSpaceId || ''}
            onAddTask={guardedAddTask}
            tasks={filteredTasks}
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


        {/* Activity Feed View */}
        {activeView === 'activity' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span>Dòng hoạt động</span>
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
                  Chưa ghi nhận hoạt động nào.
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
              <span>Năng lực công việc</span>
            </h3>
            <div className="space-y-4">
              {members.map(member => {
                const memberTasks = filteredTasks.filter(t => t.assigneeId === member.id || t.assigneeIds?.includes(member.id));
                const assignedHours = memberTasks.reduce((sum, task) => sum + Math.max(0, task.hoursEstimate || 0), 0);
                const capacityPct = Math.min(100, Math.round(((assignedHours || memberTasks.length * 8) / 40) * 100));
                return (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{member.name}</span>
                      <span className="text-slate-400 font-semibold">{memberTasks.length} công việc · {assignedHours || memberTasks.length * 8}h / 40h</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-6">
            {/* Mindmap header & toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-pink-500" />
                  <span>{locale === 'vi' ? 'Sơ đồ tư duy công việc (Mindmap)' : 'Task Mindmap Tree'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {locale === 'vi'
                    ? 'Trực quan hóa cấu trúc dự án từ Không gian → Danh sách → Công việc theo sơ đồ phân nhánh tương tác.'
                    : 'Visualize project hierarchy from Space → Lists → Tasks with interactive branching.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMindmapZoom(z => Math.max(60, z - 10))}
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    title={locale === 'vi' ? 'Thu nhỏ' : 'Zoom out'}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-[11px] font-bold text-slate-500 tabular-nums">{mindmapZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setMindmapZoom(z => Math.min(150, z + 10))}
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    title={locale === 'vi' ? 'Phóng to' : 'Zoom in'}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMindmapZoom(100)}
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all cursor-pointer ml-0.5"
                    title={locale === 'vi' ? 'Đặt lại kích thước' : 'Reset zoom'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expand / Collapse All */}
                <button
                  type="button"
                  onClick={() => {
                    const allCollapsed = activeSpace.lists.every(l => mindmapCollapsedLists[l.id]);
                    const next: Record<string, boolean> = {};
                    if (!allCollapsed) {
                      activeSpace.lists.forEach(l => { next[l.id] = true; });
                    }
                    setMindmapCollapsedLists(next);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {activeSpace.lists.every(l => mindmapCollapsedLists[l.id])
                    ? (locale === 'vi' ? 'Mở rộng tất cả' : 'Expand all')
                    : (locale === 'vi' ? 'Thu gọn tất cả' : 'Collapse all')}
                </button>
              </div>
            </div>

            {/* Mindmap Interactive Tree Canvas */}
            {(() => {
              const totalTasksCount = filteredTasks.length;
              const completedTasksCount = filteredTasks.filter(t => t.status === 'completed').length;
              const spaceProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

              return (
                <div className="overflow-x-auto overflow-y-auto max-h-[750px] p-6 bg-slate-50/40 dark:bg-slate-950/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 select-none">
                  <div 
                    className="min-w-max flex items-center gap-12 transition-transform duration-200 origin-top-left py-6 px-2"
                    style={{ transform: `scale(${mindmapZoom / 100})` }}
                  >
                    {/* ROOT: Space Node */}
                    <div className="relative shrink-0">
                      <div className="w-64 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white p-4 rounded-2xl shadow-md border border-indigo-400/30 flex flex-col gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg shrink-0">
                            {renderSpaceIcon((activeSpace as any).icon || activeSpace.emoji, "w-5 h-5 text-white")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] uppercase font-black tracking-wider text-indigo-200 block">
                              {locale === 'vi' ? 'Không gian' : 'Space'}
                            </span>
                            <h4 className="text-sm font-black truncate text-white">{activeSpace.name}</h4>
                          </div>
                        </div>

                        {/* Space Stats */}
                        <div className="pt-2 border-t border-white/15 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between text-indigo-100 font-semibold">
                            <span>{completedTasksCount}/{totalTasksCount} {locale === 'vi' ? 'hoàn thành' : 'done'}</span>
                            <span className="font-bold tabular-nums">{spaceProgressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-black/25 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${spaceProgressPercent}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Right connector pill */}
                      <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-7 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10.5px] font-bold text-white shadow-sm z-10" title={`${activeSpace.lists.length} ${locale === 'vi' ? 'danh sách' : 'lists'}`}>
                        {activeSpace.lists.length}
                      </div>
                    </div>

                    {/* STEM & BRANCHES (Lists) */}
                    <div className="flex flex-col gap-6 relative">
                      {activeSpace.lists.map((list) => {
                        const listTasks = filteredTasks.filter(task => task.listId === list.id);
                        const isCollapsed = mindmapCollapsedLists[list.id];
                        const listCompleted = listTasks.filter(t => t.status === 'completed').length;
                        const listPercent = listTasks.length > 0 ? Math.round((listCompleted / listTasks.length) * 100) : 0;

                        return (
                          <div key={list.id} className="flex items-center gap-8 relative">
                            {/* Branch connector line from root */}
                            <div className="w-8 h-0.5 bg-indigo-200 dark:bg-indigo-900/60 shrink-0" />

                            {/* LIST NODE */}
                            <div className="w-60 shrink-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: (list as any).color || '#6366f1' }} />
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate" title={list.name}>
                                    {list.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                    {listTasks.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setMindmapCollapsedLists(prev => ({ ...prev, [list.id]: !prev[list.id] }))}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    title={isCollapsed ? (locale === 'vi' ? 'Mở rộng' : 'Expand') : (locale === 'vi' ? 'Thu gọn' : 'Collapse')}
                                  >
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Mini progress bar */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${listPercent}%` }} />
                                </div>
                                <span className="font-semibold tabular-nums">{listPercent}%</span>
                              </div>

                              {/* Quick add task button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (openPromptModal) {
                                    openPromptModal({
                                      type: 'task',
                                      title: locale === 'vi' ? 'Thêm công việc vào danh sách' : 'Add task to list',
                                      subtitle: `${list.name}`,
                                      placeholder: locale === 'vi' ? 'Nhập tên công việc...' : 'Enter task title...',
                                      confirmText: locale === 'vi' ? 'Tạo việc' : 'Create',
                                      onConfirm: (val: string) => {
                                        if (val?.trim()) {
                                          guardedAddTask({
                                            title: val.trim(),
                                            description: '',
                                            subtasks: [],
                                            status: 'todo',
                                            priority: 'medium',
                                            listId: list.id,
                                            spaceId: activeSpace.id,
                                            workspaceId: activeWorkspaceId || activeSpace.workspaceId
                                          });
                                        }
                                      }
                                    });
                                  }
                                }}
                                className="w-full text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{locale === 'vi' ? 'Thêm việc' : 'Add task'}</span>
                              </button>
                            </div>

                            {/* LEAF NODES: Tasks */}
                            {!isCollapsed && (
                              <div className="flex items-center gap-6">
                                <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-800 shrink-0" />

                                <div className="flex flex-col gap-2 min-w-[240px] max-w-sm">
                                  {listTasks.length === 0 ? (
                                    <div className="p-3 bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                                      <span className="text-[11px] italic text-slate-400">
                                        {locale === 'vi' ? 'Chưa có công việc nào' : 'No tasks in this list'}
                                      </span>
                                    </div>
                                  ) : (
                                    listTasks.map(task => {
                                      const statusColor = task.status === 'completed' ? 'bg-emerald-500'
                                        : task.status === 'review' ? 'bg-cyan-500'
                                        : task.status === 'inprogress' ? 'bg-amber-500' : 'bg-slate-400';
                                      const priorityColor = task.priority === 'urgent' ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30'
                                        : task.priority === 'high' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/30'
                                        : 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50';
                                      const assignee = members.find(m => m.id === (task.assigneeIds?.[0] || task.assigneeId));
                                      return (
                                        <div
                                          key={task.id}
                                          onClick={() => setSelectedTask(task)}
                                          className="group bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-2.5 shadow-3xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                                            <span className={`text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                                              {task.title}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {task.priority && (
                                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${priorityColor}`}>
                                                {task.priority}
                                              </span>
                                            )}
                                            {assignee && (
                                              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] flex items-center justify-center" title={assignee.name}>
                                                {assignee.name.slice(0, 1).toUpperCase()}
                                              </div>
                                            )}
                                            {task.dueDate && (
                                              <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                {task.dueDate.slice(5)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Form Survey & Task Submission View */}
        {activeView === 'form' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-left max-w-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <span>Biểu mẫu thu thập công việc & Khảo sát</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mỗi lượt gửi từ biểu mẫu này sẽ tự động tạo một công việc mới vào danh sách hiện tại.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePublishForm}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sao chép link biểu mẫu</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  Tiêu đề yêu cầu công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTaskTitle}
                  onChange={(e) => setFormTaskTitle(e.target.value)}
                  placeholder="Ví dụ: Thiết kế trang đăng nhập mới hoặc Sửa lỗi xuất hóa đơn"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  Mô tả chi tiết yêu cầu
                </label>
                <textarea
                  rows={3}
                  value={formTaskDesc}
                  onChange={(e) => setFormTaskDesc(e.target.value)}
                  placeholder="Nhập thông tin chi tiết, liên kết tài liệu hoặc hướng dẫn thực hiện..."
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                    Mức độ ưu tiên
                  </label>
                  <Select<string>
                    value={formTaskPriority}
                    onChange={v => setFormTaskPriority(v as Priority)}
                    options={[
                      { value: 'urgent', label: 'Khẩn cấp (Urgent)' },
                      { value: 'high', label: 'Cao (High)' },
                      { value: 'normal', label: 'Bình thường (Normal)' },
                      { value: 'low', label: 'Thấp (Low)' }
                    ]}
                    className="w-full"
                    ariaLabel="Mức độ ưu tiên"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                    Người phụ trách
                  </label>
                  <Select
                    value={formTaskAssigneeId}
                    onChange={v => setFormTaskAssigneeId(v)}
                    options={[{ value: '', label: 'Chưa chỉ định (Unassigned)' }, ...members.map(m => ({ value: m.id, label: m.name }))]}
                    className="w-full"
                    ariaLabel="Người phụ trách"
                    menuWidth={260}
                  />
                </div>
              </div>

              {/* Dynamic Space Custom Fields in Form */}
              {customFields && customFields.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {locale === 'vi' ? 'Thông tin bổ sung (Trường tùy chỉnh)' : 'Additional Custom Fields'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customFields.map(field => {
                      const val = formCustomValues[field.name] ?? '';
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                            {field.name}
                            {field.isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          {field.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 cursor-pointer mt-1 select-none">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={e => setFormCustomValues(prev => ({ ...prev, [field.name]: e.target.checked }))}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {locale === 'vi' ? 'Bật / Kích hoạt' : 'Enable / Yes'}
                              </span>
                            </label>
                          ) : field.type === 'dropdown' ? (
                            <select
                              value={String(val)}
                              onChange={e => setFormCustomValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            >
                              <option value="">{locale === 'vi' ? '-- Chọn lựa chọn --' : '-- Select option --'}</option>
                              {((field.options || []) as any[]).map((opt: any) => {
                                const optLabel = typeof opt === 'string' ? opt : opt?.label || String(opt);
                                return <option key={optLabel} value={optLabel}>{optLabel}</option>;
                              })}
                            </select>
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={String(val)}
                              onChange={e => setFormCustomValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                          ) : (field.type === 'number' || field.type === 'money' || field.type === 'progress' || field.type === 'rating') ? (
                            <input
                              type="number"
                              value={val}
                              placeholder={field.type === 'money' ? (field.currencySymbol || '₫') : field.type === 'progress' ? '0-100%' : '0'}
                              onChange={e => setFormCustomValues(prev => ({ ...prev, [field.name]: e.target.value === '' ? '' : Number(e.target.value) }))}
                              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(val)}
                              onChange={e => setFormCustomValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                              placeholder={`${field.name}...`}
                              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gửi biểu mẫu & Tạo công việc</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Map View */}
        {activeView === 'map' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-amber-600" />
              <span>Chế độ bản đồ vị trí công việc</span>
            </h3>
            {(() => {
              const locationKeys = ['location', 'địa điểm', 'địa chỉ', 'chi nhánh', 'address'];
              const locatedTasks = filteredTasks.map(task => {
                const fieldEntry = Object.entries(task.custom_fields || {}).find(([key, value]) =>
                  locationKeys.some(locationKey => key.toLowerCase().includes(locationKey)) && String(value || '').trim()
                );
                return fieldEntry ? { task, location: String(fieldEntry[1]) } : null;
              }).filter(Boolean) as Array<{ task: Task; location: string }>;

              if (locatedTasks.length === 0) {
                return (
                  <div className="min-h-56 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center dark:border-slate-800 dark:bg-slate-950/40">
                    <MapIcon className="mx-auto h-7 w-7 text-amber-500" />
                    <p className="mt-3 text-xs font-extrabold text-slate-700 dark:text-slate-200">Chưa có dữ liệu vị trí</p>
                    <p className="mx-auto mt-1 max-w-md text-[10px] font-medium leading-relaxed text-slate-400">Tạo trường tùy chỉnh “Địa điểm”, “Địa chỉ” hoặc “Chi nhánh” và nhập giá trị cho công việc. View này sẽ tự động nhóm và mở nhanh từng task theo vị trí.</p>
                    <button type="button" onClick={openFieldsPanel} className="mt-4 rounded-xl bg-indigo-600 px-3.5 py-2 text-[10px] font-black text-white hover:bg-indigo-700">Tạo trường vị trí</button>
                  </div>
                );
              }

              const groups = Array.from(new Set(locatedTasks.map(item => item.location)));
              return (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {groups.map(location => (
                    <div key={location} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100"><MapIcon className="h-4 w-4 text-amber-500" />{location}</div>
                      <div className="mt-3 space-y-1.5">
                        {locatedTasks.filter(item => item.location === location).map(({ task }) => (
                          <button key={task.id} type="button" onClick={() => setSelectedTask(task)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2 text-left text-[10px] font-bold text-slate-650 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300">
                            <span className="truncate">{task.title}</span><ChevronRight className="h-3 w-3 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Create with AI View */}
        {activeView === 'ai' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-5 text-left max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Trình tạo quy trình & công việc bằng Costack AI
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mô tả mục tiêu của bạn, Costack AI sẽ tự động phân tích và sinh danh sách các công việc cụ thể vào Space.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mô tả yêu cầu cần AI hỗ trợ tạo
                </label>
                <textarea
                  rows={3}
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  placeholder="Ví dụ: Lập kế hoạch ra mắt tính năng thanh toán trực tuyến gồm 5 giai đoạn, phân bổ độ ưu tiên và ước tính thời gian..."
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-xs font-semibold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-all"
                />
              </div>

              {/* Sample Suggestion Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Kế hoạch ra mắt sản phẩm mới (Product Launch)',
                  'Chiến dịch quảng cáo số quý 3 (Digital Marketing)',
                  'Thiết kế giao diện người dùng Mobile App (UI/UX)',
                  'Quy trình onboarding nhân viên mới (HR Onboarding)'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAiPromptInput(chip)}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-bold border border-slate-200/60 dark:border-slate-750 transition-colors cursor-pointer"
                  >
                    ✨ {chip}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!aiPromptInput.trim() || isAiGeneratingTasks}
                  onClick={handleAiGenerateTasks}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: isAiGeneratingTasks ? '1s' : '0s' }} />
                  <span>{isAiGeneratingTasks ? 'Costack AI đang tạo công việc...' : 'Tạo công việc ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Task Detail Drawer Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailsPanel 
            task={selectedTask}
            members={members}
            currentUser={currentUser}
            workspaces={allWorkspaces || []}
            spaces={spaces}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={(t) => {
              guardedUpdateTask(t);
              if (activeViewProtectedRef.current) return;
              setSelectedTask(t);
            }}
            onCreateTask={guardedAddTask}
            onDeleteTask={(id) => {
              guardedDeleteTask(id);
              if (activeViewProtectedRef.current) return;
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
            onOpenFieldsPanel={openFieldsPanel}
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

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/92 dark:bg-[#08090d]/92 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 shadow-[0_18px_48px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)] max-w-[95vw] overflow-x-auto scrollbar-none select-none text-xs card-bevel-edge ring-1 ring-black/5 dark:ring-white/[0.08]"
          >
            {/* Selection Count */}
            <div className="flex items-center gap-1.5 pl-0.5 pr-1.5 shrink-0">
              <span className="w-5 h-5 rounded-md bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[10.5px] font-black flex items-center justify-center shadow-xs">
                {selectedTaskIds.length}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {t('selected') ? t('selected').replace('{count}', '') : 'đã chọn'}
              </span>
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />

            {/* Primary Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleBulkComplete}
                className="px-2.5 py-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors tactile-press shrink-0"
                title={t('markComplete') || "Hoàn thành"}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">{t('markComplete') || 'Hoàn thành'}</span>
              </button>

              <button
                onClick={handleBulkDuplicate}
                className="px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors tactile-press shrink-0"
                title={t('duplicate') || "Nhân bản"}
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('duplicate') || 'Nhân bản'}</span>
              </button>

              <button
                onClick={() => {
                  const initSpId = activeSpaceId || spaces[0]?.id || '';
                  setBulkMoveSpaceId(initSpId);
                  const sp = spaces.find(s => s.id === initSpId);
                  setBulkMoveListId(activeListId || sp?.lists?.[0]?.id || '');
                  setShowBulkMoveModal(true);
                }}
                className="px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors tactile-press shrink-0"
                title={t('moveTo') || "Di chuyển"}
              >
                <FolderInput className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="hidden sm:inline">{t('moveTo') || 'Di chuyển'}</span>
              </button>
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />

            {/* Attribute Selects */}
            <div className="flex items-center gap-1 shrink-0">
              <BulkStatusSelect onChange={handleBulkStatusChange} />
              <BulkAssigneeSelect 
                members={members.filter(m => !activeWorkspaceId || m.workspaceIds?.includes(activeWorkspaceId))}
                onChange={handleBulkAssigneeChange} 
              />
              <BulkPrioritySelect onChange={handleBulkPriorityChange} />
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />

            {/* Delete */}
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 tactile-press"
              title={t('deleteSelected') || "Xóa"}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('delete') || "Xóa"}</span>
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setSelectedTaskIds([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer transition-colors shrink-0 tactile-press"
              title={t('deselectAll') || "Bỏ chọn"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 max-w-md w-full space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FolderInput className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Di chuyển {selectedTaskIds.length} công việc
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chọn không gian và danh sách bạn muốn di chuyển đến
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Không gian làm việc đích
                </label>
                <select
                  value={bulkMoveSpaceId}
                  onChange={(e) => {
                    const nextSpId = e.target.value;
                    setBulkMoveSpaceId(nextSpId);
                    const sp = spaces.find(s => s.id === nextSpId);
                    setBulkMoveListId(sp?.lists?.[0]?.id || '');
                  }}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {spaces && spaces.length > 0 ? (
                    spaces.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  ) : (
                    <option value="">Không có không gian làm việc</option>
                  )}
                </select>
              </div>

              {(() => {
                const targetSp = spaces?.find(s => s.id === bulkMoveSpaceId);
                if (!targetSp || !targetSp.lists || targetSp.lists.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Danh sách đích
                    </label>
                    <select
                      value={bulkMoveListId}
                      onChange={(e) => setBulkMoveListId(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Không chọn danh sách (Toàn không gian) --</option>
                      {targetSp.lists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleBulkMove(bulkMoveSpaceId, bulkMoveListId)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Xác nhận di chuyển
              </button>
            </div>
          </div>
        </div>
      )}

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
              <span className="text-xs font-semibold">Đã áp dụng thao tác hàng loạt.</span>
              <button
                onClick={handleUndoBulkAction}
                className="text-xs font-black text-indigo-400 hover:text-indigo-350 flex items-center gap-1 cursor-pointer"
              >
                <span>Hoàn tác</span>
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

      {/* Modern High-End Task Create Dialog Modal */}
      <TaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (taskData) => {
          if (activeViewProtectedRef.current) throw new Error('Chế độ xem đã khóa. Hãy mở khóa trước khi tạo công việc.');
          await guardedAddTask({
            ...taskData,
            isPinned: taskData.isPinned ?? false,
          });
          (window as any).playSystemSound?.('success');
        }}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        activeListId={activeListId}
        members={members}
        customFields={customFields}
        activeWorkspaceId={activeWorkspaceId}
        allTasks={tasks}
        triggerToast={triggerToast}
      />

      {/* AI Urgency Suggestion Modal */}
      {showAiPriorityModal && (
        <div className="fixed inset-0 z-[140] bg-slate-950/70 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowAiPriorityModal(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between shrink-0 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Costack AI Triage</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                      Gemini 2.5
                    </span>
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    Phân tích deadline, độ phức tạp và đề xuất mức độ ưu tiên tối ưu
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAiPriorityModal(false)} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingAiPriority ? (
              <div className="text-center py-14 space-y-3 my-auto">
                <RefreshCw className="w-9 h-9 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-700 dark:text-slate-200 font-bold">Costack AI đang phân tích toàn bộ công việc...</p>
                <p className="text-[11px] text-slate-400">Đối chiếu hạn chót, mô tả, độ phức tạp và tính phụ thuộc</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 text-xs">
                {/* Strategic General Summary Banner */}
                {aiSuggestions?.generalSummary && (
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-black text-xs">
                      <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Chiến lược hành động đề xuất</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {aiSuggestions.generalSummary}
                    </p>
                  </div>
                )}

                {/* Suggestions List Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Đề xuất ưu tiên ({aiSuggestions?.suggestions?.length || 0} việc)
                    </h4>
                    {aiSuggestions?.suggestions && aiSuggestions.suggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          let appliedCount = 0;
                          aiSuggestions.suggestions.forEach(item => {
                            const targetTask = tasks.find(t => t.id === item.taskId);
                            if (targetTask) {
                              const normalizedPrio = item.suggestedPriority.toLowerCase() as Priority;
                              guardedUpdateTask({ ...targetTask, priority: normalizedPrio });
                              appliedCount++;
                            }
                          });
                          onAddSyncLog(`Applied AI priority triage to ${appliedCount} tasks`);
                          triggerToast?.('success', 'Đã áp dụng toàn bộ ưu tiên AI', `Cập nhật độ ưu tiên cho ${appliedCount} công việc.`);
                          setShowAiPriorityModal(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Áp dụng tất cả</span>
                      </button>
                    )}
                  </div>

                  {(!aiSuggestions?.suggestions || aiSuggestions.suggestions.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 font-medium bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      Không có công việc nào cần đề xuất lại mức ưu tiên.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aiSuggestions.suggestions.map((item) => {
                        const targetTask = tasks.find(t => t.id === item.taskId);
                        const normalizedPrio = item.suggestedPriority.toLowerCase() as Priority;
                        
                        const prioColors: Record<string, string> = {
                          urgent: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400',
                          high: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400',
                          medium: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400',
                          low: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        };

                        const diffColors: Record<string, string> = {
                          'Cực kỳ khó': 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200',
                          'Khó': 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200',
                          'Trung bình': 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200',
                          'Dễ': 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200'
                        };

                        const isAlreadyApplied = targetTask?.priority === normalizedPrio;

                        return (
                          <div 
                            key={item.taskId}
                            className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (targetTask) {
                                      setSelectedTask(targetTask);
                                      setShowAiPriorityModal(false);
                                    }
                                  }}
                                  className="text-left font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 cursor-pointer"
                                  title="Mở chi tiết công việc"
                                >
                                  {item.taskTitle}
                                </button>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${diffColors[item.estimatedDifficulty] || 'bg-slate-100 text-slate-600'}`}>
                                    {item.estimatedDifficulty}
                                  </span>
                                  {item.reasoningScore !== undefined && (
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      Điểm khẩn: <strong className="text-slate-600 dark:text-slate-300">{item.reasoningScore}/100</strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Đề xuất</div>
                                  <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${prioColors[normalizedPrio] || prioColors.medium}`}>
                                    {item.suggestedPriority}
                                  </span>
                                </div>

                                {targetTask && (
                                  <button
                                    type="button"
                                    disabled={isAlreadyApplied}
                                    onClick={() => {
                                      guardedUpdateTask({ ...targetTask, priority: normalizedPrio });
                                      onAddSyncLog(`Updated priority of "${targetTask.title}" to ${normalizedPrio} (AI)`);
                                      triggerToast?.('success', 'Đã cập nhật ưu tiên', `"${targetTask.title}" → ${item.suggestedPriority}`);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isAlreadyApplied 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800/40'
                                    }`}
                                  >
                                    {isAlreadyApplied ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Đã nhận</span>
                                      </>
                                    ) : (
                                      <span>Áp dụng</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {item.analysis && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                                {item.analysis}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
            className="fixed w-[240px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] z-50 text-left font-sans select-none overflow-hidden p-1.5 text-xs animate-fadeIn text-slate-700 dark:text-zinc-200 space-y-0.5"
          >
            {/* Favorite */}
            <button 
              onClick={() => {
                updateViewSetting(viewContextMenu.tabId, 'pin', true);
                setViewContextMenu(prev => ({ ...prev, show: false }));
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Yêu thích</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Rename */}
            <button 
              onClick={() => {
                const targetTab = staticTabs.find(t => t.id === viewContextMenu.tabId);
                const currentLabel = targetTab?.label || '';
                setViewContextMenu(prev => ({ ...prev, show: false }));
                openPromptModal({
                  type: 'rename',
                  title: 'Đổi tên chế độ xem',
                  defaultValue: currentLabel,
                  placeholder: 'Nhập tên chế độ xem mới...',
                  confirmText: 'Lưu thay đổi',
                  onConfirm: (newName) => {
                    if (newName?.trim()) {
                      setStaticTabs(prev => prev.map(t => t.id === viewContextMenu.tabId ? { ...t, label: newName.trim() } : t));
                      triggerToast?.('success', 'Đổi tên', `Đã cập nhật tên chế độ xem thành "${newName.trim()}".`);
                    }
                  }
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>Đổi tên</span>
            </button>

            {/* Copy link to view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                const url = new URL(window.location.origin);
                url.searchParams.set('space', activeSpace.id);
                if (activeListId) url.searchParams.set('list', activeListId);
                url.searchParams.set('view', activeView);
                navigator.clipboard.writeText(url.toString());
                triggerToast?.('success', 'Sao chép liên kết', 'Đã sao chép liên kết trực tiếp tới chế độ xem này.');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Sao chép liên kết chế độ xem</span>
            </button>

            {/* Customize view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                openFieldsPanel();
                triggerToast?.('info', 'Tùy chỉnh', 'Đã mở bảng tùy chỉnh trường và hiển thị cột.');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <Cog className="w-3.5 h-3.5 text-slate-400" />
              <span>Tùy chỉnh chế độ xem</span>
            </button>

            <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

            {/* Toggle Switches */}
            <div className="px-2.5 py-1 space-y-1.5">
              {[ 
                { label: 'Ghim chế độ xem', key: 'pin' },
                { label: 'Chế độ riêng tư', key: 'private' },
                { label: 'Khóa chỉnh sửa', key: 'protect' },
                { label: 'Tự động lưu thay đổi', key: 'autosave' },
                { label: 'Đặt làm mặc định', key: 'default' },
              ].map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-650 dark:text-zinc-300 font-bold">{toggle.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(staticTabs.find(tab => tab.id === viewContextMenu.tabId)?.settings[toggle.key as ViewSettingKey])}
                      onChange={event => updateViewSetting(viewContextMenu.tabId, toggle.key as ViewSettingKey, event.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

            {/* Export view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                handleExportViewData('csv');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <span>Xuất dữ liệu CSV</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Templates */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                setTemplatesModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <span>Thư viện Mẫu dự án</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Duplicate view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                const currentTab = staticTabs.find(t => t.id === viewContextMenu.tabId);
                if (currentTab) {
                  const newTab = {
                    ...currentTab,
                    id: `tab-${crypto.randomUUID()}`,
                    label: `${currentTab.label} (Bản sao)`,
                    settings: { ...currentTab.settings, default: false }
                  };
                  setStaticTabs(prev => [...prev, newTab]);
                  triggerToast?.('success', 'Nhân bản', `Đã nhân bản chế độ xem "${currentTab.label}".`);
                }
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer font-bold transition-colors"
            >
              <span>Nhân bản chế độ xem</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {/* Delete view */}
            <button 
              onClick={() => {
                setViewContextMenu(prev => ({ ...prev, show: false }));
                if (staticTabs.length <= 1) {
                  triggerToast?.('warning', 'Không thể xóa', 'Bạn phải giữ lại ít nhất một chế độ xem.');
                  return;
                }
                triggerConfirm({
                  title: 'Xóa chế độ xem',
                  description: 'Bạn có chắc chắn muốn xóa chế độ xem này? Hành động này không thể hoàn tác.',
                  onConfirm: () => {
                    setStaticTabs(prev => {
                      const remaining = prev.filter(t => t.id !== viewContextMenu.tabId);
                      if (viewContextMenu.tabId === activeTabId && remaining.length > 0) {
                        const fallback = remaining.find(tab => tab.settings.default) || remaining[0];
                        setActiveTabId(fallback.id);
                        setActiveView(fallback.viewId);
                      }
                      return remaining;
                    });
                    triggerToast?.('success', 'Đã xóa', 'Chế độ xem đã được xóa thành công.');
                  }
                });
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-50/80 dark:hover:bg-rose-950/30 text-left cursor-pointer font-bold text-rose-600 dark:text-rose-400 transition-colors"
            >
              <span>Xóa chế độ xem</span>
            </button>

            <div className="pt-1 border-t border-slate-100 dark:border-zinc-800 mt-1">
              <button 
                onClick={() => {
                  setViewContextMenu(prev => ({ ...prev, show: false }));
                  setSharingTargetType('space');
                  setSharingTargetId(activeSpace.id);
                  setSharingTargetName(activeSpace.name);
                  setSharingTargetIsPrivate(!!activeSpace.isPrivate);
                  setSharingTargetShareSettings(activeSpace.shareSettings || {});
                  setSharingModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-white/90" />
                <span>Chia sẻ và phân quyền</span>
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
            className="w-[280px] p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] z-50 text-left font-sans select-none animate-fadeIn max-h-[80vh] overflow-y-auto scrollbar-none space-y-0.5"
          >
            {/* Header: Tạo trong không gian */}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Plus className="w-3 h-3" />
                </div>
                <span className="font-bold text-[11px] text-slate-600 dark:text-zinc-305 uppercase tracking-wider">
                  Tạo trong không gian
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSpaceMenu(null)}
                className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {/* List */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddListSpace?.(activeSpaceMenu.id);
                  setActiveSpaceMenu(null);
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                  <List className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Danh sách</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Theo dõi công việc, dự án, thành viên và hơn thế nữa</p>
                </div>
              </button>

              {/* Folder */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const targetSpaceId = activeSpaceMenu.id;
                  setActiveSpaceMenu(null);
                  setFolderModalState({
                    isOpen: true,
                    spaceId: targetSpaceId,
                    initialName: '',
                    isSprintMode: false,
                    editingFolderId: null,
                  });
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Folder className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Thư mục</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Nhóm danh sách, tài liệu và nội dung khác</p>
                </div>
              </button>

              {/* Sprint Folder */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const targetSpaceId = activeSpaceMenu.id;
                  setActiveSpaceMenu(null);
                  setFolderModalState({
                    isOpen: true,
                    spaceId: targetSpaceId,
                    initialName: '',
                    isSprintMode: true,
                    editingFolderId: null,
                  });
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/60 dark:border-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Thư mục Sprint</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Quản lý chu kỳ và Sprint</p>
                </div>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

            {/* Section: DOCS & VIEWS */}
            <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tài liệu và chế độ xem</div>
            <div className="space-y-0.5">
              {/* Doc */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const targetSpaceId = activeSpaceMenu.id;
                  const targetSpace = spaces.find(s => s.id === targetSpaceId);
                  setActiveSpaceMenu(null);
                  openPromptModal({
                    type: 'doc',
                    title: 'Tạo tài liệu mới',
                    subtitle: targetSpace ? `Trong không gian: ${targetSpace.name}` : undefined,
                    placeholder: 'Nhập tiêu đề tài liệu...',
                    confirmText: 'Tạo tài liệu',
                    onConfirm: (title) => {
                      if (title?.trim() && onAddDocToSpace) {
                        onAddDocToSpace(targetSpaceId, title.trim());
                      }
                    }
                  });
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Tài liệu</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Cộng tác và ghi chép mọi nội dung</p>
                </div>
              </button>

              {/* Dashboard */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('overview');
                  setActiveSpaceMenu(null);
                  triggerToast?.('success', 'Bảng điều khiển', 'Đã chuyển sang chế độ xem tổng quan bảng điều khiển.');
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-pink-50 dark:bg-pink-950/50 border border-pink-200/60 dark:border-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Bảng điều khiển</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Theo dõi chỉ số và thông tin chuyên sâu</p>
                </div>
              </button>

              {/* Form */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('form');
                  setActiveSpaceMenu(null);
                  triggerToast?.('success', 'Biểu mẫu', 'Đã chuyển sang chế độ xem biểu mẫu thu thập công việc.');
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Biểu mẫu</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Thu thập, theo dõi và báo cáo dữ liệu</p>
                </div>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

            {/* Section: MORE */}
            <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Thêm</div>
            <div className="space-y-0.5">
              {/* Imports */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceMenu(null);
                  fileImportInputRef.current?.click();
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Nhập dữ liệu (CSV / JSON)</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Nhập công việc từ file CSV hoặc JSON</p>
                </div>
              </button>

              {/* Templates */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSpaceMenu(null);
                  setTemplatesModalOpen(true);
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer group transition-colors"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Mẫu có sẵn</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight mt-0.5">Tạo quy trình từ thư viện mẫu</p>
                </div>
              </button>
            </div>
          </div>
        </Portal>
      )}


      {activeSpaceSettings && (() => {
        const space = spaces.find(s => s.id === activeSpaceSettings.id);
        if (!space) return null;
        const isRenaming = inlineRenameSpaceId === space.id;

        const handleSaveRename = () => {
          if (inlineRenameSpaceName.trim()) {
            const updated = spaces.map(s => s.id === space.id ? { ...s, name: inlineRenameSpaceName.trim() } : s);
            onSaveSpaces?.(updated);
            onAddSyncLog(`Renamed Space "${space.name}" to "${inlineRenameSpaceName.trim()}"`);
            triggerToast?.('success', 'Đã đổi tên', `Đã cập nhật tên Space thành "${inlineRenameSpaceName.trim()}"`);
          }
          setInlineRenameSpaceId(null);
        };

        return (
          <Portal>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                setActiveSpaceSettings(null);
                setInlineRenameSpaceId(null);
              }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              transition={{ duration: 0.16, type: 'spring', stiffness: 420, damping: 28 }}
              style={{ 
                position: 'fixed', 
                top: Math.max(16, Math.min(activeSpaceSettings.y, typeof window !== 'undefined' ? window.innerHeight - 560 : activeSpaceSettings.y)), 
                left: Math.max(16, Math.min(activeSpaceSettings.x, typeof window !== 'undefined' ? window.innerWidth - 295 : activeSpaceSettings.x))
              }}
              className="w-[275px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] z-50 text-left font-sans select-none overflow-hidden text-xs p-2 space-y-0.5"
            >
              {/* Space Identity Banner / Quick Edit Header */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 mb-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <EmojiIconPicker
                      size="inline"
                      value={space.emoji || 'Folder'}
                      onChange={(newIcon) => updateSpaceProperties(space.id, { emoji: newIcon }, 'Đã cập nhật biểu tượng không gian.')}
                      title="Đổi biểu tượng không gian"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0 shadow-3xs hover:border-blue-500 hover:scale-105 transition-all cursor-pointer">
                        {renderSpaceIcon(space.emoji || 'Folder', "w-4 h-4")}
                      </div>
                    </EmojiIconPicker>
                    
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={inlineRenameSpaceName}
                            onChange={(e) => setInlineRenameSpaceName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename();
                              if (e.key === 'Escape') setInlineRenameSpaceId(null);
                            }}
                            className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500/40 shadow-3xs"
                            placeholder="Tên không gian..."
                          />
                          <button
                            type="button"
                            onClick={handleSaveRename}
                            className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shrink-0"
                            title="Lưu tên"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800 dark:text-zinc-100 truncate block">
                              {space.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                              space.isPrivate 
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                            }`}>
                              {space.isPrivate ? <Lock className="w-2.5 h-2.5 inline" /> : null}
                              {space.isPrivate ? 'Riêng tư' : 'Công khai'}
                            </span>
                            <span className="text-[9.5px] text-slate-400 dark:text-zinc-400 font-semibold">
                              {space.lists?.length || 0} danh sách
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSpaceSettings(null);
                      setInlineRenameSpaceId(null);
                    }}
                    className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Đóng"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Star className={`w-3.5 h-3.5 ${space.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {space.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Rename */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInlineRenameSpaceId(space.id);
                    setInlineRenameSpaceName(space.name);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Đổi tên
                    </span>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Sao chép liên kết
                    </span>
                  </div>
                </button>
              </div>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Tạo mới
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Color & Icon */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); onOpenSpaceSettings?.(space); }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200/60 dark:border-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                      <Droplet className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      Màu sắc & biểu tượng
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Automations */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveSpaceSettings(null); onOpenAutomations?.(); }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Zap className="w-3.5 h-3.5 fill-amber-500/20" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Tự động hóa
                    </span>
                  </div>
                </button>
              </div>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

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
                  className="w-full p-2 rounded-xl text-left border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group flex items-center justify-between"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 mt-0.5">
                      <EyeOff className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-700 dark:text-zinc-200 block group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                        {space.isHidden ? 'Hiển thị Space' : 'Ẩn Space'}
                      </span>
                      <span className="block text-[9.5px] text-slate-400 dark:text-zinc-400 font-medium leading-tight mt-0.5">
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      Nhân bản cấu trúc
                    </span>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <Archive className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {space.isArchived ? 'Khôi phục' : 'Lưu trữ'}
                    </span>
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
                      onConfirm: async () => {
                        const updated = spaces.filter(s => s.id !== space.id);
                        const linkedTasks = tasks.filter(task => task.spaceId === space.id);
                        const linkedDocs = allDocs.filter(doc => doc.spaceId === space.id);
                        await Promise.all([
                          ...linkedTasks.map(task => Promise.resolve(onDeleteTask(task.id))),
                          ...linkedDocs.map(doc => Promise.resolve(onDeleteDoc?.(doc.id))),
                        ]);
                        if (onDeleteSpace) onDeleteSpace(space.id);
                        else onSaveSpaces?.(updated);
                        if (activeSpaceId === space.id) {
                          if (setActiveSpaceId) setActiveSpaceId(updated[0]?.id || null);
                          if (setActiveListId) setActiveListId(null);
                        }
                        onAddSyncLog(`Deleted Space "${space.name}" with ${linkedTasks.length} tasks and ${linkedDocs.length} docs`);
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-rose-600 dark:text-rose-400">Xóa Space</span>
                  </div>
                </button>
              </div>

              {/* Group 4: Sharing & Permissions CTA */}
              <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
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
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-white/90" />
                  <span>Chia sẻ và phân quyền</span>
                </button>
              </div>
            </motion.div>
          </Portal>
        );
      })()}

      {/* ── Portal for List Context Menu (+) ── */}
      {activeListMenu && (() => {
        const space = spaces.find(s => s.id === activeListMenu.spaceId);
        const list = space?.lists.find(l => l.id === activeListMenu.id);
        if (!space || !list) return null;
        return (
          <Portal>
            <div className="fixed inset-0 z-40" onClick={() => setActiveListMenu(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              transition={{ duration: 0.16, type: 'spring', stiffness: 420, damping: 28 }}
              style={{ 
                position: 'fixed', 
                top: Math.max(16, Math.min(activeListMenu.y, typeof window !== 'undefined' ? window.innerHeight - 380 : activeListMenu.y)), 
                left: Math.max(16, Math.min(activeListMenu.x, typeof window !== 'undefined' ? window.innerWidth - 275 : activeListMenu.x))
              }}
              className="w-[265px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] z-50 text-left font-sans select-none overflow-hidden text-xs p-2 space-y-0.5"
            >
              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Tạo mới trong danh sách
                </span>
              </div>
              
              {/* Task */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  openPromptModal({
                    type: 'task',
                    title: 'Tạo công việc mới',
                    subtitle: `Trong danh sách: ${list.name}`,
                    placeholder: 'Nhập tiêu đề công việc...',
                    confirmText: 'Tạo công việc',
                    onConfirm: (tTitle) => {
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
                    }
                  });
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer transition-all duration-150 group"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-slate-950 dark:group-hover:text-white">Công việc</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium leading-tight mt-0.5">Tạo từng công việc để quản lý tiến độ</p>
                </div>
              </button>
              
              {/* List */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  openPromptModal({
                    type: 'list',
                    title: 'Tạo danh sách mới',
                    subtitle: `Trong không gian: ${space.name}`,
                    placeholder: 'Nhập tên danh sách...',
                    confirmText: 'Tạo danh sách',
                    onConfirm: (newListName) => {
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
                    }
                  });
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer transition-all duration-150 group"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <List className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-slate-950 dark:group-hover:text-white">Danh sách</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium leading-tight mt-0.5">Theo dõi công việc, dự án và thành viên</p>
                </div>
              </button>
              
              {/* Sprint */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  openPromptModal({
                    type: 'sprint',
                    title: 'Tạo chu kỳ Sprint mới',
                    subtitle: `Trong không gian: ${space.name}`,
                    placeholder: 'Nhập tên hoặc số Sprint (vd: Sprint 1, Q3 Sprint)...',
                    confirmText: 'Tạo Sprint',
                    onConfirm: (sprintName) => {
                      if (sprintName?.trim()) {
                        const sName = sprintName.trim().toLowerCase().startsWith('sprint') ? sprintName.trim() : `Sprint ${sprintName.trim()}`;
                        const updated = spaces.map(s => {
                          if (s.id === space.id) {
                            return {
                              ...s,
                              lists: [...s.lists, { id: `l-${Date.now()}`, name: sName, folderId: activeListMenu.folderId || undefined }]
                            };
                          }
                          return s;
                        });
                        onSaveSpaces?.(updated);
                      }
                    }
                  });
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer transition-all duration-150 group"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-slate-950 dark:group-hover:text-white">Sprint</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium leading-tight mt-0.5">Lập kế hoạch chu kỳ Sprint mới</p>
                </div>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
              
              {/* Doc */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveListMenu(null);
                  openPromptModal({
                    type: 'doc',
                    title: 'Tạo tài liệu mới',
                    subtitle: `Trong không gian: ${space.name}`,
                    placeholder: 'Nhập tiêu đề tài liệu...',
                    confirmText: 'Tạo tài liệu',
                    onConfirm: (docT) => {
                      if (docT?.trim() && onAddDocToSpace) {
                        onAddDocToSpace(space.id, docT.trim());
                      }
                    }
                  });
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 text-left cursor-pointer transition-all duration-150 group"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200/60 dark:border-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-slate-950 dark:group-hover:text-white">Tài liệu</span>
              </button>

              {/* Whiteboard */}
            </motion.div>
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              transition={{ duration: 0.16, type: 'spring', stiffness: 420, damping: 28 }}
              style={{ 
                position: 'fixed', 
                top: Math.max(16, Math.min(activeListSettings.y, typeof window !== 'undefined' ? window.innerHeight - 520 : activeListSettings.y)), 
                left: Math.max(16, Math.min(activeListSettings.x, typeof window !== 'undefined' ? window.innerWidth - 280 : activeListSettings.x))
              }}
              className="w-[275px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] z-50 text-left font-sans select-none overflow-hidden text-xs p-2 space-y-0.5"
            >
              {/* List Identity Banner */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <List className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-100 truncate block">
                      {list.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">
                        {space.name}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveListSettings(null)}
                  className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Group 1: Quick Actions */}
              <div className="space-y-0.5">
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Star className={`w-3.5 h-3.5 ${list.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {list.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Rename */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveListSettings(null);
                    openPromptModal({
                      type: 'rename',
                      title: 'Đổi tên danh sách',
                      defaultValue: list.name,
                      placeholder: 'Nhập tên danh sách mới...',
                      confirmText: 'Lưu thay đổi',
                      onConfirm: (newName) => {
                        if (newName?.trim()) {
                          const updatedLists = space.lists.map(l => l.id === list.id ? { ...l, name: newName.trim() } : l);
                          const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                          onSaveSpaces?.(updated);
                          onAddSyncLog(`Renamed List "${list.name}" to "${newName.trim()}"`);
                          triggerToast?.('success', 'Đã đổi tên', `Đã đổi tên danh sách thành "${newName.trim()}"`);
                        }
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Đổi tên
                    </span>
                  </div>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Sao chép liên kết
                    </span>
                  </div>
                </button>
              </div>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

              {/* Group 2: Configure & Automations */}
              <div className="space-y-0.5">
                {/* Custom Fields */}
                {canEditList(space, list) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveListSettings(null);
                      setShowFieldsPanel(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Trường tùy chỉnh
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all duration-200" />
                  </button>
                )}

                {/* Automations */}
                {canEditList(space, list) && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveListSettings(null); setActiveSpaceId?.(space.id); setActiveListId?.(list.id); onOpenAutomations?.(); }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <Zap className="w-3.5 h-3.5 fill-amber-500/20" />
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Tự động hóa
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

              {/* Group 3: Manage Actions */}
              <div className="space-y-0.5">
                {/* Duplicate */}
                {canEditList(space, list) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveListSettings(null);
                      const newListId = `l-${crypto.randomUUID()}`;
                      const newListName = `${list.name} (Bản sao)`;
                      const updatedLists = [...space.lists, { ...list, id: newListId, name: newListName, isFavorite: false, isArchived: false, user_id: currentUser?.id }];
                      const updated = spaces.map(s => s.id === space.id ? { ...s, lists: updatedLists } : s);
                      onSaveSpaces?.(updated);

                      // Clone all tasks in this list
                      const listTasks = tasks.filter(t => t.listId === list.id);
                      listTasks.forEach(task => {
                        onAddTask({
                          ...task,
                          listId: newListId,
                          spaceId: space.id,
                          workspaceId: activeWorkspaceId || task.workspaceId,
                          title: task.title,
                          subtasks: (task.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
                          tags: task.tags ? [...task.tags] : []
                        });
                      });

                      onAddSyncLog(`Duplicated List "${list.name}" with ${listTasks.length} tasks`);
                      triggerToast?.('success', 'Đã nhân bản danh sách', `Đã tạo "${newListName}" cùng ${listTasks.length} công việc.`);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                        <Copy className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        Nhân bản danh sách
                      </span>
                    </div>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <Archive className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {list.isArchived ? 'Khôi phục' : 'Lưu trữ'}
                    </span>
                  </div>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-rose-600 dark:text-rose-400">Xóa danh sách</span>
                  </div>
                </button>
              </div>

              {/* Group 4: Sharing CTA */}
              <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
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
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-white/90" />
                  <span>Chia sẻ và phân quyền</span>
                </button>
              </div>
            </motion.div>
          </Portal>
        );
      })()}


            {/* ── Portal for Folder Settings Dropdown Menu ── */}
      <Portal>
        <AnimatePresence>
          {activeFolderSettings && (() => {
            const space = spaces.find(s => s.id === activeFolderSettings.spaceId);
            const folder = space?.folders?.find(f => f.id === activeFolderSettings.id);
            if (!space || !folder) return null;
            const folderListsCount = space.lists.filter(l => l.folderId === folder.id).length;
            return (
              <motion.div
                key="folder-settings-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="fixed inset-0 z-40" onClick={() => { setActiveFolderSettings(null); setFolderColorMenuOpen(null); }} />
                <motion.div 
                  key="folder-settings-dropdown"
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -6 }}
                  transition={{ duration: 0.16, type: 'spring', stiffness: 420, damping: 28 }}
              style={{ 
                position: 'fixed', 
                top: Math.max(16, Math.min(activeFolderSettings.y, typeof window !== 'undefined' ? window.innerHeight - 560 : activeFolderSettings.y)), 
                left: Math.max(16, Math.min(activeFolderSettings.x, typeof window !== 'undefined' ? window.innerWidth - 280 : activeFolderSettings.x))
              }}
              className="w-[275px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] z-50 text-left font-sans select-none overflow-hidden text-xs p-2 space-y-0.5"
            >
              {/* Folder Identity Banner */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div 
                    className="w-7 h-7 rounded-lg border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${resolveFolderColor(folder.color)}18`, color: resolveFolderColor(folder.color) }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-100 truncate block">
                      {folder.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-400 dark:text-zinc-400">
                        {folderListsCount} danh sách
                      </span>
                      <span className="text-slate-300 dark:text-zinc-600">•</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">
                        {space.name}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveFolderSettings(null); setFolderColorMenuOpen(null); }}
                  className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Group 1: Quick Actions */}
              <div className="space-y-0.5">
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Star className={`w-3.5 h-3.5 ${folder.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {folder.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>

                {/* Rename */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const folderId = folder.id;
                    const spaceId = space.id;
                    const currentName = folder.name;
                    setActiveFolderSettings(null);
                    setFolderModalState({
                      isOpen: true,
                      spaceId,
                      initialName: currentName,
                      isSprintMode: currentName.toLowerCase().startsWith('sprint'),
                      editingFolderId: folderId,
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Đổi tên
                    </span>
                  </div>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Sao chép liên kết
                    </span>
                  </div>
                </button>

                {/* Create List inside Folder */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderSettings(null);
                    openPromptModal({
                      type: 'list',
                      title: 'Tạo danh sách trong thư mục',
                      subtitle: `Thư mục: ${folder.name}`,
                      placeholder: 'Nhập tên danh sách...',
                      confirmText: 'Tạo danh sách',
                      onConfirm: (name) => {
                        if (name?.trim() && onAddListToFolder) {
                          onAddListToFolder(space.id, folder.id, name.trim());
                        }
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Tạo danh sách mới
                    </span>
                  </div>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

              {/* Group 2: Color & Automations */}
              <div className="space-y-0.5">
                {/* Folder color */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderColorMenuOpen(folderColorMenuOpen === folder.id ? null : folder.id);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200/60 dark:border-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                      <Droplet className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      Màu thư mục
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shadow-3xs" style={{ backgroundColor: resolveFolderColor(folder.color) }} />
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${folderColorMenuOpen === folder.id ? 'rotate-90 text-violet-500' : ''}`} />
                  </div>
                </button>

                {folderColorMenuOpen === folder.id && (
                  <div className="p-1.5 grid grid-cols-6 gap-1.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-zinc-800 my-1 animate-fadeIn">
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
                        }}
                        className={`w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform border ${
                          resolveFolderColor(folder.color) === colorOpt.hex ? 'border-slate-900 dark:border-white ring-2 ring-violet-400' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: colorOpt.hex }}
                        title={colorOpt.name}
                      />
                    ))}
                  </div>
                )}

                {/* Automations */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveFolderSettings(null); setActiveSpaceId?.(space.id); setActiveListId?.(null); setActiveFolderId(folder.id); onOpenAutomations?.(); }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Zap className="w-3.5 h-3.5 fill-amber-500/20" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Tự động hóa
                    </span>
                  </div>
                </button>

                {/* Custom Fields */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderSettings(null);
                    setShowFieldsPanel(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Trường tùy chỉnh
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

              {/* Group 3: Manage Actions */}
              <div className="space-y-0.5">
                {/* Duplicate */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderSettings(null);
                    const newFolderName = `${folder.name} (Bản sao)`;
                    const newFolderId = `folder-${crypto.randomUUID()}`;
                    const listIdMap = new Map<string, string>();

                    const clonedLists = space.lists
                      .filter(item => item.folderId === folder.id)
                      .map(item => {
                        const newListId = `l-${crypto.randomUUID()}`;
                        listIdMap.set(item.id, newListId);
                        return {
                          ...item,
                          id: newListId,
                          folderId: newFolderId,
                          name: `${item.name}`,
                          isFavorite: false,
                          isArchived: false,
                          user_id: currentUser?.id
                        };
                      });

                    const clonedWhiteboards = (space.whiteboards || [])
                      .filter(board => board.folderId === folder.id)
                      .map(board => ({
                        ...board,
                        id: `wb-${crypto.randomUUID()}`,
                        folderId: newFolderId,
                      }));

                    const updatedFolders = [...(space.folders || []), { ...folder, id: newFolderId, name: newFolderName, isFavorite: false, isArchived: false }];
                    const updated = spaces.map(s => s.id === space.id ? {
                      ...s,
                      folders: updatedFolders,
                      lists: [...s.lists, ...clonedLists],
                      whiteboards: [...(s.whiteboards || []), ...clonedWhiteboards],
                    } : s);
                    onSaveSpaces?.(updated);

                    const clonedDocs = allDocs.filter(doc => doc.spaceId === space.id && doc.folderId === folder.id);
                    clonedDocs.forEach(doc => onAddDoc?.({
                      title: doc.title,
                      content: doc.content,
                      category: doc.category,
                      updatedBy: currentUser?.name || doc.updatedBy,
                      isAiGenerated: doc.isAiGenerated,
                      emoji: doc.emoji,
                      spaceId: space.id,
                      folderId: newFolderId,
                    }));

                    // Clone tasks inside folder lists
                    let clonedTaskCount = 0;
                    tasks.filter(t => t.spaceId === space.id && t.listId && listIdMap.has(t.listId)).forEach(task => {
                      clonedTaskCount++;
                      onAddTask({
                        ...task,
                        listId: listIdMap.get(task.listId!),
                        spaceId: space.id,
                        workspaceId: activeWorkspaceId || task.workspaceId,
                        title: task.title,
                        subtasks: (task.subtasks || []).map(st => ({ ...st, id: `sub-${crypto.randomUUID()}` })),
                        tags: task.tags ? [...task.tags] : []
                      });
                    });

                    onAddSyncLog(`Duplicated Folder "${folder.name}" with ${clonedTaskCount} tasks, ${clonedDocs.length} docs and ${clonedWhiteboards.length} whiteboards`);
                    triggerToast?.('success', 'Đã nhân bản thư mục', `Đã tạo "${newFolderName}" cùng ${clonedLists.length} danh sách, ${clonedTaskCount} công việc, ${clonedDocs.length} tài liệu và ${clonedWhiteboards.length} bảng trắng.`);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      Nhân bản thư mục
                    </span>
                  </div>
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
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <Archive className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {folder.isArchived ? 'Khôi phục' : 'Lưu trữ'}
                    </span>
                  </div>
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
                      onConfirm: async () => {
                        const removedListIds = new Set(space.lists.filter(item => item.folderId === folder.id).map(item => item.id));
                        const removedTasks = tasks.filter(task => task.listId && removedListIds.has(task.listId));
                        const movedDocs = allDocs.filter(doc => doc.spaceId === space.id && doc.folderId === folder.id);
                        await Promise.all(removedTasks.map(task => Promise.resolve(onDeleteTask(task.id))));
                        await Promise.all(movedDocs.map(doc => Promise.resolve(onUpdateDoc?.({ ...doc, folderId: undefined }))));
                        const updatedFolders = space.folders?.filter(f => f.id !== folder.id) || [];
                        const updatedLists = space.lists?.filter(l => l.folderId !== folder.id) || [];
                        const updatedWhiteboards = (space.whiteboards || []).map(board => board.folderId === folder.id ? { ...board, folderId: undefined } : board);
                        const updated = spaces.map(s => s.id === space.id ? { ...s, folders: updatedFolders, lists: updatedLists, whiteboards: updatedWhiteboards } : s);
                        onSaveSpaces?.(updated);
                        if (activeFolderId === folder.id) {
                          setActiveFolderId(null);
                        }
                        onAddSyncLog(`Deleted Folder "${folder.name}", removed ${removedTasks.length} tasks and moved ${movedDocs.length} docs to Space root`);
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 bg-transparent hover:bg-rose-50/80 dark:hover:bg-rose-950/30 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-rose-600 dark:text-rose-400">Xóa thư mục</span>
                  </div>
                </button>
              </div>

              {/* Group 4: Sharing CTA */}
              <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderSettings(null);
                    setSharingTargetType('folder');
                    setSharingTargetId(folder.id);
                    setSharingTargetName(folder.name);
                    setSharingTargetIsPrivate(!!folder.isPrivate);
                    setSharingTargetShareSettings(folder.shareSettings || {});
                    setSharingModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-white/90" />
                  <span>Chia sẻ và phân quyền</span>
                </button>
              </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </Portal>

      <CustomizeViewModal
        isOpen={showCustomizeViewModal}
        onClose={() => setShowCustomizeViewModal(false)}
        activeView={activeView}
        viewTitle={activeViewLabel}
        showEmptyStatuses={showEmptyStatuses}
        onToggleShowEmptyStatuses={setShowEmptyStatuses}
        wrapText={wrapText}
        onToggleWrapText={setWrapText}
        showTaskLocations={showTaskLocations}
        onToggleShowTaskLocations={setShowTaskLocations}
        showSubtaskParentNames={showSubtaskParentNames}
        onToggleShowSubtaskParentNames={setShowSubtaskParentNames}
        showClosedTasks={showClosedTasks}
        onToggleShowClosedTasks={setShowClosedTasks}
        visibleFieldsCount={visibleFields.length}
        onOpenFields={() => openFieldsPanel()}
        activeFilterCount={activeFilterCount}
        onOpenFilter={() => setShowFilters(true)}
        groupBy={boardGroupBy}
        onChangeGroupBy={(group) => setBoardGroupBy(group as any)}
        subtasksMode={subtasksMode}
        onChangeSubtasksMode={setSubtasksMode}
        onOpenTemplates={() => setTemplatesModalOpen(true)}
        viewSettings={activeViewSettings}
        onUpdateViewSetting={handleUpdateActiveViewSetting}
        onCopyLink={handleCopyViewLink}
        isFavorite={Boolean(activeSpace.isFavorite)}
        onToggleFavorite={() => toggleSpaceFavorite(activeSpace)}
        onExport={() => handleExportViewData('csv')}
        onOpenShare={() => {
          setSharingTargetType('space');
          setSharingTargetId(activeSpace.id);
          setSharingTargetName(activeSpace.name);
          setSharingTargetIsPrivate(!!activeSpace.isPrivate);
          setSharingTargetShareSettings(activeSpace.shareSettings || {});
          setSharingModalOpen(true);
        }}
      />

      <CustomFieldsManagerModal
        isOpen={showFieldsPanel}
        onClose={() => { setShowFieldsPanel(false); setFieldsPanelAnchor(null); }}
        visibleFields={visibleFields} setVisibleFields={setVisibleFields}
        customFields={customFields} setCustomFields={persistCustomFields}
        tasks={tasks.filter(task => !activeSpace.id || task.spaceId === activeSpace.id || !task.spaceId)} onUpdateTask={guardedUpdateTask}
        activeSpace={activeSpace} spaces={spaces} onSaveSpaces={onSaveSpaces}
        openDialog={triggerConfirm} triggerToast={triggerToast}
        anchorPosition={fieldsPanelAnchor}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        itemName={confirmModal.itemName}
        itemType={confirmModal.itemType}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDestructive={confirmModal.isDestructive}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <TaskTrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        deletedTasks={deletedTasks}
        onRestoreTask={async (id) => {
          await onRestoreTask?.(id);
        }}
        onPermanentDeleteTask={async (id) => {
          await onPermanentDeleteTask?.(id);
        }}
        onEmptyTrash={async () => {
          await onEmptyTrash?.();
        }}
        spaces={spaces}
      />

      <ManageSpacesModal
        isOpen={showManageSpacesModal}
        onClose={() => setShowManageSpacesModal(false)}
        spaces={spaces}
        onSaveSpaces={onSaveSpaces}
        onOpenSpaceSettings={onOpenSpaceSettings}
        onAddSpace={onAddSpace}
        onDeleteSpace={onDeleteSpace}
        triggerToast={triggerToast}
      />

      {/* Modern UI/UX Prompt Modal */}
      {promptConfig && (
        <PromptModal {...promptConfig} />
      )}

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
        spaceId={activeSpace?.id}
        canEdit={sharingTargetType === 'space' 
          ? canEditSpace(spaces.find(s => s.id === sharingTargetId) || activeSpace) 
          : sharingTargetType === 'folder'
          ? canEditSpace(activeSpace)
          : canEditList(activeSpace, activeSpace.lists?.find(l => l.id === sharingTargetId))}
      />

      {/* ── ADD / EDIT FOLDER MODAL ── */}
      <AddFolderModal
        isOpen={folderModalState.isOpen}
        onClose={() => setFolderModalState(prev => ({ ...prev, isOpen: false }))}
        spaceId={folderModalState.spaceId}
        spaces={spaces}
        initialName={folderModalState.initialName}
        isSprintMode={folderModalState.isSprintMode}
        editingFolderId={folderModalState.editingFolderId}
        onSave={handleFolderModalSave}
      />

      {/* Hidden File Input for Task CSV/JSON Import */}
      <input
        type="file"
        ref={fileImportInputRef}
        onChange={handleImportFile}
        accept=".csv,.json"
        className="hidden"
      />

      {/* Templates Selection Modal */}
      <Portal>
        <AnimatePresence>
          {templatesModalOpen && (
            <motion.div
              key="templates-modal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-slate-950/60 modal-backdrop-blur cursor-pointer" onClick={() => setTemplatesModalOpen(false)} />
              <motion.div
                key="templates-modal-card"
                initial={{ scale: 0.94, y: 16, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.94, y: 16, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-left"
              >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Thư viện Mẫu Quy trình Không gian</h3>
                    <p className="text-[11px] text-slate-400">Chọn mẫu quy trình phù hợp để tự động khởi tạo danh sách và công việc mẫu</p>
                  </div>
                </div>
                <button
                  onClick={() => setTemplatesModalOpen(false)}
                  className="w-7 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {[
                  {
                    key: 'agile',
                    title: 'Quy trình Phát triển Phần mềm Agile Sprint',
                    desc: 'Cấu trúc Sprint hoàn chỉnh với các công việc mẫu từ Thiết kế kiến trúc, API Backend, Giao diện UI đến Kiểm thử QA.',
                    badge: 'Scrum / Agile',
                    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
                    tasksCount: '5 công việc'
                  },
                  {
                    key: 'crm',
                    title: 'Phễu Quản lý Bán hàng & Khách hàng (CRM Pipeline)',
                    desc: 'Theo dõi khách hàng tiềm năng, gửi báo giá giải pháp, họp demo sản phẩm và ký kết hợp đồng doanh nghiệp.',
                    badge: 'Sales & CRM',
                    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
                    tasksCount: '4 công việc'
                  },
                  {
                    key: 'marketing',
                    title: 'Chiến dịch Tiếp thị Đa kênh (Digital Marketing)',
                    desc: 'Kế hoạch sản xuất nội dung bài viết, thiết kế banner quảng cáo số và đo lường tỷ lệ chuyển đổi khách hàng.',
                    badge: 'Marketing Growth',
                    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
                    tasksCount: '4 công việc'
                  }
                ].map(tmpl => (
                  <div
                    key={tmpl.key}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 hover:border-indigo-500/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${tmpl.color}`}>
                          {tmpl.badge}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {tmpl.tasksCount}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 mt-2">
                        {tmpl.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {tmpl.desc}
                      </p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplatePreset(tmpl.key)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Áp dụng mẫu này</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>

      </div> {/* Closing tag for Main Page Workspace Content Container */}
    </div>
  );
}
