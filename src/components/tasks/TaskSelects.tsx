"use client";

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, CalendarDays, ChevronLeft, ChevronRight, X, Clock, ChevronUp, Flag, Bell, BellRing, Search, Users, UserPlus, Circle, CircleDot, CheckCircle2, Eye, Minus, Building2, Briefcase } from 'lucide-react';
import { Priority, TaskStatus, User, Workspace } from '../../types';
import { useWorkspaceTeams, getStoredTeams, TeamItem } from '@/lib/teamStore';
import SignedImage from '../SignedImage';
import { getStoredPriorities, getStoredStatuses, OptionConfig, getStoredDateFormat, formatCustomDate, DateFormatOption, getLocalizedOptionLabel, getColorOption, COLOR_PALETTE, getStoredCustomFieldsConfig } from '../../utils/fieldConfig';
import { renderSpaceIcon } from '../EmojiIconPicker';
import { useTranslation } from '../../contexts/TranslationContext';
import {
  ReminderOption,
  REMINDER_OPTIONS,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  getBrowserNotificationPermission,
  sendTestNotification,
  saveTaskReminder,
  getTaskReminder,
  sendSystemNotification,
} from '@/lib/notificationManager';

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

// ── Standard Priority Meta & Config ──
export const STANDARD_PRIORITY_META: Record<Priority, {
  id: Priority;
  labelEn: string;
  labelVi: string;
  hex: string;
  badgeClass: string;
  textClass: string;
  iconClass: string;
}> = {
  urgent: {
    id: 'urgent',
    labelEn: 'Urgent',
    labelVi: 'Khẩn cấp',
    hex: '#ef4444',
    badgeClass: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200/90 dark:border-rose-500/30 shadow-xs shadow-rose-500/10 hover:dark:bg-rose-500/25',
    textClass: 'text-rose-600 dark:text-rose-400',
    iconClass: 'fill-rose-500 text-rose-500'
  },
  high: {
    id: 'high',
    labelEn: 'High',
    labelVi: 'Cao',
    hex: '#f97316',
    badgeClass: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200/90 dark:border-orange-500/30 shadow-xs shadow-orange-500/10 hover:dark:bg-orange-500/25',
    textClass: 'text-orange-600 dark:text-orange-400',
    iconClass: 'fill-orange-500 text-orange-500'
  },
  medium: {
    id: 'medium',
    labelEn: 'Normal',
    labelVi: 'Bình thường',
    hex: '#3b82f6',
    badgeClass: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200/90 dark:border-blue-500/30 shadow-xs shadow-blue-500/10 hover:dark:bg-blue-500/25',
    textClass: 'text-blue-600 dark:text-blue-400',
    iconClass: 'fill-blue-500 text-blue-500'
  },
  low: {
    id: 'low',
    labelEn: 'Low',
    labelVi: 'Thấp',
    hex: '#64748b',
    badgeClass: 'bg-slate-100/80 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-white/10 shadow-xs hover:dark:bg-white/[0.1]',
    textClass: 'text-slate-500 dark:text-zinc-400',
    iconClass: 'fill-slate-400 text-slate-400'
  }
};

