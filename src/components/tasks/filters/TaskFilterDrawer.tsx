"use client";

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Filter,
  Sparkles,
  SlidersHorizontal,
  Bookmark,
  CheckCircle2,
  Flag,
  User,
  Calendar,
  Tag,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Search,
  ChevronDown,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  TaskFilterState,
  TaskFilterPreset,
  TaskAdvancedCondition,
  TaskDatePreset,
  FilterOperator,
} from '@/lib/taskFilterSort';
import {
  STATUS_META,
  PRIORITY_META,
  BUILT_IN_FILTER_PRESETS,
  countActiveFilters,
  defaultQuickFilterState,
} from '@/lib/taskFilterSort';
import type { CustomFieldDefinition, TaskStatus, Priority, User as UserType, Task } from '@/types';

interface TaskFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: TaskFilterState;
  onChangeFilter: (state: TaskFilterState) => void;
  onResetFilters: () => void;
  allTasks: Task[];
  members?: UserType[];
  customFields?: CustomFieldDefinition[];
  currentUserId?: string;
  locale?: string;
  initialTab?: 'quick' | 'advanced' | 'presets';
  filterPresets?: TaskFilterPreset[];
  onSavePreset?: (preset: TaskFilterPreset) => void;
  onDeletePreset?: (presetId: string) => void;
}

const DATE_PRESETS: Array<{ id: TaskDatePreset; labelVi: string; labelEn: string }> = [
  { id: 'all', labelVi: 'Tất cả thời gian', labelEn: 'Any time' },
  { id: 'overdue', labelVi: 'Đã quá hạn', labelEn: 'Overdue' },
  { id: 'today', labelVi: 'Hôm nay', labelEn: 'Due today' },
  { id: 'tomorrow', labelVi: 'Ngày mai', labelEn: 'Due tomorrow' },
  { id: 'this_week', labelVi: 'Tuần này', labelEn: 'This week' },
  { id: 'next_week', labelVi: 'Tuần tới', labelEn: 'Next week' },
  { id: 'no_date', labelVi: 'Không có hạn', labelEn: 'No due date' },
  { id: 'custom', labelVi: 'Khoảng ngày tùy chỉnh', labelEn: 'Custom range' },
];

