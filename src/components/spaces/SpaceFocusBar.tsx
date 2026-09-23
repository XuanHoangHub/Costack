"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock3, 
  Flag, 
  ListFilter, 
  UserRound, 
  UsersRound, 
  CalendarDays, 
  ChevronDown, 
  ChevronUp, 
  Check 
} from 'lucide-react';
import type { Task } from '../../types';
import { matchesSpaceFocus, type SpaceFocus } from '../../lib/spaceInsights';

interface Props {
  tasks: Task[];
  focus: SpaceFocus;
  onFocusChange: (focus: SpaceFocus) => void;
  userId?: string;
  locale: string;
  resultCount: number;
  variant?: 'standalone' | 'inline';
}

export default function SpaceFocusBar({ tasks, focus, onFocusChange, userId, locale, resultCount, variant = 'standalone' }: Props) {
  const vi = locale === 'vi';
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('apexa-space-focus-bar-collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('apexa-space-focus-bar-collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const items = [
    { id: 'all', label: vi ? 'Tất cả' : 'All', title: vi ? 'Tất cả công việc' : 'All tasks', icon: ListFilter },
    { id: 'mine', label: vi ? 'Của tôi' : 'Mine', title: vi ? 'Giao cho tôi' : 'Assigned to me', icon: UserRound },
    { id: 'today', label: vi ? 'Hôm nay' : 'Today', title: vi ? 'Đến hạn hôm nay' : 'Due today', icon: CalendarDays },
    { id: 'overdue', label: vi ? 'Quá hạn' : 'Overdue', title: vi ? 'Quá hạn chót' : 'Overdue tasks', icon: Clock3 },
    { id: 'priority', label: vi ? 'Ưu tiên' : 'Priority', title: vi ? 'Ưu tiên cao' : 'High priority', icon: Flag },
    { id: 'unassigned', label: vi ? 'Chưa giao' : 'Unassigned', title: vi ? 'Chưa phân công' : 'Unassigned tasks', icon: UsersRound },
    { id: 'completed', label: vi ? 'Xong' : 'Done', title: vi ? 'Đã hoàn thành' : 'Completed tasks', icon: CheckCircle2 },
  ] as const;

  const activeItem = items.find(it => it.id === focus) || items[0];
  const ActiveIcon = activeItem.icon;
  const activeCount = tasks.filter(task => matchesSpaceFocus(task, activeItem.id, userId)).length;

  if (variant === 'inline') {
    return (
      <div className="space-focus-bar-inline flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
        {collapsed ? (
          <div className="flex items-center gap-1.5 shrink-0" ref={dropdownRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="space-focus-compact-pill"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                title={vi ? 'Bấm để đổi bộ lọc nhanh' : 'Click to change quick filter'}
              >
                <ActiveIcon size={13.5} className="shrink-0 text-sky-500" />
                <span className="font-semibold text-xs">{activeItem.label}</span>
                {activeCount > 0 && (
                  <span className={`space-focus-count has-items ${activeItem.id === 'overdue' ? 'is-overdue' : ''}`}>{activeCount}</span>
                )}
                <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="space-focus-dropdown-menu" role="listbox">
                  {items.map(({ id, label, title, icon: Icon }) => {
                    const count = tasks.filter(task => matchesSpaceFocus(task, id, userId)).length;
                    const isSelected = focus === id;
                    const disabled = id === 'mine' && !userId;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={disabled}
                        onClick={() => {
                          onFocusChange(id);
                          setIsDropdownOpen(false);
                        }}
                        className={`space-focus-dropdown-item ${isSelected ? 'is-active' : ''}`}
                        title={title}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="flex-1 text-left">{title}</span>
                        {count > 0 && (
                          <span className={`space-focus-count has-items ${id === 'overdue' ? 'is-overdue' : ''}`}>
                            {count}
                          </span>
                        )}
                        {isSelected && <Check size={13} className="shrink-0 text-sky-500 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleCollapsed}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
              title={vi ? 'Mở rộng tất cả bộ lọc' : 'Expand all filters'}
              aria-label={vi ? 'Mở rộng tất cả bộ lọc' : 'Expand all filters'}
            >
              <ChevronDown size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
            <div className="space-focus-options !overflow-visible shrink-0 flex items-center gap-1" role="group" aria-label={vi ? 'Lọc nhanh công việc' : 'Quick task filters'}>
              {items.map(({ id, label, title, icon: Icon }) => {
                const count = tasks.filter(task => matchesSpaceFocus(task, id, userId)).length;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={focus === id}
                    onClick={() => onFocusChange(id)}
                    disabled={id === 'mine' && !userId}
                    title={title}
                  >
                    <Icon size={13.5} className="shrink-0" />
                    <span>{label}</span>
                    {count > 0 && (
                      <span className={`space-focus-count has-items ${id === 'overdue' ? 'is-overdue' : ''}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {focus === 'upcoming' && (
                <button type="button" aria-pressed="true" onClick={() => onFocusChange('all')}>
                  <CalendarDays size={13.5} className="shrink-0" />
                  <span>{vi ? '7 ngày tới · Bỏ' : 'Next 7d · Clear'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={toggleCollapsed}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 ml-0.5"
              title={vi ? 'Thu gọn bộ lọc nhanh' : 'Collapse quick filters'}
              aria-label={vi ? 'Thu gọn bộ lọc nhanh' : 'Collapse quick filters'}
            >
              <ChevronUp size={13} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-focus-bar ${collapsed ? 'is-collapsed' : ''}`}>
      {collapsed ? (
        <div className="space-focus-compact-row" ref={dropdownRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="space-focus-compact-pill"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              title={vi ? 'Bấm để đổi bộ lọc nhanh' : 'Click to change quick filter'}
            >
              <ActiveIcon size={13.5} className="shrink-0 text-sky-500" />
              <span className="font-semibold">{activeItem.label}</span>
              {activeCount > 0 && (
                <span className={`space-focus-count has-items ${activeItem.id === 'overdue' ? 'is-overdue' : ''}`}>{activeCount}</span>
              )}
              <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="space-focus-dropdown-menu" role="listbox">
                {items.map(({ id, label, title, icon: Icon }) => {
                  const count = tasks.filter(task => matchesSpaceFocus(task, id, userId)).length;
                  const isSelected = focus === id;
                  const disabled = id === 'mine' && !userId;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={disabled}
                      onClick={() => {
                        onFocusChange(id);
                        setIsDropdownOpen(false);
                      }}
                      className={`space-focus-dropdown-item ${isSelected ? 'is-active' : ''}`}
                      title={title}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="flex-1 text-left">{title}</span>
                      {count > 0 && (
                        <span className={`space-focus-count has-items ${id === 'overdue' ? 'is-overdue' : ''}`}>
                          {count}
                        </span>
                      )}
                      {isSelected && <Check size={13} className="shrink-0 text-sky-500 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-focus-compact-right">
            <span className="space-result-count" role="status" aria-live="polite">
              {resultCount} {vi ? 'kết quả' : 'results'}
            </span>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="space-focus-toggle-btn"
              title={vi ? 'Mở rộng bộ lọc nhanh' : 'Expand quick filters'}
            >
              <ChevronDown size={13} />
              <span>{vi ? 'Mở rộng' : 'Expand'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-focus-options" role="group" aria-label={vi ? 'Lọc nhanh công việc' : 'Quick task filters'}>
            {items.map(({ id, label, title, icon: Icon }) => {
              const count = tasks.filter(task => matchesSpaceFocus(task, id, userId)).length;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={focus === id}
                  onClick={() => onFocusChange(id)}
                  disabled={id === 'mine' && !userId}
                  title={title}
                >
                  <Icon size={13.5} className="shrink-0" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`space-focus-count has-items ${id === 'overdue' ? 'is-overdue' : ''}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {focus === 'upcoming' && (
              <button type="button" aria-pressed="true" onClick={() => onFocusChange('all')}>
                <CalendarDays size={13.5} className="shrink-0" />
                <span>{vi ? '7 ngày tới · Bỏ' : 'Next 7d · Clear'}</span>
              </button>
            )}
          </div>

          <div className="space-focus-right">
            <span className="space-result-count" role="status" aria-live="polite">
              {resultCount} {vi ? 'kết quả' : 'results'}
            </span>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="space-focus-toggle-btn"
              title={vi ? 'Thu gọn bộ lọc nhanh' : 'Collapse quick filters'}
            >
              <ChevronUp size={13} />
              <span>{vi ? 'Thu gọn' : 'Collapse'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
