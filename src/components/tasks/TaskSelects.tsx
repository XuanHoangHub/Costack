"use client";

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, CalendarDays, ChevronLeft, ChevronRight, X, Clock, ChevronUp, Flag } from 'lucide-react';
import { Priority, TaskStatus, User, Workspace } from '../../types';
import SignedImage from '../SignedImage';
import { getStoredPriorities, getStoredStatuses, OptionConfig, getStoredDateFormat, formatCustomDate, DateFormatOption, getLocalizedOptionLabel, getColorOption, COLOR_PALETTE, getStoredCustomFieldsConfig } from '../../utils/fieldConfig';
import { renderSpaceIcon } from '../EmojiIconPicker';
import { useTranslation } from '../../contexts/TranslationContext';

// ── Custom Hook for Portal Positioning ──
export function useDropdownPosition(isOpen: boolean, containerRef: React.RefObject<HTMLDivElement | null>, dropdownHeight: number = 200, dropdownWidth: number = 160) {
  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number; safeLeft: number } | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Smart vertical check: if space below is less than dropdownHeight and there is more space above, open upward.
      const upward = spaceBelow < dropdownHeight && rect.top > spaceBelow;
      setOpenUpward(upward);
      
      // Calculate safe left position to avoid horizontal clipping
      let safeLeft = rect.left;
      if (safeLeft + dropdownWidth > window.innerWidth) {
        safeLeft = window.innerWidth - dropdownWidth - 8;
      }
      safeLeft = Math.max(8, safeLeft);

      setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, safeLeft });
    };
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, containerRef, dropdownHeight, dropdownWidth]);

  return { coords, openUpward };
}