export default function TaskFilterDrawer({
  isOpen,
  onClose,
  filterState,
  onChangeFilter,
  onResetFilters,
  allTasks,
  members = [],
  customFields = [],
  currentUserId,
  locale = 'vi',
  initialTab = 'quick',
  filterPresets = [],
  onSavePreset,
  onDeletePreset,
}: TaskFilterDrawerProps) {
  const isVi = locale === 'vi';
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced' | 'presets'>(initialTab);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [newPresetName, setNewPresetName] = useState('');

  // Extract all existing unique tags from allTasks with their counts
  const availableTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of allTasks) {
      if (t.tags && Array.isArray(t.tags)) {
        for (const tag of t.tags) {
          if (tag.trim()) {
            map.set(tag.trim(), (map.get(tag.trim()) || 0) + 1);
          }
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allTasks]);

  const activeCount = countActiveFilters(filterState);

  // Status helper
  const toggleStatus = (status: TaskStatus) => {
    const current = filterState.quick.statuses;
    const next = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
    onChangeFilter({
      ...filterState,
      quick: { ...filterState.quick, statuses: next },
    });
  };

  // Priority helper
  const togglePriority = (priority: Priority) => {
    const current = filterState.quick.priorities;
    const next = current.includes(priority) ? current.filter((p) => p !== priority) : [...current, priority];
    onChangeFilter({
      ...filterState,
      quick: { ...filterState.quick, priorities: next },
    });
  };

  // Assignee helper
  const toggleAssignee = (id: string) => {
    const current = filterState.quick.assigneeIds;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    onChangeFilter({
      ...filterState,
      quick: { ...filterState.quick, assigneeIds: next },
    });
  };

  // Date helper
  const setDatePreset = (preset: TaskDatePreset) => {
    onChangeFilter({
      ...filterState,
      quick: {
        ...filterState.quick,
        datePreset: preset,
        customStartDate: preset === 'custom' ? filterState.quick.customStartDate : '',
        customEndDate: preset === 'custom' ? filterState.quick.customEndDate : '',
      },
    });
  };

  // Tag helper
  const toggleTag = (tag: string) => {
    const current = filterState.quick.tags;
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onChangeFilter({
      ...filterState,
      quick: { ...filterState.quick, tags: next },
    });
  };

  // Advanced conditions helpers
  const addCondition = () => {
    const newCond: TaskAdvancedCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      field: 'title',
      operator: 'contains',
      value: '',
    };
    onChangeFilter({
      ...filterState,
      conditions: [...filterState.conditions, newCond],
    });
  };

  const updateCondition = (id: string, updates: Partial<TaskAdvancedCondition>) => {
    onChangeFilter({
      ...filterState,
      conditions: filterState.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  };

  const removeCondition = (id: string) => {
    onChangeFilter({
      ...filterState,
      conditions: filterState.conditions.filter((c) => c.id !== id),
    });
  };

  // Preset apply helper
  const applyPreset = (preset: TaskFilterPreset) => {
    onChangeFilter({
      ...filterState,
      quick: {
        ...defaultQuickFilterState(),
        ...(preset.quick || {}),
      },
      conditions: preset.conditions ? [...preset.conditions] : [],
      conjunction: preset.conjunction || 'AND',
    });
  };

  // Save current as preset
  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim()) return;
    const preset: TaskFilterPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      icon: '⭐',
      quick: { ...filterState.quick },
      conditions: [...filterState.conditions],
      conjunction: filterState.conjunction,
    };
    onSavePreset?.(preset);
    setNewPresetName('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3 sm:p-4 cursor-pointer"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0f111a] border border-slate-200/90 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-3xs">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isVi ? 'Bộ lọc công việc' : 'Task Filters'}
                  </h3>
                  {activeCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      {activeCount} {isVi ? 'đang bật' : 'active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  {isVi ? 'Thu hẹp và tùy chỉnh các công việc hiển thị' : 'Narrow down and customize visible tasks'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#0f111a]">
            {[
              { id: 'quick', labelVi: 'Lọc nhanh', labelEn: 'Quick Filters', icon: Sparkles },
              { id: 'advanced', labelVi: 'Quy tắc nâng cao', labelEn: 'Advanced Rules', icon: SlidersHorizontal },
              { id: 'presets', labelVi: 'Bộ lọc mẫu', labelEn: 'Presets', icon: Bookmark },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer -mb-px ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isVi ? tab.labelVi : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* Tab 1: Quick Filters */}
            {activeTab === 'quick' && (
              <div className="space-y-5">
                {/* Status Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                      {isVi ? 'Trạng thái công việc' : 'Task Status'}
                    </span>
                    {filterState.quick.statuses.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFilter({
                            ...filterState,
                            quick: { ...filterState.quick, statuses: [] },
                          })
                        }
                        className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isVi ? 'Bỏ chọn' : 'Clear'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['todo', 'inprogress', 'review', 'completed'] as TaskStatus[]).map((status) => {
                      const isSelected = filterState.quick.statuses.includes(status);
                      const meta = STATUS_META[status];
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => toggleStatus(status)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/15 shadow-2xs'
                              : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 bg-white dark:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: meta.color }}
                            />
                            <span
                              className={`text-xs truncate ${
                                isSelected
                                  ? 'font-black text-blue-900 dark:text-blue-100'
                                  : 'font-semibold text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              {isVi ? meta.labelVi : meta.labelEn}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-rose-500" />
                      {isVi ? 'Mức độ ưu tiên' : 'Priority Level'}
                    </span>
                    {filterState.quick.priorities.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFilter({
                            ...filterState,
                            quick: { ...filterState.quick, priorities: [] },
                          })
                        }
                        className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isVi ? 'Bỏ chọn' : 'Clear'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((prio) => {
                      const isSelected = filterState.quick.priorities.includes(prio);
                      const meta = PRIORITY_META[prio];
                      return (
                        <button
                          key={prio}
                          type="button"
                          onClick={() => togglePriority(prio)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/15 shadow-2xs'
                              : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 bg-white dark:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Flag
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: meta.color }}
                              fill={meta.color}
                            />
                            <span
                              className={`text-xs truncate ${
                                isSelected
                                  ? 'font-black text-blue-900 dark:text-blue-100'
                                  : 'font-semibold text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              {isVi ? meta.labelVi : meta.labelEn}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      {isVi ? 'Hạn chót công việc' : 'Due Date'}
                    </span>
                    {filterState.quick.datePreset !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setDatePreset('all')}
                        className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isVi ? 'Tất cả' : 'Reset'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DATE_PRESETS.map((preset) => {
                      const isSelected = filterState.quick.datePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setDatePreset(preset.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600 text-white shadow-2xs'
                              : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          {isVi ? preset.labelVi : preset.labelEn}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Range Picker */}
                  {filterState.quick.datePreset === 'custom' && (
                    <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200/70 dark:border-white/[0.08] flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          {isVi ? 'Từ ngày' : 'From'}
                        </label>
                        <input
                          type="date"
                          value={filterState.quick.customStartDate || ''}
                          onChange={(e) =>
                            onChangeFilter({
                              ...filterState,
                              quick: { ...filterState.quick, customStartDate: e.target.value },
                            })
                          }
                          className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 mt-4 shrink-0" />
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          {isVi ? 'Đến ngày' : 'To'}
                        </label>
                        <input
                          type="date"
                          value={filterState.quick.customEndDate || ''}
                          onChange={(e) =>
                            onChangeFilter({
                              ...filterState,
                              quick: { ...filterState.quick, customEndDate: e.target.value },
                            })
                          }
                          className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignees Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      {isVi ? 'Người phụ trách' : 'Assignees'}
                    </span>
                    {filterState.quick.assigneeIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFilter({
                            ...filterState,
                            quick: { ...filterState.quick, assigneeIds: [] },
                          })
                        }
                        className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isVi ? 'Bỏ chọn' : 'Clear'}
                      </button>
                    )}
                  </div>

                  {/* Special chips: Me, Unassigned */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAssignee('mine')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        filterState.quick.assigneeIds.includes('mine')
                          ? 'border-blue-500 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Việc của tôi' : 'Assigned to me'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAssignee('unassigned')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        filterState.quick.assigneeIds.includes('unassigned')
                          ? 'border-blue-500 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <span>{isVi ? 'Chưa phân công' : 'Unassigned'}</span>
                    </button>
                  </div>

                  {/* Team Members List */}
                  {members.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={isVi ? 'Tìm thành viên...' : 'Search members...'}
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {members
                          .filter((m) =>
                            (m.name || m.email || '').toLowerCase().includes(assigneeSearch.toLowerCase())
                          )
                          .map((m) => {
                            const isSelected = filterState.quick.assigneeIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleAssignee(m.id)}
                                className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/15'
                                    : 'border-slate-200/60 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                }`}
                              >
                                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {(m.name || m.email || '?')[0].toUpperCase()}
                                </span>
                                <span className="text-[11px] font-semibold truncate flex-1 text-slate-800 dark:text-zinc-200">
                                  {m.name || m.email}
                                </span>
                                {isSelected && (
                                  <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags Section */}
                {availableTags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-teal-500" />
                        {isVi ? 'Thẻ nhãn' : 'Tags'}
                      </span>
                      {filterState.quick.tags.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            onChangeFilter({
                              ...filterState,
                              quick: { ...filterState.quick, tags: [] },
                            })
                          }
                          className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isVi ? 'Bỏ chọn' : 'Clear'}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                      {availableTags.map(({ name, count }) => {
                        const isSelected = filterState.quick.tags.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleTag(name)}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'border-teal-500 bg-teal-500 text-white shadow-2xs'
                                : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-zinc-300'
                            }`}
                          >
                            <span>#{name}</span>
                            <span
                              className={`text-[9px] px-1 rounded-full ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Display Preferences */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {filterState.showClosedTasks ? (
                      <Eye className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {isVi ? 'Hiện công việc đã hoàn thành' : 'Show completed tasks'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {isVi ? 'Tắt để chỉ tập trung vào các công việc đang mở' : 'Turn off to focus only on active tasks'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFilter({
                        ...filterState,
                        showClosedTasks: !filterState.showClosedTasks,
                      })
                    }
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                      filterState.showClosedTasks ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        filterState.showClosedTasks ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Advanced Rules */}
            {activeTab === 'advanced' && (
              <div className="space-y-4">
                {/* Conjunction Switch */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      {isVi ? 'Khớp công việc thỏa mãn:' : 'Match tasks that satisfy:'}
                    </span>
                    <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-3xs">
                      <button
                        type="button"
                        onClick={() => onChangeFilter({ ...filterState, conjunction: 'AND' })}
                        className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                          filterState.conjunction === 'AND'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
                        }`}
                      >
                        {isVi ? 'Tất cả (VÀ)' : 'All (AND)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeFilter({ ...filterState, conjunction: 'OR' })}
                        className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                          filterState.conjunction === 'OR'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
                        }`}
                      >
                        {isVi ? 'Bất kỳ (HOẶC)' : 'Any (OR)'}
                      </button>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {filterState.conditions.length} {isVi ? 'quy tắc' : 'rules'}
                  </span>
                </div>

                {/* Conditions List */}
                <div className="space-y-2.5">
                  {filterState.conditions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-4">
                      <Layers className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                        {isVi ? 'Chưa có quy tắc lọc nâng cao nào' : 'No advanced filter rules yet'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isVi
                          ? 'Thêm quy tắc để lọc chi tiết theo từng thuộc tính, ngày tháng hoặc trường tùy chỉnh'
                          : 'Add rules to filter specifically by properties, dates, or custom fields'}
                      </p>
                      <button
                        type="button"
                        onClick={addCondition}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Thêm quy tắc đầu tiên' : 'Add First Rule'}</span>
                      </button>
                    </div>
                  ) : (
                    filterState.conditions.map((cond, idx) => (
                      <div
                        key={cond.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/[0.08] flex items-center gap-2 flex-wrap sm:flex-nowrap shadow-3xs"
                      >
                        {idx > 0 && (
                          <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 w-9 text-center shrink-0">
                            {filterState.conjunction}
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="text-[10px] font-black uppercase text-slate-400 w-9 text-center shrink-0">
                            {isVi ? 'KHI' : 'WHERE'}
                          </span>
                        )}

                        {/* Field Selector */}
                        <select
                          value={cond.field}
                          onChange={(e) =>
                            updateCondition(cond.id, { field: e.target.value, operator: 'is', value: '' })
                          }
                          className="h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none cursor-pointer flex-1 min-w-[130px]"
                        >
                          <option value="title">{isVi ? 'Tiêu đề' : 'Title'}</option>
                          <option value="status">{isVi ? 'Trạng thái' : 'Status'}</option>
                          <option value="priority">{isVi ? 'Mức ưu tiên' : 'Priority'}</option>
                          <option value="assignee">{isVi ? 'Người phụ trách' : 'Assignee'}</option>
                          <option value="dueDate">{isVi ? 'Hạn chót' : 'Due date'}</option>
                          <option value="startDate">{isVi ? 'Ngày bắt đầu' : 'Start date'}</option>
                          <option value="createdAt">{isVi ? 'Ngày tạo' : 'Created date'}</option>
                          <option value="tags">{isVi ? 'Thẻ nhãn' : 'Tags'}</option>
                          {customFields.map((cf) => (
                            <option key={cf.name} value={`custom:${cf.name}`}>
                              {cf.name}
                            </option>
                          ))}
                        </select>

                        {/* Operator Selector */}
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            updateCondition(cond.id, { operator: e.target.value as FilterOperator })
                          }
                          className="h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none cursor-pointer w-28 shrink-0"
                        >
                          <option value="is">{isVi ? 'là' : 'is'}</option>
                          <option value="isNot">{isVi ? 'không phải' : 'is not'}</option>
                          <option value="contains">{isVi ? 'chứa' : 'contains'}</option>
                          <option value="notContains">{isVi ? 'không chứa' : 'does not contain'}</option>
                          <option value="isEmpty">{isVi ? 'đang trống' : 'is empty'}</option>
                          <option value="isNotEmpty">{isVi ? 'đã có giá trị' : 'is not empty'}</option>
                          {['dueDate', 'startDate', 'createdAt'].includes(cond.field) && (
                            <>
                              <option value="before">{isVi ? 'trước ngày' : 'before'}</option>
                              <option value="after">{isVi ? 'sau ngày' : 'after'}</option>
                            </>
                          )}
                          <option value="gt">{isVi ? 'lớn hơn (>)' : 'greater than (>)'}</option>
                          <option value="lt">{isVi ? 'nhỏ hơn (<)' : 'less than (<)'}</option>
                        </select>

                        {/* Value Input */}
                        {cond.operator !== 'isEmpty' && cond.operator !== 'isNotEmpty' && (
                          <div className="flex-1 min-w-[140px]">
                            {cond.field === 'status' ? (
                              <select
                                value={cond.value}
                                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className="w-full h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                <option value="">{isVi ? '-- Chọn trạng thái --' : '-- Select status --'}</option>
                                <option value="todo">{isVi ? 'Cần làm' : 'To Do'}</option>
                                <option value="inprogress">{isVi ? 'Đang làm' : 'In Progress'}</option>
                                <option value="review">{isVi ? 'Chờ duyệt' : 'In Review'}</option>
                                <option value="completed">{isVi ? 'Hoàn thành' : 'Done'}</option>
                              </select>
                            ) : cond.field === 'priority' ? (
                              <select
                                value={cond.value}
                                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className="w-full h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                <option value="">{isVi ? '-- Chọn mức ưu tiên --' : '-- Select priority --'}</option>
                                <option value="urgent">{isVi ? 'Khẩn cấp' : 'Urgent'}</option>
                                <option value="high">{isVi ? 'Cao' : 'High'}</option>
                                <option value="medium">{isVi ? 'Trung bình' : 'Medium'}</option>
                                <option value="low">{isVi ? 'Thấp' : 'Low'}</option>
                              </select>
                            ) : cond.field === 'assignee' ? (
                              <select
                                value={cond.value}
                                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className="w-full h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                <option value="">{isVi ? '-- Chọn thành viên --' : '-- Select member --'}</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.email}
                                  </option>
                                ))}
                              </select>
                            ) : ['dueDate', 'startDate', 'createdAt'].includes(cond.field) ? (
                              <input
                                type="date"
                                value={cond.value || ''}
                                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder={isVi ? 'Giá trị tìm kiếm...' : 'Value...'}
                                value={cond.value || ''}
                                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className="w-full h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-blue-500"
                              />
                            )}
                          </div>
                        )}

                        {/* Remove Rule Button */}
                        <button
                          type="button"
                          onClick={() => removeCondition(cond.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
                          title={isVi ? 'Xóa quy tắc' : 'Remove rule'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}

                  {filterState.conditions.length > 0 && (
                    <button
                      type="button"
                      onClick={addCondition}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-blue-400 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50/50 dark:hover:bg-blue-500/10 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Thêm quy tắc khác' : 'Add another rule'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Presets */}
            {activeTab === 'presets' && (
              <div className="space-y-5">
                {/* Save Current as Preset */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 space-y-2">
                  <span className="text-xs font-black text-blue-900 dark:text-blue-200 block">
                    {isVi ? 'Lưu bộ lọc hiện tại thành mẫu' : 'Save current filters as preset'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={isVi ? 'Đặt tên cho bộ lọc mẫu...' : 'Preset name...'}
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="flex-1 h-8.5 px-3 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCurrentPreset}
                      disabled={!newPresetName.trim()}
                      className="h-8.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      {isVi ? 'Lưu mẫu' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Built-in Presets */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider block">
                    {isVi ? 'Bộ lọc mẫu thông dụng' : 'Built-in Presets'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BUILT_IN_FILTER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] hover:border-blue-400 dark:hover:border-blue-500/40 bg-white dark:bg-white/[0.03] text-left flex items-center justify-between group transition-all cursor-pointer shadow-3xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{preset.icon}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {preset.name}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-blue-500 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Saved Presets */}
                {filterPresets.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <span className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider block">
                      {isVi ? 'Bộ lọc mẫu của bạn' : 'Your Custom Presets'}
                    </span>
                    <div className="space-y-1.5">
                      {filterPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] flex items-center justify-between shadow-3xs"
                        >
                          <button
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <span className="text-sm shrink-0">{preset.icon || '⭐'}</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 truncate">
                              {preset.name}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePreset?.(preset.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer transition-colors shrink-0"
                            title={isVi ? 'Xóa mẫu này' : 'Delete preset'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đặt lại toàn bộ' : 'Reset all'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {isVi ? 'Đóng' : 'Close'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {isVi ? 'Áp dụng' : 'Apply'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
