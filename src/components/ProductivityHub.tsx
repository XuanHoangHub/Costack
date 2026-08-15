"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, Calendar, CheckCircle, Sparkles, TrendingUp, Compass, Clock, Award, 
  Smile, Moon, Brain, ChevronRight, Play, Pause, RotateCcw, Volume2, VolumeX,
  Plus, Trash2, Check, BarChart2, CalendarDays, ExternalLink, RefreshCw, Send, Flame
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User } from '../types';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../contexts/TranslationContext';
import { callAiApi } from '@/lib/aiClient';

interface ProductivityHubProps {
  tasks: Task[];
  members: User[];
  isOffline: boolean;
  currentUser?: any;
  onUpgradePremium?: () => void;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: 'success' | 'info' | 'assignment' | 'deadline' | 'comment' | 'message', title: string, message: string) => void;
}

interface Habit {
  id: string;
  name: string;
  history: Record<string, boolean>; // date string "YYYY-MM-DD" -> true/false
  createdAt: string;
  streak: number;
}

interface FocusSession {
  id: string;
  durationMinutes: number;
  type: 'work' | 'short' | 'long';
  timestamp: string;
  completed: boolean;
}

export default function ProductivityHub({
  tasks,
  members,
  isOffline,
  currentUser,
  onUpgradePremium,
  onAddSyncLog,
  triggerToast
}: ProductivityHubProps) {
  const { t, locale } = useTranslation();
  // Local storage keys
  const HABITS_STORAGE_KEY = 'apexa_productivity_habits';
  const FOCUS_LOG_STORAGE_KEY = 'apexa_productivity_focus_sessions';

  // State definitions
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const stored = localStorage.getItem(HABITS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'h1', name: locale === 'vi' ? 'Đánh giá Code & Thảo luận' : 'Code Review & Discussion', history: {}, createdAt: new Date().toISOString(), streak: 2 },
      { id: 'h2', name: locale === 'vi' ? 'Đọc tài liệu kỹ thuật' : 'Read Technical Docs', history: {}, createdAt: new Date().toISOString(), streak: 3 },
      { id: 'h3', name: locale === 'vi' ? 'Tập trung sâu 90 phút' : '90-min Deep Focus', history: {}, createdAt: new Date().toISOString(), streak: 0 },
      { id: 'h4', name: locale === 'vi' ? 'Uống đủ 2L nước' : 'Drink 2L Water', history: {}, createdAt: new Date().toISOString(), streak: 5 }
    ];
  });

  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => {
    try {
      const stored = localStorage.getItem(FOCUS_LOG_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'f1', durationMinutes: 25, type: 'work', timestamp: new Date(Date.now() - 25 * 60 * 1000 * 48).toISOString(), completed: true },
      { id: 'f2', durationMinutes: 25, type: 'work', timestamp: new Date(Date.now() - 25 * 60 * 1000 * 24).toISOString(), completed: true },
      { id: 'f3', durationMinutes: 5, type: 'short', timestamp: new Date(Date.now() - 5 * 60 * 1000 * 12).toISOString(), completed: true },
      { id: 'f4', durationMinutes: 25, type: 'work', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), completed: true }
    ];
  });

  const [newHabitName, setNewHabitName] = useState('');
  const [reportText, setReportText] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const prevOfflineRef = useRef<boolean>(isOffline);

  // Load habits and focus sessions from Supabase on init (if online)
  useEffect(() => {
    const fetchData = async () => {
      if (isOffline) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // 1. Fetch habits
        const { data: dbHabits } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (dbHabits && dbHabits.length > 0) {
          setHabits(dbHabits.map(h => ({
            id: h.id,
            name: h.name,
            history: h.history || {},
            createdAt: h.created_at || new Date().toISOString(),
            streak: h.streak || 0
          })));
        }

        // 2. Fetch focus sessions
        const { data: dbSessions } = await supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', session.user.id);

        if (dbSessions && dbSessions.length > 0) {
          setFocusSessions(dbSessions.map(f => ({
            id: f.id,
            durationMinutes: f.duration_minutes,
            type: f.type as any,
            timestamp: f.timestamp,
            completed: f.completed
          })));
        }
      } catch (e) {
        console.error('Lỗi khi tải dữ liệu năng suất từ Supabase:', e);
      }
    };

    fetchData();
  }, [isOffline]);

  // Sync offline local changes to Supabase when coming online
  useEffect(() => {
    if (prevOfflineRef.current && !isOffline) {
      const syncData = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          const userId = session.user.id;

          // Sync all habits
          if (habits.length > 0) {
            const habitsData = habits.map(h => ({
              id: h.id,
              name: h.name,
              history: h.history,
              streak: h.streak,
              user_id: userId
            }));
            await supabase.from('habits').upsert(habitsData);
          }

          // Sync all focus sessions
          if (focusSessions.length > 0) {
            const sessionsData = focusSessions.map(f => ({
              id: f.id,
              duration_minutes: f.durationMinutes,
              type: f.type,
              timestamp: f.timestamp,
              completed: f.completed,
              user_id: userId
            }));
            await supabase.from('focus_sessions').upsert(sessionsData);
          }
          
          if (onAddSyncLog) {
            onAddSyncLog('Bảng năng suất: Đồng bộ thói quen và Pomodoro thành công lên Supabase');
          }
        } catch (e) {
          console.error('Lỗi đồng bộ năng suất:', e);
        }
      };
      
      syncData();
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline, habits, focusSessions, onAddSyncLog]);
  
  // Pomodoro States
  const [pomoMode, setPomoMode] = useState<'work' | 'short' | 'long'>('work');
  const [pomoActive, setPomoActive] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(25 * 60);
  const [pomoTotalTime, setPomoTotalTime] = useState<number>(25 * 60);

  // Soundscape States (Audio synth ambient generator)
  const [activeSoundscape, setActiveSoundscape] = useState<'none' | 'rain' | 'alpha' | 'waves'>('none');
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<{
    source?: AudioNode;
    gainNode?: GainNode;
    oscillators?: OscillatorNode[];
  }>({});
  const handlePomoCompletedRef = useRef<() => void>(() => {});

  // Fetch current dates of the week
  const getDaysOfCurrentWeek = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const date = String(day.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${year}-${month}-${date}`,
        label: i === 6 ? 'CN' : `T${i + 2}`,
        dayNum: day.getDate(),
        isToday: day.toDateString() === today.toDateString()
      });
    }
    return days;
  }, []);

  const weekDays = getDaysOfCurrentWeek();

  // Save changes to local storage
  useEffect(() => {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(FOCUS_LOG_STORAGE_KEY, JSON.stringify(focusSessions));
  }, [focusSessions]);

  // Pomodoro dynamic tick
  useEffect(() => {
    let timerId: any;
    if (pomoActive && timeRemaining > 0) {
      timerId = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handlePomoCompletedRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [pomoActive, timeRemaining]);

  // Handle ambient Soundscape when state changes
  useEffect(() => {
    return () => {
      // Clean up synth nodes on unmount
      stopSoundscape();
    };
  }, []);

  // Soft synth sound creator for micro-feedback (disabled)
  const playSynthesizedSound = (_type?: 'spark' | 'bell' | 'fail') => {};

  // Soundscape management (disabled)
  const startSoundscape = (_type?: 'rain' | 'alpha' | 'waves') => {
    stopSoundscape();
    setActiveSoundscape('none');
  };

  const stopSoundscape = () => {
    try {
      if (soundNodesRef.current.source) {
        const src = soundNodesRef.current.source as AudioBufferSourceNode;
        src.stop();
      }
      if (soundNodesRef.current.oscillators) {
        soundNodesRef.current.oscillators.forEach(osc => {
          osc.stop();
        });
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    } catch (e) {
      // quiet fail
    }

    soundNodesRef.current = {};
    audioContextRef.current = null;
    setActiveSoundscape('none');
  };

  const handlePomoCompleted = () => {
    setPomoActive(false);
    playSynthesizedSound('bell');
    
    const minutes = pomoTotalTime / 60;
    const nextSession: FocusSession = {
      id: `f-${Date.now()}`,
      durationMinutes: minutes,
      type: pomoMode,
      timestamp: new Date().toISOString(),
      completed: true
    };

    setFocusSessions(prev => [nextSession, ...prev]);

    if (!isOffline) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('focus_sessions').upsert({
            id: nextSession.id,
            duration_minutes: nextSession.durationMinutes,
            type: nextSession.type,
            timestamp: nextSession.timestamp,
            completed: nextSession.completed,
            user_id: session.user.id
          }).then(({ error }) => {
            if (error) console.error(error);
          });
        }
      });
    }

    if (onAddSyncLog) {
      onAddSyncLog(
        locale === 'vi'
          ? `Bản ghi Pomodoro hoàn thành: ${pomoMode.toUpperCase()} trong ${minutes} phút.`
          : `Pomodoro session completed: ${pomoMode.toUpperCase()} for ${minutes} mins.`
      );
    }

    if (triggerToast) {
      triggerToast(
        'success',
        locale === 'vi' ? 'Pomodoro Hoàn Thành! 🎯' : 'Pomodoro Completed! 🎯',
        locale === 'vi' 
          ? `Bạn đã hoàn tất xuất sắc phiên ${pomoMode === 'work' ? 'Làm Việc Gấp Rút' : pomoMode === 'short' ? 'Nghỉ Ngơi Ngắn' : 'Nghỉ Ngơi Dài'} kéo dài ${minutes} phút.`
          : `You have successfully completed a ${pomoMode === 'work' ? 'Deep Work' : pomoMode === 'short' ? 'Short Break' : 'Long Break'} session of ${minutes} minutes.`
      );
    }

    // Auto toggle modes
    if (pomoMode === 'work') {
      setPomoMode('short');
      setTimeRemaining(5 * 60);
      setPomoTotalTime(5 * 60);
    } else {
      setPomoMode('work');
      setTimeRemaining(25 * 60);
      setPomoTotalTime(25 * 60);
    }
  };

  useEffect(() => {
    handlePomoCompletedRef.current = handlePomoCompleted;
  });

  // Pomodoro Actions
  const handleStartPomo = () => {
    setPomoActive(true);
    playSynthesizedSound('spark');
    if (onAddSyncLog) {
      onAddSyncLog(
        locale === 'vi'
          ? `Khởi động đồng hồ Pomodoro (${pomoMode.toUpperCase()})`
          : `Started Pomodoro timer (${pomoMode.toUpperCase()})`
      );
    }
  };

  const handlePausePomo = () => {
    setPomoActive(false);
    playSynthesizedSound('fail');
  };

  const handleResetPomo = () => {
    setPomoActive(false);
    const duration = pomoMode === 'work' ? 25 : pomoMode === 'short' ? 5 : 15;
    setTimeRemaining(duration * 60);
    setPomoTotalTime(duration * 60);
    playSynthesizedSound('fail');
  };

  const handleSetMode = (mode: 'work' | 'short' | 'long') => {
    setPomoActive(false);
    setPomoMode(mode);
    const duration = mode === 'work' ? 25 : mode === 'short' ? 5 : 15;
    setTimeRemaining(duration * 60);
    setPomoTotalTime(duration * 60);
    playSynthesizedSound('spark');
  };

  // Habit Actions
  const handleToggleHabit = (habitId: string, dateStr: string) => {
    playSynthesizedSound('spark');
    let updatedHabitObj: any = null;
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;

      const history = { ...habit.history };
      const completed = !history[dateStr];
      if (completed) {
        history[dateStr] = true;
      } else {
        delete history[dateStr];
      }

      // Compute streak length
      let streak = 0;
      const checkDate = new Date();
      while (true) {
        const yr = checkDate.getFullYear();
        const mo = String(checkDate.getMonth() + 1).padStart(2, '0');
        const dt = String(checkDate.getDate()).padStart(2, '0');
        const dStr = `${yr}-${mo}-${dt}`;
        
        if (history[dStr]) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      updatedHabitObj = {
        ...habit,
        history,
        streak
      };
      return updatedHabitObj;
    }));

    if (updatedHabitObj && !isOffline) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('habits').upsert({
            id: updatedHabitObj.id,
            name: updatedHabitObj.name,
            history: updatedHabitObj.history,
            streak: updatedHabitObj.streak,
            user_id: session.user.id
          }).then(({ error }) => {
            if (error) console.error('Error syncing habit check-in:', error);
          });
        }
      });
    }

    if (onAddSyncLog) {
      onAddSyncLog(`Cập nhật thói quen ngày ${dateStr}`);
    }
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: `h-${Date.now()}`,
      name: newHabitName.trim(),
      history: {},
      createdAt: new Date().toISOString(),
      streak: 0
    };

    setHabits(prev => [...prev, newHabit]);
    setNewHabitName('');
    playSynthesizedSound('spark');

    if (!isOffline) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('habits').upsert({
            id: newHabit.id,
            name: newHabit.name,
            history: newHabit.history,
            streak: newHabit.streak,
            user_id: session.user.id
          }).then(({ error }) => {
            if (error) console.error('Error syncing new habit:', error);
          });
        }
      });
    }

    if (onAddSyncLog) {
      onAddSyncLog(locale === 'vi' ? `Thêm thói quen mới: ${newHabit.name}` : `Added new habit: ${newHabit.name}`);
    }
    if (triggerToast) {
      triggerToast(
        'success',
        locale === 'vi' ? 'Thành Công' : 'Success',
        locale === 'vi' ? `Đã thêm thói quen theo dõi mới: "${newHabit.name}"` : `Added new tracking habit: "${newHabit.name}"`
      );
    }
  };

  const handleDeleteHabit = (id: string, name: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    playSynthesizedSound('fail');
    
    if (!isOffline) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('habits').delete().eq('id', id).eq('user_id', session.user.id).then(({ error }) => {
            if (error) console.error('Error deleting habit:', error);
          });
        }
      });
    }

    if (onAddSyncLog) {
      onAddSyncLog(locale === 'vi' ? `Xóa thói quen: ${name}` : `Removed habit: ${name}`);
    }
  };

  // Request AI Report
  const generateWeeklyProductivityReport = async () => {
    if (!currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    if (isOffline) {
      if (triggerToast) {
        triggerToast(
          'message',
          locale === 'vi' ? 'Ngoại tuyến' : 'Offline',
          locale === 'vi'
            ? 'Không thể kết xuất báo cáo hiệu năng AI khi ở chế độ ngoại tuyến.'
            : 'Cannot generate AI productivity report while offline.'
        );
      }
      return;
    }

    setGeneratingReport(true);
    setReportText('');

    try {
      const res = await callAiApi('/api/ai/productivity-report', { tasks, members });

      const data = await res.json();
      if (data.success) {
        setReportText(data.text);
        if (triggerToast) {
          triggerToast(
            'success',
            locale === 'vi' ? 'Kết Xuất Thành Công 📊' : 'Export Successful 📊',
            locale === 'vi'
              ? 'Báo cáo năng suất tuần và phân tích điểm nghẽn đội ngũ đã hoàn tất.'
              : 'Weekly productivity report and team bottleneck analysis are complete.'
          );
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error(err);
      setReportText(
        locale === 'vi'
          ? `### Báo Cáo Hiệu Năng Vận Hành
Lỗi khi liên hệ với trung tâm phân tích trí tuệ nhân tạo Gemini. Vui lòng kiểm tra lại API Key hoặc kết nối mạng của bạn.

**Các thông số ghi nhận nhanh:**
- **Tổng số việc đang vận hành**: ${tasks.length}
- **Đã hoàn thành**: ${tasks.filter(t => t.status === 'completed').length} việc
- **Số thành viên đội ngũ**: ${members.length} người
- **Đồng hồ ước tính**: ${tasks.reduce((acc, t) => acc + (t.hoursEstimate || 0), 0)} giờ
- **Thời gian đã thực hiện**: ${tasks.reduce((acc, t) => acc + (t.hoursLogged || 0), 0)} giờ.`
          : `### Operations Performance Report
Error contacting Gemini AI center. Please check your API Key or network connection.

**Metrics overview:**
- **Total active tasks**: ${tasks.length}
- **Completed**: ${tasks.filter(t => t.status === 'completed').length} tasks
- **Team members**: ${members.length} members
- **Estimated hours**: ${tasks.reduce((acc, t) => acc + (t.hoursEstimate || 0), 0)} hours
- **Logged hours**: ${tasks.reduce((acc, t) => acc + (t.hoursLogged || 0), 0)} hours.`
      );
      
      if (triggerToast) {
        triggerToast(
          'comment',
          locale === 'vi' ? 'Sự cố kết nối AI' : 'AI Connection Issue',
          locale === 'vi'
            ? 'Gợi ý báo cáo chuyển sang cấu trúc mẫu ngoại bang.'
            : 'Report suggestions switched to fallback schema.'
        );
      }
    } finally {
      setGeneratingReport(false);
    }
  };

  // Format countdown string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // SVG Progress Ring Circle Math
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = pomoTotalTime > 0 ? (timeRemaining / pomoTotalTime) * 100 : 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Render Eisenhower Matrix categories
  const getMatrixTasks = () => {
    const urgentImportant: Task[] = [];
    const importantNotUrgent: Task[] = [];
    const urgentNotImportant: Task[] = [];
    const neither: Task[] = [];

    tasks.forEach(t => {
      const isUrgent = t.priority === 'urgent' || t.priority === 'high';
      const isImportant = t.priority === 'high' || t.priority === 'medium';

      if (isUrgent && isImportant) {
        urgentImportant.push(t);
      } else if (!isUrgent && isImportant) {
        importantNotUrgent.push(t);
      } else if (isUrgent && !isImportant) {
        urgentNotImportant.push(t);
      } else {
        neither.push(t);
      }
    });

    return { urgentImportant, importantNotUrgent, urgentNotImportant, neither };
  };

  const matrix = getMatrixTasks();

  // Recharts Focus Hours dataset processing
  const getFocusTimeChartData = () => {
    // Collect last 7 days focus session totals
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayLabel = date.toLocaleDateString('vi-VN', { weekday: 'short' });
      const dateStrPrefix = date.toDateString();

      const matchedTimes = focusSessions
        .filter(s => s.completed && new Date(s.timestamp).toDateString() === dateStrPrefix)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      data.push({
        day: dayLabel,
        'Phút Tập Trung': matchedTimes,
        'Mục tiêu (60m)': 60
      });
    }
    return data;
  };

  const focusChartData = getFocusTimeChartData();

  // Dynamic calculations for the Achievements system
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const compPomosCount = focusSessions.filter(s => s.completed).length;
  const totalFocusMin = focusSessions.filter(s => s.completed).reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalCheckIns = habits.reduce((sum, h) => sum + Object.keys(h.history).length, 0);
  const maxStreakValue = Math.max(...habits.map(h => h.streak), 0);

  const badges = [
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Complete at least 1 task to start a productive day.',
      icon: '🌅',
      isUnlocked: completedTasksCount >= 1,
      progress: Math.min(100, (completedTasksCount / 1) * 100),
      progressText: `${completedTasksCount}/1`,
      tier: 'Bronze'
    },
    {
      id: 'task_crusher',
      name: 'Task Crusher',
      description: 'Complete 5 or more tasks successfully.',
      icon: '🏆',
      isUnlocked: completedTasksCount >= 5,
      progress: Math.min(100, (completedTasksCount / 5) * 100),
      progressText: `${completedTasksCount}/5`,
      tier: 'Gold'
    },
    {
      id: 'focus_master',
      name: 'Focus Master',
      description: 'Successfully complete at least 3 deep focus Pomodoro sessions.',
      icon: '🧘',
      isUnlocked: compPomosCount >= 3,
      progress: Math.min(100, (compPomosCount / 3) * 100),
      progressText: `${compPomosCount}/3`,
      tier: 'Silver'
    },
    {
      id: 'sprint_champion',
      name: 'Sprint Champion',
      description: 'Accumulate 60 minutes of deep focus Pomodoro sessions.',
      icon: '⚡',
      isUnlocked: totalFocusMin >= 60,
      progress: Math.min(100, (totalFocusMin / 60) * 100),
      progressText: `${totalFocusMin}/60m`,
      tier: 'Gold'
    },
    {
      id: 'habit_hero',
      name: 'Habit Hero',
      description: 'Maintain a golden habit streak for at least 3 consecutive days.',
      icon: '🔥',
      isUnlocked: maxStreakValue >= 3,
      progress: Math.min(100, (maxStreakValue / 3) * 100),
      progressText: `${maxStreakValue}/3 days`,
      tier: 'Silver'
    },
    {
      id: 'zen_mind',
      name: 'Zen Mind',
      description: 'Achieve at least 8 positive habit check-ins.',
      icon: '🌊',
      isUnlocked: totalCheckIns >= 8,
      progress: Math.min(100, (totalCheckIns / 8) * 100),
      progressText: `${totalCheckIns}/8 check-ins`,
      tier: 'Bronze'
    }
  ];

  const totalBadges = badges.length;
  const unlockedBadgesCount = badges.filter(b => b.isUnlocked).length;
  const badgeProgressPercent = Math.round((unlockedBadgesCount / totalBadges) * 100);

  // Sound triggering helper for badge interaction
  const handleBadgeClick = (badge: typeof badges[0]) => {
    if (badge.isUnlocked) {
      playSynthesizedSound('spark');
      if (triggerToast) {
        triggerToast('success', `Achievement Trophy ✨: ${badge.name}`, `You have successfully unlocked this ${badge.tier} badge!`);
      }
    } else {
      playSynthesizedSound('fail');
      if (triggerToast) {
        triggerToast('info', `How to Unlock: ${badge.name}`, `${badge.description} This badge is currently locked.`);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="apexa_productivity_dashboard_view">
      {/* LEFT AREA: Stats and Pomodoro (Lg Span 8) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Aesthetic Title Block */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/65 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
                <Zap className="w-5 h-5 fill-indigo-500" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                {locale === 'vi' ? 'Không Gian Quản Trị Năng Suất' : 'Productivity Management Workspace'}
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              {locale === 'vi' ? 'Thiết lập nhịp độ làm việc thông thái thông qua Pomodoro, thói quen cốt lõi và báo cáo Trí Tuệ Nhân Tạo.' : 'Establish a smart work rhythm through Pomodoro, core habits, and AI reporting.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg">
              UTC: {new Date().toLocaleTimeString('vi-VN', { hour12: false })}
            </span>
            <button 
              onClick={generateWeeklyProductivityReport}
              disabled={generatingReport}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t('dashboardGeneratingReport') || 'Đang phân tích...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                  {locale === 'vi' ? 'Báo cáo Năng suất AI' : 'AI Productivity Report'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Analytics & Curves (Recharts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart 1: Daily Focus Minutes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/65 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">{locale === 'vi' ? 'Biểu đồ Tập Trung Tuần' : 'Weekly Focus Chart'}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Thống kê tổng số phút chạy Pomodoro 7 ngày gần đây' : 'Statistics of total Pomodoro focus minutes in the past 7 days'}</p>
              </div>
              <BarChart2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={focusChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pomoMinutesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '11px', color: '#fff' }} />
                  <Area name={locale === 'vi' ? 'Phút Tập Trung' : 'Focus Minutes'} type="monotone" dataKey="Phút Tập Trung" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#pomoMinutesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Productivity Metrics Summary cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/65 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-0.5 pb-2">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Hiệu suất và thống kê hôm nay</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tổng quan các chỉ số năng suất và tiến độ thành tích</p>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-550 uppercase">Completed</span>
                <div className="mt-2 space-y-1">
                  <span className="text-2xl font-black font-mono text-emerald-500">
                    {tasks.filter(t => t.status === 'completed').length} / {tasks.length}
                  </span>
                  <p className="text-[10px] text-slate-400">tổng số công việc</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-555 uppercase">Giờ đã ghi nhận</span>
                <div className="mt-2 space-y-1">
                  <span className="text-2xl font-black font-mono text-purple-500">
                    {tasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0)}h
                  </span>
                  <p className="text-[10px] text-slate-400">tổng số giờ đã ghi nhận</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-555 uppercase">Thói quen hằng tuần</span>
                <div className="mt-2 space-y-1">
                  <span className="text-2xl font-black font-mono text-orange-500">
                    {habits.reduce((sum, h) => sum + Object.keys(h.history).length, 0)}
                  </span>
                  <p className="text-[10px] text-slate-400">lần duy trì tích cực</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-555 uppercase">Chuỗi dài nhất ⚡</span>
                <div className="mt-2 space-y-1">
                  <span className="text-2xl font-black font-mono text-yellow-500">
                    {Math.max(...habits.map(h => h.streak), 0)} days
                  </span>
                  <p className="text-[10px] text-slate-400">ngày liên tiếp</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* glassmorphic achievements board */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/65 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-105 dark:border-slate-800/80 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 font-sans tracking-tight">
                <Award className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                Trung tâm thành tích và huy chương
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-xl">
                Thử thách hiệu suất liên tục. Hoàn thành công việc và phiên tập trung để mở khóa các danh hiệu. Mọi bước tiến của bạn đều được ghi nhận!
              </p>
            </div>

            {/* Achievement Rate */}
            <div className="flex flex-col items-end shrink-0 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-900">
              <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400">
                Tiến độ: {unlockedBadgesCount}/{totalBadges} huy hiệu ({badgeProgressPercent}%)
              </span>
              <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${badgeProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Badges Bento-Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {badges.map(badge => {
              const TierColors = {
                Gold: 'border-amber-400/30 bg-amber-50/40 dark:bg-amber-950/25 text-amber-500',
                Silver: 'border-slate-300/30 bg-slate-50/40 dark:bg-slate-950/25 text-slate-400',
                Bronze: 'border-orange-300/30 bg-orange-50/40 dark:bg-orange-950/25 text-orange-400',
              }[badge.tier as 'Gold' | 'Silver' | 'Bronze'];

              return (
                <div 
                  key={badge.id}
                  onClick={() => handleBadgeClick(badge)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer select-none ${
                    badge.isUnlocked 
                      ? 'bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-indigo-100 dark:border-indigo-950/80 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-850 hover:shadow-sm' 
                      : 'bg-slate-50/20 dark:bg-slate-950/10 border-slate-100 dark:border-slate-850 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 duration-300 ${
                      badge.isUnlocked 
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 grayscale-0 filter drop-shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-900 grayscale filter opacity-40'
                    }`}>
                      {badge.icon}
                    </div>

                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border font-sans tracking-wide ${TierColors}`}>
                      {badge.tier}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className={`text-xs font-bold leading-tight ${
                      badge.isUnlocked ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {badge.name}
                    </h3>
                    <p className="text-[10px] text-slate-400/90 dark:text-slate-500/90 leading-relaxed line-clamp-2">
                      {badge.description}
                    </p>
                  </div>

                  {/* Dynamic Progress indicator */}
                  <div className="space-y-1 pt-1 border-t border-slate-100/50 dark:border-slate-800/40">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={badge.isUnlocked ? 'text-emerald-500 font-bold' : 'text-slate-400 dark:text-slate-500'}>
                        {badge.isUnlocked ? (locale === 'vi' ? '✓ Đã Chinh Phục' : '✓ Unlocked') : (locale === 'vi' ? 'Đang Thực Hiện' : 'In Progress')}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">{badge.progressText}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950/80 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          badge.isUnlocked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'
                        }`}
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Habits Tracker Board (Vietnamese Style) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/65 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-yellow-500" />
                {locale === 'vi' ? 'Bộ Theo Dõi Kỷ Luật Bản Thân (Habits Grid)' : 'Self-Discipline Tracker (Habits Grid)'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Đánh giá quá trình huấn luyện rèn luyện thói quen vàng trong tuần này' : 'Evaluate golden habit coaching and training progress this week'}</p>
            </div>

            {/* Habit creation form */}
            <form onSubmit={handleAddHabit} className="flex items-center gap-2">
              <input 
                type="text"
                placeholder={locale === 'vi' ? 'Thêm thói quen mới...' : 'Add new habit...'}
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="text-xs w-56 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
              <button 
                type="submit"
                className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs p-2.5 rounded-xl cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>

          {/* Matrix Habits Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse space-y-4">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-900">
                  <th className="py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 pl-2">{locale === 'vi' ? 'Thói Quen Vàng' : 'Golden Habit'}</th>
                  {weekDays.map(day => (
                    <th key={day.dateStr} className="text-center py-2.5">
                      <div className={`p-1.5 rounded-lg flex flex-col items-center justify-center min-w-10 ${
                        day.isToday ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500' : 'text-slate-400'
                      }`}>
                        <span className="text-[9px] uppercase font-bold tracking-wider">{day.label}</span>
                        <span className="text-xs font-black font-mono mt-0.5">{day.dayNum}</span>
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 pr-2">{locale === 'vi' ? 'Chuỗi' : 'Streak'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40">
                {habits.map(habit => (
                  <tr key={habit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="py-4 pl-2">
                      <div className="flex items-center justify-between group/habit pr-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{habit.name}</span>
                        <button 
                          onClick={() => handleDeleteHabit(habit.id, habit.name)}
                          className="opacity-0 group-hover/habit:opacity-100 transition-opacity p-1 text-slate-300 hover:text-rose-500 cursor-pointer"
                          title={locale === 'vi' ? 'Gỡ bỏ thói quen' : 'Remove habit'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    
                    {weekDays.map(day => {
                      const isCompleted = !!habit.history[day.dateStr];
                      return (
                        <td key={day.dateStr} className="text-center py-4">
                          <button
                            onClick={() => handleToggleHabit(habit.id, day.dateStr)}
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center border-2 transition-all cursor-pointer ${
                              isCompleted 
                                ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-xs' 
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                            }`}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-4 text-center pr-2">
                      <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 py-1 px-2.5 rounded-xl text-xs font-black">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 stroke-none animate-bounce" />
                        <span>{habit.streak}d</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Eisenhower Prioritization Board */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/65 dark:border-slate-800 shadow-xs space-y-4">
          <div className="space-y-0.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-indigo-500" />
              {locale === 'vi' ? 'Sắp Xếp Ma Trận Ưu Tiên (Eisenhower Strategy)' : 'Prioritize Matrix (Eisenhower Strategy)'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Xác định rõ việc quan trọng cấp bách để hạn chế quá tải tư duy' : 'Define urgent/important tasks to reduce cognitive overload'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Urgent & Important */}
            <div className="bg-rose-50/40 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200/40 dark:border-rose-900/40 pb-2">
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">🚨 Làm trước (Khẩn cấp và quan trọng)</span>
                <span className="text-[10px] font-mono bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full text-rose-600 dark:text-rose-400">{matrix.urgentImportant.length} tasks</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {matrix.urgentImportant.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Tuyệt vời! Không còn công việc khẩn cấp và quan trọng.</p>
                ) : (
                  matrix.urgentImportant.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-900 p-2 rounded-lg text-xs font-semibold border border-rose-100/40 dark:border-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 flex-1">{t.title}</span>
                      {t.dueDate && <span className="text-[9px] font-mono text-rose-500">Hạn: {t.dueDate}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Box 2: Important but Not Urgent */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-200/40 dark:border-indigo-900/40 pb-2">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">📅 Lên lịch (Quan trọng, không khẩn cấp)</span>
                <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full text-indigo-600 dark:text-indigo-400">{matrix.importantNotUrgent.length} tasks</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {matrix.importantNotUrgent.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Không có công việc trong nhóm này.</p>
                ) : (
                  matrix.importantNotUrgent.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-900 p-2 rounded-lg text-xs font-semibold border border-indigo-100/40 dark:border-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 flex-1">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Box 3: Urgent but Not Important */}
            <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-105 dark:border-amber-900/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/40 dark:border-amber-900/40 pb-2">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">⚡ Giao việc (Khẩn cấp, không quan trọng)</span>
                <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full text-amber-600 dark:text-amber-400">{matrix.urgentNotImportant.length} tasks</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {matrix.urgentNotImportant.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Không có công việc phụ trong nhóm này.</p>
                ) : (
                  matrix.urgentNotImportant.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-900 p-2 rounded-lg text-xs font-semibold border border-amber-100/40 dark:border-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 flex-1">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Box 4: Neither (Eliminate / Delay) */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-2">
                <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">🗑️ Loại bỏ (Không thuộc hai nhóm trên)</span>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">{matrix.neither.length} tasks</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {matrix.neither.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Không có công việc dư thừa hoặc trì hoãn.</p>
                ) : (
                  matrix.neither.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-900 p-2 rounded-lg text-xs font-semibold border border-slate-200/40 dark:border-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 flex-1">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL: Embedded Pomodoro Focus Node + Synth Controls (Lg Span 4) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Modern Pomodoro Timer Node */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/65 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-1 w-full text-left">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              {locale === 'vi' ? 'Đồng Hồ Cực Hạn Tập Trung (Pomodoro Sandbox)' : 'Pomodoro Focus Timer (Pomodoro Sandbox)'}
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Mô phỏng chu trình nạp năng lượng liên hoàn' : 'Simulate continuous energy reload cycle'}</p>
          </div>

          {/* Mode switch selectors */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl w-full">
            <button 
              onClick={() => handleSetMode('work')}
              className={`flex-1 text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all ${
                pomoMode === 'work' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {locale === 'vi' ? 'Làm Việc (25m)' : 'Deep Work (25m)'}
            </button>
            <button 
              onClick={() => handleSetMode('short')}
              className={`flex-1 text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all ${
                pomoMode === 'short' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {locale === 'vi' ? 'Nghỉ Ngắn (5m)' : 'Short Break (5m)'}
            </button>
            <button 
              onClick={() => handleSetMode('long')}
              className={`flex-1 text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all ${
                pomoMode === 'long' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {locale === 'vi' ? 'Nghỉ Dài (15m)' : 'Long Break (15m)'}
            </button>
          </div>

          {/* Countdown visual element */}
          <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background loop */}
              <circle 
                cx="96" cy="96" r={radius}
                className="stroke-slate-100 dark:stroke-slate-800/80 fill-none"
                strokeWidth="8"
              />
              {/* Dynamic filled gradient circle loop info */}
              <motion.circle 
                cx="96" cy="96" r={radius}
                className="stroke-indigo-600 dark:stroke-indigo-500 fill-none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.3, ease: 'linear' }}
              />
            </svg>

            {/* Time countdown string */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
              <span className="text-3xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {pomoActive ? 'ĐANG CHẠY' : 'TẠM DỪNG'}
              </span>
            </div>
          </div>

          {/* Core Controls */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleResetPomo}
              className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-2xl text-slate-500 dark:text-slate-400 transition-colors shadow-xs cursor-pointer"
              title="Đặt lại đồng hồ"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
            
            {pomoActive ? (
              <button 
                onClick={handlePausePomo}
                className="px-6 py-3.5 bg-rose-500 hover:bg-rose-600 font-bold text-white rounded-2xl flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Pause className="w-5 h-5 fill-white" />
                <span>Tạm Dừng</span>
              </button>
            ) : (
              <button 
                onClick={handleStartPomo}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 font-bold text-white rounded-2xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Soundscapes Synthesizer panel (Acoustic brain boosts) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/65 dark:border-slate-800 shadow-xs space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-500" />
              Âm thanh nền giúp tập trung
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">
              Âm thanh thiên nhiên và sóng não được tổng hợp ngoại tuyến bằng công nghệ Web Audio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => activeSoundscape === 'rain' ? stopSoundscape() : startSoundscape('rain')}
              className={`text-xs py-3 px-2 flex flex-col items-center justify-center gap-2 rounded-xl border text-center transition-all cursor-pointer ${
                activeSoundscape === 'rain' 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400' 
                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-500">🌧️</div>
              <span className="font-bold">Mưa lớn</span>
            </button>

            <button 
              onClick={() => activeSoundscape === 'alpha' ? stopSoundscape() : startSoundscape('alpha')}
              className={`text-xs py-3 px-2 flex flex-col items-center justify-center gap-2 rounded-xl border text-center transition-all cursor-pointer ${
                activeSoundscape === 'alpha'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400' 
                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <div className="p-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-500">🧘</div>
              <span className="font-bold">Sóng Alpha</span>
            </button>

            <button 
              onClick={() => activeSoundscape === 'waves' ? stopSoundscape() : startSoundscape('waves')}
              className={`text-xs py-3 px-2 flex flex-col items-center justify-center gap-2 rounded-xl border text-center transition-all cursor-pointer ${
                activeSoundscape === 'waves'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400' 
                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <div className="p-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-500">🌊</div>
              <span className="font-bold">Sóng biển</span>
            </button>

            <button 
              onClick={stopSoundscape}
              disabled={activeSoundscape === 'none'}
              className="text-xs py-3 px-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80 bg-rose-50/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 cursor-pointer disabled:opacity-40"
            >
              <div className="p-1.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-500">
                <VolumeX className="w-4 h-4" />
              </div>
              <span className="font-bold">Tắt âm thanh</span>
            </button>
          </div>
        </div>

        {/* AI Weekly Report display space */}
        {reportText && (
          <div className="bg-teal-50/30 dark:bg-teal-950/10 border border-teal-200/40 dark:border-teal-900/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <Sparkles className="w-4 h-4 fill-teal-500 text-teal-500" />
                PHÂN TÍCH NĂNG SUẤT NỔI BẬT
              </span>
              <button 
                onClick={() => setReportText('')}
                className="text-[10px] text-slate-400 hover:text-slate-500 transition-colors cursor-pointer"
              >
                Đóng báo cáo
              </button>
            </div>
            
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <div className="markdown-body">
                {reportText.split('\n').map((line, idx) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={idx} className="text-xs font-black text-slate-800 dark:text-slate-200 mt-4 mb-2 first:mt-0 uppercase tracking-wide">{line.replace('### ', '')}</h3>;
                  }
                  if (line.trim().startsWith('- ')) {
                    return <p key={idx} className="pl-3 before:content-['•'] before:text-teal-500 before:mr-2 before:font-bold text-slate-600 dark:text-slate-300 my-1">{line.trim().slice(2)}</p>;
                  }
                  return <p key={idx} className="my-1.5 text-slate-500 dark:text-slate-400">{line}</p>;
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
