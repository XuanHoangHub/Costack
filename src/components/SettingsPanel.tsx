"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, Sun, Palette, Settings, Database, Copy, Check, Volume2, VolumeX, 
  Layers, Sparkles, Bell, BellOff, Info, Clock, Sliders, ShieldCheck,
  Briefcase, Trash2, Edit2, Plus, X, ChevronRight, ChevronLeft, AlertTriangle,
  Globe, Eye, EyeOff, Brain, Bot, Users, FolderOpen, Zap, Tag, Code, Mail, LogOut,
  ChevronDown, Calendar, Search, Users as UsersIcon, ShieldAlert, CheckCircle,
  HelpCircle, FileClock, Globe2, RefreshCw, Upload
} from 'lucide-react';
import { supabase } from '../supabaseClient';

import SignedImage from './SignedImage';
import TeamDirectory from './TeamDirectory';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/contexts/TranslationContext';

interface NotificationSettings {
  enableAll: boolean;
  enableSound: boolean;
  onlyImportant: boolean;
  enableAssignments: boolean;
  enableDeadlines: boolean;
  enableComments: boolean;
  enableStatusChanges: boolean;
  enableFilteringTags: boolean;
  enableSystemNotify: boolean;
  toastDuration: number;
  dndActive: boolean;
  frequencyLimit: 'all' | 'throttled' | 'minimal';
  dndDurationUntil?: string | null;
  dndScheduleEnabled?: boolean;
  dndScheduleStart?: string;
  dndScheduleEnd?: string;
  dndAllowUrgent?: boolean;
}

export const WORKSPACE_COVERS = [
  { id: 'cover1', name: 'Amethyst', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover2', name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover3', name: 'Green Valley', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover4', name: 'Peaceful Lake', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover5', name: 'City Town', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover6', name: 'Desert Sunrise', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5edd0cd9?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover7', name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1483168527879-c66136b56105?w=400&auto=format&fit=crop&q=80' },
  { id: 'cover8', name: 'Deep Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80' }
];

interface SettingsPanelProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  accentPreset: 'indigo' | 'ocean' | 'forest' | 'sunset';
  setAccentPreset: (val: 'indigo' | 'ocean' | 'forest' | 'sunset') => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  blurIntensity: 'soft' | 'default' | 'immersive';
  setBlurIntensity: (val: 'soft' | 'default' | 'immersive') => void;
  notificationSettings: NotificationSettings;
  setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  workspaces?: any[];
  activeWorkspaceId?: string;
  onUpdateWorkspace?: (id: string, name: string, theme: string, coverUrl?: string, logoUrl?: string, settings?: any) => void;
  onDeleteWorkspace?: (id: string) => void;
  onAddWorkspace?: (name: string, theme: string, coverUrl?: string) => void;
  members?: any[];
  setMembers?: any;
  tasks?: any[];
  onAddMember?: any;
  onUpdateMember?: any;
  onDeleteMember?: any;
  onAddSyncLog?: any;
  syncLogs?: any[];
  activeSettingsTab?: string;
  setActiveSettingsTab?: (tab: string) => void;
  onLogout?: () => void;
  triggerToast?: any;
}

