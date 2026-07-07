"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, CalendarDays, ChevronLeft, ChevronRight, X, Clock, ChevronUp } from 'lucide-react';
import { Priority, TaskStatus, User, Workspace } from '../../types';
import SignedImage from '../SignedImage';

// ── Custom Hook for Portal Positioning ──
function useDropdownPosition(isOpen: boolean, containerRef: React.RefObject<HTMLDivElement | null>, dropdownHeight: number = 200, dropdownWidth: number = 160) {
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

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta: Record<Priority, { label: string; color: string; bg: string; icon: string }> = {
    urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50', icon: '🔴' },
    high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50', icon: '🟠' },
    medium: { label: 'Normal', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50', icon: '🟡' },
    low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: '⚪' },
  };
  const cur = value ? meta[value] : null;

  console.log('PriorityPillSelect render, open:', open, 'coords:', JSON.stringify(coords), 'openUpward:', openUpward);

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
      {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
        <button key={p} type="button" onClick={() => { onChange(p); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${value === p ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <span>{meta[p].icon}</span>
          <span>{meta[p].label}</span>
          {value === p && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className={cur ? `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${cur.bg} ${cur.color}`
                       : `inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer select-none transition-all border-0 bg-transparent`}>
        {cur ? (
          <>
            <span>{cur.icon}</span>
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

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta: Record<TaskStatus, { label: string; dot: string; bg: string }> = {
    todo: { label: 'TO DO', dot: 'bg-slate-400', bg: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    inprogress: { label: 'IN PROGRESS', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900' },
    review: { label: 'REVIEW', dot: 'bg-cyan-505', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-955/20 dark:text-cyan-400 dark:border-cyan-900' },
    completed: { label: 'DONE', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900' },
  };
  const cur = meta[value];

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
      {(['todo', 'inprogress', 'review', 'completed'] as TaskStatus[]).map(s => (
        <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-black rounded-lg cursor-pointer transition-colors uppercase tracking-wider ${value === s ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <span className={`w-2 h-2 rounded-full ${meta[s].dot}`} />
          <span>{meta[s].label}</span>
          {value === s && <Check className="w-3 h-3 ml-auto text-indigo-500" />}
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer select-none transition-all uppercase tracking-wider hover:shadow-sm ${cur.bg}`}>
        <span className={`w-2 h-2 rounded-full ${cur.dot}`} />
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
export function AssigneePillSelect({ value, members, onChange, compact = false }: { value: string | null; members: User[]; onChange: (v: string | null) => void; compact?: boolean }) {
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

  const assignee = members.find(m => m.id === value);

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-56 overflow-y-auto custom-scrollbar"
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
        <button key={m.id} type="button" onClick={() => { onChange(m.id); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors ${value === m.id ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
          <SignedImage filePath={m.avatar} className="w-4 h-4 rounded-full border border-slate-200 object-cover shrink-0" alt={m.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`} />
          <span className="truncate">{m.name}</span>
          {value === m.id && <Check className="w-3 h-3 ml-auto text-indigo-500 shrink-0" />}
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      {compact ? (
        <button type="button" onClick={() => setOpen(!open)}
          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none hover:scale-105 transition-all flex items-center justify-center shrink-0"
          title={assignee ? `Assignee: ${assignee.name}` : 'Unassigned'}
        >
          {assignee ? (
            <SignedImage filePath={assignee.avatar} className="w-full h-full rounded-full object-cover" alt={assignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">+</div>
          )}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-1.5 border border-slate-200/60 dark:border-slate-700/60 p-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            {assignee ? (
              <>
                <SignedImage filePath={assignee.avatar} className="w-4 h-4 rounded-full border border-slate-200 object-cover shrink-0" alt={assignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
                <span className="truncate">{assignee.name}</span>
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
  
  const [activeTab, setActiveTab] = useState<'start' | 'due'>(() => {
    if (label?.toLowerCase() === 'start') return 'start';
    return 'due';
  });

  const [localStartDate, setLocalStartDate] = useState('');
  const [localStartDateTime, setLocalStartDateTime] = useState('');
  const [localDueDate, setLocalDueDate] = useState('');
  const [localDueDateTime, setLocalDueDateTime] = useState('');

  const [showTimePicker, setShowTimePicker] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const startParts = startDateValue ? startDateValue.split('T') : ['', ''];
      setLocalStartDate(startParts[0] || '');
      setLocalStartDateTime(startParts[1] || '');

      const dueParts = dateValue ? dateValue.split('T') : ['', ''];
      setLocalDueDate(dueParts[0] || '');
      setLocalDueDateTime(dueParts[1] || '');
      
      setActiveTab(label?.toLowerCase() === 'start' ? 'start' : 'due');
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
      
      // Smart vertical check:
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
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  const selectDate = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const newDate = `${currentYear}-${mm}-${dd}`;
    const activeTime = activeTab === 'start' ? localStartDateTime : localDueDateTime;
    saveDate(newDate, activeTime, activeTab);
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
      return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    }
    return dateStr;
  };

  const displayText = displayLabel || (dateValue ? (() => {
    const parts = dateValue.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const d = parseInt(parts[2]);
      const ds = `${parts[0]}-${parts[1]}-${parts[2]}`;
      if (ds === todayStr) return 'Today';
      const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
      const tmrwStr = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;
      if (ds === tmrwStr) return 'Tomorrow';
      return `${monthNamesShort[m]} ${d}${y !== today.getFullYear() ? `, ${y}` : ''}`;
    }
    return dateValue;
  })() : (label || 'Select Date'));

  const isOverdue = dateValue && dateValue.split('T')[0] < todayStr && label?.toLowerCase() === 'due';

  const calendarContent = (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 28, stiffness: 380 }}
      className="select-none rounded-[24px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col font-sans overflow-hidden"
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: 480,
        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        ...(coords ? (() => {
          let left = align === 'right' ? coords.right - 480 : coords.left;
          left = Math.max(8, left);
          if (left + 480 > window.innerWidth) {
            left = window.innerWidth - 480 - 8;
          }
          return openUpward
            ? { bottom: window.innerHeight - coords.top + 8, left }
            : { top: coords.bottom + 8, left };
        })() : {})
      }}
    >
      {/* ── Top Start/Due Date Boxes ── */}
      <div className="p-4 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850">
        <div 
          onClick={() => setActiveTab('start')}
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'start'
              ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
              : 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="w-3.5 h-3.5 text-slate-405 shrink-0" />
            <span className={`text-sm font-semibold truncate ${localStartDate ? 'text-slate-850 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
              {localStartDate ? formatDateForBox(localStartDate) : 'Start date'}
            </span>
          </div>
          {localStartDate && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); clearActiveDate('start'); }}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div 
          onClick={() => setActiveTab('due')}
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'due'
              ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
              : 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CalendarDays className="w-3.5 h-3.5 text-slate-405 shrink-0" />
            <span className={`text-sm font-semibold truncate ${localDueDate ? 'text-slate-850 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
              {localDueDate ? formatDateForBox(localDueDate) : 'Due date'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            {localDueDate && (
              <button 
                type="button" 
                onClick={() => clearActiveDate('due')}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            
            <button 
              type="button"
              onClick={() => setShowTimePicker(!showTimePicker)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              {activeTab === 'start'
                ? (localStartDateTime || 'Add time')
                : (localDueDateTime || 'Add time')
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Area ── */}
      <div className="flex min-h-[320px]">
        
        {/* Left presets column */}
        <div className="w-[160px] shrink-0 border-r border-slate-100 dark:border-slate-850 flex flex-col justify-between py-3">
          <div className="space-y-0.5">
            {[
              { label: 'Today', sub: presets.today, offset: 0 },
              { label: 'Later', sub: presets.later, offset: 0, isLater: true },
              { label: 'Tomorrow', sub: presets.tomorrow, offset: 1 },
              { label: 'This weekend', sub: presets.thisWeekend, offset: daysToSaturday === 0 ? 7 : daysToSaturday },
              { label: 'Next week', sub: presets.nextWeek, offset: daysToMonday === 0 ? 7 : daysToMonday },
              { label: 'Next weekend', sub: presets.nextWeekend, offset: (daysToSaturday === 0 ? 7 : daysToSaturday) + 7 },
              { label: '2 weeks', sub: presets.twoWeeks, offset: 14 },
              { label: '4 weeks', sub: presets.fourWeeks, offset: 28 },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => selectPreset(item.offset, item.isLater ? item.sub : undefined)}
                className="w-[144px] flex items-center justify-between px-3 py-2 text-left text-[13px] font-semibold text-slate-705 dark:text-slate-250 hover:bg-slate-55 dark:hover:bg-slate-900 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg mx-2 transition-colors cursor-pointer"
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-455 dark:text-slate-500 font-semibold">{item.sub}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => alert('Recurring options configuration is mocked.')}
              className="w-[144px] flex items-center justify-between px-3 py-2 text-left text-[13px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-900 rounded-lg mx-2 transition-colors cursor-pointer group"
            >
              <span>Set Recurring</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right calendar column */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wide">
              {monthNamesFull[currentMonth]} {currentYear}
            </h4>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); selectDate(t.getDate()); }}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 overflow-hidden">
                <button 
                  type="button" 
                  onClick={prevMonth}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={nextMonth}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0 text-center mb-1.5">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d}>
                <span className="text-xs font-semibold text-slate-455 dark:text-slate-550">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 flex-1 items-center">
            {Array.from({ length: adjustedFirstDay }).map((_, i) => {
              const ghostDay = prevMonthDays - adjustedFirstDay + 1 + i;
              return (
                <div key={`prev-${i}`} className="flex items-center justify-center w-full aspect-square opacity-20">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{ghostDay}</span>
                </div>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === (activeTab === 'start' ? localStartDate : localDueDate);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const isWeekend = (() => {
                const wd = new Date(currentYear, currentMonth, day);
                return wd.getDay() === 0 || wd.getDay() === 6;
              })();

              return (
                <div key={day} className="flex items-center justify-center w-full aspect-square p-[1px]">
                  <button
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`relative w-full h-full rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-[1.08] active:scale-95 text-xs ${
                      isSelected
                        ? 'text-white font-black bg-indigo-650 shadow-md shadow-indigo-500/20'
                        : isToday
                          ? 'font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                          : isPast
                            ? 'font-medium text-slate-305 dark:text-slate-655 hover:bg-slate-50 dark:hover:bg-slate-900'
                            : isWeekend
                              ? 'font-semibold text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                              : 'font-semibold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
                    )}
                    <span className="relative z-10">{day}</span>
                  </button>
                </div>
              );
            })}

            {Array.from({ length: trailingDays }).map((_, i) => (
              <div key={`next-${i}`} className="flex items-center justify-center w-full aspect-square opacity-20">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{i + 1}</span>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {showTimePicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 border-t border-slate-100 dark:border-slate-850 pt-2 flex items-center gap-2"
              >
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl px-2 py-1 flex-1">
                  <Clock className="w-3 h-3 text-slate-455 shrink-0" />
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
                  className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-rose-500 bg-rose-55 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-955/40 transition-colors cursor-pointer"
                >
                  Clear Time
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* ── Bottom Close Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-850 rounded-b-[24px]">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Editing: {activeTab === 'start' ? 'Start date' : 'Due date'}
        </span>
        <button 
          type="button" 
          onClick={() => { setIsOpen(false); setShowTimePicker(false); }}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={className || `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${dateValue ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
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
