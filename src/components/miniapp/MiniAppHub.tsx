"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Pin, PinOff, Star, Sparkles, ExternalLink,
  Edit3, Trash2, Globe, Layers, Filter, Check, ArrowUpRight,
  ShieldCheck, LayoutGrid, CheckCircle2, RotateCcw, Power, CheckCheck
} from 'lucide-react';
import { MiniAppCategory, MiniAppItem } from '@/types/miniapp';
import { MINI_APP_CATEGORIES } from '@/lib/miniAppsRegistry';
import { selectAllMiniApps, useMiniAppStore } from '@/store/miniAppStore';
import CustomMiniAppModal from './CustomMiniAppModal';
import MiniAppIcon from './MiniAppIcon';
import { useTranslation } from '@/contexts/TranslationContext';

interface MiniAppHubProps {
  onLaunchApp: (appId: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function MiniAppHub({ onLaunchApp, triggerToast }: MiniAppHubProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const pinnedAppIds = useMiniAppStore((s) => s.pinnedAppIds);
  const customApps = useMiniAppStore((s) => s.customApps);
  const disabledAppIds = useMiniAppStore((s) => s.disabledAppIds);
  const togglePin = useMiniAppStore((s) => s.togglePin);
  const toggleAppEnabled = useMiniAppStore((s) => s.toggleAppEnabled);
  const enableAllApps = useMiniAppStore((s) => s.enableAllApps);
  const addCustomApp = useMiniAppStore((s) => s.addCustomApp);
  const updateCustomApp = useMiniAppStore((s) => s.updateCustomApp);
  const deleteCustomApp = useMiniAppStore((s) => s.deleteCustomApp);
  const recordAppLaunch = useMiniAppStore((s) => s.recordAppLaunch);
  const resetToDefaults = useMiniAppStore((s) => s.resetToDefaults);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MiniAppCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled' | 'pinned' | 'system' | 'custom'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState<MiniAppItem | null>(null);

  // All apps with current pin and enabled states
  const allApps = useMemo(() => {
    return selectAllMiniApps(pinnedAppIds, customApps, disabledAppIds);
  }, [pinnedAppIds, customApps, disabledAppIds]);

  const enabledCount = useMemo(() => allApps.filter((a) => a.isEnabled !== false).length, [allApps]);
  const disabledCount = useMemo(() => allApps.filter((a) => a.isEnabled === false).length, [allApps]);

  // Filtered list
  const filteredApps = useMemo(() => {
    return allApps.filter((app) => {
      // Category filter
      if (selectedCategory !== 'all' && app.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'enabled' && app.isEnabled === false) return false;
      if (statusFilter === 'disabled' && app.isEnabled !== false) return false;
      if (statusFilter === 'pinned' && !app.isPinned) return false;
      if (statusFilter === 'system' && !app.isSystem) return false;
      if (statusFilter === 'custom' && app.isSystem) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = app.name.toLowerCase().includes(q) || app.nameVi?.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q) || app.descriptionVi?.toLowerCase().includes(q);
        const matchTags = app.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchTags) return false;
      }

      return true;
    });
  }, [allApps, selectedCategory, statusFilter, searchQuery]);

  const handleLaunch = (app: MiniAppItem) => {
    if (app.isEnabled === false) {
      if (confirm(isVi ? `Ứng dụng "${app.nameVi || app.name}" hiện đang bị tắt. Bạn có muốn kích hoạt và mở ngay không?` : `App "${app.name}" is currently disabled. Enable and launch now?`)) {
        toggleAppEnabled(app.id);
        recordAppLaunch(app.id);
        if (app.openMode === 'new_tab' && app.url) {
          window.open(app.url, '_blank', 'noopener,noreferrer');
        } else {
          onLaunchApp(app.id);
        }
      }
      return;
    }

    recordAppLaunch(app.id);
    if (app.openMode === 'new_tab' && app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    } else {
      onLaunchApp(app.id);
    }
  };

  const handleToggleEnabled = (e: React.MouseEvent, app: MiniAppItem) => {
    e.stopPropagation();
    const willBeEnabled = app.isEnabled === false;
    toggleAppEnabled(app.id);
    if (willBeEnabled) {
      triggerToast?.(
        'success',
        isVi ? 'Đã bật ứng dụng' : 'App enabled',
        isVi ? `Đã kích hoạt ứng dụng ${app.nameVi || app.name}.` : `${app.name} has been enabled.`
      );
    } else {
      triggerToast?.(
        'info',
        isVi ? 'Đã tắt ứng dụng' : 'App disabled',
        isVi ? `Đã tắt ứng dụng ${app.nameVi || app.name} và gỡ khỏi thanh bên.` : `${app.name} disabled and unpinned.`
      );
    }
  };

  const handleTogglePin = (e: React.MouseEvent, app: MiniAppItem) => {
    e.stopPropagation();
    if (app.isEnabled === false) {
      triggerToast?.(
        'warning',
        isVi ? 'Ứng dụng đang tắt' : 'App is disabled',
        isVi ? 'Vui lòng bật ứng dụng trước khi ghim lên thanh bên.' : 'Please enable the app first before pinning to sidebar.'
      );
      return;
    }

    togglePin(app.id);
    if (!app.isPinned) {
      triggerToast?.(
        'success',
        isVi ? 'Đã ghim lên thanh bên' : 'Pinned to sidebar',
        isVi ? `Ứng dụng ${app.name} đã được thêm vào thanh điều hướng.` : `${app.name} added to sidebar.`
      );
    } else {
      triggerToast?.(
        'info',
        isVi ? 'Đã bỏ ghim' : 'Unpinned',
        isVi ? `Đã gỡ ${app.name} khỏi thanh bên.` : `Removed ${app.name} from sidebar.`
      );
    }
  };

  const handleSaveCustomApp = (input: any) => {
    if (editingApp) {
      updateCustomApp(editingApp.id, input);
      triggerToast?.('success', isVi ? 'Đã cập nhật Mini App' : 'Mini App updated', input.name);
    } else {
      const created = addCustomApp(input);
      triggerToast?.('success', isVi ? 'Đã tạo Mini App mới' : 'New Mini App created', created.name);
    }
    setEditingApp(null);
  };

  const handleDeleteCustomApp = (e: React.MouseEvent, appId: string, name: string) => {
    e.stopPropagation();
    if (confirm(isVi ? `Bạn có chắc muốn xóa ứng dụng "${name}"?` : `Delete app "${name}"?`)) {
      deleteCustomApp(appId);
      triggerToast?.('info', isVi ? 'Đã xóa ứng dụng' : 'App deleted', name);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 md:p-8 max-w-7xl mx-auto overflow-y-auto custom-scrollbar font-sans">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xl overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Apexa Mini Apps Directory</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {isVi ? 'Kho ứng dụng Mini Apps' : 'Workspace Mini Apps Hub'}
          </h1>
          <p className="text-sm sm:text-base text-white/80 mt-2 leading-relaxed">
            {isVi
              ? 'Tùy biến không gian làm việc của bạn: bật hoặc tắt linh hoạt từng ứng dụng, ghim nhanh lên thanh bên và tích hợp các tiện ích nhúng Web theo nhu cầu.'
              : 'Customize your workspace: flexibly enable or disable apps, pin to sidebar, and embed web tools tailored to your daily workflow.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setEditingApp(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-indigo-600 font-black text-xs sm:text-sm hover:bg-white/90 transition-all cursor-pointer shadow-md hover:scale-102 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isVi ? '+ Thêm ứng dụng nhúng Web' : '+ Add Custom Web App'}</span>
            </button>

            {disabledCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  enableAllApps();
                  triggerToast?.(
                    'success',
                    isVi ? 'Đã bật tất cả ứng dụng' : 'All apps enabled',
                    isVi ? 'Tất cả các mini apps đã sẵn sàng sử dụng.' : 'All mini apps are now active.'
                  );
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-xs sm:text-sm transition-all cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{isVi ? `Bật lại tất cả (${disabledCount})` : `Enable all (${disabledCount})`}</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 text-xs font-bold text-white/80 pl-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                {enabledCount} {isVi ? 'đang bật' : 'enabled'}
              </span>
              {disabledCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-200">
                    {disabledCount} {isVi ? 'đã tắt' : 'disabled'}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{pinnedAppIds.length} {isVi ? 'đã ghim' : 'pinned'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isVi ? 'Tìm ứng dụng, công cụ, tính năng...' : 'Search mini apps, tools, tags...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isVi ? 'Tất cả' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('enabled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'enabled'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-3xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isVi ? 'Đang bật' : 'Enabled'}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('disabled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'disabled'
                ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-3xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{isVi ? 'Đã tắt' : 'Disabled'}</span>
            {disabledCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {disabledCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pinned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pinned'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📌 {isVi ? 'Đã ghim' : 'Pinned'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'system'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⚡ {isVi ? 'Hệ thống' : 'Native'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'custom'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🌐 {isVi ? 'Tùy chỉnh' : 'Custom'}
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3 mb-6">
        {MINI_APP_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as MiniAppCategory)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{isVi ? cat.labelVi : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Apps Grid */}
      {filteredApps.length === 0 ? (
        <div className="w-full p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900/30">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isVi ? 'Không tìm thấy ứng dụng phù hợp' : 'No mini apps found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {isVi
              ? 'Thử thay đổi bộ lọc hoặc thêm ứng dụng web tùy chỉnh của bạn.'
              : 'Try changing your search terms or add a new custom web embed app.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => {
            const isPinned = app.isPinned;
            const isEnabled = app.isEnabled !== false;
            return (
              <motion.div
                key={app.id}
                whileHover={{ y: isEnabled ? -3 : 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleLaunch(app)}
                className={`group relative flex flex-col justify-between p-5 rounded-3xl border transition-all cursor-pointer ${
                  !isEnabled
                    ? 'opacity-70 bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200/60 dark:border-white/5 hover:opacity-90'
                    : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-white/10 hover:shadow-lg hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div>
                  {/* Card Header: Icon, Badges, Toggle Switch, Pin Button */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <MiniAppIcon
                      appId={app.id}
                      icon={app.icon}
                      iconName={app.iconName}
                      gradient={app.gradient}
                      color={app.color}
                      variant="card"
                      disabled={!isEnabled}
                    />

                    <div className="flex items-center gap-1.5">
                      {!isEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/10">
                          {isVi ? 'Đã tắt' : 'Disabled'}
                        </span>
                      ) : (
                        app.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/20 dark:text-sky-300 dark:border-blue-400/30">
                            {app.badge}
                          </span>
                        )
                      )}

                      {/* Enable/Disable Toggle Switch */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleEnabled(e, app)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                        }`}
                        title={
                          isEnabled
                            ? (isVi ? 'Đang bật · Bấm để tắt' : 'Enabled · Click to disable')
                            : (isVi ? 'Đã tắt · Bấm để bật' : 'Disabled · Click to enable')
                        }
                        aria-label="Toggle enable app"
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Pin to Sidebar button */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, app)}
                        disabled={!isEnabled}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          !isEnabled
                            ? 'opacity-40 cursor-not-allowed border-slate-200/50 text-slate-300 dark:border-white/5 dark:text-zinc-600'
                            : isPinned
                            ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                            : 'border-slate-200/70 text-slate-400 dark:border-white/10 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                        title={
                          !isEnabled
                            ? (isVi ? 'Bật ứng dụng để ghim' : 'Enable app to pin')
                            : isPinned
                            ? (isVi ? 'Bỏ ghim khỏi thanh bên' : 'Unpin from sidebar')
                            : (isVi ? 'Ghim lên thanh bên' : 'Pin to sidebar')
                        }
                      >
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>

                      {/* Custom App Edit/Delete Menu */}
                      {!app.isSystem && (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingApp(app);
                              setShowModal(true);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                            title={isVi ? 'Chỉnh sửa' : 'Edit'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomApp(e, app.id, app.name)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title={isVi ? 'Xóa' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className={`text-sm font-black transition-colors ${
                    !isEnabled
                      ? 'text-slate-500 dark:text-zinc-400'
                      : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400'
                  }`}>
                    {isVi ? app.nameVi || app.name : app.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {isVi ? app.descriptionVi || app.description : app.description}
                  </p>
                </div>

                {/* Card Footer: Metadata & Launch CTA */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    {app.author || (app.isSystem ? 'Apexa Native' : 'Custom Web')}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-xs font-extrabold transition-transform ${
                    !isEnabled
                      ? 'text-slate-400 dark:text-zinc-500'
                      : 'text-blue-600 dark:text-sky-400 group-hover:translate-x-0.5'
                  }`}>
                    <span>{!isEnabled ? (isVi ? 'Bật & Mở' : 'Enable & Open') : (isVi ? 'Mở ứng dụng' : 'Launch')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal for Custom Apps */}
      {showModal && (
        <CustomMiniAppModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingApp(null);
          }}
          onSave={handleSaveCustomApp}
          editingApp={editingApp}
        />
      )}
    </div>
  );
}
