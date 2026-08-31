"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Briefcase,
  FileText,
  Hash,
  ArrowRight,
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
  Boxes,
  DollarSign,
  TrendingUp,
  History,
  CornerDownLeft,
  ChevronRight,
  Shield,
  HelpCircle,
  Tag
} from 'lucide-react';
import { Task, Document, Space, User as UserType } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

export type SearchCategory = 'all' | 'tasks' | 'docs' | 'spaces' | 'channels' | 'members' | 'commands';

const normalizeSearchText = (value: string) =>
  (value || '')
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

const RECENT_SEARCHES_KEY = 'apexa-recent-searches';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchCategory,
  setSearchCategory,
  tasks = [],
  docs = [],
  spaces = [],
  members = [],
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
  const { isVietnamese } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  const saveRecentSearch = (query: string) => {
    const q = query.trim();
    if (!q || q.startsWith('/')) return;
    try {
      const updated = [q, ...recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== item);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Define System Commands
  const systemCommands = useMemo(() => [
    {
      id: 'create-task',
      name: '/task',
      label: isVietnamese ? 'Tạo công việc mới' : 'Create New Task',
      description: isVietnamese ? 'Mở bảng công việc để tạo việc mới' : 'Quickly open task board to create a new task',
      icon: Plus,
      badge: 'Công việc',
      action: () => {
        onNavigateTab('tasks');
        addSyncLog('Command: Navigated to Tasks');
      },
    },
    {
      id: 'create-doc',
      name: '/doc',
      label: isVietnamese ? 'Tạo tài liệu mới' : 'Create New Document',
      description: isVietnamese ? 'Mở trình soạn thảo tài liệu & wiki' : 'Quickly open documentation wiki to write a new doc',
      icon: FileText,
      badge: 'Tài liệu',
      action: () => {
        onNavigateTab('docs');
        addSyncLog('Command: Navigated to Docs');
      },
    },
    {
      id: 'goto-inbox',
      name: '/inbox',
      label: isVietnamese ? 'Hộp thư thông báo' : 'Go to Inbox',
      description: isVietnamese ? 'Kiểm tra thông báo và hoạt động mới' : 'Check unread notifications and activity updates',
      icon: LayoutDashboard,
      badge: 'Thông báo',
      action: () => {
        onNavigateTab('inbox');
        addSyncLog('Command: Opened Inbox');
      },
    },
    {
      id: 'goto-calendar',
      name: '/calendar',
      label: isVietnamese ? 'Lịch biểu & Hạn chót' : 'Go to Calendar',
      description: isVietnamese ? 'Xem lịch làm việc, hạn chót và sự kiện' : 'View schedule, deadlines, and events',
      icon: Calendar,
      badge: 'Lịch',
      action: () => {
        onNavigateTab('calendar');
        addSyncLog('Command: Opened Calendar');
      },
    },
    {
      id: 'goto-goals',
      name: '/goals',
      label: isVietnamese ? 'Mục tiêu & OKRs' : 'Goals & OKRs',
      description: isVietnamese ? 'Theo dõi mục tiêu, key results và tiến độ chiến lược' : 'Track objectives, key results, and strategic progress',
      icon: Target,
      badge: 'OKR',
      action: () => {
        onNavigateTab('goals');
        addSyncLog('Command: Opened Goals & OKRs');
      },
    },
    {
      id: 'goto-chat',
      name: '/chat',
      label: isVietnamese ? 'Kênh trò chuyện nhóm' : 'Go to Chat Channels',
      description: isVietnamese ? 'Nhắn tin thảo luận thời gian thực' : 'Open real-time team messaging',
      icon: MessageSquare,
      badge: 'Trò chuyện',
      action: () => {
        onNavigateTab('chat');
        addSyncLog('Command: Opened Chat');
      },
    },
    {
      id: 'goto-base',
      name: '/base',
      label: isVietnamese ? 'Cơ sở dữ liệu Base' : 'Open Apexa Base',
      description: isVietnamese ? 'Bảng dữ liệu no-code và các dạng xem linh hoạt' : 'No-code database tables and records',
      icon: Database,
      badge: 'Database',
      action: () => {
        onNavigateTab('base');
        addSyncLog('Command: Opened Apexa Base');
      },
    },
    {
      id: 'goto-crm',
      name: '/crm',
      label: isVietnamese ? 'Quản lý khách hàng CRM' : 'Open CRM Pipeline',
      description: isVietnamese ? 'Quản lý cơ hội, khách hàng doanh nghiệp và báo giá' : 'Deals pipeline, accounts and quotations',
      icon: TrendingUp,
      badge: 'CRM',
      action: () => {
        onNavigateTab('crm');
        addSyncLog('Command: Opened CRM');
      },
    },
    {
      id: 'goto-erp',
      name: '/erp',
      label: isVietnamese ? 'Quản trị doanh nghiệp ERP' : 'Open ERP Enterprise Hub',
      description: isVietnamese ? 'Kho hàng, đơn bán hàng, mua hàng và tính lương tự động' : 'Inventory, Sales Orders, Procurement & Payroll',
      icon: Boxes,
      badge: 'ERP',
      action: () => {
        onNavigateTab('erp');
        addSyncLog('Command: Opened ERP');
      },
    },
    {
      id: 'goto-finance',
      name: '/finance',
      label: isVietnamese ? 'Tài chính & Hóa đơn' : 'Open Finance & Invoices',
      description: isVietnamese ? 'Quản lý thu chi, công nợ và xuất hóa đơn VAT' : 'Cashflow, invoices, expenses and profit analytics',
      icon: DollarSign,
      badge: 'Tài chính',
      action: () => {
        onNavigateTab('finance');
        addSyncLog('Command: Opened Finance');
      },
    },
    {
      id: 'open-ai',
      name: '/ai',
      label: isVietnamese ? 'Trợ lý AI Apexa Brain' : 'Launch Apexa Brain AI Assistant',
      description: isVietnamese ? 'Hỏi AI, tóm tắt không gian, tạo PRD hoặc lập kế hoạch' : 'Ask AI, summarize workspace, generate tasks or PRDs',
      icon: Sparkles,
      badge: 'AI',
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
      label: isVietnamese ? 'Bảng vẽ tương tác' : 'Open Whiteboard',
      description: isVietnamese ? 'Phác thảo ý tưởng, vẽ sơ đồ tư duy & flow' : 'Interactive canvas for sketching & diagramming',
      icon: Grid,
      badge: 'Bảng vẽ',
      action: () => {
        onNavigateTab('whiteboard');
        addSyncLog('Command: Opened Whiteboard');
      },
    },
    {
      id: 'goto-analytics',
      name: '/analytics',
      label: isVietnamese ? 'Báo cáo & Phân tích' : 'Open Analytics',
      description: isVietnamese ? 'Biểu đồ hiệu suất, tỷ lệ hoàn thành công việc' : 'Performance metrics and completion charts',
      icon: BarChart,
      badge: 'Báo cáo',
      action: () => {
        onNavigateTab('analytics');
        addSyncLog('Command: Opened Analytics');
      },
    },
    {
      id: 'goto-team',
      name: '/team',
      label: isVietnamese ? 'Danh bạ nhân sự Team OS' : 'Open Team OS',
      description: isVietnamese ? 'Xem danh sách thành viên, sơ đồ tổ chức và vai trò' : 'View team members directory and roles',
      icon: Users,
      badge: 'Nhân sự',
      action: () => {
        onNavigateTab('team');
        addSyncLog('Command: Opened Team OS');
      },
    },
    {
      id: 'open-settings',
      name: '/settings',
      label: isVietnamese ? 'Cài đặt không gian làm việc' : 'Open Workspace Settings',
      description: isVietnamese ? 'Cấu hình quyền hạn, thông báo & tùy chỉnh' : 'Configure workspace, notifications & preferences',
      icon: Settings,
      badge: 'Cài đặt',
      action: () => {
        if (onOpenSettings) onOpenSettings();
        else onNavigateTab('settings');
        addSyncLog('Command: Opened Settings');
      },
    },
    {
      id: 'open-automations',
      name: '/automation',
      label: isVietnamese ? 'Quy trình tự động hóa' : 'Automation Rules Engine',
      description: isVietnamese ? 'Thiết lập kích hoạt không cần mã code & cảnh báo' : 'Configure no-code triggers, alerts, and workflow rules',
      icon: Zap,
      badge: 'Tự động',
      action: () => {
        if (onOpenAutomations) onOpenAutomations();
        addSyncLog('Command: Opened Automation Engine');
      },
    },
    {
      id: 'open-export',
      name: '/export',
      label: isVietnamese ? 'Xuất dữ liệu & Sao lưu' : 'Export Data & Backup',
      description: isVietnamese ? 'Tải về toàn bộ công việc, tài liệu dạng CSV / JSON' : 'Download workspace tasks, docs, CSV, or HTML report',
      icon: Download,
      badge: 'Dữ liệu',
      action: () => {
        if (onOpenExport) onOpenExport();
        addSyncLog('Command: Opened Export Center');
      },
    },
    {
      id: 'toggle-theme',
      name: '/theme',
      label: isDarkMode ? (isVietnamese ? 'Chuyển sang giao diện Sáng' : 'Switch to Light Mode') : (isVietnamese ? 'Chuyển sang giao diện Tối' : 'Switch to Dark Mode'),
      description: isVietnamese ? 'Thay đổi chủ đề màu sắc hệ thống' : 'Toggle UI color theme',
      icon: isDarkMode ? Sun : Moon,
      badge: 'Giao diện',
      action: () => {
        if (onToggleDarkMode) onToggleDarkMode();
        addSyncLog('Command: Toggled Dark/Light Mode');
      },
    },
  ], [onNavigateTab, onOpenSettings, onOpenAutomations, onOpenExport, onToggleDarkMode, isDarkMode, addSyncLog, isVietnamese]);

  // Workspace Chat Channels
  const activeSpaces = useMemo(
    () => spaces.filter(space => space.workspaceId === activeWorkspaceId && !space.isArchived && !space.isHidden),
    [spaces, activeWorkspaceId]
  );

  const workspaceChannels = useMemo(() => {
    const directory = [
      { id: `${activeWorkspaceId}:general`, name: 'general', description: isVietnamese ? 'Kênh thảo luận chung không gian' : 'General workspace discussion', type: 'public' },
      { id: `${activeWorkspaceId}:apexa-brain-ai`, name: 'apexa-brain-ai', description: isVietnamese ? 'Trợ lý AI Apexa Brain' : 'Workspace AI assistant', type: 'public' },
      ...activeSpaces.flatMap(space => (space.channels || []).map(channel => ({
        ...channel,
        id: channel.id.includes(':') ? channel.id : `${activeWorkspaceId}:space-${space.id}-${channel.id}`,
        description: channel.description || `${isVietnamese ? 'Kênh trong' : 'Channel in'} ${space.name}`,
        type: channel.type || 'public',
      }))),
    ];
    return Array.from(new Map(directory.map(channel => [channel.id, channel])).values());
  }, [activeSpaces, activeWorkspaceId, isVietnamese]);

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

  // Filtered Spaces
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
      normalizeSearchText(c.description || '').includes(q)
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
    ));
  }, [members, activeWorkspaceId, searchQuery]);

  // Filtered Commands
  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.startsWith('/')) {
      const cmdQuery = q.slice(1);
      return systemCommands.filter(c =>
        c.name.toLowerCase().includes(q) ||
        normalizeSearchText(c.label).includes(cmdQuery) ||
        normalizeSearchText(c.description).includes(cmdQuery)
      );
    }
    if (!q) return systemCommands;
    return systemCommands.filter(c =>
      normalizeSearchText(c.label).includes(q) ||
      normalizeSearchText(c.description).includes(q) ||
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

    if (isCommandMode) {
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

  // Auto-scroll selected item into view
  useEffect(() => {
    if (flatResults.length > 0 && resultsContainerRef.current) {
      const activeEl = document.getElementById(`global-search-result-${selectedIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, flatResults.length]);

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
      const categories: SearchCategory[] = ['all', 'tasks', 'docs', 'spaces', 'channels', 'members', 'commands'];
      const currentIndex = categories.indexOf(searchCategory);
      const nextCategory = categories[(currentIndex + 1) % categories.length];
      setSearchCategory(nextCategory);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      setSearchQuery('');
    }
  };

  const executeResultItem = (item: { type: string; data: any }) => {
    saveRecentSearch(searchQuery);
    onClose();
    setSearchQuery('');
    if (item.type === 'task') {
      onSelectTask(item.data.id);
      addSyncLog(`Chuyển đến công việc: "${item.data.title}"`);
    } else if (item.type === 'doc') {
      onSelectDoc(item.data.id);
      addSyncLog(`Mở tài liệu: "${item.data.title}"`);
    } else if (item.type === 'space') {
      onSelectSpace(item.data.id);
      addSyncLog(`Mở không gian: "${item.data.name}"`);
    } else if (item.type === 'channel') {
      onSelectChannel(item.data.id);
      addSyncLog(`Mở kênh chat: #${item.data.name}`);
    } else if (item.type === 'member') {
      if (onSelectMember) onSelectMember(item.data.id);
      else onNavigateTab('team');
      addSyncLog(`Xem thông tin thành viên: ${item.data.name}`);
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

  // Text highlight helper
  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text;
    const cleanQ = query.trim();
    if (!cleanQ || cleanQ.startsWith('/')) return text;
    const parts = text.split(new RegExp(`(${cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === cleanQ.toLowerCase() ? (
            <mark key={i} className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black rounded-xs px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[8vh] sm:pt-[10vh] overflow-hidden font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => {
            onClose();
            setSearchQuery('');
          }}
          className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Body (Raycast/Spotlight Island) */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-search-title"
          initial={{ scale: 0.95, opacity: 0, y: -16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -16 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white/98 dark:bg-[#0c0f17]/98 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl w-[min(95vw,672px)] max-sm:w-full max-sm:mx-2 overflow-hidden shadow-2xl flex flex-col max-h-[90dvh] z-10"
        >
          <h2 id="global-search-title" className="sr-only">
            {isVietnamese ? 'Tìm kiếm toàn cục Apexa' : 'Apexa Global Search'}
          </h2>

          {/* Search Input Bar */}
          <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/40 focus-within:border-indigo-500/60 transition-colors">
            {isCommandMode ? (
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 animate-pulse" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
            )}
            
            <input
              ref={inputRef}
              type="text"
              placeholder={
                isCommandMode
                  ? (isVietnamese ? "Nhập lệnh hệ thống (ví dụ: /task, /doc, /crm, /erp, /ai)..." : "Type command (e.g. /task, /doc, /crm, /erp, /ai)...")
                  : (isVietnamese ? "Tìm kiếm công việc, tài liệu, không gian, CRM, ERP, thành viên..." : "Search tasks, documents, spaces, CRM, ERP, members...")
              }
              value={searchQuery}
              aria-label={isVietnamese ? "Tìm kiếm toàn cục" : "Global search input"}
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
              className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 font-sans text-[13.5px] font-semibold focus:outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 min-h-[44px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {isVietnamese ? 'Xóa' : 'Clear'}
              </button>
            )}

            <button
              type="button"
              aria-label={isVietnamese ? "Đóng tìm kiếm" : "Close search"}
              onClick={() => {
                onClose();
                setSearchQuery('');
              }}
              className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter Pills (When search query exists or in command mode) */}
          {(searchQuery.trim() !== '' || isCommandMode) && (
            <div className="px-5 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 min-h-[52px]">
              <button
                onClick={() => setSearchCategory('all')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1 ${
                  searchCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                {isVietnamese ? 'Tất cả' : 'All'} ({totalResultsCount})
              </button>
              <button
                onClick={() => setSearchCategory('tasks')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'tasks'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Briefcase className="w-3 h-3 shrink-0" />
                <span>{isVietnamese ? 'Công việc' : 'Tasks'} ({filteredTasks.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('docs')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'docs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span>{isVietnamese ? 'Tài liệu' : 'Docs'} ({filteredDocs.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('spaces')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'spaces'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Layers3 className="w-3 h-3 shrink-0" />
                <span>{isVietnamese ? 'Không gian' : 'Spaces'} ({filteredSpaces.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('channels')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'channels'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Hash className="w-3 h-3 shrink-0" />
                <span>{isVietnamese ? 'Trò chuyện' : 'Chat'} ({filteredChannels.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('members')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'members'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <UserIcon className="w-3 h-3 shrink-0" />
                <span>{isVietnamese ? 'Thành viên' : 'Members'} ({filteredMembers.length})</span>
              </button>
              <button
                onClick={() => setSearchCategory('commands')}
                type="button"
                className={`px-3 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer text-nowrap select-none flex items-center gap-1.5 ${
                  searchCategory === 'commands'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <Terminal className="w-3 h-3 shrink-0" />
                <span>{isVietnamese ? 'Lệnh' : 'Commands'} ({filteredCommands.length})</span>
              </button>
            </div>
          )}

          {/* Body Content */}
          <div
            id="global-search-results"
            ref={resultsContainerRef}
            role="listbox"
            aria-live="polite"
            className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[58vh]"
          >
            {searchQuery.trim() === '' && !isCommandMode ? (
              // Default Welcome / Quick Suggestions & Recents Screen
              <div className="space-y-4 p-1">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] uppercase font-mono font-black tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        <span>TÌM KIẾM GẦN ĐÂY</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRecentSearches([]);
                          localStorage.removeItem(RECENT_SEARCHES_KEY);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        Xóa lịch sử
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSearchQuery(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold flex items-center gap-2 group cursor-pointer transition-all"
                        >
                          <History className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                          <span>{item}</span>
                          <span
                            onClick={(e) => removeRecentSearch(e, item)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                            title="Xóa mục này"
                          >
                            ×
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Navigation Cards */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono font-black tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                    GỢI Ý TRUY CẬP NHANH
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { query: '/task', title: 'Tạo công việc mới', desc: 'Mở bảng tạo task nhanh', icon: Briefcase, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400' },
                      { query: '/crm', title: 'CRM & Khách hàng B2B', desc: 'Xem pipeline & cơ hội', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' },
                      { query: '/erp', title: 'ERP Quản trị doanh nghiệp', desc: 'Kho hàng, đơn hàng & lương', icon: Boxes, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' },
                      { query: '/ai', title: 'Trợ lý AI Apexa Brain', desc: 'Hỏi đáp & hỗ trợ thông minh', icon: Sparkles, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400' },
                    ].map(card => (
                      <button
                        key={card.query}
                        onClick={() => {
                          setSearchQuery(card.query);
                        }}
                        className="p-3 text-left bg-slate-50/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${card.color}`}>
                            <card.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{card.title}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{card.desc}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Modules Shortcuts */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] uppercase font-mono font-black tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                    LỆNH HỆ THỐNG PHỔ BIẾN
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {systemCommands.slice(0, 8).map(cmd => (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          onClose();
                          cmd.action();
                        }}
                        className="p-2 text-left bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2 group cursor-pointer transition-all"
                      >
                        <span className="text-[10px] font-mono font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-900/60">
                          {cmd.name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                          {cmd.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : flatResults.length === 0 ? (
              // Empty State
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isVietnamese ? 'Không tìm thấy kết quả phù hợp' : 'No results found'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                  {isCommandMode
                    ? (isVietnamese ? 'Không có lệnh nào khớp với từ khóa. Thử gõ /task, /doc, /crm, /erp, /ai hoặc /settings.' : 'No commands match. Try typing /task, /doc, /crm, /erp, /ai, or /settings.')
                    : (isVietnamese ? 'Hệ thống đã tìm trong công việc, tài liệu, không gian, CRM, ERP và thành viên nhưng không có kết quả.' : 'We searched tasks, documents, spaces, CRM, ERP, and members but found no matches.')}
                </p>
              </div>
            ) : (
              // Results List (Flattened for keyboard indexing & rich details)
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
                            ? 'bg-purple-500/10 border-purple-500/60 shadow-xs text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-purple-50/20 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 shrink-0 shadow-xs">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="truncate min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                {cmd.name}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {cmd.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                              {cmd.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase font-mono px-2 py-0.5 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-100 dark:border-purple-900">
                            {cmd.badge || 'LỆNH'}
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 text-purple-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
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
                            ? 'bg-indigo-500/10 border-indigo-500/60 shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-indigo-50/20 hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="truncate min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-indigo-600 transition-colors truncate">
                              {highlightMatch(t.title, searchQuery)}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                              <span className="truncate">{t.description ? highlightMatch(t.description, searchQuery) : (isVietnamese ? 'Không có mô tả' : 'No description')}</span>
                              {t.dueDate && (
                                <span className="shrink-0 text-amber-600 dark:text-amber-400 font-bold">
                                  • {isVietnamese ? 'Hạn:' : 'Due:'} {t.dueDate.split('T')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.priority && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                              t.priority === 'urgent' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' :
                              t.priority === 'high' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' :
                              'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {t.priority}
                            </span>
                          )}
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase ${
                              t.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400'
                                : t.status === 'inprogress'
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400'
                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {t.status}
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 text-indigo-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
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
                            ? 'bg-pink-500/10 border-pink-500/60 shadow-xs ring-2 ring-pink-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-pink-50/20 hover:border-pink-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 shrink-0 shadow-xs">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-pink-600 transition-colors truncate">
                              {highlightMatch(d.title, searchQuery)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                              {isVietnamese ? 'Danh mục:' : 'Category:'} {d.category || 'Wiki'} • {isVietnamese ? 'Cập nhật bởi:' : 'Updated by:'} {d.updatedBy || 'User'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-black bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-lg uppercase font-mono">
                            TÀI LIỆU
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 text-pink-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
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
                            ? 'bg-cyan-500/10 border-cyan-500/60 shadow-xs ring-2 ring-cyan-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-cyan-50/20 hover:border-cyan-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 shrink-0 shadow-xs">
                            <Layers3 className="w-4 h-4" />
                          </div>
                          <div className="truncate min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-cyan-600 transition-colors truncate">
                              {space.emoji ? `${space.emoji} ` : ''}{highlightMatch(space.name, searchQuery)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                              {space.lists?.length || 0} {isVietnamese ? 'danh sách công việc' : 'task lists'} • {space.channels?.length || 0} {isVietnamese ? 'kênh chat' : 'channels'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-black bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-900 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-lg uppercase font-mono">
                            KHÔNG GIAN
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 text-cyan-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
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
                            ? 'bg-purple-500/10 border-purple-500/60 shadow-xs ring-2 ring-purple-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-purple-50/20 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0 shadow-xs">
                            <Hash className="w-4 h-4" />
                          </div>
                          <div className="truncate min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-purple-600 transition-colors truncate">
                              #{highlightMatch(c.name, searchQuery)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                              {c.description ? highlightMatch(c.description, searchQuery) : (isVietnamese ? 'Kênh trao đổi' : 'Chat channel')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-black bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg uppercase font-mono">
                            TRÒ CHUYỆN
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 text-purple-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
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
                            ? 'bg-teal-500/10 border-teal-500/60 shadow-xs ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-teal-50/20 hover:border-teal-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block group-hover:text-teal-600 transition-colors truncate">
                              {highlightMatch(m.name, searchQuery)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                              {highlightMatch(m.email, searchQuery)} • {m.role} {m.department ? `(${m.department})` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-black bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-900 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-lg uppercase font-mono">
                            THÀNH VIÊN
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 text-teal-500 transition-all ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>

          {/* Footer Shortcuts Guide */}
          <div className="px-5 py-3 border-t border-slate-200/60 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300 shadow-3xs">↑↓</kbd>
                <span>{isVietnamese ? 'Di chuyển' : 'Navigate'}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300 shadow-3xs">↵</kbd>
                <span>{isVietnamese ? 'Mở chọn' : 'Open'}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300 shadow-3xs">Tab</kbd>
                <span>{isVietnamese ? 'Đổi danh mục' : 'Category'}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300 shadow-3xs">Esc</kbd>
                <span>{isVietnamese ? 'Thoát' : 'Exit'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">
                {isVietnamese ? 'Nhấn / để dùng lệnh' : 'Press / for commands'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
