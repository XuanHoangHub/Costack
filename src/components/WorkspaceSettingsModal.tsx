"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Trash2, Loader2, AlertTriangle, 
  Briefcase, Sliders, ShieldCheck,
  UserPlus, UserMinus, Search, X, Check, Users, Copy, RefreshCw
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Workspace, User, WorkspaceInvitation, WorkspaceRole } from '../types';
import SignedImage from './SignedImage';
import { presenceDotClass } from '../lib/presence';
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
  ) => void | Promise<void>;
  onDeleteWorkspace?: (id: string) => void | Promise<void>;
  members: User[];
  workspacesCount: number;
  onUpdateMember?: (member: User) => void;
  onAddMember?: (member: Omit<User, 'id'>) => void;
  onSendWorkspaceInvites?: (emails: string[], role: string) => void | Promise<void>;
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
  onAddMember,
  onSendWorkspaceInvites
}: WorkspaceSettingsModalProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentRole, setCurrentRole] = useState<WorkspaceRole>('guest');
  const [membershipRoles, setMembershipRoles] = useState<Record<string, WorkspaceRole>>({});
  const [membersLoading, setMembersLoading] = useState(false);
  const isOwner = currentRole === 'owner';
  const canAdminister = currentRole === 'owner' || currentRole === 'admin';
  
  // Form states
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('indigo');
  const [logoUrl, setLogoUrl] = useState('');
  const [clickApps, setClickApps] = useState<Record<string, boolean>>({});
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [weekStartsOn, setWeekStartsOn] = useState<'monday' | 'sunday'>('monday');
  const [defaultRole, setDefaultRole] = useState<Exclude<WorkspaceRole, 'owner'>>('member');
  const [allowMemberInvites, setAllowMemberInvites] = useState(false);

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
    { id: 'indigo', name: 'Apexa Violet', color: 'bg-indigo-500', ring: 'ring-indigo-500', hex: '#7B61FF' },
    { id: 'ocean', name: 'Ocean Blue', color: 'bg-sky-500', ring: 'ring-sky-500', hex: '#0ea5e9' },
    { id: 'forest', name: 'Forest Green', color: 'bg-emerald-500', ring: 'ring-emerald-500', hex: '#10b981' },
    { id: 'sunset', name: 'Sunset Pink', color: 'bg-rose-500', ring: 'ring-rose-500', hex: '#f43f5e' }
  ] as const;

  const isCustomTheme = !themePresets.some(t => t.id === theme);
  const currentThemeHex = isCustomTheme 
    ? theme 
    : (themePresets.find(t => t.id === theme)?.hex || '#7B61FF');

  const fetchMemberships = React.useCallback(async () => {
    if (!workspace) return;
    setMembersLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('workspace_memberships')
        .select('user_id, role, status')
        .eq('workspace_id', workspace.id)
        .eq('status', 'active');

      if (error) throw error;
      const roles = Object.fromEntries(
        (data || []).map(row => [row.user_id, row.role as WorkspaceRole])
      );
      setMembershipRoles(roles);
      const authUserId = session?.user?.id || currentUser.userId;
      const resolvedRole = authUserId ? roles[authUserId] : undefined;
      setCurrentRole(
        resolvedRole || (workspace.user_id && workspace.user_id === authUserId ? 'owner' : 'guest')
      );
    } catch (error) {
      console.error('Unable to load workspace memberships:', error);
      setCurrentRole(workspace.user_id === currentUser.userId ? 'owner' : 'guest');
    } finally {
      setMembersLoading(false);
    }
  }, [workspace, currentUser.userId]);

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
          invitedByName: inv.invited_by_name,
          token: inv.token,
          status: inv.status,
          createdAt: inv.created_at,
          expiresAt: inv.expires_at,
          workspaceName: inv.workspace_name
        })));
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  }, [workspace]);

  useEffect(() => {
    if (isOpen && workspace) {
      fetchMemberships();
      if (activeTab === 'members') fetchInvitations();
    }
  }, [isOpen, workspace, activeTab, fetchInvitations, fetchMemberships]);

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
      setDescription(workspace.settings?.description || '');
      setTimezone(workspace.settings?.timezone || 'Asia/Ho_Chi_Minh');
      setWeekStartsOn(workspace.settings?.weekStartsOn || 'monday');
      setDefaultRole(workspace.settings?.defaultRole || 'member');
      setAllowMemberInvites(workspace.settings?.allowMemberInvites || false);
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
    updatedDescription?: string;
    updatedTimezone?: string;
    updatedWeekStartsOn?: 'monday' | 'sunday';
    updatedDefaultRole?: Exclude<WorkspaceRole, 'owner'>;
    updatedAllowMemberInvites?: boolean;
    updatedApiKey?: string;
  }) => {
    if (!workspace || !canAdminister) return;
    setSavingStatus('saving');
    try {
      const finalName = updatedFields?.updatedName !== undefined ? updatedFields.updatedName : name;
      const finalTheme = updatedFields?.updatedTheme !== undefined ? updatedFields.updatedTheme : theme;
      const finalLogo = updatedFields?.updatedLogoUrl !== undefined ? updatedFields.updatedLogoUrl : logoUrl;
      const finalClickApps = updatedFields?.updatedClickApps !== undefined ? updatedFields.updatedClickApps : clickApps;

      const finalSettings = {
        ...workspace.settings,
        defaultClickApps: finalClickApps,
        description: updatedFields?.updatedDescription ?? description,
        timezone: updatedFields?.updatedTimezone ?? timezone,
        weekStartsOn: updatedFields?.updatedWeekStartsOn ?? weekStartsOn,
        defaultRole: updatedFields?.updatedDefaultRole ?? defaultRole,
        allowMemberInvites: updatedFields?.updatedAllowMemberInvites ?? allowMemberInvites
      };

      await onUpdateWorkspace(workspace.id, finalName.trim(), finalTheme, workspace.coverUrl, finalLogo, finalSettings);
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error("Error auto-saving settings:", error);
      setSavingStatus('idle');
      triggerToast({ id: generateId(), type: 'info', title: 'Could not save', message: error instanceof Error ? error.message : 'Workspace settings were not saved.', duration: 4000 });
    }
  };

  // Debounce Workspace Name save
  useEffect(() => {
    if (!workspace || !canAdminister || !name.trim()) return;
    if (name.trim() === workspace.name) return;

    const handler = setTimeout(() => {
      handleAutoSave({ updatedName: name.trim() });
    }, 1200);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (!isOpen || !workspace) return null;

  const activeWSMembers = members.filter(m => Boolean(m.userId && membershipRoles[m.userId]));
  const nonWSMembers = members.filter(m => Boolean(m.userId && !membershipRoles[m.userId]));

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

  const addDirectoryMember = async () => {
    if (!workspace || !canAdminister || !selectedMemberToAdd) return;
    const target = members.find(member => member.id === selectedMemberToAdd);
    if (!target?.userId) return;
    try {
      const { error } = await supabase.from('workspace_memberships').insert({
        workspace_id: workspace.id,
        user_id: target.userId,
        role: defaultRole,
        status: 'active'
      });
      if (error) throw error;
      setSelectedMemberToAdd('');
      await fetchMemberships();
      onUpdateMember?.({ ...target, workspaceIds: Array.from(new Set([...(target.workspaceIds || []), workspace.id])) });
      triggerToast({ id: generateId(), type: 'success', title: 'Member added', message: `${target.name} can now access this workspace.`, duration: 3000 });
    } catch (error) {
      triggerToast({ id: generateId(), type: 'info', title: 'Could not add member', message: error instanceof Error ? error.message : 'Please try again.', duration: 4000 });
    }
  };

  const updateMembershipRole = async (member: User, role: Exclude<WorkspaceRole, 'owner'>) => {
    if (!workspace || !canAdminister || !member.userId) return;
    const previous = membershipRoles[member.userId];
    setMembershipRoles(roles => ({ ...roles, [member.userId!]: role }));
    const { error } = await supabase.from('workspace_memberships').update({ role }).eq('workspace_id', workspace.id).eq('user_id', member.userId);
    if (error) {
      setMembershipRoles(roles => ({ ...roles, [member.userId!]: previous }));
      triggerToast({ id: generateId(), type: 'info', title: 'Role unchanged', message: error.message, duration: 4000 });
    }
  };

  const removeWorkspaceMember = async (member: User) => {
    if (!workspace || !canAdminister || !member.userId) return;
    if (!window.confirm(`Remove ${member.name} from ${workspace.name}?`)) return;
    const { error } = await supabase.from('workspace_memberships').delete().eq('workspace_id', workspace.id).eq('user_id', member.userId);
    if (error) {
      triggerToast({ id: generateId(), type: 'info', title: 'Could not remove member', message: error.message, duration: 4000 });
      return;
    }
    await fetchMemberships();
    onUpdateMember?.({ ...member, workspaceIds: (member.workspaceIds || []).filter(id => id !== workspace.id) });
  };

  const handleSendInvites = async (emails: string[], role: string) => {
    if (onSendWorkspaceInvites) {
      await onSendWorkspaceInvites(emails, role);
      setShowInviteModal(false);
      setTimeout(() => fetchInvitations(), 500);
      return;
    }

    if (!workspace) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const invitedBy = session?.user?.id || currentUser.userId || currentUser.id;
      const inviterName = currentUser?.name || 'Workspace Admin';

      const newRecords = emails.map(email => ({
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        email: email.trim().toLowerCase(),
        role: role as any,
        invited_by: invitedBy,
        invited_by_name: inviterName,
        status: 'pending'
      }));

      const { data, error } = await supabase
        .from('workspace_invitations')
        .upsert(newRecords, { onConflict: 'workspace_id,email' })
        .select();

      if (!error && data) {
        fetchInvitations();
        data.forEach((record: any) => {
          triggerToast({
            id: generateId(),
            type: 'success',
            title: 'Invitation Sent',
            message: `Link for ${record.email}: ${window.location.origin}/?invite_token=${record.token || record.id}`,
            duration: 8000
          });
        });
        window.dispatchEvent(new CustomEvent('apexa-invitation-updated'));
      } else {
        console.error('Error inserting invitations:', error);
      }
    } catch (err) {
      console.error('Exception sending invites:', err);
    }
  };

  const handleResendInvite = async (inv: WorkspaceInvitation) => {
    try {
      const { data, error } = await supabase.rpc('resend_workspace_invitation', { invitation_id: inv.id });

      if (!error) {
        await fetchInvitations();
        const refreshed = data as any;
        triggerToast({
          id: generateId(),
          type: 'success',
          title: 'Resent Invitation',
          message: `A fresh link is ready for ${inv.email}.`,
          duration: 10000
        });
        if (refreshed?.token) await copyInviteLink(refreshed.token);
      } else {
        throw error;
      }
    } catch (err) {
      console.error('Exception resending invite:', err);
      triggerToast({ id: generateId(), type: 'info', title: 'Could not resend invitation', message: err instanceof Error ? err.message : 'Please try again.', duration: 4000 });
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      const { error } = await supabase.rpc('revoke_workspace_invitation', { invitation_id: invId });

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
      triggerToast({ id: generateId(), type: 'info', title: 'Could not revoke invitation', message: err instanceof Error ? err.message : 'Please try again.', duration: 4000 });
    }
  };

  const copyInviteLink = async (token?: string) => {
    if (!token) {
      triggerToast({ id: generateId(), type: 'info', title: 'Link unavailable', message: 'Resend this invitation to generate a new secure link.', duration: 3500 });
      return;
    }

    try {
      const inviteUrl = new URL(window.location.origin);
      inviteUrl.searchParams.set('invite_token', token);
      await navigator.clipboard.writeText(inviteUrl.toString());
      triggerToast({ id: generateId(), type: 'success', title: 'Invitation link copied', message: 'Share it only with the invited email address.', duration: 3000 });
    } catch {
      triggerToast({ id: generateId(), type: 'info', title: 'Could not copy link', message: 'Clipboard access was blocked by the browser.', duration: 3500 });
    }
  };

  // Delete workspace handler
  const handleDeleteWorkspace = async () => {
    if (!isOwner) {
      triggerToast({ id: generateId(), type: 'info', title: 'Owner access required', message: 'Only the workspace owner can delete it.', duration: 4000 });
      return;
    }
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

  // Keep settings navigation limited to fully functional modules.
  const navigationItems = [
    {
      category: 'ADMIN',
      links: [
        { id: 'general', label: 'General Settings', icon: Briefcase, active: true },
        { id: 'members', label: `Members (${activeWSMembers.length})`, icon: Users, active: true }
      ]
    },
    {
      category: 'FEATURES',
      links: [
        { id: 'clickapps', label: 'Workspace Features', icon: Sliders, active: true }
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
      <div className="fixed inset-0 z-50 modal-backdrop-blur flex items-center justify-center p-4">
        {/* Overlay dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
          className="relative w-full max-w-4xl h-[85vh] max-h-[720px] modal-glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/80 dark:border-slate-800/80 flex flex-col z-10 select-none"
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
                  Cấu hình không gian làm việc
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
                    <span>Đã lưu mọi thay đổi</span>
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
                  placeholder="Tìm cài đặt..."
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
                    {group.links.map(link => {
                      const IconComponent = link.icon;
                      return (
                        <button
                          key={link.id}
                          onClick={() => setActiveTab(link.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            activeTab === link.id
                              ? 'bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 shadow-xs'
                              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{link.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
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
                  <span>Khu vực nguy hiểm</span>
                </button>
              </div>
            </div>

            {/* Content Pane */}
            <div className="flex-1 overflow-y-auto p-6 text-left">
              
              {/* ACTIVE TABS */}

              {/* 1. General Settings Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {!canAdminister && (
                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                      Bạn có {currentRole} quyền truy cập. Danh tính và thiết lập mặc định của không gian chỉ có thể xem.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tên không gian làm việc</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          disabled={!canAdminister}
                          placeholder="Ví dụ: Acme Studio, Sản phẩm..."
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                      </div>

                      {/* Accent Color Presets */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Màu chủ đạo</span>
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          {themePresets.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleThemeChange(t.id)}
                              disabled={!canAdminister}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${theme === t.id ? `scale-110 ring-2 ${t.ring} ring-offset-2 dark:ring-offset-slate-900` : 'opacity-80 hover:scale-105'}`}
                              title={t.name}
                            >
                              <span className={`w-5 h-5 rounded-full ${t.color} block`} />
                            </button>
                          ))}

                          {/* Custom Color Selector */}
                          <div className="relative w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:scale-105 transition-transform group cursor-pointer" title="Chọn màu tùy chỉnh">
                            <span 
                              className="w-5 h-5 rounded-full block border border-slate-250 dark:border-slate-700 shadow-inner"
                              style={{ backgroundColor: currentThemeHex }}
                            />
                            <input 
                              type="color" 
                              disabled={!canAdminister}
                              value={currentThemeHex}
                              onChange={(e) => handleThemeChange(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            {isCustomTheme && (
                              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[8px] font-bold">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</label>
                        <textarea
                          value={description}
                          disabled={!canAdminister}
                          onChange={e => setDescription(e.target.value)}
                          onBlur={() => handleAutoSave({ updatedDescription: description.trim() })}
                          rows={3}
                          maxLength={240}
                          placeholder="Không gian này dùng để điều phối nội dung gì?"
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
                        />
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
                          onClick={() => canAdminister && fileInputRef.current?.click()}
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
                        {logoUrl && canAdminister && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md z-30 transition-colors"
                            title="Xóa logo"
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
                          disabled={isUploading || !canAdminister}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isUploading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>{isUploading ? "Đang tải lên..." : "Tải logo lên"}</span>
                        </button>
                        <p className="text-[9px] text-slate-400 dark:text-slate-505">
                          Hỗ trợ PNG, SVG hoặc JPG dưới 2 MB. Đường dẫn gốc được ẩn.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
                    <div className="mb-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Thiết lập mặc định</h4>
                      <p className="mt-1 text-[10px] text-slate-400">Áp dụng đồng bộ cho ngày tháng, kế hoạch và lời mời mới.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Timezone
                        <select value={timezone} disabled={!canAdminister} onChange={e => { setTimezone(e.target.value); handleAutoSave({ updatedTimezone: e.target.value }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <option value="Asia/Ho_Chi_Minh">Châu Á/TP. Hồ Chí Minh</option>
                          <option value="Asia/Singapore">Châu Á/Singapore</option>
                          <option value="Asia/Tokyo">Asia/Tokyo</option>
                          <option value="Europe/London">Châu Âu/London</option>
                          <option value="America/New_York">Châu Mỹ/New York</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Ngày bắt đầu tuần
                        <select value={weekStartsOn} disabled={!canAdminister} onChange={e => { const value = e.target.value as 'monday' | 'sunday'; setWeekStartsOn(value); handleAutoSave({ updatedWeekStartsOn: value }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <option value="monday">Monday</option>
                          <option value="sunday">Sunday</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Vai trò mặc định khi mời
                        <select value={defaultRole} disabled={!canAdminister} onChange={e => { const value = e.target.value as Exclude<WorkspaceRole, 'owner'>; setDefaultRole(value); handleAutoSave({ updatedDefaultRole: value }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <option value="member">Member</option><option value="guest">Guest</option><option value="admin">Admin</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        Thành viên được phép mời
                        <input type="checkbox" checked={allowMemberInvites} disabled={!canAdminister} onChange={e => { setAllowMemberInvites(e.target.checked); handleAutoSave({ updatedAllowMemberInvites: e.target.checked }); }} className="h-4 w-4 rounded text-indigo-600" />
                      </label>
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
                      Cấu hình ứng dụng trong không gian
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-550">
                      Bật hoặc tắt các tính năng cộng tác cho mọi khu vực và danh sách.
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
                          !canAdminister 
                            ? 'cursor-not-allowed opacity-80 bg-slate-50/30 border-slate-100 dark:bg-slate-950/10 dark:border-slate-805' 
                            : 'cursor-pointer'
                        } ${
                          clickApps[app.key] && canAdminister
                            ? 'bg-indigo-500/5 border-indigo-500/20 dark:bg-indigo-950/10'
                            : !clickApps[app.key] && canAdminister
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
                          disabled={!canAdminister}
                          onChange={() => canAdminister && toggleClickApp(app.key)}
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
                        Danh bạ thành viên
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Quản lý vai trò, mời đồng nghiệp mới hoặc thu hồi quyền truy cập không gian này.
                      </p>
                    </div>
                  </div>

                  {!canAdminister && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-400">
                      Chỉ chủ sở hữu và quản trị viên mới có thể mời người hoặc thay đổi vai trò.
                    </div>
                  )}

                  {canAdminister && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Add Directory Member */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl space-y-3 text-left">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider block">Thêm thành viên từ danh bạ</span>
                      {nonWSMembers.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-2">Tất cả thành viên trong danh bạ đã thuộc không gian này.</p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedMemberToAdd}
                            onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            <option value="">Chọn thành viên...</option>
                            {nonWSMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.email})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={addDirectoryMember}
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
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider block">Mời đồng nghiệp</span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-550 mt-1">Gửi lời mời bảo mật đến nhiều thành viên trong nhóm.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-655 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Mời qua email</span>
                      </button>
                    </div>
                  </div>}

                  {/* Active members list */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider block">Thành viên đã tham gia ({activeWSMembers.length})</span>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2 bg-slate-50/20">
                      {membersLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải thành viên…</div>
                      ) : activeWSMembers.map((member: User) => {
                        const isMe = member.userId === currentUser.userId;
                        const memberWorkspaceRole = member.userId ? membershipRoles[member.userId] : 'guest';
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
                                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${presenceDotClass(member.status)}`} />
                              </div>
                              <div className="text-left min-w-0">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                                  {member.name} {isMe && <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-455 ml-1">(Bạn)</span>}
                                </span>
                                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium block truncate">
                                  {member.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {memberWorkspaceRole === 'owner' || isMe || !canAdminister ? (
                                <span className="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-indigo-50 dark:bg-indigo-955/30 text-indigo-650 dark:text-indigo-400 border border-indigo-100/25">
                                  {memberWorkspaceRole || 'Member'}
                                </span>
                              ) : (
                                <>
                                  <select
                                    value={memberWorkspaceRole || 'member'}
                                    onChange={(e) => updateMembershipRole(member, e.target.value as Exclude<WorkspaceRole, 'owner'>)}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase px-2 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                    <option value="guest">Guest</option>
                                  </select>
                                  
                                  <button
                                    type="button"
                                    onClick={() => removeWorkspaceMember(member)}
                                    className="p-1 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors cursor-pointer"
                                    title="Xóa thành viên"
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

                  {canAdminister && invitations.some(invitation => invitation.status === 'pending') && (
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider block">
                        Lời mời đang chờ ({invitations.filter(invitation => invitation.status === 'pending').length})
                      </span>
                      <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/20 p-2 dark:border-slate-800/80">
                        {invitations.filter(invitation => invitation.status === 'pending').map(invitation => {
                          const expired = Boolean(invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Date.now());
                          return (
                            <div key={invitation.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800/50 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-xs font-black text-slate-800 dark:text-slate-200">{invitation.email}</span>
                                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{invitation.role}</span>
                                  {expired && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">Expired</span>}
                                </div>
                                <p className="mt-1 text-[9.5px] font-medium text-slate-400">
                                  {invitation.expiresAt ? `Expires ${new Date(invitation.expiresAt).toLocaleDateString()}` : 'Valid for 7 days'}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button type="button" onClick={() => copyInviteLink(invitation.token)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-black text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300" title="Sao chép liên kết mời bảo mật">
                                  <Copy className="h-3 w-3" /> Sao chép liên kết
                                </button>
                                <button type="button" onClick={() => handleResendInvite(invitation)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30" title="Tạo liên kết mới">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => handleRevokeInvite(invitation.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title="Thu hồi lời mời">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-700 dark:text-rose-350 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <span className="font-extrabold text-xs block">Xóa vĩnh viễn không gian làm việc</span>
                      <p className="leading-relaxed">
                        Thao tác này sẽ xóa vĩnh viễn không gian làm việc <strong>{workspace.name}</strong>, cùng toàn bộ khu vực, công việc, danh sách, bảng trắng, tài liệu và kênh liên quan. Mọi dữ liệu đã đồng bộ trong cơ sở dữ liệu cũng sẽ bị xóa.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        Để xác nhận xóa, hãy nhập chính xác tên không gian làm việc: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-500 font-mono text-xs">{workspace.name}</code>
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder="Nhập chính xác tên không gian..."
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-rose-250 dark:border-rose-900/40 bg-slate-50 dark:bg-slate-950/30 text-slate-850 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!isOwner || isDeleting || deleteConfirmText.trim() !== workspace.name || workspacesCount <= 1}
                      onClick={handleDeleteWorkspace}
                      className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-md shadow-rose-500/10 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Xóa vĩnh viễn không gian</span>
                    </button>
                    {workspacesCount <= 1 && (
                      <p className="text-[10px] text-center text-slate-400 italic">
                        Không thể xóa: hệ thống phải còn ít nhất một không gian làm việc.
                      </p>
                    )}
                    {!isOwner && (
                      <p className="text-[10px] text-center text-slate-400 italic">Chỉ chủ sở hữu mới có thể xóa không gian này.</p>
                    )}
                  </div>
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