export default function SettingsPanel({
  isDarkMode,
  setIsDarkMode,
  accentPreset,
  setAccentPreset,
  soundEnabled,
  setSoundEnabled,
  blurIntensity,
  setBlurIntensity,
  notificationSettings,
  setNotificationSettings,
  workspaces = [],
  activeWorkspaceId = 'w2',
  onUpdateWorkspace,
  onDeleteWorkspace,
  onAddWorkspace,
  members = [],
  setMembers,
  tasks = [],
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddSyncLog,
  syncLogs = [],
  activeSettingsTab,
  setActiveSettingsTab,
  onLogout,
  triggerToast
}: SettingsPanelProps) {
  const [copied, setCopied] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { t, locale, setLocale } = useTranslation();
  const [isSidebarVisibleOnMobile, setIsSidebarVisibleOnMobile] = useState(true);
  
  // Tab Routing state (internal fallback or linked via prop)
  const [localActiveTab, setLocalActiveTab] = useState<string>('general');
  const validTabs = ['general', 'people', 'ai_usage', 'audit_logs', 'preferences', 'notifications'];
  const activeTab = validTabs.includes(activeSettingsTab || localActiveTab) 
    ? (activeSettingsTab || localActiveTab) 
    : 'general';
  const setActiveTab = setActiveSettingsTab || setLocalActiveTab;

  // Local state variables
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newWSName, setNewWSName] = useState('');
  const [newWSTheme, setNewWSTheme] = useState<'indigo' | 'ocean' | 'forest' | 'sunset'>('indigo');
  const [newWSCover, setNewWSCover] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editWSName, setEditWSName] = useState('');
  const [editWSTheme, setEditWSTheme] = useState<'indigo' | 'ocean' | 'forest' | 'sunset'>('indigo');
  const [editWSCover, setEditWSCover] = useState('');
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // AI settings states
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [aiModel, setAiModel] = useState<string>('gemini-3.5-flash');
  const [aiTemp, setAiTemp] = useState<number>(0.7);
  const [aiSearchGrounding, setAiSearchGrounding] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAiApiKey(localStorage.getItem('avaxa_gemini_api_key') || '');
      setAiModel(localStorage.getItem('avaxa_ai_model') || 'gemini-3.5-flash');
      const temp = localStorage.getItem('avaxa_ai_temperature');
      if (temp) setAiTemp(parseFloat(temp));
      setAiSearchGrounding(localStorage.getItem('avaxa_ai_search_grounding') === 'true');
    }
  }, []);

  const handleSaveAiSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('avaxa_gemini_api_key', aiApiKey);
      localStorage.setItem('avaxa_ai_model', aiModel);
      localStorage.setItem('avaxa_ai_temperature', aiTemp.toString());
      localStorage.setItem('avaxa_ai_search_grounding', aiSearchGrounding.toString());
      if (onAddSyncLog) onAddSyncLog('Updated Gemini AI Integration settings successfully');
      if (triggerToast) triggerToast('success', 'AI Configuration Saved', 'Your Gemini AI engine has been updated.');
    }
  };

  const handleQuickCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWSName.trim()) return;
    if (onAddWorkspace) {
      onAddWorkspace(newWSName.trim(), newWSTheme, newWSCover);
    }
    setNewWSName('');
    setShowQuickCreate(false);
  };

  const startEditWorkspace = (ws: any) => {
    setEditingWorkspaceId(ws.id);
    setEditWSName(ws.name);
    setEditWSTheme(ws.theme);
    setEditWSCover(ws.coverUrl || '');
  };

  const saveWorkspaceEdit = (id: string) => {
    if (!editWSName.trim()) return;
    const targetWS = workspaces.find(w => w.id === id);
    if (onUpdateWorkspace && targetWS) {
      onUpdateWorkspace(id, editWSName.trim(), editWSTheme, editWSCover, targetWS.logoUrl, targetWS.settings);
    }
    setEditingWorkspaceId(null);
  };

  const sqlCode = `
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT DEFAULT 'indigo',
    initial TEXT,
    coverUrl TEXT,
    logoUrl TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select workspaces for workspace members" ON public.workspaces
    FOR SELECT USING (
        auth.uid() = user_id 
        OR id IN (
            SELECT unnest(workspace_ids) 
            FROM public.members 
            WHERE user_id = auth.uid()
        )
    );
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presets = [
    { id: 'indigo', name: 'Avaxa Violet', color: 'bg-indigo-500', hex: '#7B61FF' },
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-sky-500', hex: '#0ea5e9' },
    { id: 'forest', name: 'Forest Green', color: 'bg-emerald-500', hex: '#10b981' },
    { id: 'sunset', name: 'Sunset Pink', color: 'bg-rose-500', hex: '#f43f5e' }
  ] as const;

  // Sidebar Menu Definition
  const menuSections = [
    {
      title: 'Admin',
      key: 'adminSection',
      items: [
        { id: 'general', label: 'General Settings', icon: Briefcase },
        { id: 'people', label: 'Member Directory', icon: Users },
        { id: 'ai_usage', label: 'AI Configuration', icon: Brain },
        { id: 'audit_logs', label: 'System Logs', icon: FileClock },
      ]
    },
    {
      title: 'My Settings',
      key: 'mySettingsSection',
      items: [
        { id: 'preferences', label: 'Preferences', icon: Sliders },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ]
    }
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs relative">
      {/* 1. Left Navigation Sidebar */}
      <aside className={`w-[230px] border-r border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between shrink-0 overflow-y-auto scrollbar-none p-3.5 space-y-4 transition-all duration-200 ${
        isSidebarVisibleOnMobile ? 'flex w-full absolute inset-0 z-20 md:relative md:w-[230px]' : 'hidden md:flex'
      }`}>
        <div className="space-y-4">
          <div className="px-2 py-1">
            <h2 className="text-[14px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-display">
              {t('settingsTitle') || 'All settings'}
            </h2>
          </div>

          <nav className="space-y-4">
            {menuSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <span className="px-2 py-0.5 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block select-none">
                  {t(section.key) || section.title}
                </span>
                <div className="space-y-0.5">
                  {menuSections[idx].items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsSidebarVisibleOnMobile(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                          isActive 
                            ? 'bg-slate-200/80 dark:bg-slate-800 text-indigo-655 dark:text-indigo-400 shadow-xs' 
                            : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-455 dark:text-slate-500'}`} />
                        <span>{t(item.id) || item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Logout Bottom Trigger */}
        <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800">
          <button
            onClick={() => {
              if (onLogout) onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>{t('logout') || 'Log out'}</span>
          </button>
        </div>
      </aside>

      {/* 2. Right Detail Content area */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-905 p-6 md:p-8">
        {/* Mobile menu toggle back button */}
        <button
          onClick={() => setIsSidebarVisibleOnMobile(true)}
          className="md:hidden flex items-center gap-1.5 text-xs text-slate-650 dark:text-slate-300 font-bold mb-5 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 transition-colors cursor-pointer select-none"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{locale === 'vi' ? 'Quay lại Cài đặt' : 'Back to Settings'}</span>
        </button>
        
        {/* TAB: GENERAL WORKSPACE INFO */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-3xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-55 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                Workspace Settings
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Configure branding presets and feature parameters of your active workspace</p>
            </div>

            {/* General Info Card */}
            {(() => {
              const activeWS = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
              if (!activeWS) return <div className="text-slate-400 italic text-xs">No active workspaces found.</div>;
              return (
                <div className="space-y-6">
                  {/* Name and logo */}
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                      {/* Workspace Logo Upload (Left/Top) */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-500 block">Workspace Logo</label>
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-[18px] shadow-sm shrink-0 overflow-hidden relative border border-slate-200 dark:border-slate-800"
                            style={{
                              background: `linear-gradient(135deg, ${presets.find(p => p.id === activeWS.theme)?.hex || '#7B61FF'}, #a78bfa)`
                            }}
                          >
                            {activeWS.logoUrl ? (
                              <img src={activeWS.logoUrl} alt={activeWS.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="uppercase">{activeWS.name ? activeWS.name.charAt(0).toUpperCase() : 'W'}</span>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1.5">
                            <div className="flex gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    const userId = session?.user?.id || 'anonymous';
                                    const fileExt = file.name.split('.').pop() || 'png';
                                    const fileName = `${userId}/workspaces/${activeWS.id}_avatar_${Date.now()}.${fileExt}`;
                                    
                                    const { error: uploadError } = await supabase.storage
                                      .from('avatars')
                                      .upload(fileName, file, { cacheControl: '3600', upsert: true });
                                      
                                    if (uploadError) throw uploadError;
                                    
                                    const { data: { publicUrl } } = supabase.storage
                                      .from('avatars')
                                      .getPublicUrl(fileName);
                                      
                                    onUpdateWorkspace?.(activeWS.id, activeWS.name, activeWS.theme, activeWS.coverUrl, publicUrl, activeWS.settings);
                                    if (triggerToast) triggerToast('success', 'Logo Uploaded', 'Workspace logo updated successfully.');
                                  } catch (err) {
                                    console.error(err);
                                    if (triggerToast) triggerToast('error', 'Upload Failed', 'Unable to upload workspace logo.');
                                  }
                                }}
                                className="hidden"
                                id="settings-panel-logo-file-input"
                              />
                              <label
                                htmlFor="settings-panel-logo-file-input"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <Upload className="w-3.5 h-3.5 text-indigo-505" />
                                <span>Upload Logo</span>
                              </label>
                              {activeWS.logoUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateWorkspace?.(activeWS.id, activeWS.name, activeWS.theme, activeWS.coverUrl, '', activeWS.settings);
                                    if (triggerToast) triggerToast('success', 'Logo Removed', 'Workspace logo has been reset.');
                                  }}
                                  className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-955/20 border border-rose-250/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Supported formats: PNG, JPG, SVG. Maximum 2MB.</span>
                          </div>
                        </div>
                      </div>

                      {/* Workspace Name (Right/Bottom) */}
                      <div className="space-y-2 flex-1 max-w-md">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-500">Workspace Name</label>
                        <input
                          type="text"
                          value={activeWS.name}
                          onChange={e => {
                            onUpdateWorkspace?.(activeWS.id, e.target.value, activeWS.theme, activeWS.coverUrl, activeWS.logoUrl, activeWS.settings);
                          }}
                          className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Themes Accent */}
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-350">Accent Color</h4>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">Select accent highlight preset theme</p>
                    </div>
                    <div className="flex gap-2.5">
                      {presets.map(p => {
                        const isActive = activeWS.theme === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onUpdateWorkspace?.(activeWS.id, activeWS.name, p.id, activeWS.coverUrl, activeWS.logoUrl, activeWS.settings);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${isActive ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950' : 'opacity-80'}`}
                          >
                            <span className={`w-5 h-5 rounded-full ${p.color} block`} title={p.name} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Danger Zone: Delete Workspace */}
                  {(!activeWS.user_id || activeWS.user_id === currentUser?.id) && workspaces.length > 1 && (
                    <div className="p-6 bg-rose-50/20 dark:bg-rose-950/5 border border-rose-200/40 dark:border-rose-900/30 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-500">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-rose-700 dark:text-rose-450">Danger Zone: Delete Workspace</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Deleting a workspace deletes all associated resources and cannot be undone.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkspaceToDelete(activeWS);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer"
                      >
                        Delete Workspace
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: PEOPLE / TEAM MEMBER MANAGEMENT */}
        {activeTab === 'people' && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-55 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Manage people
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Invite teammates and configure workspace permissions levels</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
              <TeamDirectory
                members={members}
                tasks={tasks}
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                onAddMember={onAddMember}
                onUpdateMember={onUpdateMember}
                onDeleteMember={onDeleteMember}
                onAddSyncLog={onAddSyncLog}
              />
            </div>
          </div>
        )}

        {/* TAB: AI USAGE & CONFIGURATION */}
        {activeTab === 'ai_usage' && (
          <div className="space-y-6 max-w-3xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-55 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-500" />
                Gemini AI Engine Settings
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fine-tune Google Gemini parameters for smart task generation and chat summary tools</p>
            </div>

            {/* AI Config card */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-5">
              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-405 dark:text-slate-500 flex justify-between">
                  <span>Gemini API Key</span>
                  <span className="text-[9px] font-semibold text-slate-400 normal-case">Stored securely in your local storage</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={e => setAiApiKey(e.target.value)}
                    placeholder="Enter API Key (e.g. AIzaSy...)"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-105 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-405 dark:text-slate-500">AI Model</label>
                <select
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-105 outline-none cursor-pointer"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Flagship - Recommended)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning & Coding)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Lightweight)</option>
                </select>
              </div>

              {/* Temperature */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-405 dark:text-slate-500 flex justify-between">
                  <span>Creativity (Temperature)</span>
                  <span className="font-mono font-bold text-indigo-500">{aiTemp.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiTemp}
                  onChange={e => setAiTemp(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Search Grounding */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-805 border border-slate-200/50 dark:border-slate-700/60 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-650 dark:text-indigo-405">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-705 dark:text-slate-300">Google Search Grounding</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Augment queries with real-time Google search summaries</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={aiSearchGrounding}
                    onChange={e => setAiSearchGrounding(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleSaveAiSettings}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                >
                  Save AI Engine Settings
                </button>
              </div>
            </div>
          </div>
        )}



        {/* TAB: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6 max-w-3xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-55 flex items-center gap-2">
                <FileClock className="w-5 h-5 text-indigo-500" />
                System Audit Logs
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track database synchronization logs and realtime events</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-2.5 max-h-[350px] overflow-y-auto">
              <div className="text-[10px] text-slate-500 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>SYSTEM CONSOLE ENGINE v1.2</span>
                <span className="animate-pulse text-emerald-500">● LIVE CONNECTION</span>
              </div>
              {syncLogs.length === 0 ? (
                <div className="text-slate-500 italic">No network logs recorded. Active realtime synchronization is running.</div>
              ) : (
                <div className="space-y-1">
                  {syncLogs.map((log: any, idx) => (
                    <div key={log.id || idx} className="flex gap-2 text-left">
                      <span className="text-slate-500 select-none">[{log.time || new Date().toLocaleTimeString()}]</span>
                      <span>{log.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PERSONALIZATION PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 max-w-3xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-55 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                {t('settingsPersonal') || 'System Personalization'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('settingsDesc') || 'Customize accent preset colors, sound effects, and glass panel blur strength'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Mode Toggle (Light / Dark) */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-3xs">
                      {isDarkMode ? (
                        <Moon className="w-5 h-5 text-indigo-500 animate-pulse" />
                      ) : (
                        <Sun className="w-5 h-5 text-indigo-500 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200">
                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                      </h3>
                      <p className="text-[11px] text-slate-455 dark:text-slate-500 mt-0.5">
                        {isDarkMode ? 'Immersive space dark theme' : 'Crystalline space light theme'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Switch toggle control */}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      isDarkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isDarkMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Toggle between the signature crystalline light mode and the immersive deep dark mode layout.
                </div>
              </div>

              {/* Theme highlight color choice */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    <Palette className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200">{t('accentColor') || 'Accent Theme Color'}</h3>
                    <p className="text-[11px] text-slate-455 dark:text-slate-500 mt-0.5">{t('accentColorDesc') || 'Choose highlight accent colors'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {presets.map(p => {
                    const isActive = accentPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setAccentPreset(p.id as any)}
                        className={`w-7 h-7 rounded-full transition-all cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110' : 'opacity-80'}`}
                      >
                        <span className={`w-5 h-5 rounded-full ${p.color} block`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound effects toggle */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-500" /> : <VolumeX className="w-5 h-5 text-slate-455" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200">{t('soundEffects') || 'Interactive Sound Effects'}</h3>
                    <p className="text-[11px] text-slate-455 dark:text-slate-500 mt-0.5">{t('soundEffectsDesc') || 'Play subtle audio haptics when doing actions'}</p>
                  </div>
                </div>
                <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl">
                  <button
                    onClick={() => setSoundEnabled(true)}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg ${soundEnabled ? 'bg-white shadow-xs text-indigo-655 dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-500'}`}
                  >
                    {t('soundOn') || 'Enable sound'}
                  </button>
                  <button
                    onClick={() => setSoundEnabled(false)}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg ${!soundEnabled ? 'bg-white shadow-xs text-slate-700 dark:bg-slate-800 dark:text-slate-400' : 'text-slate-500'}`}
                  >
                    {t('soundOff') || 'Mute'}
                  </button>
                </div>
              </div>

              {/* Glassmorphism blur depth */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    <Layers className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200">{t('blurStrength') || 'Glassmorphism Blur Strength'}</h3>
                    <p className="text-[11px] text-slate-455 dark:text-slate-500 mt-0.5">{t('blurStrengthDesc') || 'Adjust blur depth levels on panel containers'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl">
                  {['soft', 'default', 'immersive'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setBlurIntensity(lvl as any)}
                      className={`py-1.5 text-[10px] font-extrabold capitalize rounded-lg ${blurIntensity === lvl ? 'bg-white shadow-xs text-indigo-655 dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      {lvl === 'soft' ? (t('blurSoft') || 'Soft (8px)') : lvl === 'default' ? (t('blurDefault') || 'Default (16px)') : (t('blurImmersive') || 'Immersive (28px)')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language choice */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    <Globe className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200">
                      {t('language') || 'Language'}
                    </h3>
                    <p className="text-[11px] text-slate-455 dark:text-slate-500 mt-0.5">
                      {t('languageDesc') || 'Choose system display language'}
                    </p>
                  </div>
                </div>
                <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl">
                  <button
                    onClick={() => setLocale('en')}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg ${locale === 'en' ? 'bg-white shadow-xs text-indigo-655 dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-505'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLocale('vi')}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg ${locale === 'vi' ? 'bg-white shadow-xs text-indigo-655 dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-505'}`}
                  >
                    Tiếng Việt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: NOTIFICATIONS SUBSCRIPTION */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-3xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-55 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-500" />
                Notification Settings
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Toggle specific haptic notifications and configure spam filters</p>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-6">
              {/* Quick switches */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-200/40 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-805 dark:text-slate-250">Master Control</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, enableAll: !prev.enableAll }))}
                    className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold ${notificationSettings.enableAll ? 'bg-indigo-500 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'}`}
                  >
                    Enable Notifications
                  </button>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, dndActive: !prev.dndActive }))}
                    className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold ${notificationSettings.dndActive ? 'bg-rose-500 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'}`}
                  >
                    Do Not Disturb (DND)
                  </button>
                </div>
              </div>

              {/* DND Duration Pause & Custom Schedules */}
              <div className="space-y-4 pt-4 border-b border-slate-200/40 dark:border-slate-800 pb-4">
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  Do Not Disturb Options (Tránh làm phiền)
                </h4>

                {/* 1. Temp Pause */}
                <div className="p-4 bg-white dark:bg-slate-805 rounded-xl border border-slate-200/40 dark:border-slate-750/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-305">Tạm dừng thông báo (Temporary Pause)</span>
                    {notificationSettings.dndDurationUntil && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-955/20 px-2 py-0.5 rounded-md animate-pulse">
                        Active until: {new Date(notificationSettings.dndDurationUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: '30m', min: 30 },
                      { label: '1h', min: 60 },
                      { label: '2h', min: 120 },
                      { label: '8h', min: 480 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const until = new Date(Date.now() + preset.min * 60 * 1000).toISOString();
                          setNotificationSettings(prev => ({ ...prev, dndDurationUntil: until }));
                        }}
                        className="px-2.5 py-1 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/60 transition-all cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(8, 0, 0, 0);
                        setNotificationSettings(prev => ({ ...prev, dndDurationUntil: tomorrow.toISOString() }));
                      }}
                      className="px-2.5 py-1 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/60 transition-all cursor-pointer"
                    >
                      Đến ngày mai
                    </button>
                    {notificationSettings.dndDurationUntil && (
                      <button
                        type="button"
                        onClick={() => setNotificationSettings(prev => ({ ...prev, dndDurationUntil: null }))}
                        className="px-2.5 py-1 text-[10px] font-extrabold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all cursor-pointer"
                      >
                        Hủy tạm dừng
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Schedule DND */}
                <div className="p-4 bg-white dark:bg-slate-805 rounded-xl border border-slate-200/40 dark:border-slate-750/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-305">Lên lịch tránh làm phiền (Scheduled DND)</span>
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Tự động kích hoạt không làm phiền hàng ngày vào khung giờ cố định</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!notificationSettings.dndScheduleEnabled}
                        onChange={e => setNotificationSettings(prev => ({ ...prev, dndScheduleEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-650 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {notificationSettings.dndScheduleEnabled && (
                    <div className="flex items-center gap-4 pt-1 text-slate-700 dark:text-slate-300 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-455">Bắt đầu:</span>
                        <input
                          type="time"
                          value={notificationSettings.dndScheduleStart || '22:00'}
                          onChange={e => setNotificationSettings(prev => ({ ...prev, dndScheduleStart: e.target.value }))}
                          className="px-2 py-1 text-[10.5px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-455">Kết thúc:</span>
                        <input
                          type="time"
                          value={notificationSettings.dndScheduleEnd || '07:00'}
                          onChange={e => setNotificationSettings(prev => ({ ...prev, dndScheduleEnd: e.target.value }))}
                          className="px-2 py-1 text-[10.5px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Allow Exceptions */}
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-805 border border-slate-200/40 dark:border-slate-750/80 rounded-xl cursor-pointer">
                  <div className="text-left">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-305">Cho phép thông báo khẩn cấp (Allow Urgent Alerts)</span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Vẫn nhận thông báo của Task có Hạn chót hoặc độ ưu tiên khẩn cấp/gấp</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!notificationSettings.dndAllowUrgent}
                    onChange={e => setNotificationSettings(prev => ({ ...prev, dndAllowUrgent: e.target.checked }))}
                    className="rounded text-indigo-550 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Frequency limits */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-805 dark:text-slate-350">Frequency Spam Filter</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'all', label: 'All Updates', desc: 'Show all notifications immediately.' },
                    { id: 'throttled', label: 'Throttled (3s)', desc: 'Group consecutive updates.' },
                    { id: 'minimal', label: 'Minimal (Essential)', desc: 'Only show high priority alerts.' }
                  ].map(f => (
                    <label key={f.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-805 border border-slate-200/50 dark:border-slate-700/60 cursor-pointer flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="freq"
                          checked={notificationSettings.frequencyLimit === f.id}
                          onChange={() => setNotificationSettings(prev => ({ ...prev, frequencyLimit: f.id as any }))}
                          className="text-indigo-505 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-805 dark:text-slate-200">{f.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1">{f.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Subscriptions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-805 dark:text-slate-350">Event Type Subscriptions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'enableAssignments', label: 'New Assignments' },
                    { key: 'enableDeadlines', label: 'Task Deadlines' },
                    { key: 'enableComments', label: 'Comments & Chat' },
                    { key: 'enableStatusChanges', label: 'Status Transitions' },
                    { key: 'enableSystemNotify', label: 'System Action Logs' }
                  ].map(evt => (
                    <label key={evt.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-805 border border-slate-200/40 dark:border-slate-700/60 rounded-xl cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{evt.label}</span>
                      <input
                        type="checkbox"
                        checked={!!(notificationSettings as any)[evt.key]}
                        onChange={e => setNotificationSettings(prev => ({ ...prev, [evt.key]: e.target.checked }))}
                        className="rounded text-indigo-550 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Secure Delete Workspace Confirmation Modal */}
      <AnimatePresence>
        {workspaceToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-955/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-rose-100 dark:border-rose-950/30 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/10">
                <div className="flex items-center gap-2 text-rose-650 dark:text-rose-455">
                  <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
                  <span className="font-display font-black text-rose-650 dark:text-rose-405 text-base">Confirm Workspace Deletion</span>
                </div>
                <button
                  onClick={() => setWorkspaceToDelete(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 font-sans text-xs">
                <p className="text-slate-655 dark:text-slate-300 leading-relaxed">
                  This action <strong>cannot be undone</strong>. All data related to the workspace <strong className="text-slate-800 dark:text-slate-100">"{workspaceToDelete.name}"</strong>, including tasks, wiki summaries, and chats, will be permanently deleted from this device and the cloud.
                </p>

                <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 p-3.5 rounded-2xl text-[11px] text-amber-700 dark:text-amber-300">
                  Please type the exact name of the workspace below to confirm you want to delete it:
                  <div className="mt-1.5 font-mono bg-amber-500/5 dark:bg-black/20 p-1 px-2 rounded border border-amber-550/20 text-center text-xs select-all text-amber-800 dark:text-amber-250 font-black">
                    {workspaceToDelete.name}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm_ws_name_input" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Enter the Workspace name to confirm</label>
                  <input
                    id="confirm_ws_name_input"
                    type="text"
                    required
                    placeholder={`E.g., ${workspaceToDelete.name}`}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-750 focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none dark:text-slate-100 font-semibold"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="p-4 px-6 bg-slate-50 dark:bg-slate-850 border-t border-slate-105 dark:border-slate-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setWorkspaceToDelete(null)}
                  className="px-4 py-2 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-xl text-[11px] font-extrabold text-slate-505 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText !== workspaceToDelete.name}
                  onClick={() => {
                    if (onDeleteWorkspace) {
                      onDeleteWorkspace(workspaceToDelete.id);
                    }
                    if (onAddSyncLog) onAddSyncLog(`Deleted workspace "${workspaceToDelete.name}" permanently`);
                    setWorkspaceToDelete(null);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 ${
                    deleteConfirmText === workspaceToDelete.name
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-150 dark:bg-slate-800 text-slate-455 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
