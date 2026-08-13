"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, AlertTriangle, Archive, Bell, Brain, BriefcaseBusiness, Check,
  CheckCircle2, ChevronRight, CircleUserRound, Clipboard, Cloud, Copy,
  Database, Download, Eye, EyeOff, FileClock, Globe2, KeyRound, Laptop,
  LockKeyhole, LogOut, Mail, Menu, MonitorCog, Moon, Palette, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  Sun, Trash2, Upload, UserRoundCog, UsersRound, Volume2, VolumeX, X,
  Zap
} from 'lucide-react';
import SignedImage from './SignedImage';
import TeamDirectory from './TeamDirectory';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/contexts/TranslationContext';
import type { NotificationSettings, SyncLog, Task, User, Workspace } from '@/types';

export const WORKSPACE_COVERS = [
  { id: 'cover1', name: 'Amethyst', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover2', name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover3', name: 'Green Valley', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover4', name: 'Peaceful Lake', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover5', name: 'City Town', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80' },
  { id: 'cover6', name: 'Desert Sunrise', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5edd0cd9?w=800&auto=format&fit=crop&q=80' }
];

type AccentPreset = 'indigo' | 'ocean' | 'forest' | 'sunset';
type BlurIntensity = 'soft' | 'default' | 'immersive';
type SettingsTab = 'general' | 'people' | 'preferences' | 'notifications' | 'ai_usage' | 'security' | 'data_export' | 'audit_logs';

interface SettingsPanelProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  accentPreset: AccentPreset;
  setAccentPreset: (value: AccentPreset) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  blurIntensity: BlurIntensity;
  setBlurIntensity: (value: BlurIntensity) => void;
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

const accentOptions: Array<{ id: AccentPreset; name: string; hex: string; className: string }> = [
  { id: 'indigo', name: 'Apexa Violet', hex: '#7B61FF', className: 'from-indigo-500 to-violet-600' },
  { id: 'ocean', name: 'Ocean Blue', hex: '#0EA5E9', className: 'from-sky-400 to-blue-600' },
  { id: 'forest', name: 'Forest Green', hex: '#10B981', className: 'from-emerald-400 to-teal-600' },
  { id: 'sunset', name: 'Sunset Rose', hex: '#F43F5E', className: 'from-orange-400 to-rose-600' }
];

const navigationSections: Array<{ label: string; items: Array<{ id: SettingsTab; label: string; description: string; icon: React.ElementType }> }> = [
  {
    label: 'Workspace',
    items: [
      { id: 'general', label: 'Workspace', description: 'Identity and branding', icon: BriefcaseBusiness },
      { id: 'people', label: 'People', description: 'Members and access', icon: UsersRound },
      { id: 'ai_usage', label: 'Apexa AI', description: 'Model configuration', icon: Brain },
      { id: 'audit_logs', label: 'Activity log', description: 'Workspace events', icon: FileClock },
      { id: 'data_export', label: 'Data & storage', description: 'Export and cache', icon: Database }
    ]
  },
  {
    label: 'Personal',
    items: [
      { id: 'preferences', label: 'Appearance', description: 'Theme and language', icon: Palette },
      { id: 'notifications', label: 'Notifications', description: 'Alerts and focus', icon: Bell },
      { id: 'security', label: 'Security', description: 'Account and sessions', icon: ShieldCheck }
    ]
  }
];

const inputClass = 'w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 px-3 text-sm font-semibold text-slate-850 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 placeholder:text-slate-400';
const selectClass = `${inputClass} appearance-none cursor-pointer`;

function Toggle({ checked, onChange, disabled = false, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SettingsCard({ title, description, icon: Icon, children, tone = 'default' }: { title: string; description?: string; icon?: React.ElementType; children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:bg-slate-900 ${tone === 'danger' ? 'border-rose-200 dark:border-rose-900/60' : 'border-slate-200/80 dark:border-slate-800'}`}>
      <div className={`flex items-start gap-3 border-b px-5 py-4 ${tone === 'danger' ? 'border-rose-100 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/15' : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900'}`}>
        {Icon && <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'}`}><Icon className="h-4.5 w-4.5" /></div>}
        <div>
          <h3 className={`text-sm font-extrabold ${tone === 'danger' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SettingRow({ title, description, children, last = false }: { title: string; description: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${last ? '' : 'border-b border-slate-100 dark:border-slate-800/80'}`}>
      <div className="max-w-xl pr-4">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPanel({
  isDarkMode, setIsDarkMode, accentPreset, setAccentPreset, soundEnabled,
  setSoundEnabled, blurIntensity, setBlurIntensity, notificationSettings,
  setNotificationSettings, workspaces = [], activeWorkspaceId = '',
  onUpdateWorkspace, onDeleteWorkspace, onAddWorkspace, members = [], tasks = [],
  onAddMember, onUpdateMember, onDeleteMember, onAddSyncLog, syncLogs = [],
  activeSettingsTab, setActiveSettingsTab, onLogout, triggerToast,
  onSendWorkspaceInvites
}: SettingsPanelProps) {
  const currentUser = useAuthStore(state => state.currentUser);
  const { locale, setLocale } = useTranslation();
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
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceCover, setWorkspaceCover] = useState('');
  const [workspaceLogo, setWorkspaceLogo] = useState('');
  const [workspaceTheme, setWorkspaceTheme] = useState<AccentPreset>('indigo');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceTheme, setNewWorkspaceTheme] = useState<AccentPreset>('indigo');
  const [newWorkspaceCover, setNewWorkspaceCover] = useState('');
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-3.6-flash');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiSearchGrounding, setAiSearchGrounding] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    setWorkspaceName(activeWorkspace.name || '');
    setWorkspaceCover(activeWorkspace.coverUrl || '');
    setWorkspaceLogo(activeWorkspace.logoUrl || '');
    setWorkspaceTheme((activeWorkspace.theme as AccentPreset) || 'indigo');
  }, [activeWorkspace]);

  useEffect(() => {
    setAiApiKey(localStorage.getItem('apexa_gemini_api_key') || '');
    setAiModel(localStorage.getItem('apexa_ai_model') || 'gemini-3.6-flash');
    setAiTemperature(Number(localStorage.getItem('apexa_ai_temperature') || 0.7));
    setAiSearchGrounding(localStorage.getItem('apexa_ai_search_grounding') === 'true');
  }, []);

  const visibleNavigation = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(settingsSearch.toLowerCase()))
  })).filter(section => section.items.length > 0);

  const filteredLogs = syncLogs.filter(log => `${log.action} ${log.time} ${log.status}`.toLowerCase().includes(logSearch.toLowerCase()));

  const saveWorkspace = async () => {
    if (!activeWorkspace || !workspaceName.trim() || !onUpdateWorkspace) return;
    setIsSavingWorkspace(true);
    await Promise.resolve(onUpdateWorkspace(activeWorkspace.id, workspaceName.trim(), workspaceTheme, workspaceCover || undefined, workspaceLogo || undefined, activeWorkspace.settings));
    onAddSyncLog?.(`Updated workspace “${workspaceName.trim()}” settings`);
    triggerToast?.('success', 'Workspace updated', 'Identity and branding changes have been saved.');
    window.setTimeout(() => setIsSavingWorkspace(false), 350);
  };

  const createWorkspace = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newWorkspaceName.trim()) return;
    onAddWorkspace?.(newWorkspaceName.trim(), newWorkspaceTheme, newWorkspaceCover || undefined);
    onAddSyncLog?.(`Created workspace “${newWorkspaceName.trim()}”`);
    triggerToast?.('success', 'Workspace created', `“${newWorkspaceName.trim()}” is ready.`);
    setCreateWorkspaceOpen(false);
    setNewWorkspaceName('');
    setNewWorkspaceCover('');
  };

  const saveAiSettings = () => {
    localStorage.setItem('apexa_gemini_api_key', aiApiKey.trim());
    localStorage.setItem('apexa_ai_model', aiModel);
    localStorage.setItem('apexa_ai_temperature', String(aiTemperature));
    localStorage.setItem('apexa_ai_search_grounding', String(aiSearchGrounding));
    onAddSyncLog?.('Updated Apexa AI configuration');
    triggerToast?.('success', 'AI settings saved', 'Model preferences were saved on this device.');
  };

  const testAiConnection = async () => {
    if (!aiApiKey.trim()) {
      triggerToast?.('warning', 'API key required', 'Add a Gemini API key before testing the connection.');
      return;
    }
    setTestingAi(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond with OK' }] }] })
      });
      if (!response.ok) throw new Error('The API key or selected model could not be verified.');
      triggerToast?.('success', 'Connection successful', `${aiModel} is available and ready.`);
      onAddSyncLog?.('Verified Apexa AI connection');
    } catch (error) {
      triggerToast?.('error', 'Connection failed', error instanceof Error ? error.message : 'Unable to reach the AI service.');
    } finally {
      setTestingAi(false);
    }
  };

  const exportWorkspaceData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      workspace: activeWorkspace,
      members,
      tasks: tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id),
      activity: syncLogs
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa-${activeWorkspace?.name || 'workspace'}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', 'Export ready', 'A JSON backup was downloaded to your device.');
    onAddSyncLog?.('Exported workspace data');
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-none border-0 bg-white dark:bg-slate-950">

      <aside className={`${mobileNavigationOpen ? 'absolute inset-0 z-30 flex w-full' : 'hidden'} flex-col border-r border-slate-200/80 bg-white/95 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:relative md:flex md:w-[276px] md:shrink-0`}>
        <div className="mb-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20"><Settings2 className="h-4.5 w-4.5" /></div>
            <div>
              <h1 className="text-sm font-black text-slate-950 dark:text-white">Settings</h1>
              <p className="text-[10px] font-medium text-slate-400">Workspace control center</p>
            </div>
          </div>
          <button type="button" onClick={() => setMobileNavigationOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"><X className="h-4 w-4" /></button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={settingsSearch} onChange={event => setSettingsSearch(event.target.value)} placeholder="Search settings" className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" />
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 scrollbar-none">
          {visibleNavigation.map(section => (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{section.label}</p>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const selected = item.id === activeTab;
                  return (
                    <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/50' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}`}>
                      <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">{item.label}</span>
                        <span className={`mt-0.5 block truncate text-[10px] ${selected ? 'text-indigo-500/80 dark:text-indigo-400/70' : 'text-slate-400 dark:text-slate-500'}`}>{item.description}</span>
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
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
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"><LogOut className="h-4 w-4" />Log out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-white dark:bg-slate-950">
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:px-7">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavigationOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 md:hidden"><Menu className="h-4 w-4" /></button>
            <div><p className="text-xs font-black text-slate-800 dark:text-slate-200">{navigationSections.flatMap(section => section.items).find(item => item.id === activeTab)?.label}</p><p className="hidden text-[10px] text-slate-400 sm:block">Changes are saved securely and synced when applicable</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />All systems operational</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }} className="mx-auto max-w-5xl space-y-6 p-4 pb-16 sm:p-7 lg:p-9">
            {activeTab === 'general' && (
              <>
                <SectionHeader eyebrow="Workspace administration" title="Workspace identity" description="Manage the name, visual identity and workspace-level defaults your team sees every day." action={<button type="button" onClick={() => setCreateWorkspaceOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/15 transition hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" />New workspace</button>} />
                {activeWorkspace ? (
                  <>
                    <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-800">
                      {workspaceCover ? <img src={workspaceCover} alt="Workspace cover" className="h-full w-full object-cover opacity-80" /> : <div className="h-full w-full bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
                      <div className="absolute inset-x-5 bottom-5 flex items-end gap-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/95 text-xl font-black text-indigo-600 shadow-xl">{workspaceLogo ? <img src={workspaceLogo} alt="Workspace logo" className="h-full w-full object-cover" /> : workspaceName.charAt(0).toUpperCase()}</div>
                        <div><p className="text-lg font-black text-white">{workspaceName || activeWorkspace.name}</p><p className="text-xs font-medium text-white/70">{members.length} members · {tasks.filter(task => task.workspaceId === activeWorkspace.id).length} tasks</p></div>
                      </div>
                    </div>
                    <SettingsCard title="Basic information" description="Use a clear name and recognizable visual identity." icon={CircleUserRound}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="space-y-1.5"><span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Workspace name</span><input value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} maxLength={60} className={inputClass} /></label>
                      </div>
                      <div className="mt-5"><p className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">Brand color</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{accentOptions.map(option => <button type="button" key={option.id} onClick={() => setWorkspaceTheme(option.id)} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${workspaceTheme === option.id ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/10 dark:bg-indigo-950/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'}`}><span className={`h-7 w-7 rounded-lg bg-gradient-to-br ${option.className}`} /><span><span className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{option.name}</span><span className="text-[9px] font-mono text-slate-400">{option.hex}</span></span>{workspaceTheme === option.id && <Check className="ml-auto h-3.5 w-3.5 text-indigo-600" />}</button>)}</div></div>
                      <div className="mt-5 flex justify-end"><button type="button" onClick={saveWorkspace} disabled={!workspaceName.trim() || isSavingWorkspace} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950">{isSavingWorkspace ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Save changes</button></div>
                    </SettingsCard>

                    <SettingsCard title="Danger zone" description="These actions affect everyone with access to this workspace." icon={AlertTriangle} tone="danger"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Delete this workspace</p><p className="mt-1 text-xs text-slate-500">Permanently removes the workspace and associated structure.</p></div><button type="button" onClick={() => setDeleteWorkspace(activeWorkspace)} disabled={workspaces.length <= 1} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-xs font-extrabold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:bg-slate-950"><Trash2 className="h-3.5 w-3.5" />Delete workspace</button></div></SettingsCard>
                  </>
                ) : <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No workspace selected</p></div>}
              </>
            )}

            {activeTab === 'people' && (
              <><SectionHeader eyebrow="Team administration" title="People and access" description="Invite teammates, organize departments and understand how work is distributed." />
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><TeamDirectory members={members} tasks={tasks} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onAddMember={onAddMember || (() => {})} onUpdateMember={onUpdateMember || (() => {})} onDeleteMember={onDeleteMember || (() => {})} onAddSyncLog={onAddSyncLog || (() => {})} currentUser={currentUser} onSendWorkspaceInvites={onSendWorkspaceInvites} /></div></>
            )}

            {activeTab === 'preferences' && (
              <><SectionHeader eyebrow="Personal settings" title="Appearance and experience" description="Tune Apexa to match your environment, focus style and preferred language." />
                <SettingsCard title="Color mode" description="Choose the interface that feels most comfortable throughout your day." icon={MonitorCog}><div className="grid gap-3 sm:grid-cols-3">{[
                  { id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }, { id: 'system', label: 'System', icon: Laptop }
                ].map(option => { const selected = option.id === 'system' ? false : option.id === 'dark' ? isDarkMode : !isDarkMode; const Icon = option.icon; return <button type="button" key={option.id} onClick={() => { if (option.id === 'system') setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches); else setIsDarkMode(option.id === 'dark'); }} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/10 dark:bg-indigo-950/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'}`}><Icon className={`h-5 w-5 ${selected ? 'text-indigo-600' : 'text-slate-400'}`} /><p className="mt-4 text-sm font-extrabold text-slate-800 dark:text-slate-200">{option.label}</p><p className="mt-1 text-[10px] text-slate-400">{option.id === 'system' ? 'Follow device preference' : `${option.label} interface`}</p></button>; })}</div></SettingsCard>
                <SettingsCard title="Accent and effects" description="Keep actions visually distinct without adding unnecessary noise." icon={Palette}><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{accentOptions.map(option => <button type="button" key={option.id} onClick={() => setAccentPreset(option.id)} className={`rounded-xl border p-3 text-left transition ${accentPreset === option.id ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800'}`}><span className={`block h-9 rounded-lg bg-gradient-to-r ${option.className}`} /><span className="mt-2 block text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{option.name}</span></button>)}</div><div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800"><SettingRow title="Interface depth" description="Controls glass blur and surface separation."><select value={blurIntensity} onChange={event => setBlurIntensity(event.target.value as BlurIntensity)} className={`${selectClass} w-40`}><option value="soft">Soft</option><option value="default">Balanced</option><option value="immersive">Immersive</option></select></SettingRow><SettingRow title="Interface sounds" description="Play subtle audio feedback for important actions." last><Toggle checked={soundEnabled} onChange={setSoundEnabled} label="Interface sounds" /></SettingRow></div></SettingsCard>
                <SettingsCard title="Language and region" description="Language changes are applied immediately across supported areas." icon={Globe2}><SettingRow title="Display language" description="Choose the primary language for Apexa." last><select value={locale} onChange={event => setLocale(event.target.value)} className={`${selectClass} w-44`}><option value="en">English</option><option value="vi">Tiếng Việt</option></select></SettingRow></SettingsCard></>
            )}

            {activeTab === 'notifications' && (
              <><SectionHeader eyebrow="Attention management" title="Notifications and focus" description="Stay informed without letting updates take over your workday." />
                <SettingsCard title="Notification delivery" description="Master controls for alerts across this device." icon={Bell}><SettingRow title="Enable notifications" description="Receive activity updates and reminders."><Toggle checked={notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, enableAll: value }))} label="Enable notifications" /></SettingRow><SettingRow title="Notification sound" description="Play a short sound for delivered alerts."><Toggle checked={notificationSettings.enableSound} disabled={!notificationSettings.enableAll} onChange={value => { setNotificationSettings(previous => ({ ...previous, enableSound: value })); setSoundEnabled(value); }} label="Notification sound" /></SettingRow><SettingRow title="Important updates only" description="Reduce noise by prioritizing assignments and deadlines." last><Toggle checked={notificationSettings.onlyImportant} disabled={!notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, onlyImportant: value }))} label="Important updates only" /></SettingRow></SettingsCard>
                <SettingsCard title="What should notify you" description="Fine-tune the types of activity that can interrupt your focus." icon={SlidersHorizontal}><div className="grid gap-x-8 sm:grid-cols-2">{[
                  ['enableAssignments', 'Assignments', 'When work is assigned to you'], ['enableDeadlines', 'Deadlines', 'Upcoming and overdue reminders'], ['enableComments', 'Comments', 'Replies and mentions in discussion'], ['enableStatusChanges', 'Status changes', 'Progress updates on followed work'], ['enableFilteringTags', 'Tag activity', 'Updates for followed labels'], ['enableSystemNotify', 'System events', 'Sync, security and account activity']
                ].map(([key, title, description], index) => <SettingRow key={key} title={title} description={description} last={index >= 4}><Toggle checked={Boolean(notificationSettings[key as keyof NotificationSettings])} disabled={!notificationSettings.enableAll} onChange={value => setNotificationSettings(previous => ({ ...previous, [key]: value }))} label={title} /></SettingRow>)}</div></SettingsCard>
                <SettingsCard title="Focus schedule" description="Automatically quiet routine alerts during deep-work hours." icon={Moon}><SettingRow title="Do not disturb" description="Pause routine notifications until you turn it off."><Toggle checked={notificationSettings.dndActive} onChange={value => setNotificationSettings(previous => ({ ...previous, dndActive: value }))} label="Do not disturb" /></SettingRow><SettingRow title="Scheduled quiet hours" description="Set a recurring window for focused work."><Toggle checked={!!notificationSettings.dndScheduleEnabled} onChange={value => setNotificationSettings(previous => ({ ...previous, dndScheduleEnabled: value }))} label="Scheduled quiet hours" /></SettingRow>{notificationSettings.dndScheduleEnabled && <div className="grid gap-3 border-b border-slate-100 py-4 dark:border-slate-800 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Starts</span><input type="time" value={notificationSettings.dndScheduleStart || '18:00'} onChange={event => setNotificationSettings(previous => ({ ...previous, dndScheduleStart: event.target.value }))} className={inputClass} /></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ends</span><input type="time" value={notificationSettings.dndScheduleEnd || '08:00'} onChange={event => setNotificationSettings(previous => ({ ...previous, dndScheduleEnd: event.target.value }))} className={inputClass} /></label></div>}<SettingRow title="Alert frequency" description="Group notifications to reduce interruption." last><select value={notificationSettings.frequencyLimit} onChange={event => setNotificationSettings(previous => ({ ...previous, frequencyLimit: event.target.value as NotificationSettings['frequencyLimit'] }))} className={`${selectClass} w-44`}><option value="all">Every update</option><option value="throttled">Smart grouping</option><option value="minimal">Minimal</option></select></SettingRow></SettingsCard></>
            )}

            {activeTab === 'ai_usage' && (
              <><SectionHeader eyebrow="Intelligence layer" title="Apexa AI configuration" description="Control the model used for summaries, task generation and productivity assistance." action={<div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-violet-600 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-400">Advanced</div>} />
                <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 dark:border-violet-900/60 dark:from-violet-950/30 dark:via-slate-900 dark:to-indigo-950/20"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20"><Sparkles className="h-5 w-5" /></div><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Bring your own Gemini key</h3><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">The key is stored locally on this device. For production teams, prefer a server-managed integration so credentials are not exposed to the browser.</p></div></div></div>
                <SettingsCard title="Connection" description="Connect a supported Gemini model to Apexa AI." icon={Zap}><div className="space-y-5"><label className="block space-y-1.5"><span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Gemini API key</span><div className="relative"><input type={showApiKey ? 'text' : 'password'} value={aiApiKey} onChange={event => setAiApiKey(event.target.value)} placeholder="AIza…" className={`${inputClass} pr-11 font-mono`} /><button type="button" onClick={() => setShowApiKey(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Model</span><select value={aiModel} onChange={event => setAiModel(event.target.value)} className={selectClass}><option value="gemini-3.6-flash">Gemini 3.6 Flash</option><option value="gemini-3.6-pro">Gemini 3.6 Pro</option><option value="gemini-2.5-flash">Gemini 2.5 Flash</option></select></label><label className="space-y-1.5"><span className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300"><span>Creativity</span><span className="font-mono text-indigo-600">{aiTemperature.toFixed(1)}</span></span><input type="range" min="0" max="1" step="0.1" value={aiTemperature} onChange={event => setAiTemperature(Number(event.target.value))} className="mt-3 w-full accent-indigo-600" /></label></div><SettingRow title="Search grounding" description="Allow AI responses to use current web context when supported." last><Toggle checked={aiSearchGrounding} onChange={setAiSearchGrounding} label="Search grounding" /></SettingRow><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={testAiConnection} disabled={testingAi} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{testingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}Test connection</button><button type="button" onClick={saveAiSettings} className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white hover:bg-indigo-700"><Check className="h-3.5 w-3.5" />Save configuration</button></div></div></SettingsCard></>
            )}

            {activeTab === 'audit_logs' && (
              <><SectionHeader eyebrow="Workspace visibility" title="Activity log" description="Review important workspace changes, synchronization events and administrative actions." action={<button type="button" onClick={async () => { await navigator.clipboard.writeText(syncLogs.map(log => `[${log.time}] ${log.action}`).join('\n')); setCopiedLogs(true); window.setTimeout(() => setCopiedLogs(false), 1600); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">{copiedLogs ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}{copiedLogs ? 'Copied' : 'Copy log'}</button>} />
                <SettingsCard title="Recent events" description={`${filteredLogs.length} events shown`} icon={FileClock}><div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={logSearch} onChange={event => setLogSearch(event.target.value)} placeholder="Search actions, time or status" className={`${inputClass} pl-9`} /></div><div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">{filteredLogs.length ? filteredLogs.map(log => <div key={log.id} className="flex items-start gap-3 py-3.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${log.status === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><div className="min-w-0 flex-1"><p className="text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">{log.action}</p><p className="mt-0.5 text-[10px] text-slate-400">{log.time}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${log.status === 'synced' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'}`}>{log.status.replace('_', ' ')}</span></div>) : <div className="py-12 text-center"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-500">No matching activity</p></div>}</div></SettingsCard></>
            )}

            {activeTab === 'security' && (
              <><SectionHeader eyebrow="Account protection" title="Security and authentication" description="Review your identity, session posture and developer access controls." />
                <SettingsCard title="Signed-in account" description="Your current Apexa identity and workspace role." icon={UserRoundCog}><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><SignedImage filePath={currentUser?.avatar || ''} alt={currentUser?.name || 'User'} className="h-14 w-14 overflow-hidden rounded-2xl" /><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-900 dark:text-white">{currentUser?.name || 'Apexa user'}</p><p className="mt-1 text-xs text-slate-500">{currentUser?.email || 'No email available'}</p></div><span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{currentUser?.role || 'Member'}</span></div></SettingsCard>
                <SettingsCard title="Session status" description="This browser has an active authenticated session." icon={LockKeyhole}><SettingRow title="Current device" description={`${typeof navigator !== 'undefined' ? navigator.platform : 'Browser'} · Active now`}><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Current</span></SettingRow><SettingRow title="Sign out" description="End the current browser session securely." last><button type="button" onClick={onLogout} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><LogOut className="h-3.5 w-3.5" />Log out</button></SettingRow></SettingsCard>
                <SettingsCard title="Developer token" description="Generate a short-lived local token for prototyping integrations." icon={KeyRound}><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"><code className="block min-h-5 break-all text-[11px] text-slate-600 dark:text-slate-300">{generatedToken || 'No token generated'}</code></div><div className="mt-3 flex flex-wrap justify-end gap-2">{generatedToken && <button type="button" onClick={async () => { await navigator.clipboard.writeText(generatedToken); setCopiedToken(true); window.setTimeout(() => setCopiedToken(false), 1600); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-600 dark:border-slate-700 dark:text-slate-300">{copiedToken ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copiedToken ? 'Copied' : 'Copy'}</button>}<button type="button" onClick={() => { const bytes = crypto.getRandomValues(new Uint8Array(24)); setGeneratedToken(`apx_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`); }} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white dark:bg-white dark:text-slate-950"><RefreshCw className="h-3.5 w-3.5" />Generate token</button></div></SettingsCard></>
            )}

            {activeTab === 'data_export' && (
              <><SectionHeader eyebrow="Data ownership" title="Data and storage" description="Understand what is stored, create a portable backup and manage local presentation cache." />
                <div className="grid gap-4 sm:grid-cols-3">{[
                  { label: 'Tasks', value: tasks.filter(task => !activeWorkspace || task.workspaceId === activeWorkspace.id).length, icon: Archive, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
                  { label: 'Members', value: members.length, icon: UsersRound, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
                  { label: 'Events', value: syncLogs.length, icon: Activity, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' }
                ].map(metric => <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.tone}`}><metric.icon className="h-4 w-4" /></div><p className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{metric.value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{metric.label}</p></div>)}</div>
                <SettingsCard title="Export workspace" description="Download a readable JSON snapshot containing workspace configuration, tasks, members and activity." icon={Download}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"><Cloud className="h-5 w-5" /></div><div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Portable JSON backup</p><p className="mt-1 text-xs text-slate-500">Generated locally in your browser.</p></div></div><button type="button" onClick={exportWorkspaceData} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white hover:bg-indigo-700"><Download className="h-3.5 w-3.5" />Export data</button></div></SettingsCard>
                <SettingsCard title="Local cache" description="Reset visual preferences on this device without deleting workspace data." icon={RefreshCw}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Presentation cache</p><p className="mt-1 text-xs text-slate-500">Clears accent and locale overrides only.</p></div><button type="button" onClick={() => { localStorage.removeItem('avaxa_accent_preset'); localStorage.removeItem('apexa_locale'); localStorage.removeItem('avaxa_locale'); triggerToast?.('success', 'UI cache cleared', 'Presentation preferences will refresh on the next visit.'); }} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><Trash2 className="h-3.5 w-3.5" />Clear UI cache</button></div></SettingsCard></>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {createWorkspaceOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreateWorkspaceOpen(false)} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" /><motion.form initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} onSubmit={createWorkspace} className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><h3 className="text-base font-black text-slate-950 dark:text-white">Create workspace</h3><p className="mt-1 text-xs text-slate-500">Start with a name, color and optional cover.</p></div><button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><label className="block space-y-1.5"><span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Workspace name</span><input autoFocus required value={newWorkspaceName} onChange={event => setNewWorkspaceName(event.target.value)} placeholder="Product, Marketing, Operations…" className={inputClass} /></label><div><p className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">Brand color</p><div className="grid grid-cols-4 gap-2">{accentOptions.map(option => <button type="button" key={option.id} onClick={() => setNewWorkspaceTheme(option.id)} className={`h-11 rounded-xl bg-gradient-to-br ${option.className} ${newWorkspaceTheme === option.id ? 'ring-3 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'}`} aria-label={option.name} />)}</div></div><div><p className="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">Cover</p><div className="grid grid-cols-3 gap-2">{WORKSPACE_COVERS.slice(0, 3).map(cover => <button type="button" key={cover.id} onClick={() => setNewWorkspaceCover(cover.url)} className={`aspect-[16/8] overflow-hidden rounded-lg ${newWorkspaceCover === cover.url ? 'ring-3 ring-indigo-500' : ''}`}><img src={cover.url} alt={cover.name} className="h-full w-full object-cover" /></button>)}</div></div></div><div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50"><button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="h-9 rounded-xl px-4 text-xs font-extrabold text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={!newWorkspaceName.trim()} className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:opacity-40">Create workspace</button></div></motion.form></div>
        )}
        {deleteWorkspace && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"><motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteWorkspace(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" /><motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900 dark:bg-slate-900"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"><AlertTriangle className="h-5 w-5" /></div><h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">Delete “{deleteWorkspace.name}”?</h3><p className="mt-2 text-xs leading-5 text-slate-500">This action cannot be undone. Type the workspace name to confirm permanent deletion.</p><input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} placeholder={deleteWorkspace.name} className={`${inputClass} mt-5`} /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setDeleteWorkspace(null); setDeleteConfirmation(''); }} className="h-9 rounded-xl px-4 text-xs font-extrabold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="button" disabled={deleteConfirmation !== deleteWorkspace.name} onClick={() => { onDeleteWorkspace?.(deleteWorkspace.id); onAddSyncLog?.(`Deleted workspace “${deleteWorkspace.name}”`); setDeleteWorkspace(null); setDeleteConfirmation(''); }} className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-extrabold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Delete permanently</button></div></motion.div></div>
        )}
      </AnimatePresence>
    </div>
  );
}
