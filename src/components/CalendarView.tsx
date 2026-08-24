"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Priority, TaskStatus, Space } from '../types';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  RefreshCw, CheckCircle2, Sparkles, Check, Plus, X,
  Search, Filter, Info, Trash2, ArrowRight, UserCheck, Users,
  ListPlus, Settings, CalendarDays, Eye, Edit3, Tag, GripVertical, ChevronDown,
  Download, Bot, Zap, CheckSquare, Layers, CircleDot, Flag, Brain, Globe, HelpCircle,
  FileText, AlignLeft, Palette
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../contexts/TranslationContext';
import {
  GOOGLE_ACCESS_TOKEN_KEY,
  GOOGLE_DISCONNECTED_KEY,
  GOOGLE_REFRESH_TOKEN_KEY,
  GoogleCalendarError,
  type GoogleCalendarEvent,
  type GoogleCalendarEventInput,
  googleCalendarService,
} from '../services/googleCalendar';

interface CalendarViewProps {
  tasks: Task[];
  members: User[];
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  spaces?: Space[];
  activeSpaceId?: string | null;
  activeListId?: string | null;
}

const GOOGLE_COLOR_IDS: Record<string, string> = {
  '#2563EB': '9',
  '#10b981': '2',
  '#ef4444': '11',
  '#f59e0b': '5',
};

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
}

function eventDateKey(event: GoogleCalendarEvent) {
  if (event.start.date) return event.start.date;
  return event.start.dateTime ? formatLocalDate(new Date(event.start.dateTime)) : '';
}

function eventTime(event: GoogleCalendarEvent, edge: 'start' | 'end') {
  const value = event[edge].dateTime;
  if (!value) return edge === 'start' ? '09:00' : '10:00';
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function eventInput(event: GoogleCalendarEvent): GoogleCalendarEventInput {
  return {
    summary: event.summary.trim(),
    description: event.description || '',
    start: event.start,
    end: event.end,
    ...(event.colorId ? { colorId: event.colorId } : {}),
  };
}

function rescheduleGoogleEvent(event: GoogleCalendarEvent, date: string, hour?: number): GoogleCalendarEventInput {
  if (event.start.date) {
    const originalStart = new Date(`${event.start.date}T00:00:00`);
    const originalEnd = new Date(`${event.end.date || event.start.date}T00:00:00`);
    const durationDays = Math.max(1, Math.round((originalEnd.getTime() - originalStart.getTime()) / 86_400_000));
    const nextEnd = new Date(`${date}T00:00:00`);
    nextEnd.setDate(nextEnd.getDate() + durationDays);
    return {
      ...eventInput(event),
      start: { date },
      end: { date: formatLocalDate(nextEnd) },
    };
  }

  const originalStart = new Date(event.start.dateTime || '');
  const originalEnd = new Date(event.end.dateTime || '');
  const duration = Math.max(60_000, originalEnd.getTime() - originalStart.getTime());
  const nextStart = new Date(localDateTime(
    date,
    hour === undefined
      ? eventTime(event, 'start')
      : `${String(hour).padStart(2, '0')}:00`,
  ));
  const nextEnd = new Date(nextStart.getTime() + duration);
  return {
    ...eventInput(event),
    start: { dateTime: nextStart.toISOString(), timeZone: event.start.timeZone },
    end: { dateTime: nextEnd.toISOString(), timeZone: event.end.timeZone },
  };
}

// Vietnam Holidays Map for 2026
const VIETNAMESE_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Tết Dương lịch',
  '2026-02-16': '30 Tết Nguyên Đán',
  '2026-02-17': 'Mùng 1 Tết Nguyên Đán',
  '2026-02-18': 'Mùng 2 Tết Nguyên Đán',
  '2026-02-19': 'Mùng 3 Tết Nguyên Đán',
  '2026-04-26': 'Giỗ Tổ Hùng Vương',
  '2026-04-30': 'Ngày Chiến thắng (30/4)',
  '2026-05-01': 'Quốc tế Lao động (1/5)',
  '2026-09-02': 'Quốc Khánh VN',
  '2026-09-25': 'Tết Trung Thu',
  '2026-12-25': 'Lễ Giáng sinh'
};

