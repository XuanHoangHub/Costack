"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Priority, TaskStatus, User, Workspace } from '../../types';
import SignedImage from '../SignedImage';

// ── Custom Hook for Portal Positioning ──
function useDropdownPosition(isOpen: boolean, containerRef: React.RefObject<HTMLDivElement | null>, dropdownHeight: number = 200) {
  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number } | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < dropdownHeight && rect.top > dropdownHeight + 5);
      setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width });
    };
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, containerRef, dropdownHeight]);

  return { coords, openUpward };
}

// ── Priority Pill Select ──
export function PriorityPillSelect({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 150);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta: Record<Priority, { label: string; color: string; bg: string; icon: string }> = {
    urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50', icon: '🔴' },
    high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50', icon: '🟠' },
    medium: { label: 'Normal', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50', icon: '🟡' },
    low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: '⚪' },
  };
  const cur = meta[value];

  const dropdownContent = (
    <motion.div 
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-36"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.left } : { top: coords.bottom + 6, left: coords.left }) : {})
      }}
    >
      {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
        <button key={p} type="button" onClick={() => { onChange(p); setOpen(false); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${value === p ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${cur.bg} ${cur.color}`}>
        <span>{cur.icon}</span>
        <span>{cur.label}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && createPortal(dropdownContent, document.body)}
      </AnimatePresence>
    </div>
  );
}

// ── Status Pill Select ──
export function StatusPillSelect({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 150);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta: Record<TaskStatus, { label: string; dot: string; bg: string }> = {
    todo: { label: 'TO DO', dot: 'bg-slate-400', bg: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    inprogress: { label: 'IN PROGRESS', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900' },
    review: { label: 'REVIEW', dot: 'bg-cyan-500', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900' },
    completed: { label: 'DONE', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' },
  };
  const cur = meta[value];

  const dropdownContent = (
    <motion.div 
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-40"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.left } : { top: coords.bottom + 6, left: coords.left }) : {})
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
      <AnimatePresence>
        {open && createPortal(dropdownContent, document.body)}
      </AnimatePresence>
    </div>
  );
}

// ── Assignee Pill Select ──
export function AssigneePillSelect({ value, members, onChange, compact = false }: { value: string | null; members: User[]; onChange: (v: string | null) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 220);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const assignee = members.find(m => m.id === value);

  const dropdownContent = (
    <motion.div 
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.left } : { top: coords.bottom + 6, left: coords.left }) : {})
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
      <AnimatePresence>
        {open && createPortal(dropdownContent, document.body)}
      </AnimatePresence>
    </div>
  );
}

// ── Premium Date Picker ──
export function PremiumDatePicker({ label, dateValue, timeValue, onChange, clearable = true, align = 'right', className = '', displayLabel }: {
  label?: string; dateValue: string; timeValue?: string; onChange: (value: string | undefined) => void; clearable?: boolean; align?: 'left' | 'right' | 'center'; className?: string; displayLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [currentYear, setCurrentYear] = useState(() => {
    if (dateValue) return parseInt(dateValue.split('-')[0]) || new Date().getFullYear();
    return new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (dateValue) return (parseInt(dateValue.split('-')[1]) - 1) || new Date().getMonth();
    return new Date().getMonth();
  });

  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number } | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateCoords = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 330 && rect.top > 335);
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
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

  const selectDate = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const newDate = `${currentYear}-${mm}-${dd}`;
    onChange(timeValue ? `${newDate}T${timeValue}` : newDate);
    setIsOpen(false);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedDateStr = dateValue?.split('T')[0] || '';

  const displayText = displayLabel || (dateValue ? (() => {
    const parts = dateValue.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return dateValue;
  })() : (label || 'Select Date'));

  const calendarContent = (
    <motion.div ref={dropdownRef} initial={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-[280px] select-none" style={{ position: 'fixed', ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: align === 'right' ? coords.right - 280 : coords.left } : { top: coords.bottom + 6, left: align === 'right' ? coords.right - 280 : coords.left }) : {}) }}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{monthNames[currentMonth]} {currentYear}</span>
        <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="text-[9px] font-bold text-slate-400 text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === todayStr;
          return (
            <button key={day} type="button" onClick={() => selectDate(day)}
              className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : isToday ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 font-black ring-1 ring-indigo-300 dark:ring-indigo-700' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={() => { const t = new Date(); selectDate(t.getDate()); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); }}
          className="text-[10px] font-bold text-indigo-650 hover:text-indigo-700 cursor-pointer">Today</button>
        {clearable && dateValue && (
          <button type="button" onClick={() => { onChange(undefined); setIsOpen(false); }}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-0.5">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={className || `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-sm ${dateValue ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>{displayText}</span>
      </button>
      <AnimatePresence>
        {isOpen && createPortal(calendarContent, document.body)}
      </AnimatePresence>
    </div>
  );
}

// ── Space Pill Select ──
export function SpacePillSelect({ value, workspaces, onChange }: { value: string | null | undefined; workspaces: Workspace[]; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 220);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const curWorkspace = workspaces.find(w => w.id === value);

  const dropdownContent = (
    <motion.div 
      initial={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4 }} 
      transition={{ duration: 0.12 }}
      className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-52 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.left } : { top: coords.bottom + 6, left: coords.left }) : {})
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
      <AnimatePresence>
        {open && createPortal(dropdownContent, document.body)}
      </AnimatePresence>
    </div>
  );
}
