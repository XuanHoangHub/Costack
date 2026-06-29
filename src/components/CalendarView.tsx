"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User } from '../types';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  RefreshCw, CheckCircle2, Sparkles, Check, Plus, X,
  Search, CalendarDays, Filter, Info, Trash2, ArrowRight
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
  // Navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDragOverDate, setActiveDragOverDate] = useState<string | null>(null);

  // Filters
  const [showTasks, setShowTasks] = useState<boolean>(true);
  const [showGcal, setShowGcal] = useState<boolean>(true);
  const [showHolidays, setShowHolidays] = useState<boolean>(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [clickedDate, setClickedDate] = useState<string>('');
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickDesc, setQuickDesc] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [quickAssigneeId, setQuickAssigneeId] = useState<string>('');
  const [quickStartTime, setQuickStartTime] = useState<string>('09:00');
  const [quickEndTime, setQuickEndTime] = useState<string>('10:00');
  const [quickEventColor, setQuickEventColor] = useState<string>('#4285F4');
  const [createType, setCreateType] = useState<'task' | 'event'>('task');

  // Simulating Google Calendar Connection
  const [gcalConnected, setGcalConnected] = useState<boolean>(false);
  const [gcalUserEmail, setGcalUserEmail] = useState<string>('');
  const [syncingGcal, setSyncingGcal] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Local/Offline mock google events
  const [gcalEvents, setGcalEvents] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('avaxa_local_calendar_events');
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {}
    return [
      { id: 'mock-1', summary: 'Product Direction Meeting 🚀', description: 'Preliminary Kanban v2.5 review', start: { dateTime: '2026-06-12T10:00:00+07:00' }, end: { dateTime: '2026-06-12T11:00:00+07:00' }, color: '#4285F4', isGoogleEvent: true },
      { id: 'mock-2', summary: 'Calendar Visualization Improvement 📅', description: 'Polished UI/UX for smooth experience', start: { dateTime: '2026-06-19T14:30:00+07:00' }, end: { dateTime: '2026-06-19T16:00:00+07:00' }, color: '#34A853', isGoogleEvent: true },
      { id: 'mock-3', summary: 'AI Review & Planning session 🧠', description: 'Optimizing prompts for AI assistant', start: { dateTime: '2026-06-25T09:00:00+07:00' }, end: { dateTime: '2026-06-25T10:30:00+07:00' }, color: '#EA4335', isGoogleEvent: true }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('avaxa_local_calendar_events', JSON.stringify(gcalEvents));
    } catch (e) {}
  }, [gcalEvents]);

  // Sync Log action helper
  const addLocalSyncLog = (action: string) => {
    onAddSyncLog(action);
  };

  // Google Calendar Connection simulation
  const handleConnectGcal = () => {
    if (gcalConnected) {
      setGcalConnected(false);
      setGcalUserEmail('');
      triggerToast?.('info', t('gcalDisconnected'), t('syncRemovedAccount'));
      return;
    }

    setSyncingGcal(true);
    setSyncProgress(10);
    setSyncLogs([t('gcalConnectProcess')]);

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncingGcal(false);
          setGcalConnected(true);
          setGcalUserEmail('avaxa.productivity@gmail.com');
          triggerToast?.('success', t('gcalConnectSuccess'), t('gcalSyncedEvents'));
          return 100;
        }
        const next = prev + 30;
        if (next === 40) {
          setSyncLogs(l => [...l, 'Connected to account: avaxa.productivity@gmail.com', t('gcalLoadingSchedule')]);
        } else if (next === 70) {
          setSyncLogs(l => [...l, t('gcalDecodingToken'), t('gcalLoadingEvents')]);
        }
        return next;
      });
    }, 800);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
    (window as any).playSystemSound?.('click');
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (activeDragOverDate !== dateStr) {
      setActiveDragOverDate(dateStr);
    }
  };

  const handleDragLeave = () => {
    setActiveDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setActiveDragOverDate(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const findTask = tasks.find(t => t.id === taskId);
    if (findTask && onUpdateTask) {
      const oldDate = findTask.dueDate;
      const updatedTask = { ...findTask, dueDate: dateStr };
      onUpdateTask(updatedTask);
      (window as any).playSystemSound?.('success');
      addLocalSyncLog(`Rescheduled task "${findTask.title}" to ${dateStr}`);
      triggerToast?.('success', t('eventCreated'), `Moved "${findTask.title}" to ${dateStr}`);
    }
  };

  // Add custom event/task from grid click
  const handleGridCellClick = (dateStr: string) => {
    setClickedDate(dateStr);
    setQuickTitle('');
    setQuickDesc('');
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
        subtasks: []
      });
      triggerToast?.('success', t('newTaskAdded'), t('taskAddedSuccess', quickTitle));
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
      triggerToast?.('success', t('eventCreated'), t('taskScheduledSuccess', quickTitle));
    }

    setShowAddModal(false);
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

  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTasksForDate = (dateStr: string) => {
    if (!showTasks) return [];
    return tasks.filter(t => t.dueDate === dateStr && (searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true));
  };

  const getEventsForDate = (dateStr: string) => {
    const evts: any[] = [];
    
    if (showGcal) {
      gcalEvents.forEach(e => {
        const startStr = e.start.dateTime ? e.start.dateTime.split('T')[0] : e.start.date;
        if (startStr === dateStr && (searchQuery ? e.summary.toLowerCase().includes(searchQuery.toLowerCase()) : true)) {
          evts.push(e);
        }
      });
    }

    // Add Vietnamese national holidays mock
    if (showHolidays) {
      const holidaysMap: Record<string, { summary: string; color: string }> = {
        '2026-01-01': { summary: "New Year's Day 🎉", color: '#EF4444' },
        '2026-04-30': { summary: 'Liberation Day 🇻🇳', color: '#EF4444' },
        '2026-05-01': { summary: 'International Labor Day 🛠️', color: '#EF4444' },
        '2026-09-02': { summary: 'National Day 🇻🇳', color: '#EF4444' },
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

  // Nav actions
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Unscheduled tasks list
  const unscheduledTasks = tasks.filter(t => !t.dueDate);

  // Month rendering details
  const daysInMonth = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Week rendering details
  const daysInWeek = getDaysInWeek(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full font-sans select-none pb-8 text-slate-800 animate-fadeIn">
      {/* ── LEFT SIDEBAR (Mini calendar, Quick Filters, Connect Gcal) ── */}
      <div className="w-full lg:w-72 flex flex-col gap-5 shrink-0 text-left">
        
        {/* Connection Google Calendar simulation Card */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
          
<h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">{t('cloudSync')}</h4>
           
          {gcalConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">G</div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-black text-blue-650 truncate">{gcalUserEmail}</span>
                  <span className="block text-[9px] text-blue-400 font-bold uppercase mt-0.5">{t('gcalConnected')}</span>
                </div>
              </div>
              <button 
                onClick={handleConnectGcal}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 rounded-xl text-[11px] font-bold text-slate-500 transition-all cursor-pointer text-center animate-pulse"
              >
                {t('disconnectGcal')}
              </button>
            </div>
          ) : syncingGcal ? (
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500 animate-pulse">{t('syncingGcal')}</span>
                <span className="font-mono text-blue-600">{syncProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${syncProgress}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[8px] text-slate-300 leading-normal max-h-24 overflow-y-auto space-y-1">
                {syncLogs.map((log, i) => (
                  <div key={i} className="truncate">{log}</div>
                ))}
              </div>
            </div>
          ) : (
<button 
               onClick={handleConnectGcal}
               className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md hover:shadow-blue-500/10 active:shadow-none transition-all cursor-pointer"
             >
               <span>{t('connectGoogleCalendar')}</span>
             </button>
          )}
        </div>

{/* Filters Group card */}
         <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4">
           <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('calendarFilters')}</h4>
           
           <div className="space-y-2.5">
             <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
               <input type="checkbox" checked={showTasks} onChange={e => setShowTasks(e.target.checked)}
                 className="w-4 h-4 rounded border-slate-300 text-indigo-605 focus:ring-indigo-500 accent-indigo-600" />
               <span>{t('tasksAndTask', tasks.length)}</span>
             </label>
             <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
               <input type="checkbox" checked={showGcal} onChange={e => setShowGcal(e.target.checked)}
                 className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500 accent-blue-500" />
               <span>{t('googleEvents', gcalEvents.length)}</span>
             </label>
             <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
               <input type="checkbox" checked={showHolidays} onChange={e => setShowHolidays(e.target.checked)}
                 className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-550 accent-red-500" />
               <span>{t('nationalHolidays')}</span>
             </label>
           </div>
         </div>

{/* Unscheduled Tasks List card */}
         <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-3.5 flex-1 min-h-[250px] flex flex-col">
           <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('taskUnscheduled', unscheduledTasks.length)}</h4>
           
           <div className="flex-1 overflow-y-auto divide-y divide-slate-100 lg:max-h-[calc(100vh-420px)] max-h-80 pr-1.5 scrollbar-thin">
             {unscheduledTasks.length === 0 ? (
               <div className="py-8 text-center text-slate-400 space-y-1">
                 <Check className="w-5 h-5 mx-auto text-emerald-500" />
                 <p className="text-[10.5px] font-bold text-slate-650">{t('spotless')}</p>
                 <p className="text-[9.5px]">{t('allTasksScheduled')}</p>
               </div>
             ) : (
               unscheduledTasks.map(t => (
                 <div 
                   key={t.id}
                   draggable
                   onDragStart={e => handleDragStart(e, t.id)}
                   onDragEnd={handleDragEnd}
                   className="py-2.5 group cursor-grab active:cursor-grabbing hover:bg-indigo-50/20 transition-all rounded-lg"
                 >
                   <div className="flex items-start gap-2 justify-between">
                     <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-650 transition-colors truncate max-w-[170px]">{t.title}</span>
                     <span className={`text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                       t.priority === 'urgent' ? 'bg-rose-50 text-rose-600' :
                       t.priority === 'high' ? 'bg-orange-50 text-orange-600' :
                       t.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-100 text-slate-500'
                     }`}>
                       {t.priority}
                     </span>
                   </div>
                   {t.description && <p className="text-[9.5px] text-slate-400 truncate mt-1">{t.description}</p>}
                 </div>
               ))
             )}
           </div>
           
           <p className="text-[9px] text-slate-400 text-center font-medium bg-slate-50 py-1.5 rounded-xl border border-slate-100">💡 {t('dragTaskToSchedule')}</p>
         </div>

      </div>

      {/* ── RIGHT MAIN GRID (Main Calendar Views) ── */}
      <div className="flex-1 p-5 rounded-3xl bg-white border border-slate-200/60 shadow-[0_4px_25px_rgba(0,0,0,0.012)] flex flex-col gap-4">
        
        {/* Calendar Header with navigation controls and switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
<h2 className="text-lg font-black tracking-tight text-slate-900 capitalize">
               {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
               {viewMode === 'week' && `${t('weekNumMonth', Math.ceil(currentDate.getDate() / 7), monthNames[currentDate.getMonth()])}`}
               {viewMode === 'day' && `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
             </h2>
             <div className="flex items-center gap-0.5 border border-slate-200/70 p-0.5 rounded-lg bg-slate-50/50">
               <button onClick={handlePrev} className="p-1 rounded hover:bg-white hover:shadow-2xs transition-all cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
               <button onClick={handleToday} className="px-2 py-0.5 rounded text-[10px] font-black uppercase hover:bg-white hover:shadow-2xs transition-all cursor-pointer">{t('todayBtn')}</button>
               <button onClick={handleNext} className="p-1 rounded hover:bg-white hover:shadow-2xs transition-all cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
             </div>
           </div>

           <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/65 select-none">
             {[
               { id: 'month', label: t('monthView') },
               { id: 'week', label: t('weekView') },
               { id: 'day', label: t('dayView') }
             ].map(m => (
               <button 
                 key={m.id}
                 onClick={() => setViewMode(m.id as any)}
                 className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${viewMode === m.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20' : 'text-slate-400 hover:text-slate-700'}`}
               >
                 {m.label}
               </button>
             ))}
           </div>
        </div>

        {/* Main interactive grid content */}
        <div className="flex-1 overflow-x-auto min-w-[600px] scrollbar-none">
          
          {/* A. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-150">
{/* Day headers */}
               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(header => (
                 <div key={header} className="bg-slate-50/80 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase select-none">
                   {header}
                 </div>
               ))}
              
              {/* Calendar cell boxes */}
              {daysInMonth.map((day, idx) => {
                const dateStr = formatDateString(day.date);
                const dayTasks = getTasksForDate(dateStr);
                const dayEvents = getEventsForDate(dateStr);
                const isToday = formatDateString(new Date()) === dateStr;
                const isDragOver = activeDragOverDate === dateStr;

                return (
                  <div 
                    key={idx}
                    onDragOver={e => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, dateStr)}
                    onClick={() => handleGridCellClick(dateStr)}
                    className={`min-h-[95px] bg-white p-2 relative flex flex-col gap-1 transition-all group text-left ${
                      day.isCurrentMonth ? 'text-slate-800' : 'text-slate-300 opacity-45'
                    } ${isToday ? 'bg-indigo-50/10' : ''} ${isDragOver ? 'bg-indigo-50/60 ring-2 ring-indigo-500/50' : 'hover:bg-slate-50/30'}`}
                  >
                    {/* Day number header */}
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-indigo-650 text-white shadow-sm' : ''
                      }`}>{day.date.getDate()}</span>
                      
                      <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-slate-100 text-slate-450 hover:text-indigo-650 transition-all cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Scrollable event lists in cell */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[55px] scrollbar-none">
                      {dayEvents.map((evt, i) => (
                        <div 
                          key={evt.id || i}
                          onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold text-white truncate shadow-2xs cursor-pointer hover:brightness-95 transition-all select-none"
                          style={{ backgroundColor: evt.color || '#4285F4' }}
                        >
                          {evt.summary}
                        </div>
                      ))}
                      {dayTasks.map(task => (
                        <div 
                          key={task.id}
                          draggable
                          onDragStart={e => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-black truncate shadow-2xs cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all border flex items-center gap-1 ${
                            task.status === 'completed' 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600 line-through' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.priority === 'urgent' ? 'bg-rose-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-yellow-400' : 'bg-slate-400'
                          }`} />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* B. WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-150">
{/* Header Days of Week row */}
               <div className="grid grid-cols-8 gap-px bg-slate-100 border-b border-slate-150">
                 <div className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400">{t('timeCol')}</div>
                 {daysInWeek.map((day, idx) => {
                   const dateStr = formatDateString(day);
                   const isToday = formatDateString(new Date()) === dateStr;
                   return (
                     <div key={idx} className={`bg-slate-50 py-2.5 text-center flex flex-col items-center justify-center gap-1 ${isToday ? 'bg-indigo-50/20' : ''}`}>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                         {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}
                       </span>
                       <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${isToday ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-700'}`}>
                         {day.getDate()}
                       </span>
                     </div>
                   );
                 })}
               </div>

              {/* Hour timeblock rows */}
              <div className="min-h-[400px] h-[calc(100vh-320px)] overflow-y-auto divide-y divide-slate-100">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-px bg-slate-100 text-left">
                    {/* Time cell label */}
                    <div className="bg-white py-3 pr-2 text-right text-[10px] font-semibold text-slate-400 font-mono select-none">
                      {`${String(hour).padStart(2, '0')}:00`}
                    </div>
                    {/* 7 Day cells for this hour block */}
                    {daysInWeek.map((day, dIdx) => {
                      const dateStr = formatDateString(day);
                      const dayTasks = getTasksForDate(dateStr);
                      const dayEvents = getEventsForDate(dateStr).filter(e => {
                        const time = e.start.dateTime ? e.start.dateTime.split('T')[1].split(':')[0] : '09';
                        return Number(time) === hour;
                      });

                      return (
                        <div 
                          key={dIdx}
                          onClick={() => handleGridCellClick(dateStr)}
                          className="bg-white min-h-[44px] p-1 relative flex flex-col gap-0.5 hover:bg-slate-50/30 transition-colors"
                        >
                          {dayEvents.map((evt, idx) => (
                            <div 
                              key={evt.id || idx}
                              onClick={e => { e.stopPropagation(); setSelectedTask(evt); }}
                              className="px-1 py-0.5 rounded text-[8px] font-extrabold text-white truncate shadow-3xs cursor-pointer hover:brightness-95 select-none"
                              style={{ backgroundColor: evt.color || '#4285F4' }}
                            >
                              {evt.summary}
                            </div>
                          ))}
                          {hour === 9 && dayTasks.slice(0, 2).map(task => (
                            <div 
                              key={task.id}
                              onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
className="px-1 py-0.5 rounded text-[8px] font-black bg-white border border-slate-200/60 text-slate-700 truncate shadow-3xs hover:border-indigo-500 select-none flex items-center gap-0.5 cursor-pointer"
                             >
                              <span className="w-1 h-1 rounded-full bg-indigo-500" />
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. DAY VIEW */}
          {viewMode === 'day' && (
            <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-150 relative text-left">
{/* Day header banner */}
               <div className="bg-slate-50 py-3.5 px-5 border-b border-slate-150 flex items-center justify-between">
                 <div>
                   <h3 className="text-xs font-black uppercase text-indigo-650 tracking-wider">{t('today')}</h3>
                   <span className="text-base font-black text-slate-800">{currentDate.getDate()} {monthNames[currentDate.getMonth()]}, {currentDate.getFullYear()}</span>
                 </div>
                 <button 
                   onClick={() => handleGridCellClick(formatDateString(currentDate))}
                   className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-755 text-white font-bold text-[10px] uppercase rounded-xl transition-all shadow-sm cursor-pointer"
                 >
                   <Plus className="w-3 h-3" /> {t('addEvent')}
                 </button>
               </div>

              {/* Day hour list */}
              <div className="min-h-[400px] h-[calc(100vh-320px)] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                {(() => {
                  const dateStr = formatDateString(currentDate);
                  const dayTasks = getTasksForDate(dateStr);
                  const dayEvents = getEventsForDate(dateStr);

                  return hours.map(hour => {
                    const hourEvents = dayEvents.filter(e => {
                      const time = e.start.dateTime ? e.start.dateTime.split('T')[1].split(':')[0] : '09';
                      return Number(time) === hour;
                    });
                    
                    return (
                      <div key={hour} className="flex gap-4 items-start py-2.5 px-3 hover:bg-slate-50/20 rounded-xl transition-colors text-left">
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono w-10 shrink-0 text-right mt-0.5">{`${String(hour).padStart(2, '0')}:00`}</span>
                        <div className="flex-1 flex flex-wrap gap-2 min-h-[30px]">
                          {hourEvents.map((evt, idx) => (
                            <div 
                              key={evt.id || idx}
                              onClick={() => setSelectedTask(evt)}
                              className="px-3 py-1.5 rounded-2xl text-[10px] font-extrabold text-white shadow-sm hover:brightness-95 transition-all cursor-pointer flex flex-col gap-0.5"
                              style={{ backgroundColor: evt.color || '#4285F4' }}
                            >
                              <span>{evt.summary}</span>
                              {evt.description && <span className="text-[8px] opacity-80 font-medium truncate max-w-[180px]">{evt.description}</span>}
                            </div>
                          ))}
                          
                          {/* Render tasks at 9 AM hour slot as summary default */}
                          {hour === 9 && dayTasks.map(task => (
                            <div 
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`px-3 py-1.5 rounded-2xl text-[10px] font-black border flex items-center gap-1.5 shadow-sm cursor-pointer ${
                                task.status === 'completed' 
                                  ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600 line-through' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-500'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                task.priority === 'urgent' ? 'bg-rose-500 animate-pulse' :
                                task.priority === 'high' ? 'bg-orange-500' :
                                task.priority === 'medium' ? 'bg-yellow-400' : 'bg-slate-400'
                              }`} />
                              <span>{task.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── INTERACTIVE TASK DETAIL OVERLAY MODAL ── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 relative border border-slate-100/60 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-slate-500/5 blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-3">
<span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                   (selectedTask as any).isGoogleEvent ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-605'
                 }`}>
                   {(selectedTask as any).isGoogleEvent ? t('eventLabel') : t('taskLabel')}
                 </span>
                <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              <h3 className="text-base font-black text-slate-900 leading-snug mb-3">{(selectedTask as any).summary || selectedTask.title}</h3>
              
<div className="space-y-2.5 mb-6 text-xs text-left">
                 {selectedTask.dueDate && (
                   <div className="flex items-center gap-2 text-slate-550">
                     <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                     <span>{t('deadlineLabel')}: <b>{selectedTask.dueDate}</b></span>
                   </div>
                 )}
                 {(selectedTask as any).start?.dateTime && (
                   <div className="flex items-center gap-2 text-slate-550">
                     <Clock className="w-3.5 h-3.5 text-slate-400" />
                     <span>{t('timeRangeLabel')}: <b>{new Date((selectedTask as any).start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date((selectedTask as any).end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</b></span>
                   </div>
                 )}
                 {selectedTask.priority && (
                   <div className="flex items-center gap-2 text-slate-550">
                     <span className="text-slate-400 font-bold tracking-widest uppercase text-[9px] w-12">{t('priorityLabel')}:</span>
                     <span className="capitalize font-bold">{selectedTask.priority}</span>
                   </div>
                 )}
                 {((selectedTask as any).description || selectedTask.description) && (
                   <div className="pt-2 border-t border-slate-100 text-slate-500 leading-relaxed max-h-36 overflow-y-auto">
                     {(selectedTask as any).description || selectedTask.description}
                   </div>
                 )}
               </div>

               <div className="flex gap-2">
                 <button 
                   onClick={() => setSelectedTask(null)}
                   className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs font-bold text-slate-650 transition-colors cursor-pointer text-center"
                  >
                   {t('closeBtn')}
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
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 relative border border-slate-100/60 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-650" />
                  <h3 className="text-sm font-black text-slate-900">{t('quickSchedule', clickedDate)}</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              <form onSubmit={handleCreateQuickItem} className="space-y-3.5 text-xs text-left">
{/* Switch type */}
                 <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/65">
                   <button type="button" onClick={() => setCreateType('task')}
                     className={`py-1.5 rounded-md text-[10.5px] font-bold text-center cursor-pointer transition-colors ${createType === 'task' ? 'bg-white text-indigo-650 shadow-2xs' : 'text-slate-400 hover:text-slate-700'}`}>
                     {t('taskType')}
                   </button>
                   <button type="button" onClick={() => setCreateType('event')}
                     className={`py-1.5 rounded-md text-[10.5px] font-bold text-center cursor-pointer transition-colors ${createType === 'event' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'}`}>
                     {t('eventType')}
                   </button>
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400">{t('title')}</label>
                   <input type="text" value={quickTitle} onChange={e => setQuickTitle(e.target.value)} required placeholder={t('quickTitlePlaceholder')}
                     className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 focus:border-indigo-500 outline-none transition-colors" />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400">{t('description')}</label>
                   <textarea value={quickDesc} onChange={e => setQuickDesc(e.target.value)} rows={2} placeholder={t('quickDescPlaceholder')}
                     className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 focus:border-indigo-500 outline-none resize-none transition-colors" />
                 </div>

{createType === 'task' ? (
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1 text-left">
                       <label className="text-[10px] font-black uppercase text-slate-400">{t('priority')}</label>
                       <select value={quickPriority} onChange={e => setQuickPriority(e.target.value as any)}
                         className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 focus:border-indigo-500 outline-none cursor-pointer transition-colors">
                         <option value="low">{t('low')}</option>
                         <option value="medium">{t('medium')}</option>
                         <option value="high">{t('high')}</option>
                         <option value="urgent">{t('urgent')}</option>
                       </select>
                     </div>
                     <div className="space-y-1 text-left">
                       <label className="text-[10px] font-black uppercase text-slate-400">{t('assignee')}</label>
                       <select value={quickAssigneeId} onChange={e => setQuickAssigneeId(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 focus:border-indigo-500 outline-none cursor-pointer">
                         <option value="">{t('notAssigned')}</option>
                         {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                     </div>
                   </div>
                 ) : (
                   <div className="grid grid-cols-3 gap-2">
                     <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400">{t('startDate')}</label>
                       <input type="time" value={quickStartTime} onChange={e => setQuickStartTime(e.target.value)}
                         className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 outline-none cursor-pointer" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400">{t('dueDate')}</label>
                       <input type="time" value={quickEndTime} onChange={e => setQuickEndTime(e.target.value)}
                         className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 outline-none cursor-pointer" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400">{t('colorLabel')}</label>
                       <select value={quickEventColor} onChange={e => setQuickEventColor(e.target.value)}
                         className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-slate-700/60 outline-none cursor-pointer font-bold">
                         <option value="#4285F4" style={{ color: '#4285F4' }}>{t('blue')}</option>
                         <option value="#34A853" style={{ color: '#34A853' }}>{t('green')}</option>
                         <option value="#EA4335" style={{ color: '#EA4335' }}>{t('red')}</option>
                         <option value="#FBBC05" style={{ color: '#FBBC05' }}>{t('yellow')}</option>
                       </select>
                     </div>
                   </div>
                 )}

<div className="flex gap-2.5 pt-2">
                   <button type="button" onClick={() => setShowAddModal(false)}
                     className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-105 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-slate-650 cursor-pointer text-center"
                   >
                     {t('cancel')}
                   </button>
                   <button type="submit"
                     className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-105 transition-all cursor-pointer text-center"
                     style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
                   >
                     {t('createSchedule')}
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
