"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { useDropdownPosition } from '../tasks/TaskSelects';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'md';

interface SelectProps<T extends string | number> {
  value: T | undefined | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  size?: SelectSize;
  /** Extra classes for the trigger — width/layout only (w-40, w-full…). Base styling is provided. */
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Estimated menu width used for viewport clamping. Defaults to 220. */
  menuWidth?: number;
  menuMaxHeight?: number;
  align?: 'left' | 'right';
  disabled?: boolean;
  /** Forwarded to the trigger button — use for e.g. stopPropagation inside clickable rows. */
  onClick?: (e: React.MouseEvent) => void;
}

function optionText(label: React.ReactNode): string {
  return typeof label === 'string' ? label : '';
}

export function Select<T extends string | number = string>({
  value,
  onChange,
  options,
  size = 'md',
  className = '',
  placeholder,
  ariaLabel,
  menuWidth = 220,
  menuMaxHeight = 264,
  align = 'left',
  disabled = false,
  onClick,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [typeahead, setTypeahead] = useState('');
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const { coords, openUpward } = useDropdownPosition(
    open,
    ref,
    Math.min(menuMaxHeight, options.length * 36 + 12),
    menuWidth
  );

  const selectedIndex = useMemo(() => options.findIndex(o => o.value === value), [options, value]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Open with the current selection highlighted (or first enabled option).
  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex(o => !o.disabled));
      setTypeahead('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the highlighted option in view while navigating with the keyboard.
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-option-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const moveActive = (delta: number) => {
    if (!options.length) return;
    let next = activeIndex;
    for (let step = 0; step < options.length; step++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    setActiveIndex(next);
  };

  const jumpActive = (fromStart: boolean) => {
    if (!options.length) return;
    if (fromStart) {
      const first = options.findIndex(o => !o.disabled);
      if (first >= 0) setActiveIndex(first);
    } else {
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i].disabled) {
          setActiveIndex(i);
          break;
        }
      }
    }
  };

  const handleTypeahead = (char: string) => {
    const query = (typeahead + char.toLowerCase()).slice(0, 12);
    setTypeahead(query);
    const start = activeIndex >= 0 ? activeIndex + 1 : 0;
    for (let i = 0; i < options.length; i++) {
      const idx = (start + i) % options.length;
      if (options[idx].disabled) continue;
      const text = optionText(options[idx].label).toLowerCase();
      if (text && text.startsWith(query)) {
        setActiveIndex(idx);
        break;
      }
    }
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    typeaheadTimer.current = setTimeout(() => setTypeahead(''), 500);
  };

  useEffect(() => () => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
  }, []);

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(options.length - 1);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        jumpActive(true);
        break;
      case 'End':
        e.preventDefault();
        jumpActive(false);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handleTypeahead(e.key);
        }
    }
  };

  const sizeClasses = size === 'sm'
    ? 'h-8 px-2.5 text-[11px] gap-1.5'
    : 'h-10 px-3 text-sm gap-2';

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    minWidth: coords ? coords.width : menuWidth,
    maxWidth: menuWidth * 1.6,
    ...(coords
      ? openUpward
        ? { bottom: window.innerHeight - coords.top + 6, ...(align === 'right' ? { right: window.innerWidth - coords.right } : { left: coords.safeLeft }) }
        : { top: coords.bottom + 6, ...(align === 'right' ? { right: window.innerWidth - coords.right } : { left: coords.safeLeft }) }
      : {}),
  };

  const dropdownContent = (
    <motion.div
      ref={dropdownRef}
      role="listbox"
      id={listboxId}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }}
      transition={{ duration: 0.13 }}
      style={{ ...menuStyle, transformOrigin: openUpward ? 'bottom' : 'top' }}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg"
    >
      {options.length === 0 && (
        <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 select-none">—</div>
      )}
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: menuMaxHeight }}>
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <button
              key={`${option.value}`}
              type="button"
              role="option"
              data-option-index={index}
              aria-selected={isSelected}
              aria-disabled={option.disabled}
              tabIndex={-1}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onClick={() => commit(index)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs rounded-lg cursor-pointer transition-colors ${
                option.disabled
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : isActive
                      ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="flex-1 min-w-0 truncate">
                {option.label}
                {option.description && (
                  <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate">{option.description}</span>
                )}
              </span>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-500" />}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div ref={ref} className={`relative inline-flex max-w-full ${className}`} style={{ minWidth: 0 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={e => {
          if (disabled) return;
          onClick?.(e);
          setOpen(!open);
        }}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`group w-full inline-flex items-center justify-between ${sizeClasses} rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none outline-none transition-colors hover:border-slate-300 dark:hover:border-slate-600 focus-visible:border-indigo-500 focus-visible:ring-3 focus-visible:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? '' : 'active:scale-[0.99]'}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
          {selected ? selected.label : (placeholder ?? '—')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {typeof document !== 'undefined' && coords && createPortal(
        <AnimatePresence>
          {open && dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
