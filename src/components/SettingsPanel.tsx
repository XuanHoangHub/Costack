"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, AlertTriangle, Archive, Bell, Brain, BriefcaseBusiness, Building2, Check,
  CheckCircle2, CheckSquare, ChevronRight, CircleUserRound, Clipboard, Clock, Cloud, Copy,
  Database, Download, FileClock, FileSpreadsheet, FileText, FolderTree, Globe2, KeyRound, Laptop,
  LayoutGrid, Link2, LockKeyhole, LogOut, Mail, Menu, MonitorCog, Moon, Palette, Play, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  Sun, Timer, Trash2, Upload, UserRoundCog, Users, UsersRound, Volume2, VolumeX, X,
  Zap, Smartphone, ShieldAlert
} from 'lucide-react';
import QRCode from 'qrcode';
import OtpCodeInput from './auth/OtpCodeInput';
import SidebarOrderModal from './SidebarOrderModal';
import SignedImage from './SignedImage';
import TeamDirectory from './TeamDirectory';
import LanguageDropdown from './LanguageDropdown';
import { Select } from './ui/Select';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';
import { supabase } from '@/lib/supabaseClient';
import { callAiApi } from '@/lib/aiClient';
import { formatAuthError } from '@/lib/authError';
import type { ThemePreference } from '@/lib/theme';
import type { NotificationSettings, SyncLog, Task, User, Workspace } from '@/types';
import { ApexaAiIcon } from './ApexaAiIcon';
import { 
  getBrowserNotificationPermission, 
  requestBrowserNotificationPermission, 
  sendTestNotification, 
  isBrowserNotificationSupported 
} from '@/lib/notificationManager';

export const WORKSPACE_COVERS = [
  { id: 'cover1', name: 'Amethyst Quartz', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover2', name: 'Digital Future', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover3', name: 'Green Valley', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover4', name: 'Peaceful Lake', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover5', name: 'Metropolis', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover6', name: 'Desert Sunrise', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5edd0cd9?w=800&auto=format&fit=crop&q=80' }
];

type AccentPreset = 'indigo' | 'ocean' | 'forest' | 'sunset';
type BlurIntensity = 'soft' | 'default' | 'immersive';
type SettingsTab = 'general' | 'people' | 'preferences' | 'notifications' | 'ai_usage' | 'security' | 'data_export' | 'audit_logs';

interface SettingsPanelProps {
  isDarkMode: boolean;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
  accentPreset: AccentPreset;
  setAccentPreset: (value: AccentPreset) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  blurIntensity: BlurIntensity;
  setBlurIntensity: (value: BlurIntensity) => void;
  dateFormat: 'short' | 'full' | 'vi' | 'numeric' | 'clock';
  setDateFormat: (value: 'short' | 'full' | 'vi' | 'numeric' | 'clock') => void;
  uiDensity: 'comfortable' | 'compact';
  setUiDensity: (value: 'comfortable' | 'compact') => void;
  notificationSettings: NotificationSettings;
  setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  onUpdateWorkspace?: (id: string, name: string, theme: string, coverUrl?: string, logoUrl?: string, settings?: unknown) => void;
  onDeleteWorkspace?: (id: string) => void;
  onAddWorkspace?: (name: string, theme: string, coverUrl?: string) => void;
  members?: User[];
  setMembers?: React.Dispatch<React.SetStateAction<User[]>>;
  tasks?: Task[];
  onAddMember?: (member: Omit<User, 'id'>) => void;
  onUpdateMember?: (member: User) => void;
  onDeleteMember?: (id: string) => void;
  onAddSyncLog?: (action: string) => void;
  syncLogs?: SyncLog[];
  activeSettingsTab?: string;
  setActiveSettingsTab?: (tab: string) => void;
  onLogout?: () => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onSendWorkspaceInvites?: (emails: string[], role: string) => void;
}

const inputClass = 'w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 px-3 text-sm font-semibold text-slate-850 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 placeholder:text-slate-400';

