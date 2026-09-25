"use client";

import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  SlidersHorizontal,
  ChevronDown,
  Flag,
  Calendar,
  CalendarDays,
  Clock,
  ArrowDownAZ,
  ArrowUpAZ,
  CheckCircle2,
  Users,
  Check,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  X,
  Layers,
} from 'lucide-react';
import type { TaskSortConfig, TaskSortField, TaskSortDirection } from '@/lib/taskFilterSort';
import type { CustomFieldDefinition } from '@/types';

interface TaskSortMenuProps {
  sortConfig: TaskSortConfig;
  onChangeSort: (config: TaskSortConfig) => void;
  locale?: string;
  customFields?: CustomFieldDefinition[];
  className?: string;
}

interface SortOptionDef {
  id: TaskSortField;
  labelVi: string;
  labelEn: string;
  descVi: string;
  descEn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  defaultDirection: TaskSortDirection;
  ascLabelVi: string;
  ascLabelEn: string;
  descLabelVi: string;
  descLabelEn: string;
}

const SORT_OPTIONS: SortOptionDef[] = [
  {
    id: 'manual',
    labelVi: 'Thứ tự thủ công',
    labelEn: 'Manual order',
    descVi: 'Kéo thả sắp xếp tự do',
    descEn: 'Drag and drop freely',
    icon: SlidersHorizontal,
    color: 'text-slate-500 bg-slate-100 dark:bg-white/[0.06]',
    defaultDirection: 'asc',
    ascLabelVi: 'Thủ công',
    ascLabelEn: 'Manual',
    descLabelVi: 'Thủ công',
    descLabelEn: 'Manual',
  },
  {
    id: 'priority',
    labelVi: 'Mức ưu tiên',
    labelEn: 'Priority',
    descVi: 'Khẩn cấp nhất lên hàng đầu',
    descEn: 'Urgent tasks first',
    icon: Flag,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/20',
    defaultDirection: 'desc',
    ascLabelVi: 'Thấp → Khẩn cấp',
    ascLabelEn: 'Low to Urgent',
    descLabelVi: 'Khẩn cấp → Thấp',
    descLabelEn: 'Urgent to Low',
  },
  {
    id: 'dueDate',
    labelVi: 'Hạn chót',
    labelEn: 'Due date',
    descVi: 'Gần deadline nhất lên trước',
    descEn: 'Nearest deadline first',
    icon: Calendar,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/20',
    defaultDirection: 'asc',
    ascLabelVi: 'Gần hạn nhất trước',
    ascLabelEn: 'Earliest deadline first',
    descLabelVi: 'Xa hạn nhất trước',
    descLabelEn: 'Latest deadline first',
  },
  {
    id: 'startDate',
    labelVi: 'Ngày bắt đầu',
    labelEn: 'Start date',
    descVi: 'Thời gian bắt đầu thực thi',
    descEn: 'Scheduled start date',
    icon: CalendarDays,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/20',
    defaultDirection: 'asc',
    ascLabelVi: 'Bắt đầu sớm nhất',
    ascLabelEn: 'Earliest start first',
    descLabelVi: 'Bắt đầu muộn nhất',
    descLabelEn: 'Latest start first',
  },
  {
    id: 'createdAt',
    labelVi: 'Ngày tạo mới',
    labelEn: 'Creation date',
    descVi: 'Công việc mới thêm gần đây',
    descEn: 'Recently created tasks',
    icon: Clock,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/20',
    defaultDirection: 'desc',
    ascLabelVi: 'Cũ nhất trước',
    ascLabelEn: 'Oldest first',
    descLabelVi: 'Mới nhất trước',
    descLabelEn: 'Newest first',
  },
  {
    id: 'title',
    labelVi: 'Bảng chữ cái',
    labelEn: 'Alphabetical',
    descVi: 'Theo thứ tự tên công việc',
    descEn: 'By task title (A-Z)',
    icon: ArrowDownAZ,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/20',
    defaultDirection: 'asc',
    ascLabelVi: 'A → Z',
    ascLabelEn: 'A to Z',
    descLabelVi: 'Z → A',
    descLabelEn: 'Z to A',
  },
  {
    id: 'status',
    labelVi: 'Trạng thái tiến độ',
    labelEn: 'Status stage',
    descVi: 'Theo luồng Cần làm → Hoàn thành',
    descEn: 'By progress workflow',
    icon: CheckCircle2,
    color: 'text-teal-500 bg-teal-50 dark:bg-teal-500/20',
    defaultDirection: 'asc',
    ascLabelVi: 'Cần làm → Xong',
    ascLabelEn: 'Todo to Done',
    descLabelVi: 'Xong → Cần làm',
    descLabelEn: 'Done to Todo',
  },
  {
    id: 'assignee',
    labelVi: 'Người phụ trách',
    labelEn: 'Assignee',
    descVi: 'Theo tên thành viên phân công',
    descEn: 'By assignee name',
    icon: Users,
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20',
    defaultDirection: 'asc',
    ascLabelVi: 'A → Z',
    ascLabelEn: 'A to Z',
    descLabelVi: 'Z → A',
    descLabelEn: 'Z to A',
  },
];

