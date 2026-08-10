"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Document, SyncLog, Space, TaskStatus, NotificationSettings, BaseApp, Workspace } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAppActions } from '@/hooks/useAppActions';
import { useWorkspaceInvitations } from '@/hooks/useRealtimeSync';
import { useUiStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSpaceStore } from '@/store/spaceStore';
import { useTaskStore } from '@/store/taskStore';
import { useDocStore } from '@/store/docStore';
import { useMemberStore } from '@/store/memberStore';
import { useBaseStore } from '@/store/baseStore';
import { useSyncStore } from '@/store/syncStore';
  import { useNotificationStore } from '@/store/notificationStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useAuthStore } from '@/store/authStore';

import { NavItem } from '@/components/ui';
import LoginScreen from '../components/LoginScreen';
import EmojiIconPicker from '../components/EmojiIconPicker';
import DocumentHub from '../components/DocumentHub';
import SignedImage from '../components/SignedImage';
import { useTranslation } from '../contexts/TranslationContext';
import ToastNotification, { Toast } from '../components/ToastNotification';
import { WORKSPACE_COVERS } from '../components/SettingsPanel';
import MemberProfileModal from '../components/MemberProfileModal';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { AutomationRulesModal } from '../components/AutomationRulesModal';
import { ExportDataModal } from '../components/ExportDataModal';
import { PricingModal } from '../components/PricingModal';
import dynamic from 'next/dynamic';

const ComponentLoading = () => (
  <div className="w-full h-full p-4 md:p-6 space-y-4 animate-pulse cu-page-enter">
    <div className="flex items-center justify-between">
      <div className="h-7 bg-[var(--cu-surface-3)] rounded-[var(--cu-radius-lg)] w-48" />
      <div className="h-8 bg-[var(--cu-surface-2)] rounded-[var(--cu-radius-lg)] w-32" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <div className="h-28 bg-[var(--cu-surface-2)] rounded-[var(--cu-radius-lg)]" />
      <div className="h-28 bg-[var(--cu-surface-2)] rounded-[var(--cu-radius-lg)]" />
      <div className="h-28 bg-[var(--cu-surface-2)] rounded-[var(--cu-radius-lg)]" />
      <div className="h-28 bg-[var(--cu-surface-2)] rounded-[var(--cu-radius-lg)] hidden lg:block" />
    </div>
    <div className="h-72 bg-[var(--cu-surface-2)] rounded-[var(--cu-radius-lg)]" />
  </div>
);

// Dynamic heavy sub-system components for optimal bundle code-splitting
const DashboardOverview = dynamic(() => import('../components/DashboardOverview'), { loading: ComponentLoading });
const SpacePage = dynamic(() => import('../components/SpacePage'), { loading: ComponentLoading });
const CalendarView = dynamic(() => import('../components/CalendarView'), { loading: ComponentLoading });
const Whiteboard = dynamic(() => import('../components/Whiteboard'), { loading: ComponentLoading, ssr: false });
const WhiteboardHub = dynamic(() => import('../components/WhiteboardHub'), { loading: ComponentLoading, ssr: false });
const ChatRoom = dynamic(() => import('../components/ChatRoom'), { loading: ComponentLoading });
const TeamDirectory = dynamic(() => import('../components/TeamDirectory'), { loading: ComponentLoading });
const AvaxaBrainAssistant = dynamic(() => import('../components/AvaxaBrainAssistant'), { loading: ComponentLoading, ssr: false });
const SettingsPanel = dynamic(() => import('../components/SettingsPanel'), { loading: ComponentLoading });
const ProfilePage = dynamic(() => import('../components/ProfilePage'), { loading: ComponentLoading });
const ProductivityHub = dynamic(() => import('../components/ProductivityHub'), { loading: ComponentLoading });
const WorkspaceSettingsModal = dynamic(() => import('../components/WorkspaceSettingsModal'), { loading: ComponentLoading });
const BaseHub = dynamic(() => import('../components/BaseHub'), { loading: ComponentLoading });
const InboxView = dynamic(() => import('../components/InboxView'), { loading: ComponentLoading });
const AnalyticsHub = dynamic(() => import('../components/AnalyticsHub'), { loading: ComponentLoading, ssr: false });
const GoalsHub = dynamic(() => import('../components/GoalsHub'), { loading: ComponentLoading });

import { 
  Briefcase, MessageSquare, Edit3, Users, 
  Grid, LogOut, Cloud, RefreshCw, Sparkles, LayoutDashboard,
  Search, X, FileText, Hash, Cog, Copy, Link as LinkIcon, ArrowRight, CornerDownLeft, Check, ChevronDown, Lock,
  Timer, Bell, Calendar, Settings, Plus, Sliders, Sun, Moon,
  Trash2, Zap, User as UserIcon, ChevronRight, ChevronLeft, RotateCcw, Database, Play, Pause, Clock,
  BarChart3, Target, Menu, Globe
} from 'lucide-react';

import {
  House as PhHouse,
  Tray as PhTray,
  CalendarDots as PhCalendar,
  ChatCircleDots as PhChat,
  FileText as PhFileText,
  Database as PhDatabase,
  Briefcase as PhBriefcase,
  ChartBar as PhChartBar,
  Target as PhTarget,
  Table as PhTable,
  Users as PhUsers,
  Robot as PhBot
} from '@phosphor-icons/react';

const checkIsDndActive = (settings: any) => {
  if (!settings) return false;
  if (settings.dndActive) return true;
  
  if (settings.dndDurationUntil) {
    if (Date.now() < new Date(settings.dndDurationUntil).getTime()) {
      return true;
    }
  }
  
  if (settings.dndScheduleEnabled && settings.dndScheduleStart && settings.dndScheduleEnd) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = settings.dndScheduleStart.split(':').map(Number);
    const [endHour, endMin] = settings.dndScheduleEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes <= endMinutes) {
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return true;
      }
    } else {
      if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
        return true;
      }
    }
  }
  return false;
};

const getShortLabel = (label: string) => {
  if (!label) return '';
  if (label === 'Home Overview') return 'Home';
  if (label === 'Tổng quan trang chủ') return 'Tổng quan';
  if (label === 'Avaxa Base') return 'Base';
  if (label === 'Không gian làm việc') return 'Không gian';
  if (label === 'Hộp thư đến') return 'Hộp thư';
  if (label === 'Mục tiêu (OKRs)') return 'Mục tiêu';
  if (label.includes('(')) {
    return label.split('(')[0].trim();
  }
  return label;
};

const DEFAULT_SIDEBAR_ORDER = ['dashboard', 'inbox', 'calendar', 'chat', 'docs', 'base', 'tasks', 'goals'];

