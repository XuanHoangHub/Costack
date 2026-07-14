"use client";

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, CalendarDays, ChevronLeft, ChevronRight, X, Clock, ChevronUp, Flag } from 'lucide-react';
import { Priority, TaskStatus, User, Workspace } from '../../types';
import SignedImage from '../SignedImage';
import { getStoredPriorities, getStoredStatuses, OptionConfig, getStoredDateFormat, formatCustomDate, DateFormatOption } from '../../utils/fieldConfig';

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
    { id: 'urgent', label: 'Urgent', color: 'red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-955/30 dark:border-red-900/50', icon: '🔴' },
    { id: 'high', label: 'High', color: 'orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-955/30 dark:border-orange-900/50', icon: '🟠' },
    { id: 'medium', label: 'Normal', color: 'yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-955/30 dark:border-yellow-900/50', icon: '🟡' },
    { id: 'low', label: 'Low', color: 'slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: '⚪' }
  ];

  const cur = value ? metaList.find(p => p.id === value) : null;

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
        <span>⚪</span>
        <span>None (Empty)</span>
        {!value && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
      </button>
      {metaList.map(p => (
        <button key={p.id} type="button" onClick={() => { onChange(p.id as Priority); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${value === p.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <span>{p.icon || '⚪'}</span>
          <span>{p.label}</span>
          {value === p.id && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
        </button>
      ))}
    </motion.div>
  );

  const curColorClass = cur ? (cur.color.startsWith('text-') ? cur.color : `text-${cur.color}`) : '';

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className={cur ? `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${cur.bg} ${curColorClass}`
                       : `inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer select-none transition-all border-0 bg-transparent`}>
        {cur ? (
          <>
            <span>{cur.icon || '⚪'}</span>
            <span>{cur.label}</span>
          </>
        ) : (
          <span>Empty</span>
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
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 150, 160);
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
    { id: 'review', label: 'REVIEW', dot: 'bg-cyan-555', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-955/20 dark:text-cyan-400 dark:border-cyan-900', color: 'cyan' },
    { id: 'completed', label: 'DONE', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900', color: 'emerald' },
  ];

  const cur = metaList.find(s => s.id === value) || metaList[0];

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
      {metaList.map(s => (
        <button key={s.id} type="button" onClick={() => { onChange(s.id as TaskStatus); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-black rounded-lg cursor-pointer transition-colors uppercase tracking-wider ${value === s.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <span className={`w-2 h-2 rounded-full ${s.dot || `bg-${s.color}`}`} style={!s.dot && s.color ? { backgroundColor: s.color } : undefined} />
          <span>{s.label}</span>
          {value === s.id && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer select-none transition-all uppercase tracking-wider hover:shadow-sm ${cur.bg}`}>
        <span className={`w-2 h-2 rounded-full ${cur.dot || `bg-${cur.color}`}`} style={!cur.dot && cur.color ? { backgroundColor: cur.color } : undefined} />
        <span>{cur.label}</span>
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

  const valueIds = Array.isArray(value) ? value : value ? [value] : [];
  const assignees = members.filter(m => valueIds.includes(m.id));
  const primaryAssignee = assignees[0];

  const toggleAssignee = (memberId: string) => {
    const nextIds = valueIds.includes(memberId)
      ? valueIds.filter(id => id !== memberId)
      : [...valueIds, memberId];
    onChange(nextIds.length > 0 ? nextIds : null);
  };

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg w-56 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <button type="button" onClick={() => { onChange(null); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 cursor-pointer">
        <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px]">—</span>
        <span>Unassign</span>
      </button>
      {members.map(m => (
        <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors ${valueIds.includes(m.id) ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <SignedImage filePath={m.avatar} className="w-4 h-4 rounded-full border border-slate-200 object-cover shrink-0" alt={m.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`} />
          <span className="truncate">{m.name}</span>
          {valueIds.includes(m.id) && <Check className="w-3 h-3 ml-auto text-indigo-500 shrink-0" />}
        </button>
      ))}
    </motion.div>
  );

  const displayLabel = valueIds.length > 1
    ? `${valueIds.length} Assignees`
    : primaryAssignee?.name || 'Unassigned';

  return (
    <div ref={ref} className="relative inline-block">
      {compact ? (
        <button type="button" onClick={() => setOpen(!open)}
          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none hover:scale-105 transition-all flex items-center justify-center shrink-0"
          title={displayLabel || 'Unassigned'}
        >
          {valueIds.length > 1 ? (
            <div className="relative w-full h-full">
              {assignees.slice(0, 2).map((m, idx) => (
                <SignedImage key={m.id} filePath={m.avatar} className={`absolute w-4 h-4 rounded-full border border-white dark:border-slate-950 object-cover ${idx === 0 ? 'left-0' : 'right-0'}`} alt={m.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`} />
              ))}
              {valueIds.length > 2 && (
                <span className="absolute right-0 bottom-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white border border-white dark:border-slate-950">+{valueIds.length - 2}</span>
              )}
            </div>
          ) : primaryAssignee ? (
            <SignedImage filePath={primaryAssignee.avatar} className="w-full h-full rounded-full object-cover" alt={primaryAssignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(primaryAssignee.name)}`} />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">+</div>
          )}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-1.5 border border-slate-200/60 dark:border-slate-700/60 p-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            {valueIds.length > 1 ? (
              <div className="flex -space-x-1.5 items-center">
                {assignees.slice(0, 2).map(m => (
                  <SignedImage key={m.id} filePath={m.avatar} className="w-4 h-4 rounded-full border border-white dark:border-slate-950 object-cover shrink-0" alt={m.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`} />
                ))}
                <span className="text-[11px] truncate">{displayLabel}</span>
              </div>
            ) : primaryAssignee ? (
              <>
                <SignedImage filePath={primaryAssignee.avatar} className="w-4 h-4 rounded-full border border-slate-200 object-cover shrink-0" alt={primaryAssignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(primaryAssignee.name)}`} />
                <span className="truncate">{primaryAssignee.name}</span>
              </>
            ) : (
              <span className="text-slate-400 truncate">Unassigned</span>
            )}
          </div>
          <ChevronDown className={`w-3 h-3 opacity-50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {typeof document !== 'undefined' && coords && createPortal(
        <AnimatePresence>
          {open && dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}


function getPresetLabels() {
  const now = new Date();
  
  const getWeekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
  const getShortDate = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  
  const todayLabel = getWeekday(now);
  
  const laterTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const laterLabel = laterTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowLabel = getWeekday(tomorrow);
  
  const thisWeekend = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToSaturday = (6 - dayOfWeek + 7) % 7;
  thisWeekend.setDate(now.getDate() + (daysToSaturday === 0 ? 7 : daysToSaturday));
  const thisWeekendLabel = getWeekday(thisWeekend);
  
  const daysToMonday = (1 - dayOfWeek + 7) % 7;
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + (daysToMonday === 0 ? 7 : daysToMonday));
  const nextWeekLabel = getWeekday(nextWeek);
  
  const nextWeekend = new Date(thisWeekend);
  nextWeekend.setDate(thisWeekend.getDate() + 7);
  const nextWeekendLabel = getShortDate(nextWeekend);
  
  const twoWeeks = new Date(now);
  twoWeeks.setDate(now.getDate() + 14);
  const twoWeeksLabel = getShortDate(twoWeeks);
  
  const fourWeeks = new Date(now);
  fourWeeks.setDate(now.getDate() + 28);
  const fourWeeksLabel = getShortDate(fourWeeks);
  
  return {
    today: todayLabel,
    later: laterLabel,
    tomorrow: tomorrowLabel,
    thisWeekend: thisWeekendLabel,
    nextWeek: nextWeekLabel,
    nextWeekend: nextWeekendLabel,
    twoWeeks: twoWeeksLabel,
    fourWeeks: fourWeeksLabel
  };
}

// ── Premium Date Picker ──
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
    window.addEventListener('avaxa-field-config-changed', handleFormatChange);
    return () => window.removeEventListener('avaxa-field-config-changed', handleFormatChange);
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
        setCurrentMonth((parseInt(parts[1]) - 1) || new Date().getMonth());
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
  
  const presets = getPresetLabels();
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
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff + (weekOffset * 7));
    d.setHours(0,0,0,0);
    return d;
  }, [weekOffset]);

  const weeklyDays = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      list.push(d);
    }
    return list;
  }, [startOfWeek]);

  const calendarContent = (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 28, stiffness: 380 }}
      className="select-none rounded-[20px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col font-sans overflow-hidden"
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: 420,
        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        ...(coords ? (() => {
          let left = align === 'right' ? coords.right - 420 : coords.left;
          left = Math.max(8, left);
          if (left + 420 > window.innerWidth) {
            left = window.innerWidth - 420 - 8;
          }
          return openUpward
            ? { bottom: window.innerHeight - coords.top + 8, left }
            : { top: coords.bottom + 8, left };
        })() : {})
      }}
    >
      {/* ── Header: Start/Due Date Toggle Pills ── */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('start')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'start'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{localStartDate ? formatDateForBox(localStartDate) : 'Start date'}</span>
            {localStartDate && (
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); clearActiveDate('start'); }}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Arrow connector */}
          <div className="flex flex-col items-center shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('due')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'due'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{localDueDate ? formatDateForBox(localDueDate) : 'Due date'}</span>
            {localDueDate && (
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); clearActiveDate('due'); }}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Duration badge */}
        {getDurationLabel() && (
          <div className="flex items-center justify-center mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-full border border-indigo-100 dark:border-indigo-900/40">
              <Clock className="w-3 h-3" />
              {getDurationLabel()}
            </span>
          </div>
        )}
      </div>

      {/* ── View switcher segmented control ── */}
      <div className="px-3 pb-2.5 pt-0.5">
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/35 dark:border-slate-800/40 rounded-xl">
          {[
            { id: 'calendar', label: 'Calendar', icon: '📅' },
            { id: 'monthyear', label: 'Month/Year', icon: '🗓️' },
            { id: 'weekly', label: 'Weekly', icon: '📊' },
            { id: 'presets', label: 'Presets', icon: '⚡' },
          ].map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setPickerView(v.id as any)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all duration-150 flex items-center justify-center gap-1 ${
                pickerView === v.id
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-700/40'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Views Container ── */}
      <div className="px-3 pb-1.5 flex-1 min-h-[260px]">
        {pickerView === 'calendar' && (
          <div>
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {monthNamesFull[currentMonth]} {currentYear}
              </h4>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <div className="flex items-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 overflow-hidden">
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">
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
                  <div key={`prev-${i}`} className="flex items-center justify-center w-full aspect-square">
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
                  <div key={day} className="relative flex items-center justify-center w-full aspect-square">
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
                      className={`relative z-10 w-[34px] h-[34px] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 text-xs
                        ${isStartDate
                          ? 'text-white font-black bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/30'
                          : isDueDate
                            ? 'text-white font-black bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/25 ring-2 ring-violet-400/30'
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
                <div key={`next-${i}`} className="flex items-center justify-center w-full aspect-square">
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
                  className={`py-3.5 text-[11px] font-bold rounded-xl cursor-pointer transition-all border ${
                    currentMonth === idx 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' 
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
                Week of {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
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
              { label: 'Today', desc: 'Set date to today', icon: '📅', offset: 0 },
              { label: 'Tomorrow', desc: 'Set date to tomorrow', icon: '🌅', offset: 1 },
              { label: 'This Weekend (Sat)', desc: 'Set date to Saturday', icon: '🎉', offset: daysToSaturday === 0 ? 7 : daysToSaturday },
              { label: 'Next Week (Mon)', desc: 'Set date to next Monday', icon: '💼', offset: daysToMonday === 0 ? 7 : daysToMonday },
              { label: 'In 2 Weeks', desc: 'Set date in 14 days', icon: '⏳', offset: 14 },
              { label: 'In 1 Month', desc: 'Set date in 28 days', icon: '📅', offset: 28 },
              { label: 'No Date (Clear)', desc: 'Clear date selection', icon: '❌', offset: null },
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
                    <span className="text-sm shrink-0">{item.icon}</span>
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

      {/* ── Footer: Presets + Time + Close ── */}
      <div className="border-t border-slate-100 dark:border-slate-850 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {[
            { label: 'Today', offset: 0 },
            { label: 'Tomorrow', offset: 1 },
            { label: 'Sat', offset: daysToSaturday === 0 ? 7 : daysToSaturday },
            { label: '+1w', offset: daysToMonday === 0 ? 7 : daysToMonday },
            { label: '+2w', offset: 14 },
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => selectPreset(item.offset)}
              className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}

          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button 
            type="button"
            onClick={() => setShowTimePicker(!showTimePicker)}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
              showTimePicker
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            {activeTab === 'start' ? (localStartDateTime || 'Time') : (localDueDateTime || 'Time')}
          </button>
        </div>

        <button 
          type="button" 
          onClick={() => { setIsOpen(false); setShowTimePicker(false); }}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl shadow-sm transition-colors cursor-pointer active:scale-[0.97]"
        >
          Done
        </button>
      </div>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
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
        <span className="truncate">No Space</span>
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
            <span className="text-slate-400 truncate">Select Space</span>
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

export function DropdownFieldSelect({ value, options = [], onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 200, 160);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const safeOptions = options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3'];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-40 max-h-48 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <button type="button" onClick={() => { onChange(''); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
        <span>— Clear —</span>
      </button>
      {safeOptions.map(opt => (
        <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors ${value === opt ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <span className="truncate">{opt}</span>
          {value === opt && <Check className="w-3 h-3 ml-auto text-indigo-500 shrink-0" />}
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 border border-slate-200/60 dark:border-slate-700/60 p-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        <span className="truncate">{value || <span className="text-slate-400">Select...</span>}</span>
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

export function LabelsFieldSelect({ value, options = [], onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 200, 180);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const safeOptions = options.length > 0 ? options : ['Tag 1', 'Tag 2', 'Tag 3'];
  const selectedList = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const toggleOption = (opt: string) => {
    const nextList = selectedList.includes(opt)
      ? selectedList.filter(s => s !== opt)
      : [...selectedList, opt];
    onChange(nextList.join(', '));
  };

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-44 max-h-48 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      {safeOptions.map(opt => {
        const isSelected = selectedList.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggleOption(opt)}
            className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
            <input
              type="checkbox"
              checked={isSelected}
              readOnly
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-550 w-3 h-3 shrink-0"
            />
            <span className="truncate">{opt}</span>
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 border border-slate-200/60 dark:border-slate-700/60 p-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        <div className="flex flex-wrap gap-1 min-w-0 max-w-[120px]">
          {selectedList.length > 0 ? (
            selectedList.map(s => (
              <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400">
                {s}
              </span>
            ))
          ) : (
            <span className="text-slate-400">Labels...</span>
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

// ── Bulk Status Select ──
export function BulkStatusSelect({ onChange }: { onChange: (v: TaskStatus) => void }) {
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
        Change Status To
      </div>
      {metaList.map(s => (
        <button key={s.id} type="button" onClick={() => { onChange(s.id as TaskStatus); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-bold rounded-lg cursor-pointer transition-colors uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <span className={`w-2 h-2 rounded-full ${s.dot || `bg-${s.color}`}`} style={!s.dot && s.color ? { backgroundColor: s.color } : undefined} />
          <span>{s.label}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all hover:shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Status</span>
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
    { id: 'urgent', label: 'Urgent', color: 'red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-955/30 dark:border-red-900/50', icon: '🔴' },
    { id: 'high', label: 'High', color: 'orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-955/30 dark:border-orange-900/50', icon: '🟠' },
    { id: 'medium', label: 'Normal', color: 'yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-955/30 dark:border-yellow-900/50', icon: '🟡' },
    { id: 'low', label: 'Low', color: 'slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: '⚪' }
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
        Change Priority To
      </div>
      <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <span className="text-[10px]">⚪</span>
        <span>None (Empty)</span>
      </button>
      {metaList.map(p => (
        <button key={p.id} type="button" onClick={() => { onChange(p.id as Priority); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <span>{p.icon || '⚪'}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all hover:shadow-sm">
        <Flag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span>Priority</span>
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
        Assign Tasks To
      </div>
      <button type="button" onClick={() => { onChange(null); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer">
        <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px]">—</span>
        <span>Unassign All</span>
      </button>
      {members.map(m => (
        <button key={m.id} type="button" onClick={() => { onChange(m.id); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <SignedImage filePath={m.avatar} className="w-4 h-4 rounded-full border border-slate-200 object-cover shrink-0" alt={m.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`} />
          <span className="truncate">{m.name}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer select-none transition-all hover:shadow-sm">
        <span className="text-[11px]">👤</span>
        <span>Assignee</span>
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

