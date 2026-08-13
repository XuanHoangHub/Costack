"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Priority, TaskStatus } from '../types';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  RefreshCw, CheckCircle2, Sparkles, Check, Plus, X,
  Search, Filter, Info, Trash2, ArrowRight, UserCheck, Users,
  ListPlus, Settings, CalendarDays, Eye, Edit3, Tag, GripVertical, ChevronDown,
  Download, Bot, Zap, CheckSquare, Layers, CircleDot, Flag, Brain, Globe, HelpCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../contexts/TranslationContext';

interface CalendarViewProps {
  tasks: Task[];
  members: User[];
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
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
    const remaining = 35 - result.length;
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
    <div className="p-4 select-none pb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
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
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 mb-2">
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
              className={`w-6.5 h-6.5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer mx-auto ${
                isSelected || isToday
                  ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/25 scale-105'
                  : item.isCurrentMonth
                  ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  : 'text-slate-350 dark:text-slate-650 opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800'
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
  onDeleteTask
}: CalendarViewProps) {
  const { t, locale } = useTranslation();
  
  // Auth state to identify "Me"
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 12)); // August 12, 2026 matching screenshot context
  const [viewMode, setViewMode] = useState<'month' | 'week' | '4day' | 'day' | 'schedule'>('month');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
  const [quickStartTime, setQuickStartTime] = useState<string>('09:00');
  const [quickEndTime, setQuickEndTime] = useState<string>('10:00');
  const [quickEventColor, setQuickEventColor] = useState<string>('#7B61FF');
  const [createType, setCreateType] = useState<'task' | 'event'>('task');

  // Sidebar expanded state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Simulated Google Calendar Connection
  const [gcalConnected, setGcalConnected] = useState<boolean>(false);
  const [gcalUserEmail, setGcalUserEmail] = useState<string>('');
  const [syncingGcal, setSyncingGcal] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  
  // Current time for red indicator line
  const [now, setNow] = useState<Date>(new Date());

  // Local/Offline mock google events
  const [gcalEvents, setGcalEvents] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('avaxa_local_calendar_events');
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {}
    
    return [
      { id: 'mock-1', summary: 'Họp Định hướng Sản phẩm 🚀', description: 'Đánh giá thiết kế bảng Kanban v2.5 mới', start: { dateTime: '2026-08-12T10:00:00+07:00' }, end: { dateTime: '2026-08-12T11:30:00+07:00' }, color: '#7B61FF', isGoogleEvent: true },
      { id: 'mock-2', summary: 'Tối ưu Giao diện Calendar 📅', description: 'Hoàn thiện hệ lưới và chuyển động kéo thả', start: { dateTime: '2026-08-14T14:00:00+07:00' }, end: { dateTime: '2026-08-14T15:30:00+07:00' }, color: '#10b981', isGoogleEvent: true },
      { id: 'mock-3', summary: 'Duyệt Trợ lý AI Copilot 🧠', description: 'Tinh chỉnh câu lệnh cho trợ lý ảo thông minh', start: { dateTime: '2026-08-11T09:00:00+07:00' }, end: { dateTime: '2026-08-11T10:30:00+07:00' }, color: '#f59e0b', isGoogleEvent: true }
    ];
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
    });

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('avaxa_local_calendar_events', JSON.stringify(gcalEvents));
    } catch (e) {}
  }, [gcalEvents]);

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
      'PRODID:-//Avaxa Productivity Hub//Calendar//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    tasks.forEach(t => {
      if (t.dueDate) {
        const cleanDate = t.dueDate.replace(/-/g, '');
        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:task-${t.id}@avaxa.app`);
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

