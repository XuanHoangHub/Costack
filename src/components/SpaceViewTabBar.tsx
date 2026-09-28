"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
import {
  List, Kanban, Plus, Bot, Calendar, Table, CheckSquare, Clock,
  Sparkles, Pin, Hash, MoreHorizontal, ChevronRight, ChevronLeft,
  FileText, GanttChart, Cog, Users, Brain, Map as MapIcon,
  Pencil, Link as LinkIcon, Lock, Shield, Star, Copy, Trash2,
  Download, ArrowLeft, ArrowRight, Search, Check, Layers, SlidersHorizontal, Sliders, Activity, User as UserIcon,
  LayoutDashboard, Palette, BarChart3, ListTodo, Table2
} from 'lucide-react';
import { User, Space } from '../types';
import { useTranslation } from '../contexts/TranslationContext';

const VIEW_TRANSLATIONS: Record<string, { vi: string; en: string }> = {
  overview: { vi: 'Tổng quan', en: 'Overview' },
  list: { vi: 'Danh sách', en: 'List' },
  board: { vi: 'Bảng', en: 'Board' },
  table: { vi: 'Bảng dữ liệu', en: 'Table' },
  calendar: { vi: 'Lịch', en: 'Calendar' },
  gantt: { vi: 'Gantt', en: 'Gantt' },
  timeline: { vi: 'Dòng thời gian', en: 'Timeline' },
  dashboard: { vi: 'Bảng điều khiển', en: 'Dashboard' },
  whiteboard: { vi: 'Bảng trắng', en: 'Whiteboard' },
  workload: { vi: 'Khối lượng', en: 'Workload' },
  mindmap: { vi: 'Sơ đồ tư duy', en: 'Mindmap' },
  team: { vi: 'Thành viên', en: 'Team' },
  form: { vi: 'Biểu mẫu', en: 'Form' },
  map: { vi: 'Bản đồ', en: 'Map' },
  ai: { vi: 'Trợ lý AI', en: 'AI Copilot' },
  activity: { vi: 'Hoạt động', en: 'Activity' },
};

export const getLocalizedViewLabel = (label: string, viewId: string, locale: string): string => {
  const mapping = VIEW_TRANSLATIONS[viewId];
  if (!mapping) return label;
  const standardLabels = [
    'Tổng quan', 'Overview', 'Danh sách', 'List', 'Bảng', 'Board', 'Bảng Kanban', 'Kanban Board',
    'Bảng dữ liệu', 'Table', 'Lịch', 'Lịch biểu', 'Calendar', 'Tài liệu', 'Tài liệu Wiki', 'Docs', 'Wiki Docs',
    'Gantt', 'Biểu đồ Gantt', 'Gantt Chart', 'Dòng thời gian', 'Timeline', 'Bảng điều khiển', 'Dashboard',
    'Bảng trắng', 'Whiteboard', 'Khối lượng', 'Workload', 'Sơ đồ tư duy', 'Mindmap', 'Thành viên', 'Team',
    'Biểu mẫu', 'Form', 'Bản đồ', 'Map', 'Trợ lý AI', 'AI Copilot', 'Hoạt động', 'Activity'
  ];
  if (standardLabels.includes(label)) {
    return locale === 'vi' ? mapping.vi : mapping.en;
  }
  return label;
};

export type ViewSettingKey = 'pin' | 'private' | 'protect' | 'autosave' | 'default';

export interface ViewTabSettings {
  pin: boolean;
  private: boolean;
  protect: boolean;
  autosave: boolean;
  default: boolean;
}

export interface SpaceViewTab {
  id: string;
  label: string;
  viewId: string;
  icon: React.ElementType;
  settings: ViewTabSettings;
}

export const DEFAULT_VIEW_SETTINGS: ViewTabSettings = {
  pin: false,
  private: false,
  protect: false,
  autosave: true,
  default: false,
};

