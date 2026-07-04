"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Priority, TaskStatus } from '../types';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  RefreshCw, CheckCircle2, Sparkles, Check, Plus, X,
  Search, Filter, Info, Trash2, ArrowRight, UserCheck, Users,
  ListPlus, Settings, CalendarDays, Eye, Edit3, Tag
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
}

export default function CalendarView({
  tasks,
  members,
  isOffline,
  onAddSyncLog,
  triggerToast,
  onAddTask,
  onUpdateTask
}: CalendarViewProps) {
  const { t } = useTranslation();
  
  // Auth state to identify "Me"
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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
  const [clickedDate, setClickedDate] = useState<string>('');
  const [clickedHour, setClickedHour] = useState<number>(9);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickDesc, setQuickDesc] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');
  const [quickAssigneeId, setQuickAssigneeId] = useState<string>('');
  const [quickStartTime, setQuickStartTime] = useState<string>('09:00');
  const [quickEndTime, setQuickEndTime] = useState<string>('10:00');
  const [quickEventColor, setQuickEventColor] = useState<string>('#6366f1');
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
    
    // Get relative dates to current date
    const d = new Date();
    const formatDate = (offset: number) => {
      const target = new Date(d);
      target.setDate(d.getDate() + offset);
      return target.toISOString().split('T')[0];
    };

    return [
      { id: 'mock-1', summary: 'Product Direction Meeting 🚀', description: 'Review Kanban v2.5 board designs', start: { dateTime: `${formatDate(0)}T10:00:00+07:00` }, end: { dateTime: `${formatDate(0)}T11:30:00+07:00` }, color: '#6366f1', isGoogleEvent: true },
      { id: 'mock-2', summary: 'Calendar UI Polish 📅', description: 'Perfecting layout grid and scroll behavior', start: { dateTime: `${formatDate(2)}T14:00:00+07:00` }, end: { dateTime: `${formatDate(2)}T15:30:00+07:00` }, color: '#10b981', isGoogleEvent: true },
      { id: 'mock-3', summary: 'AI Copilot Review 🧠', description: 'Tune prompt patterns for assistant chat', start: { dateTime: `${formatDate(-1)}T09:00:00+07:00` }, end: { dateTime: `${formatDate(-1)}T10:30:00+07:00` }, color: '#f59e0b', isGoogleEvent: true }
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

  // Google Calendar Connection simulation
  const handleConnectGcal = () => {
    if (gcalConnected) {
      setGcalConnected(false);
      setGcalUserEmail('');
      triggerToast?.('info', t('gcalDisconnected') || 'Google Calendar Disconnected', t('syncRemovedAccount') || 'Synced account removed.');
      return;
    }

    setSyncingGcal(true);
    setSyncProgress(10);
    setSyncLogs(['Initializing connection tunnel...']);

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncingGcal(false);
          setGcalConnected(true);
          setGcalUserEmail('avaxa.productivity@gmail.com');
          triggerToast?.('success', t('gcalConnectSuccess') || 'Connected successfully', t('gcalSyncedEvents') || 'Google Calendar events successfully synced.');
          return 100;
        }
        const next = prev + 30;
        if (next === 40) {
          setSyncLogs(l => [...l, 'Connected as avaxa.productivity@gmail.com', 'Requesting workspace read scopes...']);
        } else if (next === 70) {
          setSyncLogs(l => [...l, 'Received secure OAuth scopes.', 'Synchronizing event timeline...']);
        }
        return next;
      });
    }, 600000 / 600000 * 800); // quick simulated interval
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
      triggerToast?.('success', 'Đã xếp lịch', `Đã chuyển "${findTask.title}" sang ${dateStr} lúc ${scheduledHour}:00`);
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
      triggerToast?.('success', t('newTaskAdded') || 'Task Created', t('taskAddedSuccess', quickTitle) || `Task "${quickTitle}" successfully added.`);
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
      triggerToast?.('success', t('eventCreated') || 'Event Created', `Đã xếp lịch sự kiện "${quickTitle}".`);
    }

    setShowAddModal(false);
  };

  // Detailed Modal Update
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
    
    // Previous month padding
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const padCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align Mon-Sun
    for (let i = padCount - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDate - i),
        isCurrentMonth: false
      });
    }
    
    // Current month dates
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month padding to fill grid
    const remaining = 42 - days.length;
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
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(date);
    monday.setDate(date.getDate() + distanceToMonday);
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
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

  // General Filtered Tasks list
  const getFilteredTasksForDate = (dateStr: string) => {
    if (!showTasks) return [];
    return tasks.filter(t => {
      const matchesDate = t.dueDate === dateStr;
      const matchesSearch = searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      const matchesMe = isMeMode ? (currentUser && t.assigneeId === currentUser.id) : true;
      const matchesPriority = priorityFilter === 'all' ? true : t.priority === priorityFilter;
      return matchesDate && matchesSearch && matchesMe && matchesPriority;
    });
  };

  const getFilteredEventsForDate = (dateStr: string) => {
    const evts: any[] = [];
    
    if (showGcal) {
      gcalEvents.forEach(e => {
        const startStr = e.start.dateTime ? e.start.dateTime.split('T')[0] : e.start.date;
        const matchesSearch = searchQuery ? e.summary.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        if (startStr === dateStr && matchesSearch) {
          evts.push(e);
        }
      });
    }

    if (showHolidays) {
      const holidaysMap: Record<string, { summary: string; color: string }> = {
        '2026-01-01': { summary: "New Year's Day 🎉", color: '#ef4444' },
        '2026-04-30': { summary: 'Liberation Day 🇻🇳', color: '#ef4444' },
        '2026-05-01': { summary: 'International Labor Day 🛠️', color: '#ef4444' },
        '2026-09-02': { summary: 'National Day 🇻🇳', color: '#ef4444' },
      };
      if (holidaysMap[dateStr]) {
        evts.push({
          id: `holiday-${dateStr}`,
          summary: holidaysMap[dateStr].summary,
          color: holidaysMap[dateStr].color,
          isHoliday: true
        });
      }
    }

    return evts;
  };

  // Nav Actions
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === '4day') d.setDate(d.getDate() - 4);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === '4day') d.setDate(d.getDate() + 4);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Unscheduled tasks
  const unscheduledTasks = tasks.filter(t => !t.dueDate);

  // Month details
  const daysInMonth = getDaysInMonth(currentDate);
  const daysInWeek = getDaysInWeek(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Hour list
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Priority color map helper (pastels)
  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', border: 'border-rose-100' };
      case 'high': return { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500', border: 'border-orange-100' };
      case 'medium': return { bg: 'bg-indigo-50', text: 'text-indigo-650', dot: 'bg-indigo-500', border: 'border-indigo-100' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-100' };
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full font-sans select-none pb-8 text-slate-800 animate-fadeIn">
      
      {/* ═══════════════ LEFT COLLAPSIBLE SIDEBAR ═══════════════ */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '18rem', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="w-full lg:w-72 flex flex-col gap-5 shrink-0 text-left overflow-hidden pr-1"
          >
            
            {/* Google Calendar Connection Card */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
              
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Liên kết bộ lịch</span>
              </h4>
               
              {gcalConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <div className="w-8 h-8 rounded-lg bg-indigo-650 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">G</div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-black text-indigo-700 truncate">{gcalUserEmail}</span>
                      <span className="block text-[8px] text-indigo-400 font-extrabold uppercase mt-0.5">Đã kết nối</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleConnectGcal}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[10px] font-bold text-slate-500 transition-colors cursor-pointer text-center"
                  >
                    Ngắt kết nối
                  </button>
                </div>
              ) : syncingGcal ? (
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500 animate-pulse">Đang đồng bộ...</span>
                    <span className="font-mono text-indigo-600">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${syncProgress}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-[8px] text-slate-300 leading-normal max-h-24 overflow-y-auto space-y-1 scrollbar-none">
                    {syncLogs.map((log, i) => (
                      <div key={i} className="truncate">{log}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleConnectGcal}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Đồng bộ Google Calendar</span>
                </button>
              )}
            </div>

            {/* Filter Card */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>Bộ lọc hiển thị</span>
              </h4>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={showTasks} onChange={e => setShowTasks(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer" />
                  <span>Công việc ({tasks.length})</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={showGcal} onChange={e => setShowGcal(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer" />
                  <span>Lịch Google ({gcalEvents.length})</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={showHolidays} onChange={e => setShowHolidays(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500 accent-rose-500 cursor-pointer" />
                  <span>Ngày lễ Việt Nam</span>
                </label>
              </div>

              {/* Priority filter */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[9px] font-black uppercase text-slate-400 block">Độ ưu tiên</label>
                <select 
                  value={priorityFilter} 
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 outline-none text-xs font-bold text-slate-650 cursor-pointer"
                >
                  <option value="all">Tất cả độ ưu tiên</option>
                  <option value="urgent">Khẩn cấp (Urgent)</option>
                  <option value="high">Cao (High)</option>
                  <option value="medium">Trung bình (Medium)</option>
                  <option value="low">Thấp (Low)</option>
                </select>
              </div>
            </div>

            {/* Unscheduled Tasks Card */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex-1 min-h-[250px] flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                <ListPlus className="w-3.5 h-3.5" />
                <span>Chưa lên lịch ({unscheduledTasks.length})</span>
              </h4>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 lg:max-h-[calc(100vh-420px)] max-h-64 pr-1.5 scrollbar-thin">
                {unscheduledTasks.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <Check className="w-5 h-5 mx-auto text-emerald-500 stroke-[3px]" />
                    <p className="text-[10px] font-black text-slate-650">Tuyệt vời!</p>
                    <p className="text-[9px]">Mọi việc đã được lên lịch.</p>
                  </div>
                ) : (
                  unscheduledTasks.map(t => {
                    const style = getPriorityStyle(t.priority);
                    return (
                      <div 
                        key={t.id}
                        draggable
                        onDragStart={e => handleDragStart(e, t.id)}
                        onDragEnd={handleDragEnd}
                        className="py-2.5 group cursor-grab active:cursor-grabbing hover:bg-slate-50 rounded-lg transition-colors px-1"
                      >
                        <div className="flex items-start gap-2 justify-between">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-650 transition-colors truncate max-w-[150px]">{t.title}</span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${style.bg} ${style.text} ${style.border} border`}>
                            {t.priority}
                          </span>
                        </div>
                        {t.description && <p className="text-[9.5px] text-slate-400 truncate mt-1">{t.description}</p>}
                      </div>
                    );
                  })
                )}
              </div>
              
              <p className="text-[8.5px] text-slate-400 text-center font-bold bg-slate-50 py-2 rounded-xl border border-slate-100 mt-3 select-none">
                💡 Kéo và thả việc vào lịch để định ngày
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR TOGGLE BUTTON ── */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="hidden lg:flex items-center justify-center w-6 h-10 rounded-r-xl border border-l-0 border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors shadow-2xs shrink-0 self-center cursor-pointer"
        title={isSidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── RIGHT MAIN GRID (Main Calendar Views) ── */}
      <div className="flex-1 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4 min-w-0">
        
        {/* Calendar Header with navigation controls and switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black tracking-tight text-slate-900 capitalize">
              {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === 'week' && `Tuần ${Math.ceil(currentDate.getDate() / 7)}, ${monthNames[currentDate.getMonth()]}`}
              {viewMode === '4day' && `4 Ngày tiếp theo`}
              {viewMode === 'day' && `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === 'schedule' && `Lịch trình chi tiết`}
            </h2>
            <div className="flex items-center gap-0.5 border border-slate-200/80 p-0.5 rounded-lg bg-slate-50">
              <button onClick={handlePrev} className="p-1 rounded hover:bg-white hover:shadow-2xs transition-all cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button onClick={handleToday} className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase hover:bg-white hover:shadow-2xs transition-all cursor-pointer">Hôm nay</button>
              <button onClick={handleNext} className="p-1 rounded hover:bg-white hover:shadow-2xs transition-all cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Controls: Search, Me Mode & View Toggles */}
          <div className="flex flex-wrap items-center gap-3 justify-end w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <input
                type="text"
                placeholder="Tìm công việc..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 outline-none w-40 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
              />
            </div>

            {/* Me / Team Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 select-none">
              <button 
                onClick={() => setIsMeMode(true)}
                className={`px-2.5 py-1 rounded text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                  isMeMode ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/20' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <UserCheck className="w-3 h-3" /> Của tôi
              </button>
              <button 
                onClick={() => setIsMeMode(false)}
                className={`px-2.5 py-1 rounded text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                  !isMeMode ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/20' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Users className="w-3 h-3" /> Cả nhóm
              </button>
            </div>

            {/* Views dropdown / buttons */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 select-none">
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
                  className={`px-3 py-1.5 rounded-md text-[10.5px] font-black transition-all cursor-pointer ${
                    viewMode === m.id 
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/10' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main interactive grid content */}
        <div className="flex-1 overflow-x-auto min-w-0">
          
          {/* A. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80 min-w-[700px]">
               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(header => (
                 <div key={header} className="bg-slate-50/80 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase select-none">
                   {header}
                 </div>
               ))}
              
              {daysInMonth.map((day, idx) => {
                const dateStr = formatDateString(day.date);
                const dayTasks = getFilteredTasksForDate(dateStr);
                const dayEvents = getFilteredEventsForDate(dateStr);
                const isToday = formatDateString(new Date()) === dateStr;
                const isDragOver = activeDragOverDate === dateStr;

                return (
                  <div 
                    key={idx}
                    onDragOver={e => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, dateStr)}
                    onClick={() => handleGridCellClick(dateStr)}
                    className={`min-h-[105px] bg-white p-2 relative flex flex-col gap-1.5 transition-colors group text-left ${
                      day.isCurrentMonth ? 'text-slate-800' : 'text-slate-300 opacity-40'
                    } ${isToday ? 'bg-indigo-50/5' : ''} ${isDragOver ? 'bg-indigo-50/40 ring-1 ring-indigo-500/30' : 'hover:bg-slate-50/30'}`}
                  >
                    {/* Day number header */}
                    <div className="flex justify-between items-center select-none">
                      <span className={`text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-slate-900 text-white shadow-xs' : ''
                      }`}>{day.date.getDate()}</span>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleGridCellClick(dateStr); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-650 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Scrollable event lists in cell */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70px] scrollbar-none">
                      {dayEvents.map((evt, i) => (
                        <div 
                          key={evt.id || i}
                          onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                          className="px-2 py-0.5 rounded-md text-[9px] font-bold text-white truncate shadow-3xs cursor-pointer hover:brightness-95 transition-all select-none"
                          style={{ backgroundColor: evt.color || '#6366f1' }}
                        >
                          {evt.summary}
                        </div>
                      ))}
                      {dayTasks.map(task => {
                        const style = getPriorityStyle(task.priority);
                        return (
                          <div 
                            key={task.id}
                            draggable
                            onDragStart={e => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold truncate border flex items-center gap-1 shadow-3xs cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all ${
                              task.status === 'completed' 
                                ? 'bg-emerald-50/60 border-emerald-100 text-emerald-600 line-through' 
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                            <span className="truncate">{task.title}</span>
                          </div>
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
            <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-200/80 min-w-[650px] relative">
              
              {/* Header Days Row */}
              <div className={`grid ${viewMode === 'week' ? 'grid-cols-8' : viewMode === '4day' ? 'grid-cols-5' : 'grid-cols-2'} gap-px bg-slate-100 border-b border-slate-200/85`}>
                <div className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase select-none">Giờ</div>
                {
                  (viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate]).map((day, idx) => {
                    const dateStr = formatDateString(day);
                    const isToday = formatDateString(new Date()) === dateStr;
                    return (
                      <div key={idx} className={`bg-slate-50 py-2.5 text-center flex flex-col items-center justify-center gap-1 select-none ${isToday ? 'bg-indigo-50/10' : ''}`}>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][day.getDay() === 0 ? 6 : day.getDay() - 1]}
                        </span>
                        <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${isToday ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700'}`}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })
                }
              </div>

              {/* Time grid body */}
              <div className="min-h-[450px] h-[calc(100vh-320px)] overflow-y-auto divide-y divide-slate-100 relative scrollbar-none">
                
                {/* 🔴 Current time line indicator */}
                {(() => {
                  const todayStr = formatDateString(new Date());
                  const activeDays = viewMode === 'week' ? daysInWeek : viewMode === '4day' ? getDays4Day(currentDate) : [currentDate];
                  const todayIdx = activeDays.findIndex(d => formatDateString(d) === todayStr);

                  if (todayIdx !== -1) {
                    const currentHour = now.getHours();
                    const currentMin = now.getMinutes();
                    // Each hour is 48px height (min-h-[48px]). Let's render the indicator line at correct top offset.
                    const topOffset = currentHour * 48 + (currentMin / 60) * 48;
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
                        <span className="w-2 h-2 rounded-full bg-rose-500 -ml-1 shrink-0" />
                        <div className="flex-1 h-0.5 bg-rose-500 shadow-2xs" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {hours.map(hour => (
                  <div key={hour} className={`grid ${viewMode === 'week' ? 'grid-cols-8' : viewMode === '4day' ? 'grid-cols-5' : 'grid-cols-2'} gap-px bg-slate-100`}>
                    
                    {/* Time Label column */}
                    <div className="bg-white py-3.5 pr-2.5 text-right text-[10px] font-bold text-slate-400 font-mono select-none">
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
                          className={`bg-white min-h-[48px] p-1 relative flex flex-col gap-1 transition-all ${
                            isDragOver ? 'bg-indigo-50/50 border-indigo-400/40 ring-1 ring-indigo-500/20' : 'hover:bg-slate-50/20'
                          }`}
                        >
                          {hourEvents.map((evt, idx) => (
                            <div 
                              key={evt.id || idx}
                              onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                              className="px-2 py-0.5 rounded-md text-[8.5px] font-bold text-white truncate shadow-3xs cursor-pointer hover:brightness-95 transition-all select-none"
                              style={{ backgroundColor: evt.color || '#6366f1' }}
                            >
                              {evt.summary}
                            </div>
                          ))}
                          {hourTasks.map(task => {
                            const style = getPriorityStyle(task.priority);
                            return (
                              <div 
                                key={task.id}
                                draggable
                                onDragStart={e => handleDragStart(e, task.id)}
                                onDragEnd={handleDragEnd}
                                onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                                className={`px-2 py-0.5 rounded-md text-[8.5px] font-black border flex items-center gap-1 shadow-3xs cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all truncate ${
                                  task.status === 'completed' 
                                    ? 'bg-emerald-50/60 border-emerald-100 text-emerald-600 line-through' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-500'
                                }`}
                              >
                                <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                                <span className="truncate">{task.title}</span>
                              </div>
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
                // Collect and group all events/tasks that have scheduled dates
                const allItems: { date: string; dateObj: Date; items: any[] }[] = [];
                
                // Scan next 14 days to group
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
                    <div className="py-16 text-center text-slate-400 bg-white border border-slate-200/80 rounded-2xl p-6">
                      <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <h4 className="text-sm font-black text-slate-700">Lịch trình trống</h4>
                      <p className="text-xs mt-1">Không có công việc hoặc sự kiện nào trong 2 tuần tới.</p>
                    </div>
                  );
                }

                return allItems.map((group, idx) => {
                  const isToday = formatDateString(new Date()) === group.date;
                  return (
                    <div key={idx} className="space-y-2.5">
                      <div className="flex items-center gap-2 select-none">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isToday ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isToday ? 'Hôm nay' : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][group.dateObj.getDay() === 0 ? 6 : group.dateObj.getDay() - 1]}
                        </span>
                        <h4 className="text-xs font-black text-slate-700">
                          {group.dateObj.getDate()} {monthNames[group.dateObj.getMonth()]}, {group.dateObj.getFullYear()}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                        {group.items.map((item, itemIdx) => {
                          const isGoogleEvent = !!item.isGoogleEvent;
                          const style = !isGoogleEvent ? getPriorityStyle(item.priority) : null;
                          
                          return (
                            <div 
                              key={item.id || itemIdx}
                              onClick={() => setSelectedTask(item)}
                              className="p-3 bg-white border border-slate-200/80 hover:border-indigo-400 rounded-xl shadow-2xs hover:shadow-sm cursor-pointer transition-all flex items-start gap-3 justify-between"
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                                    isGoogleEvent ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {isGoogleEvent ? 'Sự kiện' : 'Công việc'}
                                  </span>
                                  {!isGoogleEvent && (
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md ${style?.bg} ${style?.text} ${style?.border} border`}>
                                      {item.priority}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-bold text-slate-800 leading-snug truncate">{item.summary || item.title}</h5>
                                {item.description && <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>}
                              </div>

                              {/* Right details */}
                              <div className="text-right shrink-0 flex flex-col justify-between h-full space-y-2">
                                <span className="text-[9px] font-bold text-slate-400 font-mono flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {isGoogleEvent 
                                    ? new Date(item.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) 
                                    : `${item.custom_fields?.scheduledHour || 9}:00`
                                  }
                                </span>
                              </div>
                            </div>
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

      {/* ── INTERACTIVE TASK DETAIL EDIT OVERLAY MODAL ── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-slate-950/30 backdrop-blur-xs" />
            
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative border border-slate-150 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  (selectedTask as any).isGoogleEvent ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {(selectedTask as any).isGoogleEvent ? 'Google Event' : 'Avaxa Task'}
                </span>
                <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              {/* Editable Title */}
              {!(selectedTask as any).isGoogleEvent ? (
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={e => handleModalUpdateField('title', e.target.value)}
                  className="text-sm font-bold text-slate-800 leading-snug mb-3 w-full border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none pb-0.5 transition-colors"
                />
              ) : (
                <h3 className="text-sm font-bold text-slate-800 leading-snug mb-3">{(selectedTask as any).summary}</h3>
              )}
              
              {/* Detailed properties fields */}
              <div className="space-y-3 mb-6 text-xs text-left">
                {/* Time range label */}
                {selectedTask.dueDate && (
                  <div className="flex items-center gap-2.5 text-slate-500">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    <span>Hạn chót: <b>{selectedTask.dueDate}</b></span>
                  </div>
                )}
                
                {(selectedTask as any).start?.dateTime && (
                  <div className="flex items-center gap-2.5 text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Thời gian: <b>{new Date((selectedTask as any).start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date((selectedTask as any).end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</b></span>
                  </div>
                )}

                {/* Priority Selector (Only for tasks) */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="shrink-0 w-20">Độ ưu tiên:</span>
                    <select
                      value={selectedTask.priority}
                      onChange={e => handleModalUpdateField('priority', e.target.value as Priority)}
                      className="px-2 py-0.5 rounded border border-slate-200 outline-none bg-slate-50 cursor-pointer font-bold text-slate-700"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                )}

                {/* Status Selector (Only for tasks) */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="shrink-0 w-20">Trạng thái:</span>
                    <select
                      value={selectedTask.status}
                      onChange={e => handleModalUpdateField('status', e.target.value as TaskStatus)}
                      className="px-2 py-0.5 rounded border border-slate-200 outline-none bg-slate-50 cursor-pointer font-bold text-slate-700"
                    >
                      <option value="todo">Cần làm</option>
                      <option value="inprogress">Đang thực hiện</option>
                      <option value="review">Đang duyệt</option>
                      <option value="completed">Đã hoàn thành</option>
                    </select>
                  </div>
                )}

                {/* Assignee Selector (Only for tasks) */}
                {!(selectedTask as any).isGoogleEvent && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="shrink-0 w-20">Phụ trách:</span>
                    <select
                      value={selectedTask.assigneeId || ''}
                      onChange={e => handleModalUpdateField('assigneeId', e.target.value || null)}
                      className="px-2 py-0.5 rounded border border-slate-200 outline-none bg-slate-50 cursor-pointer text-slate-700 font-bold"
                    >
                      <option value="">Chưa phân công</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Editable description */}
                {!(selectedTask as any).isGoogleEvent ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Mô tả chi tiết</label>
                    <textarea
                      value={selectedTask.description || ''}
                      onChange={e => handleModalUpdateField('description', e.target.value)}
                      rows={3}
                      placeholder="Viết mô tả cho công việc này..."
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 outline-none resize-none font-medium text-slate-600 transition-colors focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  (selectedTask as any).description && (
                    <div className="pt-2 border-t border-slate-100 text-slate-500 leading-normal max-h-36 overflow-y-auto font-medium">
                      {(selectedTask as any).description}
                    </div>
                  )
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer text-center"
                >
                  Hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CREATE QUICK TASK/EVENT MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/30 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative border border-slate-150 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-650" />
                  <h3 className="text-sm font-black text-slate-900">Lên lịch ngày {clickedDate} lúc {clickedHour}:00</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              <form onSubmit={handleCreateQuickItem} className="space-y-3.5 text-xs text-left">
                {/* Switch Type */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 select-none">
                  <button type="button" onClick={() => setCreateType('task')}
                    className={`py-1.5 rounded-md text-[10px] font-black text-center cursor-pointer transition-colors ${createType === 'task' ? 'bg-white text-indigo-650 shadow-2xs border border-slate-200/10' : 'text-slate-400 hover:text-slate-700'}`}>
                    Công việc mới
                  </button>
                  <button type="button" onClick={() => setCreateType('event')}
                    className={`py-1.5 rounded-md text-[10px] font-black text-center cursor-pointer transition-colors ${createType === 'event' ? 'bg-white text-emerald-600 shadow-2xs border border-slate-200/10' : 'text-slate-400 hover:text-slate-700'}`}>
                    Sự kiện Google
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Tiêu đề</label>
                  <input type="text" value={quickTitle} onChange={e => setQuickTitle(e.target.value)} required placeholder="Nhập tiêu đề..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-colors font-medium text-slate-800" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Mô tả</label>
                  <textarea value={quickDesc} onChange={e => setQuickDesc(e.target.value)} rows={2} placeholder="Nhập ghi chú chi tiết..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none resize-none transition-colors font-medium text-slate-800" />
                </div>

                {createType === 'task' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400">Độ ưu tiên</label>
                      <select value={quickPriority} onChange={e => setQuickPriority(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none cursor-pointer font-bold text-slate-750">
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                        <option value="urgent">Khẩn cấp</option>
                      </select>
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400">Người phụ trách</label>
                      <select value={quickAssigneeId} onChange={e => setQuickAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none cursor-pointer font-bold text-slate-750">
                        <option value="">Chưa phân công</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Bắt đầu</label>
                      <input type="time" value={quickStartTime} onChange={e => setQuickStartTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none cursor-pointer font-bold text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Kết thúc</label>
                      <input type="time" value={quickEndTime} onChange={e => setQuickEndTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none cursor-pointer font-bold text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Màu nhãn</label>
                      <select value={quickEventColor} onChange={e => setQuickEventColor(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none cursor-pointer font-black text-slate-700">
                        <option value="#6366f1" style={{ color: '#6366f1' }}>Indigo</option>
                        <option value="#10b981" style={{ color: '#10b981' }}>Emerald</option>
                        <option value="#ef4444" style={{ color: '#ef4444' }}>Rose</option>
                        <option value="#f59e0b" style={{ color: '#f59e0b' }}>Amber</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-sm hover:brightness-105 transition-colors cursor-pointer text-center bg-slate-900 hover:bg-slate-800"
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