// Mini Calendar Navigator Subcomponent for Left Sidebar
function MiniCalendarNavigator({ 
  selectedDate, 
  onSelectDate 
}: { 
  selectedDate: Date; 
  onSelectDate: (d: Date) => void; 
}) {
  const [navDate, setNavDate] = useState<Date>(new Date(selectedDate));

  useEffect(() => {
    setNavDate(new Date(selectedDate));
  }, [selectedDate]);

  const year = navDate.getFullYear();
  const month = navDate.getMonth();

  const days = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const padCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const result: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = padCount - 1; i >= 0; i--) {
      result.push({ date: new Date(year, month - 1, prevMonthLastDate - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDate; i++) {
      result.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const totalCells = Math.ceil(result.length / 7) * 7;
    const targetTotal = totalCells < 35 ? 35 : totalCells;
    const remaining = targetTotal - result.length;
    for (let i = 1; i <= remaining; i++) {
      result.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return result;
  }, [year, month]);

  const monthNames = [
    'THÁNG 1', 'THÁNG 2', 'THÁNG 3', 'THÁNG 4', 'THÁNG 5', 'THÁNG 6',
    'THÁNG 7', 'THÁNG 8', 'THÁNG 9', 'THÁNG 10', 'THÁNG 11', 'THÁNG 12'
  ];

  const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = formatDateStr(new Date());
  const selectedStr = formatDateStr(selectedDate);

  return (
    <div className="select-none p-4 font-sans">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-800 dark:text-white">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1 text-slate-400">
          <button 
            type="button" 
            onClick={() => setNavDate(new Date(year, month - 1, 1))}
            className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => setNavDate(new Date(year, month + 1, 1))}
            className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days Grid Header */}
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Mini Days Cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((item, idx) => {
          const dStr = formatDateStr(item.date);
          const isSelected = dStr === selectedStr;
          const isToday = dStr === todayStr;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(item.date)}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full font-sans text-[10.5px] transition ${
                isSelected && isToday
                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30 ring-2 ring-blue-200 dark:ring-blue-900'
                  : isToday
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : isSelected
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold ring-1 ring-blue-200 dark:ring-blue-800'
                  : item.isCurrentMonth
                  ? 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  : 'font-normal text-slate-300 hover:bg-slate-50 dark:text-slate-700 dark:hover:bg-slate-900'
              }`}
            >
              {item.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({
  tasks,
  members,
  isOffline,
  onAddSyncLog,
  triggerToast,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  spaces = [],
  activeSpaceId = null,
  activeListId = null
}: CalendarViewProps) {
  const { t, locale } = useTranslation();
  
  // Auth state to identify "Me"
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | '4day' | 'day' | 'schedule'>('month');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter States
  const [isMeMode, setIsMeMode] = useState<boolean>(false);
  const [showTasks, setShowTasks] = useState<boolean>(true);
  const [showGcal, setShowGcal] = useState<boolean>(true);
  const [showHolidays, setShowHolidays] = useState<boolean>(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDragOverDate, setActiveDragOverDate] = useState<string | null>(null);
  const [activeDragOverHour, setActiveDragOverHour] = useState<number | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [clickedDate, setClickedDate] = useState<string>('');
  const [clickedHour, setClickedHour] = useState<number>(9);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickDesc, setQuickDesc] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');
  const [quickAssigneeId, setQuickAssigneeId] = useState<string>('');
  const [quickSpaceId, setQuickSpaceId] = useState<string>(activeSpaceId || (spaces && spaces[0]?.id) || '');
  const [quickListId, setQuickListId] = useState<string>(activeListId || '');
  const [quickStartTime, setQuickStartTime] = useState<string>('09:00');
  const [quickEndTime, setQuickEndTime] = useState<string>('10:00');
  const [quickEventColor, setQuickEventColor] = useState<string>('#2563EB');
  const [createType, setCreateType] = useState<'task' | 'event'>('task');

  // Sidebar expanded state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    if (window.innerWidth < 640) setViewMode('day');
  }, []);

  // Google Calendar connection state
  const [gcalConnected, setGcalConnected] = useState<boolean>(false);
  const [gcalUserEmail, setGcalUserEmail] = useState<string>('');
  const [syncingGcal, setSyncingGcal] = useState<boolean>(false);
  const [savingGcal, setSavingGcal] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  
  // Current time for red indicator line
  const [now, setNow] = useState<Date>(new Date());

  // Only events confirmed by Google are kept in memory. Local fake/stale event
  // persistence is intentionally avoided so CalendarView cannot invent writes.
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);

  // Google Calendar Live Sync & OAuth integration
  const fetchLiveGoogleEvents = useCallback(async (userEmail?: string) => {
    try {
      setSyncingGcal(true);
      setSyncProgress(20);
      setSyncLogs(['Đang khởi tạo kết nối Google API...']);

      setSyncProgress(60);
      const items = await googleCalendarService.fetchEvents();
      setSyncProgress(90);

      setGcalEvents(items);
      setGcalConnected(true);
      if (userEmail) setGcalUserEmail(userEmail);
      setSyncProgress(100);
      setSyncLogs(prev => [...prev, `Đã đồng bộ thành công ${items.length} sự kiện!`]);
      triggerToast?.('success', 'Kết nối thành công 🟢', `Đã nhận ${items.length} sự kiện từ Google Calendar.`);
    } catch (err: any) {
      console.error('[Google Calendar Sync Error]', err);
      if (err instanceof GoogleCalendarError && err.reconnectRequired) {
        setGcalConnected(false);
      }
      triggerToast?.('error', 'Lỗi đồng bộ Google Calendar', err.message || 'Không thể lấy dữ liệu.');
    } finally {
      setSyncingGcal(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    let mounted = true;
    const syncSession = (session: any) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUser(session.user);
        if (session.user.email) setGcalUserEmail(session.user.email);
      }

      const disconnected = localStorage.getItem(GOOGLE_DISCONNECTED_KEY) === '1';
      if (!disconnected) {
        googleCalendarService.persistProviderTokens(session);
      }
      const hasProviderCredentials = !disconnected && Boolean(
        session?.provider_token
        || session?.provider_refresh_token
        || localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY)
        || localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY),
      );
      if (hasProviderCredentials) {
        void fetchLiveGoogleEvents(session?.user?.email);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => syncSession(session), 0);
    });

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(timer);
    };
  }, [fetchLiveGoogleEvents]);

  // Sync Log helper
  const addLocalSyncLog = (action: string) => {
    onAddSyncLog(action);
  };

  const [isAiScheduling, setIsAiScheduling] = useState(false);

  // Export Calendar events as .ics file (iCal format)
  const handleExportICS = () => {
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Apexa Productivity Hub//Calendar//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    tasks.forEach(t => {
      if (t.dueDate) {
        const cleanDate = t.dueDate.replace(/-/g, '');
        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:task-${t.id}@apexa.app`);
        icsLines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        icsLines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
        icsLines.push(`SUMMARY:${t.title}`);
        icsLines.push(`DESCRIPTION:${(t.description || '').replace(/\n/g, ' ')}`);
        icsLines.push('END:VEVENT');
      }
    });

    icsLines.push('END:VCALENDAR');
    const icsContent = icsLines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-events-${Date.now()}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', 'Xuất file Lịch 📅', 'Đã tải xuống tập tin calendar-events.ics thành công.');
  };

  // AI Intelligent Auto-Scheduler
  const handleAiAutoSchedule = () => {
    const unscheduled = tasks.filter(t => !t.dueDate && t.status !== 'completed');
    if (unscheduled.length === 0) {
      triggerToast?.('info', 'Xếp lịch AI 🧠', 'Tất cả công việc đã được lên lịch!');
      return;
    }

    setIsAiScheduling(true);
    setTimeout(() => {
      const today = new Date(currentDate);
      unscheduled.forEach((task, idx) => {
        const dateOffset = idx % 5;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dateOffset);
        const dateStr = targetDate.toISOString().split('T')[0];
        
        if (onUpdateTask) {
          onUpdateTask({
            ...task,
            dueDate: dateStr,
            startDate: dateStr,
            custom_fields: {
              ...(task.custom_fields || {}),
              scheduledHour: 9 + (idx % 8)
            }
          });
        }
      });

      setIsAiScheduling(false);
      triggerToast?.('success', 'AI đã tự động xếp lịch 🧠⚡', `Đã phân bổ thời gian cho ${unscheduled.length} công việc chưa có ngày.`);
    }, 1200);
  };

  // Google Calendar OAuth connection
  const handleConnectGcal = async () => {
    if (gcalConnected) {
      setGcalConnected(false);
      setGcalUserEmail('');
      setGcalEvents([]);
      setSelectedTask((previous: any) => previous?.isGoogleEvent ? null : previous);
      localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
      localStorage.setItem(GOOGLE_DISCONNECTED_KEY, '1');
      triggerToast?.('info', 'Đã ngắt kết nối Google Calendar', 'Tài khoản đã được gỡ khỏi bộ lịch.');
      return;
    }

    setSyncingGcal(true);
    setSyncProgress(10);
    setSyncLogs(['Đang kết nối tới cổng xác thực Google OAuth 2.0...']);

    try {
      localStorage.removeItem(GOOGLE_DISCONNECTED_KEY);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
          },
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined,
        },
      });

      if (error) {
        throw error;
      }
    } catch (e: any) {
      setSyncingGcal(false);
      setSyncProgress(0);
      setSyncLogs(prev => [...prev, `Không thể kết nối: ${e?.message || 'Lỗi không xác định'}`]);
      triggerToast?.('error', 'Không thể kết nối Google Calendar', e?.message || 'Vui lòng kiểm tra cấu hình OAuth và thử lại.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, kind: 'task' | 'google-event' = 'task') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: itemId, kind }));
    setDraggedTaskId(itemId);
    if ((window as any).playSystemSound) (window as any).playSystemSound('click');
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDragOverDate(null);
    setActiveDragOverHour(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    if (activeDragOverDate !== dateStr) {
      setActiveDragOverDate(dateStr);
    }
    if (hour !== undefined && activeDragOverHour !== hour) {
      setActiveDragOverHour(hour);
    }
  };

  const handleDragLeave = () => {
    setActiveDragOverDate(null);
    setActiveDragOverHour(null);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    const rawPayload = e.dataTransfer.getData('text/plain');
    let itemId = draggedTaskId;
    let kind: 'task' | 'google-event' = 'task';
    try {
      const parsed = JSON.parse(rawPayload);
      itemId = parsed.id || itemId;
      kind = parsed.kind === 'google-event' ? 'google-event' : 'task';
    } catch {
      itemId = rawPayload || itemId;
    }
    setActiveDragOverDate(null);
    setActiveDragOverHour(null);
    setDraggedTaskId(null);

    if (!itemId) return;

    if (kind === 'google-event') {
      const googleEvent = gcalEvents.find(event => event.id === itemId);
      if (!googleEvent) return;
      setSavingGcal(true);
      try {
        const updated = await googleCalendarService.updateEvent(
          googleEvent.id,
          rescheduleGoogleEvent(googleEvent, dateStr, hour),
        );
        setGcalEvents(previous => previous.map(event => event.id === updated.id ? updated : event));
        setSelectedTask((previous: any) => previous?.id === updated.id ? updated : previous);
        addLocalSyncLog(`Rescheduled Google event "${googleEvent.summary}" to ${dateStr}`);
        triggerToast?.('success', 'Đã đổi lịch Google', `Đã chuyển "${googleEvent.summary}" sang ${dateStr}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể đổi lịch sự kiện.';
        triggerToast?.('error', 'Không thể đổi lịch Google', message);
      } finally {
        setSavingGcal(false);
      }
      return;
    }

    const findTask = tasks.find(t => t.id === itemId);
    if (findTask && onUpdateTask) {
      const scheduledHour = hour !== undefined ? hour : 9;
      const updatedTask: Task = { 
        ...findTask, 
        dueDate: dateStr,
        startDate: dateStr,
        custom_fields: {
          ...(findTask.custom_fields || {}),
          scheduledHour
        }
      };
      onUpdateTask(updatedTask);
      if ((window as any).playSystemSound) (window as any).playSystemSound('success');
      addLocalSyncLog(`Rescheduled task "${findTask.title}" to ${dateStr} at ${scheduledHour}:00`);
      triggerToast?.('success', 'Đã xếp lịch ⏱', `Đã chuyển "${findTask.title}" sang ngày ${dateStr} lúc ${scheduledHour}:00.`);
    }
  };

  // Cell click Quick Add
  const handleGridCellClick = (dateStr: string, hour: number = 9) => {
    setClickedDate(dateStr);
    setClickedHour(hour);
    setQuickTitle('');
    setQuickDesc('');
    const initialSpace = (spaces && spaces.find(s => s.id === activeSpaceId)) || (spaces && spaces[0]) || null;
    setQuickSpaceId(initialSpace?.id || '');
    setQuickListId(activeListId || initialSpace?.lists?.[0]?.id || '');
    setQuickStartTime(`${String(hour).padStart(2, '0')}:00`);
    setQuickEndTime(`${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`);
    setShowAddModal(true);
  };

  const handleCreateQuickItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    if (createType === 'task') {
      const targetSpace = (spaces && spaces.find(s => s.id === quickSpaceId)) || (spaces && spaces[0]) || null;
      const targetListId = quickListId || targetSpace?.lists?.[0]?.id || undefined;

      onAddTask({
        title: quickTitle,
        description: quickDesc,
        priority: quickPriority,
        status: 'todo',
        assigneeId: quickAssigneeId || undefined,
        dueDate: clickedDate,
        startDate: clickedDate,
        spaceId: quickSpaceId || targetSpace?.id || undefined,
        listId: targetListId,
        tags: [],
        isPinned: false,
        subtasks: [],
        custom_fields: {
          scheduledHour: clickedHour
        }
      });
      triggerToast?.('success', 'Tạo công việc thành công', `Đã thêm công việc "${quickTitle}".`);
    } else {
      if (!gcalConnected) {
        triggerToast?.('error', 'Google Calendar chưa kết nối', 'Hãy kết nối Google Calendar trước khi tạo sự kiện.');
        return;
      }
      const start = new Date(localDateTime(clickedDate, quickStartTime));
      const end = new Date(localDateTime(clickedDate, quickEndTime));
      if (end <= start) {
        triggerToast?.('error', 'Thời gian không hợp lệ', 'Giờ kết thúc phải sau giờ bắt đầu.');
        return;
      }

      setSavingGcal(true);
      try {
        const created = await googleCalendarService.createEvent({
          summary: quickTitle.trim(),
          description: quickDesc,
          start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          colorId: GOOGLE_COLOR_IDS[quickEventColor],
        });
        setGcalEvents(previous => [...previous.filter(event => event.id !== created.id), created]);
        addLocalSyncLog(`Created Google event "${created.summary}"`);
        triggerToast?.('success', 'Đã tạo trên Google Calendar', `Sự kiện "${created.summary}" đã được đồng bộ.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể tạo sự kiện.';
        triggerToast?.('error', 'Không thể tạo sự kiện Google', message);
        return;
      } finally {
        setSavingGcal(false);
      }
    }

    setShowAddModal(false);
  };

  const handleModalUpdateField = (field: keyof Task, value: any) => {
    if (!selectedTask || !onUpdateTask) return;
    const updatedTask = { ...selectedTask, [field]: value };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
    triggerToast?.('success', 'Đã cập nhật', `Đã lưu thay đổi trường ${String(field)}.`);
  };

  const updateGoogleDraft = (updates: Partial<GoogleCalendarEvent>) => {
    setSelectedTask((previous: any) => previous?.isGoogleEvent ? { ...previous, ...updates } : previous);
  };

  const updateGoogleDraftDate = (date: string) => {
    if (!(selectedTask as any)?.isGoogleEvent) return;
    const event = selectedTask as any as GoogleCalendarEvent;
    updateGoogleDraft(rescheduleGoogleEvent(event, date) as Partial<GoogleCalendarEvent>);
  };

  const updateGoogleDraftTime = (edge: 'start' | 'end', time: string) => {
    if (!(selectedTask as any)?.isGoogleEvent) return;
    const event = selectedTask as any as GoogleCalendarEvent;
    updateGoogleDraft({
      [edge]: {
        dateTime: localDateTime(eventDateKey(event), time),
        timeZone: event[edge].timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  };

  const handleSaveGoogleEvent = async () => {
    if (!(selectedTask as any)?.isGoogleEvent) return;
    const event = selectedTask as any as GoogleCalendarEvent;
    if (!event.summary.trim()) {
      triggerToast?.('error', 'Thiếu tiêu đề', 'Sự kiện Google cần có tiêu đề.');
      return;
    }
    if (event.start.dateTime && event.end.dateTime && new Date(event.end.dateTime) <= new Date(event.start.dateTime)) {
      triggerToast?.('error', 'Thời gian không hợp lệ', 'Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    setSavingGcal(true);
    try {
      const updated = await googleCalendarService.updateEvent(event.id, eventInput(event));
      setGcalEvents(previous => previous.map(item => item.id === updated.id ? updated : item));
      setSelectedTask(updated as any);
      addLocalSyncLog(`Updated Google event "${updated.summary}"`);
      triggerToast?.('success', 'Đã lưu Google Calendar', `Sự kiện "${updated.summary}" đã được cập nhật.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể cập nhật sự kiện.';
      triggerToast?.('error', 'Không thể lưu sự kiện Google', message);
    } finally {
      setSavingGcal(false);
    }
  };

  const handleDeleteGoogleEvent = async () => {
    if (!(selectedTask as any)?.isGoogleEvent) return;
    const event = selectedTask as any as GoogleCalendarEvent;
    if (!window.confirm(`Xóa sự kiện "${event.summary}" khỏi Google Calendar?`)) return;

    setSavingGcal(true);
    try {
      await googleCalendarService.deleteEvent(event.id);
      setGcalEvents(previous => previous.filter(item => item.id !== event.id));
      setSelectedTask(null);
      addLocalSyncLog(`Deleted Google event "${event.summary}"`);
      triggerToast?.('success', 'Đã xóa khỏi Google Calendar', `Sự kiện "${event.summary}" đã được xóa.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xóa sự kiện.';
      triggerToast?.('error', 'Không thể xóa sự kiện Google', message);
    } finally {
      setSavingGcal(false);
    }
  };

  // Date helper methods
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const padCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align Mon-Sun

    for (let i = padCount - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDate - i),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const totalCells = Math.ceil(days.length / 7) * 7;
    const targetTotal = totalCells < 35 ? 35 : totalCells;
    const remaining = targetTotal - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getDaysInWeek = (date: Date) => {
    const currentDay = date.getDay();
    const distanceToMon = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - distanceToMon);
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const getDays4Day = (date: Date) => {
    const days: Date[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Nav actions
  const handlePrev = () => {
    const newD = new Date(currentDate);
    if (viewMode === 'month') newD.setMonth(newD.getMonth() - 1);
    else if (viewMode === 'week') newD.setDate(newD.getDate() - 7);
    else if (viewMode === '4day') newD.setDate(newD.getDate() - 4);
    else if (viewMode === 'day') newD.setDate(newD.getDate() - 1);
    else newD.setDate(newD.getDate() - 14);
    setCurrentDate(newD);
  };

  const handleNext = () => {
    const newD = new Date(currentDate);
    if (viewMode === 'month') newD.setMonth(newD.getMonth() + 1);
    else if (viewMode === 'week') newD.setDate(newD.getDate() + 7);
    else if (viewMode === '4day') newD.setDate(newD.getDate() + 4);
    else if (viewMode === 'day') newD.setDate(newD.getDate() + 1);
    else newD.setDate(newD.getDate() + 14);
    setCurrentDate(newD);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter helpers
  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const daysInWeek = useMemo(() => getDaysInWeek(currentDate), [currentDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (isMeMode && currentUser && t.assigneeId !== currentUser.id) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query);
      }
      return true;
    });
  }, [tasks, isMeMode, currentUser, priorityFilter, searchQuery]);

  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter(t => !t.dueDate && t.status !== 'completed');
  }, [filteredTasks]);

  const getFilteredTasksForDate = (dateStr: string) => {
    if (!showTasks) return [];
    return filteredTasks.filter(t => t.dueDate === dateStr);
  };

  const getFilteredEventsForDate = (dateStr: string) => {
    if (!showGcal) return [];
    return gcalEvents.filter(event => eventDateKey(event) === dateStr);
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500', border: 'border-rose-100 dark:border-rose-800/60' };
      case 'high': return { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', border: 'border-orange-100 dark:border-orange-800/60' };
      case 'medium': return { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', border: 'border-indigo-100 dark:border-indigo-800/60' };
      default: return { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', border: 'border-slate-100 dark:border-slate-800' };
    }
  };

  const getPriorityLabel = (priority: Priority) => ({
    urgent: 'Khẩn cấp',
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }[priority]);

  return (
    <div className="relative flex h-full w-full flex-row select-none overflow-hidden bg-slate-50 font-sans text-slate-800 dark:bg-[#07090e] dark:text-slate-100">
      
      {/* Collapsible Left Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '17rem', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="absolute inset-y-0 left-0 z-30 flex w-[17rem] shrink-0 flex-col divide-y divide-slate-100 overflow-y-auto border-r border-slate-200/90 bg-white/98 text-left shadow-2xl backdrop-blur-xl dark:divide-slate-800/80 dark:border-slate-800 dark:bg-[#0a0c11]/98 lg:relative lg:z-auto lg:shadow-none"
          >
            {/* Mini Calendar Navigator */}
            <MiniCalendarNavigator 
              selectedDate={currentDate}
              onSelectDate={(d) => setCurrentDate(d)}
            />

            {/* Google Calendar Connection Card */}
            <div className="relative space-y-2.5 overflow-hidden p-4">
              
              <h4 className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>KẾT NỐI LỊCH</span>
              </h4>
               
              {gcalConnected ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-extrabold text-blue-600 shadow-sm dark:bg-slate-900">G</div>
                    <div className="min-w-0">
                      <span className="block truncate text-[11px] font-bold text-slate-800 dark:text-slate-200">{gcalUserEmail}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[8px] font-bold uppercase text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Đã kết nối</span>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectGcal}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-[10px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-rose-400"
                  >
                    Ngắt kết nối Google Calendar
                  </button>
                </div>
              ) : syncingGcal ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-slate-500 dark:text-slate-400 animate-pulse">Đang đồng bộ...</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${syncProgress}%` }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>
                  <div className="bg-slate-900 dark:bg-slate-950 p-2.5 rounded-2xl font-mono text-[8px] text-slate-300 dark:text-slate-400 leading-normal max-h-24 overflow-y-auto space-y-1 scrollbar-none">
                    {syncLogs.map((log, i) => (
                      <div key={i} className="truncate">{log}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleConnectGcal}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Đồng bộ Google Calendar</span>
                </button>
              )}
            </div>

            {/* Filter Toggle Pills */}
            <div className="space-y-3 p-4">
              <h4 className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>BỘ LỌC HIỂN THỊ</span>
              </h4>
              
              <div className="space-y-2">
                {[
                  { id: 'showTasks', label: 'Công việc', count: tasks.length, color: 'indigo', state: showTasks, setter: setShowTasks },
                  { id: 'showGcal', label: 'Google Calendar', count: gcalEvents.length, color: 'emerald', state: showGcal, setter: setShowGcal },
                  { id: 'showHolidays', label: 'Ngày lễ', count: null, color: 'rose', state: showHolidays, setter: setShowHolidays }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.setter(!item.state)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      item.state
                        ? 'border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        : 'border-transparent bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white dark:bg-slate-900/50 dark:text-slate-500 dark:hover:border-slate-800 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${
                        item.state
                          ? item.color === 'indigo' ? 'bg-indigo-500' : item.color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`} />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== null && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        item.state ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-white text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Priority Filter */}
              <div className="space-y-1.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Mức ưu tiên</label>
                <select 
                  value={priorityFilter} 
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="all">Tất cả mức ưu tiên</option>
                  <option value="urgent">Khẩn cấp</option>
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>
            </div>

            {/* Unscheduled Tasks Card */}
            <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                <ListPlus className="w-3.5 h-3.5" />
                <span>CHƯA XẾP LỊCH ({unscheduledTasks.length})</span>
              </h4>
              
              <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin lg:max-h-[calc(100vh-450px)] max-h-64">
                {unscheduledTasks.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-1.5">
                    <Check className="w-5 h-5 mx-auto text-emerald-500 stroke-[3px]" />
                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">Tuyệt vời!</p>
                    <p className="text-[9px]">Tất cả công việc đã được lên lịch.</p>
                  </div>
                ) : (
                  unscheduledTasks.map(t => {
                    const style = getPriorityStyle(t.priority);
                    return (
                      <motion.div 
                        key={t.id}
                        draggable
                        onDragStart={e => handleDragStart(e as any, t.id)}
                        onDragEnd={handleDragEnd}
                        whileHover={{ scale: 1.02, x: 2 }}
                        className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2.5 transition hover:border-blue-200 hover:bg-blue-50/30 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-350 dark:text-slate-650 shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{t.title}</span>
                            <span className={`text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${style.bg} ${style.text} ${style.border}`}>
                              {getPriorityLabel(t.priority)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
              
              <p className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-slate-50 py-2 text-center text-[9px] font-medium text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
                💡 Kéo thả công việc để xếp lịch
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <button
          aria-label="Đóng bộ lọc lịch"
          onClick={() => setIsSidebarOpen(false)}
          className="absolute inset-0 z-20 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-3 z-40 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-blue-300 lg:static lg:h-10 lg:w-5 lg:self-center lg:rounded-l-none lg:rounded-r-xl lg:border-l-0 ${isSidebarOpen ? 'left-[15.9rem]' : 'left-3'}`}
        title={isSidebarOpen ? "Đóng bộ lọc lịch" : "Mở bộ lọc lịch"}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Main Calendar Views */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-50/70 p-2.5 sm:p-4 dark:bg-[#07090e]">

        {/* Calendar Navigation Header */}
        <header className="z-20 shrink-0 rounded-2xl border border-slate-200/80 bg-white/95 py-3 pl-12 pr-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-[#0b0d13]/95 sm:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="truncate text-lg font-extrabold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-xl">
                    {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                    {viewMode === 'week' && `Tuần ${Math.ceil(currentDate.getDate() / 7)}, ${monthNames[currentDate.getMonth()]}`}
                    {viewMode === '4day' && `4 ngày tiếp theo`}
                    {viewMode === 'day' && `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                    {viewMode === 'schedule' && `Lịch trình chi tiết`}
                  </h2>
                  {gcalConnected ? (
                    <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Đồng bộ trực tiếp
                    </span>
                  ) : (
                    <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Chưa kết nối Google
                    </span>
                  )}
                </div>
                <p className="mt-0.5 hidden text-[11px] font-medium text-slate-400 sm:block">
                  {filteredTasks.length} công việc · {gcalEvents.length} sự kiện Google
                </p>
              </div>

              <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/80">
                <button aria-label="Kỳ trước" onClick={handlePrev} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:hover:bg-slate-800 dark:hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={handleToday} className="h-7 rounded-lg px-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-700 transition hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800">Hôm nay</button>
                <button aria-label="Kỳ tiếp theo" onClick={handleNext} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:hover:bg-slate-800 dark:hover:text-white"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <label className="relative min-w-[180px] flex-1 xl:w-56 xl:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  aria-label="Tìm công việc"
                  placeholder="Tìm công việc..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:focus:bg-slate-900"
                />
              </label>

              <button
                onClick={handleAiAutoSchedule}
                disabled={isAiScheduling}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
                title="Tự động xếp lịch công việc bằng AI"
              >
                <Sparkles className={`h-4 w-4 ${isAiScheduling ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isAiScheduling ? 'Đang xếp…' : 'Xếp lịch AI'}</span>
              </button>

              <button
                onClick={handleExportICS}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                title="Xuất tập tin Lịch (.ics)"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                onClick={() => { setCreateType('task'); handleGridCellClick(formatDateString(currentDate)); }}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Tạo mới
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-fit items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                onClick={() => setIsMeMode(true)}
                className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition ${isMeMode ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <UserCheck className="h-3.5 w-3.5" /> Của tôi
              </button>
              <button
                onClick={() => setIsMeMode(false)}
                className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition ${!isMeMode ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Users className="h-3.5 w-3.5" /> Đội ngũ
              </button>
            </div>

            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {[
                { id: 'month', label: 'Tháng' },
                { id: 'week', label: 'Tuần' },
                { id: '4day', label: '4 ngày' },
                { id: 'day', label: 'Ngày' },
                { id: 'schedule', label: 'Lịch biểu' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id as any)}
                  className="relative h-7 shrink-0 rounded-lg px-3 text-[10.5px] font-bold transition"
                >
                  {viewMode === m.id && (
                    <motion.div
                      layoutId="activeViewTab"
                      className="absolute inset-0 rounded-lg border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${viewMode === m.id ? 'text-slate-950 dark:text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Grid Content Area */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl">
          
          {/* A. MONTH VIEW */}
          {viewMode === 'month' && (
            <div
              className="grid h-full min-h-[600px] min-w-full md:min-w-[760px] grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-800"
              style={{ gridTemplateRows: `36px repeat(${Math.ceil(daysInMonth.length / 7)}, minmax(80px, 1fr))` }}
            >
              {['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'].map(header => (
                <div key={header} className="flex items-center justify-center bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:bg-[#0b0d13] dark:text-slate-500">
                  <span className="hidden md:inline">{header}</span>
                  <span className="md:hidden">{header.replace('THỨ ', 'T').replace('CHỦ NHẬT', 'CN')}</span>
                </div>
              ))}
              
              {daysInMonth.map((day, idx) => {
                const dateStr = formatDateString(day.date);
                const dayTasks = getFilteredTasksForDate(dateStr);
                const dayEvents = getFilteredEventsForDate(dateStr);
                const isToday = formatDateString(new Date()) === dateStr;
                const isDragOver = activeDragOverDate === dateStr;
                const holidayName = showHolidays ? VIETNAMESE_HOLIDAYS_2026[dateStr] : null;

                return (
                  <div 
                    key={idx}
                    onDragOver={e => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, dateStr)}
                    onClick={() => handleGridCellClick(dateStr)}
                    className={`group relative flex min-h-0 flex-col gap-1.5 overflow-hidden bg-white p-2 text-left transition duration-150 dark:bg-[#090b10] ${
                      day.isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : 'bg-slate-50/90 text-slate-400 dark:bg-[#06080c] dark:text-slate-600'
                    } ${isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''} ${isDragOver ? 'z-10 bg-blue-50 ring-2 ring-inset ring-blue-500/50 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'}`}
                  >
                    {/* Day Number Header */}
                    <div className="flex h-7 items-center justify-between">
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                        isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-600 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white'
                      }`}>{day.date.getDate()}</span>
                      
                      <button
                        aria-label={`Tạo mới ngày ${dateStr}`}
                        onClick={(e) => { e.stopPropagation(); handleGridCellClick(dateStr); }}
                        className="grid h-6 w-6 translate-y-0.5 place-items-center rounded-lg text-slate-400 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 group-hover:translate-y-0 group-hover:opacity-100 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Scrollable event lists in cell */}
                    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5 scrollbar-none">
                      {/* Vietnamese Holiday Pill Badge */}
                      {holidayName && (
                        <div className="flex min-h-6 items-center gap-1.5 truncate rounded-md border border-rose-100 bg-rose-50 px-2 text-[9.5px] font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                          <span className="truncate">{holidayName}</span>
                        </div>
                      )}

                      {/* Google Calendar Events */}
                      {dayEvents.map((evt, i) => (
                        <motion.div 
                          layoutId={evt.id}
                          key={evt.id || i}
                          draggable
                          onDragStart={e => handleDragStart(e as any, evt.id, 'google-event')}
                          onDragEnd={handleDragEnd}
                          onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                          whileHover={{ scale: 1.02 }}
                          className="flex min-h-6 cursor-grab items-center gap-1.5 truncate rounded-md border-l-2 px-2 text-[9.5px] font-semibold transition hover:brightness-95 active:cursor-grabbing"
                          style={{
                            backgroundColor: `${evt.color || '#2563EB'}14`,
                            borderLeftColor: evt.color || '#2563EB',
                            color: evt.color || '#2563EB',
                          }}
                        >
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{evt.summary}</span>
                        </motion.div>
                      ))}

                      {/* Apexa Tasks */}
                      {dayTasks.map(task => {
                        const style = getPriorityStyle(task.priority);
                        return (
                          <motion.div 
                            layoutId={task.id}
                            key={task.id}
                            draggable
                            onDragStart={e => handleDragStart(e as any, task.id)}
                            onDragEnd={handleDragEnd}
                            onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                            whileHover={{ scale: 1.02 }}
                            className={`flex min-h-6 cursor-grab items-center gap-1.5 truncate rounded-md border border-l-[3px] px-2 text-[9.5px] font-semibold transition active:cursor-grabbing ${
                              task.status === 'completed' 
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-600 line-through dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-800'
                            }`}
                            style={{ borderLeftColor: style.dot.includes('bg-rose-500') ? '#f43f5e' : style.dot.includes('bg-orange-500') ? '#f97316' : style.dot.includes('bg-indigo-500') ? '#2563EB' : '#94a3b8' } as any}
                          >
                            <span className="truncate">{task.title}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* B. WEEK VIEW & D. 4-DAY VIEW & C. DAY VIEW (Hourly grids) */}
          {(viewMode === 'week' || viewMode === '4day' || viewMode === 'day') && (
            <div className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#090b10] ${viewMode === 'day' ? 'min-w-0' : 'min-w-[300px] md:min-w-[650px]'}`}>
              
              {/* Header Days Row */}
              <div className={`grid ${viewMode === 'week' ? 'grid-cols-8' : viewMode === '4day' ? 'grid-cols-5' : 'grid-cols-2'} gap-px border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800`}>
                <div className="bg-slate-50 py-3 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:bg-[#0b0d13] dark:text-slate-500">Giờ</div>
                {
                  (viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate]).map((day, idx) => {
                    const dateStr = formatDateString(day);
                    const isToday = formatDateString(new Date()) === dateStr;
                    return (
                      <div key={idx} className={`flex flex-col items-center justify-center gap-1 bg-slate-50 py-2.5 text-center dark:bg-[#0b0d13] ${isToday ? 'bg-blue-50/70 dark:bg-blue-950/20' : ''}`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          <span className="hidden md:inline">{['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'][day.getDay() === 0 ? 6 : day.getDay() - 1]}</span>
                          <span className="md:hidden">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][day.getDay() === 0 ? 6 : day.getDay() - 1]}</span>
                        </span>
                        <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-700 dark:text-slate-200'}`}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })
                }
              </div>

              {/* Time grid body */}
              <div className="relative h-[calc(100vh-350px)] min-h-[480px] divide-y divide-slate-100 overflow-y-auto scrollbar-none dark:divide-slate-800">
                
                {/* 🔴 Current time line indicator */}
                {(() => {
                  const todayStr = formatDateString(new Date());
                  const activeDays = viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate];
                  const todayIdx = activeDays.findIndex(d => formatDateString(d) === todayStr);

                  if (todayIdx !== -1) {
                    const currentHour = now.getHours();
                    const currentMin = now.getMinutes();
                    const topOffset = currentHour * 52 + (currentMin / 60) * 52; // each hour is 52px
                    const gridColumnsCount = activeDays.length + 1;
                    const leftOffsetPercent = (todayIdx + 1) * (100 / gridColumnsCount);
                    const columnWidthPercent = 100 / gridColumnsCount;

                    return (
                      <div 
                        className="absolute z-10 flex items-center pointer-events-none"
                        style={{ 
                          top: `${topOffset}px`, 
                          left: `${leftOffsetPercent}%`,
                          width: `${columnWidthPercent}%`
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.25 shrink-0 shadow-sm relative flex">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                        <div className="flex-1 h-0.5 bg-rose-500 shadow-2xs border-t border-dashed border-rose-400 dark:border-rose-700" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {hours.map(hour => (
                  <div key={hour} className={`grid ${viewMode === 'week' ? 'grid-cols-8' : viewMode === '4day' ? 'grid-cols-5' : 'grid-cols-2'} gap-px bg-slate-100 dark:bg-slate-800`}>
                    
                    {/* Time Label column */}
                    <div className="border-r border-slate-100 bg-white py-4 pr-3.5 text-right font-mono text-[9px] font-medium text-slate-400 dark:border-slate-800 dark:bg-[#090b10] dark:text-slate-500">
                      {`${String(hour).padStart(2, '0')}:00`}
                    </div>

                    {/* Day hour blocks */}
                    {(viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate]).map((day, dIdx) => {
                      const dateStr = formatDateString(day);
                      const isDragOver = activeDragOverDate === dateStr && activeDragOverHour === hour;
                      
                      // Filter events for this hour
                      const hourEvents = getFilteredEventsForDate(dateStr).filter(e => {
                        return Number(eventTime(e, 'start').split(':')[0]) === hour;
                      });

                      // Filter tasks mapped to this hour (via custom_fields)
                      const hourTasks = getFilteredTasksForDate(dateStr).filter(t => {
                        const schedHour = t.custom_fields?.scheduledHour !== undefined ? Number(t.custom_fields.scheduledHour) : 9;
                        return schedHour === hour;
                      });

                      return (
                        <div 
                          key={dIdx}
                          onDragOver={e => handleDragOver(e, dateStr, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={e => handleDrop(e, dateStr, hour)}
                          onClick={() => handleGridCellClick(dateStr, hour)}
                          className={`relative flex min-h-[52px] flex-col gap-1 bg-white p-1.5 transition duration-150 dark:bg-[#090b10] ${
                            isDragOver ? 'z-10 bg-blue-50 ring-2 ring-inset ring-blue-500/40 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                        >
                          {hourEvents.map((evt, idx) => (
                            <motion.div 
                              layoutId={evt.id}
                              key={evt.id || idx}
                              draggable
                              onDragStart={e => handleDragStart(e as any, evt.id, 'google-event')}
                              onDragEnd={handleDragEnd}
                              onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                              whileHover={{ scale: 1.02 }}
                              className="flex min-h-6 cursor-grab items-center gap-1.5 truncate rounded-md border-l-2 px-2 text-[9.5px] font-semibold transition hover:brightness-95 active:cursor-grabbing"
                              style={{ backgroundColor: `${evt.color || '#2563EB'}14`, borderLeftColor: evt.color || '#2563EB', color: evt.color || '#2563EB' }}
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{evt.summary}</span>
                            </motion.div>
                          ))}
                          {hourTasks.map(task => {
                            const style = getPriorityStyle(task.priority);
                            return (
                              <motion.div 
                                layoutId={task.id}
                                key={task.id}
                                draggable
                                onDragStart={e => handleDragStart(e as any, task.id)}
                                onDragEnd={handleDragEnd}
                                onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                                whileHover={{ scale: 1.02 }}
                                className={`flex min-h-6 cursor-grab items-center gap-1.5 truncate rounded-md border border-l-[3px] px-2 text-[9.5px] font-semibold transition active:cursor-grabbing ${
                                  task.status === 'completed' 
                                    ? 'border-emerald-100 bg-emerald-50 text-emerald-600 line-through dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-800'
                                }`}
                                style={{ borderLeftColor: style.dot.includes('bg-rose-500') ? '#f43f5e' : style.dot.includes('bg-orange-500') ? '#f97316' : style.dot.includes('bg-indigo-500') ? '#2563EB' : '#94a3b8' } as any}
                              >
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                )}
                                <span className="truncate flex-1">{task.title}</span>
                                {task.assigneeId && (
                                  <span className="text-[7.5px] px-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-bold uppercase select-none">{members.find(m => m.id === task.assigneeId)?.name.substring(0, 2)}</span>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E. SCHEDULE (AGENDA) VIEW */}
          {viewMode === 'schedule' && (
            <div className="flex max-h-[calc(100vh-280px)] flex-col gap-5 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-4 text-left dark:border-slate-800 dark:bg-[#090b10] sm:p-5">
              {(() => {
                const allItems: { date: string; dateObj: Date; items: any[] }[] = [];
                const today = new Date(currentDate);

                for (let i = 0; i < 14; i++) {
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() + i);
                  const dateStr = formatDateString(targetDate);
                  
                  const dayTasks = getFilteredTasksForDate(dateStr);
                  const dayEvents = getFilteredEventsForDate(dateStr);
                  
                  if (dayTasks.length > 0 || dayEvents.length > 0) {
                    allItems.push({
                      date: dateStr,
                      dateObj: targetDate,
                      items: [...dayEvents, ...dayTasks]
                    });
                  }
                }

                if (allItems.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 py-16 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500">
                      <CalendarDays className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-600 mb-2" />
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">Lịch trình trống</h4>
                      <p className="text-xs mt-1">Không có công việc hoặc sự kiện nào trong 2 tuần tới.</p>
                    </div>
                  );
                }

                return allItems.map((group, idx) => {
                  const isToday = formatDateString(new Date()) === group.date;
                  return (
                    <div key={idx} className="space-y-3">
                      <div className="flex items-center gap-2.5 select-none">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isToday ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {isToday ? 'Hôm nay' : ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'][group.dateObj.getDay() === 0 ? 6 : group.dateObj.getDay() - 1]}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {group.dateObj.getDate()} {monthNames[group.dateObj.getMonth()]}, {group.dateObj.getFullYear()}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                        {group.items.map((item, itemIdx) => {
                          const isGoogleEvent = !!item.isGoogleEvent;
                          const style = !isGoogleEvent ? getPriorityStyle(item.priority) : null;
                          
                          return (
                            <motion.div 
                              key={item.id || itemIdx}
                              onClick={() => setSelectedTask(item)}
                              whileHover={{ scale: 1.01 }}
                              className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                    isGoogleEvent ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {isGoogleEvent ? 'Sự kiện' : 'Công việc'}
                                  </span>
                                  {!isGoogleEvent && style && (
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${style.bg} ${style.text} ${style.border} border`}>
                                      {getPriorityLabel(item.priority)}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug truncate">{item.summary || item.title}</h5>
                                {item.description && <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{item.description}</p>}
                              </div>

                              <div className="text-right shrink-0 flex flex-col justify-between h-full space-y-2">
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-mono flex items-center gap-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {isGoogleEvent 
                                    ? new Date(item.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) 
                                    : `${item.custom_fields?.scheduledHour || 9}:00`
                                  }
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

        </div>

      </div>

      {/* Floating AI Assistant FAB Button (Bottom Right) */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 6 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAiModal(true)}
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 cursor-pointer"
        title="Trợ lý Xếp lịch AI"
      >
        <Brain className="h-5 w-5 text-white" />
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-[8px] font-bold text-white">
          AI
        </span>
      </motion.button>

      {/* AI Assistant Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-all"
            />
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0c0e14]/95 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl p-6 sm:p-7 text-left"
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-bl from-indigo-500/20 via-blue-500/10 to-transparent blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">Trợ lý Lịch AI</h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Tối ưu hóa và tự động phân bổ lịch làm việc</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/40 dark:from-indigo-950/40 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-2.5">
                  <p className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gợi ý phân bổ lịch biểu thông minh:</span>
                  </p>
                  <ul className="space-y-2 text-[11px] text-indigo-900/80 dark:text-indigo-300 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="shrink-0">⚡</span>
                      <span>Tự động sắp xếp <b>{unscheduledTasks.length} công việc chưa có lịch</b> vào các khung giờ trống phù hợp.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0">🎯</span>
                      <span>Ưu tiên đẩy các công việc <b>Khẩn cấp / Cao</b> vào các khung giờ tập trung buổi sáng.</span>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="py-2.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200 text-xs font-extrabold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAiModal(false); handleAiAutoSchedule(); }}
                    className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Xếp lịch ngay</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Detail Modal Editor Overlay */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-all"
            />
            
            <motion.div 
              initial={{ scale: 0.92, y: 20, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.92, y: 20, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0c0e14]/95 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl p-6 sm:p-7 text-left"
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-bl from-indigo-500/20 via-blue-500/10 to-transparent blur-2xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  (selectedTask as any).isGoogleEvent
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  {(selectedTask as any).isGoogleEvent ? 'Google Event' : 'Apexa Task'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Editable Title */}
              {!(selectedTask as any).isGoogleEvent ? (
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={e => handleModalUpdateField('title', e.target.value)}
                  className="text-base font-black text-slate-900 dark:text-white leading-snug mb-4 w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 outline-none pb-1 transition-colors"
                />
              ) : (
                <input
                  type="text"
                  value={(selectedTask as any).summary}
                  onChange={event => updateGoogleDraft({ summary: event.target.value })}
                  className="text-base font-black text-slate-900 dark:text-white leading-snug mb-4 w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 outline-none pb-1 transition-colors"
                />
              )}
              
              {/* Detailed properties fields */}
              <div className="space-y-3.5 mb-6 text-xs text-left">
                {selectedTask.dueDate && (
                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                    <CalendarIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Hạn chót: <b className="text-slate-800 dark:text-slate-200">{selectedTask.dueDate}</b></span>
                  </div>
                )}
                
                {(selectedTask as any).isGoogleEvent && (
                  <div className="space-y-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-3.5">
                    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                      <CalendarIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                      <input
                        type="date"
                        value={eventDateKey(selectedTask as any)}
                        onChange={event => updateGoogleDraftDate(event.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold"
                      />
                    </div>
                    {(selectedTask as any).start?.date ? (
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-bold">Sự kiện cả ngày</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                        <input
                          type="time"
                          value={eventTime(selectedTask as any, 'start')}
                          onChange={event => updateGoogleDraftTime('start', event.target.value)}
                          className="min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={eventTime(selectedTask as any, 'end')}
                          onChange={event => updateGoogleDraftTime('end', event.target.value)}
                          className="min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Priority Selector */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Tag className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="shrink-0 w-24 font-bold">Độ ưu tiên:</span>
                    <select
                      value={selectedTask.priority}
                      onChange={e => handleModalUpdateField('priority', e.target.value as Priority)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer font-bold"
                    >
                      <option value="low">🟢 Thấp</option>
                      <option value="medium">🔵 Trung bình</option>
                      <option value="high">🟡 Cao</option>
                      <option value="urgent">🔴 Khẩn cấp</option>
                    </select>
                  </div>
                )}

                {/* Status Selector */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="shrink-0 w-24 font-bold">Trạng thái:</span>
                    <select
                      value={selectedTask.status}
                      onChange={e => handleModalUpdateField('status', e.target.value as TaskStatus)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer font-bold"
                    >
                      <option value="todo">Cần làm</option>
                      <option value="inprogress">Đang thực hiện</option>
                      <option value="review">Đang duyệt</option>
                      <option value="completed">Đã hoàn thành</option>
                    </select>
                  </div>
                )}

                {/* Assignee Selector */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="shrink-0 w-24 font-bold">Phụ trách:</span>
                    <select
                      value={selectedTask.assigneeId || ''}
                      onChange={e => handleModalUpdateField('assigneeId', e.target.value || null)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer font-bold"
                    >
                      <option value="">Chưa phân công</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Editable Description */}
                {!(selectedTask as any).isGoogleEvent ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Mô tả chi tiết</label>
                    <textarea
                      value={selectedTask.description || ''}
                      onChange={e => handleModalUpdateField('description', e.target.value)}
                      rows={3}
                      placeholder="Viết mô tả cho công việc này..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 outline-none resize-none font-medium text-slate-800 dark:text-slate-200 transition-colors focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Mô tả chi tiết</label>
                    <textarea
                      value={(selectedTask as any).description || ''}
                      onChange={event => updateGoogleDraft({ description: event.target.value })}
                      rows={3}
                      placeholder="Viết mô tả cho sự kiện..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 outline-none resize-none font-medium text-slate-800 dark:text-slate-200 transition-colors focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {(selectedTask as any).isGoogleEvent ? (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleDeleteGoogleEvent}
                    disabled={savingGcal}
                    className="px-4 py-3 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGoogleEvent}
                    disabled={savingGcal}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-500 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    {savingGcal ? 'Đang lưu...' : 'Lưu vào Google Calendar'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-500 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer text-center"
                  >
                    Hoàn tất
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE QUICK TASK/EVENT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-all"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0c0e14]/95 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl p-6 sm:p-7 text-left"
            >
              {/* Radiant Glow Behind Header */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-bl from-indigo-500/20 via-blue-500/10 to-transparent blur-2xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                      Lên lịch nhanh
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span>{clickedDate}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span>{clickedHour}:00</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <form onSubmit={handleCreateQuickItem} className="space-y-4 text-xs text-left">
                {/* Switch Type Segmented Control */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90">
                  <button
                    type="button"
                    onClick={() => setCreateType('task')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      createType === 'task'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-700/50 scale-[1.02]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span>Công việc mới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateType('event')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      createType === 'event'
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/40 dark:border-slate-700/50 scale-[1.02]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>Sự kiện Google</span>
                  </button>
                </div>

                {/* Input: Tiêu đề */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tiêu đề</span>
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    required
                    placeholder={createType === 'task' ? 'Nhập tiêu đề công việc...' : 'Nhập tên sự kiện cuộc họp...'}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 text-xs font-bold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-3xs"
                  />
                </div>

                {/* Input: Mô tả */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <AlignLeft className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Mô tả ghi chú</span>
                  </label>
                  <textarea
                    value={quickDesc}
                    onChange={e => setQuickDesc(e.target.value)}
                    rows={2.5}
                    placeholder="Nhập ghi chú chi tiết, mục tiêu hoặc tài liệu đính kèm..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 text-xs font-semibold outline-none resize-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-3xs"
                  />
                </div>

                {createType === 'task' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Select: Độ ưu tiên */}
                    <div className="space-y-1.5 text-left">
                      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Độ ưu tiên</span>
                      </label>
                      <div className="relative">
                        <select
                          value={quickPriority}
                          onChange={e => setQuickPriority(e.target.value as any)}
                          className="w-full appearance-none px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-3xs"
                        >
                          <option value="low">🟢 Thấp (Low)</option>
                          <option value="medium">🔵 Trung bình (Normal)</option>
                          <option value="high">🟡 Cao (High)</option>
                          <option value="urgent">🔴 Khẩn cấp (Urgent)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Select: Người phụ trách */}
                    <div className="space-y-1.5 text-left">
                      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Người phụ trách</span>
                      </label>
                      <div className="relative">
                        <select
                          value={quickAssigneeId}
                          onChange={e => setQuickAssigneeId(e.target.value)}
                          className="w-full appearance-none px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-3xs"
                        >
                          <option value="">👤 Chưa phân công</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Select: Space & List */}
                    {spaces && spaces.length > 0 && (
                      <>
                        <div className="space-y-1.5 text-left">
                          <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Không gian (Space)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={quickSpaceId}
                              onChange={e => {
                                const newSpaceId = e.target.value;
                                setQuickSpaceId(newSpaceId);
                                const selectedSp = spaces.find(s => s.id === newSpaceId);
                                setQuickListId(selectedSp?.lists?.[0]?.id || '');
                              }}
                              className="w-full appearance-none px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-3xs"
                            >
                              {spaces.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Danh sách (List)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={quickListId}
                              onChange={e => setQuickListId(e.target.value)}
                              className="w-full appearance-none px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all shadow-3xs"
                            >
                              {((spaces.find(s => s.id === quickSpaceId) || spaces[0])?.lists || []).map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Input: Bắt đầu */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        <span>Bắt đầu</span>
                      </label>
                      <input
                        type="time"
                        value={quickStartTime}
                        onChange={e => setQuickStartTime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white font-mono text-xs font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                      />
                    </div>

                    {/* Input: Kết thúc */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        <span>Kết thúc</span>
                      </label>
                      <input
                        type="time"
                        value={quickEndTime}
                        onChange={e => setQuickEndTime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white font-mono text-xs font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                      />
                    </div>

                    {/* Select: Màu sự kiện */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Palette className="w-3 h-3 text-emerald-500" />
                        <span>Màu nhãn</span>
                      </label>
                      <div className="relative">
                        <select
                          value={quickEventColor}
                          onChange={e => setQuickEventColor(e.target.value)}
                          className="w-full appearance-none px-3 py-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-black outline-none cursor-pointer focus:border-emerald-500 transition-all"
                        >
                          <option value="#2563EB">🔵 Indigo</option>
                          <option value="#10b981">🟢 Emerald</option>
                          <option value="#ef4444">🔴 Rose</option>
                          <option value="#f59e0b">🟡 Amber</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Footer Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-xs font-extrabold text-slate-600 dark:text-slate-300 transition-all cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={savingGcal}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-500 text-xs font-black text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{savingGcal ? 'Đang lưu...' : 'Xếp lịch'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
