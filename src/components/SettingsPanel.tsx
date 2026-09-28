"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, AlertTriangle, Archive, Bell, Brain, BriefcaseBusiness, Building2, Check,
  CheckCircle2, CheckSquare, ChevronRight, CircleUserRound, Clipboard, Clock, Cloud, Copy,
  Database, Download, FileClock, FileSpreadsheet, FileText, FolderTree, Globe2, KeyRound, Laptop,
  LayoutGrid, Link2, LockKeyhole, LogOut, Mail, Menu, MonitorCog, Moon, Palette, Play, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  Sun, Timer, Trash2, Upload, UserRoundCog, Users, UsersRound, Volume2, VolumeX, X,
  Zap, Smartphone, ShieldAlert, ArrowRight, Shield, RotateCcw
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
import {
  getTrashRetentionDays,
  setTrashRetentionDays,
  TRASH_RETENTION_OPTIONS,
} from '@/lib/trashUtils';

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

const inputClass = 'w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 px-3.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400';

function Toggle({ checked, onChange, disabled = false, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function SettingsCard({ title, description, icon: Icon, children, tone = 'default', action }: { title: string; description?: string; icon?: React.ElementType; children: React.ReactNode; tone?: 'default' | 'danger'; action?: React.ReactNode }) {
  return (
    <section className={`overflow-hidden rounded-2xl border transition-all ${
      tone === 'danger' 
        ? 'border-rose-200/80 bg-rose-500/[0.02] dark:border-rose-900/40 dark:bg-rose-950/10' 
        : 'border-slate-200/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/70 shadow-2xs'
    }`}>
      <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${
        tone === 'danger' 
          ? 'border-rose-100/80 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/20' 
          : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${
              tone === 'danger' 
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' 
                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className={`text-sm font-bold truncate ${
              tone === 'danger' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'
            }`}>{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">{description}</p>}
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
    <div className={`flex items-center justify-between gap-4 py-3.5 w-full ${last ? '' : 'border-b border-slate-100 dark:border-slate-800/60'}`}>
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{title}</p>
        <p className="mt-0.5 text-[11px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
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
    { id: 'indigo', name: isVietnamese ? 'Xanh Costack' : 'Costack Blue', hex: '#2563EB', className: 'bg-blue-600' },
    { id: 'ocean', name: isVietnamese ? 'Xanh biển' : 'Ocean Blue', hex: '#0284C7', className: 'bg-sky-600' },
    { id: 'forest', name: isVietnamese ? 'Xanh lục' : 'Forest Green', hex: '#10B981', className: 'bg-emerald-600' },
    { id: 'sunset', name: isVietnamese ? 'Hồng hoàng hôn' : 'Sunset Rose', hex: '#F43F5E', className: 'bg-rose-600' }
  ], [isVietnamese]);

  const navigationSections: Array<{ label: string; items: Array<{ id: SettingsTab; label: string; description: string; icon: React.ElementType; badge?: string | number }> }> = useMemo(() => [
    {
      label: t('workspaceCategory') || (isVietnamese ? 'Không gian làm việc' : 'Workspace'),
      items: [
        { id: 'general', label: t('settingsGeneral') || (isVietnamese ? 'Không gian làm việc' : 'Workspace'), description: t('settingsGeneralDesc') || (isVietnamese ? 'Nhận diện và thương hiệu' : 'Identity and branding'), icon: BriefcaseBusiness },
        { id: 'people', label: t('settingsPeople') || (isVietnamese ? 'Thành viên & Đội ngũ' : 'Members & Teams'), description: t('settingsPeopleDesc') || (isVietnamese ? 'Thành viên và phân quyền' : 'Members and access permissions'), icon: UsersRound, badge: members.length },
        { id: 'ai_usage', label: 'Costack AI', description: t('settingsAiDesc') || (isVietnamese ? 'Cấu hình mô hình' : 'AI Copilot & model config'), icon: ApexaAiIcon, badge: 'Pro' },
        { id: 'audit_logs', label: t('settingsAuditLogs') || (isVietnamese ? 'Nhật ký hoạt động' : 'Activity Log'), description: t('settingsAuditLogsDesc') || (isVietnamese ? 'Sự kiện trong không gian' : 'Workspace events & history'), icon: FileClock },
        { id: 'data_export', label: t('settingsDataExport') || (isVietnamese ? 'Dữ liệu & Lưu trữ' : 'Data & Storage'), description: t('settingsDataExportDesc') || (isVietnamese ? 'Xuất dữ liệu và thùng rác' : 'Export data & trash retention'), icon: Database }
      ]
    },
    {
      label: t('personalCategory') || (isVietnamese ? 'Cá nhân & Bảo mật' : 'Personal & Security'),
      items: [
        { id: 'preferences', label: t('settingsPreferences') || (isVietnamese ? 'Giao diện & Trải nghiệm' : 'Appearance'), description: t('settingsPreferencesDesc') || (isVietnamese ? 'Chủ đề và ngôn ngữ' : 'Theme, language and visuals'), icon: Palette },
        { id: 'notifications', label: t('settingsNotifications') || (isVietnamese ? 'Thông báo & Tập trung' : 'Notifications'), description: t('settingsNotificationsDesc') || (isVietnamese ? 'Cảnh báo và không làm phiền' : 'Alerts and focus mode'), icon: Bell },
        { id: 'security', label: t('settingsSecurity') || (isVietnamese ? 'Bảo mật & Tài khoản' : 'Security'), description: t('settingsSecurityDesc') || (isVietnamese ? 'Mật khẩu và xác thực 2FA' : 'Account & active sessions'), icon: ShieldCheck }
      ]
    }
  ], [t, isVietnamese, members.length]);

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

  // Workspace form state
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
  
  // Modals state
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceTheme, setNewWorkspaceTheme] = useState<AccentPreset>('indigo');
  const [newWorkspaceCover, setNewWorkspaceCover] = useState('');
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // AI state
  const [aiModel, setAiModel] = useState('gemini-3.6-flash');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiSearchGrounding, setAiSearchGrounding] = useState(false);
  const [aiDailyBriefingEnabled, setAiDailyBriefingEnabled] = useState(true);
  const [aiDailyBriefingTime, setAiDailyBriefingTime] = useState('08:00');
  const [testingAi, setTestingAi] = useState(false);

  // Trash retention state
  const [trashRetention, setTrashRetention] = useState<number>(() => getTrashRetentionDays());

  // Logs state
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Security state
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

  const backupInputRef = useRef<HTMLInputElement>(null);

  // Sync workspace fields from activeWorkspace
  const syncWorkspaceFields = useCallback(() => {
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
    syncWorkspaceFields();
  }, [syncWorkspaceFields]);

  // Dirty state detection for general workspace settings
  const isWorkspaceDirty = useMemo(() => {
    if (!activeWorkspace) return false;
    const wsSettings = (activeWorkspace.settings || {}) as any;
    return (
      workspaceName !== (activeWorkspace.name || '') ||
      workspaceCover !== (activeWorkspace.coverUrl || '') ||
      workspaceLogo !== (activeWorkspace.logoUrl || '') ||
      workspaceTheme !== ((activeWorkspace.theme as AccentPreset) || 'indigo') ||
      workspaceDescription !== (wsSettings.description || '') ||
      workspaceTimezone !== (wsSettings.timezone || 'Asia/Ho_Chi_Minh') ||
      workspaceWeekStartsOn !== (wsSettings.weekStartsOn || 'monday') ||
      workspaceDefaultRole !== (wsSettings.defaultRole || 'member') ||
      workspaceAllowInvites !== Boolean(wsSettings.allowMemberInvites) ||
      JSON.stringify(workspaceClickApps) !== JSON.stringify(wsSettings.defaultClickApps || {
        timeTracking: true,
        multipleAssignees: true,
        customFields: true,
        relationships: true,
        subtasks: true,
        priorities: true,
      })
    );
  }, [activeWorkspace, workspaceName, workspaceCover, workspaceLogo, workspaceTheme, workspaceDescription, workspaceTimezone, workspaceWeekStartsOn, workspaceDefaultRole, workspaceAllowInvites, workspaceClickApps]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (activeTab === 'general' && isWorkspaceDirty) {
          e.preventDefault();
          void saveWorkspace();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isWorkspaceDirty]);

  // Load AI configuration
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

  useEffect(() => {
    if (activeTab === 'notifications') {
      setBrowserPerm(getBrowserNotificationPermission());
    }
  }, [activeTab]);

  // Settings Search Items Index for smart navigation search
  const searchIndex = useMemo(() => [
    { tab: 'general' as SettingsTab, title: isVietnamese ? 'Tên & Nhận diện Workspace' : 'Workspace Name & Identity', desc: isVietnamese ? 'Logo, tên không gian, mô tả và ảnh bìa' : 'Logo, name, description and cover image' },
    { tab: 'general' as SettingsTab, title: isVietnamese ? 'Màu thương hiệu & Múi giờ' : 'Brand Theme & Timezone', desc: isVietnamese ? 'Tùy chỉnh màu sắc và múi giờ làm việc' : 'Custom theme color and working calendar timezone' },
    { tab: 'general' as SettingsTab, title: isVietnamese ? 'Tính năng chuyên sâu (ClickApps)' : 'Workspace Features (ClickApps)', desc: isVietnamese ? 'Time tracking, subtasks, mối liên kết, trường tùy chỉnh' : 'Time tracking, subtasks, relations, custom fields' },
    { tab: 'general' as SettingsTab, title: isVietnamese ? 'Xóa không gian làm việc' : 'Delete Workspace', desc: isVietnamese ? 'Khu vực nguy hiểm và xóa vĩnh viễn' : 'Danger zone and permanent deletion' },
    { tab: 'people' as SettingsTab, title: isVietnamese ? 'Thành viên & Đội ngũ' : 'Members & Teams', desc: isVietnamese ? 'Mời đồng đội, tổ chức nhóm và phân quyền' : 'Invite teammates, manage teams and permissions' },
    { tab: 'preferences' as SettingsTab, title: isVietnamese ? 'Ngôn ngữ & Khu vực' : 'Language & Region', desc: isVietnamese ? 'Chuyển đổi Tiếng Việt và Tiếng Anh' : 'Switch between Vietnamese and English' },
    { tab: 'preferences' as SettingsTab, title: isVietnamese ? 'Chế độ Sáng / Tối' : 'Color Mode (Dark / Light)', desc: isVietnamese ? 'Giao diện sáng, tối hoặc theo thiết bị' : 'Light, dark, or system mode' },
    { tab: 'preferences' as SettingsTab, title: isVietnamese ? 'Màu nhấn & Độ sâu giao diện' : 'Accent & Visual Depth', desc: isVietnamese ? 'Màu nhấn, mật độ hiển thị, âm thanh phản hồi' : 'Accent color, UI density, system sound feedback' },
    { tab: 'preferences' as SettingsTab, title: isVietnamese ? 'Sắp xếp module thanh bên' : 'Sidebar Modules Reorder', desc: isVietnamese ? 'Kéo thả sắp xếp vị trí các module thanh bên' : 'Rearrange navigation modules on sidebar' },
    { tab: 'notifications' as SettingsTab, title: isVietnamese ? 'Thông báo trên máy tính (Popup)' : 'Desktop Browser Notifications', desc: isVietnamese ? 'Nhận thông báo khi đến hạn công việc' : 'Receive instant desktop popups for deadlines' },
    { tab: 'notifications' as SettingsTab, title: isVietnamese ? 'Khung giờ yên tĩnh & Không làm phiền' : 'Quiet Hours & Focus Mode', desc: isVietnamese ? 'Tự động tắt tiếng thông báo trong giờ tập trung' : 'Mute non-urgent alerts during deep focus' },
    { tab: 'ai_usage' as SettingsTab, title: isVietnamese ? 'Mô hình Costack AI (Gemini)' : 'Costack AI Models (Gemini)', desc: isVietnamese ? 'Lựa chọn mô hình Gemini 3.6 Flash, 2.5 Pro và nhiệt độ' : 'Select Gemini models and creativity temperature' },
    { tab: 'ai_usage' as SettingsTab, title: isVietnamese ? 'Bản tin công việc buổi sáng' : 'Daily Morning Briefing', desc: isVietnamese ? 'Tự động rà soát việc quá hạn và ưu tiên mỗi ngày' : 'Automatic morning summary of deadlines and tasks' },
    { tab: 'audit_logs' as SettingsTab, title: isVietnamese ? 'Nhật ký hoạt động Workspace' : 'Workspace Activity Audit', desc: isVietnamese ? 'Lịch sử thao tác của các thành viên' : 'Detailed timeline of member actions' },
    { tab: 'security' as SettingsTab, title: isVietnamese ? 'Đổi mật khẩu tài khoản' : 'Change Password', desc: isVietnamese ? 'Cập nhật mật khẩu bảo mật' : 'Update your account password' },
    { tab: 'security' as SettingsTab, title: isVietnamese ? 'Xác thực hai bước 2FA / TOTP' : 'Two-Factor Authentication (2FA)', desc: isVietnamese ? 'Quét mã QR bằng Google Authenticator' : 'Protect login with authenticator app' },
    { tab: 'security' as SettingsTab, title: isVietnamese ? 'Phiên đăng nhập & Thiết bị' : 'Active Sessions & Devices', desc: isVietnamese ? 'Thu hồi phiên đăng nhập trên các thiết bị khác' : 'Sign out other active devices' },
    { tab: 'data_export' as SettingsTab, title: isVietnamese ? 'Xuất dữ liệu JSON / CSV' : 'Export JSON / CSV Backup', desc: isVietnamese ? 'Tải bản sao lưu công việc và dữ liệu không gian' : 'Download workspace tasks and backups' },
    { tab: 'data_export' as SettingsTab, title: isVietnamese ? 'Chính sách tự động dọn Thùng rác' : 'Trash Auto-Purge Policy', desc: isVietnamese ? 'Cấu hình tự động xóa vĩnh viễn sau 7, 14, 30 ngày' : 'Configure 7, 14, 30 days auto-deletion' },
  ], [isVietnamese]);

  const searchResults = useMemo(() => {
    if (!settingsSearch.trim()) return [];
    const query = settingsSearch.toLowerCase();
    return searchIndex.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.desc.toLowerCase().includes(query)
    );
  }, [settingsSearch, searchIndex]);

  const visibleNavigation = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(settingsSearch.toLowerCase()))
  })).filter(section => section.items.length > 0);

  // Filter logs
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
    link.download = `costack-tasks-${activeWorkspace?.name || 'workspace'}-${new Date().toISOString().slice(0, 10)}.csv`;
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
    onAddSyncLog?.(isVietnamese ? 'Đã cập nhật cấu hình Costack AI' : 'Updated Costack AI settings');
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
      onAddSyncLog?.(isVietnamese ? `Đã xác minh kết nối Costack AI (${aiModel})` : `Verified Costack AI connection (${aiModel})`);
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
    link.download = `costack-${activeWorkspace?.name || 'workspace'}-${new Date().toISOString().slice(0, 10)}.json`;
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
        throw new Error(isVietnamese ? 'Tệp này không phải bản sao lưu Costack hợp lệ.' : 'This is not a valid Costack backup.');
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
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Costack Authenticator' });
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
    <div className="relative flex flex-col md:flex-row h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── DESKTOP & MOBILE SIDEBAR ── */}
      {/* Mobile Slide-Over Drawer Backdrop */}
      <AnimatePresence>
        {mobileNavigationOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNavigationOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl md:shadow-none transition-transform duration-250 ease-out md:static md:translate-x-0 md:z-10 shrink-0
        ${mobileNavigationOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20">
              <Settings2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                {isVietnamese ? 'Cài đặt hệ thống' : 'Costack Settings'}
              </h1>
              <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                {activeWorkspace?.name || 'Workspace'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavigationOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search inside settings */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              value={settingsSearch} 
              onChange={event => setSettingsSearch(event.target.value)} 
              placeholder={isVietnamese ? 'Tìm nhanh cài đặt...' : 'Search settings...'} 
              className="h-8.5 w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 pl-8.5 pr-7 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900" 
            />
            {settingsSearch && (
              <button
                onClick={() => setSettingsSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Search Dropdown Results */}
          <AnimatePresence>
            {settingsSearch.trim() && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-3 right-3 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 space-y-1"
              >
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isVietnamese ? `Kết quả (${searchResults.length})` : `Matches (${searchResults.length})`}
                </p>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.tab);
                      setSettingsSearch('');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10.5px] text-slate-400 truncate">{item.desc}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
          {visibleNavigation.map(section => (
            <div key={section.label} className="space-y-1">
              <p className="px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const selected = item.id === activeTab;
                  return (
                    <button 
                      key={item.id} 
                      type="button" 
                      onClick={() => setActiveTab(item.id)} 
                      className={`relative group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer select-none ${
                        selected 
                          ? 'text-indigo-700 dark:text-indigo-300 font-bold' 
                          : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {selected && (
                        <motion.div
                          layoutId="settingsNavActivePill"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 rounded-xl bg-indigo-50 border border-indigo-200/70 dark:bg-indigo-950/40 dark:border-indigo-900/50 shadow-2xs pointer-events-none"
                        />
                      )}
                      <Icon className={`relative z-10 h-4 w-4 shrink-0 transition-colors ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                      <span className="relative z-10 min-w-0 flex-1 truncate text-xs font-semibold">
                        {item.label}
                      </span>
                      {item.badge !== undefined && (
                        <span className={`relative z-10 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          selected 
                            ? 'bg-indigo-200/70 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {selected && (
                        <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          {currentUser && (
            <div className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-slate-800/80 p-2.5 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs mb-2">
              <SignedImage filePath={currentUser.avatar} alt={currentUser.name} className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-slate-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 truncate">{currentUser.email}</span>
                </div>
              </div>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/50">
                {currentUser.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
          )}
          <button 
            type="button" 
            onClick={onLogout} 
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t('signOut') || (isVietnamese ? 'Đăng xuất tài khoản' : 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <section className="min-w-0 flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950" aria-label="Settings Content">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 md:px-8 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setMobileNavigationOpen(true)} 
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                {isVietnamese ? 'Cài đặt' : 'Settings'}
              </span>
              <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {navigationSections.flatMap(section => section.items).find(item => item.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'general' && isWorkspaceDirty && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {isVietnamese ? 'Chưa lưu thay đổi' : 'Unsaved changes'}
              </span>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">{t('systemOperational') || (isVietnamese ? 'Hệ thống trực tuyến' : 'Online')}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab} 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -4 }} 
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} 
              className="mx-auto max-w-5xl 2xl:max-w-6xl space-y-6 p-4 sm:p-6 md:p-8 pb-24"
            >
              
              {/* ── TAB 1: GENERAL (WORKSPACE) ── */}
              {activeTab === 'general' && (
                <>
                  <SectionHeader 
                    eyebrow={t('workspaceAdmin') || (isVietnamese ? 'Quản trị không gian' : 'Workspace Admin')} 
                    title={t('workspaceIdentity') || (isVietnamese ? 'Nhận diện & Cấu hình không gian' : 'Workspace Identity & Config')} 
                    description={t('workspaceIdentityDesc') || (isVietnamese ? 'Quản lý tên, thương hiệu, múi giờ và các tính năng mặc định trong không gian làm việc.' : 'Manage name, branding, timezone and default modules for your team.')} 
                    action={
                      <div className="flex items-center gap-2">
                        {isWorkspaceDirty && (
                          <button
                            type="button"
                            onClick={saveWorkspace}
                            disabled={isSavingWorkspace}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 text-xs font-bold shadow-md shadow-indigo-500/15 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span>{isVietnamese ? 'Lưu thay đổi' : 'Save Changes'}</span>
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={() => setCreateWorkspaceOpen(true)} 
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{t('createWorkspaceBtn') || (isVietnamese ? 'Tạo không gian mới' : 'New Workspace')}</span>
                        </button>
                      </div>
                    } 
                  />

                  {activeWorkspace ? (
                    <>
                      {/* Workspace Hero Banner Preview */}
                      <div className="relative h-44 sm:h-52 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-900 shadow-md group">
                        {workspaceCover ? (
                          <img src={workspaceCover} alt="Workspace Cover" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102 opacity-85" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-90" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                        
                        {/* Change cover button overlay */}
                        <div className="absolute top-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-2">
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
                            className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md text-[11px] font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {isUploadingCover ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            <span>{isUploadingCover ? (isVietnamese ? 'Đang tải...' : 'Uploading...') : (isVietnamese ? 'Đổi ảnh bìa' : 'Change Cover')}</span>
                          </button>
                          {workspaceCover && (
                            <button
                              type="button"
                              onClick={() => setWorkspaceCover('')}
                              className="p-1.5 rounded-xl bg-black/50 hover:bg-rose-900/60 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer"
                              title={isVietnamese ? 'Xóa ảnh bìa' : 'Remove cover'}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Workspace Identity in Banner */}
                        <div className="absolute inset-x-5 bottom-4 flex items-end gap-3.5">
                          <div 
                            onClick={() => logoInputRef.current?.click()}
                            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/40 bg-white dark:bg-slate-900 text-xl font-black text-indigo-600 shadow-xl cursor-pointer group/logo"
                            title={isVietnamese ? 'Nhấn để đổi logo' : 'Click to change logo'}
                          >
                            {workspaceLogo ? (
                              <img src={workspaceLogo} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                              <span>{(workspaceName || activeWorkspace.name || 'W').charAt(0).toUpperCase()}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 pb-0.5">
                            <h3 className="text-lg sm:text-xl font-black text-white truncate drop-shadow-sm">
                              {workspaceName || activeWorkspace.name}
                            </h3>
                            <p className="text-xs font-medium text-white/75 truncate">
                              {members.length} {t('members') || 'members'} · {tasks.filter(task => task.workspaceId === activeWorkspace.id).length} {t('tasks') || 'tasks'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Basic Identity Card */}
                      <SettingsCard 
                        title={t('basicInformation') || (isVietnamese ? 'Thông tin cơ bản' : 'Basic Information')} 
                        description={t('basicInformationDesc') || (isVietnamese ? 'Tên hiển thị, logo và giới thiệu ngắn về không gian làm việc.' : 'Display name, branding logo and brief description.')} 
                        icon={CircleUserRound}
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {t('workspaceName') || (isVietnamese ? 'Tên không gian' : 'Workspace Name')}
                            </span>
                            <input 
                              value={workspaceName} 
                              onChange={event => setWorkspaceName(event.target.value)} 
                              maxLength={60} 
                              className={inputClass} 
                            />
                          </label>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                {isVietnamese ? 'Logo không gian' : 'Workspace Logo'}
                              </span>
                              {workspaceLogo && (
                                <button
                                  type="button"
                                  onClick={() => setWorkspaceLogo('')}
                                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                                >
                                  {isVietnamese ? 'Gỡ logo' : 'Remove'}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isUploadingLogo ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                <span>{isUploadingLogo ? (isVietnamese ? 'Đang tải...' : 'Uploading...') : (isVietnamese ? 'Tải ảnh logo' : 'Upload Logo')}</span>
                              </button>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {isVietnamese ? 'Hỗ trợ PNG, JPG, WebP < 2MB' : 'PNG, JPG, WebP up to 2MB'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {t('workspaceDescription') || (isVietnamese ? 'Mô tả không gian' : 'Workspace Description')}
                            </span>
                            <textarea
                              value={workspaceDescription}
                              onChange={event => setWorkspaceDescription(event.target.value)}
                              rows={2}
                              maxLength={300}
                              placeholder={isVietnamese ? 'Mô tả ngắn gọn mục tiêu, phòng ban hoặc định hướng của không gian...' : 'Brief description of this workspace purpose...'}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 p-3 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400 resize-none"
                            />
                          </label>
                        </div>

                        {/* Cover Image Presets */}
                        <div className="mt-4">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-2">
                            {isVietnamese ? 'Ảnh bìa mẫu có sẵn' : 'Cover Image Presets'}
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {WORKSPACE_COVERS.map(cover => (
                              <button
                                type="button"
                                key={cover.id}
                                onClick={() => setWorkspaceCover(cover.url)}
                                className={`aspect-[16/9] overflow-hidden rounded-xl border transition-all cursor-pointer ${
                                  workspaceCover === cover.url
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-102'
                                    : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <img src={cover.url} alt={cover.name} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Brand Theme Swatches */}
                        <div className="mt-5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-2">
                            {t('brandColor') || (isVietnamese ? 'Màu chủ đề không gian' : 'Brand Theme Color')}
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {accentOptions.map(option => (
                              <button
                                type="button"
                                key={option.id}
                                onClick={() => setWorkspaceTheme(option.id)}
                                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                                  workspaceTheme === option.id
                                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                              >
                                <span className={`h-6 w-6 rounded-lg shrink-0 shadow-xs ${option.className}`} />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{option.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{option.hex}</span>
                                </span>
                                {workspaceTheme === option.id && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </SettingsCard>

                      {/* Timezone & Working Calendar Card */}
                      <SettingsCard
                        title={isVietnamese ? 'Múi giờ & Lịch làm việc' : 'Timezone & Working Calendar'}
                        description={isVietnamese ? 'Định cấu hình múi giờ và ngày bắt đầu tuần áp dụng cho các hạn chót và lịch biểu.' : 'Set timezone and first day of week for tasks and calendars.'}
                        icon={Clock}
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {t('workspaceTimezone') || (isVietnamese ? 'Múi giờ chính' : 'Primary Timezone')}
                            </span>
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
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {t('weekStartsOn') || (isVietnamese ? 'Ngày bắt đầu tuần' : 'Week Starts On')}
                            </span>
                            <Select
                              value={workspaceWeekStartsOn}
                              onChange={v => setWorkspaceWeekStartsOn(v as 'monday' | 'sunday')}
                              className="w-full"
                              ariaLabel="Week Starts On"
                              options={[
                                { value: 'monday', label: isVietnamese ? 'Thứ Hai (Mặc định)' : 'Monday (Default)' },
                                { value: 'sunday', label: isVietnamese ? 'Chủ Nhật' : 'Sunday' },
                              ]}
                            />
                          </label>
                        </div>
                      </SettingsCard>

                      {/* Member Permissions Card */}
                      <SettingsCard
                        title={isVietnamese ? 'Quyền hạn & Thành viên mới' : 'Permissions & New Members'}
                        description={isVietnamese ? 'Thiết lập vai trò mặc định và quyền gửi lời mời tham gia.' : 'Configure default roles and teammate invitation rules.'}
                        icon={Users}
                      >
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          <SettingRow
                            title={t('defaultMemberRole') || (isVietnamese ? 'Vai trò mặc định cho người mới' : 'Default Role for New Members')}
                            description={isVietnamese ? 'Vai trò được gán tự động khi thành viên tham gia qua liên kết hoặc lời mời.' : 'Role assigned automatically when someone joins.'}
                          >
                            <Select
                              value={workspaceDefaultRole}
                              onChange={v => setWorkspaceDefaultRole(v as 'member' | 'guest')}
                              className="w-44"
                              ariaLabel="Default Member Role"
                              options={[
                                { value: 'member', label: isVietnamese ? 'Thành viên (Member)' : 'Member' },
                                { value: 'guest', label: isVietnamese ? 'Khách (Guest)' : 'Guest' },
                              ]}
                            />
                          </SettingRow>

                          <SettingRow
                            title={t('allowMemberInvites') || (isVietnamese ? 'Cho phép thành viên gửi lời mời' : 'Allow Members to Invite')}
                            description={isVietnamese ? 'Thành viên thông thường có thể mời người khác vào không gian làm việc.' : 'Allow regular members to invite coworkers to this workspace.'}
                            last
                          >
                            <Toggle
                              checked={workspaceAllowInvites}
                              onChange={setWorkspaceAllowInvites}
                              label="Allow Member Invites"
                            />
                          </SettingRow>
                        </div>
                      </SettingsCard>

                      {/* ClickApps Modular Features Card */}
                      <SettingsCard
                        title={t('workspaceClickApps') || (isVietnamese ? 'Tính năng mở rộng (ClickApps)' : 'Workspace Modules (ClickApps)')}
                        description={t('workspaceClickAppsDesc') || (isVietnamese ? 'Bật hoặc tắt các module chuyên sâu theo nhu cầu quản trị dự án của bạn.' : 'Enable or disable advanced project management modules.')}
                        icon={LayoutGrid}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { key: 'timeTracking', title: t('appTimeTracking') || (isVietnamese ? 'Theo dõi thời gian' : 'Time Tracking'), desc: isVietnamese ? 'Bấm giờ và ghi nhận thời gian làm việc trên từng task.' : 'Track hours and record logged time.', icon: Timer },
                            { key: 'subtasks', title: t('appSubtasks') || (isVietnamese ? 'Công việc con (Subtasks)' : 'Subtasks'), desc: isVietnamese ? 'Chia nhỏ mục tiêu lớn thành các bước thực hiện chi tiết.' : 'Break down tasks into actionable subtasks.', icon: CheckSquare },
                            { key: 'priorities', title: t('appPriorities') || (isVietnamese ? 'Mức độ ưu tiên' : 'Task Priorities'), desc: isVietnamese ? 'Gắn cờ Khẩn cấp, Cao, Trung bình, Thấp.' : 'Categorize tasks by urgency levels.', icon: Zap },
                            { key: 'relationships', title: t('appRelationships') || (isVietnamese ? 'Liên kết & Phụ thuộc' : 'Task Relationships'), desc: isVietnamese ? 'Cài đặt việc chặn (blocking) và việc phụ thuộc.' : 'Set up task dependencies and links.', icon: Link2 },
                            { key: 'customFields', title: t('appCustomFields') || (isVietnamese ? 'Trường tùy chỉnh (Custom Fields)' : 'Custom Fields'), desc: isVietnamese ? 'Tạo thêm trường dữ liệu tùy biến theo quy trình.' : 'Add custom data fields for tasks.', icon: SlidersHorizontal },
                          ].map(app => (
                            <div key={app.key} className="flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                  <app.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{app.title}</p>
                                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{app.desc}</p>
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
                      </SettingsCard>

                      {/* Danger Zone */}
                      <SettingsCard 
                        title={t('dangerZoneTitle') || (isVietnamese ? 'Khu vực nguy hiểm' : 'Danger Zone')} 
                        description={t('dangerZoneDesc') || (isVietnamese ? 'Các thao tác này ảnh hưởng vĩnh viễn đến toàn bộ thành viên trong không gian.' : 'Permanent actions that affect all workspace members.')} 
                        icon={AlertTriangle} 
                        tone="danger"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {t('deleteThisWorkspace') || (isVietnamese ? 'Xóa không gian này' : 'Delete this workspace')}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {isVietnamese ? 'Xóa vĩnh viễn không gian làm việc này cùng toàn bộ không gian con, danh sách và công việc.' : 'Permanently remove this workspace and all associated resources.'}
                            </p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setDeleteWorkspace(activeWorkspace)} 
                            disabled={workspaces.length <= 1} 
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-xs font-extrabold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/60 dark:bg-slate-950 cursor-pointer shrink-0 transition-colors shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t('deleteWorkspace') || (isVietnamese ? 'Xóa không gian' : 'Delete Workspace')}</span>
                          </button>
                        </div>
                      </SettingsCard>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                      <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">{t('noWorkspaceSelected') || 'No workspace selected'}</p>
                    </div>
                  )}

                  {/* Floating Unsaved Changes Bar */}
                  <AnimatePresence>
                    {isWorkspaceDirty && (
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl border border-slate-700 dark:border-slate-200 w-[90%] max-w-lg"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                          <span className="text-xs font-bold truncate">
                            {isVietnamese ? 'Bạn có thay đổi chưa lưu' : 'You have unsaved changes'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={syncWorkspaceFields}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white dark:text-slate-600 dark:hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            {isVietnamese ? 'Đặt lại' : 'Reset'}
                          </button>
                          <button
                            type="button"
                            onClick={saveWorkspace}
                            disabled={isSavingWorkspace}
                            className="px-4 py-1.5 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            <span>{isVietnamese ? 'Lưu ngay' : 'Save'}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* ── TAB 2: PEOPLE (MEMBERS & ACCESS) ── */}
              {activeTab === 'people' && (
                <>
                  <SectionHeader 
                    eyebrow={t('team') || (isVietnamese ? 'Quản trị đội ngũ' : 'Team Admin')} 
                    title={t('membersAndAccess') || (isVietnamese ? 'Thành viên & Đội ngũ' : 'Members & Teams')} 
                    description={t('membersAndAccessDesc') || (isVietnamese ? 'Mời đồng đội, tổ chức cơ cấu phòng ban và phân quyền truy cập không gian.' : 'Invite teammates, organize squads and configure access rights.')} 
                  />
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
                    <TeamDirectory 
                      members={members} 
                      tasks={tasks} 
                      workspaces={workspaces} 
                      activeWorkspaceId={activeWorkspaceId} 
                      onAddMember={onAddMember || (() => {})} 
                      onUpdateMember={onUpdateMember || (() => {})} 
                      onDeleteMember={onDeleteMember || (() => {})} 
                      onAddSyncLog={onAddSyncLog || (() => {})} 
                      currentUser={currentUser} 
                      onSendWorkspaceInvites={onSendWorkspaceInvites} 
                    />
                  </div>
                </>
              )}

              {/* ── TAB 3: PREFERENCES (APPEARANCE & VISUALS) ── */}
              {activeTab === 'preferences' && (
                <>
                  <SectionHeader 
                    eyebrow={t('settingsPersonal') || (isVietnamese ? 'Cá nhân hóa' : 'Personalization')} 
                    title={t('appearanceAndTheme') || (isVietnamese ? 'Giao diện & Trải nghiệm' : 'Appearance & Experience')} 
                    description={t('appearanceAndThemeDesc') || (isVietnamese ? 'Tùy chỉnh chế độ hiển thị, màu nhấn, mật độ và thói quen làm việc của riêng bạn.' : 'Tailor visuals, colors, density and focus defaults to your daily workflow.')} 
                  />

                  {/* Language & Region */}
                  <SettingsCard 
                    title={t('languageAndRegion') || (isVietnamese ? 'Ngôn ngữ & Khu vực' : 'Language & Region')} 
                    description={t('languageAndRegionDesc') || (isVietnamese ? 'Chuyển đổi giao diện song ngữ Tiếng Việt và Tiếng Anh.' : 'Select your primary language for Costack.')} 
                    icon={Globe2}
                  >
                    <LanguageDropdown variant="cards" />
                  </SettingsCard>

                  {/* Color Mode */}
                  <SettingsCard 
                    title={t('colorMode') || (isVietnamese ? 'Chế độ màu giao diện' : 'Color Mode')} 
                    description={t('colorModeDesc') || (isVietnamese ? 'Chọn giao diện sáng, tối hoặc tự động đồng bộ theo hệ điều hành.' : 'Choose light, dark, or system preference.')} 
                    icon={MonitorCog}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { id: 'light', label: t('lightMode') || (isVietnamese ? 'Giao diện Sáng' : 'Light Mode'), desc: isVietnamese ? 'Tối ưu độ tương phản ban ngày' : 'Clean daytime contrast', icon: Sun }, 
                        { id: 'dark', label: t('darkMode') || (isVietnamese ? 'Giao diện Tối' : 'Dark Mode'), desc: isVietnamese ? 'Dịu mắt và tập trung cao' : 'Easy on eyes at night', icon: Moon }, 
                        { id: 'system', label: t('systemMode') || (isVietnamese ? 'Theo hệ thống' : 'System Default'), desc: isVietnamese ? `Tự động (${isDarkMode ? 'Hiện đang tối' : 'Hiện đang sáng'})` : `Auto (${isDarkMode ? 'Dark' : 'Light'})`, icon: Laptop }
                      ].map(option => {
                        const selected = option.id === themePreference;
                        const Icon = option.icon;
                        return (
                          <button 
                            key={option.id} 
                            type="button" 
                            aria-pressed={selected} 
                            onClick={() => setThemePreference(option.id as ThemePreference)} 
                            className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                              selected 
                                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500' 
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Icon className={`h-5 w-5 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                              {selected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{option.label}</p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 leading-snug">{option.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </SettingsCard>

                  {/* Accent & Visual Depth */}
                  <SettingsCard 
                    title={t('accentAndEffects') || (isVietnamese ? 'Màu nhấn & Hiệu ứng' : 'Accent & Visual Effects')} 
                    description={t('accentAndEffectsDesc') || (isVietnamese ? 'Tùy chỉnh sắc thái màu sắc và độ mờ nền giao diện.' : 'Configure theme accent colors and surface effects.')} 
                    icon={Palette}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {accentOptions.map(option => (
                        <button 
                          key={option.id} 
                          type="button" 
                          onClick={() => setAccentPreset(option.id)} 
                          className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                            accentPreset === option.id 
                              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500' 
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span className={`block h-8 rounded-lg ${option.className} shadow-2xs mb-2`} />
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{option.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                      <SettingRow 
                        title={t('interfaceDepth') || (isVietnamese ? 'Độ mờ kính (Interface Depth)' : 'Interface Depth')} 
                        description={isVietnamese ? 'Tùy chỉnh độ mờ kính mờ và phân tầng bề mặt giao diện.' : 'Adjust blur and glassmorphism levels.'}
                      >
                        <Select 
                          value={blurIntensity} 
                          onChange={v => setBlurIntensity(v as BlurIntensity)} 
                          className="w-40" 
                          ariaLabel="Interface Depth" 
                          options={[
                            { value: 'soft', label: isVietnamese ? 'Nhẹ (Soft)' : 'Soft' },
                            { value: 'default', label: isVietnamese ? 'Cân bằng' : 'Balanced' },
                            { value: 'immersive', label: isVietnamese ? 'Nổi bật (Deep)' : 'Immersive' },
                          ]} 
                        />
                      </SettingRow>

                      <SettingRow 
                        title={isVietnamese ? 'Mật độ giao diện' : 'Interface Density'} 
                        description={isVietnamese ? 'Khoảng cách giữa các dòng và thẻ trên màn hình làm việc.' : 'Adjust padding and spacing across workspaces.'}
                      >
                        <Select 
                          value={uiDensity} 
                          onChange={v => setUiDensity(v as 'comfortable' | 'compact')} 
                          className="w-40" 
                          ariaLabel="Interface Density" 
                          options={[
                            { value: 'comfortable', label: isVietnamese ? 'Thoải mái' : 'Comfortable' },
                            { value: 'compact', label: isVietnamese ? 'Thu gọn (Compact)' : 'Compact' },
                          ]} 
                        />
                      </SettingRow>

                      <SettingRow 
                        title={isVietnamese ? 'Định dạng ngày & giờ' : 'Date & Time Format'} 
                        description={isVietnamese ? 'Định dạng hiển thị đồng bộ trên thẻ công việc, lịch biểu và báo cáo.' : 'Format used on task cards, calendars and timeline.'}
                      >
                        <Select 
                          value={dateFormat} 
                          onChange={v => setDateFormat(v as typeof dateFormat)} 
                          className="w-44" 
                          ariaLabel="Date Format" 
                          options={[
                            { value: 'short', label: '20/08/2026' },
                            { value: 'full', label: '20 tháng 8, 2026' },
                            { value: 'vi', label: 'Thứ Năm, 20/08' },
                            { value: 'numeric', label: '2026-08-20' },
                            { value: 'clock', label: '20/08 · 14:30' },
                          ]} 
                        />
                      </SettingRow>

                      <SettingRow
                        title={t('defaultStartupTab') || (isVietnamese ? 'Màn hình khởi động mặc định' : 'Default Startup Screen')}
                        description={isVietnamese ? 'Tab mở ra đầu tiên mỗi khi bạn truy cập vào ứng dụng.' : 'First tab displayed upon launch.'}
                      >
                        <Select
                          value={defaultStartupTab}
                          onChange={setDefaultStartupTab}
                          className="w-48"
                          ariaLabel="Default Startup Screen"
                          options={[
                            { value: 'dashboard', label: isVietnamese ? 'Tổng quan (Dashboard)' : 'Dashboard' },
                            { value: 'tasks', label: isVietnamese ? 'Công việc (Tasks)' : 'Tasks' },
                            { value: 'inbox', label: isVietnamese ? 'Hộp thư (Inbox)' : 'Inbox' },
                            { value: 'calendar', label: isVietnamese ? 'Lịch biểu (Calendar)' : 'Calendar' },
                            { value: 'finance', label: isVietnamese ? 'Tài chính (Finance)' : 'Finance' },
                            { value: 'chat', label: isVietnamese ? 'Trò chuyện (Chat)' : 'Chat' },
                          ]}
                        />
                      </SettingRow>

                      <SettingRow 
                        title={t('uiSounds') || (isVietnamese ? 'Âm thanh phản hồi giao diện' : 'System Audio Feedback')} 
                        description={isVietnamese ? 'Phát âm thanh nhẹ khi hoàn thành công việc hoặc chuyển đổi trạng thái.' : 'Subtle sound effects for task completion and actions.'} 
                        last
                      >
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
                            >
                              <Play className="h-3 w-3 fill-current text-indigo-500" />
                              <span>{isVietnamese ? 'Thử âm' : 'Test Sound'}</span>
                            </button>
                          )}
                          <Toggle checked={soundEnabled} onChange={setSoundEnabled} label="System Audio Feedback" />
                        </div>
                      </SettingRow>
                    </div>
                  </SettingsCard>

                  {/* Sidebar Navigation Customization */}
                  <SettingsCard 
                    title={isVietnamese ? 'Sắp xếp thứ tự Module trên Thanh bên' : 'Sidebar Navigation Modules'} 
                    description={isVietnamese ? 'Tùy biến vị trí các tính năng trên thanh bên theo thói quen sử dụng hàng ngày.' : 'Customize the order of modules in the left sidebar.'} 
                    icon={SlidersHorizontal}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowSidebarOrderModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>{isVietnamese ? 'Mở bảng sắp xếp' : 'Reorder Modules'}</span>
                      </button>
                    }
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {isVietnamese ? 'Tự do di chuyển vị trí các tab chức năng' : 'Freely reorder functional navigation tabs'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {isVietnamese 
                            ? 'Kéo thả trực tiếp trên thanh bên hoặc sử dụng công cụ sắp xếp để đưa các module thường dùng lên vị trí ưu tiên.' 
                            : 'Drag and drop directly in the sidebar or use the manager to position frequently used tabs.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSidebarOrderModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>{isVietnamese ? 'Tùy chỉnh ngay' : 'Customize Now'}</span>
                      </button>
                    </div>
                  </SettingsCard>
                </>
              )}

              {/* ── TAB 4: NOTIFICATIONS & FOCUS ── */}
              {activeTab === 'notifications' && (
                <>
                  <SectionHeader 
                    eyebrow={t('notificationSettings') || (isVietnamese ? 'Quản lý thông báo' : 'Notification Settings')} 
                    title={t('notificationsAndFocus') || (isVietnamese ? 'Thông báo & Tập trung' : 'Notifications & Focus')} 
                    description={t('notificationsAndFocusDesc') || (isVietnamese ? 'Kiểm soát cách thức và tần suất nhận thông báo để đảm bảo làm việc sâu hiệu quả.' : 'Fine-tune delivery channels, focus hours and alerts.')} 
                  />

                  {/* Delivery Channels */}
                  <SettingsCard 
                    title={t('notificationDelivery') || (isVietnamese ? 'Phương thức phân phối thông báo' : 'Notification Delivery')} 
                    description={isVietnamese ? 'Quản lý âm thanh và thông báo trên trình duyệt máy tính.' : 'Configure sounds and desktop notifications.'} 
                    icon={Bell}
                  >
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      <SettingRow 
                        title={t('enableAllNotifications') || (isVietnamese ? 'Bật thông báo ứng dụng' : 'Enable Notifications')} 
                        description={isVietnamese ? 'Nhận các cập nhật về công việc, lời nhắc và phản hồi từ đồng đội.' : 'Receive task updates and teammate mentions.'}
                      >
                        <Toggle checked={notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, enableAll: value }))} label="Enable Notifications" />
                      </SettingRow>

                      <SettingRow 
                        title={t('enableNotificationSound') || (isVietnamese ? 'Âm thanh thông báo' : 'Notification Sound')} 
                        description={isVietnamese ? 'Phát âm thanh chuông ngắn khi có cảnh báo mới.' : 'Play subtle chime when notifications arrive.'}
                      >
                        <div className="flex items-center gap-2.5">
                          {notificationSettings.enableSound && notificationSettings.enableAll && (
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  (window as any).playSystemSound?.('notification');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <Play className="h-3 w-3 fill-current text-indigo-500" />
                              <span>{isVietnamese ? 'Thử chuông' : 'Test'}</span>
                            </button>
                          )}
                          <Toggle 
                            checked={notificationSettings.enableSound} 
                            disabled={!notificationSettings.enableAll} 
                            onChange={value => { setNotificationSettings(previous => ({ ...previous, enableSound: value })); setSoundEnabled(value); }} 
                            label="Notification Sound" 
                          />
                        </div>
                      </SettingRow>

                      {isBrowserNotificationSupported() && (
                        <SettingRow 
                          title={isVietnamese ? 'Thông báo nổi trên màn hình máy tính (Desktop Popup)' : 'Desktop Browser Notifications'} 
                          description={isVietnamese ? 'Hiển thị popup trực tiếp trên màn hình máy tính ngay cả khi bạn đang mở ứng dụng khác.' : 'Receive popups even when Costack is in the background.'}
                          last
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                              browserPerm === 'granted' 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                : browserPerm === 'denied'
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {browserPerm === 'granted' 
                                ? (isVietnamese ? 'Đã cấp quyền' : 'Granted') 
                                : browserPerm === 'denied' 
                                  ? (isVietnamese ? 'Bị chặn' : 'Blocked') 
                                  : (isVietnamese ? 'Chưa cấp quyền' : 'Not Granted')}
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
                                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                              >
                                {isVietnamese ? 'Bắn thử' : 'Test'}
                              </button>
                            )}
                          </div>
                        </SettingRow>
                      )}
                    </div>
                  </SettingsCard>

                  {/* Notification Triggers */}
                  <SettingsCard 
                    title={isVietnamese ? 'Sự kiện kích hoạt thông báo' : 'Notification Triggers'} 
                    description={isVietnamese ? 'Lựa chọn các loại hoạt động gửi thông báo đến bạn.' : 'Select specific activity types that notify you.'} 
                    icon={SlidersHorizontal}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ['enableAssignments', isVietnamese ? 'Việc được giao' : 'Task Assignments', isVietnamese ? 'Khi có công việc mới được giao cho bạn' : 'When tasks are assigned to you'],
                        ['enableDeadlines', isVietnamese ? 'Hạn chót & Nhắc việc' : 'Deadlines & Reminders', isVietnamese ? 'Nhắc việc sắp đến hạn hoặc bị quá hạn' : 'Due date and overdue warnings'],
                        ['enableComments', isVietnamese ? 'Bình luận & Nhắc tên (@)' : 'Comments & Mentions', isVietnamese ? 'Khi có người phản hồi hoặc gắn thẻ bạn' : 'Replies and @mentions in tasks'],
                        ['enableStatusChanges', isVietnamese ? 'Thay đổi trạng thái' : 'Status Changes', isVietnamese ? 'Cập nhật tiến độ của task bạn tham gia' : 'Progress updates on followed tasks'],
                        ['enableFilteringTags', isVietnamese ? 'Hoạt động gắn thẻ' : 'Tag Updates', isVietnamese ? 'Thông báo các nhãn bạn đang theo dõi' : 'Updates on monitored tags'],
                        ['enableChatMessages', isVietnamese ? 'Tin nhắn phòng chat' : 'Chat Messages', isVietnamese ? 'Khi có tin nhắn mới trong phòng chat nhóm' : 'New messages in team chat'],
                        ['enableSystemNotify', isVietnamese ? 'Cảnh báo hệ thống & Bảo mật' : 'System & Security', isVietnamese ? 'Đồng bộ dữ liệu, bảo mật và tài khoản' : 'Sync and security alerts']
                      ].map(([key, title, description]) => (
                        <div key={key} className="flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{description}</p>
                          </div>
                          <Toggle 
                            checked={Boolean(notificationSettings[key as keyof NotificationSettings])} 
                            disabled={!notificationSettings.enableAll} 
                            onChange={value => setNotificationSettings(previous => ({ ...previous, [key]: value }))} 
                            label={title} 
                          />
                        </div>
                      ))}
                    </div>
                  </SettingsCard>

                  {/* Focus & Do Not Disturb */}
                  <SettingsCard 
                    title={t('focusSchedule') || (isVietnamese ? 'Chế độ Không làm phiền & Khung giờ tập trung' : 'Focus Mode & Quiet Hours')} 
                    description={isVietnamese ? 'Tự động tắt tiếng thông báo không khẩn cấp để làm việc sâu.' : 'Mute non-urgent alerts during deep work hours.'} 
                    icon={Moon}
                  >
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      <SettingRow 
                        title={t('dndMode') || (isVietnamese ? 'Bật chế độ Không làm phiền ngay' : 'Do Not Disturb')} 
                        description={isVietnamese ? 'Tạm ngưng toàn bộ thông báo thường cho đến khi bạn chủ động tắt.' : 'Silence regular notifications until toggled off.'}
                      >
                        <Toggle checked={notificationSettings.dndActive} onChange={value => setNotificationSettings(previous => ({ ...previous, dndActive: value }))} label="Do Not Disturb" />
                      </SettingRow>

                      <SettingRow 
                        title={t('quietHours') || (isVietnamese ? 'Khung giờ yên tĩnh định kỳ hằng ngày' : 'Scheduled Quiet Hours')} 
                        description={isVietnamese ? 'Tự động tắt tiếng thông báo mỗi ngày theo khung giờ bạn chọn.' : 'Automatically pause alerts during scheduled times.'}
                      >
                        <Toggle checked={!!notificationSettings.dndScheduleEnabled} onChange={value => setNotificationSettings(previous => ({ ...previous, dndScheduleEnabled: value }))} label="Quiet Hours" />
                      </SettingRow>

                      {notificationSettings.dndScheduleEnabled && (
                        <div className="grid gap-3 py-3 sm:grid-cols-2 bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 my-2">
                          <label className="space-y-1">
                            <span className="text-[10.5px] font-bold text-slate-500">{isVietnamese ? 'Bắt đầu lúc' : 'Start time'}</span>
                            <input type="time" value={notificationSettings.dndScheduleStart || '18:00'} onChange={event => setNotificationSettings(previous => ({ ...previous, dndScheduleStart: event.target.value }))} className={inputClass} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10.5px] font-bold text-slate-500">{isVietnamese ? 'Kết thúc lúc' : 'End time'}</span>
                            <input type="time" value={notificationSettings.dndScheduleEnd || '08:00'} onChange={event => setNotificationSettings(previous => ({ ...previous, dndScheduleEnd: event.target.value }))} className={inputClass} />
                          </label>
                        </div>
                      )}

                      <SettingRow 
                        title={isVietnamese ? 'Vẫn cho phép cảnh báo khẩn cấp' : 'Allow Urgent Alerts'} 
                        description={isVietnamese ? 'Các công việc ưu tiên khẩn cấp và quá hạn vẫn được thông báo.' : 'Urgent deadlines bypass Do Not Disturb.'}
                      >
                        <Toggle checked={!!notificationSettings.dndAllowUrgent} onChange={value => setNotificationSettings(previous => ({ ...previous, dndAllowUrgent: value }))} label="Allow urgent alerts" />
                      </SettingRow>

                      <SettingRow 
                        title={isVietnamese ? 'Thời gian hiển thị Toast' : 'Toast Notification Duration'} 
                        description={isVietnamese ? 'Số giây thông báo popup tồn tại trên màn hình.' : 'How long notification pills stay on screen.'}
                        last
                      >
                        <div className="flex items-center gap-2">
                          <Select<number> 
                            value={notificationSettings.toastDuration} 
                            onChange={v => setNotificationSettings(previous => ({ ...previous, toastDuration: v }))} 
                            className="w-32" 
                            ariaLabel="Toast Duration" 
                            options={[
                              { value: 2500, label: '2.5 giây' },
                              { value: 4000, label: '4.0 giây' },
                              { value: 6000, label: '6.0 giây' },
                              { value: 10000, label: '10 giây' },
                            ]} 
                          />
                          <button 
                            type="button" 
                            onClick={() => triggerToast?.('info', isVietnamese ? 'Thông báo thử nghiệm' : 'Test Notification', isVietnamese ? 'Cài đặt thông báo đang hoạt động hoàn hảo.' : 'Notification settings are working cleanly.')} 
                            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
                          >
                            {isVietnamese ? 'Gửi thử' : 'Test'}
                          </button>
                        </div>
                      </SettingRow>
                    </div>
                  </SettingsCard>
                </>
              )}

              {/* ── TAB 5: AI USAGE (COSTACK AI) ── */}
              {activeTab === 'ai_usage' && (
                <>
                  <SectionHeader 
                    eyebrow={isVietnamese ? 'Trí tuệ nhân tạo' : 'Artificial Intelligence'} 
                    title="Costack AI Copilot" 
                    description={isVietnamese ? 'Cấu hình mô hình Gemini, mức độ sáng tạo và bản tin năng suất buổi sáng.' : 'Configure Gemini models, temperature and daily productivity briefings.'} 
                    action={
                      <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${currentUser?.isPremium ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                        {currentUser?.isPremium ? (isVietnamese ? 'Gói Pro đã kích hoạt' : 'Pro Active') : (isVietnamese ? 'Yêu cầu gói trả phí' : 'Pro Plan Required')}
                      </div>
                    } 
                  />

                  {/* Managed Security Banner */}
                  <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 p-5 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/20 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          {isVietnamese ? 'AI được quản lý và bảo mật qua máy chủ Costack' : 'Server-Managed Enterprise AI Security'}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {isVietnamese 
                            ? 'Khóa API Gemini được mã hóa an toàn trên máy chủ. Bạn không cần tự nhập API key cá nhân hay lo lắng về rò rỉ thông tin dữ liệu.' 
                            : 'Gemini API keys remain protected server-side with enterprise encryption.'}
                        </p>
                        {!currentUser?.isPremium && (
                          <button 
                            type="button" 
                            onClick={() => setShowPremiumModal(true)} 
                            className="mt-3 inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{isVietnamese ? 'Nâng cấp gói Pro' : 'Upgrade to Pro'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Model Runtime Config */}
                  <SettingsCard 
                    title={isVietnamese ? 'Mô hình & Cấu hình phản hồi' : 'Model & Response Config'} 
                    description={isVietnamese ? 'Lựa chọn phiên bản Gemini và điều chỉnh mức độ sáng tạo.' : 'Choose Gemini engine and tune creativity.'} 
                    icon={Zap}
                  >
                    <div className="space-y-4">
                      <fieldset disabled={!currentUser?.isPremium} className="grid gap-4 sm:grid-cols-2 disabled:opacity-50">
                        <label className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {isVietnamese ? 'Mô hình AI chủ đạo' : 'Primary AI Engine'}
                          </span>
                          <Select 
                            value={aiModel} 
                            onChange={setAiModel} 
                            className="w-full" 
                            ariaLabel="AI Model" 
                            options={[
                              { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', description: isVietnamese ? 'Nhanh nhất & Mới nhất (Khuyên dùng)' : 'Fastest & Latest (Recommended)' },
                              { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: isVietnamese ? 'Cân bằng tốc độ và phân tích' : 'Balanced speed and analytics' },
                              { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: isVietnamese ? 'Tư duy sâu và xử lý tài liệu lớn' : 'Deep reasoning and complex tasks' },
                              { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: isVietnamese ? 'Ổn định cao' : 'High stability' },
                            ]} 
                          />
                        </label>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <span>{isVietnamese ? 'Mức sáng tạo (Temperature)' : 'Creativity (Temperature)'}</span>
                            <span className="font-mono text-indigo-600 font-bold">{aiTemperature.toFixed(1)}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.1" 
                            value={aiTemperature} 
                            onChange={event => setAiTemperature(Number(event.target.value))} 
                            className="mt-3 w-full accent-indigo-600 cursor-pointer" 
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{isVietnamese ? 'Chính xác / Logic' : 'Precise'}</span>
                            <span>{isVietnamese ? 'Sáng tạo / Tự do' : 'Creative'}</span>
                          </div>
                        </div>
                      </fieldset>

                      <SettingRow 
                        title={isVietnamese ? 'Tìm kiếm làm cơ sở (Google Search Grounding)' : 'Google Search Grounding'} 
                        description={isVietnamese ? 'Cho phép AI tra cứu dữ liệu web thời gian thực khi cần thông tin bên ngoài.' : 'Allow AI to access live web search context.'}
                        last
                      >
                        <Toggle checked={aiSearchGrounding} onChange={setAiSearchGrounding} disabled={!currentUser?.isPremium} label="Google Search Grounding" />
                      </SettingRow>

                      <div className="flex flex-wrap justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button 
                          type="button" 
                          onClick={testAiConnection} 
                          disabled={testingAi} 
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                        >
                          {testingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <Activity className="h-3.5 w-3.5 text-indigo-500" />}
                          <span>{testingAi ? (isVietnamese ? 'Đang kiểm tra...' : 'Testing...') : (isVietnamese ? 'Kiểm tra kết nối' : 'Test Connection')}</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={saveAiSettings} 
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{isVietnamese ? 'Lưu cấu hình AI' : 'Save AI Settings'}</span>
                        </button>
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Daily Morning Briefing */}
                  <SettingsCard 
                    title={isVietnamese ? 'Bản tin công việc buổi sáng (Daily Briefing)' : 'Daily Morning Briefing'} 
                    description={isVietnamese ? 'Costack Brain tự động phân tích việc cần ưu tiên và gửi tóm tắt đầu ngày.' : 'Auto-review overdue, urgent and scheduled tasks every morning.'} 
                    icon={Brain}
                  >
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      <SettingRow 
                        title={isVietnamese ? 'Bật bản tin phân tích mỗi sáng' : 'Enable Daily Morning Summary'} 
                        description={isVietnamese ? 'Nhận bản tóm tắt các việc quá hạn và việc quan trọng trong ngày.' : 'Daily action list on first login.'}
                      >
                        <Toggle checked={aiDailyBriefingEnabled} onChange={setAiDailyBriefingEnabled} disabled={!currentUser?.isPremium} label="Daily AI Briefing" />
                      </SettingRow>

                      <SettingRow 
                        title={isVietnamese ? 'Khung giờ gửi bản tin' : 'Briefing Time'} 
                        description={isVietnamese ? 'Thời gian thông báo bắt đầu xuất hiện.' : 'Time when daily briefing activates.'}
                        last
                      >
                        <input 
                          type="time" 
                          value={aiDailyBriefingTime} 
                          disabled={!currentUser?.isPremium || !aiDailyBriefingEnabled} 
                          onChange={event => setAiDailyBriefingTime(event.target.value)} 
                          className={`${inputClass} w-32 disabled:opacity-50`} 
                        />
                      </SettingRow>
                    </div>
                  </SettingsCard>
                </>
              )}

              {/* ── TAB 6: AUDIT LOGS (ACTIVITY TIMELINE) ── */}
              {activeTab === 'audit_logs' && (
                <>
                  <SectionHeader 
                    eyebrow={isVietnamese ? 'Giám sát hệ thống' : 'System Monitoring'} 
                    title={isVietnamese ? 'Nhật ký hoạt động Workspace' : 'Workspace Activity Audit Logs'} 
                    description={isVietnamese ? 'Theo dõi minh bạch toàn bộ các thao tác tạo mới, cập nhật, xóa và phân quyền trong không gian làm việc.' : 'Real-time record of all member actions, updates and modifications.'} 
                    action={
                      <button 
                        type="button" 
                        onClick={copyAuditLogs}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      >
                        {copiedLogs ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                        <span>{copiedLogs ? (isVietnamese ? 'Đã sao chép!' : 'Copied!') : (isVietnamese ? 'Sao chép nhật ký' : 'Copy Logs')}</span>
                      </button>
                    } 
                  />

                  <SettingsCard 
                    title={isVietnamese ? 'Dòng thời gian sự kiện' : 'Event Timeline'} 
                    description={isVietnamese ? `Hiển thị ${filteredLogs.length} hoạt động gần nhất` : `Showing ${filteredLogs.length} recent events`} 
                    icon={FileClock}
                  >
                    <div className="space-y-3.5">
                      {/* Search & Category filter */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input 
                            value={logSearch} 
                            onChange={event => setLogSearch(event.target.value)} 
                            placeholder={isVietnamese ? 'Tìm theo người thực hiện, thao tác...' : 'Search author, action...'} 
                            className={`${inputClass} pl-8.5`} 
                          />
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {[
                            { id: 'all', label: isVietnamese ? 'Tất cả' : 'All' },
                            { id: 'task', label: isVietnamese ? 'Công việc' : 'Tasks' },
                            { id: 'space', label: isVietnamese ? 'Không gian' : 'Spaces' },
                            { id: 'doc', label: isVietnamese ? 'Tài liệu' : 'Docs' },
                            { id: 'member', label: isVietnamese ? 'Thành viên' : 'Members' },
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setLogCategory(tab.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                logCategory === tab.id
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Log Rows List */}
                      <div className="max-h-[480px] divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto rounded-xl border border-slate-200/70 dark:border-slate-800/80 px-4 bg-white dark:bg-slate-900/50">
                        {filteredLogs.length === 0 ? (
                          <div className="py-12 text-center text-slate-400">
                            <FileClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-semibold">{isVietnamese ? 'Không tìm thấy nhật ký phù hợp' : 'No matching activity logs'}</p>
                          </div>
                        ) : (
                          filteredLogs.map((log, index) => (
                            <div key={index} className="py-3 flex items-start justify-between gap-3 text-xs">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 break-words">
                                    {log.action}
                                  </p>
                                  {log.userName && (
                                    <span className="text-[10.5px] text-slate-400 font-medium">
                                      {isVietnamese ? 'Thực hiện bởi: ' : 'By: '}{log.userName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                {log.time}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </SettingsCard>
                </>
              )}

              {/* ── TAB 7: SECURITY & AUTHENTICATION ── */}
              {activeTab === 'security' && (
                <>
                  <SectionHeader 
                    eyebrow={isVietnamese ? 'Bảo vệ tài khoản' : 'Account Security'} 
                    title={t('securityAndSessions') || (isVietnamese ? 'Bảo mật & Xác thực' : 'Security & Authentication')} 
                    description={t('securityAndSessionsDesc') || (isVietnamese ? 'Quản lý mật khẩu, xác thực hai lớp (2FA) và giám sát các phiên đăng nhập hoạt động.' : 'Manage password, two-factor authentication and active sessions.')} 
                  />

                  {/* Active Account Identity Card */}
                  <SettingsCard 
                    title={isVietnamese ? 'Tài khoản đang đăng nhập' : 'Current Account'} 
                    description={isVietnamese ? 'Thông tin đăng nhập và vai trò quản trị.' : 'Active credentials and role.'} 
                    icon={UserRoundCog}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <SignedImage filePath={currentUser?.avatar || ''} alt={currentUser?.name || 'User'} className="h-12 w-12 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700" />
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{currentUser?.name || 'Costack User'}</p>
                          <p className="text-xs text-slate-400">{currentUser?.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60 px-3 py-1 text-[10.5px] font-black uppercase">
                          {currentUser?.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        {sessionDetails?.lastSignIn && (
                          <span className="text-[10px] text-slate-400">
                            {isVietnamese ? 'Đăng nhập: ' : 'Signed in: '}
                            {new Date(sessionDetails.lastSignIn).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                          </span>
                        )}
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Change Password Card */}
                  <SettingsCard 
                    title={isVietnamese ? 'Đổi mật khẩu tài khoản' : 'Change Password'} 
                    description={isVietnamese ? 'Sử dụng mật khẩu mạnh tối thiểu 10 ký tự kết hợp chữ hoa, chữ thường và chữ số.' : 'Set a strong, unique password for Costack.'} 
                    icon={KeyRound}
                  >
                    <form onSubmit={updatePassword} className="space-y-4">
                      <div className="grid gap-3.5 sm:grid-cols-3">
                        <label className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Mật khẩu hiện tại' : 'Current password'}</span>
                          <input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="••••••••" className={inputClass} />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Mật khẩu mới' : 'New password'}</span>
                          <input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="••••••••" className={inputClass} />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Xác nhận mật khẩu' : 'Confirm password'}</span>
                          <input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="••••••••" className={inputClass} />
                        </label>
                      </div>

                      {/* Password strength checklist */}
                      {newPassword && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{isVietnamese ? 'Độ an toàn mật khẩu' : 'Password Strength'}</span>
                            <span className={`font-bold text-[11px] ${passwordStrength.score >= 3 ? 'text-emerald-500' : passwordStrength.score === 2 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {passwordStrength.score >= 4 ? (isVietnamese ? 'Rất mạnh' : 'Strong') : passwordStrength.score === 3 ? (isVietnamese ? 'Khá tốt' : 'Good') : (isVietnamese ? 'Chưa đủ mạnh' : 'Weak')}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 h-1.5">
                            {[1, 2, 3, 4].map(step => (
                              <div key={step} className={`rounded-full transition-colors ${passwordStrength.score >= step ? (passwordStrength.score >= 3 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-200 dark:bg-slate-800'}`} />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] pt-1 text-slate-500">
                            <span className={passwordStrength.hasLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>✓ {isVietnamese ? '>= 10 ký tự' : '>= 10 chars'}</span>
                            <span className={passwordStrength.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>✓ {isVietnamese ? 'Chữ hoa A-Z' : 'Uppercase'}</span>
                            <span className={passwordStrength.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>✓ {isVietnamese ? 'Chữ thường a-z' : 'Lowercase'}</span>
                            <span className={passwordStrength.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>✓ {isVietnamese ? 'Chữ số 0-9' : 'Numbers'}</span>
                          </div>
                        </div>
                      )}

                      {passwordError && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                          {passwordError}
                        </p>
                      )}

                      <div className="flex justify-end pt-1">
                        <button 
                          type="submit" 
                          disabled={updatingPassword || !newPassword || !confirmPassword} 
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          {updatingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          <span>{isVietnamese ? 'Cập nhật mật khẩu' : 'Update Password'}</span>
                        </button>
                      </div>
                    </form>
                  </SettingsCard>

                  {/* Two-Factor Authentication (TOTP) */}
                  <SettingsCard
                    title={isVietnamese ? 'Xác thực hai bước (2FA Authenticator)' : 'Two-Factor Authentication (2FA)'}
                    description={isVietnamese ? 'Bảo vệ đăng nhập bằng mã OTP 6 chữ số từ ứng dụng Google Authenticator hoặc Apple Keychain.' : 'Protect your login with standard 6-digit TOTP codes.'}
                    icon={ShieldCheck}
                    action={
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold ${isMfaActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {isMfaActive ? (isVietnamese ? 'Đã bật' : 'Active') : (isVietnamese ? 'Đang tắt' : 'Disabled')}
                        </span>
                        <Toggle
                          checked={isMfaActive || Boolean(mfaEnrollment)}
                          onChange={handleToggleMfa}
                          disabled={mfaBusy}
                          label="Toggle Authenticator 2FA"
                        />
                      </div>
                    }
                  >
                    {mfaEnrollment ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-indigo-600" />
                            <span className="font-bold">{isVietnamese ? 'Đang thiết lập Authenticator (Bước 1/2)' : 'Setup Authenticator (Step 1/2)'}</span>
                          </div>
                          <button onClick={cancelMfaEnrollment} className="font-bold text-slate-500 hover:text-slate-700 cursor-pointer">
                            {isVietnamese ? 'Hủy' : 'Cancel'}
                          </button>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-[180px_1fr] items-center">
                          <div className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-white border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                            <img src={mfaEnrollment.qrCode} alt="2FA QR Code" className="h-36 w-36 object-contain" />
                            <span className="text-[10px] text-slate-500 mt-1 font-semibold">{isVietnamese ? 'Quét bằng camera' : 'Scan in App'}</span>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {isVietnamese 
                                ? '1. Mở ứng dụng Google Authenticator hoặc Microsoft Authenticator trên điện thoại và quét mã QR ở bên.'
                                : '1. Open Google Authenticator or Microsoft Authenticator and scan this QR code.'}
                            </p>
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-slate-500">{isVietnamese ? '2. Nhập mã OTP 6 chữ số để xác nhận:' : '2. Enter the 6-digit code:'}</span>
                              <div className="flex items-center gap-2">
                                <OtpCodeInput
                                  value={mfaCode}
                                  onChange={setMfaCode}
                                  onComplete={(code) => verifyMfaEnrollment(code)}
                                />
                                <button
                                  type="button"
                                  onClick={() => verifyMfaEnrollment()}
                                  disabled={mfaBusy || mfaCode.length !== 6}
                                  className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                                >
                                  {mfaBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (isVietnamese ? 'Kích hoạt' : 'Verify')}
                                </button>
                              </div>
                            </div>
                            {mfaError && <p className="text-xs text-rose-500 font-bold">{mfaError}</p>}
                          </div>
                        </div>
                      </div>
                    ) : isMfaActive ? (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs">
                        <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-semibold">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>{isVietnamese ? 'Tài khoản của bạn đã được bảo vệ an toàn bằng xác thực hai bước.' : 'Your account is protected by 2FA.'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => verifiedMfaFactor && setConfirmDisableMfaModal(verifiedMfaFactor.id)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                        >
                          {isVietnamese ? 'Tắt 2FA' : 'Disable'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 text-xs">
                        <span className="text-slate-500">
                          {isVietnamese ? 'Chưa bật 2FA. Bật ngay để chống xâm nhập trái phép vào tài khoản của bạn.' : '2FA is disabled. Enable to secure your account.'}
                        </span>
                        <button
                          type="button"
                          onClick={startMfaEnrollment}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                        >
                          {isVietnamese ? 'Thiết lập 2FA' : 'Setup 2FA'}
                        </button>
                      </div>
                    )}
                  </SettingsCard>

                  {/* Active Sessions Card */}
                  <SettingsCard 
                    title={isVietnamese ? 'Phiên đăng nhập & Thiết bị' : 'Active Sessions'} 
                    description={isVietnamese ? 'Đăng xuất tài khoản khỏi các trình duyệt và thiết bị khác từ xa.' : 'Remotely sign out all other devices.'} 
                    icon={Laptop}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {isVietnamese ? 'Đăng xuất các thiết bị khác' : 'Sign out other sessions'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {isVietnamese 
                            ? 'Thu hồi quyền truy cập của mọi thiết bị khác đã đăng nhập vào tài khoản này.' 
                            : 'Revoke access tokens on all other browsers and phones.'}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={revokeOtherSessions} 
                        disabled={revokingSessions} 
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {revokingSessions ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 text-rose-500" />}
                        <span>{isVietnamese ? 'Thu hồi phiên khác' : 'Revoke Others'}</span>
                      </button>
                    </div>
                  </SettingsCard>
                </>
              )}

              {/* ── TAB 8: DATA & STORAGE ── */}
              {activeTab === 'data_export' && (
                <>
                  <SectionHeader 
                    eyebrow={t('settingsDataExport') || (isVietnamese ? 'Quyền sở hữu dữ liệu' : 'Data Ownership')} 
                    title={t('dataAndStorage') || (isVietnamese ? 'Dữ liệu, Thùng rác & Lưu trữ' : 'Data, Trash & Storage')} 
                    description={t('dataAndStorageDesc') || (isVietnamese ? 'Xuất dữ liệu dự phòng, quản lý chính sách tự động dọn dẹp thùng rác và bộ nhớ đệm.' : 'Export backups, manage trash auto-purge policies and local caching.')} 
                  />

                  {/* Summary Metric Cards */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: isVietnamese ? 'Công việc trong không gian' : 'Workspace Tasks', value: tasks.filter(t => !activeWorkspace || t.workspaceId === activeWorkspace.id).length, icon: Archive, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
                      { label: isVietnamese ? 'Thành viên hợp tác' : 'Collaborators', value: members.length, icon: UsersRound, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                      { label: isVietnamese ? 'Nhật ký sự kiện' : 'Recorded Events', value: syncLogs.length, icon: Activity, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' }
                    ].map(metric => (
                      <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 shadow-2xs">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${metric.tone}`}>
                          <metric.icon className="h-4 w-4" />
                        </div>
                        <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">{metric.value}</p>
                        <p className="text-xs text-slate-400 font-medium">{metric.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* TRASH RETENTION POLICY CARD */}
                  <SettingsCard
                    title={isVietnamese ? 'Chính sách tự động dọn dẹp Thùng rác' : 'Trash Auto-Purge Policy'}
                    description={isVietnamese ? 'Cấu hình khoảng thời gian công việc bị xóa được lưu giữ trước khi hệ thống tự động xóa vĩnh viễn.' : 'Configure retention window before deleted tasks are permanently removed.'}
                    icon={Clock}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {isVietnamese ? 'Thời gian lưu giữ trong thùng rác' : 'Trash Retention Window'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {isVietnamese 
                            ? `Hiện tại các công việc bị chuyển vào thùng rác sẽ tự động bị xóa vĩnh viễn sau ${trashRetention} ngày.`
                            : `Tasks in trash will be automatically permanently deleted after ${trashRetention} days.`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select<number>
                          value={trashRetention}
                          onChange={(days) => {
                            setTrashRetention(days);
                            setTrashRetentionDays(days);
                            triggerToast?.('success', isVietnamese ? 'Đã lưu chính sách thùng rác' : 'Trash Policy Saved', isVietnamese ? `Tự động dọn sau ${days} ngày.` : `Auto-purge after ${days} days.`);
                          }}
                          className="w-48"
                          ariaLabel="Trash Retention Days"
                          options={TRASH_RETENTION_OPTIONS.map(opt => ({
                            value: opt.value,
                            label: isVietnamese ? opt.labelVi : opt.labelEn
                          }))}
                        />
                      </div>
                    </div>
                  </SettingsCard>

                  {/* JSON Backup Card */}
                  <SettingsCard 
                    title={isVietnamese ? 'Xuất bản sao lưu JSON toàn diện' : 'JSON Full Backup'} 
                    description={isVietnamese ? 'Tải tệp JSON chứa cấu hình, công việc, thành viên và lịch sử hoạt động để lưu trữ dự phòng.' : 'Download complete JSON export for external backup or migration.'} 
                    icon={Download}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                          <Cloud className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Bản sao lưu cấu trúc (.json)' : 'Full JSON Structure (.json)'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{isVietnamese ? 'Tạo trực tiếp và an toàn trên thiết bị của bạn.' : 'Generated securely in-browser.'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importSettingsBackup(file); }} />
                        <button 
                          type="button" 
                          onClick={() => backupInputRef.current?.click()} 
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>{isVietnamese ? 'Nhập cài đặt' : 'Import'}</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={exportWorkspaceData} 
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-bold transition cursor-pointer shadow-sm"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{isVietnamese ? 'Xuất dữ liệu' : 'Export JSON'}</span>
                        </button>
                      </div>
                    </div>
                  </SettingsCard>

                  {/* CSV Export Card */}
                  <SettingsCard 
                    title={isVietnamese ? 'Xuất công việc ra Excel / Google Sheets (CSV)' : 'Export Tasks to CSV'} 
                    description={isVietnamese ? 'Tải tệp bảng tính CSV chuẩn UTF-8 chứa tiêu đề, trạng thái, người thực hiện và hạn chót.' : 'Download tasks spreadsheet compatible with Excel and Google Sheets.'} 
                    icon={FileSpreadsheet}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Bảng tính công việc (.csv)' : 'Task Spreadsheet (.csv)'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isVietnamese 
                              ? `Gồm ${tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id).length} công việc trong không gian này.` 
                              : `Includes ${tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id).length} tasks.`}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={exportTasksToCsv} 
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-xs font-bold transition cursor-pointer shadow-sm shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{isVietnamese ? 'Xuất tệp CSV' : 'Export CSV'}</span>
                      </button>
                    </div>
                  </SettingsCard>

                  {/* Reset Cache Card */}
                  <SettingsCard 
                    title={isVietnamese ? 'Bộ nhớ đệm cục bộ trên trình duyệt' : 'Local Browser Cache'} 
                    description={isVietnamese ? 'Đặt lại tùy chọn hiển thị tạm thời trên thiết bị này mà không ảnh hưởng dữ liệu đám mây.' : 'Reset device display caches without modifying cloud data.'} 
                    icon={RefreshCw}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Đặt lại bộ nhớ đệm giao diện' : 'Reset UI Preferences'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{isVietnamese ? 'Xóa màu nhấn, hiệu ứng và đưa giao diện về trạng thái ban đầu.' : 'Restore theme and visual effects to factory defaults.'}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={resetDisplayPreferences} 
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                        <span>{isVietnamese ? 'Đặt lại giao diện' : 'Reset Cache'}</span>
                      </button>
                    </div>
                  </SettingsCard>
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── MODALS ── */}
      {/* Create Workspace Modal */}
      <AnimatePresence>
        {createWorkspaceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setCreateWorkspaceOpen(false)} 
              className="fixed inset-0 bg-slate-950/50 cursor-pointer" 
            />
            <motion.form 
              initial={{ opacity: 0, scale: 0.95, y: 12 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 8 }} 
              onSubmit={createWorkspace} 
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{isVietnamese ? 'Tạo không gian làm việc mới' : 'Create New Workspace'}</h3>
                  <p className="text-[11px] text-slate-400">{isVietnamese ? 'Khởi tạo không gian cho phòng ban hoặc dự án mới.' : 'Set up a new space for your department or project.'}</p>
                </div>
                <button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Tên không gian' : 'Workspace Name'}</span>
                  <input autoFocus required value={newWorkspaceName} onChange={event => setNewWorkspaceName(event.target.value)} placeholder={isVietnamese ? 'Kỹ thuật, Tiếp thị, Vận hành…' : 'Engineering, Marketing...'} className={inputClass} />
                </label>
                <div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-2">{isVietnamese ? 'Màu thương hiệu' : 'Theme Color'}</span>
                  <div className="grid grid-cols-4 gap-2">
                    {accentOptions.map(option => (
                      <button 
                        type="button" 
                        key={option.id} 
                        onClick={() => setNewWorkspaceTheme(option.id)} 
                        className={`h-9 rounded-xl ${option.className} cursor-pointer transition-all ${newWorkspaceTheme === option.id ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-102' : 'opacity-70 hover:opacity-100'}`} 
                        aria-label={option.name} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5">
                <button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="h-8.5 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 cursor-pointer">
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button type="submit" disabled={!newWorkspaceName.trim()} className="h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-xs font-bold transition disabled:opacity-50 cursor-pointer">
                  {isVietnamese ? 'Tạo không gian' : 'Create Workspace'}
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {/* Delete Workspace Modal */}
        {deleteWorkspace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setDeleteWorkspace(null)} 
              className="fixed inset-0 bg-slate-950/60 cursor-pointer" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="relative z-10 w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 p-5 shadow-2xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-3">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? `Xác nhận xóa “${deleteWorkspace.name}”?` : `Delete "${deleteWorkspace.name}"?`}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isVietnamese 
                  ? 'Thao tác này sẽ xóa vĩnh viễn không gian làm việc cùng toàn bộ công việc và dữ liệu liên quan. Nhập chính xác tên không gian để xác nhận:' 
                  : 'This permanently removes the workspace and all tasks. Type the workspace name to confirm:'}
              </p>
              <input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} placeholder={deleteWorkspace.name} className={`${inputClass} mt-3`} />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setDeleteWorkspace(null); setDeleteConfirmation(''); }} className="h-8.5 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 cursor-pointer">
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button 
                  type="button" 
                  disabled={deleteConfirmation !== deleteWorkspace.name} 
                  onClick={() => { 
                    onDeleteWorkspace?.(deleteWorkspace.id); 
                    onAddSyncLog?.(isVietnamese ? `Đã xóa không gian “${deleteWorkspace.name}”` : `Deleted workspace "${deleteWorkspace.name}"`); 
                    setDeleteWorkspace(null); 
                    setDeleteConfirmation(''); 
                  }} 
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? 'Xác nhận xóa' : 'Delete Permanently'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Confirm Disable MFA Modal */}
        {confirmDisableMfaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setConfirmDisableMfaModal(null)} 
              className="fixed inset-0 bg-slate-950/60 cursor-pointer" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="relative z-10 w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 p-5 shadow-2xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-3">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Tắt xác thực hai bước (2FA)?' : 'Disable Two-Factor Authentication?'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isVietnamese 
                  ? 'Tài khoản của bạn sẽ không còn được bảo vệ bằng mã OTP 6 chữ số khi đăng nhập. Bạn có thể bật lại bất kỳ lúc nào.' 
                  : 'Your account will no longer require a 6-digit OTP code when logging in.'}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmDisableMfaModal(null)} className="h-8.5 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 cursor-pointer">
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button 
                  type="button" 
                  disabled={mfaBusy} 
                  onClick={() => removeMfaFactor(confirmDisableMfaModal)} 
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {mfaBusy && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>{isVietnamese ? 'Tắt 2FA' : 'Disable 2FA'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar Order Modal */}
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