  // Google Calendar Connection simulation
  const handleConnectGcal = () => {
    if (gcalConnected) {
      setGcalConnected(false);
      setGcalUserEmail('');
      triggerToast?.('info', 'Đã ngắt kết nối Google Calendar', 'Tài khoản đã được gỡ khỏi bộ lịch.');
      return;
    }

    setSyncingGcal(true);
    setSyncProgress(10);
    setSyncLogs(['Đang tạo cổng kết nối OAuth 2.0...']);

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncingGcal(false);
          setGcalConnected(true);
          setGcalUserEmail('avaxa.productivity@gmail.com');
          triggerToast?.('success', 'Kết nối thành công 🟢', 'Đã đồng bộ dữ liệu sự kiện từ Google Calendar.');
          return 100;
        }
        const next = prev + 30;
        if (next === 40) {
          setSyncLogs(l => [...l, 'Đã xác thực avaxa.productivity@gmail.com', 'Đang đọc danh sách sự kiện...']);
        } else if (next === 70) {
          setSyncLogs(l => [...l, 'Nhận token quyền truy cập.', 'Hoàn tất đồng bộ dòng thời gian...']);
        }
        return next;
      });
    }, 350);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
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

  const handleDrop = (e: React.DragEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setActiveDragOverDate(null);
    setActiveDragOverHour(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const findTask = tasks.find(t => t.id === taskId);
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
    setQuickStartTime(`${String(hour).padStart(2, '0')}:00`);
    setQuickEndTime(`${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`);
    setShowAddModal(true);
  };

  const handleCreateQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    if (createType === 'task') {
      onAddTask({
        title: quickTitle,
        description: quickDesc,
        priority: quickPriority,
        status: 'todo',
        assigneeId: quickAssigneeId || undefined,
        dueDate: clickedDate,
        startDate: clickedDate,
        tags: [],
        isPinned: false,
        subtasks: [],
        custom_fields: {
          scheduledHour: clickedHour
        }
      });
      triggerToast?.('success', 'Tạo công việc thành công', `Đã thêm công việc "${quickTitle}".`);
    } else {
      const newEvt = {
        id: `gcal-evt-${Date.now()}`,
        summary: quickTitle,
        description: quickDesc,
        start: { dateTime: `${clickedDate}T${quickStartTime}:00+07:00` },
        end: { dateTime: `${clickedDate}T${quickEndTime}:00+07:00` },
        color: quickEventColor,
        isGoogleEvent: true
      };
      setGcalEvents(prev => [...prev, newEvt]);
      triggerToast?.('success', 'Sự kiện Google', `Đã xếp lịch sự kiện "${quickTitle}".`);
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
    
    const remaining = 35 - days.length;
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
    return gcalEvents.filter(e => {
      const eventDate = e.start?.dateTime ? e.start.dateTime.split('T')[0] : e.start?.date;
      return eventDate === dateStr;
    });
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

  return (
    <div className="flex flex-col lg:flex-row w-full h-full font-sans select-none text-slate-800 dark:text-slate-100 bg-white dark:bg-[#07080c] overflow-hidden relative">
      
      {/* Collapsible Left Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '18rem', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="w-full lg:w-72 flex flex-col shrink-0 text-left border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60"
          >
            {/* Mini Calendar Navigator */}
            <MiniCalendarNavigator 
              selectedDate={currentDate}
              onSelectDate={(d) => setCurrentDate(d)}
            />

            {/* Google Calendar Connection Card */}
            <div className="p-4 space-y-3 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
              
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>CALENDAR CONNECTION</span>
              </h4>
               
              {gcalConnected ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/60">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">G</div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-black text-indigo-700 dark:text-indigo-400 truncate">{gcalUserEmail}</span>
                      <span className="block text-[8px] text-indigo-400 font-extrabold uppercase mt-0.5">Đã kết nối</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleConnectGcal}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 transition-colors cursor-pointer text-center"
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-950 dark:bg-indigo-600/20 border border-slate-900 dark:border-indigo-500/40 hover:bg-slate-800 dark:hover:bg-indigo-600/30 text-white dark:text-indigo-300 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sync Google Calendar</span>
                </button>
              )}
            </div>

            {/* Filter Toggle Pills */}
            <div className="p-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>DISPLAY FILTERS</span>
              </h4>
              
              <div className="space-y-2">
                {[
                  { id: 'showTasks', label: 'Tasks', count: tasks.length, color: 'indigo', state: showTasks, setter: setShowTasks },
                  { id: 'showGcal', label: 'Google Calendar', count: gcalEvents.length, color: 'emerald', state: showGcal, setter: setShowGcal },
                  { id: 'showHolidays', label: 'Holidays', count: null, color: 'rose', state: showHolidays, setter: setShowHolidays }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.setter(!item.state)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                      item.state
                        ? item.color === 'indigo'
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : item.color === 'emerald'
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-200/80 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 shadow-xs'
                        : 'bg-white dark:bg-[#0d0e15] border-slate-200/80 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        item.state
                          ? item.color === 'indigo' ? 'bg-indigo-500' : item.color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`} />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        item.state ? 'bg-white/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Priority Filter */}
              <div className="space-y-1.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 block">PRIORITY</label>
                <select 
                  value={priorityFilter} 
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0d0e15] border border-slate-200/80 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-3xs"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Khẩn cấp (Urgent)</option>
                  <option value="high">Cao (High)</option>
                  <option value="medium">Trung bình (Medium)</option>
                  <option value="low">Thấp (Low)</option>
                </select>
              </div>
            </div>

            {/* Unscheduled Tasks Card */}
            <div className="p-4 flex-1 min-h-[220px] flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                <ListPlus className="w-3.5 h-3.5" />
                <span>UNSCHEDULED ({unscheduledTasks.length})</span>
              </h4>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 lg:max-h-[calc(100vh-450px)] max-h-64 pr-1 scrollbar-thin">
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
                        className="py-2.5 group cursor-grab active:cursor-grabbing hover:bg-slate-100/80 dark:hover:bg-slate-800/40 rounded-xl transition-all px-2.5 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800 flex items-center gap-2.5"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-350 dark:text-slate-650 shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{t.title}</span>
                            <span className={`text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${style.bg} ${style.text} ${style.border}`}>
                              {t.priority}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
              
              <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center font-bold bg-slate-100/80 dark:bg-slate-950/40 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 mt-3 select-none flex items-center justify-center gap-1">
                💡 Drag and drop tasks to schedule
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="hidden lg:flex items-center justify-center w-5 h-10 rounded-r-xl border border-l-0 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shadow-2xs shrink-0 self-center cursor-pointer z-20"
        title={isSidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Main Calendar Views */}
      <div className="flex-1 p-5 flex flex-col gap-4 min-w-0 bg-white dark:bg-[#07080c] overflow-y-auto relative">
        
        {/* Calendar Navigation Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <h2 className="text-base font-black tracking-tight text-slate-950 dark:text-white capitalize">
              {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === 'week' && `Tuần ${Math.ceil(currentDate.getDate() / 7)}, ${monthNames[currentDate.getMonth()]}`}
              {viewMode === '4day' && `4 Ngày tiếp theo`}
              {viewMode === 'day' && `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === 'schedule' && `Lịch trình chi tiết`}
            </h2>
            <div className="flex items-center gap-0.5 border border-slate-200/80 dark:border-slate-800/80 p-0.5 rounded-xl bg-slate-50 dark:bg-[#0e0f17]">
              <button onClick={handlePrev} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-3xs transition-all cursor-pointer text-slate-600 dark:text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={handleToday} className="px-3 py-1 rounded-lg text-[9.5px] font-black uppercase hover:bg-white dark:hover:bg-slate-800 hover:shadow-3xs transition-all cursor-pointer text-slate-700 dark:text-slate-300">TODAY</button>
              <button onClick={handleNext} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-3xs transition-all cursor-pointer text-slate-600 dark:text-slate-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Search, Filter & Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0e0f17] placeholder-slate-400 outline-none w-44 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500/20 transition-all font-semibold"
              />
            </div>

            {/* AI Auto-Schedule Button */}
            <button
              onClick={handleAiAutoSchedule}
              disabled={isAiScheduling}
              className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-900/60 hover:bg-violet-100 transition-all font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Tự động xếp lịch công việc bằng AI"
            >
              <Sparkles className={`w-3.5 h-3.5 text-violet-600 dark:text-violet-400 ${isAiScheduling ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isAiScheduling ? 'AI đang xếp...' : 'AI Schedule'}</span>
            </button>

            {/* ICS File Export Button */}
            <button
              onClick={handleExportICS}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-800 shadow-3xs"
              title="Xuất tập tin Lịch (.ics)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Me vs Team Switch Slider */}
            <div className="flex bg-slate-100/90 dark:bg-[#0e0f17] p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800 relative select-none">
              <button 
                onClick={() => setIsMeMode(true)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer relative z-10 ${
                  isMeMode ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-3xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <UserCheck className="w-3 h-3" /> Mine
              </button>
              <button 
                onClick={() => setIsMeMode(false)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer relative z-10 ${
                  !isMeMode ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-3xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <Users className="w-3 h-3" /> Team
              </button>
            </div>

            {/* View Select Mode Slider */}
            <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-[#0e0f17] p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800 select-none relative">
              {[
                { id: 'month', label: 'Tháng' },
                { id: 'week', label: 'Tuần' },
                { id: '4day', label: '4 Ngày' },
                { id: 'day', label: 'Ngày' },
                { id: 'schedule', label: 'Lịch biểu' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => setViewMode(m.id as any)}
                  className="px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all cursor-pointer relative"
                >
                  {viewMode === m.id && (
                    <motion.div 
                      layoutId="activeViewTab" 
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-3xs border border-slate-200/60"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${viewMode === m.id ? 'text-slate-950 dark:text-white font-black' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid Content Area */}
        <div className="flex-1 overflow-x-auto min-w-0">
          
          {/* A. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-slate-200/60 dark:bg-slate-800/40 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800/60 min-w-[720px]">
              {['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'].map(header => (
                <div key={header} className="bg-slate-50/90 dark:bg-[#07080c] py-2.5 text-center text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase select-none">
                  {header}
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
                    className={`min-h-[118px] bg-white dark:bg-[#07080c] p-2.5 relative flex flex-col gap-1.5 transition-all duration-200 border-r border-b border-slate-100 dark:border-slate-800/70 group text-left ${
                      day.isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-350 dark:text-slate-650 opacity-40 bg-slate-50/40 dark:bg-[#040406]'
                    } ${isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/25' : ''} ${isDragOver ? 'bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/40 z-10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                  >
                    {/* Day Number Header */}
                    <div className="flex justify-between items-center select-none">
                      <span className={`text-[11px] font-black w-6.5 h-6.5 rounded-full flex items-center justify-center transition-colors ${
                        isToday ? 'bg-indigo-600 text-white shadow-md font-black' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}>{day.date.getDate()}</span>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleGridCellClick(dateStr); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Scrollable event lists in cell */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[82px] scrollbar-none pr-0.5">
                      {/* Vietnamese Holiday Pill Badge */}
                      {holidayName && (
                        <div className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 truncate flex items-center gap-1 shadow-3xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate">{holidayName}</span>
                        </div>
                      )}

                      {/* Google Calendar Events */}
                      {dayEvents.map((evt, i) => (
                        <motion.div 
                          layoutId={evt.id}
                          key={evt.id || i}
                          onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                          whileHover={{ scale: 1.02 }}
                          className="px-2 py-1 rounded-lg text-[9px] font-bold text-white truncate shadow-3xs cursor-pointer hover:brightness-95 transition-all select-none flex items-center gap-1.5"
                          style={{ backgroundColor: evt.color || '#7B61FF' }}
                        >
                          <span className="w-1 h-1 rounded-full bg-white block shrink-0 animate-pulse" />
                          <span className="truncate">{evt.summary}</span>
                        </motion.div>
                      ))}

                      {/* Avaxa Tasks */}
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
                            className={`px-2 py-1 rounded-lg text-[9px] font-extrabold truncate border-l-[3px] border-r border-t border-b flex items-center gap-1.5 shadow-3xs cursor-grab active:cursor-grabbing transition-all ${
                              task.status === 'completed' 
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 line-through font-bold' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600'
                            }`}
                            style={{ borderLeftColor: style.dot.includes('bg-rose-500') ? '#f43f5e' : style.dot.includes('bg-orange-500') ? '#f97316' : style.dot.includes('bg-indigo-500') ? '#7B61FF' : '#94a3b8' } as any}
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
            <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 min-w-[650px] relative bg-white dark:bg-slate-900">
              
              {/* Header Days Row */}
              <div className={`grid ${viewMode === 'week' ? 'grid-cols-8' : viewMode === '4day' ? 'grid-cols-5' : 'grid-cols-2'} gap-px bg-slate-100 dark:bg-slate-800 border-b border-slate-200/85 dark:border-slate-800`}>
                <div className="bg-slate-50 dark:bg-slate-900 py-3 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase select-none">Giờ</div>
                {
                  (viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate]).map((day, idx) => {
                    const dateStr = formatDateString(day);
                    const isToday = formatDateString(new Date()) === dateStr;
                    return (
                      <div key={idx} className={`bg-slate-50 dark:bg-slate-900 py-2.5 text-center flex flex-col items-center justify-center gap-1 select-none ${isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`}>
                        <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                          {['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'][day.getDay() === 0 ? 6 : day.getDay() - 1]}
                        </span>
                        <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white shadow-md font-black' : 'text-slate-700 dark:text-slate-200'}`}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })
                }
              </div>

              {/* Time grid body */}
              <div className="min-h-[480px] h-[calc(100vh-320px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 relative scrollbar-none">
                
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
                    <div className="bg-white dark:bg-slate-900 py-4 pr-3.5 text-right text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono select-none border-r border-slate-100 dark:border-slate-800">
                      {`${String(hour).padStart(2, '0')}:00`}
                    </div>

                    {/* Day hour blocks */}
                    {(viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate]).map((day, dIdx) => {
                      const dateStr = formatDateString(day);
                      const isDragOver = activeDragOverDate === dateStr && activeDragOverHour === hour;
                      
                      // Filter events for this hour
                      const hourEvents = getFilteredEventsForDate(dateStr).filter(e => {
                        const startTime = e.start?.dateTime ? e.start.dateTime.split('T')[1].split(':')[0] : '09';
                        return Number(startTime) === hour;
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
                          className={`bg-white dark:bg-slate-900 min-h-[52px] p-1.5 relative flex flex-col gap-1 transition-all duration-150 ${
                            isDragOver ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400/40 ring-2 ring-indigo-500/20 z-10' : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {hourEvents.map((evt, idx) => (
                            <motion.div 
                              layoutId={evt.id}
                              key={evt.id || idx}
                              onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                              whileHover={{ scale: 1.02 }}
                              className="px-2 py-1 rounded-lg text-[9px] font-bold text-white truncate shadow-3xs cursor-pointer hover:brightness-95 transition-all select-none flex items-center gap-1.5"
                              style={{ backgroundColor: evt.color || '#7B61FF' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white block shrink-0 animate-pulse" />
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
                                className={`px-2 py-1 rounded-lg text-[9px] font-black border-l-[3px] border-r border-t border-b flex items-center gap-2 shadow-3xs cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all truncate ${
                                  task.status === 'completed' 
                                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 line-through font-bold' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 dark:hover:border-indigo-600'
                                }`}
                                style={{ borderLeftColor: style.dot.includes('bg-rose-500') ? '#f43f5e' : style.dot.includes('bg-orange-500') ? '#f97316' : style.dot.includes('bg-indigo-500') ? '#7B61FF' : '#94a3b8' } as any}
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
            <div className="flex flex-col gap-6 text-left max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
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
                    <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6">
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
                              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 rounded-2xl shadow-3xs hover:shadow-2xs cursor-pointer transition-all flex items-start gap-3 justify-between"
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
                                      {item.priority}
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
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 border-2 border-white/20 cursor-pointer"
        title="Trợ lý Xếp lịch AI"
      >
        <Brain className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
          AI
        </span>
      </motion.button>

      {/* AI Assistant Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 modal-backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAiModal(false)} className="absolute inset-0" />
            <motion.div initial={{ scale: 0.94, y: 15, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, y: 15, opacity: 0 }}
              className="modal-glass-card rounded-3xl shadow-2xl w-full max-w-lg p-6 relative border border-white/80 dark:border-slate-800/80 overflow-hidden text-left select-none z-10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Calendar Copilot</h3>
                    <p className="text-[10px] text-slate-400">Trợ lý tối ưu hóa lịch biểu thông minh</p>
                  </div>
                </div>
                <button onClick={() => setShowAiModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                  <p className="font-extrabold text-indigo-900 dark:text-indigo-200">Gợi ý phân bổ lịch tự động:</p>
                  <ul className="space-y-1.5 text-[11px] text-indigo-700 dark:text-indigo-300">
                    <li className="flex items-center gap-2">⚡ <span>Tự động sắp xếp <b>{unscheduledTasks.length} công việc chưa có lịch</b> vào các khung giờ trống phù hợp.</span></li>
                    <li className="flex items-center gap-2">🎯 <span>Ưu tiên lịch công việc <b>Urgent/High</b> vào buổi sáng.</span></li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAiModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-extrabold text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">Đóng</button>
                  <button onClick={() => { setShowAiModal(false); handleAiAutoSchedule(); }} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
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
          <div className="fixed inset-0 z-50 modal-backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)}
              className="absolute inset-0" />
            
            <motion.div 
              initial={{ scale: 0.94, y: 15, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.94, y: 15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="modal-glass-card rounded-3xl shadow-2xl w-full max-w-md p-6 relative border border-white/80 dark:border-slate-800/80 overflow-hidden text-left select-none z-10"
            >
              <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                  (selectedTask as any).isGoogleEvent ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {(selectedTask as any).isGoogleEvent ? 'Google Event' : 'Avaxa Task'}
                </span>
                <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              {/* Editable Title */}
              {!(selectedTask as any).isGoogleEvent ? (
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={e => handleModalUpdateField('title', e.target.value)}
                  className="text-sm font-black text-slate-800 dark:text-white leading-snug mb-4 w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 outline-none pb-1 transition-colors"
                />
              ) : (
                <h3 className="text-sm font-black text-slate-800 dark:text-white leading-snug mb-4">{(selectedTask as any).summary}</h3>
              )}
              
              {/* Detailed properties fields */}
              <div className="space-y-3.5 mb-6 text-xs text-left">
                {selectedTask.dueDate && (
                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                    <CalendarIcon className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span>Hạn chót: <b className="text-slate-800 dark:text-slate-200">{selectedTask.dueDate}</b></span>
                  </div>
                )}
                
                {(selectedTask as any).start?.dateTime && (
                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                    <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span>Thời gian: <b className="text-slate-800 dark:text-slate-200">{new Date((selectedTask as any).start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date((selectedTask as any).end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</b></span>
                  </div>
                )}

                {/* Priority Selector */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Tag className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span className="shrink-0 w-24">Độ ưu tiên:</span>
                    <select
                      value={selectedTask.priority}
                      onChange={e => handleModalUpdateField('priority', e.target.value as Priority)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 cursor-pointer font-bold"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                )}

                {/* Status Selector */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span className="shrink-0 w-24">Trạng thái:</span>
                    <select
                      value={selectedTask.status}
                      onChange={e => handleModalUpdateField('status', e.target.value as TaskStatus)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 cursor-pointer font-bold"
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
                    <UserCheck className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span className="shrink-0 w-24">Phụ trách:</span>
                    <select
                      value={selectedTask.assigneeId || ''}
                      onChange={e => handleModalUpdateField('assigneeId', e.target.value || null)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 cursor-pointer font-bold"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none resize-none font-semibold text-slate-600 dark:text-slate-300 transition-colors focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  (selectedTask as any).description && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 leading-normal max-h-36 overflow-y-auto font-medium">
                      {(selectedTask as any).description}
                    </div>
                  )
                )}
              </div>

              <div className="flex gap-2.5">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-105 text-xs font-black text-white shadow-xs transition-all cursor-pointer text-center"
                >
                  Hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE QUICK TASK/EVENT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 modal-backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}
              className="absolute inset-0" />
            <motion.div initial={{ scale: 0.94, y: 15, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, y: 15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="modal-glass-card rounded-3xl shadow-2xl w-full max-w-md p-6 relative border border-white/80 dark:border-slate-800/80 overflow-hidden text-left select-none z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Lên lịch: {clickedDate} lúc {clickedHour}:00</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateQuickItem} className="space-y-4 text-xs text-left">
                {/* Switch Type Option */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950/40 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800 select-none">
                  <button type="button" onClick={() => setCreateType('task')}
                    className={`py-1.5 rounded-lg text-[10px] font-black text-center cursor-pointer transition-all ${createType === 'task' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                    Công việc mới
                  </button>
                  <button type="button" onClick={() => setCreateType('event')}
                    className={`py-1.5 rounded-lg text-[10px] font-black text-center cursor-pointer transition-all ${createType === 'event' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-slate-200/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                    Sự kiện Google
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Tiêu đề</label>
                  <input type="text" value={quickTitle} onChange={e => setQuickTitle(e.target.value)} required placeholder="Nhập tiêu đề..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none transition-colors font-semibold text-slate-800 dark:text-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Mô tả</label>
                  <textarea value={quickDesc} onChange={e => setQuickDesc(e.target.value)} rows={2.5} placeholder="Nhập ghi chú chi tiết..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none resize-none transition-colors font-semibold text-slate-800 dark:text-white" />
                </div>

                {createType === 'task' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Độ ưu tiên</label>
                      <select value={quickPriority} onChange={e => setQuickPriority(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                        <option value="urgent">Khẩn cấp</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Người phụ trách</label>
                      <select value={quickAssigneeId} onChange={e => setQuickAssigneeId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                        <option value="">Chưa phân công</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Bắt đầu</label>
                      <input type="time" value={quickStartTime} onChange={e => setQuickStartTime(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none cursor-pointer font-bold text-slate-700 dark:text-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Kết thúc</label>
                      <input type="time" value={quickEndTime} onChange={e => setQuickEndTime(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none cursor-pointer font-bold text-slate-700 dark:text-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Màu nhãn</label>
                      <select value={quickEventColor} onChange={e => setQuickEventColor(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none cursor-pointer font-black text-slate-700 dark:text-slate-200">
                        <option value="#7B61FF" style={{ color: '#7B61FF' }}>Indigo</option>
                        <option value="#10b981" style={{ color: '#10b981' }}>Emerald</option>
                        <option value="#ef4444" style={{ color: '#ef4444' }}>Rose</option>
                        <option value="#f59e0b" style={{ color: '#f59e0b' }}>Amber</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition-colors cursor-pointer text-center font-black"
                  >
                    Xếp lịch
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
