import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Briefcase,
  FileText,
  Hash,
  ArrowRight,
  Cog,
  User as UserIcon,
  Terminal,
  Plus,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Database,
  Grid,
  BarChart,
  Target,
  Users,
  Settings,
  Moon,
  Sun,
  Timer,
  Sparkles,
  Command,
  CheckCircle2,
  Zap,
  Download,
  Layers3,
} from 'lucide-react';
import { Task, Document, Space, User as UserType } from '@/types';

export type SearchCategory = 'all' | 'tasks' | 'docs' | 'spaces' | 'channels' | 'members' | 'commands';

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchCategory: SearchCategory;
  setSearchCategory: (cat: SearchCategory) => void;
  tasks: Task[];
  docs: Document[];
  spaces: Space[];
  members: UserType[];
  activeWorkspaceId: string;
  onSelectTask: (taskId: string) => void;
  onSelectDoc: (docId: string) => void;
  onSelectSpace: (spaceId: string) => void;
  onSelectChannel: (channelId: string) => void;
  onSelectMember?: (memberId: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenSettings?: () => void;
  onOpenAutomations?: () => void;
  onOpenExport?: () => void;
  onToggleDarkMode?: () => void;
  isDarkMode?: boolean;
  addSyncLog: (log: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchCategory,
  setSearchCategory,
  tasks,
  docs,
  spaces,
  members,
  activeWorkspaceId,
  onSelectTask,
  onSelectDoc,
  onSelectSpace,
  onSelectChannel,
  onSelectMember,
  onNavigateTab,
  onOpenSettings,
  onOpenAutomations,
  onOpenExport,
  onToggleDarkMode,
  isDarkMode,
  addSyncLog,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define System Commands
  const systemCommands = useMemo(() => [
    {
      id: 'create-task',
      name: '/task',
      label: 'Create New Task',
      description: 'Quickly open task board to create a new task',
      icon: Plus,
      action: () => {
        onNavigateTab('tasks');
        addSyncLog('Command: Navigated to Tasks');
      },
    },
    {
      id: 'create-doc',
      name: '/doc',
      label: 'Create New Document',
      description: 'Quickly open documentation wiki to write a new doc',
      icon: FileText,
      action: () => {
        onNavigateTab('docs');
        addSyncLog('Command: Navigated to Docs');
      },
    },
    {
      id: 'goto-inbox',
      name: '/inbox',
      label: 'Go to Inbox',
      description: 'Check unread notifications and activity updates',
      icon: LayoutDashboard,
      action: () => {
        onNavigateTab('inbox');
        addSyncLog('Command: Opened Inbox');
      },
    },
    {
      id: 'goto-calendar',
      name: '/calendar',
      label: 'Go to Calendar',
      description: 'View schedule, deadlines, and events',
      icon: Calendar,
      action: () => {
        onNavigateTab('calendar');
        addSyncLog('Command: Opened Calendar');
      },
    },
    {
      id: 'goto-chat',
      name: '/chat',
      label: 'Go to Chat Channels',
      description: 'Open real-time team messaging',
      icon: MessageSquare,
      action: () => {
        onNavigateTab('chat');
        addSyncLog('Command: Opened Chat');
      },
    },
    {
      id: 'goto-base',
      name: '/base',
      label: 'Open Apexa Base',
      description: 'No-code database tables and records',
      icon: Database,
      action: () => {
        onNavigateTab('base');
        addSyncLog('Command: Opened Apexa Base');
      },
    },
    {
      id: 'open-ai',
      name: '/ai',
      label: 'Launch Apexa Brain AI Assistant',
      description: 'Ask AI, summarize workspace, generate tasks or PRDs',
      icon: Sparkles,
      action: () => {
        if (typeof document !== 'undefined') {
          const aiBtn = document.getElementById('btn_apexa_ai_float');
          if (aiBtn) aiBtn.click();
        }
        addSyncLog('Command: Launched Apexa Brain AI Assistant');
      },
    },
    {
      id: 'goto-whiteboard',
      name: '/whiteboard',
      label: 'Open Whiteboard',
      description: 'Interactive canvas for sketching & diagramming',
      icon: Grid,
      action: () => {
        onNavigateTab('whiteboard');
        addSyncLog('Command: Opened Whiteboard');
      },
    },
    {
      id: 'goto-analytics',
      name: '/analytics',
      label: 'Open Analytics',
      description: 'Performance metrics and completion charts',
      icon: BarChart,
      action: () => {
        onNavigateTab('analytics');
        addSyncLog('Command: Opened Analytics');
      },
    },
    {
      id: 'goto-goals',
      name: '/goals',
      label: 'Open Goals (OKRs)',
      description: 'Track strategic objectives and key results',
      icon: Target,
      action: () => {
        onNavigateTab('goals');
        addSyncLog('Command: Opened Goals');
      },
    },
    {
      id: 'goto-team',
      name: '/team',
      label: 'Open Team OS',
      description: 'View team members directory and roles',
      icon: Users,
      action: () => {
        onNavigateTab('team');
        addSyncLog('Command: Opened Team OS');
      },
    },
    {
      id: 'open-settings',
      name: '/settings',
      label: 'Open Workspace Settings',
      description: 'Configure workspace, notifications & preferences',
      icon: Settings,
      action: () => {
        if (onOpenSettings) onOpenSettings();
        else onNavigateTab('settings');
        addSyncLog('Command: Opened Settings');
      },
    },
    {
      id: 'open-automations',
      name: '/automation',
      label: 'Automation Rules Engine',
      description: 'Configure no-code triggers, alerts, and workflow rules',
      icon: Zap,
      action: () => {
        if (onOpenAutomations) onOpenAutomations();
        addSyncLog('Command: Opened Automation Engine');
      },
    },
    {
      id: 'open-export',
      name: '/export',
      label: 'Export Data & Backup',
      description: 'Download workspace tasks, docs, CSV, or HTML report',
      icon: Download,
      action: () => {
        if (onOpenExport) onOpenExport();
        addSyncLog('Command: Opened Export Center');
      },
    },
    {
      id: 'toggle-theme',
      name: '/theme',
      label: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle UI color theme',
      icon: isDarkMode ? Sun : Moon,
      action: () => {
        if (onToggleDarkMode) onToggleDarkMode();
        addSyncLog('Command: Toggled Dark/Light Mode');
      },
    },
  ], [onNavigateTab, onOpenSettings, onOpenAutomations, onOpenExport, onToggleDarkMode, isDarkMode, addSyncLog]);

  // Workspace Chat Channels
  const activeSpaces = useMemo(
    () => spaces.filter(space => space.workspaceId === activeWorkspaceId && !space.isArchived && !space.isHidden),
    [spaces, activeWorkspaceId]
  );

  const workspaceChannels = useMemo(() => {
    const directory = [
      { id: `${activeWorkspaceId}:general`, name: 'general', description: 'General workspace discussion', type: 'public' },
      { id: `${activeWorkspaceId}:apexa-brain-ai`, name: 'apexa-brain-ai', description: 'Workspace AI assistant', type: 'public' },
      ...activeSpaces.flatMap(space => (space.channels || []).map(channel => ({
        ...channel,
        id: channel.id.includes(':') ? channel.id : `${activeWorkspaceId}:space-${space.id}-${channel.id}`,
        description: channel.description || `Channel in ${space.name}`,
        type: channel.type || 'public',
      }))),
    ];
    return Array.from(new Map(directory.map(channel => [channel.id, channel])).values());
  }, [activeSpaces, activeWorkspaceId]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q || q.startsWith('/')) return [];
    const activeTasks = tasks.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeSpaces.some(space => space.id === t.spaceId)));
    return activeTasks.filter(t =>
      normalizeSearchText(t.title).includes(q) ||
      normalizeSearchText(t.description || '').includes(q) ||
      (t.tags || []).some(tag => normalizeSearchText(tag).includes(q))
    );
  }, [tasks, activeWorkspaceId, activeSpaces, searchQuery]);

  // Filtered Docs
  const filteredDocs = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q || q.startsWith('/')) return [];
    const activeDocs = docs.filter(d => (d.workspaceId === activeWorkspaceId || (!d.workspaceId && activeSpaces.some(space => space.id === d.spaceId))) && d.category !== 'System');
    return activeDocs.filter(d =>
      normalizeSearchText(d.title).includes(q) ||
      normalizeSearchText(d.content || '').includes(q) ||
      normalizeSearchText(d.category || '').includes(q)
    );
  }, [docs, activeWorkspaceId, activeSpaces, searchQuery]);

  const filteredSpaces = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q || q.startsWith('/')) return [];
    return activeSpaces.filter(space =>
      normalizeSearchText(space.name).includes(q) ||
      (space.lists || []).some(list => normalizeSearchText(list.name).includes(q))
    );
  }, [activeSpaces, searchQuery]);

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q || q.startsWith('/')) return [];
    return workspaceChannels.filter(c =>
      normalizeSearchText(c.name).includes(q) ||
      normalizeSearchText(c.description).includes(q)
    );
  }, [workspaceChannels, searchQuery]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q || q.startsWith('/')) return [];
    return members.filter(m => (!m.workspaceIds || m.workspaceIds.includes(activeWorkspaceId)) && (
      normalizeSearchText(m.name).includes(q) ||
      normalizeSearchText(m.email).includes(q) ||
      normalizeSearchText(m.role).includes(q) ||
      normalizeSearchText(m.department || '').includes(q)
    )
    );
  }, [members, activeWorkspaceId, searchQuery]);

  // Filtered Commands
  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.startsWith('/')) {
      const cmdQuery = q.slice(1);
      return systemCommands.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(cmdQuery) ||
        c.description.toLowerCase().includes(cmdQuery)
      );
    }
    if (!q) return systemCommands;
    return systemCommands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  }, [systemCommands, searchQuery]);

  const isCommandMode = searchQuery.trim().startsWith('/') || searchCategory === 'commands';

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    if (searchQuery.trim() === '' && !isCommandMode) return [];

    const items: Array<{
      type: 'task' | 'doc' | 'space' | 'channel' | 'member' | 'command';
      data: any;
    }> = [];

    if (isCommandMode || (searchCategory as string) === 'commands') {
      filteredCommands.forEach(cmd => items.push({ type: 'command', data: cmd }));
      return items;
    }

    if (searchCategory === 'all' || searchCategory === 'tasks') {
      filteredTasks.forEach(t => items.push({ type: 'task', data: t }));
    }
    if (searchCategory === 'all' || searchCategory === 'docs') {
      filteredDocs.forEach(d => items.push({ type: 'doc', data: d }));
    }
    if (searchCategory === 'all' || searchCategory === 'spaces') {
      filteredSpaces.forEach(space => items.push({ type: 'space', data: space }));
    }
    if (searchCategory === 'all' || searchCategory === 'channels') {
      filteredChannels.forEach(c => items.push({ type: 'channel', data: c }));
    }
    if (searchCategory === 'all' || searchCategory === 'members') {
      filteredMembers.forEach(m => items.push({ type: 'member', data: m }));
    }

    return items;
  }, [
    searchQuery,
    searchCategory,
    isCommandMode,
    filteredTasks,
    filteredDocs,
    filteredSpaces,
    filteredChannels,
    filteredMembers,
    filteredCommands,
  ]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, searchCategory]);

  // Focus management and scroll locking while the dialog is open.
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement as HTMLElement | null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const focusTimer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
        openerRef.current?.focus();
      };
    }
  }, [isOpen]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.length > 0) {
        setSelectedIndex(prev => (prev + 1) % flatResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.length > 0) {
        setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults.length > 0 && flatResults[selectedIndex]) {
        executeResultItem(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle result types without moving focus away from the search box.
      const categories: SearchCategory[] = ['all', 'tasks', 'docs', 'spaces', 'channels', 'members', 'commands'];
      const currentIndex = categories.indexOf(searchCategory);
      const nextCategory = categories[(currentIndex + 1) % categories.length];
      setSearchCategory(nextCategory);
    }
  };

  const executeResultItem = (item: { type: string; data: any }) => {
    onClose();
    setSearchQuery('');
    if (item.type === 'task') {
      onSelectTask(item.data.id);
      addSyncLog(`Jumped to task: "${item.data.title}" from global search`);
    } else if (item.type === 'doc') {
      onSelectDoc(item.data.id);
      addSyncLog(`Opened document: "${item.data.title}" from global search`);
    } else if (item.type === 'space') {
      onSelectSpace(item.data.id);
      addSyncLog(`Opened space: "${item.data.name}" from global search`);
    } else if (item.type === 'channel') {
      onSelectChannel(item.data.id);
      addSyncLog(`Activated chat channel: #${item.data.name}`);
    } else if (item.type === 'member') {
      if (onSelectMember) onSelectMember(item.data.id);
      else onNavigateTab('team');
      addSyncLog(`Viewed member profile: ${item.data.name}`);
    } else if (item.type === 'command') {
      item.data.action();
    }
  };

  const totalResultsCount =
    filteredTasks.length +
    filteredDocs.length +
    filteredSpaces.length +
    filteredChannels.length +
    filteredMembers.length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:pt-[12vh] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            onClose();
            setSearchQuery('');
          }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Body */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-search-title"
          initial={{ scale: 0.96, opacity: 0, y: -12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: -12 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[75vh] z-10 font-sans"
        >
          <h2 id="global-search-title" className="sr-only">Tìm kiếm toàn cục</h2>
          {/* Searching Bar Input Field */}
          <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 focus-within:border-indigo-500/50 transition-colors">
            {isCommandMode ? (
              <Terminal className="w-4 h-4 text-purple-500 shrink-0 animate-pulse" />
            ) : (
              <Search className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={isCommandMode ? "Nhập lệnh hoặc nội dung tìm kiếm..." : "Tìm công việc, tài liệu, khu vực, kênh trò chuyện..."}
              value={searchQuery}
              aria-label="Tìm công việc, tài liệu, khu vực, kênh và thành viên"
              aria-controls="global-search-results"
              aria-activedescendant={flatResults[selectedIndex] ? `global-search-result-${selectedIndex}` : undefined}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.startsWith('/') && searchCategory !== 'commands') {
                  setSearchCategory('commands');
                } else if (val.trim() === '' && searchCategory === 'commands') {
                  setSearchCategory('all');
                }
              }}
              className="w-full bg-transparent text-slate-800 dark:text-slate-50 placeholder-slate-400 font-sans text-sm focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5 rounded cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              aria-label="Đóng tìm kiếm toàn cục"
              onClick={() => {
                onClose();
                setSearchQuery('');
              }}
              className="p-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/60 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category Filter Pills */}
          {(searchQuery.trim() !== '' || isCommandMode) && (
            <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <button
                onClick={() => setSearchCategory('all')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1 ${
                  searchCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                Tất cả ({totalResultsCount})
              </button>
              <button
                onClick={() => setSearchCategory('tasks')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'tasks'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Briefcase className="w-3 h-3 shrink-0" />
                <span>Công việc ({filteredTasks.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('docs')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'docs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span>Tài liệu ({filteredDocs.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('spaces')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'spaces'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Layers3 className="w-3 h-3 shrink-0" />
                <span>Khu vực ({filteredSpaces.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('channels')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'channels'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Hash className="w-3 h-3 shrink-0" />
                <span>Trò chuyện ({filteredChannels.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('members')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'members'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <UserIcon className="w-3 h-3 shrink-0" />
                <span>Thành viên ({filteredMembers.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('commands')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'commands'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Terminal className="w-3 h-3 shrink-0" />
                <span>Lệnh ({filteredCommands.length})</span>
              </button>
            </div>
          )}

          {/* Body Content */}
          <div id="global-search-results" role="listbox" aria-live="polite" className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[55vh]">
            {searchQuery.trim() === '' && !isCommandMode ? (
              // Default Quick Suggestions Screen (Exact UI design match)
              <div className="space-y-3.5 p-2">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                  GỢI Ý NHANH
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setSearchQuery('Design');
                      setSearchCategory('all');
                    }}
                    className="p-3.5 text-left bg-slate-50/80 dark:bg-slate-950/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-650 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Briefcase className="w-4 h-4 font-bold" />
                      </div>
                      <span className="font-semibold">Thiết kế giao diện UI/UX</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      setSearchQuery('offline');
                      setSearchCategory('all');
                    }}
                    className="p-3.5 text-left bg-slate-50/80 dark:bg-slate-950/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-650 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Briefcase className="w-4 h-4 font-bold" />
                      </div>
                      <span className="font-semibold">Thuật toán ngoại tuyến</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      setSearchQuery('Apexa AI');
                      setSearchCategory('all');
                    }}
                    className="p-3.5 text-left bg-slate-50/80 dark:bg-slate-950/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-650 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                        <Hash className="w-4 h-4 font-bold" />
                      </div>
                      <span className="font-semibold">Lõi AI Apexa</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => {
                      setSearchQuery('Culture');
                      setSearchCategory('all');
                    }}
                    className="p-3.5 text-left bg-slate-50/80 dark:bg-slate-950/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-650 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 shrink-0">
                        <FileText className="w-4 h-4 font-bold" />
                      </div>
                      <span className="font-semibold">Tài liệu văn hóa CRM</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Footer Bar */}
                <div className="pt-3.5 border-t border-slate-150 dark:border-slate-800/80 px-1 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span>
                      Press{' '}
                      <button
                        onClick={() => {
                          setSearchQuery('/');
                          setSearchCategory('commands');
                        }}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        /
                      </button>{' '}
                      để xem toàn bộ lệnh, nhấn{' '}
                      <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300">
                        Tab
                      </kbd>{' '}
                      để xem các thao tác khác
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      if (onOpenSettings) onOpenSettings();
                      else onNavigateTab('settings');
                      onClose();
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center"
                    title="Cài đặt tìm kiếm"
                  >
                    <Cog className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : flatResults.length === 0 ? (
              // Empty State
              <div className="py-10 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Không tìm thấy kết quả phù hợp</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                  {isCommandMode
                    ? 'No system commands match this keyword. Try typing /task, /doc, /chat, or /settings.'
                    : 'We searched tasks, documents, spaces, chat channels, and members but found no matches.'}
                </p>
              </div>
            ) : (
              // Results List (Flattened for keyboard indexing)
              <div className="space-y-1.5">
                {flatResults.map((item, idx) => {
                  const isSelected = idx === selectedIndex;

                  if (item.type === 'command') {
                    const cmd = item.data;
                    const Icon = cmd.icon || Terminal;
                    return (
                      <button
                        id={`global-search-result-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        key={cmd.id}
                        onClick={() => executeResultItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/50 shadow-xs text-purple-900 dark:text-purple-200'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-purple-50/20 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                {cmd.name}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{cmd.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{cmd.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase font-mono px-2 py-0.5 bg-purple-50 dark:bg-purple-950 rounded border border-purple-100 dark:border-purple-900">
                            COMMAND
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 text-purple-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'task') {
                    const t = item.data;
                    return (
                      <button
                        id={`global-search-result-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        key={`task-${t.id}`}
                        onClick={() => executeResultItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-indigo-50/20 hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-indigo-600 transition-colors truncate">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              {t.description || 'No description provided.'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                              t.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400'
                                : t.status === 'inprogress'
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {t.status}
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 text-indigo-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'doc') {
                    const d = item.data;
                    return (
                      <button
                        id={`global-search-result-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        key={`doc-${d.id}`}
                        onClick={() => executeResultItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-pink-500/10 border-pink-500/50 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-pink-50/20 hover:border-pink-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-pink-600 transition-colors truncate">
                              {d.title}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              Danh mục: {d.category || 'General'} • Tác giả: {d.updatedBy || 'System'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-bold bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded uppercase font-mono">
                            DOC
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 text-pink-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'space') {
                    const space = item.data as Space;
                    return (
                      <button
                        id={`global-search-result-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        key={`space-${space.id}`}
                        onClick={() => executeResultItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/50 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-cyan-50/20 hover:border-cyan-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 shrink-0">
                            <Layers3 className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-cyan-600 transition-colors truncate">
                              {space.emoji ? `${space.emoji} ` : ''}{space.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              {space.lists?.length || 0} danh sách · {space.channels?.length || 0} channels
                            </span>
                          </div>
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 text-cyan-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    );
                  }

                  if (item.type === 'channel') {
                    const c = item.data;
                    return (
                      <button
                        id={`global-search-result-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        key={`channel-${c.id}`}
                        onClick={() => executeResultItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/50 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-purple-50/20 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                            <Hash className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-purple-600 transition-colors truncate">
                              #{c.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              {c.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-bold bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded uppercase font-mono">
                            CHAT
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 text-purple-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'member') {
                    const m = item.data;
                    return (
                      <button
                        id={`global-search-result-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        key={`member-${m.id}`}
                        onClick={() => executeResultItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-emerald-50/20 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-teal-600 transition-colors truncate">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              {m.email} • {m.role}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-bold bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-900 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded uppercase font-mono">
                            MEMBER
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 text-teal-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
