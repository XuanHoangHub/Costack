"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  List, Kanban, Plus, Bot, Calendar, Table, CheckSquare, Clock,
  Sparkles, Pin, Hash, MoreHorizontal, ChevronRight, ChevronLeft,
  FileText, GanttChart, Cog, Users, Brain, Map as MapIcon,
  Pencil, Link as LinkIcon, Lock, Shield, Star, Copy, Trash2,
  Download, ArrowLeft, ArrowRight, Search, Check, Layers, SlidersHorizontal, Activity, User as UserIcon
} from 'lucide-react';
import { User, Space } from '../types';

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
  overview: FileText,
  list: List,
  board: Kanban,
  doc: FileText,
  calendar: Calendar,
  table: Table,
  gantt: GanttChart,
  whiteboard: Sparkles,
  dashboard: SlidersHorizontal,
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
    icon: FileText,
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.1)',
    category: 'core',
    isPro: false,
  },
  {
    id: 'list',
    label: 'Danh sách',
    desc: 'Theo dõi công việc theo hàng & nhóm trạng thái',
    icon: List,
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
    icon: Table,
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
    id: 'doc',
    label: 'Tài liệu Wiki',
    desc: 'Ghi chú văn bản, tài liệu dự án và cộng tác',
    icon: FileText,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
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
    icon: SlidersHorizontal,
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
    icon: Sparkles,
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
    label: 'Trợ lý Apexa AI',
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
}: SpaceViewTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Add view modal/menu state
  const [showAddMenu, setShowAddMenu] = useState(false);
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
    setContextMenu({
      show: true,
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: rect.bottom + 8,
      tabId,
    });
  };

  const contextTab = tabs.find(t => t.id === contextMenu.tabId);

  return (
    <div className="relative flex items-center gap-1.5 shrink-0 max-w-full">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all cursor-pointer z-10 shrink-0"
          title="Cuộn sang trái"
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Main Pill Segmented Container */}
      <div className="relative flex items-center bg-slate-100/90 dark:bg-[#0c0f18]/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-3xs backdrop-blur-md max-w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-0.5 scroll-smooth"
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTabId === tab.id;
            const isEditing = editingTabId === tab.id;
            const isPro = ['gantt', 'timeline', 'workload', 'mindmap', 'ai'].includes(tab.viewId);

            // Distinctive view color
            const viewDef = ALL_AVAILABLE_VIEWS.find(v => v.id === tab.viewId);
            const activeColor = viewDef?.color || '#4f46e5';

            return (
              <div
                key={tab.id}
                onContextMenu={e => handleTabContextMenu(e, tab.id)}
                className="relative group/tab flex items-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isPro && !currentUser?.isPremium) {
                      onUpgradePremium?.();
                      return;
                    }
                    onSelectTab(tab.id, tab.viewId);
                  }}
                  onDoubleClick={() => handleStartRename(tab)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-300 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Fluid Framer Motion Background Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSpaceViewTabPill"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 bg-white dark:bg-indigo-950/40 rounded-xl shadow-xs border border-slate-200/90 dark:border-indigo-500/30"
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-1.5">
                    {/* Icon */}
                    <TabIcon
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover/tab:scale-110 shrink-0"
                      style={{ color: isActive ? activeColor : undefined }}
                    />

                    {/* Label or Inline Input */}
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
                        className="bg-white dark:bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none w-24"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate max-w-[130px]">{tab.label}</span>
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
                    {tab.settings.default && (
                      <span title="Chế độ mặc định" className="flex items-center">
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
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
                  className={`relative z-10 ml-0.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-opacity cursor-pointer ${
                    isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover/tab:opacity-100'
                  }`}
                  title="Tùy chọn chế độ xem"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add View "+" Button */}
        <div className="relative shrink-0 pl-1 border-l border-slate-200/80 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setShowAddMenu(!showAddMenu);
              setSearchViewQuery('');
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              showAddMenu
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-white/80 dark:hover:bg-slate-800/60'
            }`}
            title="Thêm chế độ xem"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Thêm xem</span>
          </button>
        </div>
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all cursor-pointer z-10 shrink-0"
          title="Cuộn sang phải"
          aria-label="Cuộn sang phải"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Modern Tab Context Menu Dropdown */}
      {contextMenu.show && contextTab && (
        <>
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
            className="fixed w-[250px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 text-left font-sans select-none overflow-hidden py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header info */}
            <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{contextTab.label}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">{contextTab.viewId}</span>
            </div>

            {/* Rename */}
            <button
              onClick={() => handleStartRename(contextTab)}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>Đổi tên chế độ xem</span>
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
                <span>Đặt làm mặc định</span>
              </div>
              {contextTab.settings.default && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {/* Duplicate */}
            <button
              onClick={() => handleDuplicateTab(contextTab.id)}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Nhân bản chế độ xem</span>
            </button>

            {/* Copy link */}
            <button
              onClick={() => handleCopyLink(contextTab)}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Sao chép liên kết</span>
            </button>

            {/* Customize fields / columns */}
            {onOpenFieldsPanel && (
              <button
                onClick={() => {
                  setContextMenu(prev => ({ ...prev, show: false }));
                  onOpenFieldsPanel();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
              >
                <Cog className="w-3.5 h-3.5 text-slate-400" />
                <span>Tùy chỉnh cột & trường</span>
              </button>
            )}

            {/* Move Left / Right */}
            <div className="flex items-center px-2 py-1 gap-1 border-t border-slate-100 dark:border-slate-800/80 my-1">
              <button
                onClick={() => handleMoveTab(contextTab.id, 'left')}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Di chuyển sang trái"
              >
                <ArrowLeft className="w-3 h-3" /> Sang trái
              </button>
              <button
                onClick={() => handleMoveTab(contextTab.id, 'right')}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Di chuyển sang phải"
              >
                Sang phải <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Toggles */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
            <div className="px-3.5 py-1 space-y-2">
              {[
                { label: 'Ghim lên thanh điều hướng', key: 'pin' as const, icon: Pin },
                { label: 'Chế độ riêng tư (Chỉ mình tôi)', key: 'private' as const, icon: Lock },
                { label: 'Khóa chỉnh sửa', key: 'protect' as const, icon: Shield },
              ].map(toggle => {
                const Icon = toggle.icon;
                const isChecked = contextTab.settings[toggle.key];
                return (
                  <div key={toggle.key} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                      <Icon className="w-3 h-3 text-slate-400" />
                      <span>{toggle.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => updateSetting(contextTab.id, toggle.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Export & Actions */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

            {onExportCsv && (
              <button
                onClick={() => {
                  setContextMenu(prev => ({ ...prev, show: false }));
                  onExportCsv();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left cursor-pointer font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Xuất dữ liệu CSV</span>
              </button>
            )}

            {/* Delete view */}
            <button
              onClick={() => handleDeleteTab(contextTab.id)}
              disabled={tabs.length <= 1}
              className={`w-full flex items-center gap-2.5 px-3.5 py-1.5 text-left font-medium transition-colors ${
                tabs.length <= 1
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa chế độ xem</span>
            </button>
          </div>
        </>
      )}

      {/* Modern Categorized "Add View" Modal / Popover */}
      {showAddMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-2xs"
            onClick={() => {
              setShowAddMenu(false);
              setSearchViewQuery('');
            }}
          />
          <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 font-sans select-none animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Thêm chế độ xem mới</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Chọn dạng hiển thị trực quan phù hợp với quy trình</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm kiếm: Kanban, Gantt, Lịch biểu, AI..."
                value={searchViewQuery}
                onChange={e => setSearchViewQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-8.5 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'core', label: 'Cơ bản' },
                { id: 'planning', label: 'Kế hoạch & Báo cáo' },
                { id: 'creative', label: 'Sáng tạo & AI' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* View List Grid */}
            <div className="space-y-1 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {filteredViews.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Không tìm thấy chế độ xem phù hợp
                </div>
              ) : (
                filteredViews.map(viewDef => {
                  const ViewIcon = viewDef.icon;
                  const isExisting = tabs.some(t => t.viewId === viewDef.id);

                  return (
                    <button
                      key={viewDef.id}
                      onClick={() => handleAddView(viewDef)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-3xs transition-transform group-hover:scale-105"
                          style={{ backgroundColor: viewDef.bg }}
                        >
                          <ViewIcon className="w-4 h-4" style={{ color: viewDef.color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                              {viewDef.label}
                            </span>
                            {viewDef.isPro && (
                              <span className="text-[8px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1 py-0.5 rounded leading-none">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{viewDef.desc}</p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isExisting ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            Đã thêm
                          </span>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Settings Footer */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newTabPin}
                  onChange={e => setNewTabPin(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Ghim ngay</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newTabPrivate}
                  onChange={e => setNewTabPrivate(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Chỉ mình tôi</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