function Toggle({ checked, onChange, disabled = false, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-500 dark:text-sky-400">{eyebrow}</p>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SettingsCard({ title, description, icon: Icon, children, tone = 'default', action }: { title: string; description?: string; icon?: React.ElementType; children: React.ReactNode; tone?: 'default' | 'danger'; action?: React.ReactNode }) {
  return (
    <section className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:bg-slate-900 ${tone === 'danger' ? 'border-rose-200 dark:border-rose-900/60' : 'border-slate-200/80 dark:border-slate-800'}`}>
      <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${tone === 'danger' ? 'border-rose-100 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/15' : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900'}`}>
        <div className="flex items-start gap-3">
          {Icon && <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${tone === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-sky-50 text-sky-500 dark:bg-sky-950/50 dark:text-sky-300'}`}><Icon className="h-4.5 w-4.5" /></div>}
          <div>
            <h3 className={`text-sm font-extrabold ${tone === 'danger' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>{title}</h3>
            {description && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SettingRow({ title, description, children, last = false }: { title: string; description: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-4 w-full ${last ? '' : 'border-b border-slate-100 dark:border-slate-800/80'}`}>
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="shrink-0 flex items-center justify-end">{children}</div>
    </div>
  );
}

export default function SettingsPanel({
  isDarkMode, themePreference, setThemePreference, accentPreset, setAccentPreset, soundEnabled,
  setSoundEnabled, blurIntensity, setBlurIntensity, dateFormat, setDateFormat, uiDensity, setUiDensity, notificationSettings,
  setNotificationSettings, workspaces = [], activeWorkspaceId = '',
  onUpdateWorkspace, onDeleteWorkspace, onAddWorkspace, members = [], tasks = [],
  onAddMember, onUpdateMember, onDeleteMember, onAddSyncLog, syncLogs = [],
  activeSettingsTab, setActiveSettingsTab, onLogout, triggerToast,
  onSendWorkspaceInvites
}: SettingsPanelProps) {
  const { t, locale, isVietnamese } = useTranslation();
  const currentUser = useAuthStore(state => state.currentUser);
  const setShowPremiumModal = useUiStore(state => state.setShowPremiumModal);
  const defaultStartupTab = useUiStore(state => state.defaultStartupTab);
  const setDefaultStartupTab = useUiStore(state => state.setDefaultStartupTab);

  const accentOptions: Array<{ id: AccentPreset; name: string; hex: string; className: string }> = useMemo(() => [
    { id: 'indigo', name: isVietnamese ? 'Xanh Apexa (Mặc định)' : 'Apexa Blue (Default)', hex: '#2563EB', className: 'from-blue-600 to-cyan-600' },
    { id: 'ocean', name: isVietnamese ? 'Xanh đại dương' : 'Ocean Blue', hex: '#0EA5E9', className: 'from-sky-400 to-blue-600' },
    { id: 'forest', name: isVietnamese ? 'Xanh rừng' : 'Forest Green', hex: '#10B981', className: 'from-emerald-400 to-teal-600' },
    { id: 'sunset', name: isVietnamese ? 'Hồng hoàng hôn' : 'Sunset Rose', hex: '#F43F5E', className: 'from-orange-400 to-rose-600' }
  ], [isVietnamese]);

  const navigationSections: Array<{ label: string; items: Array<{ id: SettingsTab; label: string; description: string; icon: React.ElementType }> }> = useMemo(() => [
    {
      label: t('workspaceCategory') || (isVietnamese ? 'Không gian làm việc' : 'Workspace'),
      items: [
        { id: 'general', label: t('settingsGeneral') || (isVietnamese ? 'Không gian làm việc' : 'Workspace'), description: t('settingsGeneralDesc') || (isVietnamese ? 'Nhận diện và thương hiệu' : 'Identity and branding'), icon: BriefcaseBusiness },
        { id: 'people', label: t('settingsPeople') || (isVietnamese ? 'Thành viên' : 'Members'), description: t('settingsPeopleDesc') || (isVietnamese ? 'Thành viên và quyền truy cập' : 'Members and access permissions'), icon: UsersRound },
        { id: 'ai_usage', label: t('settingsAi') || 'Apexa AI', description: t('settingsAiDesc') || (isVietnamese ? 'Cấu hình mô hình' : 'AI Copilot & model config'), icon: ApexaAiIcon },
        { id: 'audit_logs', label: t('settingsAuditLogs') || (isVietnamese ? 'Nhật ký hoạt động' : 'Activity Log'), description: t('settingsAuditLogsDesc') || (isVietnamese ? 'Sự kiện trong không gian' : 'Workspace events & history'), icon: FileClock },
        { id: 'data_export', label: t('settingsDataExport') || (isVietnamese ? 'Dữ liệu và lưu trữ' : 'Data & Storage'), description: t('settingsDataExportDesc') || (isVietnamese ? 'Xuất dữ liệu và bộ nhớ đệm' : 'Export data & storage'), icon: Database }
      ]
    },
    {
      label: t('personalCategory') || (isVietnamese ? 'Cá nhân' : 'Personal'),
      items: [
        { id: 'preferences', label: t('settingsPreferences') || (isVietnamese ? 'Giao diện' : 'Appearance'), description: t('settingsPreferencesDesc') || (isVietnamese ? 'Chủ đề và ngôn ngữ' : 'Theme, language and visuals'), icon: Palette },
        { id: 'notifications', label: t('settingsNotifications') || (isVietnamese ? 'Thông báo' : 'Notifications'), description: t('settingsNotificationsDesc') || (isVietnamese ? 'Cảnh báo và tập trung' : 'Alerts and focus mode'), icon: Bell },
        { id: 'security', label: t('settingsSecurity') || (isVietnamese ? 'Bảo mật' : 'Security'), description: t('settingsSecurityDesc') || (isVietnamese ? 'Tài khoản và phiên đăng nhập' : 'Account & active sessions'), icon: ShieldCheck }
      ]
    }
  ], [t, isVietnamese]);

  const validTabs = navigationSections.flatMap(section => section.items.map(item => item.id));
  const [localTab, setLocalTab] = useState<SettingsTab>('general');
  const activeTab = validTabs.includes(activeSettingsTab as SettingsTab) ? activeSettingsTab as SettingsTab : localTab;
  const setActiveTab = (tab: SettingsTab) => {
    setLocalTab(tab);
    setActiveSettingsTab?.(tab);
    setMobileNavigationOpen(false);
  };

  const activeWorkspace = useMemo(() => workspaces.find(workspace => workspace.id === activeWorkspaceId) || workspaces[0], [activeWorkspaceId, workspaces]);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const [logCategory, setLogCategory] = useState<string>('all');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceCover, setWorkspaceCover] = useState('');
  const [workspaceLogo, setWorkspaceLogo] = useState('');
  const [workspaceTheme, setWorkspaceTheme] = useState<AccentPreset>('indigo');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [workspaceTimezone, setWorkspaceTimezone] = useState('Asia/Ho_Chi_Minh');
  const [workspaceWeekStartsOn, setWorkspaceWeekStartsOn] = useState<'monday' | 'sunday'>('monday');
  const [workspaceDefaultRole, setWorkspaceDefaultRole] = useState<'member' | 'guest'>('member');
  const [workspaceAllowInvites, setWorkspaceAllowInvites] = useState(false);
  const [workspaceClickApps, setWorkspaceClickApps] = useState<{
    timeTracking?: boolean;
    multipleAssignees?: boolean;
    customFields?: boolean;
    relationships?: boolean;
    subtasks?: boolean;
    priorities?: boolean;
  }>({
    timeTracking: true,
    multipleAssignees: true,
    customFields: true,
    relationships: true,
    subtasks: true,
    priorities: true,
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceTheme, setNewWorkspaceTheme] = useState<AccentPreset>('indigo');
  const [newWorkspaceCover, setNewWorkspaceCover] = useState('');
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [aiModel, setAiModel] = useState('gemini-3.6-flash');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiSearchGrounding, setAiSearchGrounding] = useState(false);
  const [aiDailyBriefingEnabled, setAiDailyBriefingEnabled] = useState(true);
  const [aiDailyBriefingTime, setAiDailyBriefingTime] = useState('08:00');
  const [testingAi, setTestingAi] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<{ lastSignIn?: string; expiresAt?: number } | null>(null);
  const [showSidebarOrderModal, setShowSidebarOrderModal] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; friendly_name?: string; status: string; created_at?: string }>>([]);
  const [mfaEnrollment, setMfaEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [confirmDisableMfaModal, setConfirmDisableMfaModal] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>(() => getBrowserNotificationPermission());

  const passwordStrength = useMemo(() => {
    const hasLength = newPassword.length >= 10;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
    let score = 0;
    if (hasLength) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    return { score, hasLength, hasUpper, hasLower, hasNumber, isMatch };
  }, [newPassword, confirmPassword]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      setBrowserPerm(getBrowserNotificationPermission());
    }
  }, [activeTab]);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    setWorkspaceName(activeWorkspace.name || '');
    setWorkspaceCover(activeWorkspace.coverUrl || '');
    setWorkspaceLogo(activeWorkspace.logoUrl || '');
    setWorkspaceTheme((activeWorkspace.theme as AccentPreset) || 'indigo');
    const wsSettings = (activeWorkspace.settings || {}) as any;
    setWorkspaceDescription(wsSettings.description || '');
    setWorkspaceTimezone(wsSettings.timezone || 'Asia/Ho_Chi_Minh');
    setWorkspaceWeekStartsOn(wsSettings.weekStartsOn || 'monday');
    setWorkspaceDefaultRole(wsSettings.defaultRole || 'member');
    setWorkspaceAllowInvites(Boolean(wsSettings.allowMemberInvites));
    setWorkspaceClickApps({
      timeTracking: wsSettings.defaultClickApps?.timeTracking ?? true,
      multipleAssignees: wsSettings.defaultClickApps?.multipleAssignees ?? true,
      customFields: wsSettings.defaultClickApps?.customFields ?? true,
      relationships: wsSettings.defaultClickApps?.relationships ?? true,
      subtasks: wsSettings.defaultClickApps?.subtasks ?? true,
      priorities: wsSettings.defaultClickApps?.priorities ?? true,
    });
  }, [activeWorkspace]);

  useEffect(() => {
    localStorage.removeItem('apexa_gemini_api_key');
    const savedModel = localStorage.getItem('apexa_ai_model') || 'gemini-3.6-flash';
    const supportedModels = new Set([
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ]);
    const normalizedModel = supportedModels.has(savedModel) ? savedModel : 'gemini-3.6-flash';
    setAiModel(normalizedModel);
    setAiTemperature(Number(localStorage.getItem('apexa_ai_temperature') || 0.7));
    setAiSearchGrounding(localStorage.getItem('apexa_ai_search_grounding') === 'true');
    setAiDailyBriefingEnabled(localStorage.getItem('apexa_ai_daily_briefing_enabled') !== 'false');
    setAiDailyBriefingTime(localStorage.getItem('apexa_ai_daily_briefing_time') || '08:00');
  }, []);

  const loadSecurityState = React.useCallback(async () => {
    const [{ data: sessionData }, { data: factorData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.mfa.listFactors()
    ]);
    setSessionDetails(sessionData.session ? {
      lastSignIn: sessionData.session.user.last_sign_in_at,
      expiresAt: sessionData.session.expires_at
    } : null);
    setMfaFactors((factorData?.totp || []).map(factor => ({
      id: factor.id,
      friendly_name: factor.friendly_name,
      status: factor.status,
      created_at: factor.created_at
    })));
  }, []);

  useEffect(() => {
    if (activeTab === 'security') void loadSecurityState();
  }, [activeTab, loadSecurityState]);

  const visibleNavigation = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(settingsSearch.toLowerCase()))
  })).filter(section => section.items.length > 0);

  // Clean out low-level backend synchronization noise from UI activity feed
  const cleanLogs = useMemo(() => {
    return syncLogs.filter(log => {
      const act = (log.action || '').toLowerCase();
      return (
        !act.includes('supabase') &&
        !act.includes('cloud server') &&
        !act.includes('compatibility mode') &&
        !act.includes('realtime') &&
        !act.includes('storage synchronized') &&
        !act.includes('system merge') &&
        !act.includes('offline changes') &&
        !act.includes('offline cache') &&
        !act.includes('entered list:') &&
        !act.includes('sorting order')
      );
    });
  }, [syncLogs]);

  const filteredLogs = useMemo(() => {
    return cleanLogs.filter(log => {
      const matchesSearch = `${log.action} ${log.time} ${log.userName || ''}`.toLowerCase().includes(logSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (logCategory === 'all') return true;
      if (logCategory === 'task') return log.category === 'task' || log.action.toLowerCase().includes('công việc') || log.action.toLowerCase().includes('task');
      if (logCategory === 'space') return log.category === 'space' || log.action.toLowerCase().includes('không gian') || log.action.toLowerCase().includes('thư mục') || log.action.toLowerCase().includes('danh sách') || log.action.toLowerCase().includes('space');
      if (logCategory === 'workspace') return log.category === 'workspace' || log.action.toLowerCase().includes('workspace');
      if (logCategory === 'doc') return log.category === 'doc' || log.action.toLowerCase().includes('tài liệu') || log.action.toLowerCase().includes('doc');
      if (logCategory === 'member') return log.category === 'member' || log.action.toLowerCase().includes('thành viên') || log.action.toLowerCase().includes('lời mời') || log.action.toLowerCase().includes('member');
      return true;
    });
  }, [cleanLogs, logSearch, logCategory]);

  const saveWorkspace = async () => {
    if (!activeWorkspace || !workspaceName.trim() || !onUpdateWorkspace) return;
    const invalidAssetUrl = [workspaceCover, workspaceLogo].find(value => {
      if (!value) return false;
      if (value.startsWith('data:image/')) return false;
      try { const url = new URL(value); return !['http:', 'https:'].includes(url.protocol); } catch { return true; }
    });
    if (invalidAssetUrl) {
      triggerToast?.('warning', isVietnamese ? 'Đường dẫn hình ảnh không hợp lệ' : 'Invalid image URL', isVietnamese ? 'Logo và ảnh bìa phải dùng đường dẫn http hoặc https.' : 'Logo and cover must use an http or https URL.');
      return;
    }
    setIsSavingWorkspace(true);
    try {
      const updatedSettings = {
        ...((activeWorkspace.settings as any) || {}),
        description: workspaceDescription.trim(),
        timezone: workspaceTimezone,
        weekStartsOn: workspaceWeekStartsOn,
        defaultRole: workspaceDefaultRole,
        allowMemberInvites: workspaceAllowInvites,
        defaultClickApps: workspaceClickApps,
      };

      await Promise.resolve(onUpdateWorkspace(
        activeWorkspace.id,
        workspaceName.trim(),
        workspaceTheme,
        workspaceCover || undefined,
        workspaceLogo || undefined,
        updatedSettings
      ));
      onAddSyncLog?.(isVietnamese ? `Đã cập nhật cài đặt không gian “${workspaceName.trim()}”` : `Updated settings for workspace "${workspaceName.trim()}"`);
      triggerToast?.('success', t('changesSaved') || 'Changes saved', isVietnamese ? 'Đã lưu cấu hình không gian làm việc.' : 'Workspace settings saved successfully.');
    } catch (error) {
      triggerToast?.('error', isVietnamese ? 'Không thể lưu workspace' : 'Could not save workspace', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      window.setTimeout(() => setIsSavingWorkspace(false), 350);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerToast?.('warning', isVietnamese ? 'Ảnh quá lớn' : 'File too large', isVietnamese ? 'Vui lòng chọn ảnh nhỏ hơn 2MB.' : 'Please select an image smaller than 2MB.');
      return;
    }
    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${currentUser?.id || 'user'}/workspaces/${activeWorkspace.id}_logo_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) {
        const reader = new FileReader();
        reader.onload = () => {
          setWorkspaceLogo(reader.result as string);
          triggerToast?.('success', isVietnamese ? 'Đã tải ảnh lên' : 'Logo uploaded', isVietnamese ? 'Ảnh logo đã được cập nhật thành công.' : 'Logo updated successfully.');
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        setWorkspaceLogo(publicUrl);
        triggerToast?.('success', isVietnamese ? 'Đã tải ảnh lên' : 'Logo uploaded', isVietnamese ? 'Ảnh logo đã được tải lên thành công.' : 'Logo uploaded successfully.');
      }
      if (typeof window !== 'undefined') (window as any).playSystemSound?.('success');
    } catch (error) {
      console.warn('Upload fallback to data url:', error);
      const reader = new FileReader();
      reader.onload = () => {
        setWorkspaceLogo(reader.result as string);
        triggerToast?.('success', isVietnamese ? 'Đã tải ảnh lên' : 'Logo uploaded', isVietnamese ? 'Ảnh logo đã được cập nhật.' : 'Logo updated.');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    if (file.size > 5 * 1024 * 1024) {
      triggerToast?.('warning', isVietnamese ? 'Ảnh quá lớn' : 'File too large', isVietnamese ? 'Vui lòng chọn ảnh nhỏ hơn 5MB.' : 'Please select an image smaller than 5MB.');
      return;
    }
    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${currentUser?.id || 'user'}/workspaces/${activeWorkspace.id}_cover_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) {
        const reader = new FileReader();
        reader.onload = () => {
          setWorkspaceCover(reader.result as string);
          triggerToast?.('success', isVietnamese ? 'Đã tải ảnh bìa' : 'Cover uploaded', isVietnamese ? 'Ảnh bìa đã được cập nhật thành công.' : 'Cover updated successfully.');
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        setWorkspaceCover(publicUrl);
        triggerToast?.('success', isVietnamese ? 'Đã tải ảnh bìa' : 'Cover uploaded', isVietnamese ? 'Ảnh bìa đã được tải lên thành công.' : 'Cover updated successfully.');
      }
      if (typeof window !== 'undefined') (window as any).playSystemSound?.('success');
    } catch (error) {
      console.warn('Cover upload fallback to data url:', error);
      const reader = new FileReader();
      reader.onload = () => {
        setWorkspaceCover(reader.result as string);
        triggerToast?.('success', isVietnamese ? 'Đã tải ảnh bìa' : 'Cover uploaded', isVietnamese ? 'Ảnh bìa đã được cập nhật.' : 'Cover updated.');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const exportTasksToCsv = () => {
    const workspaceTasks = tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id);
    if (!workspaceTasks.length) {
      triggerToast?.('info', isVietnamese ? 'Không có công việc' : 'No tasks', isVietnamese ? 'Không có công việc nào trong không gian này để xuất.' : 'No tasks found in this workspace.');
      return;
    }

    const headers = ['ID', 'Tiêu đề (Title)', 'Mô tả (Description)', 'Trạng thái (Status)', 'Mức ưu tiên (Priority)', 'Hạn chót (Due Date)', 'Người thực hiện (Assignee)'];
    const rows = workspaceTasks.map(t => [
      `"${(t.id || '').replace(/"/g, '""')}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.status || '').replace(/"/g, '""')}"`,
      `"${(t.priority || '').replace(/"/g, '""')}"`,
      `"${(t.dueDate || '').replace(/"/g, '""')}"`,
      `"${(members.find(m => m.id === t.assigneeId)?.name || t.assigneeId || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa-tasks-${activeWorkspace?.name || 'workspace'}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', isVietnamese ? 'Đã xuất tệp CSV' : 'CSV exported', isVietnamese ? `Đã xuất ${workspaceTasks.length} công việc ra tệp CSV.` : `Exported ${workspaceTasks.length} tasks to CSV.`);
    onAddSyncLog?.(isVietnamese ? 'Đã xuất danh sách công việc sang CSV' : 'Exported tasks to CSV');
  };

  const createWorkspace = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newWorkspaceName.trim()) return;
    onAddWorkspace?.(newWorkspaceName.trim(), newWorkspaceTheme, newWorkspaceCover || undefined);
    onAddSyncLog?.(isVietnamese ? `Đã tạo không gian “${newWorkspaceName.trim()}”` : `Created workspace "${newWorkspaceName.trim()}"`);
    triggerToast?.('success', t('itemCreated') || 'Workspace created', isVietnamese ? `“${newWorkspaceName.trim()}” đã sẵn sàng.` : `"${newWorkspaceName.trim()}" is ready.`);
    setCreateWorkspaceOpen(false);
    setNewWorkspaceName('');
    setNewWorkspaceCover('');
  };

  const saveAiSettings = () => {
    if (!currentUser?.isPremium) {
      setShowPremiumModal(true);
      return;
    }
    localStorage.setItem('apexa_ai_model', aiModel);
    localStorage.setItem('apexa_ai_temperature', String(aiTemperature));
    localStorage.setItem('apexa_ai_search_grounding', String(aiSearchGrounding));
    localStorage.setItem('apexa_ai_daily_briefing_enabled', String(aiDailyBriefingEnabled));
    localStorage.setItem('apexa_ai_daily_briefing_time', aiDailyBriefingTime);
    window.dispatchEvent(new Event('apexa-ai-settings-changed'));
    onAddSyncLog?.(isVietnamese ? 'Đã cập nhật cấu hình Apexa AI' : 'Updated Apexa AI settings');
    triggerToast?.('success', t('saveChanges') || 'Saved AI settings', isVietnamese ? 'Tùy chọn mô hình đã được lưu trên thiết bị này.' : 'Model preferences saved on this device.');
  };

  const testAiConnection = async () => {
    if (!currentUser?.isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setTestingAi(true);
    try {
      const response = await callAiApi('/api/ai/chat', { message: 'Only reply: OK', history: [], model: aiModel, temperature: 0 });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || (isVietnamese ? 'Không thể xác minh dịch vụ AI hoặc mô hình đã chọn.' : 'Could not verify the AI service or selected model.'));
      }
      triggerToast?.('success', t('connectionSuccess') || 'Connected successfully', isVietnamese ? `Mô hình ${aiModel} đã kết nối và sẵn sàng hoạt động.` : `Model ${aiModel} is connected and ready.`);
      onAddSyncLog?.(isVietnamese ? `Đã xác minh kết nối Apexa AI (${aiModel})` : `Verified Apexa AI connection (${aiModel})`);
    } catch (error) {
      triggerToast?.('error', t('connectionFailed') || 'Connection failed', error instanceof Error ? error.message : 'Could not connect to AI service.');
    } finally {
      setTestingAi(false);
    }
  };

  const exportWorkspaceData = () => {
    const payload = {
      format: 'apexa-workspace-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: activeWorkspace,
      members,
      tasks: tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id),
      activity: syncLogs,
      settings: {
        themePreference,
        accentPreset,
        blurIntensity,
        dateFormat,
        uiDensity,
        soundEnabled,
        notificationSettings,
        ai: {
          model: aiModel,
          temperature: aiTemperature,
          searchGrounding: aiSearchGrounding,
          dailyBriefingEnabled: aiDailyBriefingEnabled,
          dailyBriefingTime: aiDailyBriefingTime
        }
      }
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa-${activeWorkspace?.name || 'workspace'}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', t('exportReady') || 'Data ready', t('exportReadyDesc') || 'JSON backup downloaded.');
    onAddSyncLog?.(isVietnamese ? 'Đã xuất dữ liệu không gian làm việc' : 'Exported workspace data backup');
  };

  const importSettingsBackup = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(isVietnamese ? 'Tệp sao lưu vượt quá giới hạn 10MB.' : 'Backup file exceeds the 10MB limit.');
      const parsed = JSON.parse(await file.text());
      if (parsed?.format !== 'apexa-workspace-backup' || parsed?.version !== 1 || typeof parsed?.settings !== 'object') {
        throw new Error(isVietnamese ? 'Tệp này không phải bản sao lưu Apexa hợp lệ.' : 'This is not a valid Apexa backup.');
      }
      const settings = parsed.settings;
      if (['light', 'dark', 'system'].includes(settings.themePreference)) setThemePreference(settings.themePreference);
      if (['indigo', 'ocean', 'forest', 'sunset'].includes(settings.accentPreset)) setAccentPreset(settings.accentPreset);
      if (['soft', 'default', 'immersive'].includes(settings.blurIntensity)) setBlurIntensity(settings.blurIntensity);
      if (['short', 'full', 'vi', 'numeric', 'clock'].includes(settings.dateFormat)) setDateFormat(settings.dateFormat);
      if (['comfortable', 'compact'].includes(settings.uiDensity)) setUiDensity(settings.uiDensity);
      if (typeof settings.soundEnabled === 'boolean') setSoundEnabled(settings.soundEnabled);
      if (settings.notificationSettings && typeof settings.notificationSettings === 'object') {
        setNotificationSettings(previous => ({ ...previous, ...settings.notificationSettings }));
      }
      if (settings.ai && typeof settings.ai === 'object') {
        if (typeof settings.ai.model === 'string') { setAiModel(settings.ai.model); localStorage.setItem('apexa_ai_model', settings.ai.model); }
        if (typeof settings.ai.temperature === 'number') { const temperature = Math.max(0, Math.min(1, settings.ai.temperature)); setAiTemperature(temperature); localStorage.setItem('apexa_ai_temperature', String(temperature)); }
        if (typeof settings.ai.searchGrounding === 'boolean') { setAiSearchGrounding(settings.ai.searchGrounding); localStorage.setItem('apexa_ai_search_grounding', String(settings.ai.searchGrounding)); }
        if (typeof settings.ai.dailyBriefingEnabled === 'boolean') { setAiDailyBriefingEnabled(settings.ai.dailyBriefingEnabled); localStorage.setItem('apexa_ai_daily_briefing_enabled', String(settings.ai.dailyBriefingEnabled)); }
        if (typeof settings.ai.dailyBriefingTime === 'string') { setAiDailyBriefingTime(settings.ai.dailyBriefingTime); localStorage.setItem('apexa_ai_daily_briefing_time', settings.ai.dailyBriefingTime); }
        window.dispatchEvent(new Event('apexa-ai-settings-changed'));
      }
      if (parsed.workspace && activeWorkspace && onUpdateWorkspace) {
        await Promise.resolve(onUpdateWorkspace(
          activeWorkspace.id,
          typeof parsed.workspace.name === 'string' ? parsed.workspace.name : activeWorkspace.name,
          typeof parsed.workspace.theme === 'string' ? parsed.workspace.theme : activeWorkspace.theme,
          typeof parsed.workspace.coverUrl === 'string' ? parsed.workspace.coverUrl : activeWorkspace.coverUrl,
          typeof parsed.workspace.logoUrl === 'string' ? parsed.workspace.logoUrl : activeWorkspace.logoUrl,
          parsed.workspace.settings || activeWorkspace.settings
        ));
      }
      triggerToast?.('success', isVietnamese ? 'Đã khôi phục cài đặt' : 'Settings restored', isVietnamese ? 'Giao diện, thông báo, AI và nhận diện workspace đã được áp dụng.' : 'Appearance, notifications, AI and workspace identity were restored.');
      onAddSyncLog?.(isVietnamese ? 'Đã khôi phục cài đặt từ bản sao lưu' : 'Restored settings from backup');
    } catch (error) {
      triggerToast?.('error', isVietnamese ? 'Không thể nhập bản sao lưu' : 'Could not import backup', error instanceof Error ? error.message : 'Invalid backup file.');
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const resetDisplayPreferences = () => {
    setThemePreference('system');
    setAccentPreset('indigo');
    setBlurIntensity('default');
    setDateFormat('short');
    setUiDensity('comfortable');
    setSoundEnabled(false);
    localStorage.removeItem('avaxa_accent_preset');
    triggerToast?.('success', isVietnamese ? 'Đã đặt lại giao diện' : 'Display reset', isVietnamese ? 'Chủ đề, màu nhấn, hiệu ứng và âm thanh đã về mặc định.' : 'Theme, accent, effects and sounds were reset to defaults.');
  };

  const copyAuditLogs = async () => {
    try {
      await navigator.clipboard.writeText(cleanLogs.map(log => `[${log.time}] ${log.userName ? `[${log.userName}] ` : ''}${log.action}`).join('\n'));
      setCopiedLogs(true);
      window.setTimeout(() => setCopiedLogs(false), 1600);
    } catch {
      triggerToast?.('error', isVietnamese ? 'Không thể sao chép' : 'Copy failed', isVietnamese ? 'Trình duyệt đã từ chối quyền truy cập clipboard.' : 'Clipboard permission was denied.');
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword.length < 10 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError(isVietnamese ? 'Mật khẩu cần ít nhất 10 ký tự, gồm chữ hoa, chữ thường và số.' : 'Use at least 10 characters with uppercase, lowercase and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isVietnamese ? 'Mật khẩu xác nhận không khớp.' : 'Password confirmation does not match.');
      return;
    }
    setUpdatingPassword(true);
    try {
      const attributes: { password: string; current_password?: string } = { password: newPassword };
      if (currentPassword) attributes.current_password = currentPassword;
      const { error } = await supabase.auth.updateUser(attributes);
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerToast?.('success', isVietnamese ? 'Đã đổi mật khẩu' : 'Password updated', isVietnamese ? 'Mật khẩu mới đã có hiệu lực.' : 'Your new password is now active.');
      onAddSyncLog?.(isVietnamese ? 'Đã cập nhật mật khẩu tài khoản' : 'Updated account password');
    } catch (error) {
      const message = error instanceof Error ? error.message : (isVietnamese ? 'Không thể đổi mật khẩu.' : 'Could not update password.');
      setPasswordError(message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const revokeOtherSessions = async () => {
    setRevokingSessions(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      triggerToast?.('success', isVietnamese ? 'Đã thu hồi các phiên khác' : 'Other sessions revoked', isVietnamese ? 'Chỉ thiết bị hiện tại còn đăng nhập.' : 'Only this device remains signed in.');
      onAddSyncLog?.(isVietnamese ? 'Đã đăng xuất tài khoản trên các thiết bị khác' : 'Signed out account on other devices');
    } catch (error) {
      triggerToast?.('error', isVietnamese ? 'Không thể thu hồi phiên' : 'Could not revoke sessions', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRevokingSessions(false);
    }
  };

  const verifiedMfaFactor = useMemo(() => mfaFactors.find(factor => factor.status === 'verified'), [mfaFactors]);
  const isMfaActive = Boolean(verifiedMfaFactor);

  const startMfaEnrollment = async () => {
    setMfaBusy(true);
    setMfaError('');
    try {
      await Promise.all(mfaFactors.filter(factor => factor.status !== 'verified').map(factor => supabase.auth.mfa.unenroll({ factorId: factor.id })));
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Apexa Authenticator' });
      if (error) throw error;

      let qrDataUrl = data.totp.qr_code;
      if (data.totp.uri) {
        try {
          qrDataUrl = await QRCode.toDataURL(data.totp.uri, {
            width: 240,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
        } catch (qrErr) {
          console.warn('Failed to render PNG QR code, falling back to SVG:', qrErr);
          if (qrDataUrl && qrDataUrl.startsWith('<svg')) {
            qrDataUrl = `data:image/svg+xml;utf-8,${encodeURIComponent(qrDataUrl)}`;
          }
        }
      } else if (qrDataUrl && qrDataUrl.startsWith('<svg')) {
        qrDataUrl = `data:image/svg+xml;utf-8,${encodeURIComponent(qrDataUrl)}`;
      }

      setMfaEnrollment({ factorId: data.id, qrCode: qrDataUrl, secret: data.totp.secret });
      setMfaCode('');
    } catch (error) {
      const formatted = formatAuthError(error, isVietnamese);
      setMfaError(formatted.description || formatted.title);
      triggerToast?.('error', formatted.title, formatted.description);
    } finally {
      setMfaBusy(false);
    }
  };

  const cancelMfaEnrollment = async () => {
    if (mfaEnrollment) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: mfaEnrollment.factorId });
      } catch {}
    }
    setMfaEnrollment(null);
    setMfaCode('');
    setMfaError('');
    await loadSecurityState();
  };

  const verifyMfaEnrollment = async (codeToVerify?: string) => {
    const code = (typeof codeToVerify === 'string' ? codeToVerify : mfaCode).trim();
    if (!mfaEnrollment || !/^\d{6}$/.test(code)) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaEnrollment.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaEnrollment.factorId, challengeId: challenge.id, code });
      if (verifyError) throw verifyError;
      setMfaEnrollment(null);
      setMfaCode('');
      setMfaError('');
      await loadSecurityState();
      triggerToast?.('success', isVietnamese ? 'Đã bật xác thực hai bước' : 'Two-factor authentication enabled', isVietnamese ? 'Tài khoản hiện được bảo vệ bằng ứng dụng Authenticator.' : 'Your account is now protected by an authenticator app.');
      onAddSyncLog?.(isVietnamese ? 'Đã bật xác thực hai bước (TOTP)' : 'Enabled two-factor authentication (TOTP)');
    } catch (error) {
      const formatted = formatAuthError(error, isVietnamese);
      setMfaError(formatted.description || formatted.title);
      triggerToast?.('error', formatted.title, formatted.description);
    } finally {
      setMfaBusy(false);
    }
  };

  const removeMfaFactor = async (factorId: string) => {
    setMfaBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setConfirmDisableMfaModal(null);
      await loadSecurityState();
      triggerToast?.('success', isVietnamese ? 'Đã tắt xác thực hai bước' : 'Two-factor authentication disabled', isVietnamese ? 'Thiết bị xác thực đã được gỡ.' : 'The authenticator factor was removed.');
      onAddSyncLog?.(isVietnamese ? 'Đã tắt xác thực hai bước (TOTP)' : 'Disabled two-factor authentication (TOTP)');
    } catch (error) {
      triggerToast?.('error', isVietnamese ? 'Không thể gỡ xác thực' : 'Could not remove MFA', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMfaBusy(false);
    }
  };

  const handleToggleMfa = () => {
    if (mfaBusy) return;
    if (isMfaActive && verifiedMfaFactor) {
      setConfirmDisableMfaModal(verifiedMfaFactor.id);
    } else if (mfaEnrollment) {
      void cancelMfaEnrollment();
    } else {
      void startMfaEnrollment();
    }
  };

  return (
    <div className="relative flex flex-col md:flex-row h-full w-full overflow-hidden rounded-none border-0 bg-white dark:bg-slate-950">

      <aside className="flex flex-col border-b md:border-b-0 md:border-r border-slate-200/80 bg-white/95 p-3 md:p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:relative md:flex md:w-[276px] shrink-0 z-10">
        <div className="mb-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20">
              <Settings2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-950 dark:text-white">{t('settings') || 'Settings'}</h1>
              <p className="text-[10px] font-medium text-slate-400">{t('settingsSubtitle') || 'Workspace Control Center'}</p>
            </div>
          </div>
          <button type="button" onClick={() => setMobileNavigationOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"><X className="h-4 w-4" /></button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input 
            value={settingsSearch} 
            onChange={event => setSettingsSearch(event.target.value)} 
            placeholder={t('searchSettings') || 'Search settings...'} 
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" 
          />
        </div>

        <nav className="min-h-0 flex-1 flex md:flex-col gap-2 md:gap-0 md:space-y-5 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto pr-1 pb-2 md:pb-0 scrollbar-none">
          {visibleNavigation.map(section => (
            <div key={section.label} className="flex md:block gap-2">
              <p className="hidden md:block mb-1.5 px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{section.label}</p>
              <div className="flex md:block space-x-2 md:space-x-0 md:space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const selected = item.id === activeTab;
                  return (
                    <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`group flex shrink-0 md:w-full items-center gap-2 md:gap-3 rounded-xl px-3 py-2 md:py-2.5 text-left transition cursor-pointer ${selected ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/50' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}`}>
                      <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">{item.label}</span>
                        <span className={`hidden md:block mt-0.5 truncate text-[10px] ${selected ? 'text-indigo-500/80 dark:text-indigo-400/70' : 'text-slate-400 dark:text-slate-500'}`}>{item.description}</span>
                      </span>
                      <ChevronRight className={`hidden md:block h-3.5 w-3.5 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 border-t border-slate-200/70 pt-4 dark:border-slate-800">
          {currentUser && (
            <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900">
              <SignedImage filePath={currentUser.avatar} alt={currentUser.name} className="h-8 w-8 shrink-0 overflow-hidden rounded-full" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">{currentUser.name}</p><p className="truncate text-[10px] text-slate-400">{currentUser.email}</p></div>
            </div>
          )}
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 cursor-pointer">
            <LogOut className="h-4 w-4" />{t('signOut') || (isVietnamese ? 'Đăng xuất' : 'Sign Out')}
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto bg-white dark:bg-slate-950" aria-label="Settings Content">
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:px-7">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavigationOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 md:hidden"><Menu className="h-4 w-4" /></button>
            <div>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                {navigationSections.flatMap(section => section.items).find(item => item.id === activeTab)?.label}
              </p>
              <p className="hidden text-[10px] text-slate-400 sm:block">
                {isVietnamese ? 'Thay đổi được lưu an toàn và đồng bộ tức thì' : 'Changes saved safely and synced instantly'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('systemOperational') || (isVietnamese ? 'Hệ thống hoạt động bình thường' : 'System Operational')}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }} className="mx-auto max-w-5xl space-y-6 p-3 sm:p-5 md:p-7 lg:p-9 pb-16">
            {activeTab === 'general' && (
              <>
                <SectionHeader 
                  eyebrow={t('workspaceAdmin') || (isVietnamese ? 'Quản trị không gian' : 'Workspace Admin')} 
                  title={t('workspaceIdentity') || (isVietnamese ? 'Nhận diện không gian làm việc' : 'Workspace Identity')} 
                  description={t('workspaceIdentityDesc') || (isVietnamese ? 'Quản lý tên, hình ảnh nhận diện và các thiết lập mặc định mà đội ngũ sử dụng mỗi ngày.' : 'Manage name, branding and default settings for your team.')} 
                  action={
                    <button type="button" onClick={() => setCreateWorkspaceOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-blue-500/15 transition hover:bg-indigo-700 cursor-pointer">
                      <Plus className="h-3.5 w-3.5" />{t('createWorkspaceBtn') || (isVietnamese ? 'Tạo không gian' : 'Create Workspace')}
                    </button>
                  } 
                />
                {activeWorkspace ? (
                  <>
                    <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-800">
                      {workspaceCover ? <img src={workspaceCover} alt="Workspace Cover" className="h-full w-full object-cover opacity-80" /> : <div className="h-full w-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
                      <div className="absolute inset-x-5 bottom-5 flex items-end gap-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/95 text-xl font-black text-indigo-600 shadow-xl">
                          {workspaceLogo ? <img src={workspaceLogo} alt="Logo" className="h-full w-full object-cover" /> : workspaceName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-lg font-black text-white">{workspaceName || activeWorkspace.name}</p>
                          <p className="text-xs font-medium text-white/70">
                            {members.length} {t('members') || 'members'} · {tasks.filter(task => task.workspaceId === activeWorkspace.id).length} {t('tasks') || 'tasks'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <SettingsCard title={t('basicInformation') || (isVietnamese ? 'Thông tin cơ bản' : 'Basic Information')} description={t('basicInformationDesc') || (isVietnamese ? 'Sử dụng tên rõ ràng và hình ảnh nhận diện dễ nhớ.' : 'Use a clear name and memorable logo.')} icon={CircleUserRound}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('workspaceName') || (isVietnamese ? 'Tên không gian' : 'Workspace Name')}</span>
                          <input value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} maxLength={60} className={inputClass} />
                        </label>
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {isVietnamese ? 'Logo không gian' : 'Workspace Logo'}
                            </span>
                            {workspaceLogo && (
                              <button
                                type="button"
                                onClick={() => setWorkspaceLogo('')}
                                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                              >
                                {t('removeLogo') || (isVietnamese ? 'Gỡ logo' : 'Remove logo')}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
                              {workspaceLogo ? (
                                <img src={workspaceLogo} alt="Logo" className="h-full w-full object-cover" />
                              ) : (
                                <span>{(workspaceName || activeWorkspace.name || 'A').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="flex flex-1 items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-3xs cursor-pointer disabled:opacity-50"
                              >
                                {isUploadingLogo ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                <span>
                                  {isUploadingLogo
                                    ? (isVietnamese ? 'Đang tải lên...' : 'Uploading...')
                                    : (workspaceLogo
                                        ? (isVietnamese ? 'Thay đổi logo' : 'Change logo')
                                        : (t('uploadLogo') || (isVietnamese ? 'Tải logo lên' : 'Upload logo')))}
                                </span>
                              </button>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                {workspaceLogo 
                                  ? (isVietnamese ? 'Đã tải lên logo' : 'Logo uploaded')
                                  : (isVietnamese ? 'Hỗ trợ PNG, JPG, WebP' : 'Supports PNG, JPG, WebP')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <label className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {t('workspaceDescription') || (isVietnamese ? 'Mô tả không gian làm việc' : 'Workspace Description')}
                          </span>
                          <textarea
                            value={workspaceDescription}
                            onChange={event => setWorkspaceDescription(event.target.value)}
                            rows={2}
                            maxLength={300}
                            placeholder={t('workspaceDescriptionPlaceholder') || (isVietnamese ? 'Mô tả ngắn gọn mục tiêu, phòng ban hoặc phạm vi của không gian này...' : 'Briefly describe the goal, team or scope of this workspace...')}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 p-3 text-xs font-semibold text-slate-850 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 placeholder:text-slate-400 resize-none"
                          />
                        </label>
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Ảnh bìa không gian' : 'Workspace Cover'}</p>
                          <div className="flex items-center gap-2">
                            <input
                              ref={coverInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleCoverUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              disabled={isUploadingCover}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline dark:text-sky-400 cursor-pointer"
                            >
                              {isUploadingCover ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              <span>{isUploadingCover ? (isVietnamese ? 'Đang tải...' : 'Uploading...') : (t('uploadCover') || (isVietnamese ? 'Tải ảnh bìa' : 'Upload cover'))}</span>
                            </button>
                            {workspaceCover && (
                              <button
                                type="button"
                                onClick={() => setWorkspaceCover('')}
                                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                              >
                                {t('removeCover') || (isVietnamese ? 'Xóa ảnh bìa' : 'Remove cover')}
                              </button>
                            )}
                          </div>
                        </div>
                        <input type="url" value={workspaceCover} onChange={event => setWorkspaceCover(event.target.value)} placeholder="https://…/cover.jpg" className={inputClass} />
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {WORKSPACE_COVERS.map(cover => (
                            <button type="button" key={cover.id} onClick={() => setWorkspaceCover(cover.url)} aria-label={cover.name} aria-pressed={workspaceCover === cover.url} className={`aspect-[16/9] overflow-hidden rounded-lg border transition cursor-pointer ${workspaceCover === cover.url ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 opacity-75 hover:opacity-100 dark:border-slate-800'}`}>
                              <img src={cover.url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('brandColor') || (isVietnamese ? 'Màu thương hiệu' : 'Brand Color')}</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {accentOptions.map(option => (
                            <button type="button" key={option.id} onClick={() => setWorkspaceTheme(option.id)} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer ${workspaceTheme === option.id ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/10 dark:bg-indigo-950/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'}`}>
                              <span className={`h-7 w-7 rounded-lg bg-gradient-to-br ${option.className}`} />
                              <span>
                                <span className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{option.name}</span>
                                <span className="text-[9px] font-mono text-slate-400">{option.hex}</span>
                              </span>
                              {workspaceTheme === option.id && <Check className="ml-auto h-3.5 w-3.5 text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-5 flex justify-end">
                        <button type="button" onClick={saveWorkspace} disabled={!workspaceName.trim() || isSavingWorkspace} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 cursor-pointer">
                          {isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t('saveChanges') || (isVietnamese ? 'Lưu thay đổi' : 'Save Changes')}
                        </button>
                      </div>
                    </SettingsCard>

                    <SettingsCard
                      title={isVietnamese ? 'Múi giờ & Lịch làm việc' : 'Timezone & Working Calendar'}
                      description={isVietnamese ? 'Định cấu hình múi giờ chính và ngày bắt đầu tuần cho các công việc trong không gian.' : 'Set the primary timezone and first day of the week for all workspace schedules.'}
                      icon={Clock}
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('workspaceTimezone') || (isVietnamese ? 'Múi giờ chính' : 'Primary Timezone')}</span>
                          <Select
                            value={workspaceTimezone}
                            onChange={setWorkspaceTimezone}
                            className="w-full"
                            ariaLabel="Workspace Timezone"
                            options={[
                              { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (GMT+7)' },
                              { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)' },
                              { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)' },
                              { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
                              { value: 'UTC', label: 'UTC (GMT+0)' },
                              { value: 'Europe/London', label: 'Europe/London (GMT+0 / GMT+1)' },
                              { value: 'America/New_York', label: 'America/New York (GMT-5 / GMT-4)' },
                              { value: 'America/Los_Angeles', label: 'America/Los Angeles (GMT-8 / GMT-7)' },
                              { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+10 / GMT+11)' },
                            ]}
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('weekStartsOn') || (isVietnamese ? 'Ngày bắt đầu tuần' : 'Week Starts On')}</span>
                          <Select
                            value={workspaceWeekStartsOn}
                            onChange={v => setWorkspaceWeekStartsOn(v as 'monday' | 'sunday')}
                            className="w-full"
                            ariaLabel="Week Starts On"
                            options={[
                              { value: 'monday', label: t('monday') || (isVietnamese ? 'Thứ Hai (Mặc định)' : 'Monday (Default)') },
                              { value: 'sunday', label: t('sunday') || (isVietnamese ? 'Chủ Nhật' : 'Sunday') },
                            ]}
                          />
                        </label>
                      </div>
                      <div className="mt-5 flex justify-end">
                        <button type="button" onClick={saveWorkspace} disabled={!workspaceName.trim() || isSavingWorkspace} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 cursor-pointer">
                          {isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t('saveChanges') || (isVietnamese ? 'Lưu thay đổi' : 'Save Changes')}
                        </button>
                      </div>
                    </SettingsCard>

                    <SettingsCard
                      title={isVietnamese ? 'Quyền hạn & Thành viên mặc định' : 'Member Defaults & Permissions'}
                      description={isVietnamese ? 'Cài đặt vai trò mặc định cho thành viên mới tham gia và quyền mời thành viên.' : 'Configure default roles for newly joined teammates and invitation privileges.'}
                      icon={Users}
                    >
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <SettingRow
                          title={t('defaultMemberRole') || (isVietnamese ? 'Vai trò mặc định cho thành viên mới' : 'Default Role for New Members')}
                          description={isVietnamese ? 'Vai trò được gán tự động khi người dùng tham gia qua liên kết hoặc lời mời.' : 'Role assigned automatically when someone joins via invite or link.'}
                        >
                          <Select
                            value={workspaceDefaultRole}
                            onChange={v => setWorkspaceDefaultRole(v as 'member' | 'guest')}
                            className="w-48"
                            ariaLabel="Default Member Role"
                            options={[
                              { value: 'member', label: t('roleMember') || (isVietnamese ? 'Thành viên (Member)' : 'Member') },
                              { value: 'guest', label: t('roleGuest') || (isVietnamese ? 'Khách (Guest)' : 'Guest') },
                            ]}
                          />
                        </SettingRow>
                        <SettingRow
                          title={t('allowMemberInvites') || (isVietnamese ? 'Cho phép thành viên gửi lời mời' : 'Allow Members to Invite')}
                          description={t('allowMemberInvitesDesc') || (isVietnamese ? 'Thành viên thông thường có thể mời người khác vào không gian này.' : 'Regular members can invite other people to this workspace.')}
                          last
                        >
                          <Toggle
                            checked={workspaceAllowInvites}
                            onChange={setWorkspaceAllowInvites}
                            label={t('allowMemberInvites') || 'Allow Member Invites'}
                          />
                        </SettingRow>
                      </div>
                      <div className="mt-5 flex justify-end">
                        <button type="button" onClick={saveWorkspace} disabled={!workspaceName.trim() || isSavingWorkspace} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 cursor-pointer">
                          {isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t('saveChanges') || (isVietnamese ? 'Lưu thay đổi' : 'Save Changes')}
                        </button>
                      </div>
                    </SettingsCard>

                    <SettingsCard
                      title={t('workspaceClickApps') || (isVietnamese ? 'Tính năng không gian (ClickApps)' : 'Workspace Features (ClickApps)')}
                      description={t('workspaceClickAppsDesc') || (isVietnamese ? 'Bật hoặc tắt các module chức năng chuyên sâu trong không gian này.' : 'Enable or disable functional modules in this workspace.')}
                      icon={LayoutGrid}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { key: 'timeTracking', title: t('appTimeTracking') || (isVietnamese ? 'Theo dõi thời gian' : 'Time Tracking'), desc: t('appTimeTrackingDesc') || (isVietnamese ? 'Ghi nhận giờ làm việc và ước lượng thời gian.' : 'Log hours and estimate task duration.'), icon: Timer },
                          { key: 'subtasks', title: t('appSubtasks') || (isVietnamese ? 'Công việc con' : 'Subtasks'), desc: t('appSubtasksDesc') || (isVietnamese ? 'Chia nhỏ công việc thành nhiều bước cụ thể.' : 'Break down work into smaller, actionable steps.'), icon: CheckSquare },
                          { key: 'priorities', title: t('appPriorities') || (isVietnamese ? 'Mức độ ưu tiên' : 'Task Priorities'), desc: t('appPrioritiesDesc') || (isVietnamese ? 'Phân loại Khẩn cấp, Cao, Trung bình, Thấp.' : 'Classify tasks as Urgent, High, Normal, or Low.'), icon: Zap },
                          { key: 'relationships', title: t('appRelationships') || (isVietnamese ? 'Mối liên kết & Phụ thuộc' : 'Task Relationships'), desc: t('appRelationshipsDesc') || (isVietnamese ? 'Thiết lập phụ thuộc và liên kết giữa các công việc.' : 'Set up blockers, waiting on, and linked task relations.'), icon: Link2 },
                          { key: 'customFields', title: t('appCustomFields') || (isVietnamese ? 'Trường tùy chỉnh' : 'Custom Fields'), desc: t('appCustomFieldsDesc') || (isVietnamese ? 'Thêm các trường dữ liệu tùy biến theo nhu cầu.' : 'Add custom data fields tailored to your workflow.'), icon: SlidersHorizontal },
                        ].map(app => (
                          <div key={app.key} className="flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                                <app.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{app.title}</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{app.desc}</p>
                              </div>
                            </div>
                            <Toggle
                              checked={Boolean((workspaceClickApps as any)[app.key])}
                              onChange={val => setWorkspaceClickApps(prev => ({ ...prev, [app.key]: val }))}
                              label={app.title}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex justify-end">
                        <button type="button" onClick={saveWorkspace} disabled={!workspaceName.trim() || isSavingWorkspace} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 cursor-pointer">
                          {isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t('saveChanges') || (isVietnamese ? 'Lưu thay đổi' : 'Save Changes')}
                        </button>
                      </div>
                    </SettingsCard>

                    <SettingsCard title={t('dangerZoneTitle') || (isVietnamese ? 'Khu vực nguy hiểm' : 'Danger Zone')} description={t('dangerZoneDesc') || (isVietnamese ? 'Các thao tác này ảnh hưởng đến mọi người có quyền truy cập không gian.' : 'These actions are permanent and affect all members.')} icon={AlertTriangle} tone="danger">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('deleteThisWorkspace') || (isVietnamese ? 'Xóa không gian này' : 'Delete this workspace')}</p>
                          <p className="mt-1 text-xs text-slate-500">{t('deleteThisWorkspaceDesc') || (isVietnamese ? 'Xóa vĩnh viễn không gian và toàn bộ cấu trúc liên quan.' : 'Permanently delete this workspace and all associated data.')}</p>
                        </div>
                        <button type="button" onClick={() => setDeleteWorkspace(activeWorkspace)} disabled={workspaces.length <= 1} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-xs font-extrabold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:bg-slate-950 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />{t('deleteWorkspace') || (isVietnamese ? 'Xóa không gian' : 'Delete Workspace')}
                        </button>
                      </div>
                    </SettingsCard>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                    <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">{t('noWorkspaceSelected') || 'No workspace selected'}</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'people' && (
              <>
                <SectionHeader 
                  eyebrow={t('team') || (isVietnamese ? 'Quản trị đội ngũ' : 'Team Admin')} 
                  title={t('membersAndAccess') || (isVietnamese ? 'Thành viên và quyền truy cập' : 'Members & Access')} 
                  description={t('membersAndAccessDesc') || (isVietnamese ? 'Mời đồng đội, tổ chức phòng ban và theo dõi cách phân bổ công việc.' : 'Invite teammates, manage departments and organize access.')} 
                />
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <TeamDirectory members={members} tasks={tasks} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onAddMember={onAddMember || (() => {})} onUpdateMember={onUpdateMember || (() => {})} onDeleteMember={onDeleteMember || (() => {})} onAddSyncLog={onAddSyncLog || (() => {})} currentUser={currentUser} onSendWorkspaceInvites={onSendWorkspaceInvites} />
                </div>
              </>
            )}

            {activeTab === 'preferences' && (
              <>
                <SectionHeader 
                  eyebrow={t('settingsPersonal') || (isVietnamese ? 'Cài đặt cá nhân' : 'Personal Settings')} 
                  title={t('appearanceAndTheme') || (isVietnamese ? 'Giao diện và trải nghiệm' : 'Appearance & Experience')} 
                  description={t('appearanceAndThemeDesc') || (isVietnamese ? 'Điều chỉnh Apexa phù hợp với môi trường và cách tập trung của bạn.' : 'Tailor Apexa to your environment and focus preferences.')} 
                />

                {/* 🌐 Language & Region Setting Card */}
                <SettingsCard 
                  title={t('languageAndRegion') || (isVietnamese ? 'Ngôn ngữ & Khu vực' : 'Language & Region')} 
                  description={t('languageAndRegionDesc') || (isVietnamese ? 'Chuyển đổi linh hoạt giữa Tiếng Việt và Tiếng Anh.' : 'Choose your preferred interface language for Apexa.')} 
                  icon={Globe2}
                >
                  <LanguageDropdown variant="cards" />
                </SettingsCard>

                {/* Color Mode */}
                <SettingsCard 
                  title={t('colorMode') || (isVietnamese ? 'Chế độ màu' : 'Color Mode')} 
                  description={t('colorModeDesc') || (isVietnamese ? 'Chọn giao diện dễ chịu nhất trong suốt ngày làm việc.' : 'Choose the most comfortable view for your workday.')} 
                  icon={MonitorCog}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { id: 'light', label: t('lightMode') || (isVietnamese ? 'Sáng' : 'Light'), icon: Sun }, 
                      { id: 'dark', label: t('darkMode') || (isVietnamese ? 'Tối' : 'Dark'), icon: Moon }, 
                      { id: 'system', label: t('systemMode') || (isVietnamese ? 'Theo hệ thống' : 'System'), icon: Laptop }
                    ].map(option => {
                      const selected = option.id === themePreference;
                      const Icon = option.icon;
                      return (
                        <button key={option.id} type="button" aria-pressed={selected} onClick={() => setThemePreference(option.id as ThemePreference)} className={`rounded-2xl border p-4 text-left transition cursor-pointer ${selected ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/10 dark:bg-indigo-950/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'}`}>
                          <Icon className={`h-5 w-5 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                          <p className="mt-4 text-sm font-extrabold text-slate-800 dark:text-slate-200">{option.label}</p>
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{option.id === 'system' ? (isVietnamese ? `Theo thiết bị · hiện đang ${isDarkMode ? 'tối' : 'sáng'}` : `Follows device · currently ${isDarkMode ? 'dark' : 'light'}`) : (isVietnamese ? `Giao diện ${option.label.toLowerCase()}` : `${option.label} mode`)}</p>
                        </button>
                      );
                    })}
                  </div>
                </SettingsCard>

                {/* Accent and Effects */}
                <SettingsCard 
                  title={t('accentAndEffects') || (isVietnamese ? 'Màu nhấn & Hiệu ứng' : 'Accent & Effects')} 
                  description={t('accentAndEffectsDesc') || (isVietnamese ? 'Làm nổi bật thao tác quan trọng mà không gây rối mắt.' : 'Highlight key actions without visual clutter.')} 
                  icon={Palette}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {accentOptions.map(option => (
                      <button key={option.id} type="button" onClick={() => setAccentPreset(option.id)} className={`rounded-xl border p-3 text-left transition cursor-pointer ${accentPreset === option.id ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                        <span className={`block h-9 rounded-lg bg-gradient-to-r ${option.className}`} />
                        <span className="mt-2 block text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{option.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                    <SettingRow title={t('interfaceDepth') || (isVietnamese ? 'Độ sâu giao diện' : 'Interface Depth')} description={isVietnamese ? 'Điều chỉnh độ mờ kính và mức phân tách bề mặt.' : 'Adjust glassmorphism blur and surface elevation.'}>
                      <Select value={blurIntensity} onChange={v => setBlurIntensity(v as BlurIntensity)} className="w-40" ariaLabel={isVietnamese ? 'Độ sâu giao diện' : 'Interface Depth'} options={[
                        { value: 'soft', label: t('depthSoft') || (isVietnamese ? 'Nhẹ' : 'Soft') },
                        { value: 'default', label: t('depthBalanced') || (isVietnamese ? 'Cân bằng' : 'Balanced') },
                        { value: 'immersive', label: t('depthImmersive') || (isVietnamese ? 'Nổi bật' : 'Immersive') },
                      ]} />
                    </SettingRow>
                    <SettingRow title={isVietnamese ? 'Mật độ giao diện' : 'Interface Density'} description={isVietnamese ? 'Thu gọn khoảng cách để hiển thị nhiều dữ liệu hơn.' : 'Adjust spacing to show more information on screen.'}>
                      <Select value={uiDensity} onChange={v => setUiDensity(v as 'comfortable' | 'compact')} className="w-40" ariaLabel={isVietnamese ? 'Mật độ giao diện' : 'Interface Density'} options={[
                        { value: 'comfortable', label: isVietnamese ? 'Thoải mái' : 'Comfortable' },
                        { value: 'compact', label: isVietnamese ? 'Thu gọn' : 'Compact' },
                      ]} />
                    </SettingRow>
                    <SettingRow title={isVietnamese ? 'Định dạng ngày giờ' : 'Date & Time Format'} description={isVietnamese ? 'Áp dụng thống nhất trong task, lịch và báo cáo.' : 'Used consistently across tasks, calendars and reports.'}>
                      <Select value={dateFormat} onChange={v => setDateFormat(v as typeof dateFormat)} className="w-44" ariaLabel={isVietnamese ? 'Định dạng ngày giờ' : 'Date & Time Format'} options={[
                        { value: 'short', label: '20/08/2026' },
                        { value: 'full', label: '20 tháng 8, 2026' },
                        { value: 'vi', label: 'Thứ Năm, 20/08' },
                        { value: 'numeric', label: '2026-08-20' },
                        { value: 'clock', label: '20/08 · 14:30' },
                      ]} />
                    </SettingRow>
                    <SettingRow
                      title={t('defaultStartupTab') || (isVietnamese ? 'Màn hình khởi động mặc định' : 'Default Startup Screen')}
                      description={t('defaultStartupTabDesc') || (isVietnamese ? 'Chọn màn hình hiển thị đầu tiên khi bạn mở Apexa.' : 'Choose which screen opens by default when you launch Apexa.')}
                    >
                      <Select
                        value={defaultStartupTab}
                        onChange={setDefaultStartupTab}
                        className="w-48"
                        ariaLabel={t('defaultStartupTab') || 'Default Startup Screen'}
                        options={[
                          { value: 'dashboard', label: t('dashboard') || (isVietnamese ? 'Tổng quan (Dashboard)' : 'Dashboard') },
                          { value: 'tasks', label: t('tasks') || (isVietnamese ? 'Công việc (Tasks)' : 'Tasks') },
                          { value: 'inbox', label: t('inbox') || (isVietnamese ? 'Hộp thư (Inbox)' : 'Inbox') },
                          { value: 'calendar', label: t('calendar') || (isVietnamese ? 'Lịch biểu (Calendar)' : 'Calendar') },
                          { value: 'docs', label: t('docs') || (isVietnamese ? 'Tài liệu (Docs)' : 'Docs') },
                          { value: 'finance', label: t('finance') || (isVietnamese ? 'Tài chính (Finance)' : 'Finance') },
                          { value: 'chat', label: t('chat') || (isVietnamese ? 'Trò chuyện (Chat)' : 'Chat') },
                        ]}
                      />
                    </SettingRow>
                    <SettingRow title={t('uiSounds') || (isVietnamese ? 'Âm thanh giao diện' : 'Interface Sounds')} description={t('uiSoundsDesc') || (isVietnamese ? 'Phát âm thanh phản hồi nhẹ cho các thao tác quan trọng.' : 'Play subtle audio feedback for key interactions.')} last>
                      <div className="flex items-center gap-2.5">
                        {soundEnabled && (
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                (window as any).playSystemSound?.('toggle');
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title={t('testSound') || 'Play test'}
                          >
                            <Play className="h-3 w-3 fill-current text-sky-500" />
                            <span>{t('testSound') || (isVietnamese ? 'Thử âm' : 'Play test')}</span>
                          </button>
                        )}
                        <Toggle checked={soundEnabled} onChange={setSoundEnabled} label={t('uiSounds') || 'Interface Sounds'} />
                      </div>
                    </SettingRow>
                  </div>
                </SettingsCard>

                {/* 🧭 Sidebar & Navigation Customization Card */}
                <SettingsCard 
                  title={isVietnamese ? 'Thanh điều hướng & Sắp xếp Module' : 'Navigation & Sidebar Modules'} 
                  description={isVietnamese ? 'Tùy biến vị trí và thứ tự các tính năng trên thanh bên theo thói quen sử dụng của bạn.' : 'Customize the order and placement of navigation modules to match your daily workflow.'} 
                  icon={SlidersHorizontal}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setShowSidebarOrderModal(true);
                        if (typeof window !== 'undefined') {
                          (window as any).playSystemSound?.('click');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>{isVietnamese ? 'Sắp xếp module' : 'Arrange modules'}</span>
                    </button>
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isVietnamese ? 'Quản lý thứ tự hiển thị các module' : 'Manage module display order'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isVietnamese 
                          ? 'Kéo thả trực tiếp trên thanh bên hoặc sử dụng bảng điều khiển này để di chuyển các module Lên/Xuống.' 
                          : 'Drag and drop directly on the sidebar or use this manager to move modules Up/Down.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSidebarOrderModal(true);
                        if (typeof window !== 'undefined') {
                          (window as any).playSystemSound?.('click');
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-400 active:scale-95 transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>{isVietnamese ? 'Mở bảng sắp xếp' : 'Open Reorder Dialog'}</span>
                    </button>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <SectionHeader 
                  eyebrow={t('notificationSettings') || (isVietnamese ? 'Quản lý thông báo' : 'Notification Settings')} 
                  title={t('notificationsAndFocus') || (isVietnamese ? 'Thông báo và tập trung' : 'Notifications & Focus')} 
                  description={t('notificationsAndFocusDesc') || (isVietnamese ? 'Luôn nắm bắt thông tin mà không để cập nhật làm gián đoạn ngày làm việc.' : 'Stay informed without disrupting deep work.')} 
                />
                <SettingsCard title={t('notificationDelivery') || (isVietnamese ? 'Phân phối thông báo' : 'Notification Delivery')} description={t('notificationDeliveryDesc') || (isVietnamese ? 'Điều khiển toàn bộ cảnh báo trên thiết bị này.' : 'Control all notification alerts on this device.')} icon={Bell}>
                  <SettingRow title={t('enableAllNotifications') || (isVietnamese ? 'Bật thông báo' : 'Enable Notifications')} description={t('enableAllNotificationsDesc') || (isVietnamese ? 'Nhận cập nhật hoạt động và lời nhắc.' : 'Receive activity updates and reminders.')}>
                    <Toggle checked={notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, enableAll: value }))} label="Enable Notifications" />
                  </SettingRow>
                  <SettingRow title={t('enableNotificationSound') || (isVietnamese ? 'Âm thanh thông báo' : 'Notification Sound')} description={t('enableNotificationSoundDesc') || (isVietnamese ? 'Phát âm thanh ngắn khi có cảnh báo.' : 'Play a chime when a notification arrives.')}>
                    <div className="flex items-center gap-2.5">
                      {notificationSettings.enableSound && notificationSettings.enableAll && (
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              (window as any).playSystemSound?.('notification');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title={t('testSound') || 'Play test'}
                        >
                          <Play className="h-3 w-3 fill-current text-sky-500" />
                          <span>{t('testSound') || (isVietnamese ? 'Thử chuông' : 'Play test')}</span>
                        </button>
                      )}
                      <Toggle checked={notificationSettings.enableSound} disabled={!notificationSettings.enableAll} onChange={value => { setNotificationSettings(previous => ({ ...previous, enableSound: value })); setSoundEnabled(value); }} label="Notification Sound" />
                    </div>
                  </SettingRow>
                  <SettingRow title={t('onlyImportantUpdates') || (isVietnamese ? 'Chỉ cập nhật quan trọng' : 'Only Important Updates')} description={t('onlyImportantUpdatesDesc') || (isVietnamese ? 'Giảm nhiễu bằng cách ưu tiên việc được giao và hạn chót.' : 'Reduce noise by prioritizing assignments and deadlines.')}>
                    <Toggle checked={notificationSettings.onlyImportant} disabled={!notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, onlyImportant: value }))} label="Only Important Updates" />
                  </SettingRow>
                  {isBrowserNotificationSupported() && (
                    <SettingRow 
                      title={isVietnamese ? 'Thông báo trên màn hình máy tính (Browser Desktop Notifications)' : 'Browser Desktop Notifications'} 
                      description={isVietnamese ? 'Gửi thông báo pop-up trực tiếp lên màn hình khi đến hạn công việc ngay cả khi bạn đang chuyển sang tab hay ứng dụng khác.' : 'Get system notifications when tasks reach deadlines even if you are on another tab.'}
                      last
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          browserPerm === 'granted' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : browserPerm === 'denied'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {browserPerm === 'granted' 
                            ? (isVietnamese ? 'Đã cho phép' : 'Allowed') 
                            : browserPerm === 'denied' 
                              ? (isVietnamese ? 'Đã bị chặn' : 'Blocked') 
                              : (isVietnamese ? 'Chưa cấp quyền' : 'Default')}
                        </span>
                        <Toggle 
                          checked={Boolean(notificationSettings.enableBrowserNotifications && browserPerm === 'granted')} 
                          disabled={!notificationSettings.enableAll} 
                          onChange={async (value) => {
                            if (value) {
                              const res = await requestBrowserNotificationPermission();
                              setBrowserPerm(res);
                              if (res === 'granted') {
                                setNotificationSettings(previous => ({ ...previous, enableBrowserNotifications: true }));
                                sendTestNotification();
                              } else {
                                setNotificationSettings(previous => ({ ...previous, enableBrowserNotifications: false }));
                              }
                            } else {
                              setNotificationSettings(previous => ({ ...previous, enableBrowserNotifications: false }));
                            }
                          }} 
                          label="Browser Desktop Notifications" 
                        />
                        {browserPerm === 'granted' && (
                          <button
                            type="button"
                            onClick={() => sendTestNotification()}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer shadow-3xs"
                          >
                            {isVietnamese ? 'Bắn thử' : 'Test popup'}
                          </button>
                        )}
                      </div>
                    </SettingRow>
                  )}
                </SettingsCard>

                <SettingsCard title={t('notificationContentTitle') || (isVietnamese ? 'Nội dung cần thông báo' : 'Notification Triggers')} description={t('notificationContentSubtitle') || (isVietnamese ? 'Tinh chỉnh những hoạt động có thể làm gián đoạn sự tập trung.' : 'Fine-tune which activities can interrupt your focus.')} icon={SlidersHorizontal}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['enableAssignments', t('notifyAssignments') || (isVietnamese ? 'Việc được giao' : 'Assignments'), t('notifyAssignmentsDesc') || (isVietnamese ? 'Khi có công việc được giao cho bạn' : 'When tasks are assigned to you')],
                      ['enableDeadlines', t('notifyDeadlines') || (isVietnamese ? 'Hạn chót' : 'Deadlines'), t('notifyDeadlinesDesc') || (isVietnamese ? 'Nhắc việc sắp đến hạn và quá hạn' : 'Due soon and overdue task reminders')],
                      ['enableComments', t('notifyComments') || (isVietnamese ? 'Bình luận & Nhắc tên' : 'Comments & Mentions'), t('notifyCommentsDesc') || (isVietnamese ? 'Phản hồi và lượt nhắc tên trong thảo luận' : 'Replies and @mentions in discussions')],
                      ['enableStatusChanges', t('notifyStatusChanges') || (isVietnamese ? 'Thay đổi trạng thái' : 'Status Changes'), t('notifyStatusChangesDesc') || (isVietnamese ? 'Cập nhật tiến độ của công việc đang theo dõi' : 'Progress updates on tracked tasks')],
                      ['enableFilteringTags', t('notifyFilteringTags') || (isVietnamese ? 'Hoạt động nhãn' : 'Tag Activity'), t('notifyFilteringTagsDesc') || (isVietnamese ? 'Cập nhật cho các nhãn đang theo dõi' : 'Updates on tagged items you follow')],
                      ['enableChatMessages', t('notifyChatMessages') || (isVietnamese ? 'Tin nhắn chat' : 'Chat Messages'), t('notifyChatMessagesDesc') || (isVietnamese ? 'Thông báo khi có tin nhắn mới trong phòng chat' : 'New messages in team chat rooms')],
                      ['enableSystemNotify', t('notifySystemEvents') || (isVietnamese ? 'Sự kiện hệ thống' : 'System Events'), t('notifySystemEventsDesc') || (isVietnamese ? 'Đồng bộ, bảo mật và hoạt động tài khoản' : 'Sync, security and account alerts')]
                    ].map(([key, title, description]) => (
                      <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
                        </div>
                        <div className="shrink-0">
                          <Toggle checked={Boolean(notificationSettings[key as keyof NotificationSettings])} disabled={!notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, [key]: value }))} label={title} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SettingsCard>

                <SettingsCard title={t('focusSchedule') || (isVietnamese ? 'Lịch tập trung' : 'Focus Schedule')} description={t('focusScheduleDesc') || (isVietnamese ? 'Tự động tắt tiếng cảnh báo thông thường trong giờ làm việc sâu.' : 'Automatically mute non-urgent alerts during deep work.')} icon={Moon}>
                  <SettingRow title={t('dndMode') || (isVietnamese ? 'Không làm phiền' : 'Do Not Disturb')} description={isVietnamese ? 'Tạm dừng thông báo thông thường cho đến khi bạn tắt chế độ này.' : 'Pause notifications until turned off.'}>
                    <Toggle checked={notificationSettings.dndActive} onChange={value => setNotificationSettings(previous => ({ ...previous, dndActive: value }))} label="Do Not Disturb" />
                  </SettingRow>
                  <SettingRow title={t('quietHours') || (isVietnamese ? 'Khung giờ yên tĩnh' : 'Quiet Hours')} description={t('quietHoursDesc') || (isVietnamese ? 'Đặt khoảng thời gian tập trung lặp lại hằng ngày.' : 'Set recurring daily quiet focus hours.')}>
                    <Toggle checked={!!notificationSettings.dndScheduleEnabled} onChange={value => setNotificationSettings(previous => ({ ...previous, dndScheduleEnabled: value }))} label="Quiet Hours" />
                  </SettingRow>
                  {notificationSettings.dndScheduleEnabled && (
                    <div className="grid gap-3 border-b border-slate-100 py-4 dark:border-slate-800 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('quietStart') || (isVietnamese ? 'Bắt đầu' : 'Start')}</span>
                        <input type="time" value={notificationSettings.dndScheduleStart || '18:00'} onChange={event => setNotificationSettings(previous => ({ ...previous, dndScheduleStart: event.target.value }))} className={inputClass} />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('quietEnd') || (isVietnamese ? 'Kết thúc' : 'End')}</span>
                        <input type="time" value={notificationSettings.dndScheduleEnd || '08:00'} onChange={event => setNotificationSettings(previous => ({ ...previous, dndScheduleEnd: event.target.value }))} className={inputClass} />
                      </label>
                    </div>
                  )}
                  <SettingRow title={isVietnamese ? 'Cho phép cảnh báo khẩn cấp' : 'Allow Urgent Alerts'} description={isVietnamese ? 'Hạn chót và cảnh báo quan trọng vẫn được gửi trong Không làm phiền.' : 'Deadlines and critical alerts can bypass Do Not Disturb.'}>
                    <Toggle checked={!!notificationSettings.dndAllowUrgent} onChange={value => setNotificationSettings(previous => ({ ...previous, dndAllowUrgent: value }))} label="Allow urgent alerts" />
                  </SettingRow>
                  <SettingRow title={t('alertFrequency') || (isVietnamese ? 'Tần suất cảnh báo' : 'Alert Frequency')} description={t('alertFrequencyDesc') || (isVietnamese ? 'Gom nhóm thông báo để giảm gián đoạn.' : 'Group notifications to minimize disruptions.')}>
                    <Select value={notificationSettings.frequencyLimit} onChange={v => setNotificationSettings(previous => ({ ...previous, frequencyLimit: v as NotificationSettings['frequencyLimit'] }))} className="w-44" ariaLabel={t('alertFrequency') || 'Alert Frequency'} options={[
                      { value: 'all', label: t('freqAll') || (isVietnamese ? 'Mọi cập nhật' : 'All updates') },
                      { value: 'throttled', label: t('freqThrottled') || (isVietnamese ? 'Nhóm thông minh' : 'Smart throttling') },
                      { value: 'minimal', label: t('freqMinimal') || (isVietnamese ? 'Tối thiểu' : 'Minimal only') },
                    ]} />
                  </SettingRow>
                  <SettingRow title={isVietnamese ? 'Thời gian hiển thị' : 'Display Duration'} description={isVietnamese ? 'Khoảng thời gian toast xuất hiện trước khi tự đóng.' : 'How long each toast remains visible.'} last>
                    <div className="flex items-center gap-2">
                      <Select<number> value={notificationSettings.toastDuration} onChange={v => setNotificationSettings(previous => ({ ...previous, toastDuration: v }))} className="w-32" ariaLabel={isVietnamese ? 'Thời gian hiển thị' : 'Display Duration'} options={[
                        { value: 2500, label: '2.5 giây' },
                        { value: 4000, label: '4 giây' },
                        { value: 6000, label: '6 giây' },
                        { value: 10000, label: '10 giây' },
                      ]} />
                      <button type="button" onClick={() => triggerToast?.('deadline', isVietnamese ? 'Thông báo thử nghiệm' : 'Test notification', isVietnamese ? 'Các thiết lập âm thanh, thời lượng và tập trung đang hoạt động.' : 'Sound, duration and focus settings are working.')} className="h-10 rounded-xl border border-slate-200 px-3 text-[10px] font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        {isVietnamese ? 'Gửi thử' : 'Send test'}
                      </button>
                    </div>
                  </SettingRow>
                </SettingsCard>
              </>
            )}

            {activeTab === 'ai_usage' && (
              <>
                <SectionHeader 
                  eyebrow={t('aiCopilotConfig') || (isVietnamese ? 'Lớp trí tuệ' : 'Intelligence Layer')} 
                  title={t('aiCopilotConfig') || (isVietnamese ? 'Cấu hình Apexa AI' : 'Apexa AI Configuration')} 
                  description={t('aiCopilotConfigDesc') || (isVietnamese ? 'Kiểm soát mô hình dùng để tóm tắt, tạo công việc và hỗ trợ năng suất.' : 'Control AI models for task creation, summarization and productivity reports.')} 
                  action={<div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${currentUser?.isPremium ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400'}`}>{currentUser?.isPremium ? (isVietnamese ? 'Đã kích hoạt' : 'Active') : (isVietnamese ? 'Yêu cầu gói trả phí' : 'Paid plan required')}</div>} 
                />
                
                <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 dark:border-sky-900/60 dark:from-sky-950/30 dark:via-slate-900 dark:to-blue-950/20">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{isVietnamese ? 'AI được Apexa quản lý an toàn' : 'Secure, Apexa-managed AI'}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {isVietnamese ? 'Khóa nhà cung cấp chỉ tồn tại trên máy chủ. Apexa không nhận, lưu hoặc gửi khóa AI cá nhân từ trình duyệt của người dùng.' : 'Provider credentials stay on the server. Apexa never accepts, stores, or forwards personal AI keys from the browser.'}
                      </p>
                      {!currentUser?.isPremium && <button type="button" onClick={() => setShowPremiumModal(true)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-sky-700"><Sparkles className="h-3.5 w-3.5" />{isVietnamese ? 'Xem gói có AI' : 'View AI plans'}</button>}
                    </div>
                  </div>
                </div>

                <SettingsCard title={isVietnamese ? 'Môi trường Apexa AI' : 'Apexa AI Runtime'} description={isVietnamese ? 'Tùy chỉnh cách AI phản hồi trong phạm vi hạn mức của gói đăng ký.' : 'Customize AI responses within your subscription allowance.'} icon={Zap}>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="min-w-0"><p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{isVietnamese ? 'Thông tin xác thực do máy chủ quản lý' : 'Server-managed credentials'}</p><p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{isVietnamese ? 'Không hỗ trợ khóa API cá nhân (BYOK).' : 'Personal API keys (BYOK) are not supported.'}</p></div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /></div>
                    </div>

                    <fieldset disabled={!currentUser?.isPremium} className="grid gap-4 sm:grid-cols-2 disabled:opacity-50">
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('aiModelLabel') || (isVietnamese ? 'Mô hình AI' : 'AI Model')}</span>
                        <Select value={aiModel} onChange={setAiModel} className="w-full" menuWidth={320} ariaLabel={t('aiModelLabel') || 'AI Model'} options={[
                          { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', description: isVietnamese ? 'Khuyên dùng · Stable mới nhất' : 'Recommended · Latest stable' },
                          { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: isVietnamese ? 'Phân tích và tác vụ agentic' : 'Analysis and agentic tasks' },
                          { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', description: isVietnamese ? 'Nhanh và tiết kiệm' : 'Fast and cost-efficient' },
                          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: isVietnamese ? 'Tư duy chuyên sâu · Stable' : 'Deep reasoning · Stable' },
                          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: isVietnamese ? 'Cân bằng · Stable' : 'Balanced · Stable' },
                          { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: isVietnamese ? 'Tải lớn · Stable' : 'High throughput · Stable' },
                        ]} />
                      </label>
                      <label className="space-y-1.5">
                        <span className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>{t('temperatureLabel') || (isVietnamese ? 'Mức sáng tạo (Temperature)' : 'Creativity (Temperature)')}</span>
                          <span className="font-mono text-sky-500 font-bold">{aiTemperature.toFixed(1)}</span>
                        </span>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          value={aiTemperature} 
                          onChange={event => setAiTemperature(Number(event.target.value))} 
                          className="mt-3 w-full accent-sky-500 cursor-pointer" 
                        />
                      </label>
                    </fieldset>

                    <SettingRow title={t('searchGrounding') || (isVietnamese ? 'Tìm kiếm làm cơ sở (Google Search Grounding)' : 'Google Search Grounding')} description={t('searchGroundingDesc') || (isVietnamese ? 'Cho phép AI tra cứu và cập nhật dữ liệu web thời gian thực khi cần.' : 'Allow AI to browse live web data for accurate context.')} last>
                      <Toggle checked={aiSearchGrounding} onChange={setAiSearchGrounding} disabled={!currentUser?.isPremium} label="Google Search Grounding" />
                    </SettingRow>

                    <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        type="button" 
                        onClick={testAiConnection} 
                        disabled={testingAi} 
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {testingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                        {testingAi ? (t('testingAiConnection') || 'Testing...') : currentUser?.isPremium ? (isVietnamese ? 'Kiểm tra dịch vụ' : 'Test service') : (isVietnamese ? 'Nâng cấp để kiểm tra' : 'Upgrade to test')}
                      </button>
                      <button 
                        type="button" 
                        onClick={saveAiSettings} 
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 text-xs font-extrabold text-white transition-colors shadow-sm cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {currentUser?.isPremium ? (t('saveSettings') || (isVietnamese ? 'Lưu cấu hình' : 'Save Configuration')) : (isVietnamese ? 'Nâng cấp để dùng AI' : 'Upgrade for AI')}
                      </button>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title={t('dailyBriefingToggle') || (isVietnamese ? 'Bản tin công việc hằng ngày' : 'Daily Morning Briefing')} description={t('dailyBriefingToggleDesc') || (isVietnamese ? 'Cho phép Apexa Brain xem xét không gian và gửi một bản tin hành động mỗi ngày.' : 'Automatically analyze overdue and upcoming tasks each morning.')} icon={Brain}>
                  <SettingRow title={t('dailyBriefingToggle') || (isVietnamese ? 'Bản tin AI hằng ngày' : 'Daily AI Briefing')} description={isVietnamese ? 'Rà soát việc quá hạn, đến hạn hôm nay, bị chặn và ưu tiên cao mỗi ngày một lần.' : 'Review overdue, due today, blocked and high priority tasks daily.'}>
                    <Toggle checked={aiDailyBriefingEnabled} onChange={setAiDailyBriefingEnabled} disabled={!currentUser?.isPremium} label="Daily AI Briefing" />
                  </SettingRow>
                  <SettingRow title={t('briefingTime') || (isVietnamese ? 'Giờ gửi bản tin' : 'Briefing Time')} description={isVietnamese ? 'Nếu Apexa được mở muộn hơn, bản tin sẽ được gửi trong lần mở ứng dụng tiếp theo.' : 'If opened later, the briefing will show on next launch.'} last>
                    <input type="time" value={aiDailyBriefingTime} disabled={!currentUser?.isPremium || !aiDailyBriefingEnabled} onChange={event => setAiDailyBriefingTime(event.target.value)} className={`${inputClass} w-36 disabled:opacity-50`} />
                  </SettingRow>
                </SettingsCard>
              </>
            )}

            {activeTab === 'audit_logs' && (
              <>
                <SectionHeader 
                  eyebrow={t('activityAuditLogs') || (isVietnamese ? 'Nhật ký hoạt động' : 'Activity Audit')} 
                  title={t('activityAuditLogs') || (isVietnamese ? 'Nhật ký hoạt động Workspace' : 'Workspace Activity Logs')} 
                  description={t('activityAuditLogsDesc') || (isVietnamese ? 'Ghi nhận chi tiết mọi thay đổi từ chủ sở hữu và các thành viên: tạo mới, chỉnh sửa, phân quyền và cộng tác.' : 'Detailed record of workspace actions: creation, edits, assignments, and collaboration.')} 
                  action={
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={copyAuditLogs}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedLogs ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                        {copiedLogs ? (t('copied') || 'Copied!') : (t('copyCode') || (isVietnamese ? 'Sao chép nhật ký' : 'Copy Logs'))}
                      </button>
                    </div>
                  } 
                />

                <SettingsCard 
                  title={isVietnamese ? 'Lịch sử hoạt động của người dùng' : 'User Activity Feed'} 
                  description={isVietnamese ? `Đang hiển thị ${filteredLogs.length} hoạt động gần nhất trong Workspace` : `Showing ${filteredLogs.length} recent actions in Workspace`} 
                  icon={FileClock}
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input 
                          value={logSearch} 
                          onChange={event => setLogSearch(event.target.value)} 
                          placeholder={isVietnamese ? 'Tìm người thực hiện, thao tác hoặc thời gian...' : 'Search author, action, or timestamp...'} 
                          className={`${inputClass} pl-9`} 
                        />
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {[
                          { id: 'all', label: isVietnamese ? 'Tất cả' : 'All' },
                          { id: 'task', label: isVietnamese ? 'Công việc' : 'Tasks' },
                          { id: 'space', label: isVietnamese ? 'Không gian & Danh sách' : 'Spaces & Lists' },
                          { id: 'doc', label: isVietnamese ? 'Tài liệu' : 'Docs' },
                          { id: 'workspace', label: isVietnamese ? 'Workspace' : 'Workspace' },
                          { id: 'member', label: isVietnamese ? 'Thành viên' : 'Members' },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setLogCategory(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                              logCategory === tab.id
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800/80 px-4">
                      {filteredLogs.length ? (
                        filteredLogs.map(log => {
                          const isTask = log.category === 'task' || log.action.toLowerCase().includes('công việc') || log.action.toLowerCase().includes('task');
                          const isSpace = log.category === 'space' || log.action.toLowerCase().includes('không gian') || log.action.toLowerCase().includes('thư mục') || log.action.toLowerCase().includes('danh sách') || log.action.toLowerCase().includes('space');
                          const isDoc = log.category === 'doc' || log.action.toLowerCase().includes('tài liệu') || log.action.toLowerCase().includes('doc');
                          const isMember = log.category === 'member' || log.action.toLowerCase().includes('thành viên') || log.action.toLowerCase().includes('lời mời') || log.action.toLowerCase().includes('member');

                          return (
                            <div key={log.id} className="flex items-center gap-3.5 py-3.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 -mx-4 px-4">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isTask ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50' :
                                isSpace ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50' :
                                isDoc ? 'bg-amber-50 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50' :
                                isMember ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50'
                              }`}>
                                {isTask ? <CheckSquare className="w-4 h-4" /> :
                                 isSpace ? <FolderTree className="w-4 h-4" /> :
                                 isDoc ? <FileText className="w-4 h-4" /> :
                                 isMember ? <Users className="w-4 h-4" /> :
                                 <Building2 className="w-4 h-4" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                  {log.action}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400">
                                    {isVietnamese ? 'Bởi' : 'By'} <span className="font-extrabold text-slate-600 dark:text-slate-300">{log.userName || currentUser?.name || (isVietnamese ? 'Chủ sở hữu' : 'Owner')}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                                    {log.time}
                                  </span>
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                                {isTask ? (isVietnamese ? 'Công việc' : 'Task') : isSpace ? (isVietnamese ? 'Không gian' : 'Space') : isDoc ? (isVietnamese ? 'Tài liệu' : 'Doc') : isMember ? (isVietnamese ? 'Thành viên' : 'Member') : (isVietnamese ? 'Hệ thống' : 'System')}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center">
                          <FileClock className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />
                          <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">{isVietnamese ? 'Không tìm thấy hoạt động phù hợp' : 'No matching activities found'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{isVietnamese ? 'Các thao tác tạo, sửa và quản lý workspace sẽ tự động xuất hiện tại đây.' : 'Created, updated, and managed items will automatically log here.'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <SectionHeader 
                  eyebrow={t('settingsSecurity') || (isVietnamese ? 'Bảo vệ tài khoản' : 'Account Security')} 
                  title={t('securityAndSessions') || (isVietnamese ? 'Bảo mật và xác thực' : 'Security & Authentication')} 
                  description={t('securityAndSessionsDesc') || (isVietnamese ? 'Kiểm tra danh tính và trạng thái phiên đăng nhập của bạn.' : 'Review credentials, active sessions and account safeguards.')} 
                />
                <SettingsCard title={isVietnamese ? 'Tài khoản đang đăng nhập' : 'Active Account'} description={isVietnamese ? 'Danh tính Apexa và vai trò hiện tại của bạn.' : 'Your Apexa credentials and active role.'} icon={UserRoundCog}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <SignedImage filePath={currentUser?.avatar || ''} alt={currentUser?.name || 'User'} className="h-14 w-14 overflow-hidden rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{currentUser?.name || 'Apexa User'}</p>
                      <p className="mt-1 text-xs text-slate-500">{currentUser?.email || 'No email set'}</p>
                    </div>
                    <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                      {currentUser?.role === 'admin' ? (t('admin') || 'Admin') : (t('member') || 'Member')}
                    </span>
                  </div>
                </SettingsCard>

                <SettingsCard title={isVietnamese ? 'Đổi mật khẩu' : 'Change Password'} description={isVietnamese ? 'Dùng mật khẩu mạnh và không sử dụng lại từ dịch vụ khác.' : 'Use a strong password that is unique to Apexa.'} icon={KeyRound}>
                  <form onSubmit={updatePassword} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Mật khẩu hiện tại' : 'Current password'}</span>
                        <input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder={isVietnamese ? 'Nếu tài khoản có mật khẩu' : 'If your account has one'} className={inputClass} />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Mật khẩu mới' : 'New password'}</span>
                        <input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className={inputClass} />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Nhập lại mật khẩu' : 'Confirm password'}</span>
                        <input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClass} />
                      </label>
                    </div>
                    {newPassword && (
                      <div className="space-y-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-3.5 border border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {t('passwordStrengthTitle') || (isVietnamese ? 'Độ mạnh mật khẩu' : 'Password strength')}
                          </span>
                          <span className={`font-extrabold text-[11px] ${
                            passwordStrength.score <= 1 
                              ? 'text-rose-500' 
                              : passwordStrength.score === 2 
                                ? 'text-amber-500' 
                                : passwordStrength.score === 3 
                                  ? 'text-sky-500' 
                                  : 'text-emerald-500'
                          }`}>
                            {passwordStrength.score <= 1
                              ? (isVietnamese ? 'Yếu' : 'Weak')
                              : passwordStrength.score === 2
                                ? (isVietnamese ? 'Trung bình' : 'Fair')
                                : passwordStrength.score === 3
                                  ? (isVietnamese ? 'Khá tốt' : 'Good')
                                  : (isVietnamese ? 'Mạnh' : 'Strong')}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                          {[1, 2, 3, 4].map(seg => (
                            <div
                              key={seg}
                              className={`rounded-full transition-colors ${
                                passwordStrength.score >= seg
                                  ? passwordStrength.score <= 1
                                    ? 'bg-rose-500'
                                    : passwordStrength.score === 2
                                      ? 'bg-amber-500'
                                      : passwordStrength.score === 3
                                        ? 'bg-sky-500'
                                        : 'bg-emerald-500'
                                  : 'bg-slate-200 dark:bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          <div className={`flex items-center gap-1.5 text-[11px] ${passwordStrength.hasLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                            {passwordStrength.hasLength ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-0.5 mr-1" />}
                            <span>{t('passwordRequirementLength') || (isVietnamese ? 'Tối thiểu 10 ký tự' : 'At least 10 characters')}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[11px] ${passwordStrength.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                            {passwordStrength.hasUpper ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-0.5 mr-1" />}
                            <span>{t('passwordRequirementUpper') || (isVietnamese ? 'Chữ hoa (A-Z)' : 'Uppercase letter (A-Z)')}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[11px] ${passwordStrength.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                            {passwordStrength.hasLower ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-0.5 mr-1" />}
                            <span>{t('passwordRequirementLower') || (isVietnamese ? 'Chữ thường (a-z)' : 'Lowercase letter (a-z)')}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[11px] ${passwordStrength.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                            {passwordStrength.hasNumber ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 ml-0.5 mr-1" />}
                            <span>{t('passwordRequirementNumber') || (isVietnamese ? 'Chữ số (0-9)' : 'Number (0-9)')}</span>
                          </div>
                          {confirmPassword && (
                            <div className={`flex items-center gap-1.5 text-[11px] sm:col-span-2 ${passwordStrength.isMatch ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-500 font-semibold'}`}>
                              {passwordStrength.isMatch ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-rose-400 ml-0.5 mr-1" />}
                              <span>{t('passwordMatch') || (isVietnamese ? 'Mật khẩu khớp nhau' : 'Passwords match')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {passwordError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">{passwordError}</p>}
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <p className="text-[10px] leading-4 text-slate-400">{isVietnamese ? 'Tối thiểu 10 ký tự, gồm chữ hoa, chữ thường và số.' : 'At least 10 characters with uppercase, lowercase and a number.'}</p>
                      <button type="submit" disabled={updatingPassword || !newPassword || !confirmPassword} className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:opacity-40">
                        {updatingPassword && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}{isVietnamese ? 'Cập nhật mật khẩu' : 'Update password'}
                      </button>
                    </div>
                  </form>
                </SettingsCard>

                <SettingsCard
                  title={t('authenticatorApp') || (isVietnamese ? 'Ứng dụng Authenticator (TOTP)' : 'Authenticator App (TOTP)')}
                  description={t('authenticatorDesc') || (isVietnamese ? 'Bảo vệ tài khoản bằng mã OTP 6 chữ số từ Google Authenticator, Microsoft Authenticator hoặc Apple Keychain khi đăng nhập.' : 'Protect your account with 6-digit TOTP codes from any authenticator app.')}
                  icon={ShieldCheck}
                  action={
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-extrabold ${isMfaActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isMfaActive
                          ? (isVietnamese ? 'Đang bật' : 'Enabled')
                          : (isVietnamese ? 'Đang tắt' : 'Disabled')}
                      </span>
                      <Toggle
                        checked={isMfaActive || Boolean(mfaEnrollment)}
                        onChange={handleToggleMfa}
                        disabled={mfaBusy}
                        label={isVietnamese ? 'Bật/tắt ứng dụng xác thực' : 'Toggle Authenticator 2FA'}
                      />
                    </div>
                  }
                >
                  {mfaEnrollment ? (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50/80 px-3.5 py-2.5 dark:bg-sky-950/30 border border-blue-200/80 dark:border-sky-900/40">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-sky-300">
                          <Smartphone className="h-4 w-4 shrink-0" />
                          <span>{isVietnamese ? 'Đang thiết lập Authenticator (Bước 1/2)' : 'Setting up Authenticator (Step 1/2)'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={cancelMfaEnrollment}
                          disabled={mfaBusy}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {t('cancel') || (isVietnamese ? 'Hủy' : 'Cancel')}
                        </button>
                      </div>

                      <div className="grid gap-6 md:grid-cols-[200px_1fr] items-start">
                        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-white text-center">
                          <div className="h-44 w-44 flex items-center justify-center overflow-hidden rounded-xl bg-white">
                            <img
                              src={mfaEnrollment.qrCode}
                              alt="Authenticator QR Code"
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-slate-500">
                            {isVietnamese ? 'Quét bằng camera trong app' : 'Scan in authenticator app'}
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">1</span>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {t('authenticatorStep1') || (isVietnamese ? 'Mở Google Authenticator, Microsoft Authenticator hoặc Apple Keychain trên điện thoại.' : 'Open Google Authenticator, Microsoft Authenticator or Apple Keychain.')}
                              </p>
                            </div>

                            <div className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">2</span>
                              <div className="space-y-1.5 flex-1">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {t('authenticatorStep2') || (isVietnamese ? 'Quét mã QR bên cạnh hoặc sao chép khóa bí mật thiết lập thủ công:' : 'Scan the QR code or enter this secret key manually:')}
                                </p>
                                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 px-3 py-1.5">
                                  <code className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 select-all break-all">
                                    {mfaEnrollment.secret}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(mfaEnrollment.secret);
                                      setCopiedSecret(true);
                                      triggerToast?.('info', t('secretCopied') || (isVietnamese ? 'Đã sao chép khóa bí mật' : 'Secret copied'), mfaEnrollment.secret);
                                      setTimeout(() => setCopiedSecret(false), 2500);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 shrink-0 cursor-pointer"
                                  >
                                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedSecret ? (isVietnamese ? 'Đã chép' : 'Copied') : (isVietnamese ? 'Sao chép' : 'Copy')}</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5 pt-1">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">3</span>
                              <div className="space-y-2 flex-1">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {t('authenticatorStep3') || (isVietnamese ? 'Điền mã 6 chữ số xuất hiện trên ứng dụng để kích hoạt:' : 'Enter the 6-digit code from your app to activate:')}
                                </p>
                                <div className="pt-1 flex flex-col items-start gap-3">
                                  <OtpCodeInput
                                    id="enrollment-otp"
                                    value={mfaCode}
                                    onChange={(val) => {
                                      setMfaCode(val);
                                      if (mfaError) setMfaError('');
                                    }}
                                    onComplete={(code) => verifyMfaEnrollment(code)}
                                    disabled={mfaBusy}
                                    hasError={Boolean(mfaError)}
                                    autoFocus
                                  />
                                  {mfaError && (
                                    <p role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                      <span>{mfaError}</span>
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => verifyMfaEnrollment()}
                                      disabled={mfaBusy || mfaCode.length !== 6}
                                      className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-black text-white shadow-md transition disabled:opacity-40 cursor-pointer"
                                    >
                                      {mfaBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                      <span>{t('verifyAndEnable') || (isVietnamese ? 'Xác minh và Bật 2FA' : 'Verify & Enable 2FA')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelMfaEnrollment}
                                      disabled={mfaBusy}
                                      className="h-9.5 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                                    >
                                      {t('cancel') || (isVietnamese ? 'Hủy' : 'Cancel')}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isMfaActive && verifiedMfaFactor ? (
                    <div className="space-y-4 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                                {verifiedMfaFactor.friendly_name || 'Apexa Authenticator'}
                              </h4>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {isVietnamese ? 'Đang bảo vệ' : 'Active'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-300/80">
                              {isVietnamese
                                ? 'Tài khoản của bạn được bảo vệ bằng mã 6 số từ ứng dụng Authenticator mỗi lần đăng nhập.'
                                : 'Your account is protected by 6-digit TOTP codes whenever you sign in.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDisableMfaModal(verifiedMfaFactor.id)}
                          disabled={mfaBusy}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-sm transition dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t('disable2FA') || (isVietnamese ? 'Tắt Authenticator' : 'Disable 2FA')}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span className="font-semibold">{isVietnamese ? 'Ứng dụng tương thích:' : 'Supported apps:'}</span>
                        {['Google Authenticator', 'Microsoft Authenticator', '1Password', 'Apple Keychain', 'Authy'].map(appName => (
                          <span key={appName} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                            {appName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {t('twoFactorDisabled') || (isVietnamese ? 'Chưa kích hoạt xác thực hai bước' : 'Two-factor authentication is off')}
                          </p>
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {isVietnamese ? 'Tùy chọn' : 'Optional'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                          {isVietnamese
                            ? 'Bổ sung một lớp bảo mật thứ hai bằng mã xác thực 6 chữ số thay đổi mỗi 30 giây từ ứng dụng Google Authenticator, Microsoft Authenticator hoặc Apple Keychain.'
                            : 'Add a second layer of defense requiring a 6-digit TOTP code that refreshes every 30s from your authenticator app.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startMfaEnrollment}
                        disabled={mfaBusy}
                        className="inline-flex h-9.5 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-black text-white shadow-md transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {mfaBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        <span>{t('enable2FA') || (isVietnamese ? 'Bật Authenticator' : 'Enable 2FA')}</span>
                      </button>
                    </div>
                  )}
                </SettingsCard>

                <SettingsCard title={isVietnamese ? 'Trạng thái phiên' : 'Session Status'} description={isVietnamese ? 'Trình duyệt này đang có một phiên xác thực hoạt động.' : 'This device has an active authenticated session.'} icon={LockKeyhole}>
                  <SettingRow title={isVietnamese ? 'Thiết bị hiện tại' : 'Current Device'} description={`${typeof navigator !== 'undefined' ? navigator.platform : 'Browser'} · ${sessionDetails?.lastSignIn ? new Date(sessionDetails.lastSignIn).toLocaleString(locale) : (isVietnamese ? 'Đang hoạt động' : 'Active')}`}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {isVietnamese ? 'Hiện tại' : 'Current'}
                    </span>
                  </SettingRow>
                  <SettingRow title={isVietnamese ? 'Đăng xuất các thiết bị khác' : 'Sign Out Other Devices'} description={isVietnamese ? 'Thu hồi refresh token trên mọi phiên khác nhưng giữ thiết bị này.' : 'Revoke refresh tokens on every other session while keeping this device active.'}>
                    <button type="button" onClick={revokeOtherSessions} disabled={revokingSessions} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                      {revokingSessions ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}{isVietnamese ? 'Thu hồi phiên khác' : 'Revoke others'}
                    </button>
                  </SettingRow>
                  <SettingRow title={t('signOut') || (isVietnamese ? 'Đăng xuất' : 'Sign Out')} description={isVietnamese ? 'Kết thúc phiên trình duyệt hiện tại một cách an toàn.' : 'Safely end the current session.'} last>
                    <button type="button" onClick={onLogout} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 cursor-pointer">
                      <LogOut className="h-3.5 w-3.5" />{t('signOut') || 'Sign Out'}
                    </button>
                  </SettingRow>
                </SettingsCard>
              </>
            )}

            {activeTab === 'data_export' && (
              <>
                <SectionHeader 
                  eyebrow={t('settingsDataExport') || (isVietnamese ? 'Quyền sở hữu dữ liệu' : 'Data Ownership')} 
                  title={t('dataAndStorage') || (isVietnamese ? 'Dữ liệu và lưu trữ' : 'Data & Storage')} 
                  description={t('dataAndStorageDesc') || (isVietnamese ? 'Nắm rõ dữ liệu được lưu, tạo bản sao lưu và quản lý bộ nhớ đệm giao diện.' : 'Export data backups and manage local caching.')} 
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: t('tasks') || (isVietnamese ? 'Công việc' : 'Tasks'), value: tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id).length, icon: Archive, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
                    { label: t('members') || (isVietnamese ? 'Thành viên' : 'Members'), value: members.length, icon: UsersRound, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
                    { label: t('systemLogs') || (isVietnamese ? 'Sự kiện' : 'Events'), value: syncLogs.length, icon: Activity, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' }
                  ].map(metric => (
                    <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.tone}`}><metric.icon className="h-4 w-4" /></div>
                      <p className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{metric.value}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{metric.label}</p>
                    </div>
                  ))}
                </div>
                <SettingsCard title={t('exportWorkspaceData') || (isVietnamese ? 'Xuất dữ liệu không gian' : 'Export Workspace Data')} description={t('exportWorkspaceDataDesc') || (isVietnamese ? 'Tải bản JSON dễ đọc gồm cấu hình, công việc, thành viên và hoạt động.' : 'Download all tasks, documents and member data as a JSON file.')} icon={Download}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"><Cloud className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Bản sao lưu JSON' : 'JSON Full Backup'}</p>
                        <p className="mt-1 text-xs text-slate-500">{isVietnamese ? 'Được tạo an toàn cục bộ trong trình duyệt.' : 'Generated securely in your browser.'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importSettingsBackup(file); }} />
                      <button type="button" onClick={() => backupInputRef.current?.click()} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />{isVietnamese ? 'Nhập cài đặt' : 'Import Settings'}
                      </button>
                      <button type="button" onClick={exportWorkspaceData} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white hover:bg-indigo-700 cursor-pointer">
                        <Download className="h-3.5 w-3.5" />{t('exportData') || (isVietnamese ? 'Xuất dữ liệu' : 'Export Data')}
                      </button>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard 
                  title={t('exportTasksCsv') || (isVietnamese ? 'Xuất công việc ra bảng tính (CSV)' : 'Export Tasks (CSV)')} 
                  description={t('exportTasksCsvDesc') || (isVietnamese ? 'Tải công việc dạng bảng tính CSV tương thích với Microsoft Excel và Google Sheets.' : 'Download tasks as a CSV spreadsheet compatible with Excel & Google Sheets.')} 
                  icon={FileSpreadsheet}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Tệp bảng tính công việc (.csv)' : 'Task Spreadsheet (.csv)'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {isVietnamese 
                            ? `Bao gồm ${tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id).length} công việc trong không gian này.` 
                            : `Includes ${tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id).length} tasks in this workspace.`}
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={exportTasksToCsv} 
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white hover:bg-emerald-700 transition cursor-pointer shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{t('exportTasksCsv') || (isVietnamese ? 'Xuất tệp CSV' : 'Export CSV')}</span>
                    </button>
                  </div>
                </SettingsCard>

                <SettingsCard title={isVietnamese ? 'Bộ nhớ đệm cục bộ' : 'Local Cache'} description={isVietnamese ? 'Đặt lại tùy chọn hiển thị trên thiết bị mà không xóa dữ liệu không gian.' : 'Reset device display preferences without touching cloud data.'} icon={RefreshCw}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Bộ nhớ đệm giao diện' : 'UI Display Cache'}</p>
                      <p className="mt-1 text-xs text-slate-500">{isVietnamese ? 'Xóa cài đặt màu và bộ đệm tạm thời trên trình duyệt này.' : 'Clear temporary visual caches on this browser.'}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={resetDisplayPreferences}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />{isVietnamese ? 'Đặt lại giao diện' : 'Reset Display'}
                    </button>
                  </div>
                </SettingsCard>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Modal: Create Workspace */}
      <AnimatePresence>
        {createWorkspaceOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreateWorkspaceOpen(false)} className="absolute inset-0 bg-slate-950/50 cursor-pointer" />
            <motion.form initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onSubmit={createWorkspace} className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-slate-950 dark:text-white">{t('createWorkspace') || (isVietnamese ? 'Tạo không gian làm việc' : 'Create Workspace')}</h3>
                  <p className="mt-1 text-xs text-slate-500">{isVietnamese ? 'Bắt đầu với tên, màu sắc và ảnh bìa tùy chọn.' : 'Start with name, theme color and optional cover.'}</p>
                </div>
                <button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-5 p-5">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('workspaceName') || (isVietnamese ? 'Tên không gian' : 'Workspace Name')}</span>
                  <input autoFocus required value={newWorkspaceName} onChange={event => setNewWorkspaceName(event.target.value)} placeholder={isVietnamese ? 'Sản phẩm, Tiếp thị, Vận hành…' : 'Engineering, Marketing, Operations...'} className={inputClass} />
                </label>
                <div>
                  <p className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('brandColor') || (isVietnamese ? 'Màu thương hiệu' : 'Brand Color')}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {accentOptions.map(option => (
                      <button type="button" key={option.id} onClick={() => setNewWorkspaceTheme(option.id)} className={`h-11 rounded-xl bg-gradient-to-br ${option.className} cursor-pointer ${newWorkspaceTheme === option.id ? 'ring-3 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'}`} aria-label={option.name} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{t('changeCover') || (isVietnamese ? 'Ảnh bìa' : 'Cover Image')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {WORKSPACE_COVERS.slice(0, 3).map(cover => (
                      <button type="button" key={cover.id} onClick={() => setNewWorkspaceCover(cover.url)} className={`aspect-[16/8] overflow-hidden rounded-lg cursor-pointer ${newWorkspaceCover === cover.url ? 'ring-3 ring-indigo-500' : ''}`}>
                        <img src={cover.url} alt={cover.name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="h-9 rounded-xl px-4 text-xs font-extrabold text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                  {t('cancel') || 'Cancel'}
                </button>
                <button type="submit" disabled={!newWorkspaceName.trim()} className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer">
                  {t('createWorkspaceBtn') || 'Create Workspace'}
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {/* Modal: Delete Workspace */}
        {deleteWorkspace && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteWorkspace(null)} className="absolute inset-0 bg-slate-950/60 cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900 dark:bg-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">
                {isVietnamese ? `Xóa “${deleteWorkspace.name}”?` : `Delete "${deleteWorkspace.name}"?`}
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {isVietnamese ? 'Không thể hoàn tác thao tác này. Hãy nhập tên không gian để xác nhận xóa vĩnh viễn.' : 'This action cannot be undone. Type the workspace name to confirm.'}
              </p>
              <input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} placeholder={deleteWorkspace.name} className={`${inputClass} mt-5`} />
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => { setDeleteWorkspace(null); setDeleteConfirmation(''); }} className="h-9 rounded-xl px-4 text-xs font-extrabold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                  {t('cancel') || 'Cancel'}
                </button>
                <button type="button" disabled={deleteConfirmation !== deleteWorkspace.name} onClick={() => { onDeleteWorkspace?.(deleteWorkspace.id); onAddSyncLog?.(isVietnamese ? `Đã xóa không gian “${deleteWorkspace.name}”` : `Deleted workspace "${deleteWorkspace.name}"`); setDeleteWorkspace(null); setDeleteConfirmation(''); }} className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-extrabold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />{t('deletePermanently') || (isVietnamese ? 'Xóa vĩnh viễn' : 'Delete Permanently')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Confirm Disable MFA */}
        {confirmDisableMfaModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDisableMfaModal(null)} className="absolute inset-0 bg-slate-950/60 cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">
                {t('disableAuthenticatorConfirmTitle') || (isVietnamese ? 'Xác nhận tắt Authenticator?' : 'Disable Authenticator?')}
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t('disableAuthenticatorConfirmDesc') || (isVietnamese ? 'Tài khoản của bạn sẽ không còn được yêu cầu mã bảo mật 6 chữ số khi đăng nhập. Bạn có thể bật lại bất kỳ lúc nào.' : 'Your account will no longer require a 6-digit verification code when logging in. You can re-enable it anytime.')}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmDisableMfaModal(null)} className="h-9 rounded-xl px-4 text-xs font-extrabold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                  {t('cancel') || (isVietnamese ? 'Hủy' : 'Cancel')}
                </button>
                <button type="button" disabled={mfaBusy} onClick={() => removeMfaFactor(confirmDisableMfaModal)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-extrabold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">
                  {mfaBusy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {t('confirmDisable') || (isVietnamese ? 'Tắt 2FA' : 'Disable 2FA')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showSidebarOrderModal && (
        <SidebarOrderModal
          isOpen={showSidebarOrderModal}
          onClose={() => setShowSidebarOrderModal(false)}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