export const VIEW_ICON_MAP: Record<string, React.ElementType> = {
  channel: Hash,
  overview: LayoutDashboard,
  list: ListTodo,
  board: Kanban,
  calendar: Calendar,
  table: Table2,
  gantt: GanttChart,
  whiteboard: Palette,
  dashboard: BarChart3,
  timeline: Clock,
  activity: Activity,
  workload: Users,
  mindmap: Brain,
  team: UserIcon,
  form: CheckSquare,
  map: MapIcon,
  ai: Bot,
};

export const ALL_AVAILABLE_VIEWS = [
  {
    id: 'overview',
    label: 'Tổng quan',
    desc: 'Tổng hợp tiến độ, thống kê và tóm tắt AI',
    icon: LayoutDashboard,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.1)',
    category: 'core',
    isPro: false,
  },
  {
    id: 'list',
    label: 'Danh sách',
    desc: 'Theo dõi công việc theo hàng & nhóm trạng thái',
    icon: ListTodo,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.1)',
    category: 'core',
    isPro: false,
  },
  {
    id: 'board',
    label: 'Bảng Kanban',
    desc: 'Kéo thả thẻ công việc giữa các cột trực quan',
    icon: Kanban,
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    category: 'core',
    isPro: false,
  },
  {
    id: 'table',
    label: 'Bảng dữ liệu',
    desc: 'Quản lý bảng tính và chỉnh sửa hàng loạt',
    icon: Table2,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    category: 'core',
    isPro: false,
  },
  {
    id: 'calendar',
    label: 'Lịch biểu',
    desc: 'Lên lịch theo tháng, tuần và hạn chót deadline',
    icon: Calendar,
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.1)',
    category: 'core',
    isPro: false,
  },
  {
    id: 'gantt',
    label: 'Biểu đồ Gantt',
    desc: 'Lập kế hoạch tiến độ và quan hệ phụ thuộc',
    icon: GanttChart,
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.1)',
    category: 'planning',
    isPro: true,
  },
  {
    id: 'timeline',
    label: 'Dòng thời gian',
    desc: 'Theo dõi mốc thời gian và lộ trình sprint',
    icon: Clock,
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.1)',
    category: 'planning',
    isPro: true,
  },
  {
    id: 'dashboard',
    label: 'Bảng điều khiển',
    desc: 'Báo cáo chỉ số, biểu đồ KPI và năng suất',
    icon: BarChart3,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    category: 'planning',
    isPro: false,
  },
  {
    id: 'workload',
    label: 'Khối lượng công việc',
    desc: 'Phân bổ tài nguyên và cân bằng khối lượng nhân sự',
    icon: Users,
    color: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.1)',
    category: 'planning',
    isPro: true,
  },
  {
    id: 'whiteboard',
    label: 'Bảng trắng',
    desc: 'Phác thảo ý tưởng, vẽ sơ đồ và gắn sticky notes',
    icon: Palette,
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    category: 'creative',
    isPro: false,
  },
  {
    id: 'mindmap',
    label: 'Sơ đồ tư duy',
    desc: 'Trực quan hóa cấu trúc tư duy và phân nhánh',
    icon: Brain,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.1)',
    category: 'creative',
    isPro: true,
  },
  {
    id: 'ai',
    label: 'Trợ lý Costack AI',
    desc: 'Phân tích tự động, đề xuất ưu tiên và trợ giúp',
    icon: Bot,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    category: 'creative',
    isPro: true,
  },
  {
    id: 'form',
    label: 'Biểu mẫu thu thập',
    desc: 'Tạo form nhận yêu cầu và gửi công việc',
    icon: CheckSquare,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    category: 'creative',
    isPro: false,
  },
  {
    id: 'activity',
    label: 'Hoạt động & Lịch sử',
    desc: 'Nhật ký thay đổi và lịch sử chỉnh sửa thời gian thực',
    icon: Activity,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.1)',
    category: 'creative',
    isPro: false,
  },
  {
    id: 'team',
    label: 'Đội ngũ thành viên',
    desc: 'Quản lý phân công và tiến độ từng cá nhân',
    icon: UserIcon,
    color: '#9333ea',
    bg: 'rgba(147, 51, 234, 0.1)',
    category: 'creative',
    isPro: false,
  },
];

