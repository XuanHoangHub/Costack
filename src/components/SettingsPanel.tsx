"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, Sun, Palette, Settings, Database, Copy, Check, Volume2, VolumeX, 
  Layers, Sparkles, Bell, BellOff, Info, Clock, Sliders, ShieldCheck,
  Briefcase, Trash2, Edit2, Plus, X, ChevronRight, ChevronLeft, AlertTriangle,
  Globe, Eye, EyeOff, Brain, Bot, Users, FolderOpen, Zap, Tag, Code, Mail, LogOut,
  ChevronDown, Calendar, Search, Users as UsersIcon, ShieldAlert, CheckCircle,
  HelpCircle, FileClock, Globe2, RefreshCw, Upload, Terminal, Filter, Activity,
  ImageIcon
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
  onSendWorkspaceInvites?: (emails: string[], role: string) => void;
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
  triggerToast,
  onSendWorkspaceInvites,
}: SettingsPanelProps) {
  const [copied, setCopied] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { t, locale, setLocale } = useTranslation();
  const [isSidebarVisibleOnMobile, setIsSidebarVisibleOnMobile] = useState(true);
  
  // Tab Routing state
  const [localActiveTab, setLocalActiveTab] = useState<string>('general');
  const validTabs = ['general', 'people', 'ai_usage', 'audit_logs', 'preferences', 'notifications'];
  const activeTab = validTabs.includes(activeSettingsTab || localActiveTab) 
    ? (activeSettingsTab || localActiveTab) 
    : 'general';
  const setActiveTab = setActiveSettingsTab || setLocalActiveTab;

  // Local workspace creation/editing states
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
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);

  // Audit Logs states
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAiApiKey(localStorage.getItem('apexa_gemini_api_key') || '');
      setAiModel(localStorage.getItem('apexa_ai_model') || 'gemini-3.5-flash');
      const temp = localStorage.getItem('apexa_ai_temperature');
      if (temp) setAiTemp(parseFloat(temp));
      setAiSearchGrounding(localStorage.getItem('apexa_ai_search_grounding') === 'true');
    }
  }, []);

  const handleSaveAiSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexa_gemini_api_key', aiApiKey);
      localStorage.setItem('apexa_ai_model', aiModel);
      localStorage.setItem('apexa_ai_temperature', aiTemp.toString());
      localStorage.setItem('apexa_ai_search_grounding', aiSearchGrounding.toString());
      if (onAddSyncLog) onAddSyncLog('Updated Gemini AI Integration settings');
      if (triggerToast) triggerToast('success', 'AI Configuration Saved', 'Gemini AI engine parameters have been updated.');
    }
  };

  const handleTestAiConnection = async () => {
    if (!aiApiKey.trim()) {
      if (triggerToast) triggerToast('warning', 'Missing API Key', 'Please enter a Gemini API Key to test connection.');
      return;
    }
    setIsTestingAi(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK' }] }]
        })
      });
      if (res.ok) {
        if (triggerToast) triggerToast('success', 'AI Connected', 'Gemini API key verified successfully!');
        if (onAddSyncLog) onAddSyncLog('Verified Gemini API Key connection successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg = data?.error?.message || 'Invalid API key or model request failed.';
        if (triggerToast) triggerToast('error', 'Connection Failed', errMsg);
      }
    } catch (err: any) {
      if (triggerToast) triggerToast('error', 'Network Error', err.message || 'Unable to reach Google Gemini API server.');
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleQuickCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWSName.trim()) return;
    if (onAddWorkspace) {
      onAddWorkspace(newWSName.trim(), newWSTheme, newWSCover);
      if (triggerToast) triggerToast('success', 'Workspace Created', `Created workspace "${newWSName.trim()}"`);
    }
    setNewWSName('');
    setShowQuickCreate(false);
  };

  const presets = [
    { id: 'indigo', name: 'Apexa Violet', color: 'bg-indigo-500', hex: '#7B61FF' },
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

  const filteredLogs = syncLogs.filter((log: any) => {
    if (!auditSearchQuery.trim()) return true;
    const query = auditSearchQuery.toLowerCase();
    const actionText = (log.action || '').toLowerCase();
    const timeText = (log.time || '').toLowerCase();
    return actionText.includes(query) || timeText.includes(query);
  });

  const handleCopyLogs = () => {
    const text = syncLogs.map((l: any) => `[${l.time || ''}] ${l.action || ''}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs relative">
      
      {/* 1. Left Navigation Sidebar */}
      <aside className={`w-[250px] border-r border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between shrink-0 overflow-y-auto scrollbar-none p-3.5 space-y-4 transition-all duration-200 ${
        isSidebarVisibleOnMobile ? 'flex w-full absolute inset-0 z-20 md:relative md:w-[250px]' : 'hidden md:flex'
      }`}>
        <div className="space-y-4">
          {/* Header Title */}
          <div className="px-2 py-1.5 flex items-center justify-between">
            <h2 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-display flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              {t('settingsTitle') || 'System Settings'}
            </h2>
          </div>

          <nav className="space-y-4">
            {menuSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <span className="px-2 py-0.5 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block select-none">
                  {t(section.key) || section.title}
                </span>
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const labelText = t(item.id) !== item.id ? t(item.id) : item.label;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsSidebarVisibleOnMobile(false);
                          (window as any).playSystemSound?.('click');
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left relative ${
                          isActive 
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-3xs font-black' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="truncate">{labelText}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="activeTabIndicator" 
                            className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: User Info & Logout */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
          {currentUser && (
            <div className="flex items-center gap-2.5 p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
              <SignedImage 
                filePath={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full shrink-0 overflow-hidden shadow-2xs" 
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{currentUser.email}</p>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {currentUser.role || 'Member'}
              </span>
            </div>
          )}

          <button
            onClick={() => {
              if (onLogout) onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>{t('logout') !== 'logout' ? t('logout') : 'Log out'}</span>
          </button>
        </div>
      </aside>

      {/* 2. Right Detail Content Area */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6 md:p-8">
        {/* Mobile menu toggle back button */}
        <button
          onClick={() => setIsSidebarVisibleOnMobile(true)}
          className="md:hidden flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold mb-5 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 transition-colors cursor-pointer select-none"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{locale === 'vi' ? 'Quay lại Cài đặt' : 'Back to Settings'}</span>
        </button>
        
        {/* TAB: GENERAL WORKSPACE INFO */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-4xl text-left">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display">
                  <Briefcase className="w-5 h-5 text-indigo-500" />
                  {t('general') !== 'general' ? t('general') : 'General Workspace Settings'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Configure branding presets, covers, and parameters for your workspace</p>
              </div>

              <button
                type="button"
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workspace</span>
              </button>
            </div>

            {/* Quick Create Inline Form */}
            <AnimatePresence>
              {showQuickCreate && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleQuickCreateWorkspace}
                  className="p-5 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl space-y-4"
                >
                  <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Create New Workspace</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500">Workspace Name</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. Product Engineering"
                        value={newWSName}
                        onChange={e => setNewWSName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500">Theme Preset</label>
                      <select
                        value={newWSTheme}
                        onChange={e => setNewWSTheme(e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                      >
                        <option value="indigo">Apexa Violet</option>
                        <option value="ocean">Ocean Blue</option>
                        <option value="forest">Forest Green</option>
                        <option value="sunset">Sunset Pink</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickCreate(false)}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                    >
                      Save Workspace
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Active Workspace Settings Card */}
            {(() => {
              const activeWS = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
              if (!activeWS) return <div className="text-slate-400 italic text-xs">No active workspace found.</div>;
              return (
                <div className="space-y-6">
                  {/* Logo and Name card */}
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                      {/* Workspace Logo Upload */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Workspace Logo</label>
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-[20px] shadow-sm shrink-0 overflow-hidden relative border border-slate-200 dark:border-slate-800"
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
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Upload Logo</span>
                              </label>
                              {activeWS.logoUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateWorkspace?.(activeWS.id, activeWS.name, activeWS.theme, activeWS.coverUrl, '', activeWS.settings);
                                    if (triggerToast) triggerToast('success', 'Logo Removed', 'Workspace logo has been reset.');
                                  }}
                                  className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 border border-rose-200/40 text-rose-600 dark:text-rose-400 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Supported formats: PNG, JPG, SVG. Max 2MB.</span>
                          </div>
                        </div>
                      </div>

                      {/* Workspace Name Input */}
                      <div className="space-y-2 flex-1 max-w-md">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Workspace Name</label>
                        <input
                          type="text"
                          value={activeWS.name}
                          onChange={e => {
                            onUpdateWorkspace?.(activeWS.id, e.target.value, activeWS.theme, activeWS.coverUrl, activeWS.logoUrl, activeWS.settings);
                          }}
                          className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Workspace Cover Gallery Picker */}
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        Workspace Cover Banner
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Choose a high-resolution background banner preset for workspace headers</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {WORKSPACE_COVERS.map(cover => {
                        const isSelected = activeWS.coverUrl === cover.url;
                        return (
                          <button
                            key={cover.id}
                            type="button"
                            onClick={() => {
                              onUpdateWorkspace?.(activeWS.id, activeWS.name, activeWS.theme, cover.url, activeWS.logoUrl, activeWS.settings);
                            }}
                            className={`group relative h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-[1.02]' : 'border-transparent opacity-85 hover:opacity-100'
                            }`}
                          >
                            <img src={cover.url} alt={cover.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-end p-2">
                              <span className="text-[10px] font-bold text-white truncate">{cover.name}</span>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workspace Themes Accent */}
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Accent Highlight Theme</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Select signature highlight theme for primary buttons and badges</p>
                    </div>
                    <div className="flex gap-3">
                      {presets.map(p => {
                        const isActive = activeWS.theme === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onUpdateWorkspace?.(activeWS.id, activeWS.name, p.id, activeWS.coverUrl, activeWS.logoUrl, activeWS.settings);
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isActive ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md' : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full ${p.color} block`} title={p.name} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Danger Zone: Delete Workspace */}
                  {(!activeWS.user_id || activeWS.user_id === currentUser?.id) && workspaces.length > 1 && (
                    <div className="p-6 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">Danger Zone: Delete Workspace</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Permanently remove this workspace and all its underlying spaces and documents.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkspaceToDelete(activeWS);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
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
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display">
                <Users className="w-5 h-5 text-indigo-500" />
                {t('people') !== 'people' ? t('people') : 'Member Directory & Permissions'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Invite team members and configure workspace access roles</p>
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
                currentUser={currentUser}
                onSendWorkspaceInvites={onSendWorkspaceInvites}
              />
            </div>
          </div>
        )}

        {/* TAB: AI USAGE & CONFIGURATION */}
        {activeTab === 'ai_usage' && (
          <div className="space-y-6 max-w-3xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display">
                <Brain className="w-5 h-5 text-indigo-500" />
                {t('ai_usage') !== 'ai_usage' ? t('ai_usage') : 'Gemini AI Engine Settings'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fine-tune Google Gemini model parameters for smart task generation and summary tools</p>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-6">
              {/* API Key section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex justify-between">
                  <span>Gemini API Key</span>
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 normal-case">🔒 Stored in local browser storage</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={e => setAiApiKey(e.target.value)}
                    placeholder="Enter Google Gemini API Key (AIzaSy...)"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Get key from Google AI Studio (aistudio.google.com)</span>
                  <button
                    type="button"
                    disabled={isTestingAi}
                    onClick={handleTestAiConnection}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isTestingAi ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>

              {/* Model selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gemini Model Choice</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', badge: 'Recommended', desc: 'Ultra-fast & powerful for all workspace tasks' },
                    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Deep Reasoning', desc: 'Best for complex logic and code analysis' },
                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Lightweight', desc: 'Speed-optimized for simple summaries' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAiModel(m.id)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        aiModel === m.id
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                          : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100">{m.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{m.desc}</p>
                      </div>
                      <span className="inline-block mt-3 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 w-max">
                        {m.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex justify-between">
                  <span>Creativity Level (Temperature)</span>
                  <span className="font-mono font-bold text-indigo-500">{aiTemp.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiTemp}
                  onChange={e => setAiTemp(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                  <span>Precise (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              {/* Search Grounding */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/60 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Google Search Grounding</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Augment answers with live Google Web Search data</p>
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

              {/* Action save button */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/40 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveAiSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save AI Engine Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6 max-w-4xl text-left">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display">
                  <FileClock className="w-5 h-5 text-indigo-500" />
                  {t('audit_logs') !== 'audit_logs' ? t('audit_logs') : 'System Audit Logs'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Realtime database events, synchronization logs, and security activities</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
                </button>
              </div>
            </div>

            {/* Log controls & search */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                {filteredLogs.length} events logged
              </span>
            </div>

            {/* Console Log Terminal Window */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-2.5 max-h-[420px] overflow-y-auto shadow-inner">
              <div className="text-[10px] text-slate-500 border-b border-slate-800 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SYSTEM AUDIT STREAM v2.4</span>
                </div>
                <span className="animate-pulse text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  LIVE
                </span>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 italic py-6 text-center">
                  {auditSearchQuery ? 'No log entries match your filter query.' : 'No system logs recorded yet. Active realtime synchronization is running.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="flex items-start gap-2.5 text-left hover:bg-slate-900/60 p-1 rounded transition-colors">
                      <span className="text-slate-500 select-none text-[10px] shrink-0 font-mono">[{log.time || new Date().toLocaleTimeString()}]</span>
                      <span className="text-emerald-300 break-all">{log.action || JSON.stringify(log)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PERSONALIZATION PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 max-w-4xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display">
                <Sliders className="w-5 h-5 text-indigo-500" />
                {t('settingsPersonal') !== 'settingsPersonal' ? t('settingsPersonal') : 'System Personalization'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {t('settingsDesc') !== 'settingsDesc' ? t('settingsDesc') : 'Customize theme modes, accent colors, audio haptics, and glassmorphism depth'}
              </p>
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
                        <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {isDarkMode ? 'Immersive space dark layout' : 'Crystalline space light theme'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      (window as any).playSystemSound?.('toggle');
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isDarkMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Toggle between the signature crystalline light mode and the immersive deep dark mode layout.
                </div>
              </div>

              {/* Accent Theme Color */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    <Palette className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('accentColor') !== 'accentColor' ? t('accentColor') : 'Accent Theme Color'}
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {t('accentColorDesc') !== 'accentColorDesc' ? t('accentColorDesc') : 'Personalize your representative tone color'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {presets.map(p => {
                    const isActive = accentPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setAccentPreset(p.id as any);
                          (window as any).playSystemSound?.('click');
                        }}
                        className={`w-8 h-8 rounded-full transition-all cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                      >
                        <span className={`w-6 h-6 rounded-full ${p.color} block`} title={p.name} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound Effects */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                      {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-500" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {t('soundEffects') !== 'soundEffects' ? t('soundEffects') : 'Interactive Sound Effects'}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {t('soundEffectsDesc') !== 'soundEffectsDesc' ? t('soundEffectsDesc') : 'Play subtle sounds when switching tabs, clicking buttons or completing tasks'}
                      </p>
                    </div>
                  </div>

                  {soundEnabled && (
                    <button
                      type="button"
                      onClick={() => (window as any).playSystemSound?.('success')}
                      className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black hover:bg-indigo-200 transition-colors cursor-pointer"
                    >
                      Test Audio
                    </button>
                  )}
                </div>
                <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSoundEnabled(true);
                      setTimeout(() => (window as any).playSystemSound?.('success'), 50);
                    }}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${soundEnabled ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-black' : 'text-slate-500'}`}
                  >
                    {t('soundOn') !== 'soundOn' ? t('soundOn') : 'Enable sound'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(false)}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${!soundEnabled ? 'bg-white shadow-xs text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-black' : 'text-slate-500'}`}
                  >
                    {t('soundOff') !== 'soundOff' ? t('soundOff') : 'Mute sound'}
                  </button>
                </div>
              </div>

              {/* Glassmorphism Blur Strength */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    <Layers className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('blurStrength') !== 'blurStrength' ? t('blurStrength') : 'Blur Effect Strength'}
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {t('blurStrengthDesc') !== 'blurStrengthDesc' ? t('blurStrengthDesc') : 'Adjust backdrop blur depth for dialogs and elevated cards'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl">
                  {(['soft', 'default', 'immersive'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setBlurIntensity(lvl);
                        (window as any).playSystemSound?.('toggle');
                      }}
                      className={`py-1.5 text-[10px] font-black capitalize rounded-lg transition-all cursor-pointer ${blurIntensity === lvl ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      {lvl === 'soft' 
                        ? (t('blurSoft') !== 'blurSoft' ? t('blurSoft') : 'Soft (8px)') 
                        : lvl === 'default' 
                        ? (t('blurDefault') !== 'blurDefault' ? t('blurDefault') : 'Default (16px)') 
                        : (t('blurImmersive') !== 'blurImmersive' ? t('blurImmersive') : 'Immersive (28px)')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Choice */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl">
                    <Globe className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('language') !== 'language' ? t('language') : 'Language'}
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {t('languageDesc') !== 'languageDesc' ? t('languageDesc') : 'Choose system display language'}
                    </p>
                  </div>
                </div>
                <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLocale('en');
                      (window as any).playSystemSound?.('toggle');
                    }}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${locale === 'en' ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-black' : 'text-slate-500'}`}
                  >
                    English 🇺🇸
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocale('vi');
                      (window as any).playSystemSound?.('toggle');
                    }}
                    className={`flex-1 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${locale === 'vi' ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-black' : 'text-slate-500'}`}
                  >
                    Tiếng Việt 🇻🇳
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: NOTIFICATIONS SUBSCRIPTION */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-4xl text-left">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 font-display">
                <Bell className="w-5 h-5 text-indigo-500" />
                {t('notifications') !== 'notifications' ? t('notifications') : 'Notification Settings'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Toggle notification haptics, Do Not Disturb schedules, and event filters</p>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-6">
              {/* Quick switches */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-200/40 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Master Notifications Control</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNotificationSettings(prev => ({ ...prev, enableAll: !prev.enableAll }))}
                    className={`px-3.5 py-1.5 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer ${notificationSettings.enableAll ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                  >
                    {notificationSettings.enableAll ? 'Notifications On' : 'Notifications Muted'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationSettings(prev => ({ ...prev, dndActive: !prev.dndActive }))}
                    className={`px-3.5 py-1.5 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer ${notificationSettings.dndActive ? 'bg-rose-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                  >
                    Do Not Disturb (DND)
                  </button>
                </div>
              </div>

              {/* DND Duration Pause & Custom Schedules */}
              <div className="space-y-4 pt-2 border-b border-slate-200/40 dark:border-slate-800 pb-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  Do Not Disturb Options
                </h4>

                {/* 1. Temp Pause */}
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/40 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Temporary Pause (Tạm dừng thông báo)</span>
                    {notificationSettings.dndDurationUntil && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md animate-pulse">
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
                        className="px-3 py-1 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
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
                      className="px-3 py-1 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      Until Tomorrow
                    </button>
                    {notificationSettings.dndDurationUntil && (
                      <button
                        type="button"
                        onClick={() => setNotificationSettings(prev => ({ ...prev, dndDurationUntil: null }))}
                        className="px-3 py-1 text-[10px] font-extrabold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                      >
                        Cancel Pause
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Schedule DND */}
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/40 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Scheduled DND (Lên lịch tự động)</span>
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Automatically trigger DND during quiet hours</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!notificationSettings.dndScheduleEnabled}
                        onChange={e => setNotificationSettings(prev => ({ ...prev, dndScheduleEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {notificationSettings.dndScheduleEnabled && (
                    <div className="flex items-center gap-4 pt-1 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400">Start:</span>
                        <input
                          type="time"
                          value={notificationSettings.dndScheduleStart || '22:00'}
                          onChange={e => setNotificationSettings(prev => ({ ...prev, dndScheduleStart: e.target.value }))}
                          className="px-2 py-1 text-[10.5px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none cursor-pointer text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400">End:</span>
                        <input
                          type="time"
                          value={notificationSettings.dndScheduleEnd || '07:00'}
                          onChange={e => setNotificationSettings(prev => ({ ...prev, dndScheduleEnd: e.target.value }))}
                          className="px-2 py-1 text-[10.5px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none cursor-pointer text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Allow Exceptions */}
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/60 rounded-xl cursor-pointer">
                  <div className="text-left">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Allow Urgent Alerts (Cho phép thông báo khẩn)</span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Deliver notifications for overdue or urgent tasks even during DND</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!notificationSettings.dndAllowUrgent}
                    onChange={e => setNotificationSettings(prev => ({ ...prev, dndAllowUrgent: e.target.checked }))}
                    className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Frequency limits */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Frequency Spam Filter</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'all', label: 'All Updates', desc: 'Show all notifications immediately.' },
                    { id: 'throttled', label: 'Throttled (3s)', desc: 'Group rapid consecutive updates.' },
                    { id: 'minimal', label: 'Minimal', desc: 'Only high priority alerts.' }
                  ].map(f => (
                    <label key={f.id} className={`p-3.5 rounded-xl bg-white dark:bg-slate-800 border transition-all cursor-pointer flex flex-col justify-between ${notificationSettings.frequencyLimit === f.id ? 'border-indigo-500 shadow-xs' : 'border-slate-200/50 dark:border-slate-700/60'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="freq"
                          checked={notificationSettings.frequencyLimit === f.id}
                          onChange={() => setNotificationSettings(prev => ({ ...prev, frequencyLimit: f.id as any }))}
                          className="text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">{f.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Subscriptions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Event Subscriptions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'enableAssignments', label: 'New Assignments' },
                    { key: 'enableDeadlines', label: 'Task Deadlines' },
                    { key: 'enableComments', label: 'Comments & Chat' },
                    { key: 'enableStatusChanges', label: 'Status Transitions' },
                    { key: 'enableSystemNotify', label: 'System Action Logs' }
                  ].map(evt => (
                    <label key={evt.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/60 rounded-xl cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{evt.label}</span>
                      <input
                        type="checkbox"
                        checked={!!(notificationSettings as any)[evt.key]}
                        onChange={e => setNotificationSettings(prev => ({ ...prev, [evt.key]: e.target.checked }))}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Workspace Confirmation Modal */}
      <AnimatePresence>
        {workspaceToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-rose-100 dark:border-rose-950/30 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
                  <span className="font-display font-black text-rose-700 dark:text-rose-400 text-base">Confirm Workspace Deletion</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkspaceToDelete(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 font-sans text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  This action <strong>cannot be undone</strong>. Workspace <strong className="text-slate-900 dark:text-slate-100">"{workspaceToDelete.name}"</strong> and its associated spaces will be permanently deleted.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300">
                  Please type the workspace name below to confirm:
                  <div className="mt-1 font-mono bg-white dark:bg-slate-950 p-1 px-2 rounded border border-amber-500/30 text-center text-xs select-all font-black">
                    {workspaceToDelete.name}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm_ws_name_input" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Workspace Name</label>
                  <input
                    id="confirm_ws_name_input"
                    type="text"
                    required
                    placeholder={`Type "${workspaceToDelete.name}"`}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 outline-none font-semibold text-slate-900 dark:text-slate-100"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="p-4 px-6 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setWorkspaceToDelete(null)}
                  className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-[11px] font-extrabold text-slate-600 dark:text-slate-400 cursor-pointer"
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
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/10 cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
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