// ── Priority Pill Select (Modern Standard) ──
export function PriorityPillSelect({ value, onChange }: { value: Priority | undefined | null; onChange: (v: Priority | undefined) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 220, 190);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const normalizedValue = (value as string) === 'normal' ? 'medium' : value;
  const isEmpty = !normalizedValue || (normalizedValue as string) === 'none';
  const cur = !isEmpty && normalizedValue && STANDARD_PRIORITY_META[normalizedValue as Priority] ? STANDARD_PRIORITY_META[normalizedValue as Priority] : null;

  const priorityOptions: Array<{ id: Priority; label: string; config: typeof STANDARD_PRIORITY_META[Priority] }> = [
    { id: 'urgent', label: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', config: STANDARD_PRIORITY_META.urgent },
    { id: 'high', label: locale === 'vi' ? 'Cao' : 'High', config: STANDARD_PRIORITY_META.high },
    { id: 'medium', label: locale === 'vi' ? 'Bình thường' : 'Normal', config: STANDARD_PRIORITY_META.medium },
    { id: 'low', label: locale === 'vi' ? 'Thấp' : 'Low', config: STANDARD_PRIORITY_META.low },
  ];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.96 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.96 }} 
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.6)] w-48"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
        <Flag className="w-3 h-3 text-slate-400" />
        <span>{locale === 'vi' ? 'Độ ưu tiên' : 'Priority'}</span>
      </div>

      {/* None option */}
      <button 
        type="button" 
        onClick={() => { onChange(undefined); setOpen(false); }}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-semibold rounded-xl cursor-pointer transition-all ${
          isEmpty 
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold' 
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="flex-1">{locale === 'vi' ? 'Không có (Trống)' : 'None (Empty)'}</span>
        {isEmpty && <Check className="w-3.5 h-3.5 ml-auto text-slate-600 dark:text-slate-300 stroke-[2.5]" />}
      </button>

      {/* Priority Options */}
      {priorityOptions.map(p => {
        const isSelected = !isEmpty && normalizedValue === p.id;
        return (
          <button 
            key={p.id} 
            type="button" 
            onClick={() => { onChange(p.id); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-semibold rounded-xl cursor-pointer transition-all ${
              isSelected 
                ? `${p.config.badgeClass} font-bold` 
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 shrink-0 ${p.config.iconClass}`} />
            <span className="flex-1">{p.label}</span>
            {isSelected && <Check className={`w-3.5 h-3.5 ml-auto ${p.config.textClass} stroke-[2.5]`} />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer select-none transition-all hover:shadow-xs active:scale-95 ${
          cur 
            ? `${cur.badgeClass}` 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        {cur ? (
          <>
            <Flag className={`w-3.5 h-3.5 shrink-0 ${cur.iconClass}`} />
            <span>{locale === 'vi' ? cur.labelVi : cur.labelEn}</span>
          </>
        ) : (
          <>
            <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{locale === 'vi' ? 'Trống' : 'None'}</span>
          </>
        )}
        <ChevronDown className={`w-3 h-3 opacity-60 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
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

// ── Standard Status Meta & Helpers ──
export const STANDARD_STATUS_META: Record<TaskStatus, {
  id: TaskStatus;
  labelEn: string;
  labelVi: string;
  hex: string;
  badgeClass: string;
  textClass: string;
}> = {
  todo: {
    id: 'todo',
    labelEn: 'To Do',
    labelVi: 'Cần làm',
    hex: '#64748b',
    badgeClass: 'bg-slate-100/90 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border-slate-200/90 dark:border-white/10 shadow-xs hover:dark:bg-white/[0.1]',
    textClass: 'text-slate-600 dark:text-zinc-400',
  },
  inprogress: {
    id: 'inprogress',
    labelEn: 'In Progress',
    labelVi: 'Đang thực hiện',
    hex: '#f59e0b',
    badgeClass: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200/90 dark:border-amber-500/30 shadow-xs shadow-amber-500/10 hover:dark:bg-amber-500/25',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  review: {
    id: 'review',
    labelEn: 'In Review',
    labelVi: 'Chờ duyệt',
    hex: '#8b5cf6',
    badgeClass: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200/90 dark:border-purple-500/30 shadow-xs shadow-purple-500/10 hover:dark:bg-purple-500/25',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
  completed: {
    id: 'completed',
    labelEn: 'Done',
    labelVi: 'Hoàn thành',
    hex: '#10b981',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-500/30 shadow-xs shadow-emerald-500/10 hover:dark:bg-emerald-500/25',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  }
};

export const renderStatusIcon = (status: TaskStatus, className = "w-3.5 h-3.5") => {
  switch (status) {
    case 'todo':
      return <Circle className={`${className} text-slate-400 dark:text-slate-500 stroke-[2.2] shrink-0`} />;
    case 'inprogress':
      return <CircleDot className={`${className} text-amber-500 stroke-[2.5] shrink-0 animate-pulse`} />;
    case 'review':
      return <Eye className={`${className} text-purple-500 stroke-[2.2] shrink-0`} />;
    case 'completed':
      return <CheckCircle2 className={`${className} text-emerald-500 fill-emerald-100 dark:fill-emerald-950/60 stroke-[2.5] shrink-0`} />;
    default:
      return <Circle className={`${className} text-slate-400 shrink-0`} />;
  }
};

// ── Status Pill Select (Modern Standard) ──
export function StatusPillSelect({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 200, 190);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cur = STANDARD_STATUS_META[value] || STANDARD_STATUS_META.todo;

  const statusOptions: Array<{ id: TaskStatus; label: string; config: typeof STANDARD_STATUS_META[TaskStatus] }> = [
    { id: 'todo', label: locale === 'vi' ? 'Cần làm' : 'To Do', config: STANDARD_STATUS_META.todo },
    { id: 'inprogress', label: locale === 'vi' ? 'Đang thực hiện' : 'In Progress', config: STANDARD_STATUS_META.inprogress },
    { id: 'review', label: locale === 'vi' ? 'Chờ duyệt' : 'In Review', config: STANDARD_STATUS_META.review },
    { id: 'completed', label: locale === 'vi' ? 'Hoàn thành' : 'Done', config: STANDARD_STATUS_META.completed },
  ];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.96 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.96 }} 
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.6)] w-48"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
        <CircleDot className="w-3 h-3 text-slate-400" />
        <span>{locale === 'vi' ? 'Trạng thái' : 'Status'}</span>
      </div>

      {statusOptions.map(s => {
        const isSelected = value === s.id;
        return (
          <button 
            key={s.id} 
            type="button" 
            onClick={() => { onChange(s.id); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-semibold rounded-xl cursor-pointer transition-all ${
              isSelected 
                ? `${s.config.badgeClass} font-bold` 
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {renderStatusIcon(s.id, 'w-3.5 h-3.5')}
            <span className="flex-1">{s.label}</span>
            {isSelected && <Check className={`w-3.5 h-3.5 ml-auto ${s.config.textClass} stroke-[2.5]`} />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer select-none transition-all hover:shadow-xs active:scale-95 ${cur.badgeClass}`}
      >
        {renderStatusIcon(cur.id, 'w-3.5 h-3.5')}
        <span>{locale === 'vi' ? cur.labelVi : cur.labelEn}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
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

// ── Assignee & Team Pill Select (Modern Multi-Assignee & Team Selection) ──
export function AssigneePillSelect({ 
  value, 
  members, 
  onChange, 
  teamIds,
  onTeamChange,
  workspaceId = 'default',
  compact = false 
}: { 
  value: string | string[] | null | undefined; 
  members: User[]; 
  onChange: (v: string[] | null) => void; 
  teamIds?: string[] | null;
  onTeamChange?: (v: string[] | null) => void;
  workspaceId?: string;
  compact?: boolean;
}) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'teams'>('members');
  const [query, setQuery] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 380, 320);

  const teams = useWorkspaceTeams(workspaceId);

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
    if (!open) {
      setQuery('');
      setActiveTab('members');
    }
  }, [open]);

  const valueIds = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return [value];
  }, [value]);

  const selectedTeamIds = useMemo(() => {
    if (!teamIds) return [];
    if (Array.isArray(teamIds)) return teamIds.filter(Boolean);
    return [teamIds];
  }, [teamIds]);

  const selectedMembers = useMemo(() => {
    return members.filter(member => valueIds.includes(member.id));
  }, [members, valueIds]);

  const selectedTeams = useMemo(() => {
    return teams.filter(team => selectedTeamIds.includes(team.id));
  }, [teams, selectedTeamIds]);

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter(member => `${member.name} ${member.email || ''}`.toLowerCase().includes(normalized));
  }, [members, query]);

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return teams;
    return teams.filter(team => `${team.name} ${team.department || ''}`.toLowerCase().includes(normalized));
  }, [teams, query]);

  const toggleAssignee = (memberId: string) => {
    const nextIds = valueIds.includes(memberId)
      ? valueIds.filter(id => id !== memberId)
      : [...valueIds, memberId];
    onChange(nextIds.length > 0 ? nextIds : null);
  };

  const toggleTeam = (teamId: string) => {
    if (!onTeamChange) return;
    const nextIds = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter(id => id !== teamId)
      : [...selectedTeamIds, teamId];
    onTeamChange(nextIds.length > 0 ? nextIds : null);
  };

  const clearAll = () => {
    if (activeTab === 'members') {
      onChange(null);
    } else if (onTeamChange) {
      onTeamChange(null);
    }
  };

  const avatar = (member: User, className: string) => member.avatar ? (
    <SignedImage filePath={member.avatar} className={`${className} object-cover`} alt={member.name} />
  ) : (
    <span className={`${className} flex items-center justify-center bg-blue-600 text-white text-[9px] font-bold`} aria-hidden="true">
      {(member.name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );

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
        width: Math.max(280, Math.min(340, coords.width + 100)),
        transform: openUpward ? 'translateY(-100%)' : undefined,
        zIndex: 1000,
      }}
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-800 dark:bg-slate-900"
      role="listbox"
      aria-label={locale === 'vi' ? 'Người phụ trách & Đội ngũ' : 'Assignee & Team'}
    >
      {/* Dropdown Header with Count & Clear */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60">
        <div className="flex items-center gap-1.5">
          {activeTab === 'members' ? (
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {activeTab === 'members' 
              ? (locale === 'vi' ? 'Thành viên' : 'Members') 
              : (locale === 'vi' ? 'Đội ngũ' : 'Teams')}
          </span>
          {(activeTab === 'members' ? selectedMembers.length : selectedTeams.length) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {activeTab === 'members' ? selectedMembers.length : selectedTeams.length}
            </span>
          )}
        </div>

        {(activeTab === 'members' ? selectedMembers.length > 0 : selectedTeams.length > 0) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
          >
            {locale === 'vi' ? 'Bỏ chọn' : 'Clear'}
          </button>
        )}
      </div>

      {/* Selector Tabs: Members vs Teams */}
      {onTeamChange && (
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>{locale === 'vi' ? 'Thành viên' : 'Members'}</span>
            {selectedMembers.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[9px] flex items-center justify-center font-black">
                {selectedMembers.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>{locale === 'vi' ? 'Đội ngũ' : 'Teams'}</span>
            {selectedTeams.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[9px] flex items-center justify-center font-black">
                {selectedTeams.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              activeTab === 'members'
                ? (locale === 'vi' ? 'Tìm theo tên hoặc email...' : 'Search members...')
                : (locale === 'vi' ? 'Tìm theo tên đội ngũ...' : 'Search teams...')
            }
            className="h-8 w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 pl-8 pr-7 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-slate-850 focus:ring-2 focus:ring-blue-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* List Content */}
      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
        {activeTab === 'members' ? (
          <>
            {filteredMembers.map(member => {
              const selected = valueIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleAssignee(member.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                    selected 
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-medium' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                    selected 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs shadow-blue-500/30' 
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-blue-400'
                  }`}>
                    {selected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>

                  <div className="relative shrink-0">
                    {avatar(member, 'h-6 w-6 rounded-full')}
                    {member.status === 'online' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate leading-snug">
                      {member.name}
                    </div>
                    {member.email && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug">
                        {member.email}
                      </div>
                    )}
                  </div>

                  {member.role === 'admin' && (
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">
                      Admin
                    </span>
                  )}
                </button>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                {locale === 'vi' ? 'Không tìm thấy thành viên nào' : 'No members found'}
              </div>
            )}
          </>
        ) : (
          <>
            {filteredTeams.map(team => {
              const selected = selectedTeamIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleTeam(team.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                    selected 
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-medium' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                    selected 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs shadow-indigo-500/30' 
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-indigo-400'
                  }`}>
                    {selected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>

                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-base shadow-3xs"
                    style={{ backgroundColor: `${team.color || '#6366f1'}20`, color: team.color || '#6366f1' }}
                  >
                    {team.icon || '👥'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate leading-snug">
                      {team.name}
                    </div>
                    {team.department && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug">
                        {team.department}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {filteredTeams.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                {locale === 'vi' ? 'Không tìm thấy đội ngũ nào' : 'No teams found'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dropdown Footer with Done button */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {activeTab === 'members'
            ? (selectedMembers.length === 0
                ? (locale === 'vi' ? 'Chọn 1 hoặc nhiều người' : 'Select 1 or more people')
                : (locale === 'vi' ? `Đã chọn ${selectedMembers.length} người` : `${selectedMembers.length} selected`))
            : (selectedTeams.length === 0
                ? (locale === 'vi' ? 'Chọn 1 hoặc nhiều nhóm' : 'Select 1 or more teams')
                : (locale === 'vi' ? `Đã chọn ${selectedTeams.length} nhóm` : `${selectedTeams.length} selected`))}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {locale === 'vi' ? 'Xong' : 'Done'}
        </button>
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={ref} className="relative inline-block min-w-0">
      {selectedMembers.length === 0 && selectedTeams.length === 0 ? (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300/90 dark:border-white/15 bg-white/60 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.08] hover:dark:border-white/25 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-all cursor-pointer ${compact ? 'max-w-[140px]' : ''}`}
        >
          <UserPlus className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
          <span className="truncate">{locale === 'vi' ? 'Chưa phân công' : 'Unassigned'}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a0b10] hover:bg-slate-50 dark:hover:bg-[#11131a] px-2.5 py-1 text-xs font-semibold text-slate-750 dark:text-zinc-200 shadow-xs transition-all cursor-pointer ${compact ? 'max-w-[180px]' : ''}`}
        >
          {/* Member avatars */}
          {selectedMembers.length > 0 && (
            <span className="flex shrink-0 -space-x-1.5">
              {selectedMembers.slice(0, 2).map(member => (
                <span key={member.id} className="rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden shrink-0">
                  {avatar(member, 'h-4.5 w-4.5')}
                </span>
              ))}
              {selectedMembers.length > 2 && (
                <span className="h-4.5 w-4.5 rounded-full ring-2 ring-white dark:ring-slate-900 bg-blue-600 text-white text-[8px] font-black flex items-center justify-center shrink-0">
                  +{selectedMembers.length - 2}
                </span>
              )}
            </span>
          )}

          {/* Member name or count */}
          {selectedMembers.length === 1 && selectedTeams.length === 0 && (
            <span className="truncate max-w-[100px]">{selectedMembers[0].name}</span>
          )}

          {/* Team badges if selected */}
          {selectedTeams.length > 0 && (
            <span className="flex items-center gap-1 shrink-0">
              {selectedTeams.slice(0, 1).map(team => (
                <span 
                  key={team.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: `${team.color || '#6366f1'}15`, color: team.color || '#6366f1' }}
                >
                  <span>{team.icon || '👥'}</span>
                  <span className="truncate max-w-[80px]">{team.name}</span>
                </span>
              ))}
              {selectedTeams.length > 1 && (
                <span className="text-[10px] font-bold text-indigo-500">
                  +{selectedTeams.length - 1}
                </span>
              )}
            </span>
          )}

          <ChevronDown className={`w-3 h-3 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {typeof document !== 'undefined' && open && coords && createPortal(dropdownContent, document.body)}
    </div>
  );
}

// ── Dedicated Team Pill Select ──
export function TeamPillSelect({
  value,
  workspaceId = 'default',
  onChange,
  compact = false
}: {
  value: string | string[] | null | undefined;
  workspaceId?: string;
  onChange: (v: string[] | null) => void;
  compact?: boolean;
}) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 300, 260);

  const teams = useWorkspaceTeams(workspaceId);

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

  const valueIds = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return [value];
  }, [value]);

  const selectedTeams = useMemo(() => {
    return teams.filter(team => valueIds.includes(team.id));
  }, [teams, valueIds]);

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return teams;
    return teams.filter(team => `${team.name} ${team.department || ''}`.toLowerCase().includes(normalized));
  }, [teams, query]);

  const toggleTeam = (teamId: string) => {
    const nextIds = valueIds.includes(teamId)
      ? valueIds.filter(id => id !== teamId)
      : [...valueIds, teamId];
    onChange(nextIds.length > 0 ? nextIds : null);
  };

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
        width: Math.max(260, Math.min(320, coords.width + 60)),
        transform: openUpward ? 'translateY(-100%)' : undefined,
        zIndex: 1000,
      }}
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-800 dark:bg-slate-900"
      role="listbox"
      aria-label={locale === 'vi' ? 'Chọn đội ngũ' : 'Select team'}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {locale === 'vi' ? 'Đội ngũ / Nhóm' : 'Teams'}
          </span>
          {selectedTeams.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {selectedTeams.length}
            </span>
          )}
        </div>
        {selectedTeams.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-0.5 rounded-lg cursor-pointer"
          >
            {locale === 'vi' ? 'Bỏ chọn' : 'Clear'}
          </button>
        )}
      </div>

      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={locale === 'vi' ? 'Tìm đội ngũ...' : 'Search teams...'}
            className="h-8 w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 pl-8 pr-7 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-indigo-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
        {filteredTeams.map(team => {
          const selected = valueIds.includes(team.id);
          return (
            <button
              key={team.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggleTeam(team.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                selected 
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-medium' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                selected 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-indigo-400'
              }`}>
                {selected && <Check className="w-3 h-3 stroke-[2.5]" />}
              </div>

              <div 
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-base shadow-3xs"
                style={{ backgroundColor: `${team.color || '#6366f1'}20`, color: team.color || '#6366f1' }}
              >
                {team.icon || '👥'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate leading-snug">
                  {team.name}
                </div>
                {team.department && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug">
                    {team.department}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {filteredTeams.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {locale === 'vi' ? 'Không tìm thấy đội ngũ nào' : 'No teams found'}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {selectedTeams.length === 0
            ? (locale === 'vi' ? 'Chọn 1 hoặc nhiều nhóm' : 'Select teams')
            : (locale === 'vi' ? `Đã chọn ${selectedTeams.length} nhóm` : `${selectedTeams.length} selected`)}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {locale === 'vi' ? 'Xong' : 'Done'}
        </button>
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={ref} className="relative inline-block min-w-0">
      {selectedTeams.length === 0 ? (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300/90 dark:border-white/15 bg-white/60 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.08] hover:dark:border-white/25 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-all cursor-pointer ${compact ? 'max-w-[140px]' : ''}`}
        >
          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
          <span className="truncate">{locale === 'vi' ? 'Chọn đội ngũ' : 'No team'}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : selectedTeams.length === 1 ? (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a0b10] hover:bg-slate-50 dark:hover:bg-[#11131a] px-2.5 py-1 text-xs font-semibold text-slate-750 dark:text-zinc-200 shadow-xs transition-all cursor-pointer ${compact ? 'max-w-[160px]' : ''}`}
        >
          <span className="text-sm">{selectedTeams[0].icon || '👥'}</span>
          <span className="truncate max-w-[110px] font-bold" style={{ color: selectedTeams[0].color || undefined }}>
            {selectedTeams[0].name}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 hover:bg-indigo-50 dark:hover:bg-indigo-500/25 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-xs transition-all cursor-pointer ${compact ? 'max-w-[180px]' : ''}`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">
            {selectedTeams.length} {locale === 'vi' ? 'đội ngũ' : 'teams'}
          </span>
          <ChevronDown className={`w-3 h-3 text-indigo-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {typeof document !== 'undefined' && open && coords && createPortal(dropdownContent, document.body)}
    </div>
  );
}
export function PremiumDatePicker({
  label,
  dateValue,
  timeValue,
  onChange,
  startDateValue = '',
  onStartDateChange,
  clearable = true,
  align = 'right',
  className = '',
  displayLabel,
  reminderValue,
  onReminderChange,
  taskId,
  taskTitle,
}: {
  label?: string;
  dateValue: string;
  timeValue?: string;
  onChange: (value: string | undefined) => void;
  startDateValue?: string;
  onStartDateChange?: (value: string | undefined) => void;
  clearable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  displayLabel?: string;
  reminderValue?: ReminderOption;
  onReminderChange?: (value: ReminderOption) => void;
  taskId?: string;
  taskTitle?: string;
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
    const l = label?.toLowerCase();
    if (l === 'start' || l === 'bắt đầu') return 'start';
    return 'due';
  });

  const [localStartDate, setLocalStartDate] = useState('');
  const [localStartDateTime, setLocalStartDateTime] = useState('');
  const [localDueDate, setLocalDueDate] = useState('');
  const [localDueDateTime, setLocalDueDateTime] = useState('');

  const [activeSubPanel, setActiveSubPanel] = useState<'time' | 'reminder' | null>(null);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>(() => getBrowserNotificationPermission());
  const [selectedReminder, setSelectedReminder] = useState<ReminderOption>(() => {
    if (reminderValue) return reminderValue;
    if (taskId) return getTaskReminder(taskId);
    return 'none';
  });

  React.useEffect(() => {
    if (reminderValue !== undefined) {
      setSelectedReminder(reminderValue);
    } else if (taskId) {
      setSelectedReminder(getTaskReminder(taskId));
    }
  }, [reminderValue, taskId]);

  React.useEffect(() => {
    if (isOpen || activeSubPanel === 'reminder') {
      setBrowserPerm(getBrowserNotificationPermission());
    }
  }, [isOpen, activeSubPanel]);

  const handleSelectReminder = async (opt: ReminderOption) => {
    setSelectedReminder(opt);
    onReminderChange?.(opt);
    if (taskId) {
      const activeDue = localDueDate ? (localDueDateTime ? `${localDueDate}T${localDueDateTime}` : `${localDueDate}T09:00:00`) : '';
      saveTaskReminder(taskId, taskTitle || 'Công việc', activeDue, opt);
    }

    if (opt !== 'none') {
      if (isBrowserNotificationSupported() && getBrowserNotificationPermission() === 'default') {
        const perm = await requestBrowserNotificationPermission();
        setBrowserPerm(perm);
        if (perm === 'granted') {
          sendSystemNotification({
            title: '🔔 Thông báo nhắc nhở đã kích hoạt',
            message: `Đã cài nhắc hẹn "${REMINDER_OPTIONS.find(r => r.id === opt)?.labelVi}" cho công việc này.`,
            type: 'success',
            taskId,
          });
        }
      }
    }
  };

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
      setActiveSubPanel(null);
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
        setActiveSubPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveSubPanel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
      if (taskId && selectedReminder !== 'none' && fullVal) {
        saveTaskReminder(taskId, taskTitle || 'Công việc', fullVal, selectedReminder);
      }
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

  const l = label?.toLowerCase();
  const isStart = l === 'start' || l === 'bắt đầu';
  const isDue = l === 'due' || l === 'hạn chót' || l === 'hạn';
  const activeDateValue = isStart ? (startDateValue || dateValue) : dateValue;
  const displayText = displayLabel || (activeDateValue ? formatDateLabel(activeDateValue) : (label || 'Select Date'));
  const currentTimePart = activeTab === 'start' ? localStartDateTime : localDueDateTime;

  const isOverdue = isDue && dateValue && dateValue.split('T')[0] < todayStr;

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
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 p-1 bg-slate-100/70 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            aria-pressed={activeTab === 'start'}
            className={`min-w-0 flex items-center justify-between gap-1.5 h-9 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'start'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{localStartDate ? formatDateForBox(localStartDate) : 'Start date'}</span>
            </div>
            {localStartDate && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  clearActiveDate('start');
                }}
                className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Xoá ngày bắt đầu"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>

          {/* Arrow connector */}
          <div className="flex flex-col items-center shrink-0 px-0.5">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('due')}
            aria-pressed={activeTab === 'due'}
            className={`min-w-0 flex items-center justify-between gap-1.5 h-9 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'due'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{localDueDate ? formatDateForBox(localDueDate) : 'Due date'}</span>
            </div>
            {localDueDate && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  clearActiveDate('due');
                }}
                className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Xoá hạn chót"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        </div>

        {/* Duration badge */}
        {getDurationLabel() && (
          <div className="flex items-center justify-center mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold rounded-full border border-indigo-100 dark:border-indigo-900/40">
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
                className="rounded-lg px-2 py-1 text-[13px] font-bold text-slate-900 dark:text-slate-100 tracking-tight hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex items-center gap-1 cursor-pointer"
                aria-label="Chọn tháng và năm"
              >
                {monthNamesFull[currentMonth]} {currentYear}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); }}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                >
                  Hôm nay
                </button>
                <div className="flex items-center rounded-lg bg-slate-100/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 overflow-hidden p-0.5">
                  <button type="button" aria-label="Tháng trước" onClick={prevMonth} className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer transition-all">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Tháng sau" onClick={nextMonth} className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer transition-all">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 text-center mb-1 px-0.5">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                <div key={d} className="py-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{d}</span>
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
                      className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                        ${isStartDate
                          ? 'text-white font-bold bg-blue-600 shadow-xs'
                          : isDueDate
                            ? 'text-white font-bold bg-blue-600 shadow-xs'
                            : inRange
                              ? 'font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              : isToday
                                ? 'font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                : isPast
                                  ? 'font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-500'
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
                  <span className="text-[11px] font-medium text-slate-400/60 dark:text-slate-600">{i + 1}</span>
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
                <span key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{d}</span>
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
                      <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                      <div className="text-[9px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  {calcStr && (
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/30">
                      {calcStr}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Time & Reminder Sub-Panel (Clean, Minimal, No Suggestions) ── */}
      <AnimatePresence>
        {activeSubPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mx-3 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="py-2.5 space-y-2">
              {/* Tab 1: Đặt Giờ */}
              {activeSubPanel === 'time' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Thời gian thực hiện
                    </span>
                    {currentTimePart && (
                      <button
                        type="button"
                        onClick={() => applyTime('')}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Xoá giờ
                      </button>
                    )}
                  </div>

                  {/* Clean, styled direct time input */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                    <input
                      type="time"
                      value={currentTimePart}
                      onChange={(e) => applyTime(e.target.value)}
                      className="w-full text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none p-0 focus:ring-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden cursor-pointer tracking-wider"
                    />
                  </div>

                  {/* Clean Quick Hour / Minute Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xs">
                      <span className="text-[10px] font-semibold text-slate-400">Giờ:</span>
                      <select
                        value={currentTimePart ? currentTimePart.split(':')[0] : ''}
                        onChange={(e) => {
                          const h = e.target.value;
                          const currentM = currentTimePart ? currentTimePart.split(':')[1] || '00' : '00';
                          applyTime(h ? `${h}:${currentM}` : '');
                        }}
                        className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none cursor-pointer"
                      >
                        <option value="">Chọn giờ</option>
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xs">
                      <span className="text-[10px] font-semibold text-slate-400">Phút:</span>
                      <select
                        value={currentTimePart ? currentTimePart.split(':')[1] : ''}
                        onChange={(e) => {
                          const m = e.target.value;
                          const currentH = currentTimePart ? currentTimePart.split(':')[0] || '09' : '09';
                          applyTime(`${currentH}:${m}`);
                        }}
                        className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none cursor-pointer"
                      >
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                          <option key={m} value={m}>{m} phút</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Nhắc nhở */}
              {activeSubPanel === 'reminder' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      Thông báo nhắc hẹn
                    </span>
                    {isBrowserNotificationSupported() && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await requestBrowserNotificationPermission();
                          setBrowserPerm(res);
                          if (res === 'granted') {
                            sendTestNotification();
                          }
                        }}
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          browserPerm === 'granted'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
                            : browserPerm === 'denied'
                              ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'
                              : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                      >
                        {browserPerm === 'granted'
                          ? '✓ Đã bật thông báo máy tính'
                          : browserPerm === 'denied'
                            ? '⚠ Đã bị chặn trên trình duyệt'
                            : '+ Bật thông báo đẩy'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {REMINDER_OPTIONS.map(option => {
                      const isSelected = selectedReminder === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectReminder(option.id)}
                          className={`px-2.5 py-2 rounded-xl text-[10px] font-semibold text-left transition-all cursor-pointer border flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500 text-white font-bold border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/30'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          <span className="truncate">{option.labelVi}</span>
                          {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer: Clean, modern Apple/Linear-grade controls ── */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Time Picker Toggle Button */}
          <button 
            type="button"
            onClick={() => setActiveSubPanel(activeSubPanel === 'time' ? null : 'time')}
            aria-expanded={activeSubPanel === 'time'}
            title={currentTimePart ? `Giờ: ${currentTimePart}` : "Đặt giờ"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all cursor-pointer border ${
              activeSubPanel === 'time' || currentTimePart
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px]">{currentTimePart || 'Đặt giờ'}</span>
          </button>

          {/* Reminder / Notification Toggle */}
          <button 
            type="button"
            onClick={() => setActiveSubPanel(activeSubPanel === 'reminder' ? null : 'reminder')}
            aria-expanded={activeSubPanel === 'reminder'}
            title="Cài đặt thông báo & nhắc nhở"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all cursor-pointer border ${
              activeSubPanel === 'reminder' || selectedReminder !== 'none'
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {selectedReminder !== 'none' ? (
              <BellRing className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-pulse" />
            ) : (
              <Bell className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="text-[10px]">
              {selectedReminder !== 'none' 
                ? (REMINDER_OPTIONS.find(r => r.id === selectedReminder)?.labelVi.replace('Trước ', '') || 'Nhắc nhở')
                : 'Nhắc nhở'}
            </span>
          </button>

          {/* Clear Active Date Button */}
          {clearable && (activeTab === 'start' ? localStartDate : localDueDate) && (
            <button
              type="button"
              onClick={() => clearActiveDate(activeTab)}
              aria-label={`Xoá ngày ${activeTab}`}
              title="Xoá ngày"
              className="p-1.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Done / Xong Button */}
        <button 
          type="button" 
          onClick={() => {
            setIsOpen(false);
            setActiveSubPanel(null);
          }}
          className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Xong
        </button>
      </div>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative inline-block max-w-full min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={
          className
            ? `inline-flex items-center gap-1.5 whitespace-nowrap ${className}`
            : `inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer select-none transition-all hover:shadow-xs truncate max-w-full ${
                activeDateValue
                  ? 'bg-white dark:bg-[#0a0b10] text-slate-750 dark:text-zinc-200 border-slate-200 dark:border-white/10'
                  : 'bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-zinc-400 border-slate-200 dark:border-white/10 hover:dark:border-white/20 hover:dark:bg-white/[0.06] hover:dark:text-zinc-200'
              }`
        }
      >
        <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
        <span className={`truncate ${isOverdue ? 'text-rose-500' : ''}`}>{displayText}</span>
        {selectedReminder !== 'none' && (
          <Bell className="w-2.5 h-2.5 text-amber-500 shrink-0 ml-0.5" />
        )}
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

export const PLATFORM_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  facebook: { bg: '#0084FF', text: '#ffffff' },
  youtube: { bg: '#FF0000', text: '#ffffff' },
  tiktok: { bg: '#111111', text: '#ffffff' },
  instagram: { bg: '#E1306C', text: '#ffffff' },
  threads: { bg: '#000000', text: '#ffffff' },
  zalo: { bg: '#0068FF', text: '#ffffff' },
  website: { bg: '#059669', text: '#ffffff' },
  twitter: { bg: '#1DA1F2', text: '#ffffff' },
  x: { bg: '#000000', text: '#ffffff' },
  linkedin: { bg: '#0A66C2', text: '#ffffff' },
};

export function DropdownFieldSelect({ 
  value, 
  options = [], 
  fieldId,
  fieldName,
  placeholder,
  onChange 
}: { 
  value: string; 
  options?: (string | OptionConfig)[]; 
  fieldId?: string;
  fieldName?: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const { locale } = useTranslation();
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

  const defaultPlatformOptions: OptionConfig[] = useMemo(() => [
    { id: 'fb', label: 'Facebook', color: 'indigo' },
    { id: 'yt', label: 'YouTube', color: 'rose' },
    { id: 'tt', label: 'TikTok', color: 'slate' },
    { id: 'ig', label: 'Instagram', color: 'pink' }
  ], []);

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
    if (fieldName && (fieldName.toLowerCase().includes('kênh') || fieldName.toLowerCase().includes('channel') || fieldName.toLowerCase().includes('platform'))) {
      return defaultPlatformOptions;
    }
    return [
      { id: 'opt-1', label: 'Facebook', color: 'indigo' },
      { id: 'opt-2', label: 'YouTube', color: 'rose' },
      { id: 'opt-3', label: 'TikTok', color: 'slate' },
      { id: 'opt-4', label: 'Instagram', color: 'pink' }
    ];
  }, [fieldId, customConfigs, options, fieldName, defaultPlatformOptions]);

  const selectedOpt = resolvedOptions.find(o => o.label === value || o.id === value);
  const selectedColorMeta = selectedOpt ? getColorOption(selectedOpt.color) : null;
  const platformColor = value ? PLATFORM_BADGE_COLORS[value.toLowerCase().trim()] : null;

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
        <span>— {locale === 'vi' ? 'Để trống (—)' : 'Clear selection (—)'}</span>
      </button>
      {resolvedOptions.map((opt) => {
        const colorMeta = getColorOption(opt.color);
        const pColor = PLATFORM_BADGE_COLORS[opt.label.toLowerCase().trim()];
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
              style={{ backgroundColor: pColor ? pColor.bg : colorMeta.hex }} 
            />
            <span className="truncate flex-1">{opt.label}</span>
            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-flex items-center">
      {value ? (
        <button 
          type="button" 
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs transition-all hover:brightness-110 active:scale-95 cursor-pointer select-none"
          style={platformColor ? {
            backgroundColor: platformColor.bg,
            color: platformColor.text
          } : selectedColorMeta ? {
            backgroundColor: `${selectedColorMeta.hex}`,
            color: '#ffffff'
          } : {
            backgroundColor: '#4f46e5',
            color: '#ffffff'
          }}
          title={value}
        >
          <span className="truncate max-w-[130px]">{value}</span>
          <ChevronDown className={`w-3 h-3 text-white/90 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button 
          type="button" 
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer select-none font-medium"
          title={locale === 'vi' ? 'Chọn giá trị' : 'Select value'}
        >
          <span>{placeholder || '—'}</span>
          <ChevronDown className={`w-3 h-3 opacity-40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
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
// ── Bulk Status Select ──
export function BulkStatusSelect({ onChange }: { onChange: (v: TaskStatus) => void }) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { coords, openUpward } = useDropdownPosition(open, ref, 190, 180);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusOptions: Array<{ id: TaskStatus; label: string; config: typeof STANDARD_STATUS_META[TaskStatus] }> = [
    { id: 'todo', label: locale === 'vi' ? 'Cần làm' : 'To Do', config: STANDARD_STATUS_META.todo },
    { id: 'inprogress', label: locale === 'vi' ? 'Đang thực hiện' : 'In Progress', config: STANDARD_STATUS_META.inprogress },
    { id: 'review', label: locale === 'vi' ? 'Chờ duyệt' : 'In Review', config: STANDARD_STATUS_META.review },
    { id: 'completed', label: locale === 'vi' ? 'Hoàn thành' : 'Done', config: STANDARD_STATUS_META.completed },
  ];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }} 
      transition={{ duration: 0.12 }}
      className="p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/15 w-48"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center gap-1.5">
        <CircleDot className="w-3 h-3 text-slate-400" />
        <span>{locale === 'vi' ? 'Đổi trạng thái thành' : 'Change status to'}</span>
      </div>
      {statusOptions.map(s => (
        <button key={s.id} type="button" onClick={() => { onChange(s.id); setOpen(false); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-semibold rounded-xl cursor-pointer transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          {renderStatusIcon(s.id, 'w-3.5 h-3.5')}
          <span className="flex-1">{s.label}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 cursor-pointer select-none transition-colors active:scale-95">
        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
        <span>{locale === 'vi' ? 'Trạng thái' : 'Status'}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
  const { coords, openUpward } = useDropdownPosition(open, ref, 210, 180);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const priorityOptions: Array<{ id: Priority; label: string; config: typeof STANDARD_PRIORITY_META[Priority] }> = [
    { id: 'urgent', label: locale === 'vi' ? 'Khẩn cấp' : 'Urgent', config: STANDARD_PRIORITY_META.urgent },
    { id: 'high', label: locale === 'vi' ? 'Cao' : 'High', config: STANDARD_PRIORITY_META.high },
    { id: 'medium', label: locale === 'vi' ? 'Bình thường' : 'Normal', config: STANDARD_PRIORITY_META.medium },
    { id: 'low', label: locale === 'vi' ? 'Thấp' : 'Low', config: STANDARD_PRIORITY_META.low },
  ];

  const dropdownContent = (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }} 
      transition={{ duration: 0.12 }}
      className="p-1.5 bg-white dark:bg-[#0a0b10] border border-slate-200/90 dark:border-white/10 rounded-xl shadow-xl w-48"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-white/10 mb-1 flex items-center gap-1.5">
        <Flag className="w-3 h-3 text-slate-400" />
        <span>{locale === 'vi' ? 'Đổi mức ưu tiên thành' : 'Change priority to'}</span>
      </div>
      <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.06]">
        <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>{locale === 'vi' ? 'Không có (Trống)' : 'None (Empty)'}</span>
      </button>
      {priorityOptions.map(p => (
        <button key={p.id} type="button" onClick={() => { onChange(p.id); setOpen(false); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06]">
          <Flag className={`w-3.5 h-3.5 shrink-0 ${p.config.iconClass}`} />
          <span>{p.label}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 cursor-pointer select-none transition-colors active:scale-95">
        <Flag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span>{locale === 'vi' ? 'Ưu tiên' : 'Priority'}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
      className="p-1 bg-white dark:bg-[#0a0b10] border border-slate-200/80 dark:border-white/10 rounded-xl shadow-xl w-56 max-h-56 overflow-y-auto custom-scrollbar"
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(coords ? (openUpward ? { bottom: window.innerHeight - coords.top + 6, left: coords.safeLeft } : { top: coords.bottom + 6, left: coords.safeLeft }) : {})
      }}
    >
      <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-white/10 mb-1">
        Giao công việc cho
      </div>
      <button type="button" onClick={() => { onChange(null); setOpen(false); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-500 cursor-pointer">
        <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px]">—</span>
        <span>Bỏ giao tất cả</span>
      </button>
      {members.map(m => (
        <button key={m.id} type="button" onClick={() => { onChange(m.id); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg cursor-pointer transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06]">
          <SignedImage filePath={m.avatar} className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" alt={m.name} />
          <span className="truncate">{m.name}</span>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/10 cursor-pointer select-none transition-colors active:scale-95">
        {renderSpaceIcon('User', 'w-3.5 h-3.5 text-slate-400 dark:text-slate-500')}
        <span>{locale === 'vi' ? 'Người phụ trách' : 'Assignee'}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
