"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, CalendarDays, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
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
export function PriorityPillSelect({ value, onChange }: { value: Priority | undefined | null; onChange: (v: Priority | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 180);

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
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.left } : { top: coords.bottom + 6, left: coords.left }) : {})
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
  const { coords, openUpward } = useDropdownPosition(open, ref, 150);

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
  const { coords, openUpward } = useDropdownPosition(open, ref, 220);

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
      {typeof document !== 'undefined' && coords && createPortal(
        <AnimatePresence>
          {open && dropdownContent}
        </AnimatePresence>,
        document.body
      )}
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(timeValue || '');

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
      const rect = containerRef.current!.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 440 && rect.top > 445);
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
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

  const selectDate = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const newDate = `${currentYear}-${mm}-${dd}`;
    onChange(selectedTime ? `${newDate}T${selectedTime}` : newDate);
    setIsOpen(false);
    setShowTimePicker(false);
  };

  const selectPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const newDate = `${yyyy}-${mm}-${dd}`;
    onChange(selectedTime ? `${newDate}T${selectedTime}` : newDate);
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
    setIsOpen(false);
    setShowTimePicker(false);
  };

  const applyTime = (time: string) => {
    setSelectedTime(time);
    if (dateValue) {
      const datePart = dateValue.split('T')[0];
      onChange(time ? `${datePart}T${time}` : datePart);
    }
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedDateStr = dateValue?.split('T')[0] || '';

  // Smart display formatting
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
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
      if (ds === yestStr) return 'Yesterday';
      return `${monthNamesShort[m]} ${d}${y !== today.getFullYear() ? `, ${y}` : ''}`;
    }
    return dateValue;
  })() : (label || 'Select Date'));

  // Determine if selected date is overdue
  const isOverdue = dateValue && selectedDateStr < todayStr && label?.toLowerCase() === 'due';

  const calendarContent = (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 28, stiffness: 380 }}
      className="select-none rounded-[20px] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: 310,
        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        ...(coords ? (openUpward
          ? { bottom: window.innerHeight - coords.top + 8, left: align === 'right' ? coords.right - 310 : coords.left }
          : { top: coords.bottom + 8, left: align === 'right' ? coords.right - 310 : coords.left }
        ) : {})
      }}
    >
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden rounded-t-[20px]" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)' }} />
        <div className="relative px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer active:scale-90">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="text-center">
              <div className="text-[13px] font-black text-white tracking-wide">{monthNames[currentMonth]}</div>
              <div className="text-[10px] font-bold text-white/60">{currentYear}</div>
            </div>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer active:scale-90">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          {selectedDateStr && (
            <div className="text-center mt-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{label || 'Selected'}</span>
              <div className="text-lg font-black text-white leading-tight">
                {(() => {
                  const parts = selectedDateStr.split('-');
                  return `${monthNamesShort[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Presets Bar ── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60">
        {[
          { label: 'Today', offset: 0, icon: '📌' },
          { label: 'Tomorrow', offset: 1, icon: '➡️' },
          { label: 'Next Week', offset: 7, icon: '📅' },
          { label: '+2 Weeks', offset: 14, icon: '🗓️' },
        ].map(preset => (
          <button key={preset.label} type="button" onClick={() => selectPreset(preset.offset)}
            className="flex-1 flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer active:scale-95 uppercase tracking-wider">
            <span className="text-[10px]">{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* ── Calendar Grid ── */}
      <div className="px-4 pt-3 pb-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <div key={d} className="text-center py-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">{d}</span>
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0">
          {/* Previous month ghost days */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => {
            const ghostDay = prevMonthDays - adjustedFirstDay + 1 + i;
            return (
              <div key={`prev-${i}`} className="flex items-center justify-center w-full aspect-square">
                <span className="text-[11px] font-medium text-slate-200 dark:text-slate-700">{ghostDay}</span>
              </div>
            );
          })}

          {/* Current month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const isWeekend = (() => {
              const wd = new Date(currentYear, currentMonth, day);
              return wd.getDay() === 0 || wd.getDay() === 6;
            })();

            return (
              <div key={day} className="flex items-center justify-center w-full aspect-square p-[2px]">
                <button
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`relative w-full h-full rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90 ${
                    isSelected
                      ? 'text-white font-black shadow-md shadow-indigo-500/30'
                      : isToday
                        ? 'font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                        : isPast
                          ? 'font-semibold text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : isWeekend
                            ? 'font-bold text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  style={isSelected ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : undefined}
                >
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
                  )}
                  <span className="text-[11.5px] relative z-10">{day}</span>
                </button>
              </div>
            );
          })}

          {/* Next month ghost days */}
          {Array.from({ length: trailingDays }).map((_, i) => (
            <div key={`next-${i}`} className="flex items-center justify-center w-full aspect-square">
              <span className="text-[11px] font-medium text-slate-200 dark:text-slate-700">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Time Picker Toggle ── */}
      <div className="px-4 pb-3">
        <button type="button" onClick={() => setShowTimePicker(!showTimePicker)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-all cursor-pointer group">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/40 transition-colors">
              <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
              {selectedTime ? `Time: ${selectedTime}` : 'Add time'}
            </span>
          </div>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showTimePicker ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showTimePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-2 grid grid-cols-4 gap-1">
                {['09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'].map(t => (
                  <button key={t} type="button"
                    onClick={() => applyTime(t)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                      selectedTime === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={e => applyTime(e.target.value)}
                  className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/30 transition-all"
                />
                {selectedTime && (
                  <button type="button" onClick={() => { applyTime(''); setSelectedTime(''); }}
                    className="px-2 py-1.5 rounded-lg text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer">
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Actions Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60 rounded-b-[20px]">
        <button type="button"
          onClick={() => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); selectDate(t.getDate()); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer active:scale-95">
          <span>⚡</span> Jump to Today
        </button>
        {clearable && dateValue && (
          <button type="button" onClick={() => { onChange(undefined); setIsOpen(false); setShowTimePicker(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer active:scale-95">
            <X className="w-3 h-3" /> Clear Date
          </button>
        )}
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
  const { coords, openUpward } = useDropdownPosition(open, ref, 220);

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
      {typeof document !== 'undefined' && coords && createPortal(
        <AnimatePresence>
          {open && dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
