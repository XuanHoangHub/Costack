"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Document, SyncLog, Space, TaskStatus, NotificationSettings, BaseApp, Workspace } from '../types';
import { supabase, getCleanChannel } from '../lib/supabaseClient';
import { useAppActions } from '@/hooks/useAppActions';
import { useWorkspaceInvitations } from '@/hooks/useRealtimeSync';
import { disconnectUserPresence, setUserPresenceStatus, useUserPresence } from '@/hooks/useUserPresence';
import { presenceDotClass, uiStatusToPresence } from '@/lib/presence';
import { isCreationConfirmation, shouldPersistInInbox } from '@/lib/notificationPolicy';
import { embedTaskRelationships, extractTaskRelationships, getIncompleteBlockers, getNextRecurringDate } from '@/lib/taskRelationships';
import { checkAndFirePendingReminders } from '@/lib/notificationManager';
import { getTaskAssigneeIds, isUserAssignedToTask } from '@/lib/taskAssignees';
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
import { useBillingEntitlement } from '@/hooks/useBillingEntitlement';
import { useThemeSync } from '@/hooks/useThemeSync';
import { useRuntimeConfig } from '@/hooks/useRuntimeConfig';
import { resolveAppRole } from '@/lib/authRole';
import { APEXA_SUPER_ADMIN_UID, isApexaSuperAdmin } from '@/lib/admin/constants';

import { NavItem } from '@/components/ui';
import { ApexaAiIcon } from '@/components/ApexaAiIcon';
import { Select } from '@/components/ui/Select';
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
import ThemeSwitch from '../components/ThemeSwitch';
import LanguageDropdown from '../components/LanguageDropdown';
import PromptModal, { PromptModalConfig } from '../components/PromptModal';
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

// Resilient loader with auto-retry and chunk recovery
const retryLoader = <T,>(importFn: () => Promise<T>): (() => Promise<T>) => {
  return () => {
    const run = (retries = 2, delay = 300): Promise<T> => {
      return importFn().catch((err: any) => {
        const isChunkError =
          err?.name === 'ChunkLoadError' ||
          err?.message?.includes('Loading chunk') ||
          err?.message?.includes('missing:') ||
          err?.message?.includes('Failed to fetch dynamically imported module');

        if (isChunkError && retries > 0) {
          return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
            run(retries - 1, delay * 2)
          );
        }

        if (isChunkError && typeof window !== 'undefined') {
          const key = 'chunk_reload_lock';
          const lastReload = Number(sessionStorage.getItem(key) || 0);
          if (Date.now() - lastReload > 8000) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
            return new Promise<T>(() => {});
          }
        }

        throw err;
      });
    };
    return run();
  };
};

// Dynamic heavy sub-system components for optimal bundle code-splitting
const DashboardOverview = dynamic(retryLoader(() => import('../components/DashboardOverview')), { loading: ComponentLoading });
const SpacePage = dynamic(retryLoader(() => import('../components/SpacePage')), { loading: ComponentLoading, ssr: false });
const CalendarView = dynamic(retryLoader(() => import('../components/CalendarView')), { loading: ComponentLoading });
const ChatRoom = dynamic(retryLoader(() => import('../components/ChatRoom')), { loading: ComponentLoading });
const TeamDirectory = dynamic(retryLoader(() => import('../components/TeamDirectory')), { loading: ComponentLoading });
const ApexaBrainAssistant = dynamic(retryLoader(() => import('../components/ApexaBrainAssistant')), { loading: ComponentLoading, ssr: false });
const SettingsPanel = dynamic(retryLoader(() => import('../components/SettingsPanel')), { loading: ComponentLoading });
const ProfilePage = dynamic(retryLoader(() => import('../components/ProfilePage')), { loading: ComponentLoading });
const ProductivityHub = dynamic(retryLoader(() => import('../components/ProductivityHub')), { loading: ComponentLoading });
const WorkspaceSettingsModal = dynamic(retryLoader(() => import('../components/WorkspaceSettingsModal')), { loading: ComponentLoading });
const InboxView = dynamic(retryLoader(() => import('../components/InboxView')), { loading: ComponentLoading });
const AnalyticsHub = dynamic(retryLoader(() => import('../components/AnalyticsHub')), { loading: ComponentLoading, ssr: false });
const KeyboardShortcutsModal = dynamic(retryLoader(() => import('../components/KeyboardShortcutsModal')));
const AddListModal = dynamic(retryLoader(() => import('../components/AddListModal')));
const FinanceHub = dynamic(retryLoader(() => import('../components/FinanceHub')), { loading: ComponentLoading });
const GoalsHub = dynamic(retryLoader(() => import('../components/GoalsHub')), { loading: ComponentLoading });
const SidebarOrderModal = dynamic(retryLoader(() => import('../components/SidebarOrderModal')), { ssr: false });

import { 
  Briefcase, MessageSquare, Edit3, Users, 
  Grid, LogOut, Cloud, RefreshCw, Sparkles, LayoutDashboard,
  Search, X, FileText, Hash, Cog, Copy, Link as LinkIcon, ArrowRight, CornerDownLeft, Check, ChevronDown, Lock,
  Timer, Bell, Calendar, Settings, Plus, Sliders, Sun, Moon,
  Trash2, Zap, User as UserIcon, ChevronRight, ChevronLeft, RotateCcw, Database, Play, Pause, Clock,
  BarChart3, Target, Menu, Globe, Keyboard, Handshake, Landmark, Boxes,
  ListPlus, ListTodo, CheckSquare, Folder, WifiOff,
  ChevronsLeft, ChevronsRight,
  CalendarClock, CalendarDays, Languages, UnfoldVertical, FoldVertical,
  ShieldCheck, SlidersHorizontal, Monitor, Palette
} from 'lucide-react';

import {
  House as PhHouse,
  Tray as PhTray,
  CalendarDots as PhCalendar,
  ChatCircleDots as PhChat,
  FileText as PhFileText,
  SquaresFour as PhSquaresFour,
  ChartBar as PhChartBar,
  Target as PhTarget,
  Table as PhTable,
  Users as PhUsers,
  Robot as PhBot,
  Handshake as PhHandshake,
  Bank as PhBank,
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
  if (label === 'Team Directory') return 'Team';
  if (label === 'Không gian làm việc') return 'Không gian';
  if (label === 'Hộp thư đến') return 'Hộp thư';
  if (label === 'Mục tiêu (OKRs)') return 'Mục tiêu';
  if (label.includes('(')) {
    return label.split('(')[0].trim();
  }
  return label;
};

const DEFAULT_SIDEBAR_ORDER = [
  'dashboard', 'inbox', 'tasks', 'calendar', 'goals',
  'finance', 'docs', 'chat', 'team'
];