// ── Priority Pill Select ──
export function PriorityPillSelect({ value, onChange }: { value: Priority | undefined | null; onChange: (v: Priority | undefined) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 180, 160);
  const [priorities, setPriorities] = useState<OptionConfig[]>([]);

  const reloadPriorities = () => {
    setPriorities(getStoredPriorities());
  };

  React.useEffect(() => {
    reloadPriorities();
    window.addEventListener('apexa-field-config-changed', reloadPriorities);
    return () => window.removeEventListener('apexa-field-config-changed', reloadPriorities);
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const metaList = priorities.length > 0 ? priorities : [
    { id: 'urgent', label: 'Urgent', color: 'red', icon: 'AlertOctagon' },
    { id: 'high', label: 'High', color: 'orange', icon: 'AlertTriangle' },
    { id: 'medium', label: 'Normal', color: 'amber', icon: 'CircleDot' },
    { id: 'low', label: 'Low', color: 'slate', icon: 'Circle' }
  ];

  const cur = value ? metaList.find(p => p.id === value) : null;
  const curColorMeta = cur ? getColorOption(cur.color) : null;

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-40"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${!value ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
        {renderSpaceIcon('Circle', 'w-3 h-3 text-slate-400')}
        <span>{locale === 'vi' ? 'Không có (Trống)' : 'None (Empty)'}</span>
        {!value && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
      </button>
      {metaList.map(p => {
        const colorMeta = getColorOption(p.color);
        return (
          <button key={p.id} type="button" onClick={() => { onChange(p.id as Priority); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${value === p.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
            <span style={{ color: colorMeta.hex }}>
              {renderSpaceIcon(p.icon || 'Circle', 'w-3 h-3')}
            </span>
            <span>{getLocalizedOptionLabel(p.id, p.label, locale)}</span>
            {value === p.id && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className={cur && curColorMeta 
          ? `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${curColorMeta.priorityPill} ${curColorMeta.text}`
          : `inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer select-none transition-all border-0 bg-transparent`}>
        {cur && curColorMeta ? (
          <>
            <span style={{ color: curColorMeta.hex }}>
              {renderSpaceIcon(cur.icon || 'Circle', 'w-3 h-3')}
            </span>
            <span>{getLocalizedOptionLabel(cur.id, cur.label, locale)}</span>
          </>
        ) : (
          <span>{locale === 'vi' ? 'Trống' : 'Empty'}</span>
        )}
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
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

export function StatusPillSelect({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 150, 160);
  const [statuses, setStatuses] = useState<OptionConfig[]>([]);

  const reloadStatuses = () => {
    setStatuses(getStoredStatuses());
  };

  React.useEffect(() => {
    reloadStatuses();
    window.addEventListener('apexa-field-config-changed', reloadStatuses);
    return () => window.removeEventListener('apexa-field-config-changed', reloadStatuses);
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const metaList: OptionConfig[] = statuses.length > 0 ? statuses : [
    { id: 'todo', label: 'TO DO', color: 'slate' },
    { id: 'inprogress', label: 'IN PROGRESS', color: 'amber' },
    { id: 'review', label: 'UNDER REVIEW', color: 'cyan' },
    { id: 'completed', label: 'COMPLETED', color: 'emerald' },
  ];

  const cur = metaList.find(s => s.id === value) || metaList[0];
  const curColorMeta = getColorOption(cur.color);

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-40"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      {metaList.map(s => {
        const colorMeta = getColorOption(s.color);
        return (
          <button key={s.id} type="button" onClick={() => { onChange(s.id as TaskStatus); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-black rounded-lg cursor-pointer transition-colors uppercase tracking-wider ${value === s.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
            <span 
              className="w-2 h-2 rounded-full shrink-0 shadow-2xs" 
              style={{ backgroundColor: colorMeta.hex }} 
            />
            <span>{getLocalizedOptionLabel(s.id, s.label, locale)}</span>
            {value === s.id && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer select-none transition-all uppercase tracking-wider hover:shadow-sm ${curColorMeta.statusPill}`}>
        <span 
          className="w-2 h-2 rounded-full shrink-0 shadow-2xs" 
          style={{ backgroundColor: curColorMeta.hex }} 
        />
        <span>{getLocalizedOptionLabel(cur.id, cur.label, locale)}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
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

// ── Assignee Pill Select ──
export function AssigneePillSelect({ value, members, onChange, compact = false }: { value: string | string[] | null; members: User[]; onChange: (v: string[] | null) => void; compact?: boolean }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 290, 260);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const valueIds = Array.isArray(value) ? value : value ? [value] : [];
  const selectedMembers = members.filter(member => valueIds.includes(member.id));
  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter(member => `${member.name} ${member.email || ''}`.toLowerCase().includes(normalized));
  }, [members, query]);

  const toggleAssignee = (memberId: string) => {
    const nextIds = valueIds.includes(memberId)
      ? valueIds.filter(id => id !== memberId)
      : [...valueIds, memberId];
    onChange(nextIds.length > 0 ? nextIds : null);
  };

  const clearAssignees = () => {
    onChange(null);
    setOpen(false);
  };

  const avatar = (member: User, className: string) => member.avatar ? (
    <SignedImage filePath={member.avatar} className={`${className} object-cover`} alt={member.name} />
  ) : (
    <span className={`${className} flex items-center justify-center bg-violet-500 text-white text-[9px] font-bold`} aria-hidden="true">
      {(member.name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );

  const displayLabel = selectedMembers.length === 0
    ? (locale === 'vi' ? 'Chưa phân công' : 'Unassigned')
    : selectedMembers.length === 1
      ? selectedMembers[0].name
      : locale === 'vi' ? `${selectedMembers.length} người phụ trách` : `${selectedMembers.length} assignees`;

  const dropdownContent = coords ? (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'fixed',
        top: openUpward ? coords.top - 8 : coords.bottom + 8,
        left: coords.safeLeft,
        width: Math.max(240, Math.min(300, coords.width + 80)),
        transform: openUpward ? 'translateY(-100%)' : undefined,
        zIndex: 1000,
      }}
      className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
      role="listbox"
      aria-label={locale === 'vi' ? 'Người phụ trách' : 'Assignee'}
    >
      <div className="border-b border-slate-100 p-2 dark:border-slate-800">
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={locale === 'vi' ? 'Tìm thành viên...' : 'Search members...'}
          className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-violet-900/40"
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-1.5">
        <button
          type="button"
          role="option"
          aria-selected={selectedMembers.length === 0}
          onClick={clearAssignees}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] dark:border-slate-700">−</span>
          <span className="flex-1">{locale === 'vi' ? 'Bỏ phân công' : 'Unassign'}</span>
          {selectedMembers.length === 0 && <Check className="h-3.5 w-3.5 text-violet-500" />}
        </button>
        {filteredMembers.map(member => {
          const selected = valueIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => toggleAssignee(member.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${selected ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'}`}
            >
              {avatar(member, 'h-5 w-5 shrink-0 rounded-full')}
              <span className="min-w-0 flex-1 truncate">{member.name}</span>
              {selected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
            </button>
          );
        })}
        {filteredMembers.length === 0 && (
          <div className="px-2.5 py-4 text-center text-xs text-slate-400">
            {locale === 'vi' ? 'Không tìm thấy thành viên' : 'No members found'}
          </div>
        )}
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={ref} className="relative inline-block min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/30 ${compact ? 'max-w-[180px]' : ''}`}
      >
        {selectedMembers.length > 0 ? (
          <span className="flex shrink-0 -space-x-1.5">
            {selectedMembers.slice(0, 2).map(member => <span key={member.id} className="rounded-full border-2 border-white dark:border-slate-900">{avatar(member, 'h-5 w-5 rounded-full')}</span>)}
          </span>
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-400 dark:border-slate-700">−</span>
        )}
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {typeof document !== 'undefined' && open && coords && createPortal(dropdownContent, document.body)}
    </div>
  );
}
export function PremiumDatePicker({ label, dateValue, timeValue, onChange, startDateValue = '', onStartDateChange, clearable = true, align = 'right', className = '', displayLabel }: {
  label?: string; dateValue: string; timeValue?: string; onChange: (value: string | undefined) => void; startDateValue?: string; onStartDateChange?: (value: string | undefined) => void; clearable?: boolean; align?: 'left' | 'right' | 'center'; className?: string; displayLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [dateFormat, setDateFormat] = useState<DateFormatOption>(() => getStoredDateFormat());

  React.useEffect(() => {
    const handleFormatChange = () => {
      setDateFormat(getStoredDateFormat());
    };
    window.addEventListener('apexa-field-config-changed', handleFormatChange);
    return () => window.removeEventListener('apexa-field-config-changed', handleFormatChange);
  }, []);
  
  const [activeTab, setActiveTab] = useState<'start' | 'due'>(() => {
    if (label?.toLowerCase() === 'start') return 'start';
    return 'due';
  });

  const [localStartDate, setLocalStartDate] = useState('');
  const [localStartDateTime, setLocalStartDateTime] = useState('');
  const [localDueDate, setLocalDueDate] = useState('');
  const [localDueDateTime, setLocalDueDateTime] = useState('');

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerView, setPickerView] = useState<'calendar' | 'monthyear' | 'weekly' | 'presets'>('calendar');
  const [weekOffset, setWeekOffset] = useState(0);

  React.useEffect(() => {
    if (isOpen) {
      const startParts = startDateValue ? startDateValue.split('T') : ['', ''];
      setLocalStartDate(startParts[0] || '');
      setLocalStartDateTime(startParts[1] || '');

      const dueParts = dateValue ? dateValue.split('T') : ['', ''];
      setLocalDueDate(dueParts[0] || '');
      setLocalDueDateTime(dueParts[1] || '');
      
      setActiveTab(label?.toLowerCase() === 'start' ? 'start' : 'due');
      setPickerView('calendar');
      setWeekOffset(0);
    }
  }, [isOpen, startDateValue, dateValue, label]);

  const activeDateStr = activeTab === 'start' ? localStartDate : localDueDate;
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  React.useEffect(() => {
    if (activeDateStr) {
      const parts = activeDateStr.split('-');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0]) || new Date().getFullYear());
        setCurrentMonth(parseInt(parts[1]) - 1);
      }
    } else {
      setCurrentYear(new Date().getFullYear());
      setCurrentMonth(new Date().getMonth());
    }
  }, [activeTab, activeDateStr]);

  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number } | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowTimePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      setOpenUpward(spaceBelow < 450 && rect.top > spaceBelow);
      
      setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width });
    };
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => { window.removeEventListener('scroll', updateCoords, true); window.removeEventListener('resize', updateCoords); };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowTimePicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells = adjustedFirstDay + daysInMonth;
  const trailingDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

  const saveDate = (datePart: string, timePart: string, target: 'start' | 'due') => {
    const fullVal = datePart ? (timePart ? `${datePart}T${timePart}` : datePart) : undefined;
    if (target === 'start') {
      setLocalStartDate(datePart);
      setLocalStartDateTime(timePart);
      onStartDateChange?.(fullVal);
    } else {
      setLocalDueDate(datePart);
      setLocalDueDateTime(timePart);
      onChange(fullVal);
    }
  };

  // Auto-switch: after picking start date, jump to due date tab
  const selectDate = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const newDate = `${currentYear}-${mm}-${dd}`;
    const activeTime = activeTab === 'start' ? localStartDateTime : localDueDateTime;
    saveDate(newDate, activeTime, activeTab);

    // Auto-switch: when start date is picked, automatically jump to due date
    if (activeTab === 'start') {
      setTimeout(() => setActiveTab('due'), 180);
    }
  };

  const selectPreset = (offsetDays: number, setTimeLabel?: string) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const newDate = `${yyyy}-${mm}-${dd}`;
    
    let targetTime = activeTab === 'start' ? localStartDateTime : localDueDateTime;
    if (setTimeLabel) {
      targetTime = setTimeLabel;
    }
    
    saveDate(newDate, targetTime, activeTab);
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());

    // Auto-switch on preset too
    if (activeTab === 'start') {
      setTimeout(() => setActiveTab('due'), 180);
    }
  };

  const clearActiveDate = (target: 'start' | 'due') => {
    saveDate('', '', target);
  };

  const applyTime = (time: string) => {
    if (activeTab === 'start') {
      setLocalStartDateTime(time);
      if (localStartDate) saveDate(localStartDate, time, 'start');
    } else {
      setLocalDueDateTime(time);
      if (localDueDate) saveDate(localDueDate, time, 'due');
    }
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSaturday = (6 - dayOfWeek + 7) % 7;
  const daysToMonday = (1 - dayOfWeek + 7) % 7;

  const formatDateForBox = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
    }
    return dateStr;
  };

  const formatDateLabel = (dateValue: string) => {
    return formatCustomDate(dateValue, dateFormat);
  };

  // Calculate duration between start and due
  const getDurationLabel = () => {
    if (!localStartDate || !localDueDate) return null;
    const start = new Date(localStartDate);
    const end = new Date(localDueDate);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return null;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Same day';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays === 7) return '1 week';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ${diffDays % 7}d`;
    return `${Math.floor(diffDays / 30)}mo ${diffDays % 30}d`;
  };

  const isStart = label?.toLowerCase() === 'start';
  const activeDateValue = isStart ? (startDateValue || dateValue) : dateValue;
  const displayText = displayLabel || (activeDateValue ? formatDateLabel(activeDateValue) : (label || 'Select Date'));

  const isOverdue = dateValue && dateValue.split('T')[0] < todayStr && label?.toLowerCase() === 'due';

  const startOfWeek = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const weeklyDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + index);
    return d;
  }), [startOfWeek]);

  const calendarContent = (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 28, stiffness: 380 }}
      role="dialog"
      aria-label="Chọn ngày công việc"
      className="select-none rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col font-sans overflow-hidden"
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: 'min(336px, calc(100vw - 16px))',
        boxShadow: '0 20px 48px -16px rgba(15,23,42,0.28), 0 0 0 1px rgba(15,23,42,0.03)',
        ...(coords ? (() => {
          const pickerWidth = Math.min(336, window.innerWidth - 16);
          let left = align === 'right' ? coords.right - pickerWidth : coords.left;
          left = Math.max(8, left);
          if (left + pickerWidth > window.innerWidth) {
            left = window.innerWidth - pickerWidth - 8;
          }
          return openUpward
            ? { bottom: window.innerHeight - coords.top + 8, left }
            : { top: coords.bottom + 8, left };
        })() : {})
      }}
    >
      {/* ── Header: Start/Due Date Toggle Pills ── */}
      <div className="p-2.5 pb-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            aria-pressed={activeTab === 'start'}
            className={`min-w-0 flex items-center gap-1.5 h-9 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'start'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{localStartDate ? formatDateForBox(localStartDate) : 'Start date'}</span>
          </button>

          {/* Arrow connector */}
          <div className="flex flex-col items-center shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('due')}
            aria-pressed={activeTab === 'due'}
            className={`min-w-0 flex items-center gap-1.5 h-9 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'due'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{localDueDate ? formatDateForBox(localDueDate) : 'Due date'}</span>
          </button>
        </div>

        {/* Duration badge */}
        {getDurationLabel() && (
          <div className="flex items-center justify-center mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold rounded-full">
              <Clock className="w-3 h-3" />
              {getDurationLabel()}
            </span>
          </div>
        )}
      </div>

      <div className="px-3 pb-2 flex-1">
        {pickerView === 'calendar' && (
          <div>
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <button
                type="button"
                onClick={() => setPickerView('monthyear')}
                className="rounded-lg px-1.5 py-1 text-[13px] font-bold text-slate-900 dark:text-slate-100 tracking-tight hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Chọn tháng và năm"
              >
                {monthNamesFull[currentMonth]} {currentYear}
              </button>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <div className="flex items-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 overflow-hidden">
                  <button type="button" aria-label="Tháng trước" onClick={prevMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Tháng sau" onClick={nextMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 text-center mb-1 px-0.5">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="py-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">{d}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid with range highlighting */}
            <div className="grid grid-cols-7 gap-0 px-0.5">
              {/* Previous month ghost days */}
              {Array.from({ length: adjustedFirstDay }).map((_, i) => {
                const ghostDay = prevMonthDays - adjustedFirstDay + 1 + i;
                return (
                  <div key={`prev-${i}`} className="flex h-9 items-center justify-center w-full">
                    <span className="text-[11px] font-medium text-slate-300 dark:text-slate-700">{ghostDay}</span>
                  </div>
                );
              })}

              {/* Current month days with range visualization */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isStartDate = dateStr === localStartDate;
                const isDueDate = dateStr === localDueDate;
                const isSelected = isStartDate || isDueDate;
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;

                // Range highlighting logic
                const inRange = localStartDate && localDueDate && dateStr > localStartDate && dateStr < localDueDate;
                const isRangeStart = isStartDate && localDueDate && localStartDate < localDueDate;
                const isRangeEnd = isDueDate && localStartDate && localStartDate < localDueDate;

                return (
                  <div key={day} className="relative flex h-9 items-center justify-center w-full">
                    {/* Range background band */}
                    {(inRange || isRangeStart || isRangeEnd) && (
                      <div
                        className={`absolute inset-y-[4px] bg-indigo-50 dark:bg-indigo-950/25 ${
                          isRangeStart ? 'left-1/2 right-0 rounded-l-lg' :
                          isRangeEnd ? 'left-0 right-1/2 rounded-r-lg' :
                          'left-0 right-0'
                        }`}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => selectDate(day)}
                      aria-label={`${activeTab === 'start' ? 'Start' : 'Due'} date ${monthNamesFull[currentMonth]} ${day}, ${currentYear}`}
                      aria-pressed={isSelected}
                      className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
                        ${isStartDate
                          ? 'text-white font-black bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-blue-500/25 ring-2 ring-indigo-400/30'
                          : isDueDate
                            ? 'text-white font-black bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-cyan-500/25 ring-2 ring-violet-400/30'
                            : inRange
                              ? 'font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                              : isToday
                                ? 'font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                : isPast
                                  ? 'font-medium text-slate-350 dark:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-500'
                                  : 'font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:scale-[1.08] active:scale-95'
                        }`}
                    >
                      {isToday && !isSelected && (
                        <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
                      )}
                      {day}
                    </button>
                  </div>
                );
              })}

              {/* Next month ghost days */}
              {Array.from({ length: trailingDays }).map((_, i) => (
                <div key={`next-${i}`} className="flex h-9 items-center justify-center w-full">
                  <span className="text-[11px] font-medium text-slate-355 dark:text-slate-700">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pickerView === 'monthyear' && (
          <div className="flex flex-col pt-1">
            {/* Year Selector */}
            <div className="flex items-center justify-between mb-3 px-2">
              <button 
                type="button" 
                onClick={() => setCurrentYear(y => y - 1)} 
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                {currentYear}
              </span>
              <button 
                type="button" 
                onClick={() => setCurrentYear(y => y + 1)} 
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Months 3x4 Grid */}
            <div className="grid grid-cols-3 gap-2 px-1 pb-1">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCurrentMonth(idx);
                    setPickerView('calendar');
                  }}
                  className={`py-2.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all border ${
                    currentMonth === idx 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-blue-500/20' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {pickerView === 'weekly' && (
          <div className="flex flex-col pt-1">
            {/* Week Offset Nav */}
            <div className="flex items-center justify-between mb-3 px-2">
              <button 
                type="button" 
                onClick={() => setWeekOffset(w => w - 1)} 
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Tuần bắt đầu {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button 
                type="button" 
                onClick={() => setWeekOffset(w => w + 1)} 
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 px-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">{d}</span>
              ))}
            </div>

            {/* Week Days Buttons */}
            <div className="grid grid-cols-7 gap-1 px-1">
              {weeklyDays.map((d: Date, i: number) => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const isSelected = dateStr === (activeTab === 'start' ? localStartDate : localDueDate);
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      saveDate(dateStr, activeTab === 'start' ? localStartDateTime : localDueDateTime, activeTab);
                      if (activeTab === 'start') {
                        setTimeout(() => setActiveTab('due'), 180);
                      }
                    }}
                    className={`py-3 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-blue-500/20'
                        : isToday
                          ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[9px] font-medium opacity-65">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-xs font-black">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {pickerView === 'presets' && (
          <div className="flex flex-col gap-1.5 px-1 pb-1 max-h-[250px] overflow-y-auto custom-scrollbar">
            {[
              { label: 'Today', desc: 'Set date to today', icon: 'Calendar', offset: 0 },
              { label: 'Tomorrow', desc: 'Set date to tomorrow', icon: 'Sun', offset: 1 },
              { label: 'This Weekend (Sat)', desc: 'Set date to Saturday', icon: 'Sparkles', offset: daysToSaturday === 0 ? 7 : daysToSaturday },
              { label: 'Next Week (Mon)', desc: 'Set date to next Monday', icon: 'Briefcase', offset: daysToMonday === 0 ? 7 : daysToMonday },
              { label: 'In 2 Weeks', desc: 'Set date in 14 days', icon: 'Clock', offset: 14 },
              { label: 'In 1 Month', desc: 'Set date in 28 days', icon: 'CalendarDays', offset: 28 },
              { label: 'No Date (Clear)', desc: 'Clear date selection', icon: 'X', offset: null },
            ].map(item => {
              let calcStr = '';
              if (item.offset !== null) {
                const d = new Date();
                d.setDate(d.getDate() + item.offset);
                calcStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.offset === null) {
                      clearActiveDate(activeTab);
                    } else {
                      selectPreset(item.offset);
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/40 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    {renderSpaceIcon(item.icon, "w-4 h-4 text-indigo-500 shrink-0")}
                    <div>
                      <div className="text-[10px] font-bold text-slate-805 dark:text-slate-200">{item.label}</div>
                      <div className="text-[9px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  {calcStr && (
                    <span className="text-[9px] font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/30">
                      {calcStr}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Time Picker (Expandable) ── */}
      <AnimatePresence>
        {showTimePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-3 border-t border-slate-100 dark:border-slate-850 overflow-hidden"
          >
            <div className="flex items-center gap-2 py-2.5">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl px-2.5 py-1.5 flex-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="time"
                  value={activeTab === 'start' ? localStartDateTime : localDueDateTime}
                  onChange={e => applyTime(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none p-0 focus:ring-0"
                />
              </div>
              <button 
                type="button" 
                onClick={() => applyTime('')}
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-slate-100 dark:border-slate-800 px-2.5 py-2 flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-0.5">
          {[
            { label: 'Today', offset: 0 },
            { label: 'Tomorrow', offset: 1 },
            { label: 'Next week', offset: daysToMonday === 0 ? 7 : daysToMonday },
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => selectPreset(item.offset)}
              className="whitespace-nowrap px-1.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {item.label}
            </button>
          ))}

          <button 
            type="button"
            onClick={() => setShowTimePicker(!showTimePicker)}
            aria-expanded={showTimePicker}
            aria-label="Đặt thời gian"
            className={`p-1.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              showTimePicker
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          {clearable && (activeTab === 'start' ? localStartDate : localDueDate) && (
            <button
              type="button"
              onClick={() => clearActiveDate(activeTab)}
              aria-label={`Clear ${activeTab} date`}
              className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button 
          type="button" 
          onClick={() => { setIsOpen(false); setShowTimePicker(false); }}
          className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] rounded-lg shadow-sm transition-colors cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Done
        </button>
      </div>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" onClick={() => setIsOpen(!isOpen)} aria-haspopup="dialog" aria-expanded={isOpen}
        className={className || `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${activeDateValue ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
        <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
        <span className={isOverdue ? 'text-rose-500' : ''}>{displayText}</span>
      </button>
      {typeof document !== 'undefined' && coords && createPortal(
        <AnimatePresence>
          {isOpen && calendarContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ── Space Pill Select ──
export function SpacePillSelect({ value, workspaces, onChange }: { value: string | null | undefined; workspaces: Workspace[]; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 220, 208);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const curWorkspace = workspaces.find(w => w.id === value);

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <button type="button" onClick={() => { onChange(null); setOpen(false); }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors ${!value ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
        <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
          —
        </span>
        <span className="truncate">Không có khu vực</span>
        {!value && <Check className="w-3 h-3 ml-auto text-indigo-500 shrink-0" />}
      </button>
      {workspaces.map(w => (
        <button key={w.id} type="button" onClick={() => { onChange(w.id); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors ${value === w.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <span className="w-4 h-4 rounded bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
            {w.initial}
          </span>
          <span className="truncate">{w.name}</span>
          {value === w.id && <Check className="w-3 h-3 ml-auto text-indigo-500 shrink-0" />}
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 border border-slate-200/60 dark:border-slate-700/60 p-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          {curWorkspace ? (
            <>
              <span className="w-4 h-4 rounded bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                {curWorkspace.initial}
              </span>
              <span className="truncate">{curWorkspace.name}</span>
            </>
          ) : (
            <span className="text-slate-400 truncate">Chọn khu vực</span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 opacity-50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
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

export function DropdownFieldSelect({ 
  value, 
  options = [], 
  fieldId,
  onChange 
}: { 
  value: string; 
  options?: (string | OptionConfig)[]; 
  fieldId?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 200, 180);
  const [customConfigs, setCustomConfigs] = useState<Record<string, OptionConfig[]>>({});

  const reloadCustomConfigs = () => {
    setCustomConfigs(getStoredCustomFieldsConfig());
  };

  React.useEffect(() => {
    reloadCustomConfigs();
    window.addEventListener('apexa-field-config-changed', reloadCustomConfigs);
    return () => window.removeEventListener('apexa-field-config-changed', reloadCustomConfigs);
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resolvedOptions: OptionConfig[] = useMemo(() => {
    if (fieldId && customConfigs[fieldId] && customConfigs[fieldId].length > 0) {
      return customConfigs[fieldId];
    }
    if (options.length > 0) {
      return options.map((opt, idx) => {
        if (typeof opt === 'string') {
          return {
            id: `opt-${idx}`,
            label: opt,
            color: COLOR_PALETTE[idx % COLOR_PALETTE.length].id
          };
        }
        return {
          id: opt.id || `opt-${idx}`,
          label: opt.label,
          color: opt.color || COLOR_PALETTE[idx % COLOR_PALETTE.length].id,
          icon: opt.icon
        };
      });
    }
    return [
      { id: 'opt-1', label: 'Option 1', color: 'indigo' },
      { id: 'opt-2', label: 'Option 2', color: 'emerald' },
      { id: 'opt-3', label: 'Option 3', color: 'amber' }
    ];
  }, [fieldId, customConfigs, options]);

  const selectedOpt = resolvedOptions.find(o => o.label === value || o.id === value);
  const selectedColorMeta = selectedOpt ? getColorOption(selectedOpt.color) : null;

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-44 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <button 
        type="button" 
        onClick={() => { onChange(''); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
      >
        <span>— Xóa lựa chọn —</span>
      </button>
      {resolvedOptions.map((opt) => {
        const colorMeta = getColorOption(opt.color);
        const isSelected = value === opt.label || value === opt.id;
        return (
          <button 
            key={opt.id || opt.label} 
            type="button" 
            onClick={() => { onChange(opt.label); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
              style={{ backgroundColor: colorMeta.hex }} 
            />
            <span className="truncate flex-1">{opt.label}</span>
            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 border border-slate-200/80 dark:border-slate-800 p-1 px-2 rounded-lg bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-semibold cursor-pointer select-none"
      >
        {selectedOpt && selectedColorMeta ? (
          <span 
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold truncate max-w-[130px] shadow-3xs"
            style={{ 
              backgroundColor: `${selectedColorMeta.hex}18`, 
              color: selectedColorMeta.hex,
              border: `1px solid ${selectedColorMeta.hex}40`
            }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full shrink-0" 
              style={{ backgroundColor: selectedColorMeta.hex }} 
            />
            <span className="truncate">{selectedOpt.label}</span>
          </span>
        ) : (
          <span className="text-slate-400 text-xs truncate">Chọn...</span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
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

export function LabelsFieldSelect({ 
  value, 
  options = [], 
  fieldId,
  onChange 
}: { 
  value: string; 
  options?: (string | OptionConfig)[]; 
  fieldId?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 200, 180);
  const [customConfigs, setCustomConfigs] = useState<Record<string, OptionConfig[]>>({});

  const reloadCustomConfigs = () => {
    setCustomConfigs(getStoredCustomFieldsConfig());
  };

  React.useEffect(() => {
    reloadCustomConfigs();
    window.addEventListener('apexa-field-config-changed', reloadCustomConfigs);
    return () => window.removeEventListener('apexa-field-config-changed', reloadCustomConfigs);
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resolvedOptions: OptionConfig[] = useMemo(() => {
    if (fieldId && customConfigs[fieldId] && customConfigs[fieldId].length > 0) {
      return customConfigs[fieldId];
    }
    if (options.length > 0) {
      return options.map((opt, idx) => {
        if (typeof opt === 'string') {
          return {
            id: `opt-${idx}`,
            label: opt,
            color: COLOR_PALETTE[idx % COLOR_PALETTE.length].id
          };
        }
        return {
          id: opt.id || `opt-${idx}`,
          label: opt.label,
          color: opt.color || COLOR_PALETTE[idx % COLOR_PALETTE.length].id,
          icon: opt.icon
        };
      });
    }
    return [
      { id: 'opt-1', label: 'Tag 1', color: 'indigo' },
      { id: 'opt-2', label: 'Tag 2', color: 'emerald' },
      { id: 'opt-3', label: 'Tag 3', color: 'amber' }
    ];
  }, [fieldId, customConfigs, options]);

  const selectedList = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const toggleOption = (optLabel: string) => {
    const nextList = selectedList.includes(optLabel)
      ? selectedList.filter(s => s !== optLabel)
      : [...selectedList, optLabel];
    onChange(nextList.join(', '));
  };

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-48 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      {resolvedOptions.map(opt => {
        const isSelected = selectedList.includes(opt.label);
        const colorMeta = getColorOption(opt.color);
        return (
          <button 
            key={opt.id || opt.label} 
            type="button" 
            onClick={() => toggleOption(opt.label)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              readOnly
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
            />
            <span 
              className="w-2 h-2 rounded-full shrink-0" 
              style={{ backgroundColor: colorMeta.hex }} 
            />
            <span className="truncate flex-1">{opt.label}</span>
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 border border-slate-200/80 dark:border-slate-800 p-1 px-2 rounded-lg bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-semibold cursor-pointer select-none"
      >
        <div className="flex flex-wrap gap-1 min-w-0 max-w-[130px]">
          {selectedList.length > 0 ? (
            selectedList.map(s => {
              const matchedOpt = resolvedOptions.find(o => o.label === s);
              const colorMeta = matchedOpt ? getColorOption(matchedOpt.color) : getColorOption('indigo');
              return (
                <span 
                  key={s} 
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold shadow-3xs truncate max-w-[80px]"
                  style={{
                    backgroundColor: `${colorMeta.hex}18`,
                    color: colorMeta.hex,
                    border: `1px solid ${colorMeta.hex}40`
                  }}
                >
                  {s}
                </span>
              );
            })
          ) : (
            <span className="text-slate-400 text-xs">Labels...</span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
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

// ── Bulk Status Select ──
export function BulkStatusSelect({ onChange }: { onChange: (v: TaskStatus) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 160, 160);
  const [statuses, setStatuses] = useState<OptionConfig[]>([]);

  React.useEffect(() => {
    setStatuses(getStoredStatuses());
  }, [open]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const metaList: OptionConfig[] = statuses.length > 0 ? statuses : [
    { id: 'todo', label: 'TO DO', dot: 'bg-slate-400', bg: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', color: 'slate' },
    { id: 'inprogress', label: 'IN PROGRESS', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900', color: 'amber' },
    { id: 'review', label: 'REVIEW', dot: 'bg-cyan-500', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-955/20 dark:text-cyan-400 dark:border-cyan-900', color: 'cyan' },
    { id: 'completed', label: 'DONE', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900', color: 'emerald' },
  ];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-44"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 mb-1">
        Đổi trạng thái thành
      </div>
      {metaList.map(s => (
        <button key={s.id} type="button" onClick={() => { onChange(s.id as TaskStatus); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-bold rounded-lg cursor-pointer transition-colors uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <span className={`w-2 h-2 rounded-full ${s.dot || `bg-${s.color}`}`} style={!s.dot && s.color ? { backgroundColor: s.color } : undefined} />
          <span>{getLocalizedOptionLabel(s.id, s.label, locale)}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all hover:shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>{locale === 'vi' ? 'Trạng thái' : 'Status'}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
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

// ── Bulk Priority Select ──
export function BulkPrioritySelect({ onChange }: { onChange: (v: Priority | undefined) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 180, 160);
  const [priorities, setPriorities] = useState<OptionConfig[]>([]);

  React.useEffect(() => {
    setPriorities(getStoredPriorities());
  }, [open]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const metaList = priorities.length > 0 ? priorities : [
    { id: 'urgent', label: 'Urgent', color: 'red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-955/30 dark:border-red-900/50', icon: 'AlertOctagon' },
    { id: 'high', label: 'High', color: 'orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-955/30 dark:border-orange-900/50', icon: 'AlertTriangle' },
    { id: 'medium', label: 'Normal', color: 'yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-955/30 dark:border-yellow-900/50', icon: 'CircleDot' },
    { id: 'low', label: 'Low', color: 'slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: 'Circle' }
  ];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xl w-40"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 mb-1">
        Đổi mức ưu tiên thành
      </div>
      <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60">
        {renderSpaceIcon('Circle', 'w-3 h-3 text-slate-400')}
        <span>Không có (Trống)</span>
      </button>
      {metaList.map(p => (
        <button key={p.id} type="button" onClick={() => { onChange(p.id as Priority); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          {renderSpaceIcon(p.icon || 'Circle', 'w-3 h-3')}
          <span>{getLocalizedOptionLabel(p.id, p.label, locale)}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all hover:shadow-sm">
        <Flag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span>{locale === 'vi' ? 'Ưu tiên' : 'Priority'}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
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

// ── Bulk Assignee Select ──
export function BulkAssigneeSelect({ members, onChange }: { members: User[]; onChange: (v: string | null) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 220, 208);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xl w-56 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 mb-1">
        Giao công việc cho
      </div>
      <button type="button" onClick={() => { onChange(null); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer">
        <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px]">—</span>
        <span>Bỏ giao tất cả</span>
      </button>
      {members.map(m => (
        <button key={m.id} type="button" onClick={() => { onChange(m.id); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <SignedImage filePath={m.avatar} className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" alt={m.name} />
          <span className="truncate">{m.name}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all hover:shadow-sm">
        {renderSpaceIcon('User', 'w-3.5 h-3.5 text-slate-400')}
        <span>{locale === 'vi' ? 'Người phụ trách' : 'Assignee'}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
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
