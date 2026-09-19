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
    { id: 'all', label: vi ? 'Tất cả' : 'All tasks', icon: ListFilter },
    { id: 'mine', label: vi ? 'Của tôi' : 'Assigned to me', icon: UserRound },
    { id: 'today', label: vi ? 'Hôm nay' : 'Due today', icon: CalendarDays },
    { id: 'overdue', label: vi ? 'Quá hạn' : 'Overdue', icon: Clock3 },
    { id: 'priority', label: vi ? 'Ưu tiên cao' : 'High priority', icon: Flag },
    { id: 'unassigned', label: vi ? 'Chưa giao' : 'Unassigned', icon: UsersRound },
    { id: 'completed', label: vi ? 'Hoàn thành' : 'Completed', icon: CheckCircle2 },
  ] as const;

  const activeItem = items.find(it => it.id === focus) || items[0];
  const ActiveIcon = activeItem.icon;
  const activeCount = tasks.filter(task => matchesSpaceFocus(task, activeItem.id, userId)).length;

  if (variant === 'inline') {
    return (
      <div className="space-focus-bar-inline flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
        {collapsed ? (
          <div className="flex items-center gap-2 shrink-0" ref={dropdownRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="space-focus-compact-pill"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                title={vi ? 'Bấm để đổi bộ lọc nhanh' : 'Click to change quick filter'}
              >
                <ActiveIcon size={14} className="shrink-0 text-sky-500" />
                <span className="font-semibold text-xs">{activeItem.label}</span>
                <span className={`space-focus-count ${activeCount > 0 ? 'has-items' : 'is-empty'}`}>{activeCount}</span>
                <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="space-focus-dropdown-menu" role="listbox">
                  {items.map(({ id, label, icon: Icon }) => {
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
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        <span className={`space-focus-count ${count > 0 ? 'has-items' : 'is-empty'}`}>
                          {count}
                        </span>
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
              className="space-focus-toggle-btn"
              title={vi ? 'Mở rộng bộ lọc nhanh' : 'Expand quick filters'}
            >
              <ChevronDown size={13} />
              <span className="hidden xl:inline text-xs">{vi ? 'Mở rộng' : 'Expand'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
            <div className="space-focus-options !overflow-visible shrink-0 flex items-center gap-1" role="group" aria-label={vi ? 'Lọc nhanh công việc' : 'Quick task filters'}>
              {items.map(({ id, label, icon: Icon }) => {
                const count = tasks.filter(task => matchesSpaceFocus(task, id, userId)).length;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={focus === id}
                    onClick={() => onFocusChange(id)}
                    disabled={id === 'mine' && !userId}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                    <span className={`space-focus-count ${count > 0 ? 'has-items' : 'is-empty'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {focus === 'upcoming' && (
                <button type="button" aria-pressed="true" onClick={() => onFocusChange('all')}>
                  <CalendarDays size={14} />
                  <span>{vi ? '7 ngày tới · Bỏ lọc' : 'Next 7 days · Clear'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={toggleCollapsed}
              className="space-focus-toggle-btn shrink-0 ml-0.5"
              title={vi ? 'Thu gọn bộ lọc nhanh' : 'Collapse quick filters'}
            >
              <ChevronUp size={13} />
              <span className="hidden xl:inline text-xs">{vi ? 'Thu gọn' : 'Collapse'}</span>
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
              <ActiveIcon size={14} className="shrink-0 text-sky-500" />
              <span className="font-semibold">{activeItem.label}</span>
              <span className={`space-focus-count ${activeCount > 0 ? 'has-items' : 'is-empty'}`}>{activeCount}</span>
              <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="space-focus-dropdown-menu" role="listbox">
                {items.map(({ id, label, icon: Icon }) => {
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
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="flex-1 text-left">{label}</span>
                      <span className={`space-focus-count ${count > 0 ? 'has-items' : 'is-empty'}`}>
                        {count}
                      </span>
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
            {items.map(({ id, label, icon: Icon }) => {
              const count = tasks.filter(task => matchesSpaceFocus(task, id, userId)).length;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={focus === id}
                  onClick={() => onFocusChange(id)}
                  disabled={id === 'mine' && !userId}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  <span className={`space-focus-count ${count > 0 ? 'has-items' : 'is-empty'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {focus === 'upcoming' && (
              <button type="button" aria-pressed="true" onClick={() => onFocusChange('all')}>
                <CalendarDays size={14} />
                <span>{vi ? '7 ngày tới · Bỏ lọc' : 'Next 7 days · Clear'}</span>
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
