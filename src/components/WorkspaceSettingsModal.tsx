"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Trash2, Loader2, AlertTriangle, 
  Briefcase, Sliders, ShieldCheck, Image, Save,
  UserPlus, UserMinus, Plus, Search, X, ShieldAlert, Check,
  Mail, Phone, RefreshCw, Sparkles, Key, KeyRound, Copy, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Workspace, User, WorkspaceInvitation } from '../types';
import SignedImage from './SignedImage';
import InviteModal from './InviteModal';
import { useNotificationStore } from '@/store/notificationStore';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  currentUser: User;
  onUpdateWorkspace: (
    id: string, 
    name: string, 
    theme: string, 
    coverUrl?: string, 
    logoUrl?: string, 
    settings?: Record<string, unknown>
  ) => void;
  onDeleteWorkspace?: (id: string) => void;
  members: User[];
  workspacesCount: number;
  onUpdateMember?: (member: User) => void;
  onAddMember?: (member: Omit<User, 'id'>) => void;
}

export default function WorkspaceSettingsModal({
  isOpen,
  onClose,
  workspace,
  currentUser,
  onUpdateWorkspace,
  onDeleteWorkspace,
  members,
  workspacesCount,
  onUpdateMember,
  onAddMember
}: WorkspaceSettingsModalProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const isOwner = !workspace || !workspace.user_id || workspace.user_id === currentUser.id;
  
  // Form states
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('indigo');
  const [logoUrl, setLogoUrl] = useState('');
  const [clickApps, setClickApps] = useState<Record<string, boolean>>({});
  
  // API Keys States
  const [apiKey, setApiKey] = useState('ak_avaxa_prod_7df8a9bc0d24e18f8e12d3');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Loading & uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Member invite & add states
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

  const triggerToast = useNotificationStore(s => s.addToast);
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Theme presets
  const themePresets = [
    { id: 'indigo', name: 'Avaxa Violet', color: 'bg-indigo-500', hex: '#7B61FF' },
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-sky-500', hex: '#0ea5e9' },
    { id: 'forest', name: 'Forest Green', color: 'bg-emerald-500', hex: '#10b981' },
    { id: 'sunset', name: 'Sunset Pink', color: 'bg-rose-500', hex: '#f43f5e' }
  ] as const;

  const isCustomTheme = !themePresets.some(t => t.id === theme);
  const currentThemeHex = isCustomTheme 
    ? theme 
    : (themePresets.find(t => t.id === theme)?.hex || '#7B61FF');

  const fetchInvitations = React.useCallback(async () => {
    if (!workspace) return;
    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvitations(data.map((inv: any) => ({
          id: inv.id,
          workspaceId: inv.workspace_id,
          email: inv.email,
          role: inv.role,
          invitedBy: inv.invited_by,
          token: inv.token,
          status: inv.status,
          createdAt: inv.created_at,
          expiresAt: inv.expires_at
        })));
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  }, [workspace]);

  useEffect(() => {
    if (isOpen && workspace && activeTab === 'members') {
      fetchInvitations();
    }
  }, [isOpen, workspace, activeTab, fetchInvitations]);

  // Sync state with selected workspace
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setTheme(workspace.theme || 'indigo');
      setLogoUrl(workspace.logoUrl || '');
      
      const defaultClickApps = workspace.settings?.defaultClickApps || {
        timeTracking: true,
        multipleAssignees: true,
        customFields: true,
        relationships: true,
        subtasks: true,
        priorities: true
      };
      setClickApps(defaultClickApps);
      setApiKey(((workspace.settings as any)?.apiKey as string) || `ak_avaxa_prod_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`);
      setDeleteConfirmText('');
      setSelectedMemberToAdd('');
    }
  }, [workspace, isOpen]);

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Unified Save / Auto-Save Handler
  const handleAutoSave = async (updatedFields?: {
    updatedName?: string;
    updatedTheme?: string;
    updatedClickApps?: Record<string, boolean>;
    updatedLogoUrl?: string;
    updatedApiKey?: string;
  }) => {
    if (!workspace) return;
    setSavingStatus('saving');
    try {
      const finalName = updatedFields?.updatedName !== undefined ? updatedFields.updatedName : name;
      const finalTheme = updatedFields?.updatedTheme !== undefined ? updatedFields.updatedTheme : theme;
      const finalLogo = updatedFields?.updatedLogoUrl !== undefined ? updatedFields.updatedLogoUrl : logoUrl;
      const finalClickApps = updatedFields?.updatedClickApps !== undefined ? updatedFields.updatedClickApps : clickApps;
      const finalApiKey = updatedFields?.updatedApiKey !== undefined ? updatedFields.updatedApiKey : apiKey;

      const finalSettings = {
        ...workspace.settings,
        defaultClickApps: finalClickApps,
        apiKey: finalApiKey
      };

      // Ensure coverUrl is passed as an empty string to remove the cover completely
      onUpdateWorkspace(workspace.id, finalName.trim(), finalTheme, '', finalLogo, finalSettings);
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error("Error auto-saving settings:", error);
    }
  };

  // Debounce Workspace Name save
  useEffect(() => {
    if (!workspace || !name.trim()) return;
    if (name.trim() === workspace.name) return;

    const handler = setTimeout(() => {
      handleAutoSave({ updatedName: name.trim() });
    }, 1200);

    return () => clearTimeout(handler);
  }, [name]);

  if (!isOpen || !workspace) return null;

  const activeWSMembers = members.filter(m => m.workspaceIds?.includes(workspace.id));
  const nonWSMembers = members.filter(m => !m.workspaceIds?.includes(workspace.id));

  // Handle avatar upload to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image smaller than 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || currentUser?.id || 'anonymous';
      
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${userId}/workspaces/${workspace.id}_avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      handleAutoSave({ updatedLogoUrl: publicUrl });
      
      if ((window as any).playSystemSound) {
        (window as any).playSystemSound('success');
      }
    } catch (error) {
      console.error("Error uploading workspace avatar:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove workspace avatar
  const handleRemoveAvatar = async () => {
    setLogoUrl('');
    handleAutoSave({ updatedLogoUrl: '' });
    if ((window as any).playSystemSound) {
      (window as any).playSystemSound('toggle');
    }
  };

  // Change theme handler
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    handleAutoSave({ updatedTheme: newTheme });
  };

  // Toggle ClickApp handler
  const toggleClickApp = (key: string) => {
    const nextClickApps = {
      ...clickApps,
      [key]: !clickApps[key]
    };
    setClickApps(nextClickApps);
    handleAutoSave({ updatedClickApps: nextClickApps });
  };

  const handleSendInvites = async (emails: string[], role: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const invitedBy = session?.user?.id ? `user-${session.user.id}` : 'system';

      const newRecords = emails.map(email => ({
        workspace_id: workspace.id,
        email,
        role: role as any,
        invited_by: invitedBy,
        status: 'pending'
      }));

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert(newRecords)
        .select();

      if (!error && data) {
        fetchInvitations();
        data.forEach((record: any) => {
          triggerToast({
            id: generateId(),
            type: 'success',
            title: 'Invitation Sent',
            message: `Link for ${record.email}: ${window.location.origin}/?invite_token=${record.token}`,
            duration: 10000
          });
        });
      } else {
        console.error('Error inserting invitations:', error);
      }
    } catch (err) {
      console.error('Exception sending invites:', err);
    }
  };

  const handleResendInvite = async (inv: WorkspaceInvitation) => {
    try {
      const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ created_at: new Date().toISOString(), expires_at: newExpires })
        .eq('id', inv.id);

      if (!error) {
        fetchInvitations();
        triggerToast({
          id: generateId(),
          type: 'success',
          title: 'Resent Invitation',
          message: `Link for ${inv.email}: ${window.location.origin}/?invite_token=${inv.token}`,
          duration: 10000
        });
      }
    } catch (err) {
      console.error('Exception resending invite:', err);
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invId);

      if (!error) {
        setInvitations(prev => prev.filter(inv => inv.id !== invId));
        triggerToast({
          id: generateId(),
          type: 'success',
          title: 'Invitation Revoked',
          message: 'The invitation has been successfully cancelled.',
          duration: 4000
        });
      }
    } catch (err) {
      console.error('Exception revoking invite:', err);
    }
  };

  // Delete workspace handler
  const handleDeleteWorkspace = async () => {
    if (deleteConfirmText.trim() !== workspace.name) {
      alert("Please type the exact name to confirm deletion.");
      return;
    }

    if (workspacesCount <= 1) {
      alert("You must retain at least one workspace.");
      return;
    }

    setIsDeleting(true);
    try {
      if (onDeleteWorkspace) {
        await onDeleteWorkspace(workspace.id);
        if ((window as any).playSystemSound) {
          (window as any).playSystemSound('success');
        }
        onClose();
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy API key to clipboard
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
    triggerToast({
      id: generateId(),
      type: 'success',
      title: 'Copied API Key',
      message: 'The API Key has been copied to your clipboard.',
      duration: 2500
    });
  };

  // Regenerate API Key (Admin restricted)
  const handleRegenerateApiKey = () => {
    const isAdmin = currentUser.role === 'admin';
    if (!isAdmin) {
      triggerToast({
        id: generateId(),
        type: 'info',
        title: 'Action Blocked',
        message: 'Only workspace administrators are allowed to regenerate API keys.',
        duration: 4000
      });
      return;
    }

    if (!window.confirm("Are you sure you want to regenerate this API key? Existing integrations will break immediately.")) return;

    const newKey = `ak_avaxa_prod_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    setApiKey(newKey);
    handleAutoSave({ updatedApiKey: newKey });

    triggerToast({
      id: generateId(),
      type: 'info',
      title: 'API Key Regenerated',
      message: 'A new external API token was generated and persisted.',
      duration: 4000
    });
  };

  // Sidebar navigation data with category grouping
  const navigationItems = [
    {
      category: 'ADMIN',
      links: [
        { id: 'general', label: 'General Settings', icon: Briefcase, active: true },
        { id: 'members', label: `Members (${activeWSMembers.length})`, icon: ShieldCheck, active: true },
        { id: 'custom_fields', label: 'Custom Fields', icon: Sliders, active: false },
        { id: 'ai_notetaker', label: 'AI Notetaker', icon: Sparkles, active: false }
      ]
    },
    {
      category: 'FEATURES',
      links: [
        { id: 'clickapps', label: 'Workspace Features', icon: Sliders, active: true },
        { id: 'dashboards', label: 'Dashboards', icon: Image, active: false }
      ]
    },
    {
      category: 'INTEGRATIONS',
      links: [
        { id: 'api_keys', label: 'API Keys', icon: KeyRound, active: true },
        { id: 'slack', label: 'Slack Integration', icon: Mail, active: false },
        { id: 'github', label: 'GitHub Link', icon: RefreshCw, active: false }
      ]
    },
    {
      category: 'MY SETTINGS',
      links: [
        { id: 'profile', label: 'My Profile', icon: Mail, active: false },
        { id: 'notifications', label: 'Notifications', icon: Phone, active: false }
      ]
    }
  ];

  // Filtering based on search query
  const filteredNavigation = navigationItems.map(group => {
    const matchedLinks = group.links.filter(link => 
      link.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...group, links: matchedLinks };
  }).filter(group => group.links.length > 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-955/65 backdrop-blur-sm flex items-center justify-center p-4">
        {/* Overlay dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
          className="relative w-full max-w-4xl h-[85vh] max-h-[720px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-805 flex flex-col z-10 select-none"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-905/50 shrink-0">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-[15px] shadow-sm shrink-0 overflow-hidden relative"
                style={{
                  background: `linear-gradient(135deg, ${currentThemeHex}, #a78bfa)`
                }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={name} className="w-full h-full object-cover relative z-10" />
                ) : (
                  <span className="relative z-10 drop-shadow-xs uppercase">
                    {name ? name.charAt(0).toUpperCase() : 'W'}
                  </span>
                )}
              </div>
              <div className="text-left">
                <h3 className="font-display font-black text-slate-855 dark:text-slate-55 text-base leading-tight">
                  {name || 'Workspace Settings'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Configure Workspace Options
                </p>
              </div>
            </div>

            {/* Top status indicator & Close button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                {savingStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span className="text-[10px]">Saving...</span>
                  </>
                )}
                {savingStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>All changes saved</span>
                  </span>
                )}
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body Layout */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Sidebar Navigation */}
            <div className="w-60 border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-955/20 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
              
              {/* Search Header */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="w-full pl-8 pr-12 py-1.5 text-[11px] font-semibold rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-905 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
                <span className="absolute right-2 top-2 text-[8px] font-black text-slate-400 border border-slate-200 dark:border-slate-805 rounded px-1 select-none">
                  Ctrl+K
                </span>
              </div>

              {/* Grouped Links */}
              <div className="space-y-4">
                {filteredNavigation.map(group => (
                  <div key={group.category} className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest block px-2 uppercase">
                      {group.category}
                    </span>
                    {group.links.map(link => (
                      <button
                        key={link.id}
                        onClick={() => setActiveTab(link.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          activeTab === link.id
                            ? 'bg-indigo-550/10 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-l-4 border-indigo-550 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <link.icon className="w-3.5 h-3.5" />
                        <span>{link.label}</span>
                        {!link.active && (
                          <span className="ml-auto text-[7px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 rounded px-1 uppercase tracking-tight py-0.5">Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Danger Zone Link (Aligned to bottom of sidebar) */}
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-805">
                <button
                  onClick={() => setActiveTab('danger')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === 'danger'
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-l-4 border-rose-550 shadow-xs'
                      : 'text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-955/10'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Danger Zone</span>
                </button>
              </div>
            </div>

            {/* Content Pane */}
            <div className="flex-1 overflow-y-auto p-6 text-left">
              
              {/* ACTIVE TABS */}

              {/* 1. General Settings Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Workspace Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Acme Studio, Product..."
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                      </div>

                      {/* Accent Color Presets */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Accent Color Theme</span>
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          {themePresets.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleThemeChange(t.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${theme === t.id ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-80 hover:scale-105'}`}
                              title={t.name}
                            >
                              <span className={`w-5 h-5 rounded-full ${t.color} block`} />
                            </button>
                          ))}

                          {/* Custom Color Selector */}
                          <div className="relative w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:scale-105 transition-transform group cursor-pointer" title="Custom Theme Picker">
                            <span 
                              className="w-5 h-5 rounded-full block border border-slate-250 dark:border-slate-700 shadow-inner"
                              style={{ backgroundColor: currentThemeHex }}
                            />
                            <input 
                              type="color" 
                              value={currentThemeHex}
                              onChange={(e) => handleThemeChange(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            {isCustomTheme && (
                              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[8px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logo Image Upload Container */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                      <div className="relative group">
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md overflow-hidden relative cursor-pointer"
                          style={{
                            background: `linear-gradient(135deg, ${currentThemeHex}, #a78bfa)`
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {logoUrl ? (
                            <img src={logoUrl} alt={name} className="w-full h-full object-cover relative z-10 animate-fade-in" />
                          ) : (
                            <span className="relative z-10 drop-shadow-sm uppercase">
                              {name ? name.charAt(0).toUpperCase() : 'W'}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/45 z-20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-wider">
                            Change
                          </div>
                        </div>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md z-30 transition-colors"
                            title="Remove Logo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isUploading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>{isUploading ? "Uploading..." : "Upload Logo"}</span>
                        </button>
                        <p className="text-[9px] text-slate-400 dark:text-slate-505">
                          PNG, SVG, or JPG under 2MB. Raw URL is hidden.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/40">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Global ClickApps Tab */}
              {activeTab === 'clickapps' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-500" />
                      Configure Workspace Apps
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-550">
                      Enable or disable collaborative features for all spaces and lists.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                    {[
                      { key: 'timeTracking', label: 'Time Tracking', desc: 'Track hours worked on tasks and log timesheets' },
                      { key: 'multipleAssignees', label: 'Multiple Assignees', desc: 'Assign more than one member to a single card' },
                      { key: 'customFields', label: 'Custom Fields', desc: 'Add personalized text, number or date columns' },
                      { key: 'relationships', label: 'Relationships', desc: 'Connect documents, tasks, and link dependencies' },
                      { key: 'subtasks', label: 'Subtasks', desc: 'Create nested task lists to track micro-milestones' },
                      { key: 'priorities', label: 'Priorities', desc: 'Use flags (Emergency, High, Normal, Low) for sorting' }
                    ].map(app => (
                      <label 
                        key={app.key} 
                        className={`flex items-start justify-between p-4 rounded-2xl border transition-all select-none ${
                          !isOwner 
                            ? 'cursor-not-allowed opacity-80 bg-slate-50/30 border-slate-100 dark:bg-slate-950/10 dark:border-slate-805' 
                            : 'cursor-pointer'
                        } ${
                          clickApps[app.key] && isOwner
                            ? 'bg-indigo-500/5 border-indigo-500/20 dark:bg-indigo-950/10'
                            : !clickApps[app.key] && isOwner
                              ? 'bg-slate-50/50 border-slate-100 dark:bg-slate-955/20 dark:border-slate-800/60 hover:bg-slate-100/50'
                              : ''
                        }`}
                      >
                        <div className="space-y-0.5 text-left pr-4">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-205 block">{app.label}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed block">{app.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!clickApps[app.key]}
                          disabled={!isOwner}
                          onChange={() => isOwner && toggleClickApp(app.key)}
                          className="rounded text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-150 dark:border-slate-805 mt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Members Directory Tab */}
              {activeTab === 'members' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        Workspace Member Directory
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Manage roles, invite new colleagues, or remove access to this workspace.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Add Directory Member */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl space-y-3 text-left">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider block">Add Member from Directory</span>
                      {nonWSMembers.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-2">All team directory members are already in this workspace.</p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedMemberToAdd}
                            onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            <option value="">Choose member...</option>
                            {nonWSMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.email})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedMemberToAdd) return;
                              const targetMember = members.find(m => m.id === selectedMemberToAdd);
                              if (targetMember && onUpdateMember) {
                                const updatedWSIds = [...(targetMember.workspaceIds || []), workspace.id];
                                onUpdateMember({
                                  ...targetMember,
                                  workspaceIds: updatedWSIds
                                });
                                setSelectedMemberToAdd('');
                              }
                            }}
                            disabled={!selectedMemberToAdd}
                            className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-650 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Invite via Email */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex flex-col justify-between items-start gap-3 text-left">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider block">Invite Colleague</span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-550 mt-1">Send a secure workspace invitation to multiple team members.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-655 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invite via email</span>
                      </button>
                    </div>
                  </div>

                  {/* Active members list */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider block">Enrolled Members ({activeWSMembers.length})</span>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2 bg-slate-50/20">
                      {activeWSMembers.map((member: User) => {
                        const isMe = member.id === currentUser?.id || member.id === 'user' || member.id === `user-${currentUser?.id}`;
                        return (
                          <div 
                            key={member.id} 
                            className="flex items-center justify-between gap-4 p-2 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/50 rounded-xl hover:shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <SignedImage 
                                  filePath={member.avatar} 
                                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-750 object-cover" 
                                  alt={member.name} 
                                />
                                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-350'}`} />
                              </div>
                              <div className="text-left min-w-0">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                                  {member.name} {isMe && <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-455 ml-1">(You)</span>}
                                </span>
                                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium block truncate">
                                  {member.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isMe ? (
                                <span className="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-indigo-50 dark:bg-indigo-955/30 text-indigo-650 dark:text-indigo-400 border border-indigo-100/25">
                                  {member.role || 'Member'}
                                </span>
                              ) : (
                                <>
                                  <select
                                    value={member.role || 'member'}
                                    onChange={(e) => {
                                      if (onUpdateMember) {
                                        onUpdateMember({
                                          ...member,
                                          role: e.target.value as any
                                        });
                                      }
                                    }}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase px-2 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                    <option value="guest">Guest</option>
                                  </select>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onUpdateMember) {
                                        const updatedWSIds = (member.workspaceIds || []).filter(id => id !== workspace.id);
                                        onUpdateMember({
                                          ...member,
                                          workspaceIds: updatedWSIds
                                        });
                                      }
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors cursor-pointer"
                                    title="Remove member"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. API Keys Integration Tab */}
              {activeTab === 'api_keys' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Key className="w-4 h-4 text-indigo-500" />
                      External Integration API Keys
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-left mt-0.5">
                      Retrieve and manage access tokens for third-party integrations (ClickUp, GitHub, etc.).
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50/50 dark:bg-slate-955/25 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-505 tracking-wider block">ClickUp Sync API Token</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            readOnly
                            className="w-full pl-3 pr-10 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 rounded transition-colors"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyApiKey}
                          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-955/40 border border-indigo-200/50 hover:bg-indigo-100 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Security warning & regenerate button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                      <div className="flex gap-2 text-[10px] text-slate-400 max-w-md items-start text-left">
                        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Security Warning:</strong> Keep this API key private. Exposing this token allows anyone to read/write workspace settings. API keys are masked by default.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRegenerateApiKey}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100/60 dark:bg-rose-955/20 border border-rose-200/30 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate Key</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/40">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Danger Zone Tab */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-700 dark:text-rose-350 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <span className="font-extrabold text-xs block">Irreversible Workspace Deletion</span>
                      <p className="leading-relaxed">
                        This action will permanently delete the workspace <strong>{workspace.name}</strong>, along with all associated spaces, tasks, lists, whiteboards, docs, and channels. Any synced database data will be removed.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        To confirm deletion, please type the workspace name: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-500 font-mono text-xs">{workspace.name}</code>
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder="Type workspace name exactly..."
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-rose-250 dark:border-rose-900/40 bg-slate-50 dark:bg-slate-950/30 text-slate-850 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isDeleting || deleteConfirmText.trim() !== workspace.name || workspacesCount <= 1}
                      onClick={handleDeleteWorkspace}
                      className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-md shadow-rose-500/10 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Delete Workspace Permanently</span>
                    </button>
                    {workspacesCount <= 1 && (
                      <p className="text-[10px] text-center text-slate-400 italic">
                        Deletion disabled: you must retain at least one workspace in the system.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* PLACEHOLDER PAGES (COMING SOON) */}
              {!['general', 'members', 'clickapps', 'api_keys', 'danger'].includes(activeTab) && (
                <div className="h-96 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-sm animate-pulse">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                      {activeTab.replace('_', ' ')} Option Coming Soon
                    </h4>
                    <p className="text-xs text-slate-450 dark:text-slate-500 max-w-sm">
                      We are currently developing advanced {activeTab.replace('_', ' ')} modules. They will become available automatically in a future application release.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Back to General Settings
                  </button>
                </div>
              )}

            </div>
          </div>
          <InviteModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onSendInvites={handleSendInvites}
            workspaceName={workspace.name}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