export default function TaskSortMenu({
  sortConfig,
  onChangeSort,
  locale = 'vi',
  customFields = [],
  className = '',
}: TaskSortMenuProps) {
  const isVi = locale === 'vi';
  const [isOpen, setIsOpen] = useState(false);
  const [showSecondary, setShowSecondary] = useState(Boolean(sortConfig.secondaryField));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
    }
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  const activeOption = SORT_OPTIONS.find((opt) => opt.id === sortConfig.field) || SORT_OPTIONS[0];
  const isSorted = sortConfig.field !== 'manual';

  const handleSelectField = (field: TaskSortField) => {
    if (field === 'manual') {
      onChangeSort({ field: 'manual', direction: 'asc' });
      setIsOpen(false);
      return;
    }

    if (sortConfig.field === field) {
      // Toggle direction when re-clicking the same field
      const nextDir: TaskSortDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
      onChangeSort({ ...sortConfig, direction: nextDir });
    } else {
      const targetOpt = SORT_OPTIONS.find((o) => o.id === field);
      const defaultDir = targetOpt?.defaultDirection || 'asc';
      onChangeSort({
        ...sortConfig,
        field,
        direction: defaultDir,
      });
    }
  };

  const handleToggleDirection = (dir: TaskSortDirection) => {
    onChangeSort({
      ...sortConfig,
      direction: dir,
    });
  };

  const handleResetSort = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChangeSort({ field: 'manual', direction: 'asc' });
  };

  const currentDirectionLabel = isVi
    ? sortConfig.direction === 'asc'
      ? activeOption.ascLabelVi
      : activeOption.descLabelVi
    : sortConfig.direction === 'asc'
    ? activeOption.ascLabelEn
    : activeOption.descLabelEn;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-7.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isSorted
              ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-500/30 shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5 border border-transparent'
          }`}
          title={isVi ? 'Sắp xếp công việc' : 'Sort tasks'}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {isSorted ? (isVi ? activeOption.labelVi : activeOption.labelEn) : isVi ? 'Sắp xếp' : 'Sort'}
          </span>

          {isSorted && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-white/10 px-1 py-0.5 rounded">
              {sortConfig.direction === 'asc' ? (
                <ArrowUp className="w-2.5 h-2.5" />
              ) : (
                <ArrowDown className="w-2.5 h-2.5" />
              )}
            </span>
          )}

          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Quick Clear Sort X Button when sorted */}
        {isSorted && (
          <button
            type="button"
            onClick={handleResetSort}
            className="ml-0.5 h-7.5 w-5 flex items-center justify-center text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            title={isVi ? 'Đặt lại về thứ tự thủ công' : 'Reset to manual order'}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1.5 z-50 w-80 p-2.5 bg-white/98 dark:bg-[#0d0f17]/98 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-2 font-sans text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {isVi ? 'Sắp xếp công việc' : 'Sort Tasks'}
                </span>
              </div>
              {isSorted && (
                <button
                  type="button"
                  onClick={handleResetSort}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isVi ? 'Mặc định' : 'Reset'}</span>
                </button>
              )}
            </div>

            {/* Direction Switcher (Shown when an active sort is selected) */}
            {isSorted && (
              <div className="bg-slate-50 dark:bg-white/[0.04] p-2 rounded-xl border border-slate-200/60 dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                  <span>{isVi ? 'Chiều sắp xếp:' : 'Sort direction:'}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black">
                    {currentDirectionLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-white dark:bg-white/[0.06] p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => handleToggleDirection('asc')}
                    className={`py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sortConfig.direction === 'asc'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span className="truncate">{isVi ? activeOption.ascLabelVi : activeOption.ascLabelEn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleDirection('desc')}
                    className={`py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sortConfig.direction === 'desc'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span className="truncate">{isVi ? activeOption.descLabelVi : activeOption.descLabelEn}</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Primary Sort Fields */}
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-0.5">
              {SORT_OPTIONS.map((opt) => {
                const isActive = sortConfig.field === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectField(opt.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-500/15 text-blue-900 dark:text-blue-100 font-bold border border-blue-200/60 dark:border-blue-500/25 shadow-2xs'
                        : 'hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-slate-700 dark:text-zinc-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${opt.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate leading-tight">
                            {isVi ? opt.labelVi : opt.labelEn}
                          </p>
                          {isActive && opt.id !== 'manual' && (
                            <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400">
                              {sortConfig.direction === 'asc' ? '↑ Tăng' : '↓ Giảm'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                          {isVi ? opt.descVi : opt.descEn}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {/* Custom fields sorting if available */}
              {customFields.length > 0 && (
                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-white/[0.06]">
                  <span className="px-2 text-[9.5px] font-black uppercase text-slate-400 dark:text-zinc-500 block mb-1">
                    {isVi ? 'Trường tùy chỉnh' : 'Custom Fields'}
                  </span>
                  {customFields.map((cf) => {
                    const cfId = `custom:${cf.name}`;
                    const isActive = sortConfig.field === cfId;
                    return (
                      <button
                        key={cfId}
                        type="button"
                        onClick={() => handleSelectField(cfId)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-blue-50/90 dark:bg-blue-500/15 text-blue-900 dark:text-blue-100 font-bold border border-blue-200/60 dark:border-blue-500/25'
                            : 'hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold truncate">{cf.name}</span>
                        </div>
                        {isActive && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Secondary Sort Section */}
            {isSorted && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-white/[0.08]">
                {!showSecondary ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecondary(true);
                      onChangeSort({
                        ...sortConfig,
                        secondaryField: sortConfig.field === 'priority' ? 'dueDate' : 'priority',
                        secondaryDirection: 'asc',
                      });
                    }}
                    className="w-full text-center py-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 cursor-pointer flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-lg transition-colors"
                  >
                    <span>+ {isVi ? 'Thêm sắp xếp phụ' : 'Add secondary sort'}</span>
                  </button>
                ) : (
                  <div className="bg-slate-50 dark:bg-white/[0.03] p-2 rounded-xl border border-slate-200/60 dark:border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>{isVi ? 'Sau đó sắp xếp theo:' : 'Then sort by:'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondary(false);
                          const { secondaryField, secondaryDirection, ...rest } = sortConfig;
                          onChangeSort(rest);
                        }}
                        className="text-rose-500 hover:underline text-[10px]"
                      >
                        {isVi ? 'Bỏ sắp xếp phụ' : 'Remove'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={sortConfig.secondaryField || 'dueDate'}
                        onChange={(e) =>
                          onChangeSort({
                            ...sortConfig,
                            secondaryField: e.target.value as TaskSortField,
                          })
                        }
                        className="flex-1 h-7.5 px-2 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none cursor-pointer"
                      >
                        {SORT_OPTIONS.filter((o) => o.id !== 'manual' && o.id !== sortConfig.field).map((o) => (
                          <option key={o.id} value={o.id}>
                            {isVi ? o.labelVi : o.labelEn}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeSort({
                            ...sortConfig,
                            secondaryDirection: sortConfig.secondaryDirection === 'asc' ? 'desc' : 'asc',
                          })
                        }
                        className="h-7.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 cursor-pointer flex items-center gap-0.5"
                        title={isVi ? 'Đổi chiều sắp xếp phụ' : 'Toggle secondary direction'}
                      >
                        {sortConfig.secondaryDirection === 'desc' ? '↓' : '↑'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