interface SpaceViewTabBarProps {
  tabs: SpaceViewTab[];
  onTabsChange: (newTabs: SpaceViewTab[]) => void;
  activeTabId: string;
  onSelectTab: (tabId: string, viewId: string) => void;
  activeSpace: Space;
  activeListId?: string | null;
  currentUser?: any;
  onUpgradePremium?: () => void;
  triggerToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  triggerConfirm?: (config: { title: string; description: string; onConfirm: () => void }) => void;
  onOpenFieldsPanel?: () => void;
  onExportCsv?: () => void;
  onOpenTemplates?: () => void;
  onOpenShareModal?: () => void;
  onAddSyncLog?: (msg: string) => void;
  onOpenCustomizeView?: (tabId: string) => void;
  showAddViewButton?: boolean;
}

export default function SpaceViewTabBar({
  tabs,
  onTabsChange,
  activeTabId,
  onSelectTab,
  activeSpace,
  activeListId,
  currentUser,
  onUpgradePremium,
  triggerToast,
  triggerConfirm,
  onOpenFieldsPanel,
  onExportCsv,
  onOpenTemplates,
  onOpenShareModal,
  onAddSyncLog,
  onOpenCustomizeView,
  showAddViewButton = false,
}: SpaceViewTabBarProps) {
  const { t, locale } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Add view modal/menu state
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuCoords, setAddMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const [searchViewQuery, setSearchViewQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'core' | 'planning' | 'creative'>('all');
  const [newTabPin, setNewTabPin] = useState(false);
  const [newTabPrivate, setNewTabPrivate] = useState(false);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    tabId: string;
  }>({
    show: false,
    x: 0,
    y: 0,
    tabId: '',
  });

  // Inline rename state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop reordering state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Check scroll capability
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs, checkScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const activeButton = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-space-view-tab]'))
      .find(button => button.dataset.tabId === activeTabId);
    if (!activeButton) return;
    activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    const timer = window.setTimeout(checkScroll, 260);
    return () => window.clearTimeout(timer);
  }, [activeTabId, checkScroll]);

  // Close context menu and add menu on window scroll/resize
  useEffect(() => {
    if (!contextMenu.show && !showAddMenu) return;
    const handleClose = () => {
      setContextMenu(prev => ({ ...prev, show: false }));
      setShowAddMenu(false);
    };
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [contextMenu.show, showAddMenu]);

  const handleToggleAddMenu = (e?: React.MouseEvent) => {
    if (showAddMenu) {
      setShowAddMenu(false);
      return;
    }
    const btn = addBtnRef.current || (e?.currentTarget as HTMLElement);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const menuWidth = 400;
      let left = rect.right - menuWidth;
      if (typeof window !== 'undefined') {
        left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));
      }
      setAddMenuCoords({
        top: rect.bottom + 8,
        left,
      });
    }
    setSearchViewQuery('');
    setShowAddMenu(true);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -220 : 220;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  // Focus rename input on start editing
  useEffect(() => {
    if (editingTabId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingTabId]);

  // Tab update helpers
  const updateSetting = (tabId: string, key: ViewSettingKey, value: boolean) => {
    onTabsChange(
      tabs.map(tab => {
        if (key === 'default') {
          return {
            ...tab,
            settings: { ...tab.settings, default: tab.id === tabId ? value : false },
          };
        }
        return tab.id === tabId
          ? { ...tab, settings: { ...tab.settings, [key]: value } }
          : tab;
      })
    );
    triggerToast?.('success', 'Cài đặt chế độ xem', value ? 'Đã bật tùy chọn.' : 'Đã tắt tùy chọn.');
  };

  const handleStartRename = (tab: SpaceViewTab) => {
    setEditingTabId(tab.id);
    setEditingLabel(tab.label);
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleSaveRename = (tabId: string) => {
    const trimmed = editingLabel.trim();
    if (trimmed && trimmed.length > 0) {
      onTabsChange(
        tabs.map(t => (t.id === tabId ? { ...t, label: trimmed } : t))
      );
      triggerToast?.('success', 'Đổi tên', `Đã đổi tên thành "${trimmed}".`);
    }
    setEditingTabId(null);
  };

  // Drag and drop reordering handlers
  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTabId(tabId);
  };

  const handleTabDragOver = (e: React.DragEvent, tabId: string) => {
    if (!draggedTabId || draggedTabId === tabId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';
    if (dragOverTabId !== tabId || dropPosition !== pos) {
      setDragOverTabId(tabId);
      setDropPosition(pos);
    }
  };

  const handleTabDragLeave = (e: React.DragEvent, tabId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverTabId === tabId) {
        setDragOverTabId(null);
        setDropPosition(null);
      }
    }
  };

  const handleTabDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetTabId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      setDropPosition(null);
      return;
    }
    const fromIdx = tabs.findIndex(t => t.id === draggedTabId);
    if (fromIdx === -1) return;

    const reordered = [...tabs];
    const [movedItem] = reordered.splice(fromIdx, 1);

    let toIdx = reordered.findIndex(t => t.id === targetTabId);
    if (toIdx === -1) return;
    if (dropPosition === 'after') {
      toIdx += 1;
    }
    reordered.splice(toIdx, 0, movedItem);

    onTabsChange(reordered);
    onAddSyncLog?.(`Đã sắp xếp lại chế độ xem: ${movedItem.label}`);
    setDraggedTabId(null);
    setDragOverTabId(null);
    setDropPosition(null);
  };

  const handleTabDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
    setDropPosition(null);
  };

  const handleDuplicateTab = (tabId: string) => {
    const target = tabs.find(t => t.id === tabId);
    if (!target) return;
    const newTabId = `tab-custom-${Date.now()}`;
    const newTab: SpaceViewTab = {
      ...target,
      id: newTabId,
      label: `${target.label} (Bản sao)`,
      settings: { ...target.settings, default: false },
    };
    onTabsChange([...tabs, newTab]);
    onSelectTab(newTabId, target.viewId);
    triggerToast?.('success', 'Nhân bản', `Đã nhân bản chế độ xem "${target.label}".`);
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleMoveTab = (tabId: string, direction: 'left' | 'right') => {
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tabs.length) return;

    const reordered = [...tabs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onTabsChange(reordered);
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleDeleteTab = (tabId: string) => {
    setContextMenu(prev => ({ ...prev, show: false }));
    if (tabs.length <= 1) {
      triggerToast?.('warning', 'Không thể xóa', 'Bạn phải giữ lại ít nhất một chế độ xem.');
      return;
    }
    const target = tabs.find(t => t.id === tabId);
    const doDelete = () => {
      const remaining = tabs.filter(t => t.id !== tabId);
      onTabsChange(remaining);
      if (tabId === activeTabId && remaining.length > 0) {
        const fallback = remaining.find(t => t.settings.default) || remaining[0];
        onSelectTab(fallback.id, fallback.viewId);
      }
      triggerToast?.('success', 'Đã xóa', `Đã xóa chế độ xem "${target?.label || ''}".`);
    };

    if (triggerConfirm) {
      triggerConfirm({
        title: 'Xóa chế độ xem',
        description: `Bạn có chắc chắn muốn xóa chế độ xem "${target?.label || ''}"?`,
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
  };

  const handleCopyLink = (tab: SpaceViewTab) => {
    const url = new URL(window.location.origin);
    url.searchParams.set('space', activeSpace.id);
    if (activeListId) url.searchParams.set('list', activeListId);
    url.searchParams.set('view', tab.viewId);
    navigator.clipboard.writeText(url.toString());
    triggerToast?.('success', 'Sao chép liên kết', 'Đã sao chép liên kết trực tiếp tới chế độ xem này.');
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleAddView = (viewDef: typeof ALL_AVAILABLE_VIEWS[0]) => {
    if (viewDef.isPro && !currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }

    // Check if view exists
    const existing = tabs.find(t => t.viewId === viewDef.id);
    if (existing) {
      onSelectTab(existing.id, existing.viewId);
      setShowAddMenu(false);
      triggerToast?.('info', 'Chuyển chế độ xem', `Đã chuyển tới "${existing.label}".`);
      return;
    }

    const newTabId = `tab-custom-${Date.now()}`;
    const newTab: SpaceViewTab = {
      id: newTabId,
      label: viewDef.label,
      viewId: viewDef.id,
      icon: viewDef.icon,
      settings: {
        ...DEFAULT_VIEW_SETTINGS,
        pin: newTabPin,
        private: newTabPrivate,
      },
    };

    onTabsChange([...tabs, newTab]);
    onSelectTab(newTabId, viewDef.id);
    setShowAddMenu(false);
    setSearchViewQuery('');
    onAddSyncLog?.(`Đã thêm chế độ xem: ${viewDef.label}`);
    triggerToast?.('success', 'Đã thêm chế độ xem', `Đã mở chế độ xem "${viewDef.label}".`);
  };

  // Filtered views in Add modal
  const filteredViews = useMemo(() => {
    return ALL_AVAILABLE_VIEWS.filter(v => {
      const matchCat = activeCategory === 'all' || v.category === activeCategory;
      const matchQuery =
        !searchViewQuery.trim() ||
        v.label.toLowerCase().includes(searchViewQuery.toLowerCase()) ||
        v.desc.toLowerCase().includes(searchViewQuery.toLowerCase()) ||
        v.id.toLowerCase().includes(searchViewQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchViewQuery]);

  // Context menu position logic
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 250;
    const menuHeight = 360;

    const isRightClick = e.type === 'contextmenu';

    // For right click: anchor to mouse position.
    // For click (3-dots button): anchor directly below the button.
    let x = isRightClick ? e.clientX : rect.left;
    let y = isRightClick ? e.clientY + 4 : rect.bottom + 6;

    if (typeof window !== 'undefined') {
      if (x + menuWidth > window.innerWidth - 12) {
        x = Math.max(12, isRightClick ? e.clientX - menuWidth : rect.right - menuWidth);
      }
      x = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));

      if (y + menuHeight > window.innerHeight - 12) {
        y = Math.max(12, (isRightClick ? e.clientY : rect.top) - menuHeight - 6);
      }
    }

    setContextMenu({
      show: true,
      x,
      y,
      tabId,
    });
  };

  const contextTab = tabs.find(t => t.id === contextMenu.tabId);

  return (
    <div className="apexa-space-view-switcher relative flex items-center gap-1.5 shrink-0 max-w-full">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="p-1 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all cursor-pointer z-10 shrink-0 tactile-press"
          title="Cuộn sang trái"
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Main Segmented Dock Container */}
      <div className="apexa-space-view-dock relative flex items-center bg-slate-100/90 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08] shadow-3xs backdrop-blur-md max-w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          role="tablist"
          aria-label="Chế độ xem Space"
          className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-0.5 scroll-smooth"
        >
          {tabs.map((tab) => {
            const TabIcon = VIEW_ICON_MAP[tab.viewId] || tab.icon || List;
            const isActive = activeTabId === tab.id;
            const isEditing = editingTabId === tab.id;
            const isPro = ['gantt', 'timeline', 'workload', 'mindmap', 'ai'].includes(tab.viewId);

            // Distinctive view color
            const viewDef = ALL_AVAILABLE_VIEWS.find(v => v.id === tab.viewId);
            const activeColor = viewDef?.color || '#4f46e5';

            return (
              <div
                key={tab.id}
                draggable={!isEditing}
                onDragStart={e => handleTabDragStart(e, tab.id)}
                onDragOver={e => handleTabDragOver(e, tab.id)}
                onDragLeave={e => handleTabDragLeave(e, tab.id)}
                onDrop={e => handleTabDrop(e, tab.id)}
                onDragEnd={handleTabDragEnd}
                onContextMenu={e => handleTabContextMenu(e, tab.id)}
                className={`relative group/tab flex items-center transition-all duration-150 ${
                  draggedTabId === tab.id ? 'opacity-35 scale-95' : ''
                }`}
              >
                {/* Drop Insertion Indicator */}
                {dragOverTabId === tab.id && draggedTabId !== tab.id && (
                  <div
                    className={`absolute top-1 bottom-1 w-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full z-30 pointer-events-none ${
                      dropPosition === 'before' ? '-left-0.5' : '-right-0.5'
                    }`}
                  />
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  data-space-view-tab
                  data-tab-id={tab.id}
                  onClick={() => {
                    if (isPro && !currentUser?.isPremium) {
                      onUpgradePremium?.();
                      return;
                    }
                    onSelectTab(tab.id, tab.viewId);
                  }}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    const tabList = event.currentTarget.closest('[role="tablist"]');
                    const tabButtons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')) : [];
                    if (tabButtons.length === 0) return;
                    event.preventDefault();
                    const currentIndex = tabButtons.indexOf(event.currentTarget);
                    const nextIndex = event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabButtons.length - 1
                        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
                    tabButtons[nextIndex]?.focus();
                    tabButtons[nextIndex]?.click();
                  }}
                  onDoubleClick={() => handleStartRename(tab)}
                  className={`apexa-space-view-tab relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-grab active:cursor-grabbing select-none shrink-0 tactile-press ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Fluid Framer Motion Background Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSpaceViewTabPill"
                      transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.8 }}
                      className="apexa-space-tab-active absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-slate-200/90 dark:border-white/10 card-bevel-edge"
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-1.5">
                    {/* Icon */}
                    <TabIcon
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover/tab:scale-110 shrink-0"
                      style={{ color: isActive ? activeColor : undefined }}
                    />

                    {/* Label or Modern Inline Input (No awkward border/pill) */}
                    {isEditing ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={editingLabel}
                        onChange={e => setEditingLabel(e.target.value)}
                        onBlur={() => handleSaveRename(tab.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRename(tab.id);
                          if (e.key === 'Escape') setEditingTabId(null);
                        }}
                        className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500/40 w-28 shadow-3xs"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate max-w-[130px]">{getLocalizedViewLabel(tab.label, tab.viewId, locale)}</span>
                    )}

                    {/* Indicators */}
                    {tab.settings.pin && (
                      <span title="Đã ghim" className="flex items-center">
                        <Pin className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500/20 shrink-0" />
                      </span>
                    )}
                    {tab.settings.private && (
                      <span title="Chế độ riêng tư" className="flex items-center">
                        <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      </span>
                    )}
                    {tab.settings.protect && (
                      <span title="Khóa chỉnh sửa" className="flex items-center">
                        <Shield className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      </span>
                    )}

                    {isPro && !currentUser?.isPremium && (
                      <span className="text-[8px] font-extrabold tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1 py-0.5 rounded leading-none shadow-3xs">
                        PRO
                      </span>
                    )}
                  </span>
                </button>

                {/* 3-dots context menu trigger on hover */}
                <button
                  type="button"
                  onClick={e => handleTabContextMenu(e, tab.id)}
                  className={`relative z-10 p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-all duration-150 cursor-pointer overflow-hidden flex items-center justify-center ${
                    contextMenu.show && contextMenu.tabId === tab.id
                      ? 'opacity-100 w-5 ml-0.5'
                      : 'opacity-0 w-0 pointer-events-none group-hover/tab:opacity-100 group-hover/tab:w-5 group-hover/tab:ml-0.5 group-hover/tab:pointer-events-auto'
                  }`}
                  title="Tùy chọn chế độ xem"
                  aria-label={`Tùy chọn cho chế độ xem ${tab.label}`}
                >
                  <MoreHorizontal className="w-3 h-3 shrink-0" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add View "+" Button */}
        {showAddViewButton && (
          <div className="relative shrink-0 pl-1 border-l border-slate-200/80 dark:border-slate-800/80">
            <button
              ref={addBtnRef}
              type="button"
              onClick={handleToggleAddMenu}
              className={`apexa-space-add-view flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tactile-press ${
                showAddMenu
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-white/80 dark:hover:bg-slate-800/60'
              }`}
              title="Thêm chế độ xem"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">{locale === 'vi' ? 'Thêm xem' : 'Add View'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="p-1 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all cursor-pointer z-10 shrink-0 tactile-press"
          title="Cuộn sang phải"
          aria-label="Cuộn sang phải"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Modern Tab Context Menu Dropdown */}
      {contextMenu.show && contextTab && (
        <Portal>
          <div
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setContextMenu(prev => ({ ...prev, show: false }))}
            onContextMenu={e => {
              e.preventDefault();
              setContextMenu(prev => ({ ...prev, show: false }));
            }}
          />
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed w-[250px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xl z-50 text-left font-sans select-none overflow-hidden py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header info */}
            <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{getLocalizedViewLabel(contextTab.label, contextTab.viewId, locale)}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">{contextTab.viewId}</span>
            </div>

            {/* Customize view */}
            {onOpenCustomizeView && (
              <button
                onClick={() => {
                  setContextMenu(prev => ({ ...prev, show: false }));
                  onOpenCustomizeView(contextTab.id);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors text-indigo-600 dark:text-indigo-400"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{locale === 'vi' ? 'Tùy chỉnh chế độ xem...' : 'Customize view...'}</span>
              </button>
            )}

            {/* Rename */}
            <button
              onClick={() => handleStartRename(contextTab)}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>{locale === 'vi' ? 'Đổi tên chế độ xem' : 'Rename view'}</span>
            </button>

            {/* Set as default */}
            <button
              onClick={() => {
                updateSetting(contextTab.id, 'default', !contextTab.settings.default);
                setContextMenu(prev => ({ ...prev, show: false }));
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Star className={`w-3.5 h-3.5 ${contextTab.settings.default ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>{locale === 'vi' ? 'Đặt làm mặc định' : 'Set as default'}</span>
              </div>
              {contextTab.settings.default && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {/* Duplicate */}
            <button
              onClick={() => handleDuplicateTab(contextTab.id)}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{locale === 'vi' ? 'Nhân bản chế độ xem' : 'Duplicate view'}</span>
            </button>

            {/* Copy link */}
            <button
              onClick={() => handleCopyLink(contextTab)}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{locale === 'vi' ? 'Sao chép liên kết' : 'Copy link'}</span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            {/* Pin Toggle */}
            <button
              onClick={() => {
                updateSetting(contextTab.id, 'pin', !contextTab.settings.pin);
                setContextMenu(prev => ({ ...prev, show: false }));
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Pin className={`w-3.5 h-3.5 ${contextTab.settings.pin ? 'text-indigo-600 fill-indigo-600/20' : 'text-slate-400'}`} />
                <span>{locale === 'vi' ? 'Ghim vào thanh tab' : 'Pin view'}</span>
              </div>
              {contextTab.settings.pin && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {/* Lock/Protect toggle */}
            <button
              onClick={() => {
                updateSetting(contextTab.id, 'protect', !contextTab.settings.protect);
                setContextMenu(prev => ({ ...prev, show: false }));
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className={`w-3.5 h-3.5 ${contextTab.settings.protect ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{locale === 'vi' ? 'Khóa chỉnh sửa' : 'Lock editing'}</span>
              </div>
              {contextTab.settings.protect && <Check className="w-3.5 h-3.5 text-amber-500" />}
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            {/* Reorder Buttons */}
            <div className="px-3.5 py-1 flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-medium">{locale === 'vi' ? 'Thứ tự vị trí' : 'Position'}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveTab(contextTab.id, 'left')}
                  disabled={tabs.findIndex(t => t.id === contextTab.id) === 0}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Di chuyển sang trái"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveTab(contextTab.id, 'right')}
                  disabled={tabs.findIndex(t => t.id === contextTab.id) === tabs.length - 1}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Di chuyển sang phải"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Delete view (disabled if last tab) */}
            {tabs.length > 1 && (
              <>
                <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                <button
                  onClick={() => handleDeleteTab(contextTab.id)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left cursor-pointer font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{locale === 'vi' ? 'Xóa chế độ xem' : 'Delete view'}</span>
                </button>
              </>
            )}
          </div>
        </Portal>
      )}

      {/* Add View Modal/Dropdown */}
      <AnimatePresence>
        {showAddMenu && (
          <Portal>
            <div
              className="fixed inset-0 z-50 bg-black/20"
              onClick={() => setShowAddMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: addMenuCoords?.top ?? 60,
                left: addMenuCoords?.left ?? 16,
              }}
              className="w-[340px] sm:w-[420px] max-w-[calc(100vw-24px)] bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-3.5 font-sans select-none"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 mb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{locale === 'vi' ? 'Thêm chế độ xem' : 'Add View'}</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {locale === 'vi' ? 'Lựa chọn cách hiển thị dữ liệu phù hợp với quy trình làm việc' : 'Choose how to visualize and manage your workflow data'}
                  </p>
                </div>
              </div>

              {/* Search view input */}
              <div className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 mb-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors shrink-0" />
                <input
                  type="text"
                  placeholder={locale === 'vi' ? 'Tìm loại chế độ xem...' : 'Search view types...'}
                  value={searchViewQuery}
                  onChange={e => setSearchViewQuery(e.target.value)}
                  data-no-focus-outline="true"
                  className="apexa-search-input bg-transparent border-none !border-0 outline-none !outline-none focus:outline-none focus:!outline-none focus-visible:outline-none focus-visible:!outline-none focus:ring-0 focus:!ring-0 text-xs font-semibold text-slate-800 dark:text-slate-100 w-full placeholder:text-slate-400 shadow-none"
                />
                {searchViewQuery && (
                  <button type="button" onClick={() => setSearchViewQuery('')} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer">✕</button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 mb-2.5 overflow-x-auto scrollbar-none pb-0.5">
                {[
                  { id: 'all', label: locale === 'vi' ? 'Tất cả' : 'All' },
                  { id: 'core', label: locale === 'vi' ? 'Cơ bản' : 'Core' },
                  { id: 'planning', label: locale === 'vi' ? 'Kế hoạch' : 'Planning' },
                  { id: 'creative', label: locale === 'vi' ? 'Sáng tạo' : 'Creative' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Views Grid List */}
              <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {filteredViews.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    {locale === 'vi' ? 'Không tìm thấy chế độ xem phù hợp' : 'No matching views found'}
                  </div>
                ) : (
                  filteredViews.map(v => {
                    const isAlreadyAdded = tabs.some(t => t.viewId === v.id);
                    const VIcon = v.icon;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleAddView(v)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left cursor-pointer border ${
                          isAlreadyAdded
                            ? 'border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-900/30 dark:bg-indigo-950/20'
                            : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-3xs"
                            style={{ backgroundColor: v.bg, color: v.color }}
                          >
                            <VIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                {getLocalizedViewLabel(v.label, v.id, locale)}
                              </span>
                              {v.isPro && !currentUser?.isPremium && (
                                <span className="text-[8px] font-black tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1 py-0.5 rounded leading-none">
                                  PRO
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5 font-medium">
                              {v.desc}
                            </p>
                          </div>
                        </div>

                        {isAlreadyAdded && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-md shrink-0 ml-2">
                            {locale === 'vi' ? 'Đang mở' : 'Open'}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Pin / Private options when creating view */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold">
                  <input
                    type="checkbox"
                    checked={newTabPin}
                    onChange={e => setNewTabPin(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                  />
                  <span>{locale === 'vi' ? 'Ghim vào thanh tab' : 'Pin tab'}</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold">
                  <input
                    type="checkbox"
                    checked={newTabPrivate}
                    onChange={e => setNewTabPrivate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                  />
                  <span>{locale === 'vi' ? 'Chế độ riêng tư' : 'Private view'}</span>
                </label>
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