export default function App() {
  useThemeSync();
  // Mount exactly one account Presence channel for Chat, profiles and directories.
  useUserPresence();
  const { t, locale } = useTranslation();
  const { applyEntitlement, entitlement } = useBillingEntitlement();
  const authStoreUser = useAuthStore((s) => s.currentUser);
  const { config: runtimeConfig } = useRuntimeConfig();
  const isLoaded = useRef(false);

  // Authentication check with 1-month persistence
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const updateCurrentUser = useCallback((user: User | null) => {
    let normalized = user;
    if (normalized && isApexaSuperAdmin(normalized.id)) {
      normalized = {
        ...normalized,
        role: 'admin',
        isPremium: true,
        subscriptionPlan: 'enterprise',
        billingStatus: 'active',
      };
    }
    setCurrentUser(normalized);
    useAuthStore.getState().setCurrentUser(normalized);
    if (normalized) {
      try {
        const saved = localStorage.getItem('avaxa_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.user = { ...(parsed.user || {}), ...normalized };
          localStorage.setItem('avaxa_session', JSON.stringify(parsed));
        }
      } catch {}
    }
  }, []);

  // Synchronize local currentUser state with useAuthStore updates
  useEffect(() => {
    if (!authStoreUser) return;
    setCurrentUser((prev) => {
      if (!prev) return authStoreUser;
      if (
        prev.id === authStoreUser.id &&
        prev.isPremium === authStoreUser.isPremium &&
        prev.subscriptionPlan === authStoreUser.subscriptionPlan &&
        prev.billingStatus === authStoreUser.billingStatus &&
        prev.role === authStoreUser.role &&
        prev.name === authStoreUser.name &&
        prev.avatar === authStoreUser.avatar
      ) {
        return prev;
      }
      return { ...prev, ...authStoreUser };
    });
  }, [authStoreUser]);

  // Synchronize entitlement results from useBillingEntitlement
  useEffect(() => {
    if (!entitlement) return;
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const isSuper = isApexaSuperAdmin(prev.id);
      const isPro = isSuper || entitlement.is_pro;
      const plan = isSuper ? 'enterprise' : entitlement.plan;
      const status = isSuper ? 'active' : entitlement.status;
      if (prev.isPremium === isPro && prev.subscriptionPlan === plan && prev.billingStatus === status) {
        return prev;
      }
      const updated: User = {
        ...prev,
        isPremium: isPro,
        subscriptionPlan: plan,
        billingStatus: status,
        billingCycle: isSuper ? 'yearly' : entitlement.billing_cycle,
        billingPeriodEnd: isSuper ? '2099-12-31T23:59:59Z' : entitlement.current_period_end,
      };
      useAuthStore.getState().setCurrentUser(updated);
      try {
        const saved = localStorage.getItem('avaxa_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.user = { ...(parsed.user || {}), ...updated };
          localStorage.setItem('avaxa_session', JSON.stringify(parsed));
        }
      } catch {}
      return updated;
    });
  }, [entitlement]);

  // Listen to custom entitlement update events from any module
  useEffect(() => {
    const handleEntitlementUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as any;
      if (!detail) return;
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const isSuper = isApexaSuperAdmin(prev.id);
        const isPro = isSuper || detail.is_pro;
        const plan = isSuper ? 'enterprise' : detail.plan;
        const status = isSuper ? 'active' : detail.status;
        return {
          ...prev,
          isPremium: isPro,
          subscriptionPlan: plan,
          billingStatus: status,
          billingCycle: isSuper ? 'yearly' : detail.billing_cycle,
          billingPeriodEnd: isSuper ? '2099-12-31T23:59:59Z' : detail.current_period_end,
        };
      });
    };
    window.addEventListener('apexa-entitlement-updated', handleEntitlementUpdated);
    return () => window.removeEventListener('apexa-entitlement-updated', handleEntitlementUpdated);
  }, []);

  // Navigation active tab controller
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('general');
  const [promptModalConfig, setPromptModalConfig] = useState<PromptModalConfig | null>(null);
  const isMainSidebarCollapsed = useUiStore((s) => s.isMainSidebarCollapsed);
  const setIsMainSidebarCollapsed = useUiStore((s) => s.setIsMainSidebarCollapsed);
  const isMobileSidebarOpen = useUiStore((s) => s.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useUiStore((s) => s.setIsMobileSidebarOpen);
  const accentPreset = useUiStore((s) => s.accentPreset);
  const setAccentPreset = useUiStore((s) => s.setAccentPreset);
  const userStatus = useUiStore((s) => s.userStatus);
  const presencePreference = useUiStore((s) => s.presencePreference);
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
  const themePreference = useUiStore((s) => s.themePreference);
  const setThemePreference = useUiStore((s) => s.setThemePreference);
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

    // Accent color sync across stores & CSS custom properties
    const ACCENT_MAP: Record<string, { primary: string; hover: string; light: string; ring: string }> = {
      indigo: { primary: isDarkMode ? '#3B82F6' : '#2563EB', hover: isDarkMode ? '#60A5FA' : '#1D4ED8', light: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF', ring: isDarkMode ? 'rgba(59, 130, 246, 0.35)' : 'rgba(37, 99, 235, 0.3)' },
      ocean: { primary: '#0284c7', hover: '#0369a1', light: isDarkMode ? 'rgba(14, 165, 233, 0.18)' : '#e0f2fe', ring: 'rgba(14, 165, 233, 0.35)' },
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
    const syncAuthenticatedSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session?.user) {
        updateCurrentUser(null);
        localStorage.removeItem('avaxa_session');
        return;
      }

      const { data: verifiedIdentity, error: identityError } = await supabase.auth.getUser(session.access_token);
      if (identityError || !verifiedIdentity.user || verifiedIdentity.user.id !== session.user.id) {
        updateCurrentUser(null);
        localStorage.removeItem('avaxa_session');
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        return;
      }

      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
        updateCurrentUser(null);
        localStorage.removeItem('avaxa_session');
        return;
      }

      const u = verifiedIdentity.user;
      const cachedRaw = localStorage.getItem('avaxa_session');
      let cachedUser: any = null;
      try { cachedUser = cachedRaw ? JSON.parse(cachedRaw)?.user : null; } catch {}

      const isSuper = isApexaSuperAdmin(u.id);
      const displayName = u.user_metadata?.full_name || u.user_metadata?.name || cachedUser?.name || u.email?.split('@')[0] || 'Avaxa Champion';
      const displayAvatar = u.user_metadata?.avatar_url || u.user_metadata?.avatar || cachedUser?.avatar || '';
      const userObj = {
        id: u.id,
        name: displayName,
        email: u.email || '',
        avatar: displayAvatar,
        role: isSuper ? ('admin' as const) : resolveAppRole(u),
        status: 'online' as const,
        isPremium: isSuper || Boolean(cachedUser?.isPremium),
        subscriptionPlan: isSuper ? 'enterprise' : cachedUser?.subscriptionPlan,
        billingStatus: isSuper ? 'active' : cachedUser?.billingStatus,
      };
      updateCurrentUser(userObj);
      localStorage.setItem('avaxa_session', JSON.stringify({
        user: userObj,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      }));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthenticatedSession(session);
    }).catch(err => {
      console.warn('Error verifying Supabase session at launch:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void syncAuthenticatedSession(session), 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateCurrentUser]);


  // Dynamic effects below read from useUiStore values
  useEffect(() => {
    (window as any).showPremiumModal = () => setShowPremiumModal(true);
    let audioContext: AudioContext | null = null;
    (window as any).playSystemSound = (kind: 'click' | 'toggle' | 'success' | 'delete' | 'notification' = 'click') => {
      if (!soundEnabled) return;
      try {
        audioContext ||= new AudioContext();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const tones = {
          click: [420, 0.035], toggle: [520, 0.045], success: [660, 0.09],
          delete: [190, 0.08], notification: [740, 0.12]
        } as const;
        const [frequency, duration] = tones[kind] || tones.click;
        oscillator.type = kind === 'delete' ? 'sawtooth' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        if (kind === 'success' || kind === 'notification') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.3, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.01);
      } catch {}
    };
    return () => {
      delete (window as any).playSystemSound;
      if (audioContext) void audioContext.close();
    };
  }, [setShowPremiumModal, soundEnabled]);

  useEffect(() => {
    document.documentElement.setAttribute('data-blur-intensity', blurIntensity);
  }, [blurIntensity]);

  useEffect(() => {
    if (currentUser?.id && localStorage.getItem('avaxa_pending_upgrade_cycle')) {
      setShowPremiumModal(true);
    }
  }, [currentUser?.id, setShowPremiumModal]);

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

  // Apexa Space & Lists Feature
  const spaces = useSpaceStore((s) => s.spaces);
  const setSpaces = useSpaceStore((s) => s.setSpaces);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const activeListId = useSpaceStore((s) => s.activeListId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);
  const [isSpacesExpanded, setIsSpacesExpanded] = useState<boolean>(true);
  const [showTopBreadcrumbListMenu, setShowTopBreadcrumbListMenu] = useState<boolean>(false);
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
      const savedSpaces = localStorage.getItem(`apexa_spaces_${currentUser.id}`)
        || localStorage.getItem(`avaxa_spaces_${currentUser.id}`);
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
    const currentAllSpaces = useSpaceStore.getState().spaces;
    const containsOtherWorkspaces = newSpaces.some(space => space.workspaceId !== activeWorkspaceId);
    const isFullSnapshot = !activeWorkspaceId || containsOtherWorkspaces;
    const scopedIncomingSpaces = activeWorkspaceId
      ? newSpaces.filter(space => space.workspaceId === activeWorkspaceId)
      : newSpaces;
    const allMergedSpaces = isFullSnapshot
      ? newSpaces
      : [
          ...currentAllSpaces.filter(space => space.workspaceId !== activeWorkspaceId),
          ...scopedIncomingSpaces,
        ];
    const spacesToSync = isFullSnapshot ? newSpaces : scopedIncomingSpaces;

    setSpaces(allMergedSpaces);
    if (!currentUser?.id) return;
    
    // Save to localStorage with both key prefixes for consistency
    try {
      localStorage.setItem(`apexa_spaces_${currentUser.id}`, JSON.stringify(allMergedSpaces));
      localStorage.setItem(`avaxa_spaces_${currentUser.id}`, JSON.stringify(allMergedSpaces));
    } catch (e) {}

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          const validWsIds = new Set(workspaces.map(w => w.id));

          // 1. Detect deleted spaces
          const oldSpaceIds = currentAllSpaces.map(s => s.id);
          const newSpaceIds = allMergedSpaces.map(s => s.id);
          const deletedSpaceIds = oldSpaceIds.filter(id => !newSpaceIds.includes(id));

          if (deletedSpaceIds.length > 0) {
            const { error: deleteSpacesError } = await supabase.from('spaces').delete().in('id', deletedSpaceIds);
            if (deleteSpacesError) throw deleteSpacesError;
          }

          // 2. Upsert each space and sync lists
          for (const space of spacesToSync) {
            let spaceWsId = space.workspaceId;
            if (!spaceWsId || (!validWsIds.has(spaceWsId) && validWsIds.size > 0)) {
              spaceWsId = activeWorkspaceId || workspaces[0]?.id || spaceWsId;
            }

            const currentLists = space.lists || [];
            const { error: spaceUpsertErr } = await supabase.from('spaces').upsert({
              id: space.id,
              name: space.name,
              emoji: space.emoji || null,
              theme_color: space.themeColor || null,
              workspace_id: spaceWsId,
              folders: space.folders || [],
              whiteboards: space.whiteboards || [],
              channels: space.channels || [],
              statuses: space.statuses || [],
              click_apps: {
                ...(space.clickApps || {}),
                spacePreferences: {
                  ...(space.clickApps?.spacePreferences || {}),
                  description: space.description || '',
                  isFavorite: !!space.isFavorite,
                  isHidden: !!space.isHidden,
                  isArchived: !!space.isArchived,
                  defaultPermission: space.defaultPermission || space.clickApps?.spacePreferences?.defaultPermission || 'Full edit',
                  listPreferences: Object.fromEntries(currentLists.map(list => [list.id, {
                    isFavorite: !!list.isFavorite,
                    isArchived: !!list.isArchived
                  }]))
                }
              },
              custom_fields_config: space.customFields || [],
              user_id: space.user_id || userId,
              is_private: space.isPrivate || false,
              share_settings: space.shareSettings || {}
            });

            if (spaceUpsertErr) {
              console.warn('Failed to upsert space in Supabase:', spaceUpsertErr.message || spaceUpsertErr);
              // Skip list upsert if space upsert failed to avoid FK/RLS violation
              continue;
            }

            // Sync lists for this space
            const oldSpace = currentAllSpaces.find(s => s.id === space.id);
            const oldListIds = (oldSpace?.lists || []).map(l => l.id);
            const newListIds = currentLists.map(l => l.id);

            // Delete removed lists
            const deletedListIds = oldListIds.filter(id => !newListIds.includes(id));
            if (deletedListIds.length > 0) {
              const { error: deleteListsError } = await supabase.from('lists').delete().in('id', deletedListIds);
              if (deleteListsError) throw deleteListsError;
            }

            // Upsert current lists
            if (currentLists.length > 0) {
              const listsToUpsert = currentLists.map((list, idx) => ({
                id: list.id,
                name: list.name,
                space_id: space.id,
                folder_id: list.folderId || null,
                user_id: list.user_id || space.user_id || userId,
                is_private: list.isPrivate || false,
                share_settings: list.shareSettings || {},
                is_favorite: Boolean(list.isFavorite),
                is_archived: Boolean(list.isArchived),
                position: typeof list.position === 'number' ? list.position : idx
              }));
              const { error: listUpsertErr } = await supabase.from('lists').upsert(listsToUpsert, { onConflict: 'id' });
              if (listUpsertErr) {
                console.error('Failed to upsert lists in Supabase:', listUpsertErr.message || listUpsertErr.details || listUpsertErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error syncing spaces/lists with Supabase:', err);
        triggerToast('info', 'Đã lưu trên thiết bị', 'Không thể đồng bộ thay đổi Space lên máy chủ. Apexa sẽ giữ bản cục bộ để bạn không mất dữ liệu.');
      }
    }
  };

  const handleOpenAddSpaceModal = () => {
    const currentWorkspaceSpaces = spaces.filter(s => s.workspaceId === activeWorkspaceId);
    const isPremiumUser = currentUser?.isPremium;
    if (!isPremiumUser && currentWorkspaceSpaces.length >= 5) {
      triggerToast('info', 'Giới hạn gói Free', 'Tài khoản Miễn phí chỉ tạo được tối đa 5 Spaces. Vui lòng nâng cấp gói Pro để không giới hạn!');
      setShowPremiumModal(true);
      return;
    }
    setShowAddSpaceModal(true);
  };

  const handleAddSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    // Check Free Plan limit: Max 5 spaces per workspace
    const currentWorkspaceSpaces = spaces.filter(s => !s.workspaceId || s.workspaceId === activeWorkspaceId);
    const isPremiumUser = currentUser?.isPremium;
    if (!isPremiumUser && currentWorkspaceSpaces.length >= 5) {
      triggerToast('info', 'Giới hạn gói Free', 'Tài khoản Miễn phí chỉ tạo được tối đa 5 Spaces. Vui lòng nâng cấp gói Pro để không giới hạn!');
      setShowAddSpaceModal(false);
      setShowPremiumModal(true);
      return;
    }

    const targetWsId = activeWorkspaceId || workspaces[0]?.id || 'w1';
    const newSpace: Space & { description?: string; isPrivate?: boolean; defaultPermission?: string } = {
      id: `s-${Date.now()}`,
      name: newSpaceName.trim(),
      emoji: newSpaceEmoji || '📦',
      themeColor: newSpaceColor || 'indigo',
      workspaceId: targetWsId,
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
      defaultPermission: newSpacePermission as Space['defaultPermission']
    };
    const updated = [...spaces, newSpace];
    handleSaveSpaces(updated);
    setActiveSpaceId(newSpace.id);
    if (newSpace.lists.length > 0) {
      setActiveListId(newSpace.lists[0].id);
    }
    setActiveTab('tasks');
    setNewSpaceName('');
    setNewSpaceEmoji('📦');
    setNewSpaceColor('indigo');
    setNewSpaceDescription('');
    setNewSpaceIsPrivate(false);
    setNewSpacePermission('Full edit');
    setShowAddSpaceModal(false);
    triggerToast('success', 'Space Created! 🎉', `Đã tạo space "${newSpace.name}" thành công.`);
    addSyncLog(`Created new Space: "${newSpace.name}"`);
  };

  const handleAddNewList = (spaceId: string, name: string, folderId?: string, color?: string) => {
    const currentSpaces = useSpaceStore.getState().spaces;
    const targetSpace = currentSpaces.find(s => s.id === spaceId);
    if (!targetSpace) return;

    const newList = {
      id: `l-${Date.now()}`,
      name: name.trim(),
      folderId: folderId || undefined,
      color: color || undefined,
      isFavorite: false,
      isArchived: false,
      position: (targetSpace.lists || []).length
    };

    const updated = currentSpaces.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          lists: [...(s.lists || []), newList]
        };
      }
      return s;
    });

    handleSaveSpaces(updated);
    setNewListName('');
    setShowAddListSpaceId(null);
    triggerToast('success', 'New List Created', locale === 'vi' ? `Đã tạo danh sách "${name}" thành công` : `Created list "${name}" successfully`);
    addSyncLog(`Created List "${name}" in Space`);
  };

  const handleAddFolderToSpace = (spaceId: string, name: string, color?: string) => {
    const updated = spaces.map(s => {
      if (s.id === spaceId) {
        const folders = s.folders || [];
        return {
          ...s,
          folders: [...folders, { id: `folder-${Date.now()}`, name, color }]
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
    const workspaceSpaces = spaces.filter(s => s.workspaceId === activeWorkspaceId);
    const validSpaceIdSet = new Set(workspaceSpaces.map(s => s.id));
    const defaultSpace = workspaceSpaces[0];
    const defaultListId = defaultSpace?.lists?.[0]?.id;

    return tasksList.map(t => {
      let spaceId = t.spaceId;
      let listId = t.listId;

      const taskWsId = t.workspaceId || activeWorkspaceId;
      
      if (taskWsId === activeWorkspaceId) {
        // If spaceId is missing or points to a non-existent space in this workspace
        if (!spaceId || !validSpaceIdSet.has(spaceId)) {
          const title = (t.title || '').toLowerCase();
          const marketingSpace = workspaceSpaces.find(s => s.id.includes('marketing') || s.name.toLowerCase().includes('marketing'));
          const productSpace = workspaceSpaces.find(s => s.id.includes('product') || s.name.toLowerCase().includes('product')) || defaultSpace;
          const personalSpace = workspaceSpaces.find(s => s.id.includes('personal') || s.name.toLowerCase().includes('personal'));

          if ((title.includes('seo') || title.includes('campaign') || title.includes('marketing') || title.includes('email')) && marketingSpace) {
            spaceId = marketingSpace.id;
            listId = marketingSpace.lists?.find(l => l.name.toLowerCase().includes('campaign') || l.name.toLowerCase().includes('seo'))?.id || marketingSpace.lists?.[0]?.id;
          } else if ((title.includes('personal') || title.includes('cá nhân') || title.includes('inbox')) && personalSpace) {
            spaceId = personalSpace.id;
            listId = personalSpace.lists?.[0]?.id;
          } else if (productSpace) {
            spaceId = productSpace.id;
            listId = productSpace.lists?.find(l => l.name.toLowerCase().includes('sprint') || l.name.toLowerCase().includes('roadmap'))?.id || productSpace.lists?.[0]?.id;
          }
        } else {
          // spaceId is valid, verify listId exists within this space
          const currentSpace = workspaceSpaces.find(s => s.id === spaceId);
          if (currentSpace && currentSpace.lists && currentSpace.lists.length > 0) {
            const listExists = currentSpace.lists.some(l => l.id === listId);
            if (!listId || !listExists) {
              listId = currentSpace.lists[0].id;
            }
          }
        }
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

    // Switch active space to the target workspace's first space, or create a starter space
    const targetWsSpaces = spaces.filter(s => s.workspaceId === id);
    if (targetWsSpaces.length > 0) {
      setActiveSpaceId(targetWsSpaces[0].id);
      setActiveListId(targetWsSpaces[0].lists?.[0]?.id || null);
    } else {
      const targetWsTheme = w.theme || 'indigo';
      const defaultSpace: Space = {
        id: `sp-${id}-${Date.now()}`,
        name: `${w.name} Space`,
        emoji: '🚀',
        themeColor: targetWsTheme === 'ocean' ? '#0891b2' : targetWsTheme === 'forest' ? '#047857' : targetWsTheme === 'sunset' ? '#e11d48' : '#6366f1',
        workspaceId: id,
        lists: [
          { id: `l-${id}-todo`, name: 'To Do' },
          { id: `l-${id}-inprogress`, name: 'In Progress' },
          { id: `l-${id}-completed`, name: 'Completed' }
        ],
        statuses: [
          { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
          { id: 'inprogress', label: 'In Progress', color: '#3b82f6', type: 'inprogress' },
          { id: 'review', label: 'In Review', color: '#a855f7', type: 'review' },
          { id: 'completed', label: 'Complete', color: '#22c55e', type: 'completed' }
        ],
        clickApps: { subtasks: true, priorities: true, customFields: true }
      };
      handleSaveSpaces([...spaces, defaultSpace]);
      setActiveSpaceId(defaultSpace.id);
      setActiveListId(defaultSpace.lists[0].id);
    }

    addSyncLog(`Đã chuyển sang Không gian làm việc: ${w.name}`, 'workspace');
    (window as any).playSystemSound?.('workspace');
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
        if (Date.now() < expiresAt && user) {
          if (isApexaSuperAdmin(user.id)) {
            user.isPremium = true;
            user.subscriptionPlan = 'enterprise';
            user.billingStatus = 'active';
            user.role = 'admin';
          }
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
        void setUserPresenceStatus('busy');
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
    void setUserPresenceStatus(uiStatusToPresence(previousStatus === 'focused' ? 'online' : previousStatus));
    triggerToast('info', 'Focus Ended', 'Pomodoro stopped, restoring notifications.');
    addSyncLog('Stopped Pomodoro focus session');
  };

  const handleSwitchPomodoroMode = (mode: 'work' | 'short' | 'long') => {
    setPomodoroActive(false);
    setPomodoroMode(mode);
    const d = mode === 'work' ? workDuration : (mode === 'short' ? shortBreakDuration : longBreakDuration);
    setPomodoroTime(d * 60);
    void setUserPresenceStatus(uiStatusToPresence(previousStatus === 'focused' ? 'online' : previousStatus));
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
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

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
      } else if ((e.metaKey || e.ctrlKey) && e.key === '\\' && !isInputFocused) {
        e.preventDefault();
        setIsMainSidebarCollapsed(!isMainSidebarCollapsed);
      } else if (e.key === '?' && !isInputFocused) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      } else if (!isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        const navigationTarget: Record<string, string> = { h: 'dashboard', i: 'inbox', d: 'analytics', t: 'tasks' };
        if (navigationTarget[key]) {
          e.preventDefault();
          setActiveTab(navigationTarget[key]);
          if (key === 't') {
            setActiveSpaceId(null);
            setActiveListId(null);
          }
        } else if (['l', 'b', 'c'].includes(key)) {
          e.preventDefault();
          setActiveTab('tasks');
          const view = key === 'l' ? 'list' : key === 'b' ? 'board' : 'calendar';
          window.setTimeout(() => window.dispatchEvent(new CustomEvent('apexa:set-task-view', { detail: { view } })), 0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isMainSidebarCollapsed, setIsSearchOpen, setSearchCategory, setSearchQuery, setIsMainSidebarCollapsed, setActiveTab, setActiveSpaceId, setActiveListId]);

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

  // Tasks dataset
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  // Documents Wiki dataset
  const docs = useDocStore((s) => s.docs);
  const setDocs = useDocStore((s) => s.setDocs);

  // Avaxa Base (no-code database) dataset
  const bases = useBaseStore((s) => s.bases);
  const setBases = useBaseStore((s) => s.setBases);

  // Members dataset
  const members = useMemberStore((s) => s.members);
  const setMembers = useMemberStore((s) => s.setMembers);

  // Memoized workspace item collections for strict workspace data isolation
  const currentWorkspaceTasks = useMemo(() => {
    const workspaceSpaceIds = new Set(spaces.filter(s => s.workspaceId === activeWorkspaceId).map(s => s.id));
    return tasks.filter(t => {
      if (t.workspaceId) return t.workspaceId === activeWorkspaceId;
      if (t.spaceId) return workspaceSpaceIds.has(t.spaceId);
      return false;
    });
  }, [tasks, spaces, activeWorkspaceId]);

  const currentWorkspaceDocs = useMemo(() => {
    const workspaceSpaceIds = new Set(spaces.filter(s => s.workspaceId === activeWorkspaceId).map(s => s.id));
    return docs.filter(d => {
      if (d.category === 'System') return false;
      if (d.workspaceId) return d.workspaceId === activeWorkspaceId;
      if (d.spaceId) return workspaceSpaceIds.has(d.spaceId);
      return false;
    });
  }, [docs, spaces, activeWorkspaceId]);

  const currentWorkspaceBases = useMemo(() => {
    return bases.filter(b => b.workspaceId === activeWorkspaceId);
  }, [bases, activeWorkspaceId]);

  const currentWorkspaceMembers = useMemo(() => {
    return members.filter(m => {
      if (m.id === currentUser?.id || m.email === currentUser?.email) return true;
      return m.workspaceIds?.includes(activeWorkspaceId);
    });
  }, [members, activeWorkspaceId, currentUser?.id, currentUser?.email]);

  const currentWorkspaceSpaces = useMemo(() => {
    return spaces.filter(s => s.workspaceId === activeWorkspaceId);
  }, [spaces, activeWorkspaceId]);

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

  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);

  // Global Click-outside & Escape dismissal for Header Popovers (works everywhere on screen)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showNotificationsMenu) {
        const isInsideMenu = notificationsMenuRef.current?.contains(target);
        const isInsideButton = notificationsButtonRef.current?.contains(target);
        if (!isInsideMenu && !isInsideButton) {
          setShowNotificationsMenu(false);
        }
      }
      if (showStatusMenu) {
        const isInsideMenu = statusMenuRef.current?.contains(target);
        const isInsideButton = statusButtonRef.current?.contains(target);
        if (!isInsideMenu && !isInsideButton) {
          setShowStatusMenu(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNotificationsMenu) setShowNotificationsMenu(false);
        if (showStatusMenu) setShowStatusMenu(false);
        if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
      }
    };

    if (showNotificationsMenu || showStatusMenu || isMobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showNotificationsMenu, setShowNotificationsMenu, showStatusMenu, setShowStatusMenu, isMobileSidebarOpen, setIsMobileSidebarOpen]);

  const rawSidebarOrder = useUiStore((s) => s.sidebarOrder);
  const sidebarOrder = useMemo(() => rawSidebarOrder || DEFAULT_SIDEBAR_ORDER, [rawSidebarOrder]);
  const setSidebarOrder = useUiStore((s) => s.setSidebarOrder);

  const { invitations: workspaceInvitations } = useWorkspaceInvitations(currentUser?.email, isOffline);
  const { handleSendWorkspaceInvites, handleAcceptWorkspaceInvite, handleDeclineWorkspaceInvite } = useAppActions();

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'top' | 'bottom' | null>(null);
  const [showSidebarOrderModal, setShowSidebarOrderModal] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId && draggedItemId !== id) {
      setDragOverItemId(id);
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      setDragOverSide(relativeY < rect.height / 2 ? 'top' : 'bottom');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverItemId(null);
      setDragOverSide(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverSide(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedItemId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDragOverSide(null);
      return;
    }

    const defaultOrder = DEFAULT_SIDEBAR_ORDER;
    const currentOrder = [...sidebarOrder];
    
    // Ensure all default items are present
    defaultOrder.forEach((id) => {
      if (!currentOrder.includes(id)) {
        currentOrder.push(id);
      }
    });

    const draggedIndex = currentOrder.indexOf(sourceId);
    if (draggedIndex !== -1) {
      currentOrder.splice(draggedIndex, 1);
      const adjustedTargetIndex = currentOrder.indexOf(targetId);
      if (adjustedTargetIndex !== -1) {
        const insertIndex = dragOverSide === 'top' ? adjustedTargetIndex : adjustedTargetIndex + 1;
        currentOrder.splice(insertIndex, 0, sourceId);
        setSidebarOrder(currentOrder);
        if (typeof window !== 'undefined') {
          (window as any).playSystemSound?.('toggle');
        }
        const meta = sidebarItemsMeta[sourceId as keyof typeof sidebarItemsMeta];
        triggerToast(
          'success',
          locale === 'vi' ? 'Đã đổi vị trí module' : 'Module Reordered',
          locale === 'vi' 
            ? `Đã di chuyển "${meta?.label || sourceId}" đến vị trí mới`
            : `Moved "${meta?.label || sourceId}" to new position`
        );
      }
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverSide(null);
  };

  const unreadNotificationsCount = useMemo(() => {
    const now = Date.now();
    const unreadNotifs = notificationsList.filter(
      n => (!n.workspaceId || n.workspaceId === activeWorkspaceId) && !n.read && !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= now)
    ).length;
    const unreadInvites = workspaceInvitations?.length || 0;
    return unreadNotifs + unreadInvites;
  }, [notificationsList, workspaceInvitations, activeWorkspaceId]);

  const sidebarItemsMeta = useMemo<Record<string, { label: string; icon: React.ComponentType<any>; count?: number; badge?: string; shortcut?: string; description?: string }>>(() => {
    return {
      dashboard: { 
        label: t('homeOverview') || 'Home Overview', 
        icon: PhHouse,
        description: locale === 'vi' ? 'Tổng quan dự án & tiến độ chung' : 'Workspace overview & metrics',
      },
      inbox: { 
        label: t('inbox') || 'Inbox', 
        icon: PhTray, 
        count: unreadNotificationsCount,
        description: locale === 'vi' ? 'Thông báo công việc & lời mời' : 'Notifications & updates',
      },
      tasks: { 
        label: t('space') || 'Space', 
        icon: PhSquaresFour,
        description: locale === 'vi' ? 'Không gian làm việc & danh sách việc' : 'Spaces, lists & task tracking',
      },
      calendar: { 
        label: t('calendarView') || 'Calendar', 
        icon: PhCalendar,
        description: locale === 'vi' ? 'Lịch trình, mốc thời gian & deadline' : 'Calendar & milestone deadlines',
      },
      goals: { 
        label: locale === 'vi' ? 'Mục tiêu (OKRs)' : 'Goals & OKRs', 
        icon: PhTarget, 
        badge: locale === 'vi' ? 'Mới' : 'New',
        description: locale === 'vi' ? 'Chiến lược mục tiêu & đo lường kết quả' : 'Strategic goals & measurable OKRs',
      },
      docs: { 
        label: t('docs') || 'Docs', 
        icon: PhFileText,
        description: locale === 'vi' ? 'Tài liệu kiến thức, quy trình & Wiki' : 'Collaborative documents & Wiki',
      },
      chat: { 
        label: t('chat') || 'Chat', 
        icon: PhChat,
        description: locale === 'vi' ? 'Kênh thảo luận & tin nhắn tức thời' : 'Channels & instant messaging',
      },
      team: { 
        label: locale === 'vi' ? 'Đội nhóm' : 'Team', 
        icon: PhUsers,
        description: locale === 'vi' ? 'Danh bạ thành viên & phân quyền' : 'Team directory & workspace roles',
      },
      finance: { 
        label: locale === 'vi' ? 'Tài chính & Kế toán' : 'Finance & Accounting', 
        icon: PhBank, 
        description: locale === 'vi' ? 'Thu chi, hóa đơn & báo cáo tài chính' : 'Finance invoicing & accounting',
      },
    };
  }, [locale, unreadNotificationsCount, t]);

  const orderedItems = useMemo(() => {
    const defaultOrder = DEFAULT_SIDEBAR_ORDER;
    const currentOrder = [...sidebarOrder].filter(id => id !== 'erp');
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
          count: meta.count,
          badge: meta.badge,
          shortcut: meta.shortcut,
          description: meta.description,
        };
      });
  }, [sidebarOrder, sidebarItemsMeta]);

  // Filtered lists for the Global Search modal
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return currentWorkspaceTasks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description.toLowerCase().includes(query)
    );
  }, [currentWorkspaceTasks, searchQuery]);

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return currentWorkspaceDocs.filter(d => 
      d.title.toLowerCase().includes(query) || 
      d.content.toLowerCase().includes(query)
    );
  }, [currentWorkspaceDocs, searchQuery]);

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
  const triggerToast = useCallback((
    type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message',
    title: string,
    message: string,
    options?: { taskId?: string; workspaceId?: string; persistInInbox?: boolean }
  ) => {
    // Creating an entity is already confirmed by the UI. Do not create a second
    // toast or pollute the durable Inbox with the current user's own action.
    if (isCreationConfirmation({ type, title, message })) return;

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
    if (type === 'chat_message' && !notificationSettings.enableChatMessages) return;
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

    // Inbox is reserved for events that need attention. Routine confirmations
    // remain transient toasts and never become unread work for the user.
    if (shouldPersistInInbox({ type, title, message }, options)) {
      const newNotifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setNotificationsList(prev => [
        {
          id: newNotifId,
          type,
          title,
          message,
          taskId: options?.taskId,
          workspaceId: options?.workspaceId || activeWorkspaceId,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
          read: false
        },
        ...prev
      ].slice(0, 50));
    }

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
  }, [pomodoroActive, notificationSettings, addToast, setNotificationsList, activeWorkspaceId]);

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
        const oneDayAgo = new Date();
        oneDayAgo.setDate(now.getDate() - 1);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        // Only scan tasks relevant to current user with deadlines in [today - 1 day, today + 3 days]
        const upcomingTasks = tasks.filter(t => {
          if (t.status === 'completed' || !t.dueDate) return false;
          const isMyTask = t.assigneeId === currentUser.id || t.assigneeIds?.includes(currentUser.id) || !t.assigneeId;
          if (!isMyTask) return false;
          try {
            const due = new Date(t.dueDate);
            return !isNaN(due.getTime()) && due >= oneDayAgo && due <= threeDaysFromNow;
          } catch (e) {
            return false;
          }
        });

        if (upcomingTasks.length > 0) {
          let notifiedMap: Record<string, string> = {};
          try {
            const stored = localStorage.getItem('apexa_notified_deadlines');
            if (stored) notifiedMap = JSON.parse(stored);
          } catch (e) {
            console.error('Error loading notified deadlines:', e);
          }

          let wasUpdated = false;
          const newNotifiedMap = { ...notifiedMap };

          upcomingTasks.forEach((t, index) => {
            if (notifiedMap[t.id] === t.dueDate) {
              return;
            }

            setTimeout(() => {
              triggerToast(
                'deadline',
                'Deadline Warning',
                `Task "${t.title}" is approaching its completion date (${t.dueDate}). Please check!`,
                { taskId: t.id, workspaceId: (t as any).workspaceId || activeWorkspaceId }
              );
            }, index * 1200);

            newNotifiedMap[t.id] = t.dueDate || '';
            wasUpdated = true;
          });

          if (wasUpdated) {
            try {
              localStorage.setItem('apexa_notified_deadlines', JSON.stringify(newNotifiedMap));
            } catch (e) {
              console.error('Error saving notified deadlines:', e);
            }
          }
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, tasks, triggerToast, activeWorkspaceId]);

  // Periodic standard task reminder worker
  useEffect(() => {
    checkAndFirePendingReminders();
    const interval = setInterval(() => {
      checkAndFirePendingReminders();
    }, 20_000);
    return () => clearInterval(interval);
  }, []);

  // Global Supabase Realtime subscription for chat message notifications
  // This runs independently of ChatRoom mount state so notifications work across all tabs
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    if (!currentUser || isOffline) return;

    const sub = getCleanChannel('global-chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const msg = payload.new as any;
          if (!msg) return;
          // Skip own messages and AI messages
          if (msg.sender_id === currentUser.id || msg.sender_id === 'apexa-ai') return;
          // Skip if user is already viewing chat tab (ChatRoom handles its own display)
          if (activeTabRef.current === 'chat') return;

          const senderName = msg.sender_name || 'Người dùng';
          const preview = msg.content
            ? msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content
            : msg.attachment ? '📎 Tệp đính kèm' : 'Tin nhắn mới';

          triggerToast('chat_message', `💬 ${senderName}`, preview);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentUser, isOffline, triggerToast]);

  const accountPresenceStatus = isOffline
    ? 'offline'
    : (userStatus
        ? uiStatusToPresence(userStatus)
        : (members.find((member) => member.id === 'user' || (member.email && currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase()) || (currentUser?.id && member.id === currentUser.id))?.status || 'online'));
  const accountPresenceLabel = {
    online: 'Đang hoạt động',
    busy: 'Đang tập trung',
    away: 'Tạm vắng',
    offline: 'Ngoại tuyến',
  }[accountPresenceStatus];

  // Synchronize dynamic members configuration when current user state loads or toggles
  useEffect(() => {
    if (currentUser) {
      setMembers(prev => {
        const curEmail = currentUser.email?.toLowerCase().trim();
        let list = prev;
        if (curEmail) {
          list = list.filter(m => m.id === 'user' || m.email?.toLowerCase().trim() !== curEmail);
        }
        const hasMe = list.some(m => m.id === 'user');
        if (hasMe) {
          return list.map(m => m.id === 'user' ? {
            ...m,
            name: currentUser.name || m.name,
            email: currentUser.email || m.email,
            avatar: currentUser.avatar || m.avatar,
            role: currentUser.role || m.role,
            isPremium: currentUser.isPremium ?? m.isPremium
          } : m);
        } else {
          return [{
            id: 'user',
            name: currentUser.name,
            email: currentUser.email,
            avatar: currentUser.avatar,
            role: currentUser.role,
            status: 'online',
            workspaceIds: [],
            phone: '',
            department: '',
            bio: '',
            joinedDate: '2026',
            isPremium: currentUser.isPremium
          }, ...list];
        }
      });
    }
  }, [currentUser, setMembers]);

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
  const addSyncLog = (action: string, category: 'task' | 'space' | 'workspace' | 'doc' | 'member' | 'security' | 'system' = 'workspace') => {
    const isTechnical = 
      action.includes('Supabase') ||
      action.includes('supabase') ||
      action.includes('database') ||
      action.includes('cloud server') ||
      action.includes('compatibility mode') ||
      action.includes('realtime-') ||
      action.includes('Realtime sync') ||
      action.includes('System merge') ||
      action.includes('offline changes') ||
      action.includes('offline cache') ||
      action.includes('storage synchronized') ||
      action.includes('Entered List:') ||
      action.includes('sorting order');

    if (isTechnical) return;

    const newLog: SyncLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: isOffline ? 'offline_saved' : 'synced',
      userName: currentUser?.name || 'Chủ sở hữu',
      userAvatar: currentUser?.avatar || '',
      category
    };
    setSyncLogs(prev => [
      newLog,
      ...prev.filter(l => 
        !l.action.includes('Supabase') && 
        !l.action.includes('supabase') && 
        !l.action.includes('Realtime sync') &&
        !l.action.includes('storage synchronized') &&
        !l.action.includes('cloud server') &&
        !l.action.includes('compatibility mode') &&
        !l.action.includes('Entered List:')
      )
    ].slice(0, 100));
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
                        completedAt: t.completedAt || null,
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
                        custom_fields: buildTaskCustomFields(t),
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
                        workspace_id: d.workspaceId || null,
                        space_id: d.spaceId || null,
                        folder_id: d.folderId || null
                      }));
                      
                      syncPromises.push(
                        supabase.from('docs')
                          .upsert(formattedDocs)
                          .then(async ({ error }) => {
                            if (!error) return;
                            if (error.message?.includes('space_id') || error.message?.includes('folder_id') || error.message?.includes('workspace_id')) {
                              const compatibleDocs = formattedDocs.map(doc => {
                                const compatibleDoc = { ...doc };
                                delete (compatibleDoc as Partial<typeof doc>).space_id;
                                delete (compatibleDoc as Partial<typeof doc>).folder_id;
                                if (error.message.includes('workspace_id')) {
                                  delete (compatibleDoc as Partial<typeof doc>).workspace_id;
                                }
                                return compatibleDoc;
                              });
                              const { error: retryError } = await supabase.from('docs').upsert(compatibleDocs);
                              if (retryError) console.error('Error syncing batched offline docs:', retryError);
                              return;
                            }
                            console.error('Error syncing batched offline docs:', error);
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
          click_apps: { subtasks: true, priorities: true },
          user_id: userId
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
        status: 'offline',
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
        status: 'offline',
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
        const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const myName = googleName || currentUser?.name || session.user.email?.split('@')[0] || 'Avaxa Champion';
        const myEmail = currentUser?.email || session.user.email || '';
        const googleAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || session.user.user_metadata?.avatar || '';
        const cachedAvatar = currentUser?.avatar && !currentUser.avatar.includes('api.dicebear.com') ? currentUser.avatar : '';
        const myAvatar = googleAvatar || cachedAvatar || '';
        const myRole = resolveAppRole(session.user);
        
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
            name: myDbProfile.name || myName,
            avatar: myDbProfile.avatar || myAvatar,
            status: 'offline',
            role: myDbProfile.role || myRole
          };
          
          await supabase.from('members').delete().eq('id', oldId);
          await supabase.from('members').upsert([updatedProfile], { onConflict: 'id' });
          
          myDbProfile = updatedProfile;
          finalMembers = finalMembers.filter(m => m.id !== oldId && m.id !== myMemberId);
          finalMembers.push(updatedProfile);
        }

        // Clean out any other duplicate records with the same email in finalMembers
        if (myEmail) {
          const myEmailLower = myEmail.toLowerCase().trim();
          finalMembers = finalMembers.filter(m => {
            if (m.id === myMemberId) return true;
            if (m.email && m.email.toLowerCase().trim() === myEmailLower) return false;
            return true;
          });
        }

        if (myDbProfile) {
          // Synchronize database profile details back to currentUser
          const dbAvatar = myDbProfile.avatar && !myDbProfile.avatar.includes('api.dicebear.com') ? myDbProfile.avatar : '';
          const syncedAvatar = googleAvatar || dbAvatar || myAvatar;
          const syncedName = myDbProfile.name || googleName || myName;
          const syncedRole = myDbProfile.role || myRole;
          const isSuper = isApexaSuperAdmin(userId);
          const syncedIsPremium = isSuper || Boolean(myDbProfile.is_premium);

          if (syncedAvatar && myDbProfile.avatar !== syncedAvatar) {
            void supabase.from('members').update({ avatar: syncedAvatar }).eq('id', myMemberId);
          }

          updateCurrentUser({
            id: userId,
            name: syncedName,
            email: myEmail,
            avatar: syncedAvatar,
            role: (isSuper ? 'admin' : (syncedRole || 'member')) as any,
            status: 'online',
            isPremium: syncedIsPremium,
            subscriptionPlan: isSuper ? 'enterprise' : (syncedIsPremium ? 'pro' : undefined),
            billingStatus: isSuper ? 'active' : undefined,
          });
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
            status: 'offline',
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
                click_apps: { subtasks: true, priorities: true },
                user_id: userId
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
                    click_apps: { subtasks: true, priorities: true },
                    user_id: userId
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

        // Load members list with strict deduplication
        if (finalMembers.length > 0) {
          const userEmail = (session.user.email || '').toLowerCase().trim();
          const storedWorkspaceMapRaw = localStorage.getItem(`avaxa_member_workspaces_${userEmail || 'default'}`);
          const storedWorkspaceMap = storedWorkspaceMapRaw ? JSON.parse(storedWorkspaceMapRaw) : {};

          const seenIds = new Set<string>();
          const seenEmails = new Set<string>();
          const deduplicated: User[] = [];

          for (const m of finalMembers) {
            const isMe = m.id === myMemberId || m.user_id === userId || (m.email && userEmail && m.email.toLowerCase().trim() === userEmail);
            const memberId = isMe ? 'user' : m.id;
            const memberEmail = (m.email || '').toLowerCase().trim();

            if (isMe) {
              if (seenIds.has('user')) continue;
              seenIds.add('user');
              if (memberEmail) seenEmails.add(memberEmail);
            } else {
              if (memberEmail && seenEmails.has(memberEmail)) continue;
              if (seenIds.has(memberId)) continue;
              if (memberEmail) seenEmails.add(memberEmail);
              seenIds.add(memberId);
            }

            const workspaceIds = m.workspace_ids || storedWorkspaceMap[m.id] || [];
            deduplicated.push({
              id: memberId,
              userId: m.user_id || (isMe ? userId : undefined),
              name: isMe ? (m.name || myName) : m.name,
              email: m.email,
              avatar: isMe ? (m.avatar || myAvatar) : m.avatar,
              role: isMe ? (m.role || myRole) : (m.role as any),
              // Connectivity is resolved exclusively by Realtime Presence.
              status: 'offline',
              customStatus: m.custom_status || 'online',
              statusMessage: m.status_message || '',
              statusEmoji: m.status_emoji || '',
              lastSeenAt: m.last_seen_at || m.created_at || new Date().toISOString(),
              workspaceIds,
              phone: m.phone || '',
              department: m.department || '',
              bio: m.bio || '',
              skills: isMe && Array.isArray(session.user.user_metadata?.skills) ? session.user.user_metadata.skills : [],
              joinedDate: m.joined_date || '2026',
              isPremium: isMe ? Boolean(myDbProfile?.is_premium ?? m.is_premium) : Boolean(m.is_premium)
            });
          }

          setMembers(deduplicated);
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
            relationships: extractTaskRelationships(t),
            startDate: t.startDate || undefined,
            dueDate: t.dueDate || undefined,
            subtasks: t.subtasks || [],
            progress: t.progress || 0,
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
            completedAt: t.completedAt || undefined,
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
            workspaceId: d.workspace_id || undefined,
            spaceId: d.space_id || undefined,
            folderId: d.folder_id || undefined
          })));
        } else {
          setDocs([]);
        }

        // Home only depends on the core workspace, member, task and document datasets.
        // Mark these as ready before slower optional modules continue loading in the background.
        setDataLoaded(true);

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
              const currentLocalSpaces = useSpaceStore.getState().spaces;
              const formattedSpaces = finalSpaces.map(s => {
                const remoteLists = (dbLists || []).filter(l => l.space_id === s.id).map(l => ({
                  id: l.id,
                  name: l.name,
                  folderId: l.folder_id || undefined,
                  user_id: l.user_id,
                  isPrivate: l.is_private || false,
                  shareSettings: l.share_settings || {},
                  isFavorite: Boolean(l.is_favorite || s.click_apps?.spacePreferences?.listPreferences?.[l.id]?.isFavorite),
                  isArchived: Boolean(l.is_archived || s.click_apps?.spacePreferences?.listPreferences?.[l.id]?.isArchived),
                  position: typeof l.position === 'number' ? l.position : 0
                }));

                // Preserve any local list in memory that hasn't propagated to dbLists yet
                const matchingLocalSpace = currentLocalSpaces.find(loc => loc.id === s.id);
                const localLists = matchingLocalSpace?.lists || [];
                const remoteListIdSet = new Set(remoteLists.map(l => l.id));
                const missingLocalLists = localLists.filter(l => !remoteListIdSet.has(l.id));
                const mergedLists = [...remoteLists, ...missingLocalLists];

                return {
                  id: s.id,
                  name: s.name,
                  emoji: s.emoji || '📦',
                  themeColor: s.theme_color || 'indigo',
                  workspaceId: s.workspace_id,
                  user_id: s.user_id,
                  isPrivate: s.is_private || false,
                  shareSettings: s.share_settings || {},
                  description: s.click_apps?.spacePreferences?.description || '',
                  isFavorite: !!s.is_favorite || !!s.click_apps?.spacePreferences?.isFavorite,
                  isHidden: !!s.is_hidden || !!s.click_apps?.spacePreferences?.isHidden,
                  isArchived: !!s.is_archived || !!s.click_apps?.spacePreferences?.isArchived,
                  defaultPermission: s.click_apps?.spacePreferences?.defaultPermission || 'Full edit',
                  lists: mergedLists,
                  folders: s.folders || [],
                  whiteboards: s.whiteboards || [],
                  channels: s.channels || [],
                  statuses: s.statuses || [],
                  clickApps: s.click_apps || {},
                  customFields: s.custom_fields_config || []
                };
              });
              setSpaces(formattedSpaces);
              if (!hasSeededSpaces) {
                try {
                  localStorage.setItem(`apexa_seeded_spaces_${userId}`, 'true');
                  localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true');
                } catch (e) {}
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
            const targetWsId = activeWorkspaceId || workspaces[0]?.id || 'w2';
            localSpaces = [
              {
                id: `s-${targetWsId}-personal`,
                name: 'Personal Space',
                emoji: '🧘',
                themeColor: 'indigo',
                workspaceId: targetWsId,
                lists: [
                  { id: `l-${targetWsId}-inbox`, name: 'Inbox' },
                  { id: `l-${targetWsId}-todo`, name: 'To Do' }
                ],
                clickApps: { subtasks: true, priorities: true }
              },
              {
                id: `s-${targetWsId}-product`,
                name: 'Product Space',
                emoji: '🔮',
                themeColor: 'indigo',
                workspaceId: targetWsId,
                lists: [
                  { id: `l-${targetWsId}-roadmap`, name: 'Product Roadmap' },
                  { id: `l-${targetWsId}-sprint1`, name: 'Sprint 1' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, timeTracking: true }
              },
              {
                id: `s-${targetWsId}-marketing`,
                name: 'Marketing Space',
                emoji: '📢',
                themeColor: 'rose',
                workspaceId: targetWsId,
                lists: [
                  { id: `l-${targetWsId}-campaign`, name: 'Campaign Kickoff' },
                  { id: `l-${targetWsId}-seo`, name: 'SEO Plan' },
                  { id: `l-${targetWsId}-email`, name: 'Email Launch' }
                ],
                clickApps: { subtasks: true, priorities: true, customFields: true, relationships: true }
              }
            ];
          }

          // Migrate to Supabase
          try {
            const validWorkspaceIds = new Set(workspaces.map(w => w.id));
            for (const space of localSpaces) {
              let spaceWsId = space.workspaceId;
              if (!spaceWsId || (!validWorkspaceIds.has(spaceWsId) && validWorkspaceIds.size > 0)) {
                spaceWsId = activeWorkspaceId || workspaces[0]?.id || spaceWsId;
              }
              const { error: spErr } = await supabase.from('spaces').insert({
                id: space.id,
                name: space.name,
                emoji: space.emoji || null,
                theme_color: space.themeColor || null,
                workspace_id: spaceWsId,
                folders: space.folders || [],
                whiteboards: space.whiteboards || [],
                channels: space.channels || [],
                statuses: space.statuses || [],
                click_apps: space.clickApps || {},
                user_id: userId
              });
              
              if (spErr) {
                console.warn('Skipping lists insert for seeded space due to error:', spErr.message || spErr);
                continue;
              }

              if (space.lists.length > 0) {
                const listsToInsert = space.lists.map(l => ({
                  id: l.id,
                  name: l.name,
                  space_id: space.id,
                  folder_id: l.folderId || null,
                  user_id: userId
                }));
                const { error: lsErr } = await supabase.from('lists').insert(listsToInsert);
                if (lsErr) {
                  console.error('Failed to insert lists during seed:', lsErr.message || lsErr);
                }
              }
            }
            try { localStorage.setItem(`avaxa_seeded_spaces_${userId}`, 'true'); } catch (e) {}
          } catch (e) {
            console.error('Error during seeding spaces migration:', e);
          }

          setSpaces(localSpaces);
        }

        setDataLoaded(true);

        // Set up Realtime Postgres Changes Channels
        if (active) {
          const getCleanChannel = (name: string) => {
            const existing = supabase.getChannels().find(c => c.topic === name || c.topic === `realtime:${name}`);
            if (existing) {
              void supabase.removeChannel(existing);
            }
            return supabase.channel(name);
          };

          tasksChannel = getCleanChannel('realtime-tasks')
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
                    relationships: extractTaskRelationships(t),
                    startDate: t.startDate || undefined,
                    dueDate: t.dueDate || undefined,
                    subtasks: t.subtasks || [],
                    progress: t.progress || 0,
                    createdAt: t.created_at || t.createdAt || new Date().toISOString(),
                    completedAt: t.completedAt || undefined,
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

          docsChannel = getCleanChannel('realtime-docs')
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
                    workspaceId: d.workspace_id || undefined,
                    spaceId: d.space_id || undefined,
                    folderId: d.folder_id || undefined
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

          membersChannel = getCleanChannel('realtime-members')
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
                  const isMe = m.id === `user-${userId}` || m.id === 'user' || m.user_id === userId || (m.email && session.user.email && m.email.toLowerCase().trim() === session.user.email.toLowerCase().trim());
                  const memberId = isMe ? 'user' : m.id;
                  const mappedMember: User = {
                    id: memberId,
                    userId: m.user_id || undefined,
                    name: m.name,
                    email: m.email,
                    avatar: m.avatar,
                    role: m.role as any,
                    status: 'offline',
                    customStatus: m.custom_status || 'online',
                    statusMessage: m.status_message || '',
                    statusEmoji: m.status_emoji || '',
                    lastSeenAt: m.last_seen_at || m.created_at || new Date().toISOString(),
                    workspaceIds: m.workspace_ids || [],
                    phone: m.phone || '',
                    department: m.department || '',
                    bio: m.bio || '',
                    joinedDate: m.joined_date || '2026',
                    isPremium: Boolean(m.is_premium)
                  };

                  if (isMe) {
                    updateCurrentUser({
                      ...mappedMember,
                      id: userId,
                      status: 'online'
                    });
                  }
                  setMembers(prev => {
                    const exists = prev.some(item => item.id === mappedMember.id);
                    if (exists) {
                      return prev.map(item => {
                        if (item.id !== mappedMember.id) return item;
                        const manualStatus = mappedMember.customStatus;
                        return {
                          ...mappedMember,
                          skills: item.skills || mappedMember.skills,
                          status: manualStatus === 'offline'
                            ? 'offline'
                            : manualStatus === 'busy'
                              ? 'busy'
                              : manualStatus === 'away'
                                ? 'away'
                                : item.status,
                        };
                      });
                    } else {
                      return [...prev, { ...mappedMember, status: 'offline' }];
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

          workspacesChannel = getCleanChannel('realtime-workspaces')
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

          spacesChannel = getCleanChannel('realtime-spaces')
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

          listsChannel = getCleanChannel('realtime-lists')
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

          baseAppsChannel = getCleanChannel('realtime-base-apps')
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

          invitationsChannel = getCleanChannel('realtime-workspace-invitations')
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
  }, [currentUser?.id, isOffline]);

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
            addSyncLog(`Synchronized new workspace: ${name} to Cloud`);
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
    addSyncLog(`Đã tạo Không gian làm việc mới: "${name}"`, 'workspace');
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
            addSyncLog(`Đã cập nhật Không gian làm việc "${name}"`, 'workspace');
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
            addSyncLog(`Đã xóa Không gian làm việc "${targetWS.name}"`, 'workspace');
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
    if (Array.isArray(task?.assigneeIds)) return task.assigneeIds.filter(Boolean);
    if (Array.isArray(task?.assignee_ids)) return task.assignee_ids.filter(Boolean);
    const fromCustom = task?.custom_fields?.assigneeIds;
    if (Array.isArray(fromCustom)) return fromCustom.filter(Boolean);
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
    return embedTaskRelationships(base, extractTaskRelationships(task));
  };

  const handleAddTask = async (t: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => {
    // Chỉ thông báo với người dùng khi người đó là assignee trong task
    if (isUserAssignedToTask(t, currentUser, members)) {
      triggerToast(
        'assignment',
        'Bạn được giao công việc',
        `Bạn đã được phân công thực hiện công việc: "${t.title}".`
      );
    }

    const workspaceSpaces = spaces.filter(s => s.workspaceId === (t.workspaceId || activeWorkspaceId));
    const targetSpace = (t.spaceId && workspaceSpaces.find(s => s.id === t.spaceId))
      || (activeSpaceId && workspaceSpaces.find(s => s.id === activeSpaceId))
      || workspaceSpaces[0];
    const targetSpaceId = targetSpace?.id;
    const requestedList = targetSpace?.lists?.find(list => list.id === t.listId);
    const activeList = targetSpace?.lists?.find(list => list.id === activeListId);
    const targetListId = requestedList?.id || activeList?.id || targetSpace?.lists?.[0]?.id;

    const taskId = `task-${Date.now()}`;
    const newTask: Task = {
      ...t,
      id: taskId,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      progress: (t as any).progress !== undefined ? (t as any).progress : 0,
      comments: [],
      attachments: [],
      workspaceId: t.workspaceId || activeWorkspaceId,
      spaceId: targetSpaceId,
      listId: targetListId
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
                triggerToast('info', 'Task Save Error', `${retryError.message}`);
              }
            } else {
              triggerToast('info', 'Task Save Error', `${error.message}`);
            }
          }
          addSyncLog(`Đã tạo công việc mới: "${newTask.title}"`, 'task');
        }
      } catch (err) {
        console.error('Task sync failure:', err);
      }
    } else {
      setOfflineTasksQueue(prev => ({ ...prev, [newTask.id]: newTask }));
      setOfflineDeletedTasks(prev => prev.filter(id => id !== newTask.id));
      addSyncLog(`Đã tạo công việc mới (Ngoại tuyến): "${newTask.title}"`, 'task');
    }
  };

  const handleUpdateTask = async (updated: Task) => {
    const oldTask = tasks.find(t => t.id === updated.id);
    const isNewCompletion = oldTask?.status !== 'completed' && updated.status === 'completed';

    if (isNewCompletion) {
      const incompleteBlockers = getIncompleteBlockers(updated, tasks);
      if (incompleteBlockers.length > 0) {
        triggerToast(
          'info',
          'Cannot complete task',
          `Task "${updated.title}" is blocked by ${incompleteBlockers.length} incomplete tasks.`
        );
        return;
      }
    }

    if (oldTask) {
      const wasAssigned = isUserAssignedToTask(oldTask, currentUser, members);
      const isNowAssigned = isUserAssignedToTask(updated, currentUser, members);

      // Chỉ thông báo với người dùng khi người đó được phân công trong task
      if (!wasAssigned && isNowAssigned) {
        triggerToast(
          'assignment',
          'Bạn được giao công việc',
          `Bạn đã được phân công thực hiện công việc: "${updated.title}".`
        );
      }

      if (oldTask.assigneeId !== updated.assigneeId && updated.assigneeId) {
        const targetUser = members.find(m => m.id === updated.assigneeId);
        addSyncLog(`Đã bàn giao công việc "${updated.title}" cho ${targetUser ? targetUser.name : 'thành viên khác'}`, 'task');
      }

      if (oldTask.status !== updated.status) {
        const statusTranslation: Record<string, string> = {
          todo: 'Việc cần làm',
          inprogress: 'Đang thực hiện',
          review: 'Đang kiểm tra',
          completed: 'Đã hoàn thành'
        };
        // Cập nhật trạng thái không gửi toast thông báo, chỉ lưu sync log nền
        addSyncLog(`Đã chuyển công việc "${updated.title}" sang "${statusTranslation[updated.status] || updated.status}"`, 'task');
      }
    }

    if (updated.status === 'completed' && !updated.completedAt) {
      updated = { ...updated, completedAt: new Date().toISOString() };
    }

    const finalAssigneeIds = Array.isArray(updated.assigneeIds)
      ? updated.assigneeIds
      : (updated.assigneeId ? [updated.assigneeId] : []);

    updated = {
      ...updated,
      assigneeIds: finalAssigneeIds,
      assigneeId: finalAssigneeIds[0] || undefined,
      custom_fields: {
        ...(updated.custom_fields || {}),
        assigneeIds: finalAssigneeIds
      }
    };

    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload: any = {
            title: updated.title,
            description: updated.description,
            priority: updated.priority,
            status: updated.status,
            assigneeId: updated.assigneeId || null,
            startDate: updated.startDate || null,
            dueDate: updated.dueDate || null,
            subtasks: updated.subtasks || [],
            progress: updated.progress || 0,
            completedAt: updated.completedAt || null,
            hoursEstimate: updated.hoursEstimate || null,
            hoursLogged: updated.hoursLogged || 0,
            commentsCount: updated.commentsCount || 0,
            tags: updated.tags || [],
            isPinned: updated.isPinned || false,
            comments: updated.comments || [],
            workspace_id: updated.workspaceId || null,
            space_id: updated.spaceId || null,
            list_id: updated.listId || null,
            custom_fields: buildTaskCustomFields(updated),
            recurrence: updated.recurrence || null
          };

          const { error } = await supabase.from('tasks').update(payload).eq('id', updated.id);
          
          if (error) {
            console.warn('First task update attempt failed, retrying with fallback payload:', error.message || error);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('space_id') || error.message.includes('list_id') || error.message.includes('column'))) {
              delete payload.workspace_id;
              delete payload.space_id;
              delete payload.list_id;
              const { error: retryError } = await supabase.from('tasks').update(payload).eq('id', updated.id);
              if (retryError) {
                console.error('Supabase Task Update Error:', retryError.message || JSON.stringify(retryError));
              }
            } else {
              console.error('Supabase Task Update Error:', error.message || JSON.stringify(error));
            }
          }
        }
      } catch (err) {
        console.error('Task update sync failure:', err);
      }
    } else {
      setOfflineTasksQueue(prev => ({ ...prev, [updated.id]: updated }));
      setOfflineDeletedTasks(prev => prev.filter(id => id !== updated.id));
    }

    if (isNewCompletion && updated.recurrence && updated.recurrence.frequency !== 'none') {
      const nextStartDate = updated.startDate ? getNextRecurringDate(updated.startDate, updated.recurrence) : undefined;
      const nextDueDate = getNextRecurringDate(updated.dueDate, updated.recurrence);
      await handleAddTask({
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        status: 'todo',
        assigneeId: updated.assigneeId,
        assigneeIds: updated.assigneeIds,
        startDate: nextStartDate,
        dueDate: nextDueDate,
        subtasks: (updated.subtasks || []).map(subtask => ({
          ...subtask,
          id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          completed: false,
        })),
        hoursEstimate: updated.hoursEstimate,
        hoursLogged: 0,
        tags: updated.tags,
        isPinned: false,
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        listId: updated.listId,
        attachments: [],
        custom_fields: {
          ...(updated.custom_fields || {}),
          _recurrenceSourceTaskId: updated.id,
        },
        relationships: updated.relationships,
        recurrence: updated.recurrence,
      });
      addSyncLog(`Đã tạo chu kỳ lặp lại tiếp theo cho "${updated.title}" vào ngày ${nextDueDate}`, 'task');
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
      addSyncLog(`Đã xóa công việc "${targetTask.title}"`, 'task');
    }

    setTasks(prev => prev.filter(t => t.id !== id));

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('tasks').delete().eq('id', id);
          if (error) console.error('Supabase Task Delete Error:', error.message || JSON.stringify(error));
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
              await supabase.from('docs').upsert([payload]);
            }
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
    addSyncLog(`Đã tạo tài liệu mới: "${newDocObj.title}"`, 'doc');

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
            workspace_id: activeWorkspaceId,
            space_id: newDocObj.spaceId || null,
            folder_id: newDocObj.folderId || null
          };

          const { error } = await supabase.from('docs').insert([payload]);
          
          if (error) {
            console.warn('First doc insert attempt failed, retrying without incompatible relation columns:', error.message);
            if (error.message && (error.message.includes('workspace_id') || error.message.includes('space_id') || error.message.includes('folder_id') || error.message.includes('column') || error.message.includes('relation'))) {
              if (error.message.includes('workspace_id')) delete payload.workspace_id;
              delete payload.space_id;
              delete payload.folder_id;
              const { error: retryError } = await supabase.from('docs').insert([payload]);
              if (retryError) {
                console.error('Retry doc insert failed:', retryError);
                triggerToast('info', 'Document Save Error', `${retryError.message}`);
              }
            } else {
              triggerToast('info', 'Document Save Error', `${error.message}`);
            }
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
          const payload: Record<string, unknown> = {
            title: updated.title,
            content: updated.content,
            category: updated.category,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
            isAiGenerated: updated.isAiGenerated || false,
            workspace_id: updated.workspaceId || activeWorkspaceId,
            space_id: updated.spaceId || null,
            folder_id: updated.folderId || null
          };
          const { error } = await supabase.from('docs').update(payload).eq('id', updated.id);
          if (error && (error.message?.includes('space_id') || error.message?.includes('folder_id') || error.message?.includes('workspace_id'))) {
            delete payload.space_id;
            delete payload.folder_id;
            if (error.message.includes('workspace_id')) delete payload.workspace_id;
            const { error: retryError } = await supabase.from('docs').update(payload).eq('id', updated.id);
            if (retryError) console.error('Supabase Doc Update Error:', retryError);
          } else if (error) {
            console.error('Supabase Doc Update Error:', error);
          }
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
          const { error } = await supabase.from('docs').delete().eq('id', id);
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
    const previousMember = members.find(m => m.id === updated.id);
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...updated, status: m.status } : m));

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
            phone: updated.phone || null,
            department: updated.department || null,
            bio: updated.bio || null,
            joined_date: updated.joinedDate || null,
            workspace_ids: updated.workspaceIds || null
          }).eq('id', dbId).eq('user_id', session.user.id);
          if (error) {
            console.error('Supabase Member Update Error:', error);
            throw error;
          }
        }
      } catch (err) {
        console.error('Member update sync failure:', err);
        if (previousMember) {
          setMembers(prev => prev.map(m => m.id === previousMember.id ? previousMember : m));
        }
        throw err;
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
    { id: 'dashboard', label: locale === 'vi' ? 'Tổng quan' : 'Overview', icon: LayoutDashboard, category: 'workspace' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, category: 'workspace' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, category: 'workspace' },
    { id: 'goals', label: locale === 'vi' ? 'Mục tiêu (OKRs)' : 'Goals & OKRs', icon: Target, category: 'workspace' },
    { id: 'chat', label: 'Chat Room', icon: MessageSquare, category: 'collaboration' },
    { id: 'docs', label: 'Wiki Docs', icon: Edit3, category: 'collaboration' },
    { id: 'team', label: 'Team Directory', icon: Users, category: 'collaboration' },
    { id: 'profile', label: 'User Profile', icon: UserIcon, category: 'system' },
    { id: 'settings', label: 'System Settings', icon: Settings, category: 'system' },
  ];

  if (!currentUser) {
    return <LoginScreen registrationEnabled={runtimeConfig.registration.enabled} onLoginSuccess={(user, rememberMe) => {
      const isSuper = isApexaSuperAdmin(user.id);
      const userWithId: User = {
        ...user,
        role: isSuper ? 'admin' : user.role,
        isPremium: isSuper || false,
        subscriptionPlan: isSuper ? ('enterprise' as const) : undefined,
        billingStatus: isSuper ? ('active' as const) : undefined,
      };
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

  if (runtimeConfig.maintenance.enabled && !runtimeConfig.isAdmin) {
    return (
      <main className="fixed inset-0 grid place-items-center overflow-hidden bg-[#07090e] p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,.25),_transparent_45%)]" />
        <section className="relative w-full max-w-lg rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl backdrop-blur-2xl">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
            <Settings className="h-6 w-6 animate-[spin_8s_linear_infinite]" />
          </span>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Scheduled maintenance</p>
          <h1 className="mt-2 text-2xl font-black">Apexa đang được bảo trì</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">{runtimeConfig.maintenance.message}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            {runtimeConfig.runtime.statusMessage} · v{runtimeConfig.version}
          </div>
        </section>
      </main>
    );
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
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              <span>Chào mừng bạn đến với Apexa!</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hãy thiết lập không gian làm việc cá nhân để bắt đầu.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Họ và tên</label>
              <input 
                type="text" 
                required
                placeholder="Ví dụ: Nguyễn Văn A" 
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Tên không gian làm việc</label>
              <input 
                type="text" 
                required
                placeholder="Ví dụ: Không gian của tôi" 
                value={onboardingWSName}
                onChange={(e) => setOnboardingWSName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Chọn màu chủ đề</label>
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
                      <span className="text-[8px] uppercase tracking-wider">{{ indigo: 'Tím', ocean: 'Đại dương', forest: 'Rừng xanh', sunset: 'Hoàng hôn' }[t]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={onboardingSubmitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-650 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {onboardingSubmitting ? (
                  <span>Đang tạo không gian...</span>
                ) : (
                  <>
                    <span>Mở không gian làm việc</span>
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
    <div
      className="apexa-app-shell fixed inset-0 flex h-full w-full select-none flex-col overflow-hidden font-sans text-[var(--cu-text-primary)] bg-white dark:bg-[var(--cu-bg)]"
      data-density={uiDensity}
    >
      <a href="#apexa-main-content" className="apexa-skip-link">
        {locale === 'vi' ? 'Bỏ qua đến nội dung chính' : 'Skip to main content'}
      </a>
      
      {/* Subtle ambient background */}
      <div className="liquid-blob blob-1 animate-liquid-1 pointer-events-none opacity-30" />
      <div className="liquid-blob blob-2 animate-liquid-2 pointer-events-none opacity-20" />

      {/* Apexa Top Header */}
      <header className="apexa-app-header cu-header relative z-40 flex shrink-0 items-center transition-all duration-200">
        {/* Mobile header trigger & workspace badge (< md screens) */}
        <div className="flex md:hidden items-center gap-2 pl-3 py-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label={locale === 'vi' ? 'Mở trình đơn điều hướng' : 'Open navigation menu'}
            aria-expanded={isMobileSidebarOpen}
            aria-controls="apexa-mobile-navigation"
            className="cu-touch-target inline-flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all border border-slate-200/60 dark:border-slate-800 shadow-3xs"
            title="Mở trình đơn điều hướng"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>
          
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            aria-expanded={showWorkspaceMenu}
            aria-haspopup="menu"
            className="apexa-mobile-workspace flex min-h-11 max-w-[150px] cursor-pointer select-none items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/70 px-3 py-1 shadow-3xs dark:border-slate-700/80 dark:bg-slate-800/60"
          >
            <div 
              className="w-4.5 h-4.5 rounded-md flex items-center justify-center text-white font-black text-[9px] shrink-0 overflow-hidden shadow-3xs"
              style={!currentWorkspace?.logoUrl ? {
                background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                            currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                            currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                            'linear-gradient(135deg, #2563EB, #0284C7)',
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
          </button>
        </div>

        {/* Left header switcher section (desktop) */}
        <div className={`apexa-header-sidebar hidden md:flex items-center shrink-0 transition-all duration-200 ease-in-out relative border-r border-white/[0.08] bg-[#09090b] dark:bg-[#09090b] ${
          isMainSidebarCollapsed ? 'w-[var(--cu-sidebar-collapsed)] px-2 py-2 justify-center' : 'w-[var(--cu-sidebar-width)] px-2.5 py-2 justify-between'
        }`}>
          <div className="flex items-center gap-1.5 relative flex-1 min-w-0 justify-between">
            {isMainSidebarCollapsed ? (
              <div className="flex items-center justify-center mx-auto">
                <button
                  type="button" 
                  onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[11px] shadow-sm shrink-0 select-none overflow-hidden hover:scale-105 hover:border-sky-400/60 transition-all cursor-pointer border border-white/15"
                  style={!currentWorkspace?.logoUrl ? {
                    background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #38bdf8, #0284c7)' :
                                currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #34d399, #059669)' :
                                currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #f43f5e, #be123c)' :
                                'linear-gradient(135deg, #2563eb, #0284c7)',
                  } : undefined}
                  title={`${currentWorkspace?.name || 'Apexa'} — Nhấp để đổi không gian làm việc`}
                >
                  {currentWorkspace?.logoUrl ? (
                    <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                  ) : (
                    <ApexaAiIcon className="w-4.5 h-4.5" variant="white" />
                  )}
                </button>
              </div>
            ) : (
              <>
                {/* Compact Switcher Pill Button */}
                <button
                  type="button" 
                  className="apexa-workspace-trigger group flex min-w-0 flex-1 cursor-pointer select-none items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-left shadow-2xs transition-all duration-200 hover:border-white/[0.16] hover:bg-white/[0.08] active:scale-[0.99]"
                  onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                  aria-expanded={showWorkspaceMenu}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-xs shrink-0 select-none overflow-hidden border border-white/10"
                      style={!currentWorkspace?.logoUrl ? {
                        background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #38bdf8, #0284c7)' :
                                    currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #34d399, #059669)' :
                                    currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #f43f5e, #be123c)' :
                                    'linear-gradient(135deg, #2563eb, #0284c7)',
                      } : undefined}
                    >
                      {currentWorkspace?.logoUrl ? (
                        <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                      ) : (
                        <ApexaAiIcon className="w-3.5 h-3.5" variant="white" />
                      )}
                    </div>
                    <span className="font-sans font-extrabold text-white text-[12.5px] tracking-tight truncate flex-1">
                      {currentWorkspace?.name || 'Apexa'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-white transition-transform duration-200 group-hover:translate-y-0.5 ml-1" />
                </button>

                {/* Modern Sidebar Collapse Button */}
                <button 
                  type="button"
                  onClick={() => {
                    setIsMainSidebarCollapsed(true);
                    (window as any).playSystemSound?.('click');
                  }} 
                  className="group relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-90 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                  title={locale === 'vi' ? 'Thu gọn thanh bên (Ctrl+\)' : 'Collapse sidebar (Ctrl+\)'}
                  aria-label={locale === 'vi' ? 'Thu gọn thanh bên' : 'Collapse sidebar'}
                >
                  <ChevronsLeft className="w-4 h-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 text-slate-400 group-hover:text-white" />
                </button>

              </>
            )}

            {/* Workspace Dropdown Menu */}
            <AnimatePresence>
              {showWorkspaceMenu && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setShowWorkspaceMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.18, type: "spring", stiffness: 420, damping: 28 }}
                    className={`absolute top-full mt-2.5 w-[280px] p-3.5 bg-[#09090b]/98 border border-white/15 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-[120] space-y-3 text-left origin-top-left ${isMainSidebarCollapsed ? 'left-1' : 'left-3'}`}
                  >
                    {/* Active Workspace Hero Card */}
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-900/90 border border-blue-500/35 shadow-xs group overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/15 rounded-full blur-xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/25 shrink-0 select-none overflow-hidden ring-2 ring-white/20 transition-transform duration-300 group-hover:scale-[1.03]"
                          style={!currentWorkspace?.logoUrl ? {
                            background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #38bdf8, #0284c7)' :
                                        currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #34d399, #059669)' :
                                        currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #f43f5e, #be123c)' :
                                        'linear-gradient(135deg, #2563eb, #0284c7)',
                          } : undefined}
                        >
                          {currentWorkspace?.logoUrl ? (
                            <img src={currentWorkspace.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                          ) : (
                            <ApexaAiIcon className="w-6 h-6" variant="white" />
                          )}
                        </div>

                        <div className="leading-tight min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-[14px] truncate tracking-tight">
                              {currentWorkspace?.name || 'Apexa'}
                            </span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0" title="Không gian đang hoạt động">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-sky-300 border border-blue-400/30 shadow-2xs">
                              <Sparkles className="w-2.5 h-2.5 text-sky-400 fill-sky-400/30" />
                              {currentUser?.isPremium ? 'Premium Pro' : 'Free plan'}
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
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border border-white/10 bg-white/[0.06] text-xs font-bold text-slate-100 hover:bg-white/[0.12] hover:border-white/20 hover:text-white cursor-pointer transition-all duration-150 shadow-xs group/btn"
                      >
                        <Settings className="w-3.5 h-3.5 text-sky-400 group-hover/btn:rotate-45 transition-transform" />
                        <span>Cài đặt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWorkspaceMenu(false);
                          setActiveTab('settings');
                          setActiveSettingsTab('people');
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border border-white/10 bg-white/[0.06] text-xs font-bold text-slate-100 hover:bg-white/[0.12] hover:border-white/20 hover:text-white cursor-pointer transition-all duration-150 shadow-xs group/btn"
                      >
                        <Users className="w-3.5 h-3.5 text-sky-400 group-hover/btn:scale-110 transition-transform" />
                        <span>Thành viên</span>
                      </button>
                    </div>

                    {/* Workspaces list subsection */}
                    {workspaces.filter(w => w.id !== activeWorkspaceId).length > 0 && (
                      <>
                        <div className="border-t border-white/10 my-1" />
                        <div className="space-y-1.5">
                          <div className="px-1 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <span>Không gian khác</span>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[9px] font-extrabold text-slate-200">
                              {workspaces.filter(w => w.id !== activeWorkspaceId).length}
                            </span>
                          </div>
                          <div className="max-h-[160px] overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                            {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  setShowWorkspaceMenu(false);
                                  handleWorkspaceChange(w.id);
                                }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-2xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/10 cursor-pointer transition-all duration-150 text-left group/ws"
                              >
                                <div 
                                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-[11px] shrink-0 overflow-hidden shadow-xs ring-1 ring-white/10 group-hover/ws:scale-105 transition-transform"
                                  style={!w.logoUrl ? {
                                    background: w.theme === 'ocean' ? 'linear-gradient(135deg, #33D1FF, #0891b2)' :
                                                w.theme === 'forest' ? 'linear-gradient(135deg, #10b981, #047857)' :
                                                w.theme === 'sunset' ? 'linear-gradient(135deg, #FF3366, #e11d48)' :
                                                'linear-gradient(135deg, #2563EB, #0284c7)',
                                  } : undefined}
                                >
                                  {w.logoUrl ? (
                                    <img src={w.logoUrl} className="w-full h-full object-cover" alt="WS Logo" />
                                  ) : (
                                    <span>{w.initial || w.name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="truncate flex-1 font-bold text-slate-200 group-hover/ws:text-white transition-colors">{w.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/ws:opacity-100 group-hover/ws:translate-x-0 -translate-x-1 transition-all shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t border-white/10 my-1" />

                    {/* Create workspace button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceMenu(false);
                        setShowAddWorkspaceModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border-2 border-dashed border-sky-400/40 hover:border-sky-400 bg-sky-500/10 hover:bg-sky-500/20 text-xs font-black text-sky-300 hover:text-white cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md group/create"
                    >
                      <div className="w-5 h-5 rounded-full bg-sky-400/20 border border-sky-400/30 flex items-center justify-center group-hover/create:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5 font-bold text-sky-300 group-hover/create:text-white" />
                      </div>
                      <span>Tạo không gian</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side Header section */}
        <div className="apexa-header-content flex min-w-0 flex-1 items-center justify-between px-3 py-2 sm:px-5">
          <div className="apexa-header-context flex min-w-0 items-center gap-2">
            {/* Sidebar toggle button (expand) when collapsed on desktop */}
            {isMainSidebarCollapsed && (
              <button 
                type="button"
                onClick={() => {
                  setIsMainSidebarCollapsed(false);
                  (window as any).playSystemSound?.('click');
                }} 
                className="hidden md:flex group relative h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-200/80 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-[0_0_12px_rgba(255,255,255,0.05)] mr-0.5"
                title={locale === 'vi' ? 'Mở rộng thanh bên (Ctrl+\)' : 'Expand sidebar (Ctrl+\)'}
                aria-label={locale === 'vi' ? 'Mở rộng thanh bên' : 'Expand sidebar'}
              >
                <ChevronsRight className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
              </button>
            )}

            {/* Modern Breadcrumb Navigation */}
            {(() => {
              const selectedSpace = spaces.find(space => space.id === activeSpaceId);
              const selectedList = selectedSpace?.lists?.find(list => list.id === activeListId);
              const selectedFolder = selectedList?.folderId
                ? selectedSpace?.folders?.find(folder => folder.id === selectedList.folderId)
                : undefined;

              const activeItem = sidebarItems.find(i => i.id === activeTab);

              return (
                <nav aria-label="Cấu trúc điều hướng" className="apexa-breadcrumbs flex min-w-0 items-center gap-1.5 text-xs select-none">
                  {/* Root: Workspace Item (Text-only link, elegant & no duplicate logo) */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center px-2 py-1 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] font-semibold text-[13px] transition-all max-w-36 truncate cursor-pointer group"
                    title={`Không gian làm việc: ${currentWorkspace?.name || 'Avaxa'}`}
                  >
                    <span className="truncate">{currentWorkspace?.name || 'Avaxa'}</span>
                  </button>

                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-zinc-600 stroke-[1.5]" />

                  {/* Second level & details */}
                  {(activeTab === 'tasks' || activeTab === 'my-tasks') ? (
                    selectedSpace ? (
                      <>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all group">
                          {/* Nhấn trực tiếp vào icon để đổi biểu tượng & màu sắc */}
                          <EmojiIconPicker
                            size="inline"
                            value={selectedSpace.emoji || 'Folder'}
                            onChange={(newIcon) => {
                              const updatedSpace = { ...selectedSpace, emoji: newIcon };
                              useSpaceStore.getState().updateSpace(updatedSpace);
                              if (currentUser && !(currentUser as any).isGuest) {
                                supabase
                                  .from('spaces')
                                  .update({ emoji: newIcon })
                                  .eq('id', selectedSpace.id)
                                  .then(() => {});
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => { setActiveSpaceId(selectedSpace.id); setActiveListId(null); }}
                            className="px-1 py-0.5 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-medium text-[13px] transition-colors max-w-36 truncate cursor-pointer"
                            title={`Không gian: ${selectedSpace.name}`}
                          >
                            <span className="truncate">{selectedSpace.name}</span>
                          </button>
                        </div>

                        {selectedFolder && (
                          <>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-zinc-600 stroke-[1.5]" />
                            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] font-medium text-[13px] max-w-32 truncate" title={`Thư mục: ${selectedFolder.name}`}>
                              <Folder className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                              <span className="truncate">{selectedFolder.name}</span>
                            </div>
                          </>
                        )}

                        {selectedList && (
                          <>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-zinc-600 stroke-[1.5]" />
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowTopBreadcrumbListMenu(prev => !prev)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/[0.12] text-slate-900 dark:text-zinc-100 border border-slate-200/70 dark:border-white/[0.08] font-semibold text-[13px] shadow-2xs transition-all cursor-pointer max-w-48 group"
                                title="Danh sách đang chọn - Nhấn để chuyển danh sách"
                              >
                                <ListTodo className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                                <span className="truncate">{selectedList.name}</span>
                                {selectedSpace.lists && selectedSpace.lists.length > 1 && (
                                  <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-transform shrink-0" />
                                )}
                              </button>

                              {/* Quick List Switcher Dropdown */}
                              <AnimatePresence>
                                {showTopBreadcrumbListMenu && selectedSpace.lists && selectedSpace.lists.length > 0 && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowTopBreadcrumbListMenu(false)} />
                                    <motion.div
                                      initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute left-0 top-full mt-1.5 w-56 p-1.5 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xl z-40 space-y-0.5 text-left"
                                    >
                                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        Danh sách trong {selectedSpace.name}
                                      </div>
                                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                                        {selectedSpace.lists.map(list => (
                                          <button
                                            key={list.id}
                                            type="button"
                                            onClick={() => {
                                              setActiveListId(list.id);
                                              setShowTopBreadcrumbListMenu(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                                              list.id === activeListId 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 font-semibold' 
                                                : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 truncate">
                                              <ListTodo className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                              <span className="truncate">{list.name}</span>
                                            </div>
                                            {list.id === activeListId && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />}
                                          </button>
                                        ))}
                                      </div>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="apexa-breadcrumb-current flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-white/[0.08] text-slate-900 dark:text-zinc-100 border border-slate-200/70 dark:border-white/[0.08] font-semibold text-[13px] shadow-2xs">
                        {activeTab === 'my-tasks' ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                            <span>Công việc của tôi</span>
                          </>
                        ) : (
                          <>
                            <ListTodo className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                            <span>Tất cả công việc</span>
                          </>
                        )}
                      </div>
                    )
                  ) : (
                    activeItem && (
                      <div className="apexa-breadcrumb-current flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-white/[0.08] text-slate-900 dark:text-zinc-100 border border-slate-200/70 dark:border-white/[0.08] font-semibold text-[13px] shadow-2xs">
                        {activeItem.icon && <activeItem.icon className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />}
                        <span className="capitalize">{activeItem.label}</span>
                      </div>
                    )
                  )}
                </nav>
              );
            })()}
            
            {/* Mobile search trigger */}
            <button
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 80);
              }}
              className="apexa-header-icon-button ml-1 cursor-pointer rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-slate-100/50 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden"
              title="Tìm kiếm toàn cục"
              aria-label="Tìm kiếm toàn cục"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Centered Global Search Bar trigger button for desk screens - beautified Pill */}
          <div className="apexa-search-slot relative mx-3 hidden w-60 max-w-md lg:block lg:w-72 2xl:w-80">
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 80);
              }}
              className="group flex h-8.5 w-full cursor-pointer select-none items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-3xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
              aria-label={locale === 'vi' ? 'Tìm kiếm công việc, tài liệu hoặc không gian' : 'Search tasks, docs, or spaces'}
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-colors" />
                <span className="truncate font-medium">{locale === 'vi' ? 'Tìm công việc, tài liệu...' : 'Search tasks, docs, spaces...'}</span>
              </span>
            </button>
          </div>

          <div className="apexa-header-actions flex shrink-0 items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2">
            <button
              type="button"
              onClick={() => setShowKeyboardShortcuts(true)}
              className="apexa-header-icon-button hidden h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-400 shadow-3xs transition-all hover:border-indigo-300/80 hover:bg-indigo-50 hover:text-indigo-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 xl:flex cursor-pointer"
              title={locale === 'vi' ? 'Phím tắt (?)' : 'Keyboard shortcuts (?)'}
              aria-label={locale === 'vi' ? 'Mở bảng phím tắt' : 'Open keyboard shortcuts'}
            >
              <Keyboard className="h-4 w-4" />
            </button>
            {/* Interactive Date & Display Options Pill Widget */}
            {(() => {
              const now = new Date();
              const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';
              const renderDateValue = (fmt: string, ref: Date) => {
                switch (fmt) {
                  case 'full':
                    return ref.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  case 'vi':
                    return ref.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
                  case 'numeric':
                    return ref.toISOString().split('T')[0];
                  case 'clock':
                    return `${ref.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' })} • ${currentTimeStr || ref.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  case 'short':
                  default:
                    return ref.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' });
                }
              };
              const formattedDate = renderDateValue(dateFormat, now);

              const dateFmtOptions: { id: 'short' | 'clock' | 'full' | 'vi' | 'numeric'; label: string; icon: typeof Calendar; tile: string }[] = [
                { id: 'short', label: locale === 'vi' ? 'Ngắn gọn' : 'Short', icon: Calendar, tile: 'bg-sky-50 text-sky-600 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20' },
                { id: 'clock', label: locale === 'vi' ? 'Đồng hồ Realtime' : 'Live Clock', icon: CalendarClock, tile: 'bg-emerald-50 text-emerald-600 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
                { id: 'full', label: locale === 'vi' ? 'Chi tiết' : 'Full', icon: CalendarDays, tile: 'bg-violet-50 text-violet-600 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20' },
                { id: 'vi', label: locale === 'vi' ? 'Chuẩn Việt Nam' : 'Vietnamese', icon: Languages, tile: 'bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
                { id: 'numeric', label: locale === 'vi' ? 'Số ISO' : 'ISO Numeric', icon: Hash, tile: 'bg-slate-100 text-slate-600 border-slate-200/70 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20' },
              ];

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisplayOptionsMenu(!showDisplayOptionsMenu);
                      (window as any).playSystemSound?.('click');
                    }}
                    aria-expanded={showDisplayOptionsMenu}
                    aria-haspopup="dialog"
                    className={`apexa-header-date-button h-8.5 text-[11.5px] font-bold tabular-nums font-sans hidden xl:inline-flex items-center gap-1.5 px-3 rounded-xl border select-none transition-all cursor-pointer group active:scale-95 shadow-3xs ${
                      showDisplayOptionsMenu
                        ? 'bg-blue-50 dark:bg-zinc-800 border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-sky-300 ring-2 ring-blue-500/15'
                        : 'bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
                    }`}
                    title={locale === 'vi' ? 'Tùy chọn hiển thị & Giao diện' : 'Display Options & Appearance'}
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0 group-hover:rotate-12 transition-transform" />
                    {dateFormat === 'clock' && (
                      <span className="relative flex h-1.5 w-1.5 shrink-0" title={locale === 'vi' ? 'Đang cập nhật realtime' : 'Updating live'}>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    <span>{formattedDate}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-zinc-300 ${showDisplayOptionsMenu ? 'rotate-180 text-blue-500 group-hover:text-blue-600 dark:text-sky-300' : ''}`} />
                  </button>

                  {/* Display Options & Appearance Popover Menu */}
                  <AnimatePresence>
                    {showDisplayOptionsMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 bg-slate-900/10 dark:bg-black/30 backdrop-blur-[1px] transition-opacity" 
                          onClick={() => setShowDisplayOptionsMenu(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 6 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute right-0 top-full mt-2 w-[min(94vw,375px)] max-h-[min(88vh,640px)] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-[#0c101a]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.09] rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22),0_4px_16px_rgba(15,23,42,0.06)] dark:shadow-[0_28px_65px_-12px_rgba(0,0,0,0.85)] p-3.5 sm:p-4 z-50 text-left font-sans space-y-3 select-none"
                        >
                          {/* Ambient Accent Glow tailored to current preset */}
                          <div 
                            className="absolute -top-16 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25 dark:opacity-30 transition-all duration-500"
                            style={{
                              backgroundColor: accentPreset === 'ocean' ? '#0284c7' : accentPreset === 'forest' ? '#10b981' : accentPreset === 'sunset' ? '#f43f5e' : '#3b82f6'
                            }}
                          />

                          {/* Popover Header */}
                          <div className="relative flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/15 to-sky-500/15 dark:from-indigo-500/25 dark:to-sky-500/25 border border-indigo-500/20 text-indigo-600 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-2xs">
                                <Sliders className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                  {locale === 'vi' ? 'Hiển thị & Giao diện' : 'Display & Appearance'}
                                </h4>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium leading-tight mt-0.5 truncate">
                                  {locale === 'vi' ? 'Tùy chỉnh ngày giờ, mật độ & màu sắc' : 'Date format, UI density & accents'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Live Ticking Seconds Pill */}
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold tabular-nums">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                <span>{currentTimeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowDisplayOptionsMenu(false)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                                title={locale === 'vi' ? 'Đóng' : 'Close'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 1. Date & Time Format */}
                          <div className="relative space-y-1.5">
                            <div className="flex items-center justify-between px-0.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-indigo-500" />
                                <span>{locale === 'vi' ? 'Định dạng ngày & giờ' : 'Date & Time Format'}</span>
                              </label>
                              <span className="text-[9.5px] font-mono font-bold text-indigo-600 dark:text-sky-300 px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/50 dark:border-indigo-500/25">
                                {dateFmtOptions.find(f => f.id === dateFormat)?.label}
                              </span>
                            </div>

                            <div className="p-1 bg-slate-50/90 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.06] space-y-0.5">
                              {dateFmtOptions.map((fmt) => {
                                const isSelected = dateFormat === fmt.id;
                                const Icon = fmt.icon;
                                return (
                                  <button
                                    key={fmt.id}
                                    type="button"
                                    onClick={() => {
                                      setDateFormat(fmt.id);
                                      (window as any).playSystemSound?.('toggle');
                                    }}
                                    className={`group relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white dark:bg-white/[0.09] text-indigo-600 dark:text-sky-300 border border-indigo-500/30 dark:border-sky-400/30 shadow-2xs'
                                        : 'text-slate-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/[0.04] border border-transparent'
                                    }`}
                                  >
                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform ${fmt.tile} ${isSelected ? 'scale-105 shadow-2xs' : 'opacity-80 group-hover:opacity-100'}`}>
                                      <Icon className="w-3 h-3" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className={`block text-[11px] leading-tight truncate ${isSelected ? 'font-black text-indigo-600 dark:text-sky-300' : 'font-bold text-slate-800 dark:text-zinc-200'}`}>
                                        {fmt.label}
                                      </span>
                                      <span className={`block font-mono text-[9px] leading-tight truncate tabular-nums mt-0.5 ${isSelected ? 'text-indigo-500/90 dark:text-sky-300/80 font-semibold' : 'text-slate-400 dark:text-zinc-400'}`}>
                                        {renderDateValue(fmt.id, now)}
                                      </span>
                                    </span>
                                    <span className="w-4 h-4 flex items-center justify-center shrink-0">
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-300 stroke-[3]" />
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Interface Density */}
                          <div className="relative space-y-1.5">
                            <div className="flex items-center justify-between px-0.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <UnfoldVertical className="w-3 h-3 text-indigo-500" />
                                <span>{locale === 'vi' ? 'Mật độ hiển thị' : 'Interface Density'}</span>
                              </label>
                              <span className="text-[9.5px] font-bold text-slate-400 dark:text-zinc-400">
                                {uiDensity === 'comfortable' ? (locale === 'vi' ? 'Thoáng đãng' : 'Comfortable') : (locale === 'vi' ? 'Tối giản' : 'Compact')}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50/90 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                              {([
                                {
                                  id: 'comfortable',
                                  label: locale === 'vi' ? 'Vừa vặn' : 'Comfortable',
                                  desc: locale === 'vi' ? 'Thoáng mắt, dễ đọc' : 'Roomy & relaxed',
                                  icon: UnfoldVertical,
                                },
                                {
                                  id: 'compact',
                                  label: locale === 'vi' ? 'Tối giản' : 'Compact',
                                  desc: locale === 'vi' ? 'Nhiều dữ liệu hơn' : 'High data density',
                                  icon: FoldVertical,
                                },
                              ] as const).map((d) => {
                                const isSelected = uiDensity === d.id;
                                const Icon = d.icon;
                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      setUiDensity(d.id);
                                      (window as any).playSystemSound?.('toggle');
                                    }}
                                    className={`group relative p-2 rounded-lg text-left transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white dark:bg-white/[0.09] text-indigo-600 dark:text-sky-300 border border-indigo-500/30 dark:border-sky-400/30 shadow-xs'
                                        : 'text-slate-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-white/[0.04] border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500/15 text-indigo-600 dark:text-sky-300' : 'bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-zinc-400'}`}>
                                        <Icon className="w-3 h-3" />
                                      </span>
                                      {/* Visual density indicator bars */}
                                      <div className="flex flex-col gap-0.5 w-4 items-end">
                                        <span className={`h-0.5 rounded-full ${isSelected ? 'bg-indigo-500 dark:bg-sky-400' : 'bg-slate-300 dark:bg-zinc-600'}`} style={{ width: '100%' }} />
                                        <span className={`h-0.5 rounded-full ${isSelected ? 'bg-indigo-400 dark:bg-sky-300' : 'bg-slate-300 dark:bg-zinc-600'}`} style={{ width: d.id === 'comfortable' ? '65%' : '85%' }} />
                                        <span className={`h-0.5 rounded-full ${isSelected ? 'bg-indigo-300 dark:bg-sky-200' : 'bg-slate-300 dark:bg-zinc-600'}`} style={{ width: d.id === 'comfortable' ? '45%' : '70%' }} />
                                      </div>
                                    </div>
                                    <span className={`block text-[11px] leading-tight truncate ${isSelected ? 'font-black' : 'font-bold'}`}>
                                      {d.label}
                                    </span>
                                    <span className="block text-[9px] text-slate-400 dark:text-zinc-400 font-medium leading-tight mt-0.5 truncate">
                                      {d.desc}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3. Accent Color Swatches */}
                          <div className="relative space-y-1.5">
                            <div className="flex items-center justify-between px-0.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Palette className="w-3 h-3 text-indigo-500" />
                                <span>{locale === 'vi' ? 'Màu chủ đạo' : 'Accent Color'}</span>
                              </label>
                              <span className="text-[9.5px] font-bold text-slate-400 dark:text-zinc-400 capitalize">
                                {accentPreset}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-50/90 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                              {([
                                { id: 'indigo', name: 'Indigo', bg: 'bg-[#2563eb]' },
                                { id: 'ocean', name: 'Ocean', bg: 'bg-[#0284c7]' },
                                { id: 'forest', name: 'Forest', bg: 'bg-[#10b981]' },
                                { id: 'sunset', name: 'Sunset', bg: 'bg-[#f43f5e]' },
                              ] as const).map((color) => {
                                const isSelected = accentPreset === color.id;
                                return (
                                  <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => {
                                      setAccentPreset(color.id);
                                      (window as any).playSystemSound?.('click');
                                    }}
                                    className={`group relative flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white dark:bg-white/[0.09] shadow-2xs border border-slate-200/80 dark:border-white/15'
                                        : 'hover:bg-white/60 dark:hover:bg-white/[0.04] border border-transparent'
                                    }`}
                                    title={color.name}
                                  >
                                    <span className={`relative w-4 h-4 rounded-full ${color.bg} shadow-xs flex items-center justify-center transition-transform ${isSelected ? 'scale-110 ring-2 ring-indigo-500/30 dark:ring-white/40' : 'group-hover:scale-105'}`}>
                                      {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                    </span>
                                    <span className={`text-[9.5px] leading-none ${isSelected ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-500 dark:text-zinc-400'}`}>
                                      {color.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 4. Theme Mode 3-Way Selector */}
                          <div className="relative space-y-1.5">
                            <div className="flex items-center justify-between px-0.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Sun className="w-3 h-3 text-amber-500" />
                                <span>{locale === 'vi' ? 'Chế độ giao diện' : 'Theme Mode'}</span>
                              </label>
                              <span className="text-[9.5px] font-bold text-slate-400 dark:text-zinc-400">
                                {themePreference === 'dark'
                                  ? (locale === 'vi' ? 'Chế độ tối' : 'Dark Mode')
                                  : themePreference === 'light'
                                  ? (locale === 'vi' ? 'Chế độ sáng' : 'Light Mode')
                                  : (locale === 'vi' ? 'Theo hệ thống' : 'System Auto')}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50/90 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                              {([
                                { id: 'light', label: locale === 'vi' ? 'Sáng' : 'Light', icon: Sun, color: 'text-amber-500' },
                                { id: 'dark', label: locale === 'vi' ? 'Tối' : 'Dark', icon: Moon, color: 'text-indigo-500 dark:text-indigo-400' },
                                { id: 'system', label: locale === 'vi' ? 'Tự động' : 'System', icon: Monitor, color: 'text-sky-500' },
                              ] as const).map((th) => {
                                const isSelected = themePreference === th.id;
                                const Icon = th.icon;
                                return (
                                  <button
                                    key={th.id}
                                    type="button"
                                    onClick={() => {
                                      setThemePreference(th.id);
                                      (window as any).playSystemSound?.('toggle');
                                    }}
                                    className={`group relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white dark:bg-white/[0.09] text-slate-900 dark:text-white font-black shadow-2xs border border-slate-200/70 dark:border-white/10'
                                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04] font-bold'
                                    }`}
                                  >
                                    <Icon className={`w-3.5 h-3.5 ${isSelected ? th.color : 'text-slate-400 dark:text-zinc-400 group-hover:' + th.color}`} />
                                    <span className="text-[10.5px]">{th.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 5. Footer */}
                          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between px-0.5 text-[9.5px] text-slate-400 dark:text-zinc-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>{locale === 'vi' ? 'Đã đồng bộ tùy chọn' : 'Preferences saved'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setDateFormat('short');
                                setUiDensity('comfortable');
                                setAccentPreset('indigo');
                                setThemePreference('system');
                                (window as any).playSystemSound?.('delete');
                              }}
                              className="hover:text-slate-700 dark:hover:text-zinc-300 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{locale === 'vi' ? 'Khôi phục' : 'Reset'}</span>
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
            {!currentUser.isPremium && !isApexaSuperAdmin(currentUser.id) && (
              <motion.button
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPremiumModal(true)}
                className="apexa-premium-button relative hidden h-8.5 cursor-pointer items-center gap-1.5 overflow-hidden rounded-xl px-3 text-[11px] font-bold text-white shadow-xs transition-all 2xl:flex bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
                <span className="tracking-tight">{locale === 'vi' ? 'Nâng cấp PRO' : 'Upgrade PRO'}</span>
              </motion.button>
            )}

            <div className="hidden xl:block h-4 w-px bg-slate-200/80 dark:bg-white/10 mx-0.5" />

            {/* Language Selector Dropdown */}
            <LanguageDropdown size="md" className="apexa-header-language" />

            {/* Quick 1-Click Dark Mode Toggle Switch */}
            <ThemeSwitch size="sm" className="apexa-header-theme" />

            {/* 🔔 Notification Center Dropdown & Badge Manager */}
            <div className="apexa-header-notifications relative">
              <button 
                ref={notificationsButtonRef}
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className={`apexa-header-icon-button h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-3xs ${
                  showNotificationsMenu
                    ? 'bg-blue-50 dark:bg-zinc-800 border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-sky-300 ring-2 ring-blue-500/15'
                    : 'bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
                }`}
                title="Cài đặt thông báo"
                aria-label="Mở trung tâm thông báo"
                aria-expanded={showNotificationsMenu}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 bg-rose-500 border-2 border-white dark:border-[#09090b] rounded-full text-[8.5px] font-black text-white items-center justify-center shadow-xs">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationsMenu && (
                  <motion.div
                    ref={notificationsMenuRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-[min(95vw,24rem)] bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl z-[90] overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 font-sans"
                  >
                    {/* Header */}
                    <div className="p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Thông báo ({notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length + (workspaceInvitations?.length || 0)})
                        </span>
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
                            Đánh dấu đã đọc
                          </button>
                          <button
                            onClick={() => {
                              const activeIds = notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).map(n => n.id);
                              setNotificationsList(prev => prev.map(n => activeIds.includes(n.id) ? { ...n, cleared: true } : n));
                              (window as any).playSystemSound?.('delete');
                            }}
                            className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-0.5 hover:underline"
                          >
                            Xóa tất cả
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notifications List scrollable */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                      {/* Pending workspace invitations in dropdown */}
                      {workspaceInvitations && workspaceInvitations.length > 0 && (
                        workspaceInvitations.map(inv => (
                          <div 
                            key={inv.id} 
                            onClick={() => {
                              setActiveTab('inbox');
                              setShowNotificationsMenu(false);
                            }}
                            className="p-3 bg-blue-50/70 dark:bg-blue-950/40 flex gap-2.5 items-start cursor-pointer hover:bg-blue-100/70 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <div className="p-1.5 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-sky-300 mt-0.5 shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-black text-slate-900 dark:text-white block truncate">
                                Lời mời: {inv.workspaceName || 'Không gian mới'}
                              </span>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                                {inv.invitedByName || 'Quản trị viên'} mời bạn tham gia với vai trò <span className="font-bold uppercase text-blue-600 dark:text-sky-300">{inv.role}</span>.
                              </p>
                            </div>
                          </div>
                        ))
                      )}

                      {notificationsList.filter(n => !n.cleared && (!n.snoozedUntil || n.snoozedUntil <= Date.now())).length === 0 && (!workspaceInvitations || workspaceInvitations.length === 0) ? (
                        <div className="py-10 px-4 text-center space-y-2">
                          <span className="text-xl inline-block">🎉</span>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Hộp thư trống!</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Bạn không có thông báo mới.</p>
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
                                  notif.type === 'comment' || notif.type === 'message' || notif.type === 'chat_message' ? 'bg-sky-50 border-sky-100/50 text-sky-600 dark:bg-sky-955/40 dark:border-sky-900/30' :
                                  'bg-emerald-50 border-emerald-100/50 text-emerald-600 dark:bg-emerald-955/40 dark:border-emerald-900/30'
                                }`}>
                                  {notif.type === 'assignment' && <Briefcase className="w-3.5 h-3.5" />}
                                  {notif.type === 'deadline' && <Timer className="w-3.5 h-3.5" />}
                                  {(notif.type === 'comment' || notif.type === 'message' || notif.type === 'chat_message') && <MessageSquare className="w-3.5 h-3.5" />}
                                  {notif.type !== 'assignment' && notif.type !== 'deadline' && notif.type !== 'comment' && notif.type !== 'message' && notif.type !== 'chat_message' && <Sparkles className="w-3.5 h-3.5" />}
                                </div>
                              </div>

                              {/* Body */}
                              <div className="space-y-0.5 flex-1 pr-6 cursor-pointer" onClick={() => {
                                // mark as read and open inbox
                                setNotificationsList(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                setActiveTab('inbox');
                                setShowNotificationsMenu(false);
                              }}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[11px] block truncate ${isUnread ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>
                                    {notif.title}
                                  </span>
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono shrink-0">{notif.timestamp}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed break-words line-clamp-2">
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
                                  title="Xóa thông báo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Footer link to settings & inbox */}
                    <div className="p-2.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 px-3">
                      <button
                        onClick={() => {
                          setActiveTab('inbox');
                          setShowNotificationsMenu(false);
                        }}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 dark:text-sky-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        📥 Mở Hộp thư Apexa
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setShowNotificationsMenu(false);
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        ⚙️ Cài đặt
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:block h-4 w-px bg-slate-200/80 dark:bg-white/10 mx-0.5" />

            {/* Interactive Connected User Badge and Status Switcher */}
            <div className="relative font-sans text-left">
              <button
                type="button"
                ref={statusButtonRef}
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                aria-expanded={showStatusMenu}
                aria-label={`Tài khoản ${currentUser.name} — ${accountPresenceLabel}`}
                className={`apexa-profile-trigger cursor-pointer shrink-0 flex items-center gap-2 h-8.5 px-2 bg-white/70 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] border rounded-xl transition-all select-none shadow-3xs ${
                  showStatusMenu
                    ? 'border-blue-500/50 dark:border-blue-400/50 ring-2 ring-blue-500/15'
                    : (currentUser.isPremium || isApexaSuperAdmin(currentUser.id))
                      ? 'border-amber-500/40 hover:border-amber-500/60' 
                      : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15'
                }`}
              >
                <div className="relative shrink-0 flex items-center">
                  <SignedImage filePath={currentUser.avatar} className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 object-cover border border-slate-200/60 dark:border-white/10 shadow-3xs transition-all relative z-10" alt={currentUser.name} />
                  {/* Status indicator absolute dot on avatar */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-[#09090b] z-20 ${
                    presenceDotClass(accountPresenceStatus, true)
                  }`} title={accountPresenceLabel} />
                </div>
                
                <div className="text-left hidden sm:flex items-center gap-1.5 select-none justify-center pr-0.5 relative z-10">
                  <span className="font-bold text-[12px] text-slate-800 dark:text-zinc-100 leading-none truncate max-w-[85px] tracking-tight">
                    {currentUser.name}
                  </span>
                  {(currentUser.isPremium || isApexaSuperAdmin(currentUser.id)) ? (
                    <span className="text-[7.5px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-md leading-none shadow-xs uppercase">PRO</span>
                  ) : (
                    <span className="text-[7.5px] font-black tracking-widest bg-slate-200/80 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-1 py-0.5 rounded-md leading-none uppercase font-mono">FREE</span>
                  )}
                </div>

                <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-transform duration-200 shrink-0 relative z-10 ${showStatusMenu ? 'rotate-180 text-blue-500 dark:text-sky-400' : ''}`} />
              </button>
              
              {/* Dropdown status content menu */}
              <AnimatePresence>
                {showStatusMenu && (
                  <motion.div
                    ref={statusMenuRef}
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-[min(92vw,250px)] p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/50 z-[100] text-left origin-top-right font-sans"
                  >
                    {/* User Info Header with Role */}
                    <div className="p-2.5 mb-1 bg-slate-50/90 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {currentUser.name}
                        </span>
                        <span className="shrink-0 text-[8.5px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 px-1.5 py-0.5 rounded-md">
                          {currentUser.role === 'admin' ? (locale === 'vi' ? 'Quản trị' : 'Admin') : (locale === 'vi' ? 'Kỹ sư thiết kế' : 'Designer')}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                        {currentUser.email}
                      </p>
                    </div>

                    {/* Quick Access Menu Items */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setShowStatusMenu(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{locale === 'vi' ? 'Hồ sơ cá nhân' : 'Profile'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setShowStatusMenu(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{locale === 'vi' ? 'Cài đặt hệ thống' : 'Settings'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPremiumModal(true);
                          setShowStatusMenu(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:rotate-12 transition-transform" />
                          <span className="truncate">{(currentUser.isPremium || isApexaSuperAdmin(currentUser.id)) ? (locale === 'vi' ? 'Đã kích hoạt Pro' : 'Pro Active') : (locale === 'vi' ? 'Nâng cấp Premium Pro' : 'Upgrade Pro')}</span>
                        </div>
                        {!currentUser.isPremium && !isApexaSuperAdmin(currentUser.id) && (
                          <span className="text-[8.5px] font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.2 rounded-md shadow-xs">PRO</span>
                        )}
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                      <button
                        type="button"
                        onClick={async () => {
                          setShowStatusMenu(false);
                          addSyncLog('Signed out of account');
                          (window as any).playSystemSound?.('delete');
                          try {
                            await disconnectUserPresence();
                            await supabase.auth.signOut();
                          } catch (e) {}
                          updateCurrentUser(null);
                          localStorage.removeItem('avaxa_session');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{locale === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[120] md:hidden" role="presentation">
            <motion.button
              type="button"
              aria-label="Đóng trình đơn điều hướng"
              className="absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.aside
              id="apexa-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Điều hướng chính"
              className="apexa-mobile-drawer cu-sidebar absolute inset-y-0 left-0 flex w-[min(86vw,336px)] flex-col overflow-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/10 px-1 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setActiveSpaceId(null);
                    setActiveListId(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex min-w-0 items-center gap-3 rounded-2xl text-left"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] text-sm font-black text-white shadow-lg ring-1 ring-white/15"
                    style={!currentWorkspace?.logoUrl ? {
                      background: currentWorkspace?.theme === 'ocean' ? 'linear-gradient(135deg, #38bdf8, #0369a1)' :
                                  currentWorkspace?.theme === 'forest' ? 'linear-gradient(135deg, #34d399, #047857)' :
                                  currentWorkspace?.theme === 'sunset' ? 'linear-gradient(135deg, #fb7185, #be123c)' :
                                  'linear-gradient(135deg, #6366f1, #2563eb)',
                    } : undefined}
                  >
                    {currentWorkspace?.logoUrl ? (
                      <img src={currentWorkspace.logoUrl} className="h-full w-full object-cover" alt="" />
                    ) : (
                      currentWorkspace?.initial || 'A'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-white">{currentWorkspace?.name || 'Apexa'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Apexa workspace</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Đóng trình đơn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Các khu vực trong ứng dụng">
                {orderedItems.map((item) => {
                  const isActive = item.id === 'tasks'
                    ? (activeTab === 'tasks' && activeSpaceId === null && activeListId === null)
                    : activeTab === item.id;
                  return (
                    <NavItem
                      key={`mobile-${item.id}`}
                      icon={item.icon}
                      label={item.label}
                      shortLabel={getShortLabel(item.label)}
                      isActive={isActive}
                      count={item.count}
                      badge={item.badge}
                      onClick={() => {
                        setActiveTab(item.id);
                        setActiveSpaceId(null);
                        setActiveListId(null);
                        setIsMobileSidebarOpen(false);
                        addSyncLog(`Switched to: ${item.label}`);
                      }}
                    />
                  );
                })}
              </nav>

              <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <SignedImage
                  filePath={currentUser.avatar}
                  className="h-10 w-10 rounded-[13px] border border-white/15 bg-slate-800 object-cover"
                  alt={currentUser.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-white">{currentUser.name}</p>
                  <p className="truncate text-[10px] font-semibold text-zinc-500">{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Mở cài đặt"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Below Header row wrapper container */}
      <div className="apexa-workspace-frame relative flex min-h-0 flex-1 flex-row overflow-hidden">

      {/* Modern Black Aesthetic Sidebar Navigation */}
      <aside className={`apexa-desktop-sidebar cu-sidebar relative z-20 hidden shrink-0 cursor-default flex-col justify-between transition-all duration-200 ease-in-out md:flex ${
        isMainSidebarCollapsed 
          ? 'w-[var(--cu-sidebar-collapsed)] px-2 py-3' 
          : 'w-[var(--cu-sidebar-width)] px-2.5 py-3'
      }`}>
        
        <div className="h-full flex flex-col justify-between overflow-hidden gap-2">
          {/* Super Admin Control Center (Only for Super Admin) */}
          {isApexaSuperAdmin(currentUser?.id) && (
            <div className="shrink-0 space-y-1">
              <a
                href="/admin"
                className={`group flex items-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-200 transition-all hover:border-sky-400/50 hover:bg-sky-500/20 hover:text-white ${
                  isMainSidebarCollapsed ? 'h-9 w-9 mx-auto justify-center p-0' : 'h-[38px] gap-2.5 px-2.5 py-1.5 w-full'
                }`}
                title="Apexa Control Center (Admin)"
              >
                <div className="relative flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 transition-all">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#09090b] animate-pulse" />
                </div>
                {!isMainSidebarCollapsed && (
                  <div className="flex min-w-0 flex-1 items-center justify-between">
                    <span className="truncate text-[13px] font-semibold text-white">Control Center</span>
                    <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase text-sky-300 bg-sky-500/20 border border-sky-400/30">Admin</span>
                  </div>
                )}
              </a>
            </div>
          )}

          {/* Scrollable Navigation List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5 pr-0.5">
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
                  shortcut={item.shortcut}
                  description={item.description}
                  isActive={isActive}
                  count={item.count}
                  badge={item.badge}
                  collapsed={isMainSidebarCollapsed}
                  isDragging={draggedItemId === item.id}
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
                      className={`absolute left-1 right-1 h-1 z-30 pointer-events-none rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.9)] transition-all ${
                        dragOverSide === 'top' 
                          ? '-top-0.5' 
                          : '-bottom-0.5'
                      }`}
                    >
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-300 ring-2 ring-blue-500 shadow-[0_0_8px_rgba(56,189,248,1)]" />
                    </div>
                  ) : undefined}
                />
              );
            })}
          </div>



        </div>
      </aside>

      {/* Main workspace layout wrapper */}
      <div className="apexa-content-shell relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-transparent">
        

        {(() => {
          const isSpaceTab = activeTab === 'tasks' || activeTab === 'my-tasks' || activeTab === 'goals' || activeTab === 'chat' || activeTab === 'docs' || activeTab === 'inbox' || activeTab === 'calendar' || activeTab === 'settings' || activeTab === 'finance';
          
          return (
            <main id="apexa-main-content" tabIndex={-1} className="apexa-main-canvas cu-content-area relative h-full w-full flex-1 overflow-hidden bg-white dark:bg-transparent">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  id={`workspace_container_${activeTab}`}
                  className={`apexa-route-canvas h-full w-full transform-gpu will-change-transform ${
                    isSpaceTab 
                      ? 'overflow-hidden' 
                      : activeTab === 'dashboard'
                        ? 'apexa-route-scroll overflow-y-auto custom-scrollbar'
                        : 'apexa-route-scroll overflow-y-auto p-2.5 pb-12 sm:p-3 md:p-4 lg:p-6 custom-scrollbar'
                  }`}
                >
                  {activeTab === 'dashboard' && (
                    <DashboardOverview
                      tasks={currentWorkspaceTasks}
                      members={currentWorkspaceMembers}
                      docs={currentWorkspaceDocs}
                      isLoading={!dataLoaded && workspaces.length === 0}
                      isSynced={dataLoaded}
                      workspaceName={currentWorkspace?.name}
                      syncLogs={syncLogs}
                      isOffline={isOffline}
                      onNavigate={setActiveTab}
                      onOpenTask={(taskId) => {
                        const task = currentWorkspaceTasks.find((item) => item.id === taskId);
                        setActiveTab('tasks');
                        if (task?.spaceId) setActiveSpaceId(task.spaceId);
                        if (task?.listId) setActiveListId(task.listId);
                        setInitialSelectedTaskId(taskId);
                      }}
                      onToggleOffline={handleToggleOffline}
                      currentUser={currentUser ? {
                        ...currentUser,
                        isPremium: currentUser.isPremium || isApexaSuperAdmin(currentUser.id),
                      } : null}
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
                      notificationsList={notificationsList.filter(n => !n.workspaceId || n.workspaceId === activeWorkspaceId)}
                      setNotificationsList={setNotificationsList}
                      tasks={currentWorkspaceTasks}
                      members={currentWorkspaceMembers}
                      workspaces={workspaces}
                      activeWorkspaceId={activeWorkspaceId}
                      onAddTask={handleAddTask}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      currentUser={currentUser}
                      onUpgradePremium={() => setShowPremiumModal(true)}
                      workspaceInvitations={workspaceInvitations}
                      spaces={currentWorkspaceSpaces}
                      onNavigateToTab={(tab) => setActiveTab(tab as any)}
                      onAcceptInvite={handleAcceptWorkspaceInvite}
                      onDeclineInvite={handleDeclineWorkspaceInvite}
                    />
                  )}

                  {(activeTab === 'tasks' || activeTab === 'my-tasks') && (
                    <SpacePage
                      tasks={mapTasksToSpaces(currentWorkspaceTasks)}
                      members={currentWorkspaceMembers}
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
                      onAddSpace={handleOpenAddSpaceModal}
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
                      allDocs={currentWorkspaceDocs}
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

                  {activeTab === 'goals' && (
                    <GoalsHub
                      activeWorkspaceId={activeWorkspaceId}
                      currentUser={currentUser}
                      members={currentWorkspaceMembers}
                      tasks={currentWorkspaceTasks}
                      isOffline={isOffline}
                      onOpenTask={(taskId) => {
                        const task = currentWorkspaceTasks.find((item) => item.id === taskId);
                        setActiveTab('tasks');
                        if (task?.spaceId) setActiveSpaceId(task.spaceId);
                        if (task?.listId) setActiveListId(task.listId);
                        setInitialSelectedTaskId(taskId);
                      }}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                    />
                  )}

                  {activeTab === 'calendar' && (
                    <CalendarView
                      tasks={mapTasksToSpaces(currentWorkspaceTasks)}
                      members={currentWorkspaceMembers}
                      isOffline={isOffline}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                      onAddTask={handleAddTask}
                      onUpdateTask={handleUpdateTask}
                      spaces={spaces.filter(s => s.workspaceId === activeWorkspaceId)}
                      activeSpaceId={activeSpaceId}
                      activeListId={activeListId}
                    />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsHub
                      tasks={currentWorkspaceTasks}
                      members={currentWorkspaceMembers}
                      spaces={currentWorkspaceSpaces}
                      activeWorkspaceId={activeWorkspaceId}
                    />
                  )}

                  {activeTab === 'finance' && (
                    <FinanceHub
                      activeWorkspaceId={activeWorkspaceId}
                      onAddSyncLog={addSyncLog}
                      triggerToast={triggerToast}
                    />
                  )}

                  {activeTab === 'team' && (
                    <TeamDirectory
                      members={currentWorkspaceMembers}
                      tasks={currentWorkspaceTasks}
                      workspaces={workspaces}
                      activeWorkspaceId={activeWorkspaceId}
                      onAddMember={handleAddMember}
                      onUpdateMember={handleUpdateMember}
                      onDeleteMember={handleDeleteMember}
                      onAddSyncLog={addSyncLog}
                      currentUser={currentUser}
                      onSendWorkspaceInvites={handleSendWorkspaceInvites}
                      onStartChat={() => {
                        setActiveTab('chat');
                        triggerToast('info', 'Chat đội nhóm', 'Chọn thành viên trong Direct Messages để bắt đầu trao đổi.');
                      }}
                    />
                  )}

                  {activeTab === 'chat' && (
                    <ChatRoom
                      members={currentWorkspaceMembers}
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
                      />
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <ProfilePage
                      currentUser={currentUser}
                      setCurrentUser={updateCurrentUser}
                      members={currentWorkspaceMembers}
                      setMembers={setMembers}
                      tasks={currentWorkspaceTasks}
                      isOffline={isOffline}
                      addSyncLog={addSyncLog}
                      onUpdateMember={handleUpdateMember}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsPanel 
                      isDarkMode={isDarkMode}
                      themePreference={themePreference}
                      setThemePreference={setThemePreference}
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
                      dateFormat={dateFormat}
                      setDateFormat={setDateFormat}
                      uiDensity={uiDensity}
                      setUiDensity={setUiDensity}
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
                        await disconnectUserPresence();
                        await supabase.auth.signOut({ scope: 'local' });
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
              initial={{ scale: 0.95, y: 14, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.95, y: 14, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="relative w-full max-w-[480px] rounded-3xl bg-[#09090b]/98 border border-white/10 overflow-hidden z-10 text-left font-sans select-none shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl max-h-[90vh] flex flex-col"
            >
              {/* Top Accent Light Line */}
              <div 
                className="h-1 w-full shrink-0 transition-all duration-300"
                style={{
                  background: {
                    indigo: 'linear-gradient(90deg, #38bdf8, #2563eb, #6366f1)',
                    rose: 'linear-gradient(90deg, #fb7185, #e11d48, #be123c)',
                    sky: 'linear-gradient(90deg, #38bdf8, #0284c7, #0369a1)',
                    emerald: 'linear-gradient(90deg, #34d399, #059669, #047857)',
                    amber: 'linear-gradient(90deg, #fbbf24, #d97706, #b45309)',
                    sunset: 'linear-gradient(90deg, #fb923c, #ea580c, #c2410c)',
                  }[newSpaceColor as 'indigo' | 'rose' | 'sky' | 'emerald' | 'amber' | 'sunset'] || 'linear-gradient(90deg, #38bdf8, #2563eb)'
                }}
              />

              {/* Modal Body with Custom Scrollbar */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                {/* ── Close Button ── */}
                <button 
                  type="button"
                  onClick={() => setShowAddSpaceModal(false)} 
                  className="absolute top-4 sm:top-5 right-4 sm:right-5 w-7 h-7 rounded-xl bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.1] flex items-center justify-center transition-all cursor-pointer z-20"
                  aria-label="Đóng cửa sổ"
                >
                  <X className="w-4 h-4" />
                </button>

                <form onSubmit={handleAddSpace} className="space-y-4 relative z-10">
                  {/* ── Header ── */}
                  <div className="flex items-center gap-3 pr-8">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-xs shadow-sky-500/20 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        {t('createSpace') || (locale === 'vi' ? 'Tạo Không gian mới' : 'Create Space')}
                      </h3>
                      <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
                        {locale === 'vi' ? 'Không gian làm việc & quản lý dự án' : 'Workspaces & team project hubs'}
                      </p>
                    </div>
                  </div>

                  {/* ── Template Presets (Compact Chips) ── */}
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-black uppercase text-zinc-400 tracking-wider block">
                      {t('spaceTemplateTitle') || (locale === 'vi' ? 'Mẫu gợi ý' : 'Quick Templates')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {[
                        { name: locale === 'vi' ? 'Phát triển phần mềm' : 'Software Development', icon: 'Laptop', color: 'indigo', desc: 'Sprint & Code', iconBg: 'bg-blue-500/15 text-sky-400' },
                        { name: locale === 'vi' ? 'Marketing & Chiến dịch' : 'Marketing & Campaign', icon: 'Rocket', color: 'rose', desc: 'Content & Ads', iconBg: 'bg-rose-500/15 text-rose-400' },
                        { name: locale === 'vi' ? 'Thiết kế UX/UI' : 'UX/UI Design', icon: 'Palette', color: 'sky', desc: 'Design System', iconBg: 'bg-sky-500/15 text-sky-300' },
                        { name: locale === 'vi' ? 'Vận hành & HR' : 'Operations & HR', icon: 'Zap', color: 'emerald', desc: 'Tuyển dụng & Ops', iconBg: 'bg-emerald-500/15 text-emerald-400' }
                      ].map((tpl) => {
                        const isActive = newSpaceName === tpl.name;
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
                            className={`group p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-2.5 ${
                              isActive
                                ? 'border-sky-500/50 bg-sky-500/10 text-white ring-1 ring-sky-500/20'
                                : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] text-zinc-300'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tpl.iconBg}`}>
                              {(() => {
                                const iconMap: Record<string, React.ReactNode> = {
                                  'Laptop': <Database className="w-3.5 h-3.5" />,
                                  'Rocket': <Zap className="w-3.5 h-3.5" />,
                                  'Palette': <Sliders className="w-3.5 h-3.5" />,
                                  'Zap': <Users className="w-3.5 h-3.5" />,
                                };
                                return iconMap[tpl.icon] || <Sparkles className="w-3.5 h-3.5" />;
                              })()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[11px] font-bold text-white truncate leading-tight">{tpl.name}</span>
                              <span className="block text-[9px] font-medium text-zinc-400 truncate mt-0.5">{tpl.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Space Name & Identity Card ── */}
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Icon Picker Trigger */}
                      <div className="shrink-0">
                        <EmojiIconPicker
                          value={newSpaceEmoji || 'Package'}
                          onChange={setNewSpaceEmoji}
                        />
                      </div>

                      {/* Space Name Input */}
                      <div className="flex-1 min-w-0">
                        <label className="text-[9.5px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                          {t('spaceName') || (locale === 'vi' ? 'Tên Space' : 'Space Name')} *
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={newSpaceName} 
                          onChange={e => setNewSpaceName(e.target.value)} 
                          placeholder={locale === 'vi' ? 'Ví dụ: Kỹ thuật, Marketing, HR...' : 'e.g. Engineering, Marketing, HR'} 
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-white/10 bg-white/[0.04] focus:bg-black/50 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-white outline-none transition-all placeholder:text-zinc-500"
                        />
                      </div>
                    </div>

                    {/* Description Input */}
                    <div>
                      <input 
                        type="text" 
                        value={newSpaceDescription} 
                        onChange={e => setNewSpaceDescription(e.target.value)} 
                        placeholder={locale === 'vi' ? 'Mô tả ngắn về mục đích không gian này (không bắt buộc)...' : 'Brief description of this space (optional)...'} 
                        className="w-full px-3 py-1.5 text-[11px] font-medium rounded-xl border border-white/[0.06] bg-white/[0.02] focus:bg-black/50 focus:border-sky-500 text-zinc-200 outline-none transition-all placeholder:text-zinc-600"
                      />
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                      <span className="text-[9.5px] font-bold text-zinc-400">
                        {locale === 'vi' ? 'Màu chủ đề' : 'Color theme'}
                      </span>
                      <div className="flex items-center gap-2">
                        {[
                          { key: 'indigo', hex: '#38bdf8', label: 'Sky Blue' },
                          { key: 'rose', hex: '#f43f5e', label: 'Rose' },
                          { key: 'sky', hex: '#0284c7', label: 'Ocean' },
                          { key: 'emerald', hex: '#10b981', label: 'Emerald' },
                          { key: 'amber', hex: '#f59e0b', label: 'Amber' },
                          { key: 'sunset', hex: '#f97316', label: 'Orange' },
                        ].map(col => (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => setNewSpaceColor(col.key)}
                            className={`w-5 h-5 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                              newSpaceColor === col.key 
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#09090b] scale-110' 
                                : 'opacity-60 hover:opacity-100 hover:scale-105'
                            }`}
                            style={{ backgroundColor: col.hex }}
                            title={col.label}
                            aria-label={col.label}
                          >
                            {newSpaceColor === col.key && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Settings: Permissions & Privacy ── */}
                  <div className="space-y-1.5">
                    {/* Permission Row */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="block text-[11.5px] font-bold text-zinc-100 leading-tight truncate">
                            {t('defaultPermission') || (locale === 'vi' ? 'Quyền thành viên' : 'Default Permission')}
                          </span>
                          <span className="block text-[9.5px] font-medium text-zinc-400 mt-0.5 truncate">
                            {locale === 'vi' ? 'Quyền ban đầu cho thành viên' : 'Initial role for members'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => setShowSpacePermissionMenu(!showSpacePermissionMenu)}
                          className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-[11px] px-2.5 py-1 text-zinc-200 font-bold outline-none hover:bg-white/10 hover:border-white/20 cursor-pointer shadow-3xs transition-all"
                        >
                          <span>
                            {newSpacePermission === 'Full edit' ? (locale === 'vi' ? 'Toàn quyền sửa' : 'Full edit') :
                             newSpacePermission === 'Edit only' ? (locale === 'vi' ? 'Chỉ chỉnh sửa' : 'Edit only') :
                             newSpacePermission === 'Read only' ? (locale === 'vi' ? 'Chỉ xem' : 'Read only') :
                             (locale === 'vi' ? 'Chỉ bình luận' : 'Comment only')}
                          </span>
                          <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${showSpacePermissionMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showSpacePermissionMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowSpacePermissionMenu(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                                className="absolute right-0 top-full mt-1.5 w-48 p-1 bg-[#121217] border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl z-50 space-y-0.5 text-left"
                              >
                                {[
                                  { value: 'Full edit', labelEn: 'Full edit', labelVi: 'Toàn quyền sửa', descEn: 'Full access', descVi: 'Toàn quyền quản lý' },
                                  { value: 'Edit only', labelEn: 'Edit only', labelVi: 'Chỉ chỉnh sửa', descEn: 'Can edit content', descVi: 'Chỉnh sửa nội dung' },
                                  { value: 'Read only', labelEn: 'Read only', labelVi: 'Chỉ xem', descEn: 'View-only', descVi: 'Chỉ xem' },
                                  { value: 'Comment only', labelEn: 'Comment only', labelVi: 'Chỉ bình luận', descEn: 'Can comment', descVi: 'Bình luận' },
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
                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                                        isSelected 
                                          ? 'bg-blue-600/20 text-sky-400 font-bold' 
                                          : 'hover:bg-white/[0.06] text-zinc-300 font-medium'
                                      }`}
                                    >
                                      <div>
                                        <div className="text-[11px] leading-tight">
                                          {locale === 'vi' ? opt.labelVi : opt.labelEn}
                                        </div>
                                        <div className="text-[8.5px] text-zinc-400 mt-0.5">
                                          {locale === 'vi' ? opt.descVi : opt.descEn}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0 ml-2 stroke-[3]" />}
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
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${newSpaceIsPrivate ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.06] text-zinc-400'}`}>
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="block text-[11.5px] font-bold text-zinc-100 leading-tight truncate">
                            {t('makePrivateSpace') || (locale === 'vi' ? 'Không gian riêng tư' : 'Private Space')}
                          </span>
                          <span className="block text-[9.5px] font-medium text-zinc-400 mt-0.5 truncate">
                            {locale === 'vi' ? 'Chỉ bạn và người được mời xem được' : 'Only invited members can access'}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setNewSpaceIsPrivate(!newSpaceIsPrivate)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none shrink-0 ${
                          newSpaceIsPrivate ? 'bg-blue-600' : 'bg-zinc-800 border border-white/10'
                        }`}
                        aria-pressed={newSpaceIsPrivate}
                        aria-label="Bật chế độ riêng tư"
                      >
                        <div 
                          className={`bg-white w-4 h-4 rounded-full transform transition-transform duration-200 ease-out shadow-xs ${
                            newSpaceIsPrivate ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* ── Footer Actions ── */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button 
                      type="button" 
                      onClick={() => setShowAddSpaceModal(false)}
                      className="h-8.5 px-4 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                    >
                      {t('cancel') || (locale === 'vi' ? 'Hủy' : 'Cancel')}
                    </button>
                    
                    <button 
                      type="submit" 
                      className="h-8.5 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>{t('createSpace') || (locale === 'vi' ? 'Tạo Space' : 'Create Space')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD LIST MODAL ── */}
      <AddListModal
        isOpen={!!showAddListSpaceId}
        onClose={() => setShowAddListSpaceId(null)}
        spaceId={showAddListSpaceId}
        spaces={spaces}
        onAddList={handleAddNewList}
        locale={locale}
      />

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
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{t('iconEmoji') || 'Biểu tượng (Emoji)'}</label>
                    <input type="text" value={editSpaceEmoji} onChange={e => setEditSpaceEmoji(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-center transition-all focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{t('themeColor') || 'Màu chủ đề'}</label>
                    <Select
                      value={editSpaceColor}
                      onChange={v => setEditSpaceColor(v)}
                      options={[
                        { value: 'indigo', label: 'Tím chàm' },
                        { value: 'rose', label: 'Hồng phấn' },
                        { value: 'sky', label: 'Xanh da trời' },
                        { value: 'emerald', label: 'Xanh ngọc' },
                        { value: 'sunset', label: 'Hoàng hôn' }
                      ]}
                      className="w-full"
                      ariaLabel="Màu chủ đề"
                    />
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
                        setPromptModalConfig({
                          isOpen: true,
                          type: 'status',
                          title: t('addCustomStatus') || 'Thêm trạng thái công việc',
                          placeholder: t('enterNewStatus') || 'Nhập tên trạng thái mới...',
                          confirmText: 'Thêm trạng thái',
                          onConfirm: (name) => {
                            setPromptModalConfig(null);
                            if (!name) return;
                            const colors = ['#94a3b8', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#a855f7'];
                            const newStatus = {
                              id: `status-${Date.now()}`,
                              label: name,
                              color: colors[Math.floor(Math.random() * colors.length)],
                              type: 'inprogress' as TaskStatus
                            };
                            setEditSpaceStatuses(prev => [...prev, newStatus]);
                          },
                          onCancel: () => setPromptModalConfig(null)
                        });
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
                  <button type="button" onClick={handleSaveSpaceSettings} className="py-2 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors shadow-md shadow-blue-500/20">{t('saveSettings') || 'Save Settings'}</button>
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
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Đang theo dõi thời gian</span>
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
                  title="Dừng và ghi nhận thời gian"
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

      <ApexaBrainAssistant
        tasks={currentWorkspaceTasks}
        documents={currentWorkspaceDocs}
        members={currentWorkspaceMembers}
        isOffline={isOffline}
        onUpdateTask={handleUpdateTask}
        onAddTask={handleAddTask}
        onAddSyncLog={addSyncLog}
      />

      <PricingModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        currentUser={currentUser ? {
          isPremium: Boolean(currentUser.isPremium || isApexaSuperAdmin(currentUser.id)),
        } : null}
        onEntitlementChange={(entitlement) => {
          applyEntitlement(entitlement);
          updateCurrentUser({
            ...currentUser,
            isPremium: entitlement.is_pro,
            subscriptionPlan: entitlement.plan,
            billingStatus: entitlement.status,
            billingCycle: entitlement.billing_cycle,
            billingPeriodEnd: entitlement.current_period_end,
          });
        }}
        triggerToast={triggerToast}
        addSyncLog={addSyncLog}
      />

      {/* Modern UI/UX Prompt Modal */}
      {promptModalConfig && (
        <PromptModal {...promptModalConfig} />
      )}

      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchCategory={searchCategory}
        setSearchCategory={setSearchCategory}
        tasks={tasks}
        docs={docs}
        spaces={spaces}
        members={members}
        activeWorkspaceId={activeWorkspaceId}
        onSelectTask={(taskId) => {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            setActiveTab('tasks');
            if (task.spaceId) setActiveSpaceId(task.spaceId);
            if (task.listId) setActiveListId(task.listId);
            setInitialSelectedTaskId(taskId);
          }
        }}
        onSelectDoc={(docId) => {
          setActiveTab('docs');
          setInitialSelectedDocId(docId);
        }}
        onSelectSpace={(spaceId) => {
          setActiveTab('tasks');
          setActiveSpaceId(spaceId);
          setActiveListId(null);
        }}
        onSelectChannel={(channelId) => {
          setActiveTab('chat');
          setInitialSelectedChannelId(channelId);
        }}
        onSelectMember={(memberId) => {
          setViewingMemberProfileId(memberId);
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'tasks') {
            setActiveSpaceId(null);
            setActiveListId(null);
          }
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
          setThemePreference(themePreference === 'dark' ? 'light' : 'dark');
        }}
        isDarkMode={themePreference === 'dark'}
        addSyncLog={addSyncLog}
      />

      {showSidebarOrderModal && (
        <SidebarOrderModal
          isOpen={showSidebarOrderModal}
          onClose={() => setShowSidebarOrderModal(false)}
          sidebarOrder={sidebarOrder}
          setSidebarOrder={setSidebarOrder}
          sidebarItemsMeta={sidebarItemsMeta}
          triggerToast={triggerToast}
        />
      )}

      </div>
    </div>
  );
}
