"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Trash2, Loader2, AlertTriangle, 
  Briefcase, Sliders, ShieldCheck, Image, Save
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Workspace, User } from '../types';
import { WORKSPACE_COVERS } from './SettingsPanel';

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
}

export default function WorkspaceSettingsModal({
  isOpen,
  onClose,
  workspace,
  currentUser,
  onUpdateWorkspace,
  onDeleteWorkspace,
  members,
  workspacesCount
}: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'clickapps' | 'members' | 'danger'>('general');
  
  // Form states
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('indigo');
  const [coverUrl, setCoverUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [clickApps, setClickApps] = useState<Record<string, boolean>>({});;
  
  // Loading & uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with selected workspace
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setTheme(workspace.theme || 'indigo');
      setCoverUrl(workspace.coverUrl || '');
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
      setDeleteConfirmText('');
    }
  }, [workspace, isOpen]);

  if (!isOpen || !workspace) return null;

  const activeWSMembers = members.filter(m => m.workspaceIds?.includes(workspace.id));

  // Handle avatar upload to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image smaller than 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || currentUser?.id || 'anonymous';
      
      const fileExt = file.name.split('.').pop() || 'png';
      // Path must start with userId to satisfy Supabase storage policies
      const fileName = `${userId}/workspaces/${workspace.id}_avatar_${Date.now()}.${fileExt}`;

      // Upload file to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Fetch public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      
      // Instantly trigger an update or let user click save
      onUpdateWorkspace(workspace.id, name, theme, coverUrl, publicUrl, {
        ...workspace.settings,
        defaultClickApps: clickApps
      });
      
      if ((window as any).playSystemSound) {
        (window as any).playSystemSound('success');
      }
    } catch (error: Error | unknown) {
      console.error("Error uploading workspace avatar:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove workspace avatar
  const handleRemoveAvatar = async () => {
    setLogoUrl('');
    onUpdateWorkspace(workspace.id, name, theme, coverUrl, '', {
      ...workspace.settings,
      defaultClickApps: clickApps
    });
    if ((window as any).playSystemSound) {
      (window as any).playSystemSound('toggle');
    }
  };

  // Save overall changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      onUpdateWorkspace(workspace.id, name.trim(), theme, coverUrl, logoUrl, {
        ...workspace.settings,
        defaultClickApps: clickApps
      });
      if ((window as any).playSystemSound) {
        (window as any).playSystemSound('success');
      }
      onClose();
    } catch (error) {
      console.error("Error updating workspace settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete workspace handler
  const handleDeleteWorkspace = async () => {
    if (deleteConfirmText.trim() !== workspace.name) {
      alert("Please enter the exact workspace name to confirm.");
      return;
    }

    if (workspacesCount <= 1) {
      alert("You must keep at least one workspace.");
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

  const toggleClickApp = (key: string) => {
    setClickApps((prev: Record<string, boolean>) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const themePresets = [
    { id: 'indigo', name: 'Avaxa Violet', color: 'bg-indigo-500', hex: '#7B61FF' },
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-sky-500', hex: '#0ea5e9' },
    { id: 'forest', name: 'Forest Green', color: 'bg-emerald-500', hex: '#10b981' },
    { id: 'sunset', name: 'Sunset Pink', color: 'bg-rose-500', hex: '#f43f5e' }
  ] as const;

  const currentThemeObj = themePresets.find(t => t.id === theme) || themePresets[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-955/65 backdrop-blur-sm flex items-center justify-center p-4">
        {/* Overlay dismiss */}
        <div className="absolute inset-0 animate-fade-in" onClick={onClose} />

        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
          className="relative w-full max-w-4xl h-[85vh] max-h-[720px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col z-10 cursor-default"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-905/50 shrink-0">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-[15px] shadow-sm shrink-0 overflow-hidden relative"
                style={coverUrl ? {
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : {
                  background: `linear-gradient(135deg, ${currentThemeObj.hex}, #a78bfa)`
                }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={name} className="w-full h-full object-cover relative z-10 animate-fade-in" />
                ) : (
                  <span className="relative z-10 drop-shadow-xs uppercase">
                    {name ? name.charAt(0).toUpperCase() : 'W'}
                  </span>
                )}
                {coverUrl && <div className="absolute inset-0 bg-slate-950/20" />}
              </div>
              <div className="text-left">
                <h3 className="font-display font-black text-slate-855 dark:text-slate-50 text-base leading-tight">
                  {name || 'Workspace Settings'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Configure Workspace Options
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body Layout */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Sidebar Navigation */}
            <div className="w-56 border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 p-4 flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'general'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-l-4 border-indigo-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>General & Cover</span>
              </button>
              <button
                onClick={() => setActiveTab('clickapps')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'clickapps'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-l-4 border-indigo-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Global ClickApps</span>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'members'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-l-4 border-indigo-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Members ({activeWSMembers.length})</span>
              </button>
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={() => setActiveTab('danger')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'danger'
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-l-4 border-rose-550 shadow-xs'
                      : 'text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone</span>
                </button>
              </div>
            </div>

            {/* Content pane */}
            <div className="flex-1 overflow-y-auto p-6 text-left">
              {activeTab === 'general' && (
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Name, Accent & Logo Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Workspace Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Acme Studio, Product..."
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Accent color theme</span>
                        <div className="flex gap-2.5 pt-1">
                          {themePresets.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setTheme(t.id as any)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${theme === t.id ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-80 hover:scale-105'}`}
                              title={t.name}
                            >
                              <span className={`w-5 h-5 rounded-full ${t.color} block`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Avatar Upload Container */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                      <div className="relative group">
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md overflow-hidden relative cursor-pointer"
                          style={coverUrl ? {
                            backgroundImage: `url(${coverUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : {
                            background: `linear-gradient(135deg, ${currentThemeObj.hex}, #a78bfa)`
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
                          {coverUrl && <div className="absolute inset-0 bg-slate-950/20" />}
                          <div className="absolute inset-0 bg-black/45 z-20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-wider">
                            Change
                          </div>
                        </div>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md z-30 transition-colors"
                            title="Remove avatar"
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
                          <span>{isUploading ? "Uploading..." : "Upload Avatar"}</span>
                        </button>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">
                          Square image, PNG/JPG up to 2MB. Hosted on Supabase.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Covers selector */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/40 pt-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block flex items-center gap-1">
                      <Image className="w-3.5 h-3.5 text-indigo-400" />
                      Workspace cover background
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pb-2">
                      <button
                        type="button"
                        onClick={() => setCoverUrl('')}
                        className={`relative w-full aspect-[4/3] rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${!coverUrl ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm' : 'border-dashed border-slate-205 dark:border-slate-800 bg-slate-50/30'}`}
                      >
                        <span className="text-[9px] font-bold text-slate-400">Default</span>
                        {!coverUrl && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      </button>
                      {WORKSPACE_COVERS.map(cover => (
                        <button
                          key={cover.id}
                          type="button"
                          onClick={() => setCoverUrl(cover.url)}
                          className={`relative w-full aspect-[4/3] rounded-xl border overflow-hidden transition-all group cursor-pointer ${coverUrl === cover.url ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200/60 dark:border-slate-800 opacity-80 hover:opacity-100'}`}
                        >
                          <img
                            src={cover.url}
                            alt={cover.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[6px] font-black text-white text-center py-0.5 truncate px-0.5 uppercase tracking-tight">
                            {cover.name}
                          </div>
                          {coverUrl === cover.url && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/40">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer animate-fade-in"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'clickapps' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-500" />
                      Configure Workspace Apps
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-550">
                      Enable or disable advanced feature apps for all projects inside this workspace.
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
                        className={`flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                          clickApps[app.key]
                            ? 'bg-indigo-500/5 border-indigo-500/20 dark:bg-indigo-950/10'
                            : 'bg-slate-50/50 border-slate-100 dark:bg-slate-950/20 dark:border-slate-800/60 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="space-y-0.5 text-left pr-4">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-205 block">{app.label}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed block">{app.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!clickApps[app.key]}
                          onChange={() => toggleClickApp(app.key)}
                          className="rounded text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-0.5"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-150 dark:border-slate-800/50 mt-4">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Apps Configuration</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        Workspace Member Directory
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        View colleagues currently enrolled inside the {name} workspace.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                    {activeWSMembers.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs italic">
                        No additional staff enrolled. You can add them in the Team directory.
                      </div>
                    ) : (
                      activeWSMembers.map((member: User) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between gap-4 p-3 bg-slate-50/65 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} 
                                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" 
                                alt={member.name} 
                              />
                              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-350'}`} />
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{member.name}</span>
                              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">Email: {member.email || `${member.name.toLowerCase().replace(/\s+/g, '')}@avaxa.com`}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 border border-indigo-100/25">
                              {member.role || 'Member'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'danger' && (
                <div className="space-y-6">
                  {/* Info Warning Banner */}
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
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-250 dark:border-rose-900/40 bg-slate-50 dark:bg-slate-950/30 text-slate-850 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
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
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