export default function App() {
  const { t, locale, setLocale } = useTranslation();
  const isLoaded = useRef(false);

  // Authentication check with 1-month persistence
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const updateCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    useAuthStore.getState().setCurrentUser(user);
  }, []);

  // Navigation active tab controller
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('general');
  const isMainSidebarCollapsed = useUiStore((s) => s.isMainSidebarCollapsed);
  const setIsMainSidebarCollapsed = useUiStore((s) => s.setIsMainSidebarCollapsed);
  const isMobileSidebarOpen = useUiStore((s) => s.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useUiStore((s) => s.setIsMobileSidebarOpen);
  const accentPreset = useUiStore((s) => s.accentPreset);
  const setAccentPreset = useUiStore((s) => s.setAccentPreset);
  const userStatus = useUiStore((s) => s.userStatus);
  const setUserStatus = useUiStore((s) => s.setUserStatus);
  const showStatusMenu = useUiStore((s) => s.showStatusMenu);
  const setShowStatusMenu = useUiStore((s) => s.setShowStatusMenu);
  const showPremiumModal = useUiStore((s) => s.showPremiumModal);
  const setShowPremiumModal = useUiStore((s) => s.setShowPremiumModal);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const setSoundEnabled = useUiStore((s) => s.setSoundEnabled);
  const blurIntensity = useUiStore((s) => s.blurIntensity);
  const setBlurIntensity = useUiStore((s) => s.setBlurIntensity);
  const notificationSettings = useUiStore((s) => s.notificationSettings);
  const setNotificationSettings = useUiStore((s) => s.setNotificationSettings);
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const setIsDarkMode = useUiStore((s) => s.setIsDarkMode);
  const dateFormat = useUiStore((s) => s.dateFormat);
  const setDateFormat = useUiStore((s) => s.setDateFormat);
  const uiDensity = useUiStore((s) => s.uiDensity);
  const setUiDensity = useUiStore((s) => s.setUiDensity);
  const [showDisplayOptionsMenu, setShowDisplayOptionsMenu] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Dark Mode state dynamically to root HTML document element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('avaxa_dark_mode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('avaxa_dark_mode', 'false');
      }
    }
  }, [isDarkMode]);

  // Pomodoro Focus Timer state - consumed from usePomodoroStore
  const workDuration = usePomodoroStore((s) => s.workDuration);
  const setWorkDuration = usePomodoroStore((s) => s.setWorkDuration);
  const shortBreakDuration = usePomodoroStore((s) => s.shortBreakDuration);
  const setShortBreakDuration = usePomodoroStore((s) => s.setShortBreakDuration);
  const longBreakDuration = usePomodoroStore((s) => s.longBreakDuration);
  const setLongBreakDuration = usePomodoroStore((s) => s.setLongBreakDuration);
  const pomodoroMode = usePomodoroStore((s) => s.pomodoroMode);
  const setPomodoroMode = usePomodoroStore((s) => s.setPomodoroMode);
  const showPomoSettings = usePomodoroStore((s) => s.showPomoSettings);
  const setShowPomoSettings = usePomodoroStore((s) => s.setShowPomoSettings);
  const pomodoroTime = usePomodoroStore((s) => s.pomodoroTime);
  const setPomodoroTime = usePomodoroStore((s) => s.setPomodoroTime);
  const pomodoroActive = usePomodoroStore((s) => s.pomodoroActive);
  const setPomodoroActive = usePomodoroStore((s) => s.setPomodoroActive);
  const previousStatus = usePomodoroStore((s) => s.previousStatus);
  const setPreviousStatus = usePomodoroStore((s) => s.setPreviousStatus);

  // Global Time Tracking States
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [activeTimerElapsed, setActiveTimerElapsed] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeTimerTaskId && !isTimerPaused) {
      timerIntervalRef.current = setInterval(() => {
        setActiveTimerElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeTimerTaskId, isTimerPaused]);

  const formatTimerDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartGlobalTimer = (taskId: string) => {
    // If a different task is being tracked, stop it and log it first
    if (activeTimerTaskId && activeTimerTaskId !== taskId) {
      const prevTask = tasks.find(t => t.id === activeTimerTaskId);
      if (prevTask) {
        const exactLogged = parseFloat((activeTimerElapsed / 3600).toFixed(2));
        if (exactLogged > 0) {
          const nextLogged = parseFloat(((prevTask.hoursLogged || 0) + exactLogged).toFixed(2));
          const updated = { ...prevTask, hoursLogged: nextLogged };
          setTasks(prev => prev.map(t => t.id === prevTask.id ? updated : t));
          if (!isOffline) {
            supabase.from('tasks').update({ hoursLogged: nextLogged }).eq('id', prevTask.id).then(({ error }) => {
              if (error) console.error('Error updating task hours:', error);
            });
          }
          addSyncLog(`Logged ${exactLogged} hours of work via global timer`);
          triggerToast('success', 'Time Logged ⏱', `Added ${exactLogged}h to "${prevTask.title}".`);
        }
      }
    }

    setActiveTimerTaskId(taskId);
    setActiveTimerElapsed(0);
    setIsTimerPaused(false);
  };

  const handleStopGlobalTimer = () => {
    if (!activeTimerTaskId) return;
    const task = tasks.find(t => t.id === activeTimerTaskId);
    if (task) {
      const exactLogged = parseFloat((activeTimerElapsed / 3600).toFixed(2));
      if (exactLogged > 0) {
        const nextLogged = parseFloat(((task.hoursLogged || 0) + exactLogged).toFixed(2));
        const updated = { ...task, hoursLogged: nextLogged };
        setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
        if (!isOffline) {
          supabase.from('tasks').update({ hoursLogged: nextLogged }).eq('id', task.id).then(({ error }) => {
            if (error) console.error('Error updating task hours:', error);
          });
        }
        addSyncLog(`Logged ${exactLogged} hours of work via global timer`);
        triggerToast('success', 'Time Logged ⏱', `Added ${exactLogged}h to "${task.title}".`);
      } else {
        triggerToast('info', 'Timer Stopped', 'No time was logged (less than 1 minute).');
      }
    }
    setActiveTimerTaskId(null);
    setActiveTimerElapsed(0);
    setIsTimerPaused(false);
  };

  const handleTogglePauseGlobalTimer = () => {
    setIsTimerPaused(prev => !prev);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Dark mode sync
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('avaxa_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('avaxa_dark_mode', 'false');
    }

    // 2. Accent color sync across stores & CSS custom properties
    const ACCENT_MAP: Record<string, { primary: string; hover: string; light: string; ring: string }> = {
      indigo: { primary: '#7B61FF', hover: '#6045EB', light: isDarkMode ? 'rgba(123, 97, 255, 0.18)' : '#ede9fe', ring: 'rgba(123, 97, 255, 0.35)' },
      ocean: { primary: '#0ea5e9', hover: '#0284c7', light: isDarkMode ? 'rgba(14, 165, 233, 0.18)' : '#e0f2fe', ring: 'rgba(14, 165, 233, 0.35)' },
      forest: { primary: '#10b981', hover: '#059669', light: isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#d1fae5', ring: 'rgba(16, 185, 129, 0.35)' },
      sunset: { primary: '#f43f5e', hover: '#e11d48', light: isDarkMode ? 'rgba(244, 63, 94, 0.18)' : '#ffe4e6', ring: 'rgba(244, 63, 94, 0.35)' },
    };

    const colors = ACCENT_MAP[accentPreset] || ACCENT_MAP.indigo;
    document.documentElement.setAttribute('data-accent', accentPreset);
    document.documentElement.style.setProperty('--avaxa-primary', colors.primary);
    document.documentElement.style.setProperty('--avaxa-primary-hover', colors.hover);
    document.documentElement.style.setProperty('--avaxa-primary-light', colors.light);
    document.documentElement.style.setProperty('--avaxa-ring', colors.ring);

    localStorage.setItem('avaxa_accent_preset', accentPreset);
    useWorkspaceStore.getState().setAccentPreset(accentPreset as any);
  }, [isDarkMode, accentPreset]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Avaxa Champion';
        const isPremium = typeof window !== 'undefined' ? localStorage.getItem('avaxa_premium') === 'true' : false;
        const userObj = {
          id: u.id,
          name: displayName,
          email: u.email || '',
          avatar: u.user_metadata?.avatar_url || u.user_metadata?.avatar || '',
          role: (u.email?.includes('admin') || u.email === 'hoang.benjamin.creative@gmail.com' ? 'admin' : 'member') as 'admin' | 'member',
          status: 'online' as const,
          isPremium
        };
        updateCurrentUser(userObj);
        
        // Save session to localStorage to prevent flicker on reload
        const sessionObj = {
          user: userObj,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 1 month
        };
        localStorage.setItem('avaxa_session', JSON.stringify(sessionObj));
      }
    }).catch(err => {
      console.warn('Error verifying Supabase session at launch:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Avaxa Champion';
        const isPremium = typeof window !== 'undefined' ? localStorage.getItem('avaxa_premium') === 'true' : false;
        const userObj = {
          id: u.id,
          name: displayName,
          email: u.email || '',
          avatar: u.user_metadata?.avatar_url || u.user_metadata?.avatar || '',
          role: (u.email?.includes('admin') || u.email === 'hoang.benjamin.creative@gmail.com' ? 'admin' : 'member') as 'admin' | 'member',
          status: 'online' as const,
          isPremium
        };
        updateCurrentUser(userObj);
        
        // Save session to localStorage to prevent flicker on reload
        const sessionObj = {
          user: userObj,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 1 month
        };
        localStorage.setItem('avaxa_session', JSON.stringify(sessionObj));
      } else {
        updateCurrentUser(null);
        localStorage.removeItem('avaxa_session');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateCurrentUser]);


  // Dynamic effects below read from useUiStore values
  useEffect(() => {
    (window as any).showPremiumModal = () => setShowPremiumModal(true);
    (window as any).playSystemSound = (type: 'click' | 'success' | 'toggle' | 'delete' | 'notification') => {
      try {
        if (!soundEnabled) return;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'click') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, now);
          osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'toggle') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(550, now);
          osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'delete') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'notification') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.setValueAtTime(900, now + 0.12);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch { /* empty */ }
    };
  }, [soundEnabled, setShowPremiumModal]);

  const handleTogglePremium = (status: boolean) => {
    localStorage.setItem('avaxa_premium', String(status));
    if (currentUser) {
      const updatedUser = { ...currentUser, isPremium: status };
      setCurrentUser(updatedUser);
      // Update local storage session
      const sessionObj = {
        user: updatedUser,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem('avaxa_session', JSON.stringify(sessionObj));

      // Update members list
      setMembers(prev => prev.map(m => m.id === 'user' ? { ...m, isPremium: status } : m));

      // Update Supabase if online
      if (!isOffline && currentUser.id) {
        supabase.from('members').update({
          is_premium: status
        }).eq('id', `user-${currentUser.id}`).then(({ error }) => {
          if (error) console.error('Error updating premium status on Supabase:', error.message || error);
        });
      }

      addSyncLog(status ? 'Successfully activated Avaxa Premium Pro' : 'Cancelled Avaxa Premium Pro subscription');
      if (status) {
        triggerToast('success', 'Premium Pro Upgrade! 🎉', 'Welcome to Avaxa Premium! Unlocked all advanced features.');
        (window as any).playSystemSound?.('success');
      } else {
        triggerToast('info', 'Account Downgraded', 'Account has been downgraded to the Free tier.');
      }
    }
  };

  // Workspaces Feature
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const showWorkspaceMenu = useUiStore((s) => s.showWorkspaceMenu);
  const setShowWorkspaceMenu = useUiStore((s) => s.setShowWorkspaceMenu);
  const showAddWorkspaceModal = useUiStore((s) => s.showAddWorkspaceModal);
  const setShowAddWorkspaceModal = useUiStore((s) => s.setShowAddWorkspaceModal);
  const modalSelectedCover = useUiStore((s) => s.modalSelectedCover);
  const setModalSelectedCover = useUiStore((s) => s.setModalSelectedCover);
  const showWorkspaceSettingsId = useUiStore((s) => s.showWorkspaceSettingsId);
  const setShowWorkspaceSettingsId = useUiStore((s) => s.setShowWorkspaceSettingsId);
  const editWSName = useUiStore((s) => s.editWSName);
  const setEditWSName = useUiStore((s) => s.setEditWSName);
  const editWSTheme = useUiStore((s) => s.editWSTheme);
  const setEditWSTheme = useUiStore((s) => s.setEditWSTheme);
  const showWorkspaceSettingsModal = useUiStore((s) => s.showWorkspaceSettingsModal);
  const setShowWorkspaceSettingsModal = useUiStore((s) => s.setShowWorkspaceSettingsModal);
  const editingWorkspaceForModal = useUiStore((s) => s.editingWorkspaceForModal);
  const setEditingWorkspaceForModal = useUiStore((s) => s.setEditingWorkspaceForModal);

  // ClickUp Space & Lists Feature
  const spaces = useSpaceStore((s) => s.spaces);
  const setSpaces = useSpaceStore((s) => s.setSpaces);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const activeListId = useSpaceStore((s) => s.activeListId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);
  const [isSpacesExpanded, setIsSpacesExpanded] = useState<boolean>(true);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState<boolean>(true);
  const [isDmsExpanded, setIsDmsExpanded] = useState<boolean>(true);
  const [isOtherAppsExpanded, setIsOtherAppsExpanded] = useState<boolean>(true);
  
  // Modals for Spaces & Lists - consumed from useUiStore
  const showAddSpaceModal = useUiStore((s) => s.showAddSpaceModal);
  const setShowAddSpaceModal = useUiStore((s) => s.setShowAddSpaceModal);
  const newSpaceName = useUiStore((s) => s.newSpaceName);
  const setNewSpaceName = useUiStore((s) => s.setNewSpaceName);
  const newSpaceEmoji = useUiStore((s) => s.newSpaceEmoji);
  const setNewSpaceEmoji = useUiStore((s) => s.setNewSpaceEmoji);
  const newSpaceColor = useUiStore((s) => s.newSpaceColor);
  const setNewSpaceColor = useUiStore((s) => s.setNewSpaceColor);
  const showAddListSpaceId = useUiStore((s) => s.showAddListSpaceId);
  const setShowAddListSpaceId = useUiStore((s) => s.setShowAddListSpaceId);
  const newListName = useUiStore((s) => s.newListName);
  const setNewListName = useUiStore((s) => s.setNewListName);
  const showSpaceSettingsId = useUiStore((s) => s.showSpaceSettingsId);
  const setShowSpaceSettingsId = useUiStore((s) => s.setShowSpaceSettingsId);
  const newSpaceDescription = useUiStore((s) => s.newSpaceDescription);
  const setNewSpaceDescription = useUiStore((s) => s.setNewSpaceDescription);
  const newSpaceIsPrivate = useUiStore((s) => s.newSpaceIsPrivate);
  const setNewSpaceIsPrivate = useUiStore((s) => s.setNewSpaceIsPrivate);
  const newSpacePermission = useUiStore((s) => s.newSpacePermission);
  const setNewSpacePermission = useUiStore((s) => s.setNewSpacePermission);
  const [showSpacePermissionMenu, setShowSpacePermissionMenu] = useState(false);

  // Localized Space Settings Modal States - consumed from useUiStore
  const editSpaceName = useUiStore((s) => s.editSpaceName);
  const setEditSpaceName = useUiStore((s) => s.setEditSpaceName);
  const editSpaceEmoji = useUiStore((s) => s.editSpaceEmoji);
  const setEditSpaceEmoji = useUiStore((s) => s.setEditSpaceEmoji);
  const editSpaceColor = useUiStore((s) => s.editSpaceColor);
  const setEditSpaceColor = useUiStore((s) => s.setEditSpaceColor);
  const editSpaceClickApps = useUiStore((s) => s.editSpaceClickApps);
  const setEditSpaceClickApps = useUiStore((s) => s.setEditSpaceClickApps);
  const editSpaceStatuses = useUiStore((s) => s.editSpaceStatuses);
  const setEditSpaceStatuses = useUiStore((s) => s.setEditSpaceStatuses);

  // Load / Seed Spaces (Offline/Fallback)
  useEffect(() => {
    if (currentUser?.id) {
      const savedSpaces = localStorage.getItem(`avaxa_spaces_${currentUser.id}`);
      if (savedSpaces) {
        try {
          setSpaces(JSON.parse(savedSpaces));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [currentUser?.id, setSpaces]);

  const handleSaveSpaces = async (newSpaces: Space[]) => {
    setSpaces(newSpaces);
    if (!currentUser?.id) return;
    localStorage.setItem(`avaxa_spaces_${currentUser.id}`, JSON.stringify(newSpaces));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;

          // 1. Detect deleted spaces
          const oldSpaceIds = spaces.map(s => s.id);
          const newSpaceIds = newSpaces.map(s => s.id);
          const deletedSpaceIds = oldSpaceIds.filter(id => !newSpaceIds.includes(id));

          if (deletedSpaceIds.length > 0) {
            await supabase.from('spaces').delete().in('id', deletedSpaceIds).eq('user_id', userId);
          }

          // 2. Upsert each space and sync lists
          for (const space of newSpaces) {
            await supabase.from('spaces').upsert({
              id: space.id,
              name: space.name,
              emoji: space.emoji || null,
              theme_color: space.themeColor || null,
              workspace_id: space.workspaceId,
              folders: space.folders || [],
              whiteboards: space.whiteboards || [],
              channels: space.channels || [],
              statuses: space.statuses || [],
              click_apps: space.clickApps || {},
              custom_fields_config: space.customFields || [],
              user_id: userId
            });

            // Sync lists for this space
            const oldSpace = spaces.find(s => s.id === space.id);
            const oldListIds = oldSpace ? oldSpace.lists.map(l => l.id) : [];
            const newListIds = space.lists.map(l => l.id);

            // Delete removed lists
            const deletedListIds = oldListIds.filter(id => !newListIds.includes(id));
            if (deletedListIds.length > 0) {
              await supabase.from('lists').delete().in('id', deletedListIds).eq('user_id', userId);
            }

            // Upsert current lists
            if (space.lists.length > 0) {
              const listsToUpsert = space.lists.map(list => ({
                id: list.id,
                name: list.name,
                space_id: space.id,
                folder_id: list.folderId || null,
                user_id: userId
              }));
              await supabase.from('lists').upsert(listsToUpsert);
            }
          }
        }
      } catch (err) {
        console.error('Error syncing spaces/lists with Supabase:', err);
      }
    }
  };

  const handleAddSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    const newSpace: Space & { description?: string; isPrivate?: boolean; defaultPermission?: string } = {
      id: `s-${Date.now()}`,
      name: newSpaceName.trim(),
      emoji: newSpaceEmoji || '📦',
      themeColor: newSpaceColor || 'indigo',
      workspaceId: activeWorkspaceId,
      lists: [{ id: `l-${Date.now()}`, name: 'General Tasks' }],
      folders: [],
      whiteboards: [],
      channels: [],
      statuses: [
        { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
        { id: 'inprogress', label: 'In Progress', color: '#6366f1', type: 'inprogress' },
        { id: 'review', label: 'Review', color: '#f59e0b', type: 'review' },
        { id: 'completed', label: 'Completed', color: '#10b981', type: 'completed' }
      ],
      clickApps: { subtasks: true, priorities: true, customFields: true },
      description: newSpaceDescription,
      isPrivate: newSpaceIsPrivate,
      defaultPermission: newSpacePermission
    };
    const updated = [...spaces, newSpace];
    handleSaveSpaces(updated);
    setNewSpaceName('');
    setNewSpaceEmoji('📦');
    setNewSpaceColor('indigo');
    setNewSpaceDescription('');
    setNewSpaceIsPrivate(false);
    setNewSpacePermission('Full edit');
    setShowAddSpaceModal(false);
    triggerToast('success', 'New Space Created', `Created space "${newSpace.name}"`);
    addSyncLog(`Created new Space: "${newSpace.name}"`);
  };

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !showAddListSpaceId) return;
    const updated = spaces.map(s => {
      if (s.id === showAddListSpaceId) {
        return {
          ...s,
          lists: [...s.lists, { id: `l-${Date.now()}`, name: newListName.trim() }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    setNewListName('');
    setShowAddListSpaceId(null);
    triggerToast('success', 'New List Created', 'List added successfully');
  };

  const handleAddFolderToSpace = (spaceId: string, name: string) => {
    const updated = spaces.map(s => {
      if (s.id === spaceId) {
        const folders = s.folders || [];
        return {
          ...s,
          folders: [...folders, { id: `folder-${Date.now()}`, name }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast('success', 'New Folder Created', `Created folder "${name}"`);
    addSyncLog(`Created Folder "${name}" in Space`);
  };

  const handleAddDocToSpace = (spaceId: string, title: string, folderId?: string) => {
    handleAddDoc({
      title,
      content: '',
      category: 'General',
      updatedBy: currentUser?.name || 'User',
      spaceId,
      folderId
    });
    triggerToast('success', 'New Document Created', `Created doc "${title}"`);
  };

  const handleAddWhiteboardToSpace = (spaceId: string, name: string, folderId?: string) => {
    const updated = spaces.map(s => {
      if (s.id === spaceId) {
        const whiteboards = s.whiteboards || [];
        return {
          ...s,
          whiteboards: [...whiteboards, { id: `wb-${Date.now()}`, name, folderId }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast('success', 'New Whiteboard Created', `Created whiteboard "${name}"`);
    addSyncLog(`Created Whiteboard "${name}" in Space`);
  };

  const handleAddListToFolder = (spaceId: string, folderId: string, name: string) => {
    const updated = spaces.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          lists: [...s.lists, { id: `l-${Date.now()}`, name, folderId }]
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    triggerToast('success', 'New List Created', `Created list "${name}" in folder`);
    addSyncLog(`Created List "${name}" under Folder`);
  };

  const handleDeleteSpace = (spaceId: string) => {
    const updated = spaces.filter(s => s.id !== spaceId);
    handleSaveSpaces(updated);
    if (activeSpaceId === spaceId) {
      setActiveSpaceId(null);
      setActiveListId(null);
    }
    triggerToast('info', 'Space Deleted', 'Workspace has been deleted.');
  };

  const handleSaveSpaceSettings = () => {
    if (!showSpaceSettingsId || !editSpaceName.trim()) return;
    const updated = spaces.map(s => {
      if (s.id === showSpaceSettingsId) {
        return {
          ...s,
          name: editSpaceName.trim(),
          emoji: editSpaceEmoji,
          themeColor: editSpaceColor,
          clickApps: editSpaceClickApps,
          statuses: editSpaceStatuses
        };
      }
      return s;
    });
    handleSaveSpaces(updated);
    setShowSpaceSettingsId(null);
    triggerToast('success', 'Settings Saved', 'Updated space configurations.');
  };

  const openSpaceSettings = (space: Space) => {
    setShowSpaceSettingsId(space.id);
    setEditSpaceName(space.name);
    setEditSpaceEmoji(space.emoji || '📦');
    setEditSpaceColor(space.themeColor || 'indigo');
    setEditSpaceClickApps(space.clickApps || { subtasks: true, priorities: true });
    setEditSpaceStatuses(space.statuses || [
      { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
      { id: 'inprogress', label: 'In Progress', color: '#f59e0b', type: 'inprogress' },
      { id: 'review', label: 'Review', color: '#06b6d4', type: 'review' },
      { id: 'completed', label: 'Done', color: '#10b981', type: 'completed' }
    ]);
  };

  // Map tasks helper
  const mapTasksToSpaces = (tasksList: Task[]): Task[] => {
    return tasksList.map(t => {
      if (t.spaceId) {
        return {
          ...t,
          assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : [])
        };
      }
      
      let spaceId = t.spaceId;
      let listId = t.listId;
      
      if (t.workspaceId === 'w2' || !t.workspaceId) {
        const title = t.title.toLowerCase();
        if (title.includes('seo') || title.includes('keyword')) {
          spaceId = 's-w2-marketing';
          listId = 'l-w2-seo';
        } else if (title.includes('campaign') || title.includes('kickoff')) {
          spaceId = 's-w2-marketing';
          listId = 'l-w2-campaign';
        } else if (title.includes('email') || title.includes('launch')) {
          spaceId = 's-w2-marketing';
          listId = 'l-w2-email';
        } else if (title.includes('bug') || title.includes('error') || title.includes('fix') || title.includes('test')) {
          spaceId = 's-w2-qe';
          listId = title.includes('test') ? 'l-w2-tests' : 'l-w2-bugs';
        } else if (title.includes('design') || title.includes('ui') || title.includes('ux') || title.includes('mockup') || title.includes('logo')) {
          spaceId = 's-w2-design';
          listId = 'l-w2-mockups';
        } else {
          spaceId = 's-w2-product';
          listId = 'l-w2-sprint1';
        }
      } else if (t.workspaceId === 'w1') {
        spaceId = 's-w1-personal';
        listId = 'l-w1-todo';
      } else if (t.workspaceId === 'w3') {
        spaceId = 's-w3-prep';
        listId = 'l-w3-roadmap';
      }
      
      return {
        ...t,
        spaceId,
        listId,
        assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : [])
      };
    });
  };



  const handleWorkspaceChange = (id: string) => {
    const w = workspaces.find(ws => ws.id === id);
    if (!w) return;
    setActiveWorkspaceId(id);
    setAccentPreset(w.theme as any);
    setShowWorkspaceMenu(false);
    setActiveSpaceId(null);
    setActiveListId(null);
    addSyncLog(`Switched to workspace: ${w.name}`);
  };

  const openWorkspaceSettings = (w: any) => {
    setEditingWorkspaceForModal(w);
    setShowWorkspaceSettingsModal(true);
    setShowWorkspaceMenu(false);
  };

  const saveWorkspaceSettings = () => {
    if (!showWorkspaceSettingsId) return;
    handleUpdateWorkspace(showWorkspaceSettingsId, editWSName, editWSTheme);
    setShowWorkspaceSettingsId(null);
  };

  const cancelWorkspaceSettings = () => {
    setShowWorkspaceSettingsId(null);
  };

  // Mount-only effect to load all persisted settings from localStorage safely in Next.js SSR
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedSession = localStorage.getItem('avaxa_session');
      if (savedSession) {
        const { user, expiresAt } = JSON.parse(savedSession);
        if (Date.now() < expiresAt) {
          updateCurrentUser(user);
        } else {
          localStorage.removeItem('avaxa_session');
        }
      }
    } catch (e) {
      console.error('Error restoring login session:', e);
    }

    try {
      const saved = localStorage.getItem('avaxa_accent_preset');
      if (saved === 'ocean' || saved === 'forest' || saved === 'sunset' || saved === 'indigo') {
        setAccentPreset(saved);
      }
    } catch (e) {
      console.error('Error restoring color preset:', e);
    }

    try {
      const savedSound = localStorage.getItem('avaxa_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound !== 'false');
      }
    } catch (e) {}

    try {
      const savedBlur = localStorage.getItem('avaxa_blur_intensity');
      if (savedBlur === 'soft' || savedBlur === 'default' || savedBlur === 'immersive') {
        setBlurIntensity(savedBlur);
      }
    } catch (e) {}

    try {
      const savedNotifications = localStorage.getItem('avaxa_notification_settings');
      if (savedNotifications) {
        setNotificationSettings((prev: any) => ({ ...prev, ...JSON.parse(savedNotifications) }));
      }
    } catch (e) {}

    try {
      const workVal = localStorage.getItem('avaxa_pomo_work');
      const shortVal = localStorage.getItem('avaxa_pomo_short');
      const longVal = localStorage.getItem('avaxa_pomo_long');
      if (workVal) {
        const workNum = Number(workVal);
        setWorkDuration(workNum);
        setPomodoroTime(workNum * 60);
      }
      if (shortVal) setShortBreakDuration(Number(shortVal));
      if (longVal) setLongBreakDuration(Number(longVal));
    } catch (e) {}

    // Mark as loaded so subsequent state updates save back to localStorage
    isLoaded.current = true;
  }, [setAccentPreset, setBlurIntensity, setLongBreakDuration, setNotificationSettings, setPomodoroTime, setShortBreakDuration, setSoundEnabled, setWorkDuration, updateCurrentUser]);

  // Pomodoro timer handlers
  const handleStartPomodoro = () => {
    if (!pomodoroActive) {
      setPreviousStatus(userStatus);
      if (pomodoroMode === 'work') {
        setUserStatus('focused');
      }
      setPomodoroActive(true);
      const modeLabel = pomodoroMode === 'work' ? 'Focus' : (pomodoroMode === 'short' ? 'Short Break' : 'Long Break');
      const minutes = pomodoroMode === 'work' ? workDuration : (pomodoroMode === 'short' ? shortBreakDuration : longBreakDuration);
      triggerToast('info', 'Focus Mode Active', `Launched Pomodoro ${modeLabel} for ${minutes} minutes. Blocking non-critical notifications.`);
      addSyncLog(`Activated Pomodoro ${modeLabel} session (${minutes} minutes)`);
    }
  };

  const handlePausePomodoro = () => {
    setPomodoroActive(false);
    triggerToast('info', 'Paused', 'Pomodoro focus timer paused.');
    addSyncLog('Paused Pomodoro focus session');
  };

  const handleStopPomodoro = () => {
    setPomodoroActive(false);
    const d = pomodoroMode === 'work' ? workDuration : (pomodoroMode === 'short' ? shortBreakDuration : longBreakDuration);
    setPomodoroTime(d * 60);
    setUserStatus(previousStatus === 'focused' ? 'online' : previousStatus);
    triggerToast('info', 'Focus Ended', 'Pomodoro stopped, restoring notifications.');
    addSyncLog('Stopped Pomodoro focus session');
  };

  const handleSwitchPomodoroMode = (mode: 'work' | 'short' | 'long') => {
    setPomodoroActive(false);
    setPomodoroMode(mode);
    const d = mode === 'work' ? workDuration : (mode === 'short' ? shortBreakDuration : longBreakDuration);
    setPomodoroTime(d * 60);
    setUserStatus(previousStatus === 'focused' ? 'online' : previousStatus);
    addSyncLog(`Changed Pomodoro mode to: ${mode === 'work' ? 'Work' : (mode === 'short' ? 'Short Break' : 'Long Break')}`);
  };

  const handleUpdatePomoDurations = (workVal: number, shortVal: number, longVal: number) => {
    setWorkDuration(workVal);
    setShortBreakDuration(shortVal);
    setLongBreakDuration(longVal);
    localStorage.setItem('avaxa_pomo_work', String(workVal));
    localStorage.setItem('avaxa_pomo_short', String(shortVal));
    localStorage.setItem('avaxa_pomo_long', String(longVal));

    const currentDuration = pomodoroMode === 'work' ? workVal : (pomodoroMode === 'short' ? shortVal : longVal);
    if (!pomodoroActive) {
      setPomodoroTime(currentDuration * 60);
    }
    triggerToast('success', 'Updated Successfully', 'New Pomodoro durations configuration applied.');
  };

  // Global search navigation & selection triggers - consumed from useUiStore
  const initialSelectedTaskId = useUiStore((s) => s.initialSelectedTaskId);
  const setInitialSelectedTaskId = useUiStore((s) => s.setInitialSelectedTaskId);
  const initialSelectedDocId = useUiStore((s) => s.initialSelectedDocId);
  const setInitialSelectedDocId = useUiStore((s) => s.setInitialSelectedDocId);
  const initialSelectedChannelId = useUiStore((s) => s.initialSelectedChannelId);
  const setInitialSelectedChannelId = useUiStore((s) => s.setInitialSelectedChannelId);

  const isSearchOpen = useUiStore((s) => s.isSearchOpen);
  const setIsSearchOpen = useUiStore((s) => s.setIsSearchOpen);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const searchCategory = useUiStore((s) => s.searchCategory);
  const setSearchCategory = useUiStore((s) => s.setSearchCategory);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Reset category filter when search modal is opened/closed
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchCategory('all');
    }
  }, [isSearchOpen, setSearchCategory]);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K or / to open search, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setSearchCategory('commands');
        setSearchQuery('/');
        setIsSearchOpen(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen, setSearchCategory, setSearchQuery]);



  // Offline/Sync state - consumed from useUiStore
  const isOffline = useUiStore((s) => s.isOffline);
  const setIsOffline = useUiStore((s) => s.setIsOffline);
  const syncing = useUiStore((s) => s.syncing);
  const setSyncing = useUiStore((s) => s.setSyncing);
  const syncProgress = useUiStore((s) => s.syncProgress);
  const setSyncProgress = useUiStore((s) => s.setSyncProgress);
  const viewingMemberProfileId = useUiStore((s) => s.viewingMemberProfileId);
  const setViewingMemberProfileId = useUiStore((s) => s.setViewingMemberProfileId);
  const offlineTasksQueue = useSyncStore((s) => s.offlineTasksQueue);
  const setOfflineTasksQueue = useSyncStore((s) => s.setOfflineTasksQueue);
  const offlineDocsQueue = useSyncStore((s) => s.offlineDocsQueue);
  const setOfflineDocsQueue = useSyncStore((s) => s.setOfflineDocsQueue);
  const offlineMembersQueue = useSyncStore((s) => s.offlineMembersQueue);
  const setOfflineMembersQueue = useSyncStore((s) => s.setOfflineMembersQueue);
  const offlineDeletedTasks = useSyncStore((s) => s.offlineDeletedTasks);
  const setOfflineDeletedTasks = useSyncStore((s) => s.setOfflineDeletedTasks);
  const offlineDeletedDocs = useSyncStore((s) => s.offlineDeletedDocs);
  const setOfflineDeletedDocs = useSyncStore((s) => s.setOfflineDeletedDocs);
  const offlineDeletedMembers = useSyncStore((s) => s.offlineDeletedMembers);
  const setOfflineDeletedMembers = useSyncStore((s) => s.setOfflineDeletedMembers);

  // Sync Activity log state - consumed from useSyncStore
  const syncLogs = useSyncStore((s) => s.syncLogs);
  const setSyncLogs = useSyncStore((s) => s.addSyncLog);
  const clearSyncLogs = useSyncStore((s) => s.clearSyncLogs);

  // Tasks ClickUp dataset
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  // Documents Wiki dataset
  const docs = useDocStore((s) => s.docs);
  const setDocs = useDocStore((s) => s.setDocs);

  // Avaxa Base (no-code database) dataset
  const bases = useBaseStore((s) => s.bases);
  const setBases = useBaseStore((s) => s.setBases);

  // Toast notification state - consumed from useNotificationStore
  const toasts = useNotificationStore((s) => s.toasts);
  const removeToast = useNotificationStore((s) => s.removeToast);
  const addToast = useNotificationStore((s) => s.addToast);
  const lastToastsRef = useRef<Record<string, number>>({});

  // Persistent notifications history list
  const notificationsList = useNotificationStore((s) => s.notificationsList);
  const setNotificationsList = useNotificationStore((s) => s.setNotificationsList);
  const showNotificationsMenu = useUiStore((s) => s.showNotificationsMenu);
  const setShowNotificationsMenu = useUiStore((s) => s.setShowNotificationsMenu);

  const rawSidebarOrder = useUiStore((s) => s.sidebarOrder);
  const sidebarOrder = useMemo(() => rawSidebarOrder || DEFAULT_SIDEBAR_ORDER, [rawSidebarOrder]);
  const setSidebarOrder = useUiStore((s) => s.setSidebarOrder);

  const { invitations: workspaceInvitations } = useWorkspaceInvitations(currentUser?.email, isOffline);
  const { handleSendWorkspaceInvites, handleAcceptWorkspaceInvite, handleDeclineWorkspaceInvite } = useAppActions();

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'top' | 'bottom' | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== id) {
      setDragOverItemId(id);
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      setDragOverSide(relativeY < rect.height / 2 ? 'top' : 'bottom');
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
    setDragOverSide(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverSide(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const defaultOrder = ['dashboard', 'inbox', 'calendar', 'chat', 'docs', 'base', 'tasks', 'goals', 'team'];
    const currentOrder = [...sidebarOrder];
    
    // Ensure all default items are present
    defaultOrder.forEach((id) => {
      if (!currentOrder.includes(id)) {
        currentOrder.push(id);
      }
    });

    const draggedIndex = currentOrder.indexOf(draggedItemId);
    if (draggedIndex !== -1) {
      currentOrder.splice(draggedIndex, 1);
      const adjustedTargetIndex = currentOrder.indexOf(targetId);
      if (adjustedTargetIndex !== -1) {
        const insertIndex = dragOverSide === 'top' ? adjustedTargetIndex : adjustedTargetIndex + 1;
        currentOrder.splice(insertIndex, 0, draggedItemId);
        setSidebarOrder(currentOrder);
        if (typeof window !== 'undefined') {
          (window as any).playSystemSound?.('toggle');
        }
      }
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverSide(null);
  };

  const sidebarItemsMeta = useMemo<Record<string, { label: string; icon: React.ComponentType<any>; count?: number }>>(() => {
    return {
      dashboard: { label: t('homeOverview') || 'Home Overview', icon: PhHouse },
      inbox: { 
        label: t('inbox') || 'Inbox', 
        icon: PhTray, 
        count: notificationsList.filter(n => !n.read && !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length 
      },
      calendar: { label: t('calendarView') || 'Calendar', icon: PhCalendar },
      chat: { label: t('chat') || 'Chat', icon: PhChat },
      docs: { label: t('docs') || 'Docs', icon: PhFileText },
      tasks: { label: t('space') || 'Space', icon: PhBriefcase },
    };
  }, [notificationsList, t]);

  const orderedItems = useMemo(() => {
    const defaultOrder = ['dashboard', 'inbox', 'tasks', 'calendar', 'chat', 'docs'];
    const currentOrder = [...sidebarOrder];
    defaultOrder.forEach((id) => {
      if (!currentOrder.includes(id)) {
        currentOrder.push(id);
      }
    });
    return currentOrder
      .filter((id) => id in sidebarItemsMeta)
      .map((id) => {
        const meta = sidebarItemsMeta[id as keyof typeof sidebarItemsMeta];
        return {
          id,
          label: meta.label,
          icon: meta.icon,
          count: meta.count
        };
      });
  }, [sidebarOrder, sidebarItemsMeta]);

  // Filtered lists for the Global Search modal
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const activeTasks = tasks.filter(t => (t as any).workspaceId === activeWorkspaceId || (activeWorkspaceId === 'w2' && !(t as any).workspaceId));
    return activeTasks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description.toLowerCase().includes(query)
    );
  }, [tasks, activeWorkspaceId, searchQuery]);

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const activeDocs = docs.filter(d => ((d as any).workspaceId === activeWorkspaceId || (activeWorkspaceId === 'w2' && !(d as any).workspaceId)) && d.category !== 'System');
    return activeDocs.filter(d => 
      d.title.toLowerCase().includes(query) || 
      d.content.toLowerCase().includes(query)
    );
  }, [docs, activeWorkspaceId, searchQuery]);

  const filteredChannels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const workspaceChannels = [
      { id: `${activeWorkspaceId}:general`, name: 'general', description: 'General discussion for the department', type: 'public' },
      { id: `${activeWorkspaceId}:project-planning`, name: 'project-planning', description: 'Project planning & KPI tracking', type: 'public' },
      { id: `${activeWorkspaceId}:apexa-ai`, name: 'apexa-ai', description: 'Apexa AI support assistant online', type: 'public' },
      { id: `${activeWorkspaceId}:design-review`, name: 'design-review', description: 'Design whiteboard reviews', type: 'public' }
    ];
    return workspaceChannels.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.description.toLowerCase().includes(query)
    );
  }, [activeWorkspaceId, searchQuery]);

  const totalResultsCount = filteredTasks.length + filteredDocs.length + filteredChannels.length;

  useEffect(() => {
    try {
      localStorage.setItem('avaxa_notifications_list', JSON.stringify(notificationsList));
    } catch (e) {}
  }, [notificationsList]);

  // Dynamic Toast notification trigger function
  const triggerToast = useCallback((type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message', title: string, message: string) => {
    // If a Pomodoro focus timer session is active, block all standard notifications (toasts)
    // we only allow 'success' list or 'info' updates triggered by some administrative actions or pomodoro timer itself
    if (pomodoroActive && type !== 'success' && type !== 'info') {
      console.log(`[Pomodoro Active - Notification Blocked]: ${title}: ${message}`);
      return;
    }

    const titleLower = title.toLowerCase();
    const msgLower = message.toLowerCase();

    // Guard on global switches
    const isDndActive = checkIsDndActive(notificationSettings);

    if (!notificationSettings.enableAll || isDndActive) {
      const isUrgentNotification = type === 'deadline' || 
                                   titleLower.includes('gấp') || 
                                   titleLower.includes('quan trọng') || 
                                   titleLower.includes('hạn chót') || 
                                   msgLower.includes('hạn chót');
      
      if (isDndActive && notificationSettings.dndAllowUrgent && isUrgentNotification) {
        console.log(`[Notification Bypassed DND - Urgent Exception]: ${title}`);
      } else {
        console.log(`[Notification Suppressed - Off or DND]: ${title}`);
        return;
      }
    }

    // Smart Filter: Always suppress minor routine UI actions that already have clear visual feedback
    const isRoutineAction = 
      titleLower.includes('settings saved') ||
      titleLower.includes('updated successfully') ||
      titleLower.includes('timer stopped') ||
      titleLower.includes('display options') ||
      titleLower.includes('date & time format') ||
      titleLower.includes('interface density') ||
      titleLower.includes('tùy chọn') ||
      titleLower.includes('định dạng') ||
      msgLower.includes('updated space configurations') ||
      msgLower.includes('no time was logged') ||
      msgLower.includes('chuyển sang') ||
      msgLower.includes('tự động');

    if (isRoutineAction && (notificationSettings.onlyImportant || notificationSettings.frequencyLimit !== 'all')) {
      console.log(`[Notification Suppressed - Routine UI Action]: ${title}`);
      return;
    }

    // Filter tag updates click annoyances
    if ((titleLower.includes('nhãn') || msgLower.includes('nhãn') || titleLower.includes('lọc')) && !notificationSettings.enableFilteringTags) {
      return;
    }

    // Filter task status change popups
    const isStatusChange = titleLower.includes('trạng thái') || 
                           msgLower.includes('trạng thái') || 
                           msgLower.includes('chuyển sang "cần làm"') || 
                           msgLower.includes('chuyển sang "đang làm"') || 
                           msgLower.includes('chuyển sang "đang duyệt"') || 
                           titleLower.includes('hoàn tất') ||
                           titleLower.includes('đã hoàn thành') ||
                           titleLower.includes('đã mở lại');
    if (isStatusChange && !notificationSettings.enableStatusChanges) {
      return;
    }

    // Category overrides
    if (type === 'assignment' && !notificationSettings.enableAssignments) return;
    if (type === 'deadline' && !notificationSettings.enableDeadlines) return;
    if ((type === 'comment' || type === 'message') && !notificationSettings.enableComments) return;
    if ((type === 'success' || type === 'info') && !isStatusChange && !notificationSettings.enableSystemNotify) {
      return;
    }

    // If important filter is on, only allow high/urgent/critical indicators, deadlines, assignments, errors, or milestones
    if (notificationSettings.onlyImportant) {
      const isImportant = 
        type === 'deadline' || 
        type === 'assignment' || 
        type === 'comment' ||
        type === 'message' ||
        titleLower.includes('gấp') || 
        titleLower.includes('urgent') ||
        titleLower.includes('quan trọng') || 
        titleLower.includes('important') ||
        titleLower.includes('hạn chót') || 
        titleLower.includes('deadline') ||
        titleLower.includes('error') ||
        titleLower.includes('lỗi') ||
        titleLower.includes('warning') ||
        titleLower.includes('cảnh báo') ||
        titleLower.includes('upgrade') ||
        titleLower.includes('invitation') ||
        titleLower.includes('họp');
      if (!isImportant) return;
    }

    // Throttling logic (prevents continuous rapid repeats)
    const now = Date.now();
    if (notificationSettings.frequencyLimit === 'throttled') {
      // Identical suppress in last 3 seconds
      const key = `${type}_${title}_${message}`;
      const lastTime = lastToastsRef.current[key] || 0;
      if (now - lastTime < 3000) {
        console.log(`[Anti-Spam Suppress]: Repeated too quickly: ${title}`);
        return;
      }
      lastToastsRef.current[key] = now;

      // Category pacing - limit to one every 1.5 seconds to avoid flooding
      const catKey = `cat_${type}`;
      const lastCatTime = lastToastsRef.current[catKey] || 0;
      if (now - lastCatTime < 1500) {
        console.log(`[Anti-Spam Suppress]: Category paced: ${type}`);
        return;
      }
      lastToastsRef.current[catKey] = now;
    } else if (notificationSettings.frequencyLimit === 'minimal') {
      // Minimal: max one notification of any type every 5 seconds, only very critical/deadlines
      const key = `global_minimal`;
      const lastTime = lastToastsRef.current[key] || 0;
      const isImportant = type === 'deadline' || type === 'assignment' || titleLower.includes('hạn chót');
      if (!isImportant || now - lastTime < 5000) {
        return;
      }
      lastToastsRef.current[key] = now;
    }

    // Save into Notification Tray History
    const newNotifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setNotificationsList(prev => [
      {
        id: newNotifId,
        type,
        title,
        message,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
        read: false
      },
      ...prev
    ].slice(0, 50));

    // Play synthetic chime if enabled
    if (notificationSettings.enableSound) {
      try {
        const playSystemSoundFn = (window as any).playSystemSound;
        if (playSystemSoundFn) {
          playSystemSoundFn('notification');
        }
      } catch (e) {
        console.warn('System sound play failed:', e);
      }
    }

    addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      duration: notificationSettings.toastDuration
    });
  }, [pomodoroActive, notificationSettings, addToast, setNotificationsList]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get('invite_token');
      if (inviteToken) {
        setActiveTab('inbox');
        triggerToast('info', 'Workspace Invitation', 'You have a pending workspace invitation in your Inbox!');
      }
    }
  }, [setActiveTab, triggerToast]);

  // Auto-scan tasks for upcoming deadlines and alert user via Toast on login
  useEffect(() => {
    if (currentUser && tasks.length > 0) {
      const timer = setTimeout(() => {
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        // Find tasks approaching their deadline (due within 3 days or overdue)
        const upcomingTasks = tasks.filter(t => {
          if (t.status === 'completed' || !t.dueDate) return false;
          try {
            const due = new Date(t.dueDate);
            return !isNaN(due.getTime()) && due <= threeDaysFromNow;
          } catch (e) {
            return false;
          }
        });

        if (upcomingTasks.length > 0) {
          // Read already notified deadlines from local storage to prevent duplicate warnings
          let notifiedMap: Record<string, string> = {};
          try {
            const stored = localStorage.getItem('avaxa_notified_deadlines');
            if (stored) notifiedMap = JSON.parse(stored);
          } catch (e) {
            console.error('Error loading notified deadlines:', e);
          }

          let wasUpdated = false;
          const newNotifiedMap = { ...notifiedMap };

          upcomingTasks.forEach((t, index) => {
            // Skip if already notified for this exact task ID and due date combination
            if (notifiedMap[t.id] === t.dueDate) {
              return;
            }

            setTimeout(() => {
              triggerToast(
                'deadline',
                'Deadline Warning',
                `Task "${t.title}" is approaching its completion date (${t.dueDate}). Please check!`
              );
            }, index * 1200); // Elegant staggered animations

            newNotifiedMap[t.id] = t.dueDate || '';
            wasUpdated = true;
          });

          if (wasUpdated) {
            try {
              localStorage.setItem('avaxa_notified_deadlines', JSON.stringify(newNotifiedMap));
            } catch (e) {
              console.error('Error saving notified deadlines:', e);
            }
          }
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, tasks, triggerToast]);

  const members = useMemberStore((s) => s.members);
  const setMembers = useMemberStore((s) => s.setMembers);

  // Synchronize dynamic members configuration when current user state loads or toggles
  useEffect(() => {
    if (currentUser) {
      setMembers(prev => prev.map(m => m.id === 'user' ? {
        ...m,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar,
        role: currentUser.role
      } : m));
    }
  }, [currentUser, setMembers]);

  // Memoized workspace item collections for high rendering performance
  const currentWorkspaceTasks = useMemo(() => {
    const workspaceSpaceIds = new Set(spaces.filter(s => s.workspaceId === activeWorkspaceId).map(s => s.id));
    const mapped = mapTasksToSpaces(tasks);
    return mapped.filter(t => {
      const matchesWorkspace = t.workspaceId === activeWorkspaceId || (activeWorkspaceId === 'w2' && !t.workspaceId);
      if (!matchesWorkspace) return false;
      return t.spaceId && workspaceSpaceIds.has(t.spaceId);
    });
  }, [tasks, spaces, activeWorkspaceId]);

  const currentWorkspaceDocs = useMemo(() => {
    const workspaceSpaceIds = new Set(spaces.filter(s => s.workspaceId === activeWorkspaceId).map(s => s.id));
    return docs.filter(d => ((d as any).workspaceId === activeWorkspaceId || ((d as any).spaceId && workspaceSpaceIds.has((d as any).spaceId)) || (activeWorkspaceId === 'w2' && !(d as any).workspaceId)) && d.category !== 'System');
  }, [docs, spaces, activeWorkspaceId]);

  const currentWorkspaceBases = useMemo(() => {
    return bases.filter(b => b.workspaceId === activeWorkspaceId || (activeWorkspaceId === 'w2' && !b.workspaceId));
  }, [bases, activeWorkspaceId]);

  const currentWorkspaceMembers = useMemo(() => {
    return members.filter(m => m.workspaceIds?.includes(activeWorkspaceId));
  }, [members, activeWorkspaceId]);

  const currentWorkspaceSpaces = useMemo(() => {
    return spaces.filter(s => s.workspaceId === activeWorkspaceId);
  }, [spaces, activeWorkspaceId]);

  // Auto-save member workspace mappings to localStorage
  useEffect(() => {
    const currentMembers = useMemberStore.getState().members;
    if (!currentUser?.email || currentMembers.length === 0) return;
    const mappings: Record<string, string[]> = {};
    let hasWorkspaceIds = false;
    currentMembers.forEach(m => {
      if (m.workspaceIds && m.workspaceIds.length > 0) {
        mappings[m.id] = m.workspaceIds;
        hasWorkspaceIds = true;
      }
    });
    if (hasWorkspaceIds) {
      localStorage.setItem(`avaxa_member_workspaces_${currentUser.email}`, JSON.stringify(mappings));
    }
  }, [currentUser?.email]);

  // Global SyncLog adder
  const addSyncLog = (action: string) => {
    const newLog: SyncLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: isOffline ? 'offline_saved' : 'synced'
    };
    setSyncLogs(prev => [...prev, newLog]);
  };

  // Sync animation triggers when going online
  const handleToggleOffline = () => {
    if (isOffline) {
      // Trigger smooth synchronization animations
      setSyncing(true);
      setSyncProgress(10);
      
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setSyncing(false);
              setIsOffline(false);
              // Clean all offline saved logs into synchronized status
              setSyncLogs(prevLogs => prevLogs.map(l => l.status === 'offline_saved' ? { ...l, status: 'synced' as const } : l));
              addSyncLog('Data successfully synchronized with the cloud server!');

              // Synchronize all local changes to Supabase in the background
              const syncOfflineData = async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session?.user) {
                    const userId = session.user.id;
                    const syncPromises: PromiseLike<any>[] = [];

                    // 1. Batch Sync tasks
                    const tasksToUpsert = Object.values(offlineTasksQueue) as Task[];
                    if (tasksToUpsert.length > 0) {
                      const formattedTasks = tasksToUpsert.map(t => ({
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        priority: t.priority,
                        status: t.status,
                        assigneeId: t.assigneeId || null,
                        startDate: t.startDate || null,
                        dueDate: t.dueDate || null,
                        subtasks: t.subtasks,
                        progress: t.progress,
                        created_at: t.createdAt,
                        hoursEstimate: t.hoursEstimate || null,
                        hoursLogged: t.hoursLogged || null,
                        commentsCount: t.commentsCount,
                        tags: t.tags || [],
                        isPinned: t.isPinned || false,
                        comments: t.comments,
                        user_id: userId,
                        workspace_id: t.workspaceId || null,
                        space_id: t.spaceId || null,
                        list_id: t.listId || null,
                        custom_fields: t.custom_fields || {},
                        recurrence: t.recurrence || null
                      }));
                      
                      syncPromises.push(
                        supabase.from('tasks')
                          .upsert(formattedTasks)
                          .then(({ error }) => {
                            if (error) console.error('Error syncing batched offline tasks:', error);
                          })
                      );
                    }

                    // 2. Batch Delete tasks
                    if (offlineDeletedTasks.length > 0) {
                      syncPromises.push(
                        supabase.from('tasks')
                          .delete()
                          .in('id', offlineDeletedTasks)
                          .eq('user_id', userId)
                          .then(({ error }) => {
                            if (error) console.error('Error batch deleting offline tasks:', error);
                          })
                      );
                    }

                    // 3. Batch Sync docs
                    const docsToUpsert = Object.values(offlineDocsQueue) as Document[];
                    if (docsToUpsert.length > 0) {
                      const formattedDocs = docsToUpsert.map(d => ({
                        id: d.id,
                        title: d.title,
                        content: d.content,
                        category: d.category,
                        updatedAt: d.updatedAt,
                        updatedBy: d.updatedBy,
                        isAiGenerated: d.isAiGenerated || false,
                        user_id: userId,
                        workspace_id: d.workspaceId || null
                      }));
                      
                      syncPromises.push(
                        supabase.from('docs')
                          .upsert(formattedDocs)
                          .then(({ error }) => {
                            if (error) console.error('Error syncing batched offline docs:', error);
                          })
                      );
                    }

                    // 4. Batch Delete docs
                    if (offlineDeletedDocs.length > 0) {
                      syncPromises.push(
                        supabase.from('docs')
                          .delete()
                          .in('id', offlineDeletedDocs)
                          .eq('user_id', userId)
                          .then(({ error }) => {
                            if (error) console.error('Error batch deleting offline docs:', error);
                          })
                      );
                    }

                    // 5. Batch Sync members
                    const membersToUpsert = Object.values(offlineMembersQueue) as User[];
                    if (membersToUpsert.length > 0) {
                      const formattedMembers = membersToUpsert.map(m => ({
                        id: m.id === 'user' ? `user-${userId}` : m.id,
                        name: m.name,
                        email: m.email,
                        avatar: m.avatar,
                        role: m.role,
                        status: m.status,
                        user_id: userId,
                        phone: m.phone || null,
                        department: m.department || null,
                        bio: m.bio || null,
                        joined_date: m.joinedDate || null,
                        workspace_ids: m.workspaceIds || null
                      }));
                      
                      syncPromises.push(
                        supabase.from('members')
                          .upsert(formattedMembers)
                          .then(({ error }) => {
                            if (error) console.error('Error syncing batched offline members:', error);
                          })
                      );
                    }

                    // 6. Batch Delete members
                    if (offlineDeletedMembers.length > 0) {
                      syncPromises.push(
                        supabase.from('members')
                          .delete()
                          .in('id', offlineDeletedMembers)
                          .eq('user_id', userId)
                          .then(({ error }) => {
                            if (error) console.error('Error batch deleting offline members:', error);
                          })
                      );
                    }

                    // Run all batch database transaction updates concurrently to minimize network roundtrips!
                    if (syncPromises.length > 0) {
                      await Promise.all(syncPromises);
                      addSyncLog(`System merge successful: Optimized sync (${tasksToUpsert.length} new/modified tasks, ${offlineDeletedTasks.length} deleted tasks, ${docsToUpsert.length} new/modified docs, ${offlineDeletedDocs.length} deleted docs).`);
                    } else {
                      addSyncLog('No new offline changes detected for synchronization.');
                    }

                    // Clear the offline queue states upon successful batch processing to reset database transaction trackers
                    setOfflineTasksQueue({});
                    setOfflineDocsQueue({});
                    setOfflineMembersQueue({});
                    setOfflineDeletedTasks([]);
                    setOfflineDeletedDocs([]);
                    setOfflineDeletedMembers([]);
                  }
                } catch (err) {
                  console.error('Error uploading synchronized data to Supabase:', err);
                }
              };
              syncOfflineData();
            }, 600);
            return 100;
          }
          return prev + 15;
        });
      }, 150);
    } else {
      setIsOffline(true);
      addSyncLog('Disconnected from local network. Switched to offline cache storage.');
    }
  };

  // --- Real-time Supabase Data Synchronization Engine ---
  const [dataLoaded, setDataLoaded] = useState(false);

  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingWSName, setOnboardingWSName] = useState('');
  const [onboardingTheme, setOnboardingTheme] = useState<'indigo' | 'ocean' | 'forest' | 'sunset'>('indigo');
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingWSName.trim() || onboardingSubmitting) return;

    setOnboardingSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;
      const myMemberId = `user-${userId}`;

      const newWsId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newWorkspace: Workspace = {
        id: newWsId,
        name: onboardingWSName.trim(),
        theme: onboardingTheme,
        initial: onboardingWSName.trim().charAt(0).toUpperCase(),
        user_id: userId
      };

      // 1. Insert Workspace
      await supabase.from('workspaces').insert([newWorkspace]);

      // 2. Insert Default Space
      const generalSpaceId = `s-${newWsId}-general`;
      await supabase.from('spaces').insert([
        {
          id: generalSpaceId,
          name: 'General',
          emoji: '🧘',
          theme_color: onboardingTheme,
          workspace_id: newWsId,
          folders: [],
          whiteboards: [],
          channels: [{ id: 'general', name: 'general' }],
          statuses: [
            { id: 'todo', label: 'TO DO', color: '#94a3b8', type: 'todo' },
            { id: 'inprogress', label: 'IN PROGRESS', color: '#f59e0b', type: 'inprogress' },
            { id: 'completed', label: 'COMPLETE', color: '#10b981', type: 'completed' }
          ],
          click_apps: { subtasks: true, priorities: true }
        }
      ]);

      // 3. Insert Default Lists
      await supabase.from('lists').insert([
        { id: `l-${newWsId}-inbox`, name: 'Inbox', space_id: generalSpaceId, user_id: userId },
        { id: `l-${newWsId}-tasks`, name: 'Tasks', space_id: generalSpaceId, user_id: userId }
      ]);

      // 4. Create/Update Profile
      const myAvatar = '';
      const newProfile = {
        id: myMemberId,
        name: onboardingName.trim(),
        email: session.user.email || '',
        avatar: myAvatar,
        role: 'admin',
        status: 'online',
        user_id: userId,
        workspace_ids: [newWsId]
      };

      await supabase.from('members').upsert([newProfile], { onConflict: 'id' });

      // 5. Update Zustand stores
      setWorkspaces([newWorkspace]);
      setActiveWorkspaceId(newWsId);
      setMembers([{
        id: 'user',
        name: onboardingName.trim(),
        email: session.user.email || '',
        avatar: myAvatar,
        role: 'admin',
        status: 'online',
        workspaceIds: [newWsId],
        phone: '',
        department: '',
        bio: '',
        joinedDate: '2026'
      }]);

      triggerToast('success', 'Workspace Launched! 🎉', `Welcome ${onboardingName.trim()}, your workspace "${onboardingWSName.trim()}" is ready.`);
      (window as any).playSystemSound?.('success');
      
      setShowOnboarding(false);
      
      // Reload page to re-trigger loadAndSubscribe hooks with new workspace ID
      window.location.reload();
    } catch (err) {
      console.error('Onboarding failed:', err);
      triggerToast('info', 'Error launching workspace', 'Please try again.');
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!currentUser || isOffline) return;

    let tasksChannel: any = null;
    let docsChannel: any = null;
    let membersChannel: any = null;
    let workspacesChannel: any = null;
    let spacesChannel: any = null;
    let listsChannel: any = null;
    let baseAppsChannel: any = null;
    let invitationsChannel: any = null;

    const loadAndSubscribe = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        // A. Load Team Members first to find user profile (or handle placeholder)
        const myMemberId = `user-${userId}`;
        const myName = currentUser?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Avaxa Champion';
        const myEmail = currentUser?.email || session.user.email || '';
        const myAvatar = currentUser?.avatar || session.user.user_metadata?.avatar_url || session.user.user_metadata?.avatar || '';
        const myRole = currentUser?.role || ((session.user.email?.includes('admin') || session.user.email === 'hoang.benjamin.creative@gmail.com') ? 'admin' : 'member');
        
        let dbMembers: any[] = [];
        let membersFetchError = false;
        try {
          const { data, error: fetchErr } = await supabase.from('members').select('*');
          if (fetchErr) {
            console.warn('Could not load members table:', fetchErr);
            membersFetchError = true;
          } else if (data) {
            dbMembers = data;
          }
        } catch (e) {
          console.warn('Could not load members table:', e);
          membersFetchError = true;
        }

        if (!active) return;

        let finalMembers = dbMembers || [];
        
        // Targeted queries to be absolutely sure if user exists or not, preventing false onboarding triggers!
        let myDbProfile = finalMembers.find(m => m.id === myMemberId || m.email === myEmail);
        let isBrandNewUser = false;

        if (!myDbProfile) {
          try {
            const { data: directProfile } = await supabase
              .from('members')
              .select('*')
              .eq('id', myMemberId)
              .maybeSingle();
            
            if (directProfile) {
              myDbProfile = directProfile;
              finalMembers.push(directProfile);
            } else {
              const { data: emailProfile } = await supabase
                .from('members')
                .select('*')
                .eq('email', myEmail)
                .maybeSingle();

              if (emailProfile) {
                myDbProfile = emailProfile;
                finalMembers.push(emailProfile);
              } else {
                // If targeted check is also null, the user is brand new!
                isBrandNewUser = true;
              }
            }
          } catch (e) {
            console.error('Failed targeted profile checks:', e);
          }
        }

        // If the user has an invited placeholder profile by email but not logged-in ID, update it
        if (myDbProfile && myDbProfile.id !== myMemberId) {
          const oldId = myDbProfile.id;
          const updatedProfile = {
            ...myDbProfile,
            id: myMemberId,
            user_id: userId,
            name: myName,
            avatar: myAvatar,
            status: 'online',
            role: myRole
          };
          
          await supabase.from('members').delete().eq('id', oldId);
          await supabase.from('members').insert([updatedProfile]);
          
          myDbProfile = updatedProfile;
          finalMembers = finalMembers.filter(m => m.id !== oldId);
          finalMembers.push(updatedProfile);
        }

        // If the query failed completely (network issue), do not trigger onboarding.
        if (!myDbProfile && !isBrandNewUser) {
          console.warn('Profile fetch failed or still loading. Preventing onboarding trigger.');
          setDataLoaded(true);
          return;
        }

        // If they still don't have a profile, auto-create a default profile in the background
        if (isBrandNewUser) {
          const newProfile = {
            id: myMemberId,
            name: myName,
            email: session.user.email || '',
            avatar: myAvatar,
            role: myRole,
            status: 'online',
            user_id: userId,
            workspace_ids: []
          };
          try {
            await supabase.from('members').insert([newProfile]);
            myDbProfile = newProfile;
            finalMembers.push(newProfile);
            isBrandNewUser = false;
          } catch (e) {
            console.error('Failed to auto-create profile:', e);
          }
        }

        let allowedIds: string[] = myDbProfile.workspace_ids || [];

        if (allowedIds.length === 0) {
          // Auto-create a default workspace for existing user with empty workspaces
          const fallbackWsId = `ws-fallback-${Date.now()}`;
          const fallbackWs = {
            id: fallbackWsId,
            name: 'Personal Workspace',
            theme: 'indigo',
            initial: 'P',
            user_id: userId
          };
          try {
            await supabase.from('workspaces').insert([fallbackWs]);
            
            // Create default space & lists
            const generalSpaceId = `s-${fallbackWsId}-general`;
            await supabase.from('spaces').insert([
              {
                id: generalSpaceId,
                name: 'General',
                emoji: '🧘',
                theme_color: 'indigo',
                workspace_id: fallbackWsId,
                folders: [],
                whiteboards: [],
                channels: [{ id: 'general', name: 'general' }],
                statuses: [
                  { id: 'todo', label: 'TO DO', color: '#94a3b8', type: 'todo' },
                  { id: 'inprogress', label: 'IN PROGRESS', color: '#f59e0b', type: 'inprogress' },
                  { id: 'completed', label: 'COMPLETE', color: '#10b981', type: 'completed' }
                ],
                click_apps: { subtasks: true, priorities: true }
              }
            ]);
            await supabase.from('lists').insert([
              { id: `l-${fallbackWsId}-inbox`, name: 'Inbox', space_id: generalSpaceId, user_id: userId },
              { id: `l-${fallbackWsId}-tasks`, name: 'Tasks', space_id: generalSpaceId, user_id: userId }
            ]);

            const updatedWSIds = [fallbackWsId];
            await supabase.from('members').update({ workspace_ids: updatedWSIds }).eq('id', myMemberId);
            myDbProfile.workspace_ids = updatedWSIds;
            allowedIds = updatedWSIds;
          } catch (e) {
            console.error('Failed to create fallback workspace:', e);
          }
        }

        // A0. Load all Workspaces from Supabase
        let wsSuccess = false;
        try {
          const { data: dbWorkspaces, error: wsError } = await supabase
            .from('workspaces')
            .select('*');

          if (!active) return;

          if (wsError) {
            console.warn('workspaces table check or fetch failed:', wsError.message);
          } else {
            wsSuccess = true;
            const finalWorkspaces = dbWorkspaces || [];
            
            if (finalWorkspaces.length > 0) {
              setWorkspaces(finalWorkspaces.map(w => ({
                id: w.id,
                name: w.name,
                theme: w.theme || 'indigo',
                initial: w.initial || w.name.charAt(0).toUpperCase(),
                user_id: w.user_id,
                coverUrl: w.coverUrl || '',
                logoUrl: w.logoUrl || '',
                settings: w.settings || {}
              })));

              const allWorkspaceIds = finalWorkspaces.map(w => w.id);
              if (!allWorkspaceIds.includes(activeWorkspaceId)) {
                // Prefer an allowedId workspace, fall back to first available
                const preferredId = allowedIds.find(id => allWorkspaceIds.includes(id));
                setActiveWorkspaceId(preferredId || allWorkspaceIds[0]);
              }
            } else {
              // Workspaces deleted or missing - auto-create fallback
              const fallbackWsId = `ws-fallback-${Date.now()}`;
              const fallbackWs = {
                id: fallbackWsId,
                name: 'Personal Workspace',
                theme: 'indigo',
                initial: 'P',
                user_id: userId
              };
              try {
                await supabase.from('workspaces').insert([fallbackWs]);
                const generalSpaceId = `s-${fallbackWsId}-general`;
                await supabase.from('spaces').insert([
                  {
                    id: generalSpaceId,
                    name: 'General',
                    emoji: '🧘',
                    theme_color: 'indigo',
                    workspace_id: fallbackWsId,
                    folders: [],
                    whiteboards: [],
                    channels: [{ id: 'general', name: 'general' }],
                    statuses: [
                      { id: 'todo', label: 'TO DO', color: '#94a3b8', type: 'todo' },
                      { id: 'inprogress', label: 'IN PROGRESS', color: '#f59e0b', type: 'inprogress' },
                      { id: 'completed', label: 'COMPLETE', color: '#10b981', type: 'completed' }
                    ],
                    click_apps: { subtasks: true, priorities: true }
                  }
                ]);
                await supabase.from('lists').insert([
                  { id: `l-${fallbackWsId}-inbox`, name: 'Inbox', space_id: generalSpaceId, user_id: userId },
                  { id: `l-${fallbackWsId}-tasks`, name: 'Tasks', space_id: generalSpaceId, user_id: userId }
                ]);
                
                const updatedWSIds = [fallbackWsId];
                await supabase.from('members').update({ workspace_ids: updatedWSIds }).eq('id', myMemberId);
                if (myDbProfile) {
                  myDbProfile.workspace_ids = updatedWSIds;
                }
                
                setWorkspaces([fallbackWs]);
                setActiveWorkspaceId(fallbackWsId);
              } catch (e) {
                console.error('Failed to auto-create fallback workspace on missing:', e);
              }
            }
          }
        } catch (e) {
          console.warn('Exception querying workspaces:', e);
        }

        if (!wsSuccess && active) {
          // Local storage fallback cache
          const cachedWS = localStorage.getItem(`avaxa_fallback_workspaces_${userId}`);
          if (cachedWS) {
            try { setWorkspaces(JSON.parse(cachedWS)); } catch (e) {}
          }
        }

        // Make sure status is set to online in DB
        await supabase.from('members').update({ status: 'online' }).eq('id', myMemberId);
        myDbProfile.status = 'online';

        // Load members list
        if (finalMembers.length > 0) {
          const userEmail = session.user.email || 'default';
          const storedWorkspaceMapRaw = localStorage.getItem(`avaxa_member_workspaces_${userEmail}`);
          const storedWorkspaceMap = storedWorkspaceMapRaw ? JSON.parse(storedWorkspaceMapRaw) : {};

          setMembers(finalMembers.map(m => {
            const isMe = m.id === myMemberId;
            const memberId = isMe ? 'user' : m.id;
            const workspaceIds = m.workspace_ids || storedWorkspaceMap[m.id] || [];
            return {
              id: memberId,
              name: m.name,
              email: m.email,
              avatar: m.avatar,
              role: m.role as any,
              status: m.status as any,
              workspaceIds,
              phone: m.phone || '',
              department: m.department || '',
              bio: m.bio || '',
              joinedDate: m.joined_date || '2026'
            };
          }));
        }

        // B. Load Tasks from Supabase
        const { data: dbTasks, error: tasksErr } = await supabase
          .from('tasks')
          .select('*');

        if (!active) return;

        const finalTasks = dbTasks || [];

        if (finalTasks.length > 0) {
          setTasks(finalTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority as any,
            status: t.status as any,
            assigneeId: t.assigneeId || undefined,
            assigneeIds: getTaskAssigneeIds(t),
            custom_fields: buildTaskCustomFields(t),
            startDate: t.startDate || undefined,
            dueDate: t.dueDate || undefined,
            subtasks: t.subtasks || [],
            progress: t.progress || 0,
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
            hoursEstimate: t.hoursEstimate || undefined,
            hoursLogged: t.hoursLogged || undefined,
            commentsCount: t.commentsCount || 0,
            tags: t.tags || [],
            isPinned: t.isPinned || false,
            comments: t.comments || [],
            attachments: t.attachments || [],
            workspaceId: t.workspace_id || undefined,
            spaceId: t.space_id || undefined,
            listId: t.list_id || undefined,
            recurrence: t.recurrence || undefined
          })));
        } else {
          setTasks([]);
        }

        // C. Load Documents
        const { data: dbDocs, error: docsErr } = await supabase
          .from('docs')
          .select('*');

        if (!active) return;

        const finalDocs = dbDocs || [];

        if (finalDocs.length > 0) {
          // Pre-populate manual task order lists from db to localstorage for instant sync
          finalDocs.forEach(d => {
            if (d.title && d.title.startsWith('System Task Order: ')) {
              const wsId = d.title.replace('System Task Order: ', '');
              if (wsId && d.content) {
                try {
                  localStorage.setItem(`avaxa_task_order_${wsId}`, d.content);
                } catch (e) {}
              }
            }
          });

          setDocs(finalDocs.map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            content: d.content,
            updatedAt: d.updatedAt,
            updatedBy: d.updatedBy,
            isAiGenerated: d.isAiGenerated || false,
            workspaceId: d.workspace_id || undefined
          })));
        } else {
          setDocs([]);
        }

        // C2. Load Base apps from Supabase
        const fetchBaseApps = async () => {
          try {
            const { data: dbBases } = await supabase
              .from('base_apps')
              .select('*');

            if (active && dbBases) {
              setBases(dbBases.map(b => ({
                id: b.id,
                name: b.name,
                emoji: b.emoji || '📋',
                description: b.description || '',
                tables: b.tables || [],
                activeTableId: b.active_table_id || undefined,
                workspaceId: b.workspace_id || undefined,
                createdAt: b.created_at || new Date().toISOString(),
                updatedAt: b.updated_at || new Date().toISOString(),
              })));
              try { localStorage.setItem('avaxa_bases', JSON.stringify(dbBases.map(b => ({
                id: b.id, name: b.name, emoji: b.emoji, description: b.description,
                tables: b.tables, activeTableId: b.active_table_id, workspaceId: b.workspace_id,
                createdAt: b.created_at, updatedAt: b.updated_at,
              })))); } catch (e) {}
            }
          } catch (e) {
            console.warn('Base apps load warning (table may not exist yet):', e);
          }
        };

        await fetchBaseApps();

        // D. Load Spaces and Lists from Supabase
        const fetchSpacesAndLists = async () => {
          try {
            const { data: dbSpaces, error: spacesErr } = await supabase
              .from('spaces')
              .select('*');
            
            const { data: dbLists, error: listsErr } = await supabase
              .from('lists')
              .select('*');

            if (!active) return false;

            if (spacesErr) {
              console.warn('Spaces table fetch failed:', spacesErr.message);
              return false;
            }

            const finalSpaces = dbSpaces || [];
            const hasSeededSpaces = localStorage.getItem(`avaxa_seeded_spaces_${userId}`);

            if (finalSpaces.length > 0) {
              const formattedSpaces = finalSpaces.map(s => ({
                id: s.id,
                name: s.name,
                emoji: s.emoji || '📦',
                themeColor: s.theme_color || 'indigo',
                workspaceId: s.workspace_id,
                lists: (dbLists || []).filter(l => l.space_id === s.id).map(l => ({
                  id: l.id,
                  name: l.name,
                  folderId: l.folder_id || undefined
                })),
                folders: s.folders || [],
                whiteboards: s.whiteboards || [],
                channels: s.channels || [],
                statuses: s.statuses || [],
                clickApps: s.click_apps || {}
              }));
              setSpaces(formattedSpaces);
              if (!hasSeededSpaces) {
                try { localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true'); } catch (e) {}
              }
              return true;
            }

            if (hasSeededSpaces) {
              setSpaces([]);
              return true;
            }

            return false;
          } catch (e) {
            console.error('Exception loading spaces/lists:', e);
            return false;
          }
        };

        const spacesSuccess = await fetchSpacesAndLists();
        
        if (!spacesSuccess && active) {
          // Seed from localStorage or defaults
          const savedSpaces = localStorage.getItem(`avaxa_spaces_${userId}`);
          let localSpaces: Space[] = [];
          if (savedSpaces) {
            try { localSpaces = JSON.parse(savedSpaces); } catch (e) {}
          }

          if (localSpaces.length === 0) {
            localSpaces = [
              {
                id: 's-w1-personal',
                name: 'Personal Space',
                emoji: '🧘',
                themeColor: 'indigo',
                workspaceId: 'w1',
                lists: [
                  { id: 'l-w1-inbox', name: 'Inbox' },
                  { id: 'l-w1-todo', name: 'To Do' }
                ],
                clickApps: { subtasks: true, priorities: true }
              },
              {
                id: 's-w2-product',
                name: 'Product Space',
                emoji: '🔮',
                themeColor: 'indigo',
                workspaceId: 'w2',
                lists: [
                  { id: 'l-w2-roadmap', name: 'Product Roadmap' },
                  { id: 'l-w2-sprint1', name: 'Sprint 1' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, timeTracking: true }
              },
              {
                id: 's-w2-marketing',
                name: 'Marketing Space',
                emoji: '📢',
                themeColor: 'rose',
                workspaceId: 'w2',
                lists: [
                  { id: 'l-w2-campaign', name: 'Campaign Kickoff' },
                  { id: 'l-w2-seo', name: 'SEO Plan' },
                  { id: 'l-w2-email', name: 'Email Launch' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, relationships: true }
              }
            ];
          }

          // Migrate to Supabase
          try {
            for (const space of localSpaces) {
              await supabase.from('spaces').insert({
                id: space.id,
                name: space.name,
                emoji: space.emoji || null,
                theme_color: space.themeColor || null,
                workspace_id: space.workspaceId,
                folders: space.folders || [],
                whiteboards: space.whiteboards || [],
                channels: space.channels || [],
                statuses: space.statuses || [],
                click_apps: space.clickApps || {},
                user_id: userId
              });
              
              if (space.lists.length > 0) {
                const listsToInsert = space.lists.map(l => ({
                  id: l.id,
                  name: l.name,
                  space_id: space.id,
                  folder_id: l.folderId || null,
                  user_id: userId
                }));
                await supabase.from('lists').insert(listsToInsert);
              }
            }
            try { localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true'); } catch (e) {}
          } catch (e) {
            console.error('Error during seeding spaces migration:', e);
          }

          setSpaces(localSpaces);
        }

        setDataLoaded(true);
        addSyncLog('Cloud storage synchronized with Supabase successfully!');

        // Set up Realtime Postgres Changes Channels
        if (active) {
          tasksChannel = supabase.channel('realtime-tasks')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'tasks'
              },
              (payload) => {
                const eventType = payload.eventType;
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                  const t = payload.new as any;
                  if (!t || !t.id) return;
                  const mappedTask: Task = {
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority as any,
                    status: t.status as any,
                    assigneeId: t.assigneeId || undefined,
                    assigneeIds: getTaskAssigneeIds(t),
                    custom_fields: buildTaskCustomFields(t),
                    startDate: t.startDate || undefined,
                    dueDate: t.dueDate || undefined,
                    subtasks: t.subtasks || [],
                    progress: t.progress || 0,
                    createdAt: t.created_at || t.createdAt || new Date().toISOString(),
                    hoursEstimate: t.hoursEstimate || undefined,
                    hoursLogged: t.hoursLogged || undefined,
                    commentsCount: t.commentsCount || 0,
                    tags: t.tags || [],
                    isPinned: t.isPinned || false,
                    comments: t.comments || [],
                    attachments: t.attachments || [],
                    workspaceId: t.workspace_id || undefined,
                    spaceId: t.space_id || undefined,
                    listId: t.list_id || undefined,
                    recurrence: t.recurrence || undefined
                  };
                  setTasks(prev => {
                    const exists = prev.some(item => item.id === mappedTask.id);
                    if (exists) {
                      return prev.map(item => item.id === mappedTask.id ? mappedTask : item);
                    } else {
                      return [...prev, mappedTask];
                    }
                  });
                } else if (eventType === 'DELETE') {
                  if (payload.old && payload.old.id) {
                    setTasks(prev => prev.filter(item => item.id !== payload.old.id));
                  }
                }
              }
            )
            .subscribe();

          docsChannel = supabase.channel('realtime-docs')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'docs'
              },
              (payload) => {
                const eventType = payload.eventType;
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                  const d = payload.new as any;
                  if (!d || !d.id) return;
                  const mappedDoc: Document = {
                    id: d.id,
                    title: d.title,
                    category: d.category,
                    content: d.content,
                    updatedAt: d.updatedAt,
                    updatedBy: d.updatedBy,
                    isAiGenerated: d.isAiGenerated || false,
                    workspaceId: d.workspace_id || undefined
                  };
                  setDocs(prev => {
                    const exists = prev.some(item => item.id === mappedDoc.id);
                    if (exists) {
                      return prev.map(item => item.id === mappedDoc.id ? mappedDoc : item);
                    } else {
                      return [...prev, mappedDoc];
                    }
                  });
                } else if (eventType === 'DELETE') {
                  if (payload.old && payload.old.id) {
                    setDocs(prev => prev.filter(item => item.id !== payload.old.id));
                  }
                }
              }
            )
            .subscribe();

          membersChannel = supabase.channel('realtime-members')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'members'
              },
              (payload) => {
                const eventType = payload.eventType;
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                  const m = payload.new as any;
                  if (!m || !m.id) return;
                  const isMe = m.id === `user-${userId}` || m.id === 'user';
                  const memberId = isMe ? 'user' : m.id;
                  const mappedMember: User = {
                    id: memberId,
                    name: m.name,
                    email: m.email,
                    avatar: m.avatar,
                    role: m.role as any,
                    status: m.status as any,
                    workspaceIds: m.workspace_ids || [],
                    phone: m.phone || '',
                    department: m.department || '',
                    bio: m.bio || '',
                    joinedDate: m.joined_date || '2026'
                  };
                  setMembers(prev => {
                    const exists = prev.some(item => item.id === mappedMember.id);
                    if (exists) {
                      return prev.map(item => item.id === mappedMember.id ? mappedMember : item);
                    } else {
                      return [...prev, mappedMember];
                    }
                  });
                } else if (eventType === 'DELETE') {
                  if (payload.old && payload.old.id) {
                    const targetId = payload.old.id === `user-${userId}` ? 'user' : payload.old.id;
                    setMembers(prev => prev.filter(item => item.id !== targetId));
                  }
                }
              }
            )
            .subscribe();

          workspacesChannel = supabase.channel('realtime-workspaces')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'workspaces'
              },
              (payload) => {
                const eventType = payload.eventType;
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                  const w = payload.new as any;
                  if (!w || !w.id) return;
                  const mappedWS = {
                    id: w.id,
                    name: w.name,
                    theme: w.theme || 'indigo',
                    initial: w.initial || w.name.charAt(0).toUpperCase(),
                    user_id: w.user_id,
                    coverUrl: w.coverUrl || '',
                    logoUrl: w.logoUrl || '',
                    settings: w.settings || {}
                  };
                  setWorkspaces(prev => {
                    const exists = prev.some(item => item.id === mappedWS.id);
                    if (exists) {
                      return prev.map(item => item.id === mappedWS.id ? mappedWS : item);
                    } else {
                      return [...prev, mappedWS];
                    }
                  });
                } else if (eventType === 'DELETE') {
                  if (payload.old && payload.old.id) {
                    setWorkspaces(prev => prev.filter(item => item.id !== payload.old.id));
                  }
                }
              }
            )
            .subscribe();

          spacesChannel = supabase.channel('realtime-spaces')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'spaces'
              },
              () => {
                fetchSpacesAndLists();
              }
            )
            .subscribe();

          listsChannel = supabase.channel('realtime-lists')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'lists'
              },
              () => {
                fetchSpacesAndLists();
              }
            )
            .subscribe();

          baseAppsChannel = supabase.channel('realtime-base-apps')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'base_apps'
              },
              () => {
                fetchBaseApps();
              }
            )
            .subscribe();

          invitationsChannel = supabase.channel('realtime-workspace-invitations')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'workspace_invitations'
              },
              () => {
                // Dispatch event so that useWorkspaceInvitations hook updates automatically
                window.dispatchEvent(new CustomEvent('avaxa-invitation-updated'));
              }
            )
            .subscribe();

          addSyncLog('Realtime sync via Supabase channels successful!');
        }
      } catch (err) {
        console.error('Error during realtime data sync:', err);
      }
    };

    loadAndSubscribe();
    return () => {
      active = false;
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (docsChannel) supabase.removeChannel(docsChannel);
      if (membersChannel) supabase.removeChannel(membersChannel);
      if (workspacesChannel) supabase.removeChannel(workspacesChannel);
      if (spacesChannel) supabase.removeChannel(spacesChannel);
      if (listsChannel) supabase.removeChannel(listsChannel);
      if (baseAppsChannel) supabase.removeChannel(baseAppsChannel);
      if (invitationsChannel) supabase.removeChannel(invitationsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isOffline]);

  // --- Supabase CRUD Wrapper Functions ---

  const handleCreateWorkspace = async (name: string, theme: string, coverUrl?: string) => {
    const initial = name.charAt(0).toUpperCase();
    const newId = `w-${Date.now()}`;
    const newWS = { id: newId, name, theme, initial, coverUrl };

    // Helper to create default isolated space for new workspace
    const createDefaultSpaceForWorkspace = (wsId: string, wsName: string, wsTheme: string) => {
      const defaultSpace: Space = {
        id: `sp-${Date.now()}`,
        name: `${wsName} Space`,
        emoji: '🚀',
        themeColor: wsTheme === 'ocean' ? '#0891b2' : wsTheme === 'forest' ? '#047857' : wsTheme === 'sunset' ? '#e11d48' : '#6366f1',
        workspaceId: wsId,
        lists: [
          { id: `l-${Date.now()}-1`, name: 'To Do' },
          { id: `l-${Date.now()}-2`, name: 'In Progress' },
          { id: `l-${Date.now()}-3`, name: 'Completed' }
        ],
        statuses: [
          { id: 'todo', label: 'TO DO', color: '#94a3b8', type: 'todo' },
          { id: 'inprogress', label: 'IN PROGRESS', color: '#3b82f6', type: 'inprogress' },
          { id: 'review', label: 'IN REVIEW', color: '#a855f7', type: 'review' },
          { id: 'completed', label: 'COMPLETE', color: '#22c55e', type: 'completed' }
        ]
      };
      setSpaces(prev => [...prev, defaultSpace]);
      return defaultSpace;
    };

    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let { data, error } = await supabase.from('workspaces').insert([{
            id: newId,
            name,
            theme,
            initial,
            user_id: session.user.id,
            coverUrl
          }]).select();

          if (error) {
            console.warn('Error creating with coverUrl on DB (retrying without coverUrl):', error.message);
            const fallbackResult = await supabase.from('workspaces').insert([{
              id: newId,
              name,
              theme,
              initial,
              user_id: session.user.id
            }]).select();
            data = fallbackResult.data;
            error = fallbackResult.error;
          }

          if (!error && data && data.length > 0) {
            const saved = data[0];
            const mappedSaved = {
              id: saved.id,
              name: saved.name,
              theme: saved.theme || 'indigo',
              initial: saved.initial || initial,
              user_id: saved.user_id,
              coverUrl: saved.coverUrl || coverUrl
            };
            setWorkspaces(prev => {
              const alreadyHas = prev.some(item => item.id === mappedSaved.id);
              if (alreadyHas) return prev;
              return [...prev, mappedSaved];
            });
            createDefaultSpaceForWorkspace(saved.id, name, theme);
            setActiveWorkspaceId(saved.id);
            setActiveSpaceId(null);
            setActiveListId(null);
            setAccentPreset(saved.theme as any);
            triggerToast('success', 'Success', `Created new workspace: ${name}`);
            addSyncLog(`Synchronized new workspace: ${name} to Supabase`);
            return;
          } else if (error) {
            console.error('Error saving workspace to database (falling back to offline caching):', error);
          }
        }
      } catch (err) {
        console.error('Exception error creating workspace:', err);
      }
    }

    // Fallback/offline
    setWorkspaces(prev => {
      const updated = [...prev, newWS];
      if (currentUser) {
        try { localStorage.setItem(`avaxa_fallback_workspaces_${currentUser.id}`, JSON.stringify(updated)); } catch (e) {}
      }
      return updated;
    });
    createDefaultSpaceForWorkspace(newId, name, theme);
    setActiveWorkspaceId(newId);
    setActiveSpaceId(null);
    setActiveListId(null);
    setAccentPreset(theme as any);
    triggerToast('success', 'Success', `Created and switched to new workspace: ${name}`);
    addSyncLog(`Saved new workspace offline: ${name}`);
  };

  const handleUpdateWorkspace = async (id: string, name: string, theme: string, coverUrl?: string, logoUrl?: string, settings?: any) => {
    const initial = name.charAt(0).toUpperCase();

    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase
            .from('workspaces')
            .update({ name, theme, initial, coverUrl, logoUrl, settings })
            .eq('id', id);

          if (error) {
            console.warn('Error updating with settings on DB (retrying without):', error.message);
            await supabase
              .from('workspaces')
              .update({ name, theme, initial })
              .eq('id', id);
          } else {
            addSyncLog(`Synchronized workspace update "${name}" to Supabase`);
          }
        }
      } catch (err) {
        console.error('Exception error updating workspace:', err);
      }
    }

    setWorkspaces(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, name, theme, initial, coverUrl, logoUrl, settings } : w);
      if (currentUser) {
        try { localStorage.setItem(`avaxa_fallback_workspaces_${currentUser.id}`, JSON.stringify(updated)); } catch (e) {}
      }
      return updated;
    });

    if (id === activeWorkspaceId) {
      setAccentPreset(theme as any);
    }

    triggerToast('success', 'Success', `Updated space: ${name}`);
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (workspaces.length <= 1) {
      triggerToast('info', 'Notification', 'You must retain at least one Workspace.');
      return;
    }

    const targetWS = workspaces.find(w => w.id === id);
    if (!targetWS) return;

    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', id);

          if (error) {
            console.error('Error deleting workspace from database:', error.message);
          } else {
            addSyncLog(`Synchronized workspace deletion "${targetWS.name}" on Supabase`);
          }
        }
      } catch (err) {
        console.error('Exception error deleting workspace:', err);
      }
    }

    let nextActiveId = activeWorkspaceId;
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter(w => w.id !== id);
      nextActiveId = remaining[0].id;
      setActiveWorkspaceId(nextActiveId);
      setAccentPreset(remaining[0].theme as any);
    }

    setWorkspaces(prev => {
      const updated = prev.filter(w => w.id !== id);
      if (currentUser) {
        try { localStorage.setItem(`avaxa_fallback_workspaces_${currentUser.id}`, JSON.stringify(updated)); } catch (e) {}
      }
      return updated;
    });

    triggerToast('success', 'Success', `Deleted workspace: ${targetWS.name}`);
  };

  const getTaskAssigneeIds = (task: Partial<Task> | any) => {
    const fromCustom = task?.custom_fields?.assigneeIds;
    if (Array.isArray(fromCustom)) return fromCustom;
    if (Array.isArray(task?.assigneeIds)) return task.assigneeIds;
    if (Array.isArray(task?.assignee_ids)) return task.assignee_ids;
    return task?.assigneeId ? [task.assigneeId] : [];
  };

  const buildTaskCustomFields = (task: Partial<Task> | any) => {
    const base = task?.custom_fields && typeof task.custom_fields === 'object' ? { ...task.custom_fields } : {};
    const assigneeIds = getTaskAssigneeIds(task);
    if (assigneeIds.length > 0) {
      base.assigneeIds = assigneeIds;
    } else {
      delete base.assigneeIds;
    }
    return base;
  };

  const handleAddTask = async (t: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => {
    const assignee = members.find(m => m.id === t.assigneeId);
    if (assignee) {
      triggerToast(
        'assignment',
        'New Task Assigned',
        `Task "${t.title}" has been assigned to ${assignee.name}.`
      );
    } else {
      triggerToast(
        'success',
        'New Task Created',
        `Task "${t.title}" was recorded successfully.`
      );
    }

    const taskId = `task-${Date.now()}`;
    const newTask: Task = {
      ...t,
      id: taskId,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      progress: 0,
      comments: [],
      attachments: [],
      workspaceId: t.workspaceId || activeWorkspaceId
    };

    // Update locally instantly for smooth UI response
    setTasks(prev => [...prev, newTask]);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload: any = {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            status: newTask.status,
            assigneeId: newTask.assigneeId || null,
            startDate: newTask.startDate || null,
            dueDate: newTask.dueDate || null,
            subtasks: newTask.subtasks,
            progress: newTask.progress,
            created_at: newTask.createdAt,
            hoursEstimate: newTask.hoursEstimate || null,
            hoursLogged: newTask.hoursLogged || null,
            commentsCount: newTask.commentsCount,
            tags: newTask.tags || [],
            isPinned: newTask.isPinned || false,
            comments: newTask.comments,
            user_id: session.user.id,
            workspace_id: activeWorkspaceId,
            space_id: newTask.spaceId || null,
            list_id: newTask.listId || null,
            custom_fields: buildTaskCustomFields(newTask),
            recurrence: newTask.recurrence || null
          };

          const { error } = await supabase.from('tasks').insert([payload]);
          
          if (error) {
            console.warn('First task insert attempt failed, retrying without incompatible columns:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('assigneeIds') || error.message.includes('assignee_ids') || error.message.includes('column') || error.message.includes('relation'))) {
              delete payload.workspace_id;
              const { error: retryError } = await supabase.from('tasks').insert([payload]);
              if (retryError) {
                console.error('Retry task insert failed:', retryError);
                triggerToast('info', 'Task Save Error (Supabase)', `${retryError.message}`);
              } else {
                addSyncLog(`Task saved successfully in compatibility mode (No workspace_id): "${newTask.title}"`);
              }
            } else {
              triggerToast('info', 'Task Save Error (Supabase)', `${error.message}`);
            }
          } else {
            addSyncLog(`Task synchronized successfully to Supabase: "${newTask.title}"`);
          }
        }
      } catch (err) {
        console.error('Task sync failure:', err);
      }
    } else {
      setOfflineTasksQueue(prev => ({ ...prev, [newTask.id]: newTask }));
      setOfflineDeletedTasks(prev => prev.filter(id => id !== newTask.id));
    }
  };

  const handleUpdateTask = async (updated: Task) => {
    if (updated.status === 'completed' && !updated.completedAt) {
      updated = { ...updated, completedAt: new Date().toISOString() };
    }

    const oldTask = tasks.find(t => t.id === updated.id);
    if (oldTask) {
      if (oldTask.assigneeId !== updated.assigneeId && updated.assigneeId) {
        const targetUser = members.find(m => m.id === updated.assigneeId);
        triggerToast(
          'assignment',
          'Assignee Changed',
          `Task "${updated.title}" has been handed over to ${targetUser ? targetUser.name : 'another colleague'}.`
        );
      }
      if (oldTask.status !== updated.status) {
        if (updated.status === 'completed') {
          triggerToast(
            'success',
            'Task Completed! 🎉',
            `Member has completed the task: "${updated.title}".`
          );
        } else {
          const statusTranslation: Record<string, string> = {
            todo: 'TO DO',
            inprogress: 'IN PROGRESS',
            review: 'REVIEW',
            completed: 'COMPLETED'
          };
          triggerToast(
            'info',
            'Status Updated',
            `Task "${updated.title}" moved to "${statusTranslation[updated.status] || updated.status}".`
          );
        }
      }
    }

    setTasks(prev => {
      console.log('[handleUpdateTask] setTasks called. updated.id:', updated.id, 'updated.status:', updated.status);
      console.log('[handleUpdateTask] prev task statuses:', prev.map(t => `${t.id}:${t.status}`));
      const result = prev.map(t => t.id === updated.id ? updated : t);
      console.log('[handleUpdateTask] result task statuses:', result.map(t => `${t.id}:${t.status}`));
      return result;
    });

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('tasks').update({
            title: updated.title,
            description: updated.description,
            priority: updated.priority,
            status: updated.status,
            assigneeId: updated.assigneeId || null,
            startDate: updated.startDate || null,
            dueDate: updated.dueDate || null,
            subtasks: updated.subtasks,
            progress: updated.progress,
            hoursEstimate: updated.hoursEstimate || null,
            hoursLogged: updated.hoursLogged || null,
            commentsCount: updated.commentsCount,
            tags: updated.tags || [],
            isPinned: updated.isPinned || false,
            comments: updated.comments,
            space_id: updated.spaceId || null,
            list_id: updated.listId || null,
            custom_fields: buildTaskCustomFields(updated),
            recurrence: updated.recurrence || null
          }).eq('id', updated.id).eq('user_id', session.user.id);
          if (error) console.error('Supabase Task Update Error:', error);
        }
      } catch (err) {
        console.error('Task update sync failure:', err);
      }
    } else {
      setOfflineTasksQueue(prev => ({ ...prev, [updated.id]: updated }));
    }
  };

  const handleDeleteTask = async (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (targetTask) {
      triggerToast(
        'info',
        'Task Deleted',
        `Task "${targetTask.title}" has been removed from the system.`
      );
    }

    setTasks(prev => prev.filter(t => t.id !== id));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', session.user.id);
          if (error) console.error('Supabase Task Delete Error:', error);
        }
      } catch (err) {
        console.error('Task delete sync failure:', err);
      }
    } else {
      setOfflineTasksQueue(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setOfflineDeletedTasks(prev => [...prev, id]);
    }
  };

  const handleUpdateTaskOrder = async (workspaceId: string, orderedIds: string[]) => {
    if (currentUser && !isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload = {
            id: `task-order-${workspaceId}`,
            title: `System Task Order: ${workspaceId}`,
            content: JSON.stringify(orderedIds),
            category: 'System',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name || 'System',
            user_id: session.user.id,
            workspace_id: workspaceId
          };
          const { error } = await supabase.from('docs').upsert([payload]);
          if (error) {
            console.warn('First task order upsert attempt failed, retrying without workspace_id:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('column'))) {
              delete (payload as any).workspace_id;
              const { error: retryError } = await supabase.from('docs').upsert([payload]);
              if (retryError) {
                console.error('Retry task order upsert failed:', retryError);
              } else {
                addSyncLog(`Synchronized task sorting order to DB (Compatibility mode)`);
              }
            }
          } else {
            addSyncLog(`Synchronized task sorting order to the cloud`);
          }
        }
      } catch (err) {
        console.error('Task order sync failure:', err);
      }
    }
  };

  const handleAddDoc = async (d: Omit<Document, 'id' | 'updatedAt'>) => {
    const newDocId = `doc-${Date.now()}`;
    const newDocObj: Document = {
      ...d,
      id: newDocId,
      updatedAt: new Date().toISOString().split('T')[0],
      workspaceId: activeWorkspaceId
    };

    setDocs(prev => [...prev, newDocObj]);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload: any = {
            id: newDocObj.id,
            title: newDocObj.title,
            content: newDocObj.content,
            category: newDocObj.category,
            updatedAt: newDocObj.updatedAt,
            updatedBy: newDocObj.updatedBy,
            isAiGenerated: newDocObj.isAiGenerated || false,
            user_id: session.user.id,
            workspace_id: activeWorkspaceId
          };

          const { error } = await supabase.from('docs').insert([payload]);
          
          if (error) {
            console.warn('First doc insert attempt failed, retrying without workspace_id column:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('column') || error.message.includes('relation'))) {
              delete payload.workspace_id;
              const { error: retryError } = await supabase.from('docs').insert([payload]);
              if (retryError) {
                console.error('Retry doc insert failed:', retryError);
                triggerToast('info', 'Document Save Error (Supabase)', `${retryError.message}`);
              } else {
                addSyncLog(`Document saved successfully in compatibility mode (No workspace_id): "${newDocObj.title}"`);
              }
            } else {
              triggerToast('info', 'Document Save Error (Supabase)', `${error.message}`);
            }
          } else {
            addSyncLog(`Document synchronized successfully to Supabase: "${newDocObj.title}"`);
          }
        }
      } catch (err) {
        console.error('Doc insert sync failure:', err);
      }
    } else {
      setOfflineDocsQueue(prev => ({ ...prev, [newDocObj.id]: newDocObj }));
      setOfflineDeletedDocs(prev => prev.filter(id => id !== newDocObj.id));
    }
  };

  const handleUpdateDoc = async (updated: Document) => {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('docs').update({
            title: updated.title,
            content: updated.content,
            category: updated.category,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
            isAiGenerated: updated.isAiGenerated || false
          }).eq('id', updated.id).eq('user_id', session.user.id);
          if (error) console.error('Supabase Doc Update Error:', error);
        }
      } catch (err) {
        console.error('Doc update sync failure:', err);
      }
    } else {
      setOfflineDocsQueue(prev => ({ ...prev, [updated.id]: updated }));
    }
  };

  const handleDeleteDoc = async (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('docs').delete().eq('id', id).eq('user_id', session.user.id);
          if (error) console.error('Supabase Doc Delete Error:', error);
        }
      } catch (err) {
        console.error('Doc delete sync failure:', err);
      }
    } else {
      setOfflineDocsQueue(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setOfflineDeletedDocs(prev => [...prev, id]);
    }
  };

  // Persist bases to localStorage
  useEffect(() => {
    if (!isLoaded.current) return;
    try { localStorage.setItem('avaxa_bases', JSON.stringify(bases)); } catch (e) {}
  }, [bases]);

  const syncBaseToSupabase = async (base: BaseApp, session: { user: { id: string } }) => {
    const payload = {
      id: base.id,
      name: base.name,
      emoji: base.emoji || '📋',
      description: base.description || '',
      tables: base.tables,
      active_table_id: base.activeTableId || null,
      workspace_id: base.workspaceId || activeWorkspaceId,
      updated_at: base.updatedAt,
      user_id: session.user.id,
    };
    const { error } = await supabase.from('base_apps').upsert([payload]);
    if (error) console.warn('Base sync warning:', error.message);
  };

  const handleAddBase = async (base: BaseApp) => {
    const baseWithWs = { ...base, workspaceId: activeWorkspaceId };
    setBases(prev => [...prev, baseWithWs]);
    addSyncLog(`Created Base: "${baseWithWs.name}"`);
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await syncBaseToSupabase(baseWithWs, session);
      } catch (err) {
        console.error('Base insert sync failure:', err);
      }
    }
  };

  const handleUpdateBase = async (updated: BaseApp) => {
    const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
    setBases(prev => prev.map(b => b.id === withTimestamp.id ? withTimestamp : b));
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await syncBaseToSupabase(withTimestamp, session);
      } catch (err) {
        console.error('Base update sync failure:', err);
      }
    }
  };

  const handleDeleteBase = async (id: string) => {
    setBases(prev => prev.filter(b => b.id !== id));
    addSyncLog('Deleted a Base app');
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('base_apps').delete().eq('id', id).eq('user_id', session.user.id);
        }
      } catch (err) {
        console.error('Base delete sync failure:', err);
      }
    }
  };

  const handleAddMember = async (m: Omit<User, 'id'>) => {
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Search for existing user in members table by email
        const { data: existing, error: findError } = await supabase
          .from('members')
          .select('*')
          .eq('email', m.email)
          .maybeSingle();

        if (existing) {
          const currentWSIds = existing.workspace_ids || [];
          if (currentWSIds.includes(activeWorkspaceId)) {
            triggerToast('info', 'Already Member', `User ${m.email} is already in this workspace.`);
            return;
          }
          
          const updatedWSIds = [...currentWSIds, activeWorkspaceId];
          const { error } = await supabase
            .from('members')
            .update({ workspace_ids: updatedWSIds })
            .eq('id', existing.id);

          if (error) {
            triggerToast('info', 'Invite Error', 'Could not add user to workspace.');
          } else {
            triggerToast('success', 'Invited Successfully', `Added ${existing.name} to workspace.`);
            // Update local member list
            setMembers(prev => prev.map(member => member.email === m.email ? { ...member, workspaceIds: updatedWSIds } : member));
          }
          return;
        }

        // If not found, create a placeholder profile with the email and the workspaceId!
        const newMemberId = `member-${Date.now()}`;
        const newMemberObj: User = {
          ...m,
          id: newMemberId,
          workspaceIds: [activeWorkspaceId]
        };

        const { error } = await supabase.from('members').insert([{
          id: newMemberObj.id,
          name: newMemberObj.name,
          email: newMemberObj.email,
          avatar: newMemberObj.avatar,
          role: newMemberObj.role,
          status: 'offline', // invited and offline
          phone: newMemberObj.phone || null,
          department: newMemberObj.department || null,
          bio: newMemberObj.bio || null,
          joined_date: newMemberObj.joinedDate || null,
          workspace_ids: [activeWorkspaceId]
        }]);

        if (error) {
          console.error('Supabase Member Insert Error:', error);
          triggerToast('info', 'Invite Error', 'Could not create invitation.');
        } else {
          setMembers(prev => [...prev, newMemberObj]);
          triggerToast('success', 'Invited Successfully', `Sent workspace invitation to ${m.email}.`);
        }
      } catch (err) {
        console.error('Member invite failure:', err);
      }
    }
  };

  const handleUpdateMember = async (updated: User) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const dbId = updated.id === 'user' ? `user-${session.user.id}` : updated.id;
          const { error } = await supabase.from('members').update({
            name: updated.name,
            email: updated.email,
            avatar: updated.avatar,
            role: updated.role,
            status: updated.status,
            phone: updated.phone || null,
            department: updated.department || null,
            bio: updated.bio || null,
            joined_date: updated.joinedDate || null,
            workspace_ids: updated.workspaceIds || null
          }).eq('id', dbId).eq('user_id', session.user.id);
          if (error) console.error('Supabase Member Update Error:', error);
        }
      } catch (err) {
        console.error('Member update sync failure:', err);
      }
    } else {
      setOfflineMembersQueue(prev => ({ ...prev, [updated.id]: updated }));
    }
  };

  const handleDeleteMember = async (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const dbId = id === 'user' ? `user-${session.user.id}` : id;
          const { error } = await supabase.from('members').delete().eq('id', dbId).eq('user_id', session.user.id);
          if (error) console.error('Supabase Member Delete Error:', error);
        }
      } catch (err) {
        console.error('Member delete sync failure:', err);
      }
    } else {
      setOfflineMembersQueue(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setOfflineDeletedMembers(prev => [...prev, id]);
    }
  };

  // Navigation categories for sidebar grouping
  const categories = [
    { id: 'workspace', label: 'Primary Spaces' },
    { id: 'collaboration', label: 'Collaboration & Channels' },
    { id: 'system', label: 'System' },
  ];

  // Navigation menu items definition
  const sidebarItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, category: 'workspace' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, category: 'workspace' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, category: 'workspace' },
    { id: 'productivity', label: 'Productivity', icon: Zap, category: 'workspace' },
    { id: 'base', label: 'Avaxa Base', icon: Database, category: 'workspace' },
    { id: 'whiteboard', label: 'Mind Whiteboard', icon: Grid, category: 'collaboration' },
    { id: 'chat', label: 'Chat Room', icon: MessageSquare, category: 'collaboration' },
    { id: 'docs', label: 'Wiki Docs', icon: Edit3, category: 'collaboration' },
    { id: 'team', label: 'Team Directory', icon: Users, category: 'collaboration' },
    { id: 'profile', label: 'User Profile', icon: UserIcon, category: 'system' },
    { id: 'settings', label: 'System Settings', icon: Settings, category: 'system' },
  ];

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user, rememberMe) => {
      const userWithId = { ...user, id: user.email ? `user-${user.email}` : `user-${Date.now()}` };
      updateCurrentUser(userWithId);
      if (rememberMe) {
        const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('avaxa_session', JSON.stringify({
          user: userWithId,
          expiresAt: Date.now() + oneMonthInMs
        }));
        addSyncLog(`Saved automatic login session for 1 month for ${userWithId.name}`);
      } else {
        localStorage.removeItem('avaxa_session');
      }
      
      // Update in members directory
      setMembers(prev => prev.map(m => m.id === 'user' ? { 
        ...m,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      } : m));
    }} />;
  }

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-4">
        {/* Background blobs */}
        <div className="liquid-blob blob-1 animate-liquid-1 pointer-events-none opacity-40" />
        <div className="liquid-blob blob-2 animate-liquid-2 pointer-events-none opacity-40" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-[0_20px_50px_rgba(109,85,254,0.2)] space-y-6 overflow-hidden"
        >
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              <span>Welcome to Avaxa OS!</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Let's set up your personal workspace to get started.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Your Full Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. John Doe" 
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Workspace Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. My Workspace" 
                value={onboardingWSName}
                onChange={(e) => setOnboardingWSName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Choose Theme Color</label>
              <div className="grid grid-cols-4 gap-2">
                {(['indigo', 'ocean', 'forest', 'sunset'] as const).map((t) => {
                  const themeColors = {
                    indigo: 'bg-indigo-500',
                    ocean: 'bg-sky-500',
                    forest: 'bg-emerald-500',
                    sunset: 'bg-amber-500'
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOnboardingTheme(t)}
                      className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer font-bold ${
                        onboardingTheme === t
                          ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 text-indigo-650 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${themeColors[t]}`} />
                      <span className="text-[8px] uppercase tracking-wider">{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={onboardingSubmitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-650 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {onboardingSubmitting ? (
                  <span>Creating your space...</span>
                ) : (
                  <>
                    <span>Launch Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full cu-page-bg text-[var(--cu-text-primary)] flex flex-col overflow-hidden font-sans select-none">
      
      {/* Subtle ambient background */}
      <div className="liquid-blob blob-1 animate-liquid-1 pointer-events-none opacity-30" />
      <div className="liquid-blob blob-2 animate-liquid-2 pointer-events-none opacity-20" />

      {/* ClickUp-style Top Header */}
      <header className="cu-header relative z-40 flex items-center shrink-0 transition-all duration-200">
        {/* Mobile header trigger & workspace badge (< md screens) */}
        <div className="flex md:hidden items-center gap-2 pl-3 py-2 shrink-0">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all border border-slate-200/60 dark:border-slate-800 shadow-3xs"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>
          
          <div 
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100/70 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800 cursor-pointer max-w-[130px] select-none"
          >
            <div 
              className="w-4.5 h-4.5 rounded-md flex items-center justify-center text-white font-black text-[9px] shrink-0 overflow-hidden"
              style={!currentWorkspace?.logoUrl ? {
                background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                            currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                            currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                            'linear-gradient(135deg, #7B61FF, #6D55FE)',
              } : undefined}
            >
              {currentWorkspace?.logoUrl ? (
                <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
              ) : (
                <span>{currentWorkspace?.initial || 'A'}</span>
              )}
            </div>
            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px] truncate">
              {currentWorkspace?.name || 'Avaxa'}
            </span>
          </div>
        </div>

        {/* Left header switcher section (desktop) */}
        <div className={`hidden md:flex items-center justify-between py-2 shrink-0 border-r border-[var(--cu-border)] transition-all duration-350 ease-in-out relative ${
          isMainSidebarCollapsed ? 'w-[var(--cu-sidebar-collapsed)] px-1 justify-center' : 'w-[var(--cu-sidebar-width)] px-3'
        }`}>
          <div className={`flex items-center relative flex-1 min-w-0 ${isMainSidebarCollapsed ? 'justify-center' : 'gap-2 px-1'}`}>
            {isMainSidebarCollapsed ? (
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-md shrink-0 select-none overflow-hidden cursor-pointer hover:opacity-95 transition-all animate-fade-in relative group"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                style={!currentWorkspace?.logoUrl ? {
                  background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                              currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                              currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                              'linear-gradient(135deg, #7B61FF, #6D55FE)',
                } : undefined}
                title={currentWorkspace?.name || 'Workspace'}
              >
                {currentWorkspace?.logoUrl ? (
                  <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                ) : (
                  <span>{currentWorkspace?.initial || 'A'}</span>
                )}
                {/* Glow ring */}
                <div className="absolute inset-0 border border-white/20 rounded-2xl group-hover:border-white/40 transition-colors" />
              </motion.div>
            ) : (
              <>
                {/* Sidebar toggle button (collapse when expanded) */}
                <button 
                  onClick={() => setIsMainSidebarCollapsed(true)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all shrink-0 border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/40"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
 
                {/* Compact Switcher Pill Button */}
                <div 
                  className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250/55 dark:border-slate-850/55 hover:bg-slate-100/70 hover:border-slate-300/80 dark:hover:bg-slate-800/50 transition-all duration-200 cursor-pointer select-none group shadow-3xs min-w-0"
                  onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-white font-black text-[9px] shadow-3xs shrink-0 select-none overflow-hidden"
                      style={!currentWorkspace?.logoUrl ? {
                        background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                                    currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                                    currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                                    'linear-gradient(135deg, #7B61FF, #6D55FE)',
                      } : undefined}
                    >
                      {currentWorkspace?.logoUrl ? (
                        <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                      ) : (
                        <span>{currentWorkspace?.initial || 'A'}</span>
                      )}
                    </div>
                    <span className="font-sans font-extrabold text-slate-800 dark:text-slate-100 text-[12.5px] tracking-tight truncate flex-1">
                      {currentWorkspace?.name || 'Loading...'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 group-hover:translate-y-0.5 ml-1" />
                </div>

                {/* Calendar Shortcut Button */}
                <button 
                  onClick={() => setActiveTab('calendar')} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all shrink-0 border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/40" 
                  title="Calendar"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Workspace Dropdown Menu */}
            <AnimatePresence>
              {showWorkspaceMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowWorkspaceMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, type: "spring", stiffness: 380, damping: 26 }}
                    className={`absolute top-full mt-2 w-[270px] max-w-[calc(100vw-1.5rem)] p-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-[0_16px_45px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-30 space-y-2.5 text-left origin-top-left ${isMainSidebarCollapsed ? 'left-2' : 'left-4'}`}
                  >
                    {/* Active Workspace Hero Card */}
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-slate-50/60 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900/90 border border-indigo-100 dark:border-indigo-900/40 shadow-xs group overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-500/15 shrink-0 select-none overflow-hidden ring-2 ring-white dark:ring-slate-800 transition-transform duration-300 group-hover:scale-[1.03]"
                          style={!currentWorkspace?.logoUrl ? {
                            background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                                        currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                                        currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                                        'linear-gradient(135deg, #FF0033, #CC0022)',
                          } : undefined}
                        >
                          {currentWorkspace?.logoUrl ? (
                            <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                          ) : (
                            <span>{currentWorkspace?.name ? currentWorkspace.name.charAt(0).toUpperCase() : 'A'}</span>
                          )}
                        </div>

                        <div className="leading-tight min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 dark:text-slate-50 text-[14.5px] truncate tracking-tight">
                              {currentWorkspace?.name || 'Avaxa'}
                            </span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0" title="Active Workspace">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500/30" />
                              {currentUser?.isPremium ? 'Premium Pro' : 'Free Forever'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Settings & People actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowWorkspaceMenu(false);
                          setActiveTab('settings');
                          setActiveSettingsTab('general');
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-sm group/btn"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover/btn:text-indigo-500 transition-colors" />
                        <span>Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWorkspaceMenu(false);
                          setActiveTab('settings');
                          setActiveSettingsTab('people');
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-sm group/btn"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover/btn:text-indigo-500 transition-colors" />
                        <span>People</span>
                      </button>
                    </div>

                    {/* Workspaces list subsection */}
                    {workspaces.filter(w => w.id !== activeWorkspaceId).length > 0 && (
                      <>
                        <div className="border-t border-slate-100 dark:border-slate-800/80 my-1.5" />
                        <div className="space-y-1.5">
                          <div className="px-1 flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <span>Other Workspaces</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-extrabold text-slate-500">
                              {workspaces.filter(w => w.id !== activeWorkspaceId).length}
                            </span>
                          </div>
                          <div className="max-h-[150px] overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                            {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  setShowWorkspaceMenu(false);
                                  handleWorkspaceChange(w.id);
                                }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-slate-100/90 hover:to-indigo-50/50 dark:hover:from-slate-800/80 dark:hover:to-slate-800/40 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700 cursor-pointer transition-all duration-200 text-left group/ws"
                              >
                                <div 
                                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-[11px] shrink-0 overflow-hidden shadow-2xs group-hover/ws:scale-105 transition-transform duration-200"
                                  style={!w.logoUrl ? {
                                    background: w.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                                                w.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                                                w.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                                                'linear-gradient(135deg, #FF0033, #CC0022)',
                                  } : undefined}
                                >
                                  {w.logoUrl ? (
                                    <img src={w.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                                  ) : (
                                    <span>{w.initial || w.name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="truncate flex-1 group-hover/ws:text-indigo-600 dark:group-hover/ws:text-indigo-400 transition-colors font-extrabold">{w.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/ws:opacity-100 group-hover/ws:translate-x-0 -translate-x-1 transition-all duration-200 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800/80 my-1.5" />

                    {/* Create workspace button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceMenu(false);
                        setShowAddWorkspaceModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md hover:shadow-indigo-500/10 group/create"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center group-hover/create:scale-110 transition-transform duration-200">
                        <Plus className="w-3.5 h-3.5 font-bold text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <span>Create Workspace</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side Header section */}
        <div className="flex-1 flex items-center justify-between px-6 py-3 min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Sidebar toggle button (restore when collapsed) */}
            {isMainSidebarCollapsed && (
              <button 
                onClick={() => setIsMainSidebarCollapsed(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all shrink-0 border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/40 mr-1"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {(() => {
              let label = '';
              let ActiveIcon = null;
              const activeItem = sidebarItems.find(i => i.id === activeTab);
              if (activeItem) {
                label = activeItem.label;
                ActiveIcon = activeItem.icon;
              } else if (activeTab === 'tasks' || activeTab === 'my-tasks') {
                label = 'Space';
                ActiveIcon = Briefcase;
              }

              // Evaluate theme values
              const currentTheme = currentWorkspace?.theme || 'indigo';
              const activeColors = (() => {
                switch(currentTheme) {
                  case 'ocean': return { bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20 dark:border-sky-500/30', color: '#0891b2' };
                  case 'forest': return { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20 dark:border-emerald-500/30', color: '#047857' };
                  case 'sunset': return { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20 dark:border-rose-500/30', color: '#e11d48' };
                  default: return { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-650 dark:text-indigo-400', border: 'border-indigo-500/20 dark:border-indigo-500/30', color: '#7B61FF' };
                }
              })();

              return (
                <div className={`flex items-center gap-1.5 ${activeColors.bg} px-3.5 py-1 rounded-full border ${activeColors.border} shadow-3xs`}>
                  {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5 shrink-0" style={{ color: activeColors.color }} />}
                  <h1 className={`text-[11.5px] font-black font-sans ${activeColors.text} tracking-tight capitalize select-none`}>
                    {label}
                  </h1>
                </div>
              );
            })()}
            
            {/* Mobile search trigger */}
            <button
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 80);
              }}
              className="sm:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 rounded-xl transition-colors cursor-pointer ml-1"
              title="Global Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Centered Global Search Bar trigger button for desk screens - beautified Pill */}
          <div className="relative max-w-md w-64 md:w-80 lg:w-96 mx-4 hidden sm:block">
            {(() => {
              const currentTheme = currentWorkspace?.theme || 'indigo';
              const ringColor = currentTheme === 'ocean' ? 'hover:border-sky-500/40 dark:hover:border-sky-500/50' :
                                currentTheme === 'forest' ? 'hover:border-emerald-500/40 dark:hover:border-emerald-500/50' :
                                currentTheme === 'sunset' ? 'hover:border-rose-500/40 dark:hover:border-rose-500/50' :
                                'hover:border-indigo-500/40 dark:hover:border-indigo-500/50';
              return (
                <button
                  onClick={() => {
                    setIsSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 80);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-1.5 cu-search-bar text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] cursor-pointer outline-none text-[12px] font-medium shadow-none`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Search className="w-3.5 h-3.5 text-slate-450 dark:text-slate-500 shrink-0" />
                    <span className="truncate font-semibold tracking-tight">Search tasks, docs, spaces...</span>
                  </div>
                  <div className="flex items-center gap-0.5 font-mono text-[9px] font-extrabold bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50 shadow-3xs shrink-0 select-none">
                    <span>⌘</span>
                    <span>K</span>
                  </div>
                </button>
              );
            })()}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Interactive Date & Display Options Pill Widget */}
            {(() => {
              const now = new Date();
              let formattedDate = '';
              switch (dateFormat) {
                case 'full':
                  formattedDate = now.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  break;
                case 'vi':
                  formattedDate = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
                  break;
                case 'numeric':
                  formattedDate = now.toISOString().split('T')[0];
                  break;
                case 'clock':
                  formattedDate = `${now.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • ${currentTimeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  break;
                case 'short':
                default:
                  formattedDate = now.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  break;
              }

              return (
                <div className="relative">
                  <button 
                    onClick={() => setShowDisplayOptionsMenu(!showDisplayOptionsMenu)}
                    className="text-[10.5px] font-black text-slate-600 dark:text-slate-300 font-sans hidden lg:inline-flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 select-none shadow-3xs transition-all cursor-pointer group active:scale-95"
                    title={locale === 'vi' ? 'Tùy chọn hiển thị & Định dạng thời gian' : 'Display Options & Date Format'}
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:rotate-12 transition-transform" />
                    <span>{formattedDate}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
                  </button>

                  {/* Display Options & Date Format Popover Menu */}
                  <AnimatePresence>
                    {showDisplayOptionsMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDisplayOptionsMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.94, y: 10 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="absolute right-0 top-full mt-2 w-80 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] p-5 z-50 text-left space-y-4.5 font-sans backdrop-blur-2xl"
                        >
                          {/* Popover Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-500 border border-sky-500/20 shadow-2xs">
                                <Sliders className="w-4 h-4" />
                              </div>
                              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                                {locale === 'vi' ? 'Tùy chọn hiển thị' : 'DISPLAY OPTIONS'}
                              </h4>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setShowDisplayOptionsMenu(false)} 
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Date Format Section */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                              {locale === 'vi' ? 'Định dạng ngày & giờ' : 'DATE & TIME FORMAT'}
                            </label>
                            <div className="space-y-1">
                              {[
                                { id: 'short', label: locale === 'vi' ? 'Ngắn gọn (Wed, Jul 22)' : 'Short (Wed, Jul 22)', icon: '📅' },
                                { id: 'clock', label: locale === 'vi' ? 'Đồng hồ Realtime (Wed, Jul 22 • 08:57)' : 'Live Clock (Wed, Jul 22 • 08:57)', icon: '⏰' },
                                { id: 'full', label: locale === 'vi' ? 'Chi tiết (Wed, Jul 22, 2026)' : 'Full (Wed, Jul 22, 2026)', icon: '📆' },
                                { id: 'vi', label: locale === 'vi' ? 'Chuẩn Tiếng Việt (T2, 22/07)' : 'Vietnamese Format (T2, 22/07)', icon: '🇻🇳' },
                                { id: 'numeric', label: locale === 'vi' ? 'Số ISO (2026-07-22)' : 'ISO Numeric (2026-07-22)', icon: '🔢' }
                              ].map(fmt => {
                                const isSelected = dateFormat === fmt.id;
                                return (
                                  <button
                                    key={fmt.id}
                                    type="button"
                                    onClick={() => {
                                      setDateFormat(fmt.id as any);
                                      (window as any).playSystemSound?.('click');
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-sky-500/12 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-300/40 dark:border-sky-700/50 shadow-2xs font-extrabold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 truncate">
                                      <span className="text-sm">{fmt.icon}</span>
                                      <span className="truncate">{fmt.label}</span>
                                    </div>
                                    {isSelected && (
                                      <Check className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0 stroke-[3]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* UI Density Options */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                              {locale === 'vi' ? 'Mật độ hiển thị UI' : 'INTERFACE DENSITY'}
                            </label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-100/60 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setUiDensity('comfortable');
                                  (window as any).playSystemSound?.('toggle');
                                }}
                                className={`py-2 px-3 rounded-xl text-center text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  uiDensity === 'comfortable'
                                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-md border border-sky-200/60 dark:border-sky-800/60'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                              >
                                <span>🌿</span>
                                <span>{locale === 'vi' ? 'Vừa vặn' : 'Comfortable'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUiDensity('compact');
                                  (window as any).playSystemSound?.('toggle');
                                }}
                                className={`py-2 px-3 rounded-xl text-center text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  uiDensity === 'compact'
                                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-md border border-sky-200/60 dark:border-sky-800/60'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                              >
                                <span>⚡</span>
                                <span>{locale === 'vi' ? 'Tối giản' : 'Compact'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick Theme Switch */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                              {locale === 'vi' ? 'Chế độ giao diện' : 'THEME MODE'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDarkMode(!isDarkMode);
                                (window as any).playSystemSound?.('click');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <span>{isDarkMode ? '🌙' : '☀️'}</span>
                              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
            
            {/* Upgrade Premium Button */}
            {!currentUser.isPremium && (
              <motion.button
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPremiumModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10.5px] font-black text-white shadow-md transition-all cursor-pointer relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Upgrade Premium</span>
                <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000 ease-out" />
              </motion.button>
            )}

            {/* Quick 1-Click Language Switcher Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextLocale = locale === 'vi' ? 'en' : 'vi';
                setLocale(nextLocale);
                (window as any).playSystemSound?.('toggle');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors border border-slate-200/60 dark:border-slate-800/60 text-xs font-black cursor-pointer shadow-3xs"
              title={locale === 'vi' ? 'Chuyển sang Tiếng Anh (English)' : 'Switch to Vietnamese (Tiếng Việt)'}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="uppercase text-[11px] font-mono tracking-tight font-extrabold">{locale === 'vi' ? 'VI 🇻🇳' : 'EN 🇺🇸'}</span>
            </button>

            {/* Quick 1-Click Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                (window as any).playSystemSound?.('click');
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
              )}
            </button>

            {/* 🔔 Notification Center Dropdown & Badge Manager */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 relative cursor-pointer"
                title="Notification Settings"
              >
                <Bell className="w-4.5 h-4.5" />
                {notificationsList.filter(n => !n.read && !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 bg-rose-500 border border-white dark:border-slate-900 rounded-full text-[9px] font-black text-white items-center justify-center animate-pulse shadow-sm">
                    {notificationsList.filter(n => !n.read && !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationsMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotificationsMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 font-sans"
                    >
                      {/* Header */}
                      <div className="p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">Notifications ({notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length})</span>
                        </div>
                        {notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length > 0 && (
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => {
                                const activeIds = notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).map(n => n.id);
                                setNotificationsList(prev => prev.map(n => activeIds.includes(n.id) ? { ...n, read: true } : n));
                                (window as any).playSystemSound?.('success');
                              }}
                              className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-755 dark:text-indigo-400 cursor-pointer hover:underline"
                            >
                              Read all
                            </button>
                            <button
                              onClick={() => {
                                const activeIds = notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).map(n => n.id);
                                setNotificationsList(prev => prev.map(n => activeIds.includes(n.id) ? { ...n, cleared: true } : n));
                                (window as any).playSystemSound?.('delete');
                              }}
                              className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-0.5 hover:underline"
                            >
                              Clear all
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Notifications List scrollable */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                        {notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length === 0 ? (
                          <div className="py-10 px-4 text-center space-y-2">
                            <span className="text-xl inline-block">🎉</span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Inbox empty!</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">You have no new notifications.</p>
                          </div>
                        ) : (
                          notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).map(notif => {
                            const isUnread = !notif.read;
                            return (
                              <div 
                                key={notif.id} 
                                className={`p-3.5 relative transition-colors flex gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 group ${isUnread ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
                              >
                                {/* Left Icon indicator based on type */}
                                <div className="shrink-0 mt-0.5">
                                  <div className={`p-1.5 rounded-xl border ${
                                    notif.type === 'assignment' ? 'bg-indigo-50 border-indigo-100/50 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/30' :
                                    notif.type === 'deadline' ? 'bg-rose-50 border-rose-100/50 text-rose-600 dark:bg-rose-955/40 dark:border-rose-900/30' :
                                    notif.type === 'comment' || notif.type === 'message' ? 'bg-sky-50 border-sky-100/50 text-sky-600 dark:bg-sky-955/40 dark:border-sky-900/30' :
                                    'bg-emerald-50 border-emerald-100/50 text-emerald-600 dark:bg-emerald-955/40 dark:border-emerald-900/30'
                                  }`}>
                                    {notif.type === 'assignment' && <Briefcase className="w-3.5 h-3.5" />}
                                    {notif.type === 'deadline' && <Timer className="w-3.5 h-3.5" />}
                                    {(notif.type === 'comment' || notif.type === 'message') && <MessageSquare className="w-3.5 h-3.5" />}
                                    {notif.type !== 'assignment' && notif.type !== 'deadline' && notif.type !== 'comment' && notif.type !== 'message' && <Sparkles className="w-3.5 h-3.5" />}
                                  </div>
                                </div>

                                {/* Body */}
                                <div className="space-y-0.5 flex-1 pr-6 cursor-pointer" onClick={() => {
                                  // mark as read
                                  setNotificationsList(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                }}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[11px] block truncate ${isUnread ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>
                                      {notif.title}
                                    </span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono shrink-0">{notif.timestamp}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed break-words">
                                    {notif.message}
                                  </p>
                                </div>

                                {/* Quick Individual Delete & Read markers */}
                                <div className="absolute right-2 top-3 flex items-center gap-1.5">
                                  {isUnread && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNotificationsList(prev => prev.filter(n => n.id !== notif.id));
                                      (window as any).playSystemSound?.('delete');
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/35 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                    title="Delete notification"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      {/* Footer link to settings */}
                      <div className="p-2.5 text-center bg-slate-50/50 dark:bg-slate-950/20">
                        <button
                          onClick={() => {
                            setActiveTab('settings');
                            setShowNotificationsMenu(false);
                          }}
                          className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          ⚙️ Settings & Notification Settings
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Connected User Badge and Status Switcher */}
            <div className="relative font-sans text-left">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`cursor-pointer shrink-0 flex items-center gap-2.5 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border rounded-2xl transition-all select-none shadow-3xs ${
                  currentUser.isPremium ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-slate-200/60 dark:border-slate-800/60'
                }`}
              >
                <div className="relative shrink-0 flex">
                  {/* Glowing border ring for premium users */}
                  <div className={`absolute -inset-0.5 rounded-xl opacity-75 blur-3xs transition-all duration-300 ${
                    currentUser.isPremium ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-transparent'
                  }`} />
                  <SignedImage filePath={currentUser.avatar} className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200/50 dark:border-slate-800/50 shadow-3xs transition-all relative z-10" alt={currentUser.name} />
                  {/* Status indicator absolute dot on avatar */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 z-20 ${
                    userStatus === 'online' ? 'bg-emerald-500 animate-pulse' :
                    userStatus === 'focused' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-400 animate-pulse'
                  }`} />
                </div>
                
                <div className="text-left hidden sm:flex flex-col select-none justify-center pr-1 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[12.5px] text-slate-800 dark:text-slate-100 leading-none truncate max-w-[95px] tracking-tight">
                      {currentUser.name}
                    </span>
                    {currentUser.isPremium ? (
                      <span className="text-[7.5px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-md leading-none shadow-xs uppercase">PRO</span>
                    ) : (
                      <span className="text-[7.5px] font-black tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md leading-none shadow-xs uppercase font-mono">FREE</span>
                    )}
                  </div>
                </div>

                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-250 shrink-0 relative z-10" />
              </motion.div>
              
              {/* Dropdown status content menu */}
              <AnimatePresence>
                {showStatusMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowStatusMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-56 p-1.5 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl z-30 space-y-0.5 text-left origin-top-right font-sans backdrop-blur-xl"
                    >
                      {/* User Info Header with Role */}
                      <div className="px-2.5 py-2.5 mb-1.5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/50 flex flex-col rounded-xl">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{currentUser.email}</span>
                        <span className="text-[9px] text-indigo-650 dark:text-indigo-400 font-extrabold uppercase mt-2 bg-indigo-50 dark:bg-indigo-950/50 w-max px-2 py-0.5 rounded-md">
                          {currentUser.role === 'admin' ? 'Administrator' : 'Design Engineer'}
                        </span>
                      </div>

                      {/* Trạng thái section header */}
                      <div className="px-2.5 pt-1.5 pb-1 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                        Work Status
                      </div>

                      {/* Status options */}
                      <button
                        onClick={() => {
                          setUserStatus('online');
                          setShowStatusMenu(false);
                          if (pomodoroActive) {
                            setPomodoroActive(false);
                            setPomodoroTime(workDuration * 60);
                            addSyncLog('Changed status: Online (Paused Pomodoro)');
                          } else {
                            addSyncLog('Changed status: Online');
                          }
                          (window as any).playSystemSound?.('toggle');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                          <span>Online</span>
                        </div>
                        {userStatus === 'online' && <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />}
                      </button>

                      <button
                        onClick={() => {
                          setUserStatus('focused');
                          setShowStatusMenu(false);
                          addSyncLog("Changed status: Focused");
                          (window as any).playSystemSound?.('toggle');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" />
                          <span>Focusing</span>
                        </div>
                        {userStatus === 'focused' && <Check className="w-3.5 h-3.5 text-indigo-500 font-bold" />}
                      </button>

                      <button
                        onClick={() => {
                          setUserStatus('away');
                          setShowStatusMenu(false);
                          if (pomodoroActive) {
                            setPomodoroActive(false);
                            setPomodoroTime(workDuration * 60);
                            addSyncLog('Changed status: Away (Paused Pomodoro)');
                          } else {
                            addSyncLog('Changed status: Away');
                          }
                          (window as any).playSystemSound?.('toggle');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                          <span>Away</span>
                        </div>
                        {userStatus === 'away' && <Check className="w-3.5 h-3.5 text-amber-500 font-bold" />}
                      </button>

                      {/* Divider */}
                      <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />

                      {/* Quick access system controls inside profile */}
                      <div className="px-2.5 pt-1.5 pb-1 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                        My Applications
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setShowStatusMenu(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>User Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setShowStatusMenu(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span>System Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowPremiumModal(true);
                          setShowStatusMenu(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-450 hover:bg-amber-50 dark:hover:bg-amber-955/20 transition-colors cursor-pointer border border-dashed border-amber-200 dark:border-amber-800/40 my-1 bg-amber-500/5"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse animate-duration-1000" />
                        <span>{currentUser.isPremium ? 'Pro Activated' : 'Upgrade Premium Pro'}</span>
                      </button>

                      <button
                        onClick={async () => {
                          setShowStatusMenu(false);
                          addSyncLog('Signed out of account');
                          (window as any).playSystemSound?.('delete');
                          try { await supabase.auth.signOut(); } catch (e) {}
                          updateCurrentUser(null);
                          localStorage.removeItem('avaxa_session');
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Below Header row wrapper container */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">

      {/* ClickUp-style Sidebar Navigation */}
      <div className={`hidden md:flex flex-col justify-between shrink-0 z-20 relative cu-sidebar transition-all duration-200 ease-in-out cursor-default [&_*]:cursor-default ${
        isMainSidebarCollapsed 
          ? 'w-[var(--cu-sidebar-collapsed)] px-2 py-3 space-y-3' 
          : 'w-[var(--cu-sidebar-width)] px-2.5 py-3 space-y-4'
      }`}>
        
        <div className={`h-full flex flex-col justify-between ${isMainSidebarCollapsed ? 'space-y-3' : 'space-y-6'}`}>
          <div className={isMainSidebarCollapsed ? 'space-y-3' : 'space-y-4'}>
            
            <div className={`overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-none pb-4 ${isMainSidebarCollapsed ? 'space-y-2' : 'space-y-4'}`}>
              {/* ClickUp Sidebar Hierarchy */}
              <div className={`relative flex flex-col pt-1 ${isMainSidebarCollapsed ? 'space-y-2 px-0.5' : 'space-y-3 px-1'}`}>
                
                <div className={isMainSidebarCollapsed ? 'space-y-1' : 'space-y-0.5'}>
                  {orderedItems.map((item) => {
                    const isActive = item.id === 'tasks'
                      ? (activeTab === 'tasks' && activeSpaceId === null && activeListId === null)
                      : (activeTab === item.id);
                    return (
                      <NavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        shortLabel={getShortLabel(item.label)}
                        isActive={isActive}
                        count={item.count}
                        collapsed={isMainSidebarCollapsed}
                        style={{ opacity: draggedItemId === item.id ? 0.3 : 1 }}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onClick={() => {
                          if (item.id === 'tasks') {
                            setActiveTab('tasks');
                            setActiveSpaceId(null);
                            setActiveListId(null);
                          } else {
                            setActiveTab(item.id);
                            setActiveSpaceId(null);
                            setActiveListId(null);
                          }
                          addSyncLog(`Switched to: ${item.label}`);
                        }}
                        dragIndicator={dragOverItemId === item.id && dragOverSide ? (
                          <div
                            className={`absolute left-0 right-0 h-[2px] bg-[var(--cu-primary)] pointer-events-none z-30 transition-all ${
                              dragOverSide === 'top' 
                                ? 'top-0 -translate-y-1/2' 
                                : 'bottom-0 translate-y-1/2'
                            }`}
                          >
                            <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[var(--cu-primary)] shadow-[0_0_8px_rgba(123,104,238,0.6)]" />
                          </div>
                        ) : undefined}
                      />
                    );
                  })}
              </div>

              {/* Removed Sidebar App Links as requested */}

            </div>
          </div>



          </div>
        </div>



      </div>

      {/* Main workspace layout wrapper */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        

        {(() => {
          const isSpaceTab = activeTab === 'tasks' || activeTab === 'my-tasks' || activeTab === 'chat' || activeTab === 'whiteboard' || activeTab === 'docs' || activeTab === 'inbox';
          
          return (
            <main className="flex-1 relative w-full h-full overflow-hidden cu-content-area">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  id={`workspace_container_${activeTab}`}
                  className={`will-change-transform transform-gpu w-full h-full ${
                    isSpaceTab 
                      ? 'overflow-hidden' 
                      : 'overflow-y-auto p-4 md:p-6 pb-12 custom-scrollbar'
                  }`}
                >
                  {activeTab === 'dashboard' && (
                    <DashboardOverview
                      tasks={currentWorkspaceTasks}
                      members={currentWorkspaceMembers}
                      docs={currentWorkspaceDocs}
                      syncLogs={syncLogs}
                      isOffline={isOffline}
                      onNavigate={setActiveTab}
                      onToggleOffline={handleToggleOffline}
                      currentUser={currentUser}
                      onUpgradePremium={() => setShowPremiumModal(true)}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      onClearSyncLogs={() => {
                        clearSyncLogs();
                      }}
                    />
                  )}



                  {activeTab === 'inbox' && (
                    <InboxView
                      notificationsList={notificationsList}
                      setNotificationsList={setNotificationsList}
                      tasks={tasks}
                      members={members.filter(m => m.workspaceIds?.includes(activeWorkspaceId))}
                      workspaces={workspaces}
                      activeWorkspaceId={activeWorkspaceId}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      currentUser={currentUser}
                      onUpgradePremium={() => setShowPremiumModal(true)}
                      workspaceInvitations={workspaceInvitations}
                      onAcceptInvite={handleAcceptWorkspaceInvite}
                      onDeclineInvite={handleDeclineWorkspaceInvite}
                    />
                  )}

                  {(activeTab === 'tasks' || activeTab === 'my-tasks') && (
                    <SpacePage
                      tasks={mapTasksToSpaces(tasks)}
                      members={members.filter(m => m.workspaceIds?.includes(activeWorkspaceId))}
                      onAddTask={handleAddTask}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                      isOffline={isOffline}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      globalActiveTaskId={activeTimerTaskId}
                      globalActiveElapsed={activeTimerElapsed}
                      globalIsPaused={isTimerPaused}
                      onStartGlobalTimer={handleStartGlobalTimer}
                      onStopGlobalTimer={handleStopGlobalTimer}
                      onTogglePauseGlobalTimer={handleTogglePauseGlobalTimer}
                      initialSelectedTaskId={initialSelectedTaskId}
                      onClearInitialSelectedTaskId={() => setInitialSelectedTaskId(null)}
                      onUpdateTaskOrder={handleUpdateTaskOrder}
                      allWorkspaces={workspaces}
                      activeWorkspaceId={activeWorkspaceId}
                      onActiveWorkspaceChange={handleWorkspaceChange}
                      currentUser={currentUser}
                      onUpgradePremium={() => setShowPremiumModal(true)}
                      onAddSpace={() => setShowAddSpaceModal(true)}
                      onAddWorkspace={(name, theme, coverUrl) => {
                        const newWs = {
                          id: `w-${Date.now()}`,
                          name,
                          theme: theme || 'indigo',
                          initial: name.charAt(0).toUpperCase(),
                          user_id: currentUser?.id,
                          coverUrl
                        };
                        setWorkspaces(prev => [...prev, newWs]);
                        if (!isOffline) {
                          supabase.from('workspaces').insert([newWs]).then(({ error }) => {
                            if (error) console.error('Error adding workspace:', error);
                          });
                        } else {
                          try {
                            localStorage.setItem(`avaxa_fallback_workspaces_${currentUser?.id}`, JSON.stringify([...workspaces, newWs]));
                          } catch (e) {}
                        }
                      }}
                      
                      // Space states
                      spaces={spaces.filter(s => s.workspaceId === activeWorkspaceId)}
                      onSaveSpaces={handleSaveSpaces}
                      activeSpaceId={activeSpaceId}
                      setActiveSpaceId={setActiveSpaceId}
                      activeListId={activeListId}
                      setActiveListId={setActiveListId}
                      myTasksOnly={activeTab === 'my-tasks'}
                      onOpenSpaceSettings={openSpaceSettings}
                      onAddListSpace={(spaceId) => setShowAddListSpaceId(spaceId)}
                      allDocs={docs}
                      syncLogs={syncLogs}
                      onNavigate={setActiveTab}
                      onToggleOffline={handleToggleOffline}
                      onAddFolderToSpace={handleAddFolderToSpace}
                      onAddDocToSpace={handleAddDocToSpace}
                      onAddWhiteboardToSpace={handleAddWhiteboardToSpace}
                      onAddListToFolder={handleAddListToFolder}
                      onAddDoc={handleAddDoc}
                      onUpdateDoc={handleUpdateDoc}
                      onDeleteDoc={handleDeleteDoc}
                    />
                  )}

                  {activeTab === 'calendar' && (
                    <CalendarView
                      tasks={currentWorkspaceTasks}
                      members={members.filter(m => m.workspaceIds?.includes(activeWorkspaceId))}
                      isOffline={isOffline}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      onAddTask={handleAddTask}
                      onUpdateTask={handleUpdateTask}
                    />
                  )}

                  {activeTab === 'productivity' && (
                    <ProductivityHub
                      tasks={currentWorkspaceTasks}
                      members={members.filter(m => m.workspaceIds?.includes(activeWorkspaceId))}
                      isOffline={isOffline}
                      currentUser={currentUser}
                      onUpgradePremium={() => setShowPremiumModal(true)}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                    />
                  )}

                  {activeTab === 'whiteboard' && (
                    <WhiteboardHub
                      spaces={spaces}
                      onSaveSpaces={handleSaveSpaces}
                      activeWorkspaceId={activeWorkspaceId}
                      members={members.filter(m => m.workspaceIds?.includes(activeWorkspaceId))}
                      tasks={tasks}
                      isOffline={isOffline}
                      currentUser={currentUser}
                      onUpgradePremium={() => setShowPremiumModal(true)}
                      onAddSyncLog={addSyncLog}
                      onAddTask={handleAddTask}
                      triggerToast={triggerToast}
                    />
                  )}

                  {activeTab === 'chat' && (
                    <ChatRoom
                      members={members.filter(m => !m.workspaceIds || m.workspaceIds.length === 0 || m.workspaceIds.includes(activeWorkspaceId))}
                      currentUser={currentUser}
                      isOffline={isOffline}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      activeTab={activeTab}
                      initialSelectedChannelId={initialSelectedChannelId}
                      onClearInitialSelectedChannelId={() => setInitialSelectedChannelId(null)}
                      workspaceId={activeWorkspaceId}
                      spaces={spaces.filter(s => s.workspaceId === activeWorkspaceId)}
                      onSaveSpaces={handleSaveSpaces}
                    />
                  )}

                  {activeTab === 'docs' && (
                    <div className="w-full h-full">
                      <DocumentHub
                        docs={currentWorkspaceDocs}
                        currentUser={currentUser}
                        onAddDoc={handleAddDoc}
                        onUpdateDoc={handleUpdateDoc}
                        onDeleteDoc={handleDeleteDoc}
                        isOffline={isOffline}
                        onAddSyncLog={addSyncLog}
                        initialSelectedDocId={initialSelectedDocId}
                        onClearInitialSelectedDocId={() => setInitialSelectedDocId(null)}
                      />
                    </div>
                  )}



                  {activeTab === 'profile' && (
                    <ProfilePage
                      currentUser={currentUser}
                      setCurrentUser={updateCurrentUser}
                      members={members}
                      setMembers={setMembers}
                      tasks={tasks}
                      isOffline={isOffline}
                      addSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      onUpdateMember={handleUpdateMember}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsPanel 
                      isDarkMode={isDarkMode}
                      setIsDarkMode={setIsDarkMode}
                      accentPreset={accentPreset}
                      setAccentPreset={setAccentPreset}
                      soundEnabled={soundEnabled}
                      setSoundEnabled={(val) => {
                        setSoundEnabled(val);
                        if (val) {
                          setTimeout(() => {
                            (window as any).playSystemSound?.('success');
                          }, 50);
                        }
                      }}
                      blurIntensity={blurIntensity}
                      setBlurIntensity={(val) => {
                        setBlurIntensity(val);
                        (window as any).playSystemSound?.('toggle');
                      }}
                      notificationSettings={notificationSettings}
                      setNotificationSettings={setNotificationSettings}
                      workspaces={workspaces}
                      activeWorkspaceId={activeWorkspaceId}
                      onUpdateWorkspace={handleUpdateWorkspace}
                      onDeleteWorkspace={handleDeleteWorkspace}
                      onAddWorkspace={handleCreateWorkspace}
                      members={members}
                      setMembers={setMembers}
                      tasks={tasks}
                      onAddMember={handleAddMember}
                      onUpdateMember={handleUpdateMember}
                      onDeleteMember={handleDeleteMember}
                      onAddSyncLog={addSyncLog}
                      syncLogs={syncLogs}
                      activeSettingsTab={activeSettingsTab}
                      setActiveSettingsTab={setActiveSettingsTab}
                      onLogout={async () => {
                        await supabase.auth.signOut();
                        updateCurrentUser(null);
                        if (triggerToast) triggerToast('info', 'Signed Out', 'You have been signed out of Avaxa OS.');
                      }}
                      triggerToast={triggerToast}
                      onSendWorkspaceInvites={handleSendWorkspaceInvites}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          );
        })()}

      </div>

      {/* ── Mobile Responsive Sidebar Drawer Sheet ── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 md:hidden cursor-pointer"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[var(--cu-surface)] backdrop-blur-2xl border-r border-[var(--cu-border)] z-50 md:hidden flex flex-col justify-between p-4 shadow-[var(--cu-shadow-lg)] overflow-y-auto custom-touch-scroll"
            >
              <div className="space-y-4">
                {/* Header with Workspace logo & close button */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div 
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                    onClick={() => {
                      setShowWorkspaceMenu(!showWorkspaceMenu);
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0 overflow-hidden"
                      style={!currentWorkspace?.logoUrl ? {
                        background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                                    currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                                    currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                                    'linear-gradient(135deg, #7B61FF, #6D55FE)',
                      } : undefined}
                    >
                      {currentWorkspace?.logoUrl ? (
                        <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                      ) : (
                        <span>{currentWorkspace?.initial || 'A'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate flex items-center gap-1">
                        <span>{currentWorkspace?.name || 'Avaxa'}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        {currentUser?.isPremium ? 'Premium Pro' : 'Free Forever'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Items List */}
                <div className="space-y-1 py-1">
                  <div className="px-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    NAVIGATION
                  </div>
                  {orderedItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 shadow-3xs'
                            : 'text-slate-650 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon size={20} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Widgets section: Pomodoro Timer */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <div className="px-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    FOCUS TIMER
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                        {Math.floor(pomodoroTime / 60).toString().padStart(2, '0')}:{(pomodoroTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={() => setPomodoroActive(!pomodoroActive)}
                      className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        pomodoroActive 
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-955/40 dark:text-rose-400' 
                          : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-955/40 dark:text-indigo-400'
                      }`}
                    >
                      {pomodoroActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <SignedImage filePath={currentUser?.avatar} className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700" alt={currentUser?.name || 'User'} />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                        {currentUser?.name || 'User'}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate max-w-[120px]">
                        {currentUser?.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Toggle Theme"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation — ClickUp style */}
      <nav className="md:hidden shrink-0 cu-mobile-nav flex items-center justify-around z-45 px-1 py-1.5 pb-[env(safe-area-inset-bottom,8px)]">
         {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'tasks', label: 'Tasks', icon: Briefcase },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'base', label: 'Base', icon: Database },
          { id: 'docs', label: 'Docs', icon: FileText },
          { id: 'more_menu', label: 'More', icon: Menu },
        ].map((item) => {
          const Icon = item.icon;
          const isMore = item.id === 'more_menu';
          const isActive = !isMore && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isMore) {
                  setIsMobileSidebarOpen(true);
                } else {
                  setActiveTab(item.id);
                  addSyncLog(`Bottom menu: Switched to ${item.label}`);
                }
              }}
              className="flex-1 flex flex-col items-center justify-center p-1.5 gap-0.5 relative cursor-pointer active:scale-95 transition-transform cu-mobile-nav-item"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-x-2 top-0.5 bottom-0.5 cu-mobile-nav-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <Icon 
                className={`w-[18px] h-[18px] z-10 transition-colors ${isActive ? 'text-[var(--cu-primary)]' : 'text-[var(--cu-text-muted)]'}`}
              />
              <span 
                className={`text-[9px] font-semibold z-10 transition-colors ${isActive ? 'text-[var(--cu-primary)]' : 'text-[var(--cu-text-muted)]'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Persistent Floating AI Brain Assistant */}
      <AvaxaBrainAssistant
        tasks={tasks}
        documents={docs}
        members={members}
        isOffline={isOffline}
        onUpdateTask={handleUpdateTask}
        onAddSyncLog={addSyncLog}
      />

      {/* Modern interactive full-screen sync transition loader */}
      <AnimatePresence>
        {syncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center"
          >
            <div className="space-y-6 max-w-sm w-full font-sans">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin" />
                <Cloud className="w-5 h-5 text-white absolute" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black font-display text-indigo-100 tracking-tight">Merging storage...</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Avaxa OS is syncing offline actions to the cloud server.</p>
              </div>

              {/* Progress counter bar styling */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700 p-0.5">
                  <div className="bg-gradient-to-r from-indigo-505 from-indigo-500 to-pink-500 h-full rounded-full transition-all duration-150" style={{ width: `${syncProgress}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                  <span>SYNCHRONIZING</span>
                  <span>{syncProgress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Workspace Settings Modal */}
      <WorkspaceSettingsModal
        isOpen={showWorkspaceSettingsModal}
        onClose={() => setShowWorkspaceSettingsModal(false)}
        workspace={editingWorkspaceForModal}
        currentUser={currentUser}
        onUpdateWorkspace={handleUpdateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        members={members}
        workspacesCount={workspaces.length}
        onUpdateMember={handleUpdateMember}
        onAddMember={handleAddMember}
        onSendWorkspaceInvites={handleSendWorkspaceInvites}
      />

      {/* Real-time Toast Notification container in top-right corner */}
      <ToastNotification toasts={toasts} onClose={(id) => removeToast(id)} />

      {/* Immersive Global Search Modal overlay */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchCategory={searchCategory}
        setSearchCategory={setSearchCategory}
        tasks={tasks}
        docs={docs}
        members={members}
        activeWorkspaceId={activeWorkspaceId}
        onSelectTask={(taskId) => {
          setInitialSelectedTaskId(taskId);
          setActiveTab('tasks');
        }}
        onSelectDoc={(docId) => {
          setInitialSelectedDocId(docId);
          setActiveTab('docs');
        }}
        onSelectChannel={(channelId) => {
          setInitialSelectedChannelId(channelId);
          setActiveTab('chat');
        }}
        onSelectMember={(memberId) => {
          setViewingMemberProfileId(memberId);
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenSettings={() => {
          setActiveTab('settings');
        }}
        onOpenAutomations={() => {
          setShowAutomationModal(true);
        }}
        onOpenExport={() => {
          setShowExportModal(true);
        }}
        onToggleDarkMode={() => {
          setIsDarkMode(!isDarkMode);
        }}
        isDarkMode={isDarkMode}
        addSyncLog={addSyncLog}
      />

      {/* No-Code Automation Rules Modal */}
      <AutomationRulesModal
        isOpen={showAutomationModal}
        onClose={() => setShowAutomationModal(false)}
        addSyncLog={addSyncLog}
        triggerToast={triggerToast}
      />

      {/* Export Data & Backup Center Modal */}
      <ExportDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tasks={tasks}
        docs={docs}
        members={members}
        activeWorkspaceId={activeWorkspaceId}
        addSyncLog={addSyncLog}
        triggerToast={triggerToast}
      />

      {/* Immersive Glassmorphic Add Workspace Modal */}
      <AnimatePresence>
        {showAddWorkspaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWorkspaceModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl w-full max-w-sm p-5 overflow-hidden shadow-2xl z-10 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-tr from-indigo-500 to-sky-500 rounded-xl text-white shadow-xs">
                    <Plus className="w-4 h-4 shrink-0 font-bold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-55 tracking-wide uppercase">Create New Workspace</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Set up a new isolated collaboration area.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddWorkspaceModal(false)}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form Block */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const name = target.workspaceName.value;
                  const theme = target.workspaceTheme.value;
                  if (!name.trim()) return;
                  handleCreateWorkspace(name, theme, modalSelectedCover);
                  setModalSelectedCover('');
                  setShowAddWorkspaceModal(false);
                }}
                className="space-y-4"
              >
                {/* Name field */}
                <div className="space-y-1.5">
                  <label htmlFor="workspaceName" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Workspace Name</label>
                  <input
                    required
                    id="workspaceName"
                    name="workspaceName"
                    type="text"
                    placeholder="Example: Marketing Project, Product B..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/85 focus:border-indigo-500 text-slate-800 dark:text-slate-50 placeholder-slate-400 font-sans text-xs focus:outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Theme presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Theme Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'indigo', name: 'Indigo', color: 'bg-indigo-500' },
                      { id: 'ocean', name: 'Ocean', color: 'bg-sky-500' },
                      { id: 'forest', name: 'Emerald', color: 'bg-emerald-500' },
                      { id: 'sunset', name: 'Sunset', color: 'bg-rose-500' }
                    ].map((p) => (
                      <label key={p.id} className="relative cursor-pointer group flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/55 transition-all">
                        <input
                          type="radio"
                          name="workspaceTheme"
                          value={p.id}
                          defaultChecked={p.id === 'indigo'}
                          className="sr-only peer"
                        />
                        <div className={`w-4 h-4 rounded-full ${p.color} shadow-xs group-hover:scale-110 transition-transform`} />
                        <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 select-none truncate max-w-full block text-center leading-none mt-0.5">{p.name}</span>
                        <div className="absolute inset-0 rounded-xl border border-transparent peer-checked:border-indigo-500 pointer-events-none transition-all" />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Cover selection */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Choose Representative Cover Background</label>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setModalSelectedCover('')}
                      className={`relative shrink-0 w-16 h-11 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${!modalSelectedCover ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-sm' : 'border-dashed border-slate-200 dark:border-slate-800/70'}`}
                    >
                      <span className="text-[8px] font-bold text-slate-400">Default</span>
                      {!modalSelectedCover && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </button>
                    {WORKSPACE_COVERS.map(cover => (
                      <button
                        key={cover.id}
                        type="button"
                        onClick={() => setModalSelectedCover(cover.url)}
                        className={`relative shrink-0 w-16 h-11 rounded-lg border overflow-hidden transition-all group cursor-pointer ${modalSelectedCover === cover.url ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30' : 'border-slate-200/65 dark:border-slate-800 opacity-80 hover:opacity-100'}`}
                      >
                        <img
                          src={cover.url}
                          alt={cover.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-[6px] font-black text-white text-center py-0.5 truncate px-1 uppercase tracking-tight">
                          {cover.name}
                        </div>
                        {modalSelectedCover === cover.url && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">
                            ✓
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button bar */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalSelectedCover('');
                      setShowAddWorkspaceModal(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-indigo-500/20 active:shadow-none transition-all hover:brightness-105 cursor-pointer text-center"
                    style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COMMERCIAL SAAS PRICING & SUBSCRIPTION MODAL ── */}
      <PricingModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        currentUser={currentUser}
        onUpdatePremiumStatus={(isPrem, plan) => {
          handleTogglePremium(isPrem);
        }}
        triggerToast={triggerToast}
        addSyncLog={addSyncLog}
      />

      {/* ── ADD SPACE MODAL ── */}
      <AnimatePresence>
        {showAddSpaceModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAddSpaceModal(false)} 
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.92, y: 20, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="relative w-full max-w-[540px] rounded-[28px] bg-white dark:bg-[#0c0e18] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden z-10 text-left font-sans select-none shadow-[0_32px_80px_-12px_rgba(99,102,241,0.18),0_0_0_1px_rgba(99,102,241,0.04)]"
            >
              {/* ── Animated Gradient Top Strip ── */}
              <div 
                className="h-1.5 w-full"
                style={{
                  backgroundImage: {
                    indigo: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #6366f1)',
                    rose: 'linear-gradient(90deg, #ec4899, #f472b6, #fb7185, #ec4899)',
                    sky: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc, #0ea5e9)',
                    emerald: 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #10b981)',
                    amber: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d, #f59e0b)',
                    sunset: 'linear-gradient(90deg, #f97316, #fb923c, #fdba74, #f97316)',
                  }[newSpaceColor as 'indigo' | 'rose' | 'sky' | 'emerald' | 'amber' | 'sunset'] || 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #6366f1)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s linear infinite',
                }}
              />
              <style>{`@keyframes shimmer { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }`}</style>

              {/* ── Dynamic Theme Ambient Glow ── */}
              <div 
                style={{
                  background: {
                    indigo: 'radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.08), transparent 65%)',
                    rose: 'radial-gradient(ellipse at top right, rgba(236, 72, 153, 0.08), transparent 65%)',
                    sky: 'radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.08), transparent 65%)',
                    emerald: 'radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.08), transparent 65%)',
                    amber: 'radial-gradient(ellipse at top right, rgba(245, 158, 11, 0.08), transparent 65%)',
                    sunset: 'radial-gradient(ellipse at top right, rgba(249, 115, 22, 0.08), transparent 65%)',
                  }[newSpaceColor as 'indigo' | 'rose' | 'sky' | 'emerald' | 'amber' | 'sunset']
                }}
                className="absolute inset-0 pointer-events-none transition-all duration-700" 
              />

              <div className="p-6 md:p-7 relative z-10">
                {/* ── Close Button ── */}
                <button 
                  type="button"
                  onClick={() => setShowAddSpaceModal(false)} 
                  className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center transition-all active:scale-90 cursor-pointer z-20 backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>

                <form onSubmit={handleAddSpace} className="space-y-5 relative z-10">
                  {/* ── Header ── */}
                  <div className="space-y-2 pr-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {t('createSpace') || (locale === 'vi' ? 'Tạo Space mới' : 'Create Space')}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                          {t('selectSpaceTemplate') || (locale === 'vi' ? 'Tổ chức đội nhóm, phòng ban & dự án.' : 'Organize teams, departments & projects.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Template Presets ── */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase text-slate-400/80 dark:text-slate-500 tracking-[0.08em] block">
                      {t('spaceTemplateTitle') || (locale === 'vi' ? 'Bắt đầu nhanh' : 'Quick Start')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: locale === 'vi' ? 'Phát triển phần mềm' : 'Software Development', icon: 'Laptop', color: 'indigo', desc: 'Sprint & Backlog', iconBg: 'bg-indigo-500/10 text-indigo-500' },
                        { name: locale === 'vi' ? 'Marketing & Chiến dịch' : 'Marketing & Campaign', icon: 'Rocket', color: 'rose', desc: 'Campaigns & Content', iconBg: 'bg-rose-500/10 text-rose-500' },
                        { name: locale === 'vi' ? 'Thiết kế UX/UI' : 'UX/UI Design', icon: 'Palette', color: 'sky', desc: 'Design System & Reviews', iconBg: 'bg-sky-500/10 text-sky-500' },
                        { name: locale === 'vi' ? 'Vận hành & HR' : 'Operations & HR', icon: 'Zap', color: 'emerald', desc: 'Hiring & Operations', iconBg: 'bg-emerald-500/10 text-emerald-500' }
                      ].map((tpl) => {
                        const isActive = newSpaceName === tpl.name;
                        const colorAccentMap: Record<string, string> = {
                          indigo: 'border-indigo-500/60 bg-indigo-50/60 dark:bg-indigo-950/20 ring-1 ring-indigo-500/10',
                          rose: 'border-rose-500/60 bg-rose-50/60 dark:bg-rose-950/20 ring-1 ring-rose-500/10',
                          sky: 'border-sky-500/60 bg-sky-50/60 dark:bg-sky-950/20 ring-1 ring-sky-500/10',
                          emerald: 'border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-500/10',
                        };
                        return (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => {
                              setNewSpaceName(tpl.name);
                              setNewSpaceEmoji(tpl.icon);
                              setNewSpaceColor(tpl.color);
                              setNewSpaceDescription(tpl.desc);
                            }}
                            className={`group relative p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                              isActive
                                ? (colorAccentMap[tpl.color] || colorAccentMap.indigo)
                                : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${tpl.iconBg}`}>
                              {(() => {
                                const iconMap: Record<string, React.ReactNode> = {
                                  'Laptop': <Database className="w-4 h-4" />,
                                  'Rocket': <Zap className="w-4 h-4" />,
                                  'Palette': <Sliders className="w-4 h-4" />,
                                  'Zap': <Users className="w-4 h-4" />,
                                };
                                return iconMap[tpl.icon] || <Sparkles className="w-4 h-4" />;
                              })()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[11.5px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{tpl.name}</span>
                              <span className="block text-[9.5px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">{tpl.desc}</span>
                            </div>
                            {isActive && (
                              <div className="absolute top-2 right-2">
                                <Check className="w-3.5 h-3.5 text-indigo-500" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Icon & Theme Color ── */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4 space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-400/80 dark:text-slate-500 tracking-[0.08em] block">
                        {t('iconEmoji') || (locale === 'vi' ? 'Biểu tượng' : 'Icon')}
                      </label>
                      <div>
                        <EmojiIconPicker
                          value={newSpaceEmoji || 'Package'}
                          onChange={setNewSpaceEmoji}
                        />
                      </div>
                    </div>

                    <div className="col-span-8 space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-400/80 dark:text-slate-500 tracking-[0.08em] block">
                        {t('themeColor') || (locale === 'vi' ? 'Màu chủ đề' : 'Theme Color')}
                      </label>
                      <div className="flex items-center gap-2 mt-0.5">
                        {[
                          { key: 'indigo', hex: '#6366f1', label: 'Indigo' },
                          { key: 'rose', hex: '#ec4899', label: 'Rose' },
                          { key: 'sky', hex: '#0ea5e9', label: 'Sky' },
                          { key: 'emerald', hex: '#10b981', label: 'Emerald' },
                          { key: 'amber', hex: '#f59e0b', label: 'Amber' },
                          { key: 'sunset', hex: '#f97316', label: 'Orange' },
                        ].map(col => (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => setNewSpaceColor(col.key)}
                            className="group flex flex-col items-center gap-1"
                          >
                            <div
                              className={`w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer relative ${
                                newSpaceColor === col.key 
                                  ? 'ring-2 ring-offset-2 dark:ring-offset-[#0c0e18] scale-110 shadow-lg' 
                                  : 'opacity-70 hover:opacity-100 hover:scale-105'
                              }`}
                              style={{
                                backgroundColor: col.hex,
                                ...(newSpaceColor === col.key ? { boxShadow: `0 4px 14px -2px ${col.hex}40` } : {})
                              }}
                            >
                              {newSpaceColor === col.key && <Check className="w-3.5 h-3.5 text-white stroke-[3px] drop-shadow-sm" />}
                            </div>
                            <span className={`text-[8px] font-bold transition-colors ${newSpaceColor === col.key ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>
                              {col.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Space Name Input ── */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400/80 dark:text-slate-500 tracking-[0.08em] block">
                      {t('spaceName') || (locale === 'vi' ? 'Tên Space' : 'Space Name')}
                    </label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        required 
                        value={newSpaceName} 
                        onChange={e => setNewSpaceName(e.target.value)} 
                        placeholder={locale === 'vi' ? 'Ví dụ: Marketing, Kỹ thuật, HR...' : 'e.g. Marketing, Engineering, HR'} 
                        className="w-full px-4 py-2.5 text-[13px] rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50/80 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-slate-900 dark:text-white font-bold transition-all placeholder:text-slate-350 placeholder:font-medium"
                      />
                    </div>
                  </div>

                  {/* ── Description ── */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400/80 dark:text-slate-500 tracking-[0.08em] block">
                      {t('descriptionOptional') || (locale === 'vi' ? 'Mô tả (không bắt buộc)' : 'Description (optional)')}
                    </label>
                    <input 
                      type="text" 
                      value={newSpaceDescription} 
                      onChange={e => setNewSpaceDescription(e.target.value)} 
                      placeholder={locale === 'vi' ? 'Nhập mô tả ngắn gọn cho Space...' : 'Provide a brief description...'} 
                      className="w-full px-4 py-2.5 text-[13px] rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50/80 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-slate-900 dark:text-white font-semibold transition-all placeholder:text-slate-350 placeholder:font-medium"
                    />
                  </div>

                  {/* ── Settings Cards ── */}
                  <div className="space-y-2">
                    {/* Permission Row */}
                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-slate-50/80 to-slate-50/40 dark:from-slate-900/60 dark:to-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl transition-colors hover:border-slate-300/60 dark:hover:border-slate-700/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <Users className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="block text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {t('defaultPermission') || (locale === 'vi' ? 'Quyền truy cập' : 'Default Permission')}
                          </span>
                          <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            {t('defaultPermissionDesc') || (locale === 'vi' ? 'Vai trò ban đầu cho thành viên' : 'Initial role for workspace members')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => setShowSpacePermissionMenu(!showSpacePermissionMenu)}
                          className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-xl text-[11px] px-3 py-1.5 text-slate-800 dark:text-slate-200 font-extrabold outline-none hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer shadow-2xs hover:shadow-sm transition-all group/permBtn"
                        >
                          <span>
                            {newSpacePermission === 'Full edit' ? (locale === 'vi' ? 'Toàn quyền sửa' : 'Full edit') :
                             newSpacePermission === 'Edit only' ? (locale === 'vi' ? 'Chỉ chỉnh sửa' : 'Edit only') :
                             newSpacePermission === 'Read only' ? (locale === 'vi' ? 'Chỉ xem' : 'Read only') :
                             (locale === 'vi' ? 'Chỉ bình luận' : 'Comment only')}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover/permBtn:text-indigo-500 transition-transform duration-200 ${showSpacePermissionMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showSpacePermissionMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowSpacePermissionMenu(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 28 }}
                                className="absolute right-0 top-full mt-1.5 w-52 p-1.5 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl backdrop-blur-xl z-50 space-y-0.5 text-left"
                              >
                                {[
                                  { value: 'Full edit', labelEn: 'Full edit', labelVi: 'Toàn quyền sửa', descEn: 'Full access to view and edit', descVi: 'Toàn quyền quản lý & chỉnh sửa' },
                                  { value: 'Edit only', labelEn: 'Edit only', labelVi: 'Chỉ chỉnh sửa', descEn: 'Can edit content & tasks', descVi: 'Chỉnh sửa nội dung & công việc' },
                                  { value: 'Read only', labelEn: 'Read only', labelVi: 'Chỉ xem', descEn: 'View-only access', descVi: 'Chỉ có quyền xem nội dung' },
                                  { value: 'Comment only', labelEn: 'Comment only', labelVi: 'Chỉ bình luận', descEn: 'Can view and post comments', descVi: 'Xem và bình luận công việc' },
                                ].map((opt) => {
                                  const isSelected = newSpacePermission === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setNewSpacePermission(opt.value);
                                        setShowSpacePermissionMenu(false);
                                      }}
                                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                                        isSelected 
                                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold'
                                      }`}
                                    >
                                      <div>
                                        <div className="text-[11px] leading-tight">
                                          {locale === 'vi' ? opt.labelVi : opt.labelEn}
                                        </div>
                                        <div className="text-[9px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                                          {locale === 'vi' ? opt.descVi : opt.descEn}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2 stroke-[3]" />}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Private Toggle */}
                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-slate-50/80 to-slate-50/40 dark:from-slate-900/60 dark:to-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl transition-colors hover:border-slate-300/60 dark:hover:border-slate-700/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${newSpaceIsPrivate ? 'bg-rose-500/15 text-rose-500' : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-400'}`}>
                          <Lock className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="block text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {t('makePrivateSpace') || (locale === 'vi' ? 'Space Riêng tư' : 'Make Private Space')}
                          </span>
                          <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            {t('makePrivateSpaceDesc') || (locale === 'vi' ? 'Chỉ bạn và người được mời mới truy cập' : 'Only you and invited members can access')}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setNewSpaceIsPrivate(!newSpaceIsPrivate)}
                        className={`w-11 h-[26px] flex items-center rounded-full p-[3px] cursor-pointer transition-all duration-300 outline-none shrink-0 ${
                          newSpaceIsPrivate ? 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20' : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        <div 
                          className={`bg-white w-5 h-5 rounded-full transform transition-all duration-300 ease-out shadow-sm ${
                            newSpaceIsPrivate ? 'translate-x-[18px]' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* ── Footer Actions ── */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <button 
                      type="button"
                      onClick={() => setShowAddSpaceModal(false)}
                      className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer active:scale-95"
                    >
                      {t('cancel') || (locale === 'vi' ? 'Hủy' : 'Cancel')}
                    </button>
                    
                    <button 
                      type="submit" 
                      className="group px-6 py-2.5 rounded-xl text-[12px] font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer flex items-center gap-2 active:scale-[0.97] shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                      <span>{t('createSpace') || (locale === 'vi' ? 'Tạo Space' : 'Create Space')}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD LIST MODAL ── */}
      <AnimatePresence>
        {showAddListSpaceId && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddListSpaceId(null)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, y: 15, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 15, opacity: 0 }} className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden z-10 text-left">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create New Task List</h3>
                <button onClick={() => setShowAddListSpaceId(null)} className="p-1 rounded-md text-slate-400 hover:bg-slate-50"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddList} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">List Name</label>
                  <input type="text" required value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="List Name..." className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none bg-slate-50 focus:bg-white focus:border-indigo-500 text-slate-800 font-semibold" />
                </div>
                <div className="flex gap-3.5 pt-2">
                  <button type="button" onClick={() => setShowAddListSpaceId(null)} className="flex-1 py-2 rounded-xl border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-indigo-650 hover:bg-indigo-700 cursor-pointer">Create List</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SPACE SETTINGS MODAL ── */}
      <AnimatePresence>
        {showSpaceSettingsId && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSpaceSettingsId(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, y: 15, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 15, opacity: 0 }} className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 overflow-hidden z-10 text-left">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-white flex items-center gap-2">
                  <Cog className="w-4 h-4 text-indigo-500" />
                  <span>{t('spaceSettingsTitle') || 'Space Settings'}</span>
                </h3>
                <button onClick={() => setShowSpaceSettingsId(null)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{t('spaceName') || 'Space Name'}</label>
                  <input type="text" value={editSpaceName} onChange={e => setEditSpaceName(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold transition-all focus:ring-2 focus:ring-indigo-500/20" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{t('iconEmoji') || 'Icon (Emoji)'}</label>
                    <input type="text" value={editSpaceEmoji} onChange={e => setEditSpaceEmoji(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-center transition-all focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{t('themeColor') || 'Theme Color'}</label>
                    <select value={editSpaceColor} onChange={e => setEditSpaceColor(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold cursor-pointer">
                      <option value="indigo">Purple / Indigo</option>
                      <option value="rose">Pink / Rose</option>
                      <option value="sky">Sky Blue</option>
                      <option value="emerald">Emerald</option>
                      <option value="sunset">Sunset</option>
                    </select>
                  </div>
                </div>

                {/* ClickApps Configuration */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block">{t('activeClickApps') || 'ClickApps (Active Features)'}</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'timeTracking', label: 'Time Tracking' },
                      { key: 'multipleAssignees', label: 'Multiple Assignees' },
                      { key: 'customFields', label: 'Custom Fields' },
                      { key: 'relationships', label: 'Relationships & References' },
                      { key: 'subtasks', label: 'Subtasks' },
                      { key: 'priorities', label: 'Task Priorities' }
                    ].map(app => (
                      <label key={app.key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 transition-all">
                        <input type="checkbox" checked={!!editSpaceClickApps[app.key]} onChange={e => setEditSpaceClickApps({ ...editSpaceClickApps, [app.key]: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                        <span>{app.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom Statuses Configuration */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block">{t('customStatuses') || 'Task Statuses'}</span>
                  <div className="space-y-1.5">
                    {editSpaceStatuses.map((status, index) => (
                      <div key={status.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: status.color }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase flex-1">{status.label}</span>
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-black uppercase">{status.type}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (editSpaceStatuses.length <= 2) {
                              triggerToast('info', t('notification') || 'Notification', 'You must keep at least 2 statuses.');
                              return;
                            }
                            setEditSpaceStatuses(prev => prev.filter(s => s.id !== status.id));
                          }}
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => {
                        const name = prompt(t('enterNewStatus') || 'Enter new status name:');
                        if (!name) return;
                        const colors = ['#94a3b8', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#a855f7'];
                        const newStatus = {
                          id: `status-${Date.now()}`,
                          label: name,
                          color: colors[Math.floor(Math.random() * colors.length)],
                          type: 'inprogress' as TaskStatus
                        };
                        setEditSpaceStatuses(prev => [...prev, newStatus]);
                      }}
                      className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl cursor-pointer text-center transition-colors"
                    >
                      {t('addCustomStatus') || '+ Add new task status'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { handleDeleteSpace(showSpaceSettingsId); setShowSpaceSettingsId(null); }} className="mr-auto py-2 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer transition-colors">{t('deleteSpace') || 'Delete Space'}</button>
                  <button type="button" onClick={() => setShowSpaceSettingsId(null)} className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-colors">{t('cancel') || 'Cancel'}</button>
                  <button type="button" onClick={handleSaveSpaceSettings} className="py-2 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors shadow-md shadow-indigo-500/20">{t('saveSettings') || 'Save Settings'}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Global Time Tracker Widget ── */}
      <AnimatePresence>
        {activeTimerTaskId && (() => {
          const timedTask = tasks.find(t => t.id === activeTimerTaskId);
          if (!timedTask) return null;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[80] font-sans flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 shadow-2xl px-4 py-2.5 rounded-2xl select-none pointer-events-auto"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 ${isTimerPaused ? '' : 'animate-ping'}`} />
                <div className="flex flex-col text-left max-w-[140px] truncate">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Tracking Time</span>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate mt-0.5" title={timedTask.title}>{timedTask.title}</span>
                </div>
              </div>

              <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800" />

              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {formatTimerDuration(activeTimerElapsed)}
              </span>

              <div className="flex items-center gap-1">
                {/* Pause/Resume Button */}
                <button
                  type="button"
                  onClick={handleTogglePauseGlobalTimer}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer transition-colors"
                  title={isTimerPaused ? 'Resume' : 'Pause'}
                >
                  {isTimerPaused ? <Play className="w-3.5 h-3.5 fill-current text-indigo-500" /> : <Pause className="w-3.5 h-3.5 fill-current text-indigo-500" />}
                </button>

                {/* Stop Button */}
                <button
                  type="button"
                  onClick={handleStopGlobalTimer}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-600 dark:text-rose-450 rounded-lg cursor-pointer transition-colors"
                  title="Stop and Log Time"
                >
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <MemberProfileModal
        memberId={viewingMemberProfileId}
        onClose={() => setViewingMemberProfileId(null)}
        onSelectTask={(task) => {
          setActiveTab('tasks');
        }}
      />

      <PricingModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        currentUser={currentUser}
        triggerToast={triggerToast}
        addSyncLog={addSyncLog}
      />

      </div>
    </div>
  );
}
