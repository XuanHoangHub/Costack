"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  locale?: string;
  className?: string;
  autoFocusOnExpand?: boolean;
}

export default function ExpandableSearch({
  value,
  onChange,
  placeholder,
  locale = 'vi',
  className = '',
  autoFocusOnExpand = true,
}: ExpandableSearchProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand if external value becomes non-empty
  useEffect(() => {
    if (value && !isExpanded) {
      setIsExpanded(true);
    }
  }, [value, isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && autoFocusOnExpand) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, autoFocusOnExpand]);

  // Keyboard shortcut listener: Ctrl+K, Cmd+K, or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputActive = activeEl && (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
        activeEl.isContentEditable
      );

      // If user is inside our search input and hits Escape:
      if (activeEl === inputRef.current && e.key === 'Escape') {
        e.preventDefault();
        if (value) {
          onChange('');
        } else {
          setIsExpanded(false);
          inputRef.current?.blur();
        }
        return;
      }

      // If user is already typing in another input, don't hijack
      if (isInputActive) return;

      // Ctrl+K / Cmd+K or "/" to activate search
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
        e.preventDefault();
        setIsExpanded(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, onChange]);

  // Collapse if clicked outside and query is empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!value.trim()) {
          setIsExpanded(false);
        }
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, value]);

  const defaultPlaceholder = locale === 'vi' ? 'Tìm kiếm công việc...' : 'Search tasks...';
  const tooltipText = locale === 'vi' ? 'Tìm kiếm công việc (Ctrl+K)' : 'Search tasks (Ctrl+K)';

  return (
    <div ref={containerRef} className={`relative flex items-center shrink-0 ${className}`}>
      <motion.div
        initial={false}
        animate={{
          width: isExpanded ? 240 : 32,
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className={`h-8 rounded-xl flex items-center overflow-hidden transition-colors border shadow-3xs ${
          isExpanded
            ? 'bg-slate-50/95 dark:bg-white/[0.06] border-slate-300 dark:border-white/20 ring-2 ring-blue-500/20 px-2'
            : 'bg-slate-100/70 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-200/60 dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/15'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
            } else {
              inputRef.current?.focus();
            }
          }}
          className={`h-8 w-8 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
            isExpanded
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
          }`}
          title={isExpanded ? '' : tooltipText}
          aria-label={defaultPlaceholder}
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {isExpanded && (
          <div className="flex items-center flex-1 min-w-0 pr-0.5 ml-1">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || defaultPlaceholder}
              className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none border-none p-0 focus:ring-0 leading-tight"
            />
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-white/10 cursor-pointer ml-1 transition-colors shrink-0"
                title={locale === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/10 cursor-pointer ml-1 transition-colors shrink-0"
                title={locale === 'vi' ? 'Đóng (Esc)' : 'Close (Esc)'}
              >
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Esc</span>
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
